package expo.modules.callfilter

import android.service.quicksettings.Tile
import android.service.quicksettings.TileService
import org.json.JSONObject

// Botones en los Ajustes rápidos de Android (panel de notificaciones).
// Cambian la misma configuración que la app; la app la vuelve a leer al abrirse.
abstract class ConfigTile : TileService() {
  abstract fun isOn(cfg: JSONObject): Boolean
  abstract fun toggle(cfg: JSONObject)
  abstract val label: String

  private fun config(): JSONObject? = try {
    FilterEngine.getConfig(this).takeIf { it.isNotBlank() }?.let { JSONObject(it) }
  } catch (e: Exception) { null }

  private fun refresh() {
    val tile = qsTile ?: return
    val cfg = config()
    tile.label = label
    tile.state = when {
      cfg == null -> Tile.STATE_UNAVAILABLE // la app aún no se ha abierto
      isOn(cfg) -> Tile.STATE_ACTIVE
      else -> Tile.STATE_INACTIVE
    }
    tile.updateTile()
  }

  override fun onStartListening() = refresh()

  override fun onClick() {
    val cfg = config() ?: return
    toggle(cfg)
    FilterEngine.setConfig(this, cfg.toString())
    refresh()
  }
}

class FilterTileService : ConfigTile() {
  override val label = "Filtro"
  override fun isOn(cfg: JSONObject) = cfg.optBoolean("enabled", true)
  override fun toggle(cfg: JSONObject) { cfg.put("enabled", !isOn(cfg)) }
}

class QuietTileService : ConfigTile() {
  override val label = "No molestar"
  override fun isOn(cfg: JSONObject) = cfg.optJSONObject("quiet")?.optBoolean("enabled") ?: false
  override fun toggle(cfg: JSONObject) {
    val q = cfg.optJSONObject("quiet") ?: JSONObject().put("from", 22 * 60).put("to", 7 * 60)
    q.put("enabled", !isOn(cfg))
    cfg.put("quiet", q)
  }
}
