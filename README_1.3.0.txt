ChatbotErly — actualización de prueba B para búsqueda nativa de TikTok

ChatbotErly 1.3.2
=================

Base: ChatbotErly 1.2.6 Gestos.

Incluye:
- TikTok: "busca X en TikTok" con permiso explícito.
- Gestos de manos más visibles y posición base más baja.
- Gesto de pensamiento delante del rostro de forma temporal.
- Cejas y expresiones dinámicas.
- Boca animada durante la voz.
- Configuración persistente: voz, gestos, animaciones, memoria, velocidad y tono.
- Memoria clasificable y opción de desactivarla desde Configuración.
- Sensor de cámara/mano conservado pero desactivado.
- Chat, micrófono, voz, memoria y acciones web existentes conservados.

Instalación rápida:
1. Instala dependencias: pip install -r requirements.txt
2. Copia .env.example a .env y coloca tu clave de Groq.
3. Ejecuta: python app.py

Nota: esta distribución no incluye la clave privada de Groq ni la base de datos personal memory.db.


1.3.2: panel de chat opcional con escritura progresiva y apertura nativa de TikTok con respaldo web.


ACTUALIZACIÓN DE PRUEBA B — TIKTOK
- Se prueba primero el esquema nativo snssdk1233://search?...
- Se prueba después un App Link HTTPS dirigido al paquete oficial de TikTok.
- Se conserva la búsqueda web como último respaldo.
- No se modificaron chat, voz, memoria ni las demás acciones web.
