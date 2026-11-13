package expo.modules.callfilter

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.telephony.TelephonyManager
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject

// Notificación "¿Era spam?" al colgar una llamada de un desconocido que entró.
// El filtro guarda el número al dejarlo pasar; al quedar el teléfono en reposo se pregunta.
object SpamPrompt {
  private const val CHANNEL = "era_spam"
  private const val KEY = "pending_unknown"
  const val ACTION_MARK = "expo.modules.callfilter.MARK_SPAM"

  fun enabled(ctx: Context): Boolean = try {
    JSONObject(FilterEngine.getConfig(ctx).ifBlank { "{}" }).optBoolean("askSpam", true)
  } catch (e: Exception) { true }

  fun remember(ctx: Context, number: String) {
    if (!enabled(ctx)) return
    val o = JSONObject().put("number", number).put("time", System.currentTimeMillis())
    FilterEngine.prefs(ctx).edit().putString(KEY, o.toString()).apply()
  }

  fun onIdle(ctx: Context) {
    val p = FilterEngine.prefs(ctx)
    val raw = p.getString(KEY, null) ?: return
    p.edit().remove(KEY).apply()
    val o = try { JSONObject(raw) } catch (e: Exception) { return }
    // solo si la llamada fue hace poco (evita avisos viejos si se perdió el evento)
    if (System.currentTimeMillis() - o.optLong("time") > 2 * 60 * 60 * 1000) return
    val number = o.optString("number").ifBlank { return }
    if (!enabled(ctx)) return
    show(ctx, number)
  }

  private fun show(ctx: Context, number: String) {
    val nm = ctx.getSystemService(NotificationManager::class.java) ?: return
    if (Build.VERSION.SDK_INT >= 26) {
      nm.createNotificationChannel(NotificationChannel(CHANNEL, "¿Era spam?", NotificationManager.IMPORTANCE_DEFAULT))
    }
    val id = number.hashCode()
    val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    val mark = PendingIntent.getBroadcast(
      ctx, id,
      Intent(ctx, MarkSpamReceiver::class.java).setAction(ACTION_MARK).putExtra("number", number).putExtra("id", id),
      flags
    )
    val open = ctx.packageManager.getLaunchIntentForPackage(ctx.packageName)?.let {
      PendingIntent.getActivity(ctx, 0, it, flags)
    }
    val b = if (Build.VERSION.SDK_INT >= 26) android.app.Notification.Builder(ctx, CHANNEL)
    else @Suppress("DEPRECATION") android.app.Notification.Builder(ctx)
    b.setSmallIcon(R.drawable.ic_tile_filter)
      .setContentTitle("¿Era spam?")
      .setContentText("Te llamó $number, que no está en tus contactos.")
      .setAutoCancel(true)
      .addAction(android.app.Notification.Action.Builder(null, "Marcar como spam", mark).build())
    open?.let { b.setContentIntent(it) }
    try {
      nm.notify(id, b.build())
    } catch (e: SecurityException) {
      Log.w(FilterScreeningService.TAG, "sin permiso de notificaciones")
    }
  }

  // Agrega el número a la lista de spam (y lo quita de permitidos), igual que la app.
  fun markSpam(ctx: Context, number: String) {
    val cfg = try { JSONObject(FilterEngine.getConfig(ctx).ifBlank { return }) } catch (e: Exception) { return }
    val spam = cfg.optJSONArray("spam") ?: JSONArray()
    for (i in 0 until spam.length()) {
      if (FilterEngine.sameNumber(spam.optJSONObject(i)?.optString("number") ?: "", number)) return
    }
    val out = JSONArray().put(JSONObject().put("number", number).put("added", System.currentTimeMillis()))
    for (i in 0 until spam.length()) out.put(spam.get(i))
    cfg.put("spam", out)
    cfg.optJSONArray("allow")?.let { allow ->
      val keep = JSONArray()
      for (i in 0 until allow.length()) {
        val n = allow.optJSONObject(i)?.optString("number") ?: ""
        if (!FilterEngine.sameNumber(n, number)) keep.put(allow.get(i))
      }
      cfg.put("allow", keep)
    }
    FilterEngine.setConfig(ctx, cfg.toString())
  }
}

// El sistema avisa cada cambio de estado de llamada; en reposo (colgó) se pregunta si era spam.
class CallEndReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.getStringExtra(TelephonyManager.EXTRA_STATE) == TelephonyManager.EXTRA_STATE_IDLE) {
      SpamPrompt.onIdle(context)
    }
  }
}

// Botón "Marcar como spam" de la notificación.
class MarkSpamReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val number = intent.getStringExtra("number") ?: return
    SpamPrompt.markSpam(context, number)
    context.getSystemService(NotificationManager::class.java)?.cancel(intent.getIntExtra("id", 0))
  }
}
