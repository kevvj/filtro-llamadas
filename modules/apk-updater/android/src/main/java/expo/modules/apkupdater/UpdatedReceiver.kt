package expo.modules.apkupdater

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

// Android avisa aquí cuando terminó de reemplazar la app por la versión nueva.
// Si la actualización la empezó la propia app, la vuelve a abrir; si Android no deja abrirla
// desde segundo plano, deja una notificación para abrirla con un toque.
class UpdatedReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Intent.ACTION_MY_PACKAGE_REPLACED) return
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val pending = prefs.getBoolean(KEY_PENDING, false)
    prefs.edit().putBoolean(KEY_PENDING, false).apply()
    if (!pending) return

    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    } ?: return

    try {
      context.startActivity(launch)
    } catch (e: Exception) {
    }
    notify(context, launch)
  }

  private fun notify(context: Context, launch: Intent) {
    try {
      val nm = context.getSystemService(NotificationManager::class.java) ?: return
      if (Build.VERSION.SDK_INT >= 26) {
        nm.createNotificationChannel(NotificationChannel(CHANNEL, "Actualizaciones", NotificationManager.IMPORTANCE_DEFAULT))
      }
      val pi = PendingIntent.getActivity(context, 0, launch, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
      val version = try { context.packageManager.getPackageInfo(context.packageName, 0).versionName } catch (e: Exception) { "" }
      val builder = if (Build.VERSION.SDK_INT >= 26) android.app.Notification.Builder(context, CHANNEL)
      else @Suppress("DEPRECATION") android.app.Notification.Builder(context)
      val n = builder
        .setSmallIcon(android.R.drawable.stat_sys_download_done)
        .setContentTitle("Filtro de llamadas actualizado")
        .setContentText("Versión $version lista. El filtro sigue activo.")
        .setContentIntent(pi)
        .setAutoCancel(true)
        .build()
      nm.notify(NOTIF_ID, n)
    } catch (e: Exception) {
    }
  }

  companion object {
    const val PREFS = "apk_updater"
    const val KEY_PENDING = "pending_restart"
    private const val CHANNEL = "actualizaciones"
    private const val NOTIF_ID = 4712
  }
}
