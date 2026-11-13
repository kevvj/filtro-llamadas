# Pendientes – Filtro de llamadas

Estado al 2026-11-13: versión 1.1.3 con OTA. Probado en el celular real (Samsung A22, 2 SIMs): bloqueo por SIM,
insistencia, "Es spam", Historial de 5 en 5, estadísticas, actualizador de APK y OTA.

## Por probar
1. **No molestar** con una llamada real dentro del horario.
2. **País y número oculto** con una llamada real (opcional: ya lo cubren las pruebas).

## Por hacer
4. **Llamadas recientes en Listas**: sección con las últimas llamadas (CallLog, permiso `READ_CALL_LOG`)
   y un botón "Spam" por número, sin escribir nada.
5. **Notificación "¿Era spam?"**: al colgar una llamada de un desconocido que entró, avisar con botón
   "Marcar como spam" (BroadcastReceiver, sin abrir la app). Detectar fin de llamada con `TelephonyCallback`
   (`CALL_STATE_IDLE`). Opción en Ajustes para apagarlo.
6. **Bajar el peso de la APK** (hoy ~52 MB; ya se quitó x86_64):
   - Activar R8 + shrinkResources (`expo-build-properties`). Probar filtro, atajos y actualizador antes de publicar.
   - Opcional: 2 APK (arm64 y armv7) con una URL por arquitectura en `version.json`. Solo arm64 dejaría fuera
     celulares baratos de 32 bits.
7. **Ícono propio** de la app (hoy usa el de Expo).
8. **APK firmada con llave propia** si se va a distribuir (hoy usa la llave debug).

## Reglas al trabajar
- Si cambia `FilterEngine.kt`, cambiar también `modules/call-filter/engine.ts` y su prueba.
- Antes de subir: `npm run check`. Para publicar APK: `npm run nueva-version` y subir; sin cambio de versión no se compila APK.
- No usar Expo/EAS para versiones: solo GitHub Releases.
- No hacer lista de spam compartida (no hay base de datos).
