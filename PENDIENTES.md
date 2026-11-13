# Pendientes – Filtro de llamadas

Estado al 2026-11-13: versión 1.1.3 con OTA. Probado en el celular real (Samsung A22, 2 SIMs): bloqueo por SIM,
insistencia, "Es spam", Historial de 5 en 5, estadísticas, actualizador de APK y OTA.

## Por probar (1.2.0)
1. **Llamadas recientes** en Listas (pide el permiso de registro de llamadas) y botones Spam / Permitir.
2. **Notificación "¿Era spam?"** al colgar con un desconocido; el botón lo agrega a spam.
   Si no llega, el aviso PHONE_STATE no está llegando con la app cerrada: cambiar a otro método.
3. **APK con R8 + shrink + libs comprimidas**: que filtro, atajos, OTA y actualizador sigan funcionando.
4. **Ícono nuevo** (escudo con teléfono).
5. **No molestar** con una llamada real dentro del horario.
6. **País y número oculto** con una llamada real (opcional: ya lo cubren las pruebas).

## Por hacer
1. **APK firmada con llave propia** si se va a distribuir (hoy usa la llave debug). Explicárselo al usuario antes.

## Reglas al trabajar
- Si cambia `FilterEngine.kt`, cambiar también `modules/call-filter/engine.ts` y su prueba.
- Antes de subir: `npm run check`. Para publicar APK: `npm run nueva-version` y subir; sin cambio de versión no se compila APK.
- No usar Expo/EAS para versiones: solo GitHub Releases.
- No hacer lista de spam compartida (no hay base de datos).
