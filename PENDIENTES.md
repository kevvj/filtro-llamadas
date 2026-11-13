# Pendientes – Filtro de llamadas

Estado al 2026-11-13: todo está subido a `main` y el último CI pasó (release con estadísticas publicado).

## Urgente
0. **El bloqueo no funcionó en un celular real con 2 SIMs** (regla "Contactos", todos los permisos): entró spam.
   Sospechas: (a) no se activó el rol de filtro ("Activar filtro"); (b) `simIdOf` en `FilterScreeningService.kt` no reconoce
   la SIM y devuelve "default" → usa `defaultRule` ("all") y deja pasar todo. Revisar si dice "Protección activa" y si
   el Historial muestra esas llamadas como "entró".
   Recomendado: depurar con el celular por USB con `adb` (Depuración USB activada): `adb logcat`, `adb shell dumpsys role`,
   capturas con `adb exec-out screencap -p`.

## Por probar
1. **Estadísticas** (`src/screens/Stats.tsx`, al final del Historial): revisarlas en la vista web
   (`npx expo start --web --port 8081 --clear` → http://localhost:8081/telefono.html).
2. **Historial con desconocidos que entraron** (botón "Es spam"): probarlo en un celular real.
3. **Celular real con 2 SIMs**: probar la regla por línea (el emulador solo tiene una SIM).

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
