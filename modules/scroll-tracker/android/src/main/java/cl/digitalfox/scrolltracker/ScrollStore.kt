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

  // Acumulado de toda la vida (para los logros) y ritmo reciente (para la barra de dopamina)
  private var histCm = 0.0
  private const val BUCKET_MS = 10_000L
  private const val DOPA_WINDOW_MS = 10 * 60_000L
  /** Pantallas por minuto que equivalen a la barra llena (≈ un video cada 4 s). */
  private const val DOPA_FULL_SCREENS_PER_MIN = 15.0
  private val buckets = ArrayDeque<Pair<Long, Double>>() // (inicio del tramo de 10 s, cm)

  // Preferencias que se eligen en Ajustes
  private var goalM = 500
  private var notifEnabled = true
  private var phrases = true
  private var mascot = "pulgar"

  /** Frases de la mascota por estado (<100 m, <500 m, <2 km, más). Mismas que en la app. */
  private val MASCOT_LINES = mapOf(
    "pulgar" to listOf("¡Listo pa’l día! 💪", "Uff… ¿otro video más?", "No siento la uña. Ayuda.", "Braaains… digo, reels…"),
    "caracol" to listOf("Wow, ¡qué rapidez!", "Yo hago eso en 3 días…", "No te hablo.", "Nunca seré tan rápido 😭"),
    "cerebro" to listOf("Todo bajo control 😌", "Se está poniendo tibio esto…", "¿Huele a quemado o soy yo?", "Listo pa’ la marraqueta 🍳")
  )
  private val STAGE_EMOJI = listOf("💪", "😅", "🥵", "🧟")
  private fun stageOf(cm: Double): Int = when {
    cm < 10_000 -> 0
    cm < 50_000 -> 1
    cm < 200_000 -> 2
    else -> 3
  }

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
    histCm += cm
    addToBucket(cm)

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
      "serviceRunning" to serviceRunning,
      "histCm" to histCm,
      "dopamine" to dopamine(),
      "goalM" to goalM,
      "notifEnabled" to notifEnabled,
      "phrases" to phrases,
      "mascot" to mascot
    )
  }

  /** Lo que muestran los widgets. */
  class WidgetState(val mascot: String, val stage: Int, val distance: String, val line: String, val dopamine: Int, val openApp: PendingIntent?)

  @Synchronized
  fun widgetState(): WidgetState {
    rollDayIfNeeded()
    val total = totals.values.sumOf { it.cm }
    val stage = stageOf(total)
    return WidgetState(
      mascot = mascot,
      stage = stage,
      distance = formatCm(total),
      line = MASCOT_LINES[mascot]?.get(stage) ?: "",
      dopamine = dopamine(),
      openApp = openAppIntent()
    )
  }

  private fun openAppIntent(): PendingIntent? =
    appContext.packageManager.getLaunchIntentForPackage(appContext.packageName)?.let {
      PendingIntent.getActivity(appContext, 0, it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    }

  /** Guarda las preferencias de Ajustes y refresca (u oculta) la notificación. */
  @Synchronized
  fun setPrefs(goal: Int, notif: Boolean, withPhrases: Boolean, mascotKey: String) {
    goalM = goal.coerceIn(10, 1_000_000)
    notifEnabled = notif
    phrases = withPhrases
    if (MASCOT_LINES.containsKey(mascotKey)) mascot = mascotKey
    savePrefs()
    if (notifEnabled) postNotification() else NotificationManagerCompat.from(appContext).cancel(NOTIF_ID)
    ScrollWidgets.updateAll(appContext) // la mascota del widget cambia al elegir otra
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
    rollDayIfNeeded()
    // "Reiniciar hoy" también descuenta lo de hoy del histórico, para no dejar logros inflados
    histCm = maxOf(0.0, histCm - totals.values.sumOf { it.cm })
    totals.clear()
    events.clear()
    buckets.clear()
    lastScrollY.clear()
    lastFromIndex.clear()
    save()
    postNotification()
    ScrollWidgets.updateAll(appContext)
  }

  // ---------- Internos ----------

  /** ydpi real de la pantalla; si el fabricante reporta un valor absurdo, se usa densityDpi. */
  private fun usedDpi(): Double {
    val dm = appContext.resources.displayMetrics
    val ydpi = dm.ydpi.toDouble()
    val density = dm.densityDpi.toDouble()
    return if (ydpi < density * 0.75 || ydpi > density * 1.33) density else ydpi
  }

  private fun addToBucket(cm: Double) {
    val start = System.currentTimeMillis() / BUCKET_MS * BUCKET_MS
    val last = buckets.lastOrNull()
    if (last != null && last.first == start) buckets[buckets.size - 1] = start to last.second + cm
    else buckets.addLast(start to cm)
    pruneBuckets()
  }

  private fun pruneBuckets() {
    val cutoff = System.currentTimeMillis() - DOPA_WINDOW_MS
    // Se descarta un tramo solo cuando termina antes del corte (los que se solapan con la ventana se conservan)
    while (buckets.isNotEmpty() && buckets.first().first + BUCKET_MS <= cutoff) buckets.removeFirst()
  }

  /**
   * "Barra de dopamina" (lúdica): pantallas recorridas por minuto en los últimos 10 min,
   * escalado a 0–100 donde 100 ≈ un video cada 4 segundos.
   */
  private fun dopamine(): Int {
    pruneBuckets()
    val dm = appContext.resources.displayMetrics
    val screenCm = dm.heightPixels / usedDpi() * 2.54
    val screensPerMin = buckets.sumOf { it.second } / screenCm / (DOPA_WINDOW_MS / 60_000.0)
    return (screensPerMin / DOPA_FULL_SCREENS_PER_MIN * 100).roundToInt().coerceIn(0, 100)
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
    ScrollWidgets.updateAll(appContext)
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
    // Histórico y preferencias no dependen del día
    histCm = java.lang.Double.longBitsToDouble(prefs.getLong("histCmBits", 0L))
    goalM = prefs.getInt("goalM", 500)
    notifEnabled = prefs.getBoolean("notifEnabled", true)
    phrases = prefs.getBoolean("phrases", true)
    // Validar: una clave desconocida (versión futura, backup restaurado) haría caer la app en JS
    mascot = prefs.getString("mascot", "pulgar")?.takeIf { MASCOT_LINES.containsKey(it) } ?: "pulgar"

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
    appContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
      .putString("data", root.toString())
      .putLong("histCmBits", java.lang.Double.doubleToRawLongBits(histCm))
      .apply()
  }

  private fun savePrefs() {
    appContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
      .putInt("goalM", goalM)
      .putBoolean("notifEnabled", notifEnabled)
      .putBoolean("phrases", phrases)
      .putString("mascot", mascot)
      .apply()
  }

  private fun postNotification() {
    if (!serviceRunning || !notifEnabled) return
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
      .take(if (phrases) 2 else 3)
      .joinToString(" · ") { "${label(it.key)} ${formatCm(it.value.cm)}" }
    val stage = stageOf(total)
    val line = MASCOT_LINES[mascot]?.get(stage)
    val text = when {
      top.isEmpty() -> "Haz scroll en cualquier app…"
      phrases && line != null -> "$top — $line"
      else -> top
    }

    val contentIntent = openAppIntent()

    val notification = NotificationCompat.Builder(appContext, CHANNEL_ID)
      .setSmallIcon(R.drawable.ic_stat_scroll)
      .setContentTitle("Hoy scrolleaste ${formatCm(total)} ${STAGE_EMOJI[stage]}")
      .setContentText(text)
      .setStyle(NotificationCompat.BigTextStyle().bigText(text))
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

  /** Mismo formato que fmtDist en la app (src/lib/content.ts): "51 cm", "5,5 m", "180 m", "1,3 km". */
  private fun nf(x: Double, maxDecimals: Int): String =
    java.text.NumberFormat.getNumberInstance(clLocale).apply {
      maximumFractionDigits = maxDecimals
      minimumFractionDigits = 0
    }.format(x)

  fun formatCm(cm: Double): String {
    val m = cm / 100
    return when {
      m < 1 -> "${cm.roundToInt()} cm"
      m < 1000 -> "${nf(m, if (m < 10) 1 else 0)} m"
      else -> "${nf(m / 1000, if (m < 10_000) 2 else 1)} km"
    }
  }
}
