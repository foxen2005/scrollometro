package cl.digitalfox.scrolltracker

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.content.pm.PackageManager
import android.os.Build
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

/**
 * Actualizaciones desde GitHub Releases: descarga el APK y lo instala con el instalador por sesión
 * (PackageInstaller). Android solo acepta el APK si viene firmado con la misma llave que la app
 * instalada, así que un archivo ajeno no puede colarse como actualización.
 */
object Updater {
  /** Último error del instalador (lo lee JS para mostrarlo). */
  @Volatile var lastInstallError: String? = null

  /**
   * Diálogo de confirmación de Android pendiente de mostrar. No se abre desde el BroadcastReceiver
   * porque Android 10+ bloquea abrir pantallas desde segundo plano: lo abre la app cuando está al frente.
   */
  @Volatile var pendingConfirm: Intent? = null

  /** Avisa al módulo JS del resultado del instalador ("pending" / "success" / "failure"). */
  @Volatile var listener: ((status: String, message: String?) -> Unit)? = null

  /** Descarga a cache/update.apk informando el progreso. Solo HTTPS y solo desde GitHub. */
  fun download(context: Context, url: String, onProgress: (Long, Long) -> Unit): File {
    require(url.startsWith("https://github.com/")) { "URL de actualización no permitida" }
    val out = File(context.cacheDir, "update.apk")
    var conn = URL(url).openConnection() as HttpURLConnection
    // GitHub redirige el asset a su CDN (también HTTPS); seguimos hasta 5 saltos
    var hops = 0
    while (true) {
      conn.instanceFollowRedirects = false
      conn.connectTimeout = 15_000
      conn.readTimeout = 30_000
      val code = conn.responseCode
      if (code in 300..399 && hops < 5) {
        val next = conn.getHeaderField("Location") ?: error("Redirección sin destino")
        require(next.startsWith("https://")) { "Redirección no segura" }
        conn.disconnect()
        conn = URL(next).openConnection() as HttpURLConnection
        hops++
        continue
      }
      if (code != 200) error("Descarga falló: HTTP $code")
      break
    }
    val total = conn.contentLengthLong
    conn.inputStream.use { input ->
      out.outputStream().use { output ->
        val buf = ByteArray(64 * 1024)
        var received = 0L
        var lastReport = 0L
        while (true) {
          val n = input.read(buf)
          if (n < 0) break
          output.write(buf, 0, n)
          received += n
          if (received - lastReport > 256 * 1024) {
            onProgress(received, total)
            lastReport = received
          }
        }
        onProgress(received, total)
      }
    }
    conn.disconnect()
    return out
  }

  /** Revisión previa: el APK debe ser de esta misma app y de una versión mayor. */
  fun check(context: Context, apk: File) {
    val pm = context.packageManager
    val info = pm.getPackageArchiveInfo(apk.path, 0) ?: error("El archivo descargado no es un APK válido")
    require(info.packageName == context.packageName) { "El APK es de otra app (${info.packageName})" }
    val current = pm.getPackageInfo(context.packageName, 0)
    val newCode = if (Build.VERSION.SDK_INT >= 28) info.longVersionCode else @Suppress("DEPRECATION") info.versionCode.toLong()
    val curCode = if (Build.VERSION.SDK_INT >= 28) current.longVersionCode else @Suppress("DEPRECATION") current.versionCode.toLong()
    require(newCode > curCode) { "La versión descargada no es más nueva que la instalada" }
  }

  fun install(context: Context, apk: File) {
    lastInstallError = null
    val installer = context.packageManager.packageInstaller
    val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL).apply {
      setAppPackageName(context.packageName)
      if (Build.VERSION.SDK_INT >= 31) setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_REQUIRED)
    }
    val sessionId = installer.createSession(params)
    try {
      installer.openSession(sessionId).use { session ->
        apk.inputStream().use { input ->
          session.openWrite("scrollometro.apk", 0, apk.length()).use { output ->
            input.copyTo(output)
            session.fsync(output)
          }
        }
        val intent = Intent(context, UpdateInstallReceiver::class.java)
        // FLAG_MUTABLE: el sistema rellena el estado de la instalación en este intent
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= 31) PendingIntent.FLAG_MUTABLE else 0)
        val pending = PendingIntent.getBroadcast(context, sessionId, intent, flags)
        session.commit(pending.intentSender)
      }
    } catch (e: Exception) {
      // Sin esto, cada intento fallido deja una copia del APK "en espera" ocupando espacio
      installer.abandonSession(sessionId)
      throw e
    }
  }

  fun canInstall(context: Context): Boolean =
    Build.VERSION.SDK_INT < 26 || context.packageManager.canRequestPackageInstalls()

  fun versionInfo(context: Context): Map<String, Any?> {
    val info = context.packageManager.getPackageInfo(context.packageName, PackageManager.GET_META_DATA)
    val code = if (Build.VERSION.SDK_INT >= 28) info.longVersionCode else @Suppress("DEPRECATION") info.versionCode.toLong()
    return mapOf("versionName" to info.versionName, "versionCode" to code.toDouble())
  }
}

/**
 * Recibe el resultado del instalador. Si Android pide confirmación, guarda su diálogo y avisa a la app,
 * que lo abre estando al frente (ahora mismo o al volver a ella).
 */
class UpdateInstallReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    when (val status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, -999)) {
      PackageInstaller.STATUS_PENDING_USER_ACTION -> {
        Updater.pendingConfirm = if (Build.VERSION.SDK_INT >= 33) intent.getParcelableExtra(Intent.EXTRA_INTENT, Intent::class.java)
        else @Suppress("DEPRECATION") intent.getParcelableExtra(Intent.EXTRA_INTENT)
        Updater.listener?.invoke("pending", null)
      }
      PackageInstaller.STATUS_SUCCESS -> {
        Updater.pendingConfirm = null
        Updater.lastInstallError = null
        Updater.listener?.invoke("success", null)
      }
      else -> {
        // Incluye STATUS_FAILURE_ABORTED: el usuario tocó "Cancelar" en el diálogo de Android
        Updater.pendingConfirm = null
        val msg = if (status == PackageInstaller.STATUS_FAILURE_ABORTED) "Cancelaste la instalación"
        else intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE) ?: "La instalación falló (código $status)"
        Updater.lastInstallError = msg
        Updater.listener?.invoke("failure", msg)
      }
    }
  }
}
