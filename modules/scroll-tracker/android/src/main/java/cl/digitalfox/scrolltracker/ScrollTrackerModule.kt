package cl.digitalfox.scrolltracker

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.Settings
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
  }
}
