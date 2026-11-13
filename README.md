# Filtro de llamadas

App Android (React Native / Expo) para filtrar llamadas entrantes. Todo local, sin servidor.

- Reglas por SIM: todas, solo contactos o ninguna.
- Solo llamadas de ciertos países (detecta tu país por el número de tu SIM).
- Spam: un número marcado no vuelve a entrar nunca.
- Permitidos, prefijos bloqueados, números ocultos, No molestar por horario, historial y "Probar un número".

## Descargar
APK en [Releases](../../releases/latest). Requiere Android 10 o superior. Al abrirla, toca "Activar filtro" y elige
la app como filtro de llamadas.

## Desarrollo
```
npm install
npx expo start --web          # vista previa: http://localhost:8081/telefono.html
npx expo prebuild -p android  # genera android/
cd android && ./gradlew assembleRelease
```
El filtrado real está en `modules/call-filter` (CallScreeningService en Kotlin).
