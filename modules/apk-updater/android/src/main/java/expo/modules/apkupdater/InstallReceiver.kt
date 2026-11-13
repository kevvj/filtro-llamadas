package expo.modules.apkupdater

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.os.Build

// recibe el resultado de la instalación que pidió ApkUpdaterModule
class InstallReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    when (intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE)) {
      // Android pide confirmar (la primera vez, o si no se puede en silencio)
      PackageInstaller.STATUS_PENDING_USER_ACTION -> {
        val confirm = if (Build.VERSION.SDK_INT >= 33) {
          intent.getParcelableExtra(Intent.EXTRA_INTENT, Intent::class.java)
        } else {
          @Suppress("DEPRECATION")
          intent.getParcelableExtra(Intent.EXTRA_INTENT)
        }
        confirm?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        confirm?.let { context.startActivity(it) }
        listener?.invoke("pending", null)
      }
      // si sale bien Android cierra la app para reemplazarla
      PackageInstaller.STATUS_SUCCESS -> listener?.invoke("success", null)
      else -> listener?.invoke("failure", intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE))
    }
  }

  companion object {
    var listener: ((status: String, message: String?) -> Unit)? = null
  }
}
