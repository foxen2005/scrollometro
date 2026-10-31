package cl.digitalfox.scrolltracker

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.widget.RemoteViews

/** Widget 2×2: mascota, distancia y barra de dopamina. */
class ScrollWidgetSmall : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    ScrollStore.ensureLoaded(context)
    ScrollWidgets.updateAll(context)
  }
}

/** Widget 4×2: además muestra la frase de la mascota. */
class ScrollWidgetWide : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    ScrollStore.ensureLoaded(context)
    ScrollWidgets.updateAll(context)
  }
}

/**
 * Dibuja los widgets con el estado actual de ScrollStore. Los widgets de Android no pueden animar ni
 * renderizar SVG: la mascota es un PNG por estado (res/drawable-nodpi/mascot_<mascota>_<estado>.png,
 * exportado desde los mismos dibujos de la app).
 */
object ScrollWidgets {
  private val MASCOT_RES = mapOf(
    "pulgar" to intArrayOf(R.drawable.mascot_pulgar_0, R.drawable.mascot_pulgar_1, R.drawable.mascot_pulgar_2, R.drawable.mascot_pulgar_3),
    "caracol" to intArrayOf(R.drawable.mascot_caracol_0, R.drawable.mascot_caracol_1, R.drawable.mascot_caracol_2, R.drawable.mascot_caracol_3),
    "cerebro" to intArrayOf(R.drawable.mascot_cerebro_0, R.drawable.mascot_cerebro_1, R.drawable.mascot_cerebro_2, R.drawable.mascot_cerebro_3)
  )

  fun updateAll(context: Context) {
    val manager = AppWidgetManager.getInstance(context) ?: return
    val state = ScrollStore.widgetState()
    val targets = listOf(
      ScrollWidgetSmall::class.java to R.layout.widget_small,
      ScrollWidgetWide::class.java to R.layout.widget_wide
    )
    for ((cls, layout) in targets) {
      val ids = manager.getAppWidgetIds(ComponentName(context, cls))
      if (ids.isEmpty()) continue
      val views = RemoteViews(context.packageName, layout).apply {
        val res = MASCOT_RES[state.mascot] ?: MASCOT_RES.getValue("pulgar")
        setImageViewResource(R.id.widget_mascot, res[state.stage.coerceIn(0, 3)])
        setTextViewText(R.id.widget_distance, state.distance)
        setProgressBar(R.id.widget_dopa, 100, state.dopamine, false)
        if (layout == R.layout.widget_wide) setTextViewText(R.id.widget_line, state.line)
        state.openApp?.let { setOnClickPendingIntent(R.id.widget_root, it) }
      }
      manager.updateAppWidget(ids, views)
    }
  }
}
