// ============================================================
// CHATBOTERLY 1.2.5
// Sistema de chat + voz + permisos + manos flotantes
// ============================================================

console.log("ChatbotErly 1.3.2 - chat.js cargando...");


// ============================================================
// BUSCAR ELEMENTOS
// ============================================================

const messageInput =
    document.getElementById("messageInput") ||
    document.getElementById("userInput") ||
    document.getElementById("message");

const sendButton =
    document.getElementById("sendButton") ||
    document.getElementById("sendBtn") ||
    document.getElementById("send");

const voiceButton =
    document.getElementById("voiceButton") ||
    document.getElementById("voiceBtn") ||
    document.getElementById("voice");

const chatMessages =
    document.getElementById("chatMessages") ||
    document.getElementById("messages") ||
    document.getElementById("chat");

const chatMessagesPanel = document.getElementById("chatMessagesPanel");
const chatToggleButton = document.getElementById("chatToggleBtn");
const clearChatButton = document.getElementById("clearChatBtn");

let erlyTypingToken = 0;

function setChatVisible(visible) {
    if (!chatMessagesPanel || !chatToggleButton) return;
    chatMessagesPanel.classList.toggle("hidden", !visible);
    chatToggleButton.setAttribute("aria-expanded", String(visible));
    chatToggleButton.textContent = visible ? "💬 OCULTAR CHAT" : "💬 CHAT";
}

if (chatToggleButton) {
    chatToggleButton.addEventListener("click", () => {
        const visible = chatMessagesPanel?.classList.contains("hidden") ?? true;
        setChatVisible(visible);
    });
}

if (clearChatButton && chatMessages) {
    clearChatButton.addEventListener("click", () => {
        chatMessages.innerHTML = "";
    });
}


// ============================================================
// DIAGNÓSTICO
// ============================================================

console.log("Input:", messageInput);
console.log("Botón enviar:", sendButton);
console.log("Botón voz:", voiceButton);
console.log("Área de chat:", chatMessages);


// ============================================================
// SISTEMA DE MANOS
// ============================================================

function setErlyHands(pose) {

    if (window.ErlySettings && !window.ErlySettings.get().gestures) return;

    if (!window.ErlyHands) {
        return;
    }

    console.log("Manos de Erly:", pose);

    // Algunos gestos funcionan mejor con una sola mano.
    if (pose === "wave") {
        window.ErlyHands.left("wave");
        window.ErlyHands.right("neutral");
        return;
    }

    if (pose === "thinking") {
        window.ErlyHands.left("thinking");
        window.ErlyHands.right("neutral");
        return;
    }

    if (pose === "point") {
        window.ErlyHands.left("neutral");
        window.ErlyHands.right("point");
        return;
    }

    if (pose === "thumbup") {
        window.ErlyHands.left("neutral");
        window.ErlyHands.right("thumbup");
        return;
    }

    if (typeof window.ErlyHands.setPose === "function") {
        window.ErlyHands.setPose(pose);
    }

}

function chooseInputHandPose(text) {
    const content = String(text || "").toLowerCase();

    if (/\b(hola|buenas|hey|saludos|holi|hello)\b/.test(content)) {
        return "wave";
    }

    if (/\b(gracias|perfecto|genial|excelente|ok|okay)\b/.test(content)) {
        return "thumbup";
    }

    return "thinking";
}


// ============================================================
// DETERMINAR GESTO SEGÚN LA RESPUESTA
// ============================================================

function chooseHandPose(text, emotion) {

    const content =
        String(text || "").toLowerCase();

    const currentEmotion =
        String(emotion || "neutral").toLowerCase();


    // --------------------------------------------------------
    // EMOCIONES DIRECTAS
    // --------------------------------------------------------

    if (
        currentEmotion === "happy"
    ) {

        return "happy";

    }


    if (
        currentEmotion === "surprised"
    ) {

        return "surprised";

    }


    if (
        currentEmotion === "thinking"
    ) {

        return "thinking";

    }


    // --------------------------------------------------------
    // SALUDOS
    // --------------------------------------------------------

    if (
        /\b(hola|buenas|hey|saludos|bienvenido|bienvenida)\b/
            .test(content)
    ) {

        return "wave";

    }


    // --------------------------------------------------------
    // SORPRESA
    // --------------------------------------------------------

    if (
        /\b(vaya|wow|guau|increíble|increible|sorpresa|sorprendente)\b/
            .test(content)
    ) {

        return "surprised";

    }


    // --------------------------------------------------------
    // PENSAMIENTO / ANÁLISIS
    // --------------------------------------------------------

    if (
        /\b(pensando|déjame pensar|dejame pensar|analizar|analizando|considerar|considerando|creo que|supongo que)\b/
            .test(content)
    ) {

        return "thinking";

    }


    // --------------------------------------------------------
    // SEÑALAR / EXPLICAR
    // --------------------------------------------------------

    if (
        /\b(mira|observa|aquí|aqui|esto|esa|ese|fíjate|fijate|nota que|como puedes ver)\b/
            .test(content)
    ) {

        return "point";

    }


    // --------------------------------------------------------
    // FELICIDAD / ENTUSIASMO
    // --------------------------------------------------------

    if (
        /\b(genial|excelente|perfecto|fantástico|fantastico|me alegra|qué bien|que bien|jajaja)\b/
            .test(content)
    ) {

        return "happy";

    }

    if (
        /\b(aprobado|de acuerdo|correcto|sí|si|claro)\b/
            .test(content)
    ) {

        return "thumbup";

    }


    // --------------------------------------------------------
    // POR DEFECTO
    // --------------------------------------------------------

    return "talking";

}


// ============================================================
// AGREGAR MENSAJE
// ============================================================

function addMessage(text, sender = "erly", progressive = false) {

    if (!chatMessages) {
        console.error("No se encontró el área de mensajes.");
        return;
    }

    const message = document.createElement("div");
    message.className = `message ${sender}`;
    chatMessages.appendChild(message);

    const value = String(text ?? "");

    if (sender !== "erly" || !progressive) {
        message.textContent = value;
    } else {
        message.classList.add("typing");
        const token = ++erlyTypingToken;
        let index = 0;
        const step = () => {
            if (token !== erlyTypingToken) return;
            message.textContent = value.slice(0, index);
            chatMessages.scrollTop = chatMessages.scrollHeight;
            if (index < value.length) {
                index += 1;
                const delay = value[index - 1] === " " ? 12 : 18;
                window.setTimeout(step, delay);
            } else {
                message.classList.remove("typing");
            }
        };
        step();
    }

    chatMessages.scrollTop = chatMessages.scrollHeight;
}



// ============================================================
// ANDROID / BACKEND BRIDGE
// ============================================================
function getErlyBackendUrl() {
    try {
        if (window.ErlyAndroid && typeof window.ErlyAndroid.getBackendUrl === "function") {
            const value = String(window.ErlyAndroid.getBackendUrl() || "").trim();
            if (value) return value.replace(/\/$/, "");
        }
    } catch (e) { console.warn("AndroidBridge backend URL no disponible:", e); }

    try {
        const saved = String(localStorage.getItem("erlyBackendUrl") || "").trim();
        if (saved) return saved.replace(/\/$/, "");
    } catch (_) {}

    return "";
}

function getErlyChatEndpoint() {
    const base = getErlyBackendUrl();
    return base ? base + "/chat" : "/chat";
}

// ============================================================
// ENVIAR MENSAJE
// ============================================================

async function sendMessage() {

    if (!messageInput) {

        console.error(
            "No se encontró el campo de texto."
        );

        return;
    }


    const message =
        messageInput.value.trim();


    if (!message) {

        return;

    }


    console.log(
        "Enviando mensaje:",
        message
    );


    // --------------------------------------------------------
    // GESTO INICIAL SEGÚN LO QUE ESCRIBIÓ EL USUARIO
    // --------------------------------------------------------

    setErlyHands(
        chooseInputHandPose(message)
    );


    // --------------------------------------------------------
    // MOSTRAR MENSAJE DEL USUARIO
    // --------------------------------------------------------

    addMessage(
        message,
        "user"
    );


    // --------------------------------------------------------
    // LIMPIAR CAMPO
    // --------------------------------------------------------

    messageInput.value = "";


    // --------------------------------------------------------
    // ESTADO PENSANDO
    // --------------------------------------------------------

    if (
        typeof setStatus === "function"
    ) {

        setStatus(
            "Pensando...",
            "thinking"
        );

    }


    try {

        const clientTime =
            new Date().toISOString();


        const timezone =
            Intl.DateTimeFormat()
                .resolvedOptions()
                .timeZone;


        console.log(
            "Enviando petición a:",
            getErlyChatEndpoint()
        );


        const response =
            await fetch(
                getErlyChatEndpoint(),
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body: JSON.stringify({

                        message:
                            message,

                        client_time:
                            clientTime,

                        timezone:
                            timezone,

                        settings:
                            window.ErlySettings
                                ? window.ErlySettings.get()
                                : {}

                    })

                }
            );


        console.log(
            "Respuesta HTTP:",
            response.status
        );


        if (!response.ok) {

            throw new Error(
                "HTTP " +
                response.status
            );

        }


        const data =
            await response.json();


        console.log(
            "Respuesta de Erly:",
            data
        );


        // ====================================================
        // RESPUESTA
        // ====================================================

        if (data.respuesta) {

            addMessage(
                data.respuesta,
                "erly",
                true
            );

        }


        // ====================================================
        // EMOCIÓN
        // ====================================================

        const emotion =
            data.emocion ||
            "neutral";


        if (
            typeof setEmotion === "function"
        ) {

            setEmotion(
                emotion
            );

        }


        // ====================================================
        // GESTO DE LAS MANOS
        // ====================================================

        const handPose =
            chooseHandPose(
                data.respuesta || "",
                emotion
            );


        setErlyHands(
            handPose
        );


        // ====================================================
        // VOZ
        // ====================================================

        if (
            typeof speak === "function"
        ) {

            speak(
                data.respuesta || "",
                emotion
            );

        }


        // ====================================================
        // PERMISO
        // ====================================================

        if (
            data.accion &&
            typeof requestPermission === "function"
        ) {

            console.log(
                "Solicitud de permiso:",
                data.accion
            );

            console.log(
                "Abriendo panel de permiso..."
            );


            requestPermission(
                data.accion
            );

        }


    }
    catch (error) {

        console.error(
            "ERROR EN CHAT:",
            error
        );


        addMessage(
            "No pude comunicarme con mi servidor.",
            "erly"
        );


        if (
            typeof setEmotion === "function"
        ) {

            setEmotion(
                "sad"
            );

        }


        setErlyHands(
            "neutral"
        );

    }


    // ========================================================
    // ESTADO NORMAL
    // ========================================================

    if (
        typeof setStatus === "function"
    ) {

        setStatus(
            "En línea",
            "neutral"
        );

    }

}


// ============================================================
// BOTÓN ENVIAR
// ============================================================

if (sendButton) {

    sendButton.addEventListener(
        "click",
        function(event) {

            event.preventDefault();

            sendMessage();

        }
    );

}
else {

    console.error(
        "NO SE ENCONTRÓ EL BOTÓN DE ENVIAR."
    );

}


// ============================================================
// ENTER
// ============================================================

if (messageInput) {

    messageInput.addEventListener(
        "keydown",
        function(event) {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                sendMessage();

            }

        }
    );

}
else {

    console.error(
        "NO SE ENCONTRÓ EL CAMPO DE TEXTO."
    );

}


// ============================================================
// RECONOCIMIENTO DE VOZ
// ============================================================

let recognition = null;

let listening = false;


if (
    "SpeechRecognition" in window ||
    "webkitSpeechRecognition" in window
) {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;


    recognition =
        new SpeechRecognition();


    recognition.lang =
        "es-ES";


    recognition.continuous =
        false;


    recognition.interimResults =
        false;


    recognition.onstart =
        function() {

            listening = true;


            if (voiceButton) {

                voiceButton.classList.add(
                    "listening"
                );

            }


            if (
                typeof setStatus === "function"
            ) {

                setStatus(
                    "Escuchando...",
                    "listening"
                );

            }

        };


    recognition.onresult =
        function(event) {

            const transcript =
                event.results[0][0]
                    .transcript;


            if (messageInput) {

                messageInput.value =
                    transcript;

            }


            sendMessage();

        };


    recognition.onerror =
        function(event) {

            console.error(
                "Error de reconocimiento:",
                event.error
            );

        };


    recognition.onend =
        function() {

            listening = false;


            if (voiceButton) {

                voiceButton.classList.remove(
                    "listening"
                );

            }

        };

}
else {

    console.log(
        "Reconocimiento de voz no disponible."
    );

}


// ============================================================
// BOTÓN DE VOZ
// ============================================================

if (voiceButton) {

    voiceButton.addEventListener(
        "click",
        function(event) {

            event.preventDefault();


            if (!recognition) {

                alert(
                    "El reconocimiento de voz no está disponible en este navegador."
                );

                return;

            }


            if (listening) {

                recognition.stop();

            }
            else {

                recognition.start();

            }

        }
    );

}


// ============================================================
// LISTO
// ============================================================

console.log(
    "ChatbotErly 1.2.5 - chat.js cargado correctamente."
);