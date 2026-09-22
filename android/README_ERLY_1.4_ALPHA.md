ERLY 1.4 ALPHA
================

Esta carpeta contiene una primera base de migración a Android.

Objetivo de Alpha:
- Mantener la interfaz HTML/CSS/JS existente.
- Ejecutarla dentro de un WebView Android.
- Añadir un puente nativo JavaScript -> Android.
- Preparar el terreno para acciones Android nativas.

IMPORTANTE:
- El backend Flask/Python NO se ha eliminado.
- Esta Alpha es una base de migración, no una APK final.
- La comunicación con el backend debe definirse antes de considerar la app autónoma.
- El AndroidBridge expone únicamente funciones iniciales de apertura de URL/aplicación.

Para compilar:
1. Abrir la carpeta android/ con Android Studio.
2. Esperar a que Gradle sincronice.
3. Conectar un dispositivo/emulador.
4. Ejecutar la app.

Siguiente paso:
- Integrar la comunicación con el backend actual.
- Probar comandos Android nativos.
- Migrar voz/permisos de forma progresiva.
