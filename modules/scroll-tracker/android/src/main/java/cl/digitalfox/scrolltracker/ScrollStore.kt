package cl.digitalfox.scrolltracker

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.view.accessibility.AccessibilityEvent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.abs
import kotlin.math.min
import kotlin.math.roundToInt

/**
 * Estado compartido entre el servicio de accesibilidad y el módulo JS (mismo proceso).
 * Convierte cada evento de scroll en centímetros físicos, lleva los totales del día por app,
 * guarda en SharedPreferences y mantiene la notificación persistente.
 */
object ScrollStore {
  private const val PREFS = "scroll_tracker"
  private const val MAX_EVENTS = 60
  private const val FLUSH_INTERVAL_MS = 1500L
  private const val CHANNEL_ID = "scroll_distance"
  private const val NOTIF_ID = 4201
  private const val UNDEFINED = -1

  /** Cómo se obtuvo la distancia de un evento (para saber qué tan confiable es en cada app). */
  enum class Method { DELTA, SCROLL_Y, INDEX, NONE }

  private class AppTotal {
    var cm = 0.0
    val counts = IntArray(Method.values().size)
  }

  private class Event(
    val time: Long,
    val pkg: String,
    val cls: String,
    val dy: Int,
    val scrollY: Int,
    val fromIndex: Int,
    val toIndex: Int,
    val itemCount: Int,
    val method: Method,
    val cm: Double
  )

  private lateinit var appContext: Context
  private var day = ""
  private val totals = LinkedHashMap<String, AppTotal>()
  private val events = ArrayDeque<Event>()
  private val lastScrollY = HashMap<String, Int>()
  private val lastFromIndex = HashMap<String, Int>()
  private val labels = HashMap<String, String>()
  private var serviceRunning = false
  private var dirty = false
  private var flushScheduled = false
  private val handler = Handler(Looper.getMainLooper())
  private val flushRunnable = Runnable { flush() }

  @Synchronized
  fun ensureLoaded(context: Context) {
    if (::appContext.isInitialized) return
    appContext = context.applicationContext
    load()
  }

  // ---------- Entrada de eventos (hilo principal, desde el servicio) ----------

  @Synchronized
  fun onScroll(e: AccessibilityEvent) {
    val pkg = e.packageName?.toString() ?: return
    if (pkg == appContext.packageName || pkg == "com.android.systemui") return
    val cls = e.className?.toString() ?: ""
    val key = "$pkg/$cls"
    val screenH = appContext.resources.displayMetrics.heightPixels

    var dx = UNDEFINED
    var dy = UNDEFINED
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      dx = e.scrollDeltaX
      dy = e.scrollDeltaY
    }

    // Android usa -1 como "sin dato", pero -1 también es un delta real (1 px hacia arriba):
    // solo se considera "sin dato" cuando ambos ejes vienen en -1.
    val hasDelta = !(dx == UNDEFINED && dy == UNDEFINED)

    var px = 0.0
    val method: Method
    when {
      // 1) Delta real informado por la vista (lo más preciso)
      hasDelta && dy != 0 -> {
        method = Method.DELTA
        px = abs(dy).toDouble()
      }
      // Scroll horizontal (carruseles, stories): no cuenta
      hasDelta && dx != 0 -> return
      // 2) Posición absoluta (ScrollView / Compose): diferencia con la anterior
      e.maxScrollY > 0 && e.scrollY >= 0 -> {
        method = Method.SCROLL_Y
        val prev = lastScrollY.put(key, e.scrollY)
        if (prev != null) px = abs(e.scrollY - prev).toDouble()
      }
      // 3) Respaldo por índice de elementos (feeds tipo TikTok/Reels): cada elemento ≈ pantalla / visibles
      e.fromIndex >= 0 && e.itemCount > 0 -> {
        method = Method.INDEX
        val prev = lastFromIndex.put(key, e.fromIndex)
        if (prev != null && prev != e.fromIndex) {
          val visible = maxOf(1, e.toIndex - e.fromIndex + 1)
          px = abs(e.fromIndex - prev).toDouble() * screenH / visible
        }
      }
      else -> method = Method.NONE
    }

    // Un salto de más de 3 pantallas en un solo evento suele ser un cambio de lista, no scroll real
    px = min(px, screenH * 3.0)
    val cm = px / usedDpi() * 2.54

    rollDayIfNeeded()
    val total = totals.getOrPut(pkg) { AppTotal() }
    total.cm += cm
    total.counts[method.ordinal]++

    events.addFirst(Event(System.currentTimeMillis(), pkg, cls, dy, e.scrollY, e.fromIndex, e.toIndex, e.itemCount, method, cm))
    while (events.size > MAX_EVENTS) events.removeLast()

    markDirty()
  }

  /** Al cambiar de pantalla se olvidan las posiciones previas de esa app, para no sumar saltos falsos. */
  @Synchronized
  fun onWindowChanged(e: AccessibilityEvent) {
    val pkg = e.packageName?.toString() ?: return
    lastScrollY.keys.removeAll { it.startsWith("$pkg/") }
    lastFromIndex.keys.removeAll { it.startsWith("$pkg/") }
  }

  @Synchronized
  fun setServiceRunning(running: Boolean) {
    serviceRunning = running
    if (running) {
      postNotification()
    } else {
      save()
      NotificationManagerCompat.from(appContext).cancel(NOTIF_ID)
    }
  }

  // ---------- Lectura desde JS ----------

  @Synchronized
  fun stats(): Map<String, Any?> {
    rollDayIfNeeded()
    val dm = appContext.resources.displayMetrics
    return mapOf(
      "day" to day,
      "totalCm" to totals.values.sumOf { it.cm },
      "apps" to totals.entries
        .sortedByDescending { it.value.cm }
        .map { (pkg, t) ->
          mapOf(
            "pkg" to pkg,
            "label" to label(pkg),
            "cm" to t.cm,
            "delta" to t.counts[Method.DELTA.ordinal],
            "scrollY" to t.counts[Method.SCROLL_Y.ordinal],
            "index" to t.counts[Method.INDEX.ordinal],
            "none" to t.counts[Method.NONE.ordinal]
          )
        },
      "ydpi" to dm.ydpi.toDouble(),
      "usedDpi" to usedDpi(),
      "screenHeightPx" to dm.heightPixels,
      "serviceRunning" to serviceRunning
    )
  }

  @Synchronized
  fun recentEvents(): List<Map<String, Any?>> = events.map {
    mapOf(
      "time" to it.time.toDouble(),
      "pkg" to it.pkg,
      "label" to label(it.pkg),
      "cls" to it.cls.substringAfterLast('.'),
      "dy" to it.dy,
      "scrollY" to it.scrollY,
      "fromIndex" to it.fromIndex,
      "toIndex" to it.toIndex,
      "itemCount" to it.itemCount,
      "method" to it.method.name,
      "cm" to it.cm
    )
  }

  @Synchronized
  fun reset() {
    totals.clear()
    events.clear()
    lastScrollY.clear()
    lastFromIndex.clear()
    save()
    postNotification()
  }

  // ---------- Internos ----------

  /** ydpi real de la pantalla; si el fabricante reporta un valor absurdo, se usa densityDpi. */
  private fun usedDpi(): Double {
    val dm = appContext.resources.displayMetrics
    val ydpi = dm.ydpi.toDouble()
    val density = dm.densityDpi.toDouble()
    return if (ydpi < density * 0.75 || ydpi > density * 1.33) density else ydpi
  }

  private fun today(): String = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())

  private fun rollDayIfNeeded() {
    val now = today()
    if (now != day) {
      day = now
      totals.clear()
      dirty = true
    }
  }

  private fun markDirty() {
    dirty = true
    if (!flushScheduled) {
      flushScheduled = true
      handler.postDelayed(flushRunnable, FLUSH_INTERVAL_MS)
    }
  }

  /** Cada ~1,5 s como máximo: guarda y actualiza la notificación (Android descarta updates más seguidos). */
  @Synchronized
  private fun flush() {
    flushScheduled = false
    if (!dirty) return
    dirty = false
    save()
    postNotification()
  }

  private fun label(pkg: String): String = labels.getOrPut(pkg) {
    try {
      val pm = appContext.packageManager
      pm.getApplicationLabel(pm.getApplicationInfo(pkg, 0)).toString()
    } catch (_: PackageManager.NameNotFoundException) {
      pkg
    }
  }

  private fun load() {
    val prefs = appContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val json = prefs.getString("data", null)
    day = today()
    if (json == null) return
    try {
      val root = JSONObject(json)
      if (root.optString("day") != day) return
      val apps = root.getJSONObject("apps")
      for (pkg in apps.keys()) {
        val o = apps.getJSONObject(pkg)
        val t = AppTotal()
        t.cm = o.getDouble("cm")
        val c = o.optJSONArray("c")
        if (c != null) for (i in 0 until min(c.length(), t.counts.size)) t.counts[i] = c.getInt(i)
        totals[pkg] = t
      }
    } catch (_: Exception) {
      totals.clear()
    }
  }

  private fun save() {
    val apps = JSONObject()
    for ((pkg, t) in totals) {
      apps.put(pkg, JSONObject().put("cm", t.cm).put("c", JSONArray(t.counts.toList())))
    }
    val root = JSONObject().put("day", day).put("apps", apps)
    appContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString("data", root.toString()).apply()
  }

  private fun postNotification() {
    if (!serviceRunning) return
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
      appContext.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
    ) return

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val nm = appContext.getSystemService(NotificationManager::class.java)
      if (nm.getNotificationChannel(CHANNEL_ID) == null) {
        nm.createNotificationChannel(
          NotificationChannel(CHANNEL_ID, "Distancia de scroll", NotificationManager.IMPORTANCE_LOW).apply {
            description = "Muestra cuánto has scrolleado hoy"
            setShowBadge(false)
          }
        )
      }
    }

    rollDayIfNeeded()
    val total = totals.values.sumOf { it.cm }
    val top = totals.entries
      .filter { it.value.cm >= 1.0 }
      .sortedByDescending { it.value.cm }
      .take(3)
      .joinToString(" · ") { "${label(it.key)} ${formatCm(it.value.cm)}" }

    val launch = appContext.packageManager.getLaunchIntentForPackage(appContext.packageName)
    val contentIntent = launch?.let {
      PendingIntent.getActivity(appContext, 0, it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    }

    val notification = NotificationCompat.Builder(appContext, CHANNEL_ID)
      .setSmallIcon(R.drawable.ic_stat_scroll)
      .setContentTitle("Hoy scrolleaste ${formatCm(total)}")
      .setContentText(top.ifEmpty { "Haz scroll en cualquier app…" })
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setSilent(true)
      .setShowWhen(false)
      .setCategory(NotificationCompat.CATEGORY_STATUS)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setContentIntent(contentIntent)
      .build()

    try {
      NotificationManagerCompat.from(appContext).notify(NOTIF_ID, notification)
    } catch (_: SecurityException) {
      // Permiso de notificaciones revocado entre el chequeo y el notify
    }
  }

  private val clLocale: Locale = Locale.forLanguageTag("es-CL")

  fun formatCm(cm: Double): String = when {
    cm < 100 -> "${cm.roundToInt()} cm"
    cm < 100_000 -> String.format(clLocale, "%.1f m", cm / 100)
    else -> String.format(clLocale, "%.2f km", cm / 100_000)
  }
}
