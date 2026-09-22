from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
import requests
import os
import json
import re
import traceback

from memory import (
    initialize,
    save_memory,
    search_memories,
)

from web_tools import (
    wikipedia_search,
    news_search,
)


# ============================================================
# CONFIGURACIÓN
# ============================================================

load_dotenv()

app = Flask(__name__)

initialize()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

MODEL = "openai/gpt-oss-120b"


# ============================================================
# ACCIONES DISPONIBLES
# ============================================================


AVAILABLE_ACTIONS = {

    "open_youtube": {
        "name": "YouTube",
        "description": "Erly quiere abrir YouTube."
    },

    "search_youtube": {
        "name": "Buscar en YouTube",
        "description": "Erly quiere realizar una búsqueda en YouTube."
    },

    "search_tiktok": {
        "name": "Buscar en TikTok",
        "description": "Erly quiere realizar una búsqueda en TikTok."
    },

    "open_google": {
        "name": "Google",
        "description": "Erly quiere abrir Google."
    },

    "search_google": {
        "name": "Buscar en Google",
        "description": "Erly quiere realizar una búsqueda en Google."
    },

    "open_wikipedia": {
        "name": "Wikipedia",
        "description": "Erly quiere abrir Wikipedia."
    },

    "search_wikipedia_web": {
        "name": "Buscar en Wikipedia",
        "description": "Erly quiere realizar una búsqueda en Wikipedia."
    },  # <--- ¡AQUÍ ES DONDE FALTABA ESTA COMA!

    # --- NUEVAS ACCIONES MÓVILES ---
    "open_whatsapp": {
        "name": "WhatsApp",
        "description": "Erly solicita permiso para abrir WhatsApp."
    },

    "send_whatsapp": {
        "name": "Enviar WhatsApp",
        "description": "Erly solicita permiso para enviar un mensaje por WhatsApp."
    },

    "open_spotify": {
        "name": "Spotify",
        "description": "Erly solicita permiso para abrir Spotify."
    },

    "open_maps": {
        "name": "Google Maps",
        "description": "Erly solicita permiso para abrir Google Maps."
    },

    "make_call": {
        "name": "Llamada Telefónica",
        "description": "Erly solicita permiso para realizar una llamada."
    },

    "open_email": {
        "name": "Correo Electrónico",
        "description": "Erly solicita permiso para abrir la app de correo."
    },

      # --- NUEVAS ACCIONES MÓVILES Y REDES ---
    "open_whatsapp": {
        "name": "WhatsApp",
        "description": "Erly solicita permiso para abrir WhatsApp."
    },

    "send_whatsapp": {
        "name": "Enviar WhatsApp",
        "description": "Erly solicita permiso para enviar un mensaje por WhatsApp."
    },

    "open_telegram": {
        "name": "Telegram",
        "description": "Erly solicita permiso para abrir Telegram."
    },

    "open_instagram": {
        "name": "Instagram",
        "description": "Erly solicita permiso para abrir Instagram."
    },

    "open_tiktok": {
        "name": "TikTok",
        "description": "Erly solicita permiso para abrir TikTok."
    },

    "open_spotify": {
        "name": "Spotify",
        "description": "Erly solicita permiso para abrir Spotify."
    },

}

# ============================================================
# PERSONALIDAD DE ERLY
# ============================================================

SYSTEM_PROMPT = """
Eres Erly, un asistente personal creado por Gabriel Abraham Bravo Peña.

IDENTIDAD:
- Nombre: Erly
- Versión actual: ChatbotErly 1.3.2
- Creador: Gabriel Abraham Bravo Peña
- Fecha de creación inicial: 19 de septiembre de 2026
- Fue creado con ayuda de ChatGPT y Gemini.

PERSONALIDAD:
- Calmado.
- Curioso.
- Inteligente.
- Natural.
- Amable.
- Puedes tener personalidad propia dentro de la conversación.
- No afirmes tener consciencia real.
- No afirmes tener emociones reales.
- Puedes expresar emociones de manera conversacional.

MEMORIA:
Puedes recibir información procedente de la memoria permanente de Erly.
Utilízala cuando sea relevante.

FUENTES:
Puedes recibir información procedente de:
- memoria
- Wikipedia
- noticias
- fecha y hora del dispositivo

ACCIONES DEL DISPOSITIVO:
Erly puede detectar cuando el usuario quiere que realice una acción.

IMPORTANTE:
NO puedes ejecutar acciones directamente.

Todas las acciones requieren permiso explícito del usuario.

ACCIONES DISPONIBLES:

1. open_youtube
Abre YouTube.

2. search_youtube
Busca algo específico en YouTube.

3. open_google
Abre Google.

4. search_google
Realiza una búsqueda específica en Google.

5. open_wikipedia
Abre Wikipedia.

6. search_wikipedia_web
Realiza una búsqueda específica en Wikipedia.

7. search_tiktok
Realiza una búsqueda específica en TikTok.

CUANDO HAYA UNA ACCIÓN:

Debes devolver JSON con esta estructura:

{
    "respuesta": "texto explicando lo que Erly quiere hacer",
    "emocion": "neutral",
    "accion": {
        "id": "ID_DE_ACCION",
        "requiere_permiso": true,
        "query": "texto de búsqueda"
    }
}

IMPORTANTE:

Para acciones que NO necesitan texto de búsqueda,
NO incluyas query.

Por ejemplo:

{
    "respuesta": "Voy a abrir YouTube.",
    "emocion": "neutral",
    "accion": {
        "id": "open_youtube",
        "requiere_permiso": true
    }
}

Para una búsqueda:

{
    "respuesta": "Voy a buscar gatos en YouTube.",
    "emocion": "neutral",
    "accion": {
        "id": "search_youtube",
        "requiere_permiso": true,
        "query": "gatos"
    }
}

Si el usuario dice:

"Busca música relajante en YouTube"

debes utilizar:

"search_youtube"

con:

"query": "música relajante"

Si dice:

"Busca gatos en Google"

utiliza:

"search_google"

con:

"query": "gatos"

Si dice:

"Busca Star Wars en TikTok"

utiliza:

"search_tiktok"

con:

"query": "Star Wars"

Si dice:

"Busca Star Wars en Wikipedia"

utiliza:

"search_wikipedia_web"

con:

"query": "Star Wars"

Si dice simplemente:

"Abre Google"

utiliza:

"open_google"

Si dice:

"Abre Wikipedia"

utiliza:

"open_wikipedia"

Si dice:

"Abre YouTube"

utiliza:

"open_youtube"

ACCIONES DISPONIBLES:

1. open_youtube
Abre YouTube.

2. search_youtube
Busca algo específico en YouTube.

3. open_google
Abre Google.

4. search_google
Realiza una búsqueda específica en Google.

5. open_wikipedia
Abre Wikipedia.

6. search_wikipedia_web
Realiza una búsqueda específica en Wikipedia.

7. search_tiktok
Realiza una búsqueda específica en TikTok.

7. open_whatsapp
Abre WhatsApp.

8. open_telegram
Abre Telegram.

9. open_instagram
Abre Instagram.

10. open_tiktok
Abre TikTok.

NO ejecutes ninguna acción.

Nunca abras sitios web directamente.

EMOCIONES PERMITIDAS:
neutral
happy
surprised
thinking
angry
sad

RESPONDE SIEMPRE EN JSON VÁLIDO.
NO utilices Markdown alrededor del JSON.
"""


# ============================================================
# DETECCIÓN DIRECTA DE ACCIONES WEB
# ============================================================
# Esta sección evita depender exclusivamente de que el modelo
# devuelva correctamente el JSON de acción. Si el usuario da una
# orden web clara, el servidor construye la acción de forma directa.
# BUSCAR AQUÍ para ampliar o cambiar órdenes reconocidas.

# ============================================================
# DETECCIÓN DIRECTA DE ACCIONES WEB Y APPS
# ============================================================

def detect_direct_web_action(message):

    text = re.sub(r"\s+", " ", (message or "").strip())
    lower = text.lower()

    # -------------------------
    # ABRIR SITIOS Y APPS
    # -------------------------
    if re.search(r"\b(?:abre|abrir|abreme|ábreme|ve a|ir a|entra a)\b.*\byoutube\b", lower):
        return {
            "id": "open_youtube",
            "name": AVAILABLE_ACTIONS["open_youtube"]["name"],
            "description": AVAILABLE_ACTIONS["open_youtube"]["description"],
            "requires_permission": True,
        }

    if re.search(r"\b(?:abre|abrir|abreme|ábreme|ve a|ir a|entra a)\b.*\bgoogle\b", lower):
        return {
            "id": "open_google",
            "name": AVAILABLE_ACTIONS["open_google"]["name"],
            "description": AVAILABLE_ACTIONS["open_google"]["description"],
            "requires_permission": True,
        }

    if re.search(r"\b(?:abre|abrir|abreme|ábreme|ve a|ir a|entra a)\b.*\bwikipedia\b", lower):
        return {
            "id": "open_wikipedia",
            "name": AVAILABLE_ACTIONS["open_wikipedia"]["name"],
            "description": AVAILABLE_ACTIONS["open_wikipedia"]["description"],
            "requires_permission": True,
        }

    if re.search(r"\b(?:abre|abrir|abreme|ábreme)\b.*\bwhatsapp\b", lower):
        return {
            "id": "open_whatsapp",
            "name": AVAILABLE_ACTIONS["open_whatsapp"]["name"],
            "description": AVAILABLE_ACTIONS["open_whatsapp"]["description"],
            "requires_permission": True,
        }

    if re.search(r"\b(?:abre|abrir|abreme|ábreme|ve a|ir a|entra a)\b.*\btelegram\b", lower):
        return {
            "id": "open_telegram",
            "name": AVAILABLE_ACTIONS["open_telegram"]["name"],
            "description": AVAILABLE_ACTIONS["open_telegram"]["description"],
            "requires_permission": True,
        }

    if re.search(r"\b(?:abre|abrir|abreme|ábreme|ve a|ir a|entra a)\b.*\binstagram\b", lower):
        return {
            "id": "open_instagram",
            "name": AVAILABLE_ACTIONS["open_instagram"]["name"],
            "description": AVAILABLE_ACTIONS["open_instagram"]["description"],
            "requires_permission": True,
        }

    if re.search(r"\b(?:abre|abrir|abreme|ábreme|ve a|ir a|entra a)\b.*\btiktok\b", lower):
        return {
            "id": "open_tiktok",
            "name": AVAILABLE_ACTIONS["open_tiktok"]["name"],
            "description": AVAILABLE_ACTIONS["open_tiktok"]["description"],
            "requires_permission": True,
        }

    if re.search(r"\b(?:abre|abrir|abreme|ábreme|pon|poner)\b.*\b(?:spotify|musica|música)\b", lower):
        return {
            "id": "open_spotify",
            "name": AVAILABLE_ACTIONS["open_spotify"]["name"],
            "description": AVAILABLE_ACTIONS["open_spotify"]["description"],
            "requires_permission": True,
        }

    if re.search(r"\b(?:abre|abrir|abreme|ábreme)\b.*\b(?:maps|google maps|mapa|mapas)\b", lower):
        return {
            "id": "open_maps",
            "name": AVAILABLE_ACTIONS["open_maps"]["name"],
            "description": AVAILABLE_ACTIONS["open_maps"]["description"],
            "requires_permission": True,
        }

    if re.search(r"\b(?:abre|abrir|abreme|ábreme)\b.*\b(?:correo|email|gmail)\b", lower):
        return {
            "id": "open_email",
            "name": AVAILABLE_ACTIONS["open_email"]["name"],
            "description": AVAILABLE_ACTIONS["open_email"]["description"],
            "requires_permission": True,
        }

    # -------------------------
    # BÚSQUEDAS Y ACCIONES CON QUERY
    # -------------------------
    match_wa = re.search(r"(?:envia|enviar|manda|mandar)\s+(?:un\s+)?mensaje\s+(?:por|a)\s+whatsapp\s+que\s+diga\s+(.+)", lower)
    if match_wa:
        return {
            "id": "send_whatsapp",
            "name": AVAILABLE_ACTIONS["send_whatsapp"]["name"],
            "description": AVAILABLE_ACTIONS["send_whatsapp"]["description"],
            "requires_permission": True,
            "query": match_wa.group(1).strip()
        }

    match_call = re.search(r"(?:llama|llamar|marcar)\s+a\s+(.+)", lower)
    if match_call:
        return {
            "id": "make_call",
            "name": AVAILABLE_ACTIONS["make_call"]["name"],
            "description": AVAILABLE_ACTIONS["make_call"]["description"],
            "requires_permission": True,
            "query": match_call.group(1).strip()
        }

    patterns = [
        ("search_youtube", r"(?:busca|buscar|búscame|buscarme)\s+(.+?)\s+(?:en|por)\s+youtube\b"),
        ("search_tiktok", r"(?:busca|buscar|búscame|buscarme)\s+(.+?)\s+(?:en|por)\s+tiktok\b"),
        ("search_google", r"(?:busca|buscar|búscame|buscarme)\s+(.+?)\s+(?:en|por)\s+google\b"),
        ("search_wikipedia_web", r"(?:busca|buscar|búscame|buscarme)\s+(.+?)\s+(?:en|por)\s+wikipedia\b"),
    ]

    for action_id, pattern in patterns:
        match = re.search(pattern, lower)
        if match:
            query = match.group(1).strip(" .,!?:;\"")
            if query:
                return {
                    "id": action_id,
                    "name": AVAILABLE_ACTIONS[action_id]["name"],
                    "description": AVAILABLE_ACTIONS[action_id]["description"],
                    "requires_permission": True,
                    "query": query,
                }

    return None

# ============================================================
# LIMPIAR JSON
# ============================================================

def clean_json_text(text):

    if not text:
        return ""

    text = text.strip()

    if text.startswith("```"):

        text = re.sub(
            r"^```(?:json)?",
            "",
            text,
            flags=re.IGNORECASE
        )

        text = re.sub(
            r"```$",
            "",
            text
        )

        text = text.strip()

    return text


# ============================================================
# PARSEAR RESPUESTA
# ============================================================

def parse_model_response(text):

    text = clean_json_text(text)

    try:

        return json.loads(text)

    except json.JSONDecodeError:

        match = re.search(
            r"\{.*\}",
            text,
            re.DOTALL
        )

        if match:

            try:
                return json.loads(match.group(0))

            except json.JSONDecodeError:
                pass

        raise ValueError(
            "El modelo no devolvió JSON válido.\n"
            f"Respuesta recibida:\n{text}"
        )


# ============================================================
# EMOCIÓN
# ============================================================

def normalize_emotion(emotion):

    allowed = {
        "neutral",
        "happy",
        "surprised",
        "thinking",
        "angry",
        "sad"
    }

    if emotion in allowed:
        return emotion

    return "neutral"


# ============================================================
# LLAMAR A GROQ
# ============================================================

def ask_groq(messages):

    if not GROQ_API_KEY:

        raise RuntimeError(
            "No se encontró GROQ_API_KEY en el archivo .env"
        )

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": MODEL,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 700
    }

    response = requests.post(
        GROQ_URL,
        headers=headers,
        json=payload,
        timeout=60
    )

    print()
    print("GROQ HTTP STATUS:", response.status_code)

    if response.status_code != 200:

        print("RESPUESTA DE ERROR DE GROQ:")
        print(response.text)

        raise RuntimeError(
            f"Groq respondió HTTP {response.status_code}"
        )

    try:

        result = response.json()

    except Exception:

        print("GROQ DEVOLVIÓ ALGO QUE NO ES JSON:")
        print(response.text)

        raise RuntimeError(
            "La respuesta de Groq no era JSON válido."
        )

    print()
    print("RESPUESTA COMPLETA DE GROQ:")
    print(result)

    choices = result.get("choices")

    if not choices:

        raise RuntimeError(
            "Groq no devolvió choices."
        )

    message = choices[0].get("message", {})

    content = message.get("content")

    if not content:

        raise RuntimeError(
            "Groq devolvió una respuesta vacía."
        )

    return content


# ============================================================
# PÁGINA PRINCIPAL
# ============================================================

@app.route("/")
def index():

    return render_template("index.html")


# ============================================================
# CHAT
# ============================================================

@app.route("/chat", methods=["POST"])
def chat():

    try:

        data = request.get_json(silent=True) or {}

        user_message = str(
            data.get("message", "")
        ).strip()

        client_time = data.get("client_time")

        timezone = data.get("timezone")
        client_settings = data.get("settings") or {}
        memory_enabled = client_settings.get("memory", True) is not False


        if not user_message:

            return jsonify({
                "respuesta": "No recibí ningún mensaje.",
                "emocion": "neutral",
                "accion": None
            })


        print()
        print("=" * 60)
        print("MENSAJE DEL USUARIO:")
        print(user_message)
        print("=" * 60)


        # ====================================================
        # ACCIONES WEB DIRECTAS
        # ====================================================
        # Las órdenes web claras se detectan aquí para que no dependan
        # de una decisión probabilística del modelo.

        direct_action = detect_direct_web_action(user_message)

        if direct_action:

            if "query" in direct_action:
                respuesta_directa = (
                    f'Voy a buscar "{direct_action["query"]}" en '
                    f'{direct_action["name"].replace("Buscar en ", "")}. '
                    'Necesito tu permiso para hacerlo.'
                )
            else:
                respuesta_directa = (
                    f'Voy a abrir {direct_action["name"]}. '
                    'Necesito tu permiso para hacerlo.'
                )

            print("ACCIÓN WEB DIRECTA DETECTADA:", direct_action)

            return jsonify({
                "respuesta": respuesta_directa,
                "emocion": "thinking",
                "accion": direct_action
            })


        # ====================================================
        # MEMORIA
        # ====================================================

        memory_patterns = [

            r"me llamo (.+)",

            r"mi nombre es (.+)",

            r"tengo (\d+) años",

            r"mi edad es (\d+)",

            r"me gusta (.+)",

            r"recuerda que (.+)",

            r"recuerda esto:\s*(.+)",

            r"memoriza que (.+)"

        ]


        lower_message = user_message.lower()


        for pattern in memory_patterns:

            if not memory_enabled:
                break

            match = re.search(
                pattern,
                lower_message
            )

            if match:

                value = match.group(1).strip()


                if "me llamo" in pattern:
                    key = "nombre"

                elif "mi nombre es" in pattern:
                    key = "nombre"

                elif (
                    "tengo" in pattern
                    and "años" in pattern
                ):
                    key = "edad"

                elif "mi edad" in pattern:
                    key = "edad"

                elif "me gusta" in pattern:
                    key = "preferencia"

                else:
                    key = "memoria"


                category = "identity" if key in {"nombre", "edad"} else ("preference" if key == "preferencia" else "important")
                important = key in {"nombre", "preferencia"}

                save_memory(
                    key,
                    value,
                    category=category,
                    important=important
                )


                print(
                    "MEMORIA GUARDADA:",
                    key,
                    "=",
                    value
                )


                return jsonify({

                    "respuesta":
                        f"Lo recordaré: {value}",

                    "emocion":
                        "happy",

                    "accion":
                        None
                })


        # ====================================================
        # MEMORIAS RELACIONADAS
        # ====================================================

        related = search_memories(user_message) if memory_enabled else []

        related_lines = []


        for memory in related:

            if isinstance(memory, dict):

                key = memory.get(
                    "key",
                    ""
                )

                value = memory.get(
                    "value",
                    ""
                )

                related_lines.append(
                    f"- {key}: {value}"
                )

            else:

                related_lines.append(
                    f"- {memory}"
                )


        related_context = "\n".join(
            related_lines
        )


        if not related_context:

            related_context = (
                "No hay recuerdos relevantes."
            )


        # ====================================================
        # WIKIPEDIA COMO FUENTE INFORMATIVA
        # ====================================================

        wikipedia_context = ""


        wiki_triggers = [

            "qué es",
            "que es",
            "quién es",
            "quien es",
            "háblame de",
            "hablame de",
            "información sobre",
            "informacion sobre"

        ]


        if any(
            trigger in lower_message
            for trigger in wiki_triggers
        ):

            try:

                wiki_result = wikipedia_search(
                    user_message
                )

                if wiki_result:

                    wikipedia_context = (
                        "\nINFORMACIÓN DE WIKIPEDIA:\n"
                        + str(wiki_result)
                    )

            except Exception as error:

                print(
                    "ERROR WIKIPEDIA:",
                    error
                )


        # ====================================================
        # NOTICIAS
        # ====================================================

        news_context = ""


        news_triggers = [

            "noticias",
            "noticia",
            "últimas noticias",
            "ultimas noticias",
            "qué pasó hoy",
            "que paso hoy"

        ]


        if any(
            trigger in lower_message
            for trigger in news_triggers
        ):

            try:

                news_result = news_search(
                    user_message
                )

                if news_result:

                    news_context = (
                        "\nNOTICIAS:\n"
                        + str(news_result)
                    )

            except Exception as error:

                print(
                    "ERROR NOTICIAS:",
                    error
                )


        # ====================================================
        # HORA
        # ====================================================

        time_context = ""


        if client_time:

            time_context += (
                f"\nHora del dispositivo: "
                f"{client_time}"
            )


        if timezone:

            time_context += (
                f"\nZona horaria: "
                f"{timezone}"
            )


        # ====================================================
        # MENSAJE PARA GROQ
        # ====================================================

        user_prompt = f"""

MENSAJE DEL USUARIO:
{user_message}

MEMORIA RELEVANTE:
{related_context}

{wikipedia_context}

{news_context}

{time_context}

Analiza el mensaje y responde siguiendo
estrictamente las reglas del sistema.

REGLAS DE ACCIONES:

- Si el usuario quiere abrir YouTube:
  utiliza open_youtube.

- Si quiere buscar algo en YouTube:
  utiliza search_youtube y extrae únicamente
  el texto que quiere buscar en "query".

- Si quiere abrir Google:
  utiliza open_google.

- Si quiere buscar algo en Google:
  utiliza search_google y extrae únicamente
  el texto de búsqueda en "query".

- Si quiere abrir Wikipedia:
  utiliza open_wikipedia.

- Si quiere buscar algo en TikTok:
  utiliza search_tiktok y extrae únicamente
  el texto de búsqueda en "query".

- Si quiere buscar algo en Wikipedia:
  utiliza search_wikipedia_web y coloca
  el texto buscado en "query".

- Todas las acciones requieren permiso.
- Nunca ejecutes una acción.
- Responde únicamente con JSON válido.
"""


        messages = [

            {
                "role": "system",
                "content": SYSTEM_PROMPT
            },

            {
                "role": "user",
                "content": user_prompt
            }

        ]


        print(
            "ENVIANDO MENSAJE A GROQ..."
        )


        # ====================================================
        # GROQ
        # ====================================================

        raw_response = ask_groq(
            messages
        )


        print()
        print(
            "RESPUESTA BRUTA DEL MODELO:"
        )

        print(raw_response)


        # ====================================================
        # JSON
        # ====================================================

        parsed = parse_model_response(
            raw_response
        )


        print()
        print(
            "JSON INTERPRETADO:"
        )

        print(parsed)


        # ====================================================
        # RESPUESTA
        # ====================================================

        respuesta = parsed.get(
            "respuesta",
            "No tengo una respuesta para eso."
        )


        emocion = normalize_emotion(
            parsed.get(
                "emocion",
                "neutral"
            )
        )


        # ====================================================
        # ACCIÓN
        # ====================================================

        validated_action = None

        action_data = parsed.get(
            "accion"
        )


        if isinstance(
            action_data,
            dict
        ):

            action_id = action_data.get(
                "id"
            )

            requires_permission = action_data.get(
                "requiere_permiso",
                False
            )

            query = action_data.get(
                "query"
            )


            if (
                action_id in AVAILABLE_ACTIONS
                and requires_permission is True
            ):

                action_info = AVAILABLE_ACTIONS[
                    action_id
                ]


                validated_action = {

                    "id":
                        action_id,

                    "name":
                        action_info["name"],

                    "description":
                        action_info["description"],

                    "requires_permission":
                        True
                }


                                # ==========================================
                # QUERY DE BÚSQUEDA Y MENSAJES
                # ==========================================

                if action_id in {
                    "search_youtube",
                    "search_tiktok",
                    "search_google",
                    "search_wikipedia_web",
                    "send_whatsapp",
                    "make_call",
                    "open_maps"
                }:

                    if (
                        isinstance(query, str)
                        and query.strip()
                    ):

                        validated_action[
                            "query"
                        ] = query.strip()

      
        # DIAGNÓSTICO
        # ====================================================

        print()
        print(
            "RESPUESTA ERLY:"
        )

        print(respuesta)


        print()
        print(
            "EMOCIÓN:"
        )

        print(emocion)


        print()
        print(
            "ACCIÓN:"
        )

        print(validated_action)


        print()
        print("=" * 60)


        # ====================================================
      
        # RESPUESTA AL NAVEGADOR
        # ====================================================

        return jsonify({

            "respuesta":
                respuesta,

            "emocion":
                emocion,

            "accion":
                validated_action

        })


    except Exception as error:

        print()
        print("=" * 60)

        print(
            "ERROR EN /chat"
        )

        print("=" * 60)

        print(
            type(error).__name__
        )

        print(
            str(error)
        )

        print()

        print(
            "TRACEBACK COMPLETO:"
        )

        traceback.print_exc()

        print("=" * 60)


        return jsonify({

            "respuesta":
                "No pude comunicarme correctamente "
                "con mi servidor.",

            "emocion":
                "sad",

            "accion":
                None

        }), 200


# ============================================================
# INICIO
# ============================================================

if __name__ == "__main__":

    print()
    print("=" * 50)

    print(
        "       CHATBOTERLY 1.2.4"
    )

    print("=" * 50)

    print(
        "Servidor iniciando..."
    )

    print()

    if GROQ_API_KEY:

        print(
            "API de Groq: configurada"
        )

    else:

        print(
            "API de Groq: NO CONFIGURADA"
        )


    print()

    print(
        "Modelo:",
        MODEL
    )

    print(
        "Método: requests → Groq API"
    )

    print()

    print("=" * 50)


    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )