package cl.digitalfox.scrolltracker

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ScrollTrackerModule : Module() {
  private val context: Context
    get() = appContext.reactContext?.applicationContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("ScrollTracker")

    Function("isServiceEnabled") {
      val component = ComponentName(context, ScrollAccessibilityService::class.java).flattenToString()
      val enabled = Settings.Secure.getString(context.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES) ?: ""
      enabled.split(':').any { it.equals(component, ignoreCase = true) }
    }

    Function("openAccessibilitySettings") {
      context.startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    // Info de la app: ahí está "Permitir ajustes restringidos" (Android 13+ con APK instalada a mano)
    Function("openAppDetails") {
      context.startActivity(
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}"))
          .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      )
    }

    Function("getStats") {
      ScrollStore.ensureLoaded(context)
      ScrollStore.stats()
    }

    Function("getEvents") {
      ScrollStore.ensureLoaded(context)
      ScrollStore.recentEvents()
    }

    Function("reset") {
      ScrollStore.ensureLoaded(context)
      ScrollStore.reset()
    }

    Function("setPrefs") { goalM: Int, notifEnabled: Boolean, phrases: Boolean, mascot: String ->
      ScrollStore.ensureLoaded(context)
      ScrollStore.setPrefs(goalM, notifEnabled, phrases, mascot)
    }

    // ---------- Actualizaciones (GitHub Releases) ----------

    Events("onUpdateProgress", "onInstallStatus")

    OnCreate {
      Updater.listener = { status, message -> sendEvent("onInstallStatus", mapOf("status" to status, "message" to message)) }
    }

    OnDestroy {
      Updater.listener = null
    }

    // Abre el diálogo "¿Actualizar esta app?" si hay uno pendiente. Se llama con la app al frente.
    Function("showInstallConfirm") {
      val confirm = Updater.pendingConfirm ?: return@Function false
      Updater.pendingConfirm = null
      val activity = appContext.currentActivity
      if (activity != null) activity.startActivity(confirm)
      else context.startActivity(confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      true
    }

    Function("getVersion") { Updater.versionInfo(context) }

    Function("canInstallUpdates") { Updater.canInstall(context) }

    Function("openInstallPermission") {
      context.startActivity(
        Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${context.packageName}"))
          .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      )
    }

    Function("getInstallError") { Updater.lastInstallError }

    // Descarga + revisión + instalación en un hilo aparte; el progreso llega por onUpdateProgress
    AsyncFunction("downloadAndInstall") { url: String, promise: Promise ->
      val ctx = context
      Thread {
        try {
          val apk = Updater.download(ctx, url) { received, total ->
            sendEvent("onUpdateProgress", mapOf("received" to received.toDouble(), "total" to total.toDouble()))
          }
          Updater.check(ctx, apk)
          Updater.install(ctx, apk)
          promise.resolve(null)
        } catch (e: Exception) {
          promise.reject("ERR_UPDATE", e.message ?: "Error al actualizar", e)
        }
      }.start()
    }
  }
}
