package cl.digitalfox.scrolltracker

import android.content.Context
import android.net.Uri
import java.net.HttpURLConnection
import java.net.URL
import kotlin.random.Random

/**
 * Ranking mundial (Top 25) sobre dreamlo.com. Es OPCIONAL: solo se envía algo si el usuario se une.
 * Lo que viaja: apodo (con un número para distinguir apodos repetidos), metros totales y mascota.
 * Las claves vienen de BuildConfig (gradle.properties del que compila), nunca del repo público.
 * La clave privada solo se usa aquí; JS nunca la ve.
 */
object Leaderboard {
  private const val BASE = "http://dreamlo.com/lb/" // el plan gratis de dreamlo es solo HTTP
  private const val PREFS = "scroll_tracker"
  private const val KEY_NAME = "rankName"
  private const val KEY_LAST = "rankLastSubmit"

  val available: Boolean
    get() = BuildConfig.DREAMLO_PRIVATE.isNotEmpty() && BuildConfig.DREAMLO_PUBLIC.isNotEmpty()

  fun profile(context: Context): Map<String, Any?> {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    return mapOf(
      "name" to prefs.getString(KEY_NAME, null),
      "lastSubmit" to prefs.getLong(KEY_LAST, 0L).toDouble()
    )
  }

  /**
   * Apodo → "Apodo_k3x9q2". Solo letras y números ASCII (dreamlo usa el nombre en la URL y como clave).
   * La etiqueta de 6 caracteres (≈2.000 millones de combinaciones) evita que dos "Jean" se pisen o se borren entre sí.
   */
  fun join(context: Context, nick: String): String {
    val clean = nick.filter { it.isLetterOrDigit() && it.code < 128 }.take(14)
    require(clean.length >= 2) { "El apodo necesita al menos 2 letras o números" }
    val alphabet = "abcdefghijkmnpqrstuvwxyz23456789" // sin 0/o ni 1/l para que se lea bien
    val tag = (1..6).map { alphabet[Random.nextInt(alphabet.length)] }.joinToString("")
    val name = "${clean}_$tag"
    send(context, name)
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY_NAME, name).apply()
    return name
  }

  /** Envía el total acumulado actual. dreamlo guarda el mayor puntaje por nombre. */
  fun submit(context: Context) {
    val name = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_NAME, null) ?: return
    send(context, name)
  }

  fun leave(context: Context) {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val name = prefs.getString(KEY_NAME, null) ?: return
    get("$BASE${BuildConfig.DREAMLO_PRIVATE}/delete/${Uri.encode(name)}")
    prefs.edit().remove(KEY_NAME).remove(KEY_LAST).apply()
  }

  /** Top del tablero en JSON (formato de dreamlo; lo interpreta JS). */
  fun top(): String = get("$BASE${BuildConfig.DREAMLO_PUBLIC}/json")

  private fun send(context: Context, name: String) {
    require(available) { "Ranking no disponible en esta versión" }
    val (meters, mascot) = ScrollStore.rankingSnapshot()
    get("$BASE${BuildConfig.DREAMLO_PRIVATE}/add/${Uri.encode(name)}/$meters/0/${Uri.encode(mascot)}")
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putLong(KEY_LAST, System.currentTimeMillis()).apply()
  }

  private fun get(url: String): String {
    val conn = URL(url).openConnection() as HttpURLConnection
    try {
      conn.connectTimeout = 15_000
      conn.readTimeout = 15_000
      val code = conn.responseCode
      if (code != 200) error("El ranking respondió $code")
      return conn.inputStream.bufferedReader().use { it.readText() }
    } finally {
      conn.disconnect()
    }
  }
}
