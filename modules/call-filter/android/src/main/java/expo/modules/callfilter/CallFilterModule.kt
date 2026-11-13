package expo.modules.callfilter

import android.app.StatusBarManager
import android.app.role.RoleManager
import android.content.ComponentName
import android.graphics.drawable.Icon
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.telephony.SubscriptionManager
import android.telephony.TelephonyManager
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.Locale

class CallFilterModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw CodedException("Sin contexto de Android")

  override fun definition() = ModuleDefinition {
    Name("CallFilter")

    // ¿La app es el filtro de llamadas del sistema? (Android 10+)
    Function("hasScreeningRole") {
      if (Build.VERSION.SDK_INT < 29) return@Function false
      val rm = context.getSystemService(RoleManager::class.java)
      rm.isRoleAvailable(RoleManager.ROLE_CALL_SCREENING) && rm.isRoleHeld(RoleManager.ROLE_CALL_SCREENING)
    }

    // Abre el diálogo del sistema para elegir la app como filtro de llamadas.
    Function("requestScreeningRole") {
      if (Build.VERSION.SDK_INT < 29) return@Function false
      val rm = context.getSystemService(RoleManager::class.java)
      if (!rm.isRoleAvailable(RoleManager.ROLE_CALL_SCREENING)) return@Function false
      val activity = appContext.currentActivity ?: return@Function false
      activity.startActivityForResult(rm.createRequestRoleIntent(RoleManager.ROLE_CALL_SCREENING), 4711)
      true
    }

    // Pide a Android agregar un atajo a los Ajustes rápidos (Android 13+). false si no se puede.
    Function("addTile") { kind: String ->
      if (Build.VERSION.SDK_INT < 33) return@Function false
      val sbm = context.getSystemService(StatusBarManager::class.java) ?: return@Function false
      val (cls, label, icon) = if (kind == "quiet")
        Triple(QuietTileService::class.java, "No molestar", R.drawable.ic_tile_quiet)
      else Triple(FilterTileService::class.java, "Filtro", R.drawable.ic_tile_filter)
      sbm.requestAddTileService(ComponentName(context, cls), label, Icon.createWithResource(context, icon), context.mainExecutor) { }
      true
    }

    Function("openAppSettings") {
      val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + context.packageName))
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    // País del usuario: SIM, luego red, luego idioma del teléfono. Código ISO en mayúsculas ("CO").
    Function("getDeviceCountry") {
      val tm = context.getSystemService(TelephonyManager::class.java)
      val iso = listOf(tm?.simCountryIso, tm?.networkCountryIso, Locale.getDefault().country)
        .firstOrNull { !it.isNullOrBlank() } ?: ""
      iso.uppercase(Locale.ROOT)
    }

    // SIMs activas (necesita READ_PHONE_STATE; el número, READ_PHONE_NUMBERS).
    Function("getSims") {
      val out = mutableListOf<Map<String, Any?>>()
      try {
        val sm = context.getSystemService(SubscriptionManager::class.java)
        sm.activeSubscriptionInfoList?.forEach { info ->
          val number = try {
            if (Build.VERSION.SDK_INT >= 33) sm.getPhoneNumber(info.subscriptionId)
            else @Suppress("DEPRECATION") info.number
          } catch (e: Exception) { "" }
          val iso = info.countryIso ?: ""
          out.add(
            mapOf(
              "id" to info.subscriptionId.toString(),
              "slot" to info.simSlotIndex,
              "name" to (info.displayName?.toString() ?: "SIM ${info.simSlotIndex + 1}"),
              "carrier" to (info.carrierName?.toString() ?: ""),
              "countryIso" to iso.uppercase(Locale.ROOT),
              "number" to (number ?: "")
            )
          )
        }
      } catch (e: SecurityException) {
      } catch (e: Exception) {
      }
      out
    }

    Function("getConfig") { FilterEngine.getConfig(context) }
    Function("setConfig") { json: String -> FilterEngine.setConfig(context, json) }
    Function("getLog") { FilterEngine.getLog(context) }
    Function("clearLog") { FilterEngine.clearLog(context) }

    // Prueba: qué pasaría si este número llama por esta SIM (usa la config guardada).
    Function("test") { number: String, simId: String ->
      val d = FilterEngine.decide(context, number, simId)
      mapOf("blocked" to d.blocked, "reason" to d.reason)
    }
  }
}
