package cl.digitalfox.scrolltracker

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.view.accessibility.AccessibilityEvent

/** Recibe solo eventos de scroll / cambio de pantalla y se los pasa a ScrollStore. */
class ScrollAccessibilityService : AccessibilityService() {
  override fun onServiceConnected() {
    super.onServiceConnected()
    ScrollStore.ensureLoaded(this)
    ScrollStore.setServiceRunning(true)
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    event ?: return
    when (event.eventType) {
      AccessibilityEvent.TYPE_VIEW_SCROLLED -> ScrollStore.onScroll(event)
      AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED -> ScrollStore.onWindowChanged(event)
    }
  }

  override fun onInterrupt() {}

  override fun onUnbind(intent: Intent?): Boolean {
    ScrollStore.setServiceRunning(false)
    return super.onUnbind(intent)
  }

  override fun onDestroy() {
    ScrollStore.setServiceRunning(false)
    super.onDestroy()
  }
}
