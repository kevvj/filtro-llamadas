# Pendientes – Filtro de llamadas

Estado al 2026-11-13: versión 1.2.0 (APK de 19 MB con R8). Probado en el celular real (Samsung A22, 2 SIMs): bloqueo por SIM,
insistencia, "Es spam", Historial, estadísticas, actualizador, OTA, llamadas recientes, aviso "¿Era spam?" e ícono.

## Por probar
1. Botón **"Marcar como spam"** de la notificación "¿Era spam?" (la notificación ya sale).
2. **No molestar** con una llamada real dentro del horario.
3. **País y número oculto** con una llamada real (opcional: ya lo cubren las pruebas).

## Por hacer
1. **APK firmada con llave propia** si se va a distribuir (hoy usa la llave debug). Explicárselo al usuario antes.

## Reglas al trabajar
- Si cambia `FilterEngine.kt`, cambiar también `modules/call-filter/engine.ts` y su prueba.
- Antes de subir: `npm run check`. Para publicar APK: `npm run nueva-version` y subir; sin cambio de versión no se compila APK.
- No usar Expo/EAS para versiones: solo GitHub Releases.
- No hacer lista de spam compartida (no hay base de datos).
