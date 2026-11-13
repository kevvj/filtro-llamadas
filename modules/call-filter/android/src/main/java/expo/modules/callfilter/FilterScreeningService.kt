package expo.modules.callfilter

import android.content.Context
import android.os.Build
import android.telecom.Call
import android.telecom.CallScreeningService
import android.telecom.PhoneAccountHandle
import android.telephony.SubscriptionManager
import android.telephony.TelephonyManager
import android.util.Log

// Android llama a este servicio en cada llamada entrante (si la app tiene el rol de "filtro de llamadas").
class FilterScreeningService : CallScreeningService() {

  override fun onScreenCall(details: Call.Details) {
    val direction = if (Build.VERSION.SDK_INT >= 29) details.callDirection else -99
    // Solo se ignoran las salientes: algunos Samsung marcan las entrantes como UNKNOWN
    if (Build.VERSION.SDK_INT >= 29 && direction == Call.Details.DIRECTION_OUTGOING) {
      Log.i(TAG, "saliente: no se filtra")
      respondToCall(details, CallResponse.Builder().build())
      return
    }
    val number = details.handle?.schemeSpecificPart
    val simId = simIdOf(this, details.accountHandle)
    val decision = try {
      FilterEngine.decide(this, number, simId)
    } catch (e: Exception) {
      Log.e(TAG, "error al decidir", e)
      FilterEngine.Decision(false, "error: ${e.javaClass.simpleName}")
    }
    Log.i(TAG, "dir=$direction handle=${details.accountHandle?.id} sim=$simId num=${number?.takeLast(4)} -> blocked=${decision.blocked} reason=${decision.reason}")

    val response = CallResponse.Builder()
    if (decision.blocked) {
      response.setDisallowCall(true).setRejectCall(true).setSkipCallLog(false).setSkipNotification(true)
      FilterEngine.addLog(this, number ?: "", simId, decision.reason)
    } else if (decision.reason !in setOf("ok", "allowlist", "filtro apagado")) {
      // repeat, error, sin configurar...: queda en el historial para ver por qué entró
      FilterEngine.addLog(this, number ?: "", simId, decision.reason, allowed = true)
    } else if (decision.reason == "ok" && !number.isNullOrBlank() && !FilterEngine.isContact(this, number)) {
      // desconocido que entró: queda en el historial para poder marcarlo como spam
      FilterEngine.addLog(this, number, simId, "entered", allowed = true)
    }
    respondToCall(details, response.build())
  }

  companion object {
    const val TAG = "FiltroLlamadas"

    // Id de la SIM (subscriptionId) por la que entra la llamada; "default" si no se puede saber.
    fun simIdOf(ctx: Context, handle: PhoneAccountHandle?): String {
      if (handle == null) return "default"
      try {
        if (Build.VERSION.SDK_INT >= 30) {
          val tm = ctx.getSystemService(TelephonyManager::class.java)
          val id = tm.getSubscriptionId(handle)
          if (id != SubscriptionManager.INVALID_SUBSCRIPTION_ID) return id.toString()
        }
      } catch (e: Exception) { }
      handle.id.toIntOrNull()?.let { return it.toString() }
      try {
        val sm = ctx.getSystemService(SubscriptionManager::class.java)
        sm.activeSubscriptionInfoList?.forEach { info ->
          @Suppress("DEPRECATION")
          val icc = info.iccId
          if (!icc.isNullOrEmpty() && handle.id.startsWith(icc)) return info.subscriptionId.toString()
        }
      } catch (e: Exception) { }
      return "default"
    }
  }
}
