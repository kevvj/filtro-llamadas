package expo.modules.apkupdater

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.os.bundleOf
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

// instala una APK descargada; desde Android 12 sin preguntar si la versión instalada la puso esta misma app
class ApkUpdaterModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw CodedException("Sin contexto de Android")

  override fun definition() = ModuleDefinition {
    Name("ApkUpdater")

    Events("onInstallStatus")

    OnCreate {
      InstallReceiver.listener = { status, message ->
        sendEvent("onInstallStatus", bundleOf("status" to status, "message" to message))
      }
    }

    OnDestroy {
      InstallReceiver.listener = null
    }

    // número de build (android.versionCode) para comparar con el del release
    Function("versionCode") {
      val info = context.packageManager.getPackageInfo(context.packageName, 0)
      if (Build.VERSION.SDK_INT >= 28) {
        info.longVersionCode.toDouble()
      } else {
        @Suppress("DEPRECATION")
        info.versionCode.toDouble()
      }
    }

    // nombre de la versión instalada (ej. 1.0.7)
    Function("versionName") {
      context.packageManager.getPackageInfo(context.packageName, 0).versionName ?: ""
    }

    // permiso de "instalar apps desconocidas" para esta app
    Function("canInstall") {
      Build.VERSION.SDK_INT < 26 || context.packageManager.canRequestPackageInstalls()
    }

    Function("openInstallSettings") {
      val intent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${context.packageName}"))
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    // corre en segundo plano: copia la APK a una sesión del instalador y la confirma
    AsyncFunction("install") { fileUri: String ->
      val file = File(Uri.parse(fileUri).path ?: throw CodedException("Ruta inválida: $fileUri"))
      val installer = context.packageManager.packageInstaller
      val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL)
      if (Build.VERSION.SDK_INT >= 31) {
        params.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED)
      }

      // al terminar, UpdatedReceiver reabre la app
      context.getSharedPreferences(UpdatedReceiver.PREFS, Context.MODE_PRIVATE).edit().putBoolean(UpdatedReceiver.KEY_PENDING, true).commit()

      val sessionId = installer.createSession(params)
      installer.openSession(sessionId).use { session ->
        file.inputStream().use { input ->
          session.openWrite("app.apk", 0, file.length()).use { output ->
            input.copyTo(output)
            session.fsync(output)
          }
        }

        val intent = Intent(context, InstallReceiver::class.java)
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= 31) PendingIntent.FLAG_MUTABLE else 0)
        val pending = PendingIntent.getBroadcast(context, sessionId, intent, flags)
        session.commit(pending.intentSender)
      }
    }
  }
}
