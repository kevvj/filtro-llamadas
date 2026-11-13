package expo.modules.callfilter

import android.content.Context
import android.net.Uri
import android.provider.ContactsContract
import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar

// Reglas guardadas por la app (JSON en SharedPreferences) y la decisión de bloquear o no una llamada.
// La app (JS) escribe la configuración; el servicio de filtrado solo la lee.
object FilterEngine {
  private const val PREFS = "filtro_llamadas"
  private const val KEY_CONFIG = "config"
  private const val KEY_LOG = "log"
  private const val MAX_LOG = 300

  data class Decision(val blocked: Boolean, val reason: String)

  fun prefs(ctx: Context) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun getConfig(ctx: Context): String = prefs(ctx).getString(KEY_CONFIG, "") ?: ""
  fun setConfig(ctx: Context, json: String) = prefs(ctx).edit().putString(KEY_CONFIG, json).apply()
  fun getLog(ctx: Context): String = prefs(ctx).getString(KEY_LOG, "[]") ?: "[]"
  fun clearLog(ctx: Context) = prefs(ctx).edit().putString(KEY_LOG, "[]").apply()

  @Synchronized
  fun addLog(ctx: Context, number: String, simId: String, reason: String) {
    val old = try { JSONArray(getLog(ctx)) } catch (e: Exception) { JSONArray() }
    val out = JSONArray()
    out.put(JSONObject().apply {
      put("number", number)
      put("sim", simId)
      put("reason", reason)
      put("time", System.currentTimeMillis())
    })
    for (i in 0 until minOf(old.length(), MAX_LOG - 1)) out.put(old.get(i))
    prefs(ctx).edit().putString(KEY_LOG, out.toString()).apply()
  }

  // Solo dígitos (sin +, espacios ni guiones). "00" internacional se quita.
  fun digits(n: String): String {
    val d = n.filter { it.isDigit() }
    return if (n.trim().startsWith("00")) d.removePrefix("00") else d
  }

  // Mismo número aunque uno venga con indicativo (+57 300...) y el otro sin él (300...).
  fun sameNumber(a: String, b: String): Boolean {
    val x = digits(a); val y = digits(b)
    if (x.isEmpty() || y.isEmpty()) return false
    if (x == y) return true
    val (short, long) = if (x.length <= y.length) x to y else y to x
    return short.length >= 7 && long.endsWith(short)
  }

  private fun inList(arr: JSONArray?, number: String): Boolean {
    if (arr == null) return false
    for (i in 0 until arr.length()) {
      val item = arr.optJSONObject(i)?.optString("number") ?: arr.optString(i)
      if (sameNumber(item, number)) return true
    }
    return false
  }

  fun isContact(ctx: Context, number: String): Boolean = try {
    val uri = Uri.withAppendedPath(ContactsContract.PhoneLookup.CONTENT_FILTER_URI, Uri.encode(number))
    ctx.contentResolver.query(uri, arrayOf(ContactsContract.PhoneLookup._ID), null, null, null)?.use { it.count > 0 } ?: false
  } catch (e: Exception) { false }

  // Indicativo del país del número. Sin "+" ni "00" se asume llamada nacional (país de la SIM).
  private fun countryAllowed(raw: String, countries: JSONArray, homeCode: String): Boolean {
    val t = raw.trim()
    val international = t.startsWith("+") || t.startsWith("00")
    val d = digits(t)
    val codes = (0 until countries.length()).map { countries.optString(it) }
    if (!international) return codes.contains(homeCode)
    return codes.any { it.isNotEmpty() && d.startsWith(it) }
  }

  private fun inQuietHours(quiet: JSONObject?): Boolean {
    if (quiet == null || !quiet.optBoolean("enabled")) return false
    val c = Calendar.getInstance()
    val now = c.get(Calendar.HOUR_OF_DAY) * 60 + c.get(Calendar.MINUTE)
    val from = quiet.optInt("from", 22 * 60)
    val to = quiet.optInt("to", 7 * 60)
    return if (from <= to) now in from until to else now >= from || now < to
  }

  fun decide(ctx: Context, rawNumber: String?, simId: String): Decision {
    val cfgText = getConfig(ctx)
    if (cfgText.isBlank()) return Decision(false, "sin configurar")
    val cfg = try { JSONObject(cfgText) } catch (e: Exception) { return Decision(false, "config inválida") }
    if (!cfg.optBoolean("enabled", true)) return Decision(false, "filtro apagado")

    val number = rawNumber?.trim().orEmpty()
    val sims = cfg.optJSONObject("sims")
    val rule = sims?.optJSONObject(simId) ?: cfg.optJSONObject("defaultRule") ?: JSONObject()
    val mode = rule.optString("mode", "all")

    if (number.isEmpty() || digits(number).isEmpty()) {
      if (cfg.optBoolean("blockPrivate")) return Decision(true, "private")
      if (mode == "none") return Decision(true, "line_off")
      if (mode == "contacts") return Decision(true, "unknown")
      return Decision(false, "ok")
    }

    if (inList(cfg.optJSONArray("spam"), number)) return Decision(true, "spam")
    if (inList(cfg.optJSONArray("allow"), number)) return Decision(false, "allowlist")
    if (mode == "none") return Decision(true, "line_off")

    val prefixes = cfg.optJSONArray("prefixes")
    if (prefixes != null) {
      val d = digits(number)
      for (i in 0 until prefixes.length()) {
        val p = digits(prefixes.optString(i))
        if (p.isNotEmpty() && d.startsWith(p)) return Decision(true, "prefix")
      }
    }

    if (rule.optBoolean("countryOnly")) {
      val countries = rule.optJSONArray("countries") ?: JSONArray()
      if (!countryAllowed(number, countries, rule.optString("homeCode"))) return Decision(true, "country")
    }

    val needContact = mode == "contacts" || inQuietHours(cfg.optJSONObject("quiet"))
    if (needContact && !isContact(ctx, number)) {
      return Decision(true, if (mode == "contacts") "unknown" else "quiet")
    }
    return Decision(false, "ok")
  }
}
