// ============================================================
// CHATBOTERLY 1.2.5 — PERMISSIONS / DEVICE ACTIONS
//
// SEARCH HERE TO MODIFY ACTION EXECUTION:
// 1) requestPermission()  -> shows confirmation panel
// 2) executeAction()      -> builds destination URL
// 3) allowPermission      -> opens destination after user approval
// ============================================================

const permissionPanel =
    document.getElementById("permissionPanel");

const permissionText =
    document.getElementById("permissionText");

const allowPermission =
    document.getElementById("allowPermission");

const denyPermission =
    document.getElementById("denyPermission");


let pendingAction = null;
/* =========================
   ANDROID BRIDGE — APERTURA SEGURA
========================= */
function openExternalUrl(url) {
    const bridge = (typeof window !== "undefined") ? window.ErlyAndroid : null;
    if (bridge && typeof bridge.openUrl === "function" && /^https?:\/\//i.test(String(url || ""))) {
        try { bridge.openUrl(String(url)); return true; } catch (e) { console.warn("AndroidBridge openUrl falló:", e); }
    }
    return false;
}




/* =========================
   TIKTOK NATIVO — ANDROID
   Intenta entregar el enlace al paquete de TikTok.
   Si Android/TikTok no acepta la ruta de búsqueda,
   se usa la versión web como respaldo.
========================= */
function openTikTokSearchNative(query, fallbackUrl) {
    const encoded = encodeURIComponent(query || "");
    const fallback = fallbackUrl || ("https://www.tiktok.com/search?q=" + encoded);

    /*
       PRUEBA B — TIKTOK SEARCH NATIVO

       TikTok documenta snssdk1233/snssdk1180 como esquemas asociados
       a la aplicación, pero no documenta públicamente una ruta oficial
       de búsqueda. Por eso probamos primero el esquema nativo y dejamos
       el App Link HTTPS como respaldo.
    */
    const nativeUrls = [
        // Variante usada por enlaces/deep-links de TikTok.
        "snssdk1233://search?keyword=" + encoded,
        // Variante alternativa para versiones que esperan query.
        "snssdk1233://search?q=" + encoded
    ];

    let launched = false;
    let index = 0;

    const tryNextNative = () => {
        if (index >= nativeUrls.length) {
            return false;
        }

        const target = nativeUrls[index++];

        try {
            console.log("TIKTOK SEARCH NATIVO:", target);
            window.location.href = target;
            launched = true;
            return true;
        } catch (error) {
            console.warn("No se pudo abrir TikTok mediante esquema nativo:", error);
            return tryNextNative();
        }
    };

    tryNextNative();

    /*
       Si el esquema no es reconocido, probamos el App Link HTTPS dirigido
       al paquete de TikTok. Si la aplicación sí se abrió, document.hidden
       normalmente pasa a true y no ejecutamos el respaldo.
    */
    window.setTimeout(() => {
        if (document.hidden) {
            return;
        }

        try {
            const intentUrl =
                "intent://www.tiktok.com/search?q=" + encoded +
                "#Intent;scheme=https;package=com.zhiliaoapp.musically;" +
                "S.browser_fallback_url=" + encodeURIComponent(fallback) +
                ";end";

            console.log("TIKTOK SEARCH — APP LINK:", intentUrl);
            window.location.href = intentUrl;
        } catch (error) {
            console.warn("No se pudo intentar App Link de TikTok:", error);
        }
    }, 1200);

    /*
       Último respaldo: búsqueda web. Se retrasa para no interrumpir
       una apertura nativa que todavía esté procesándose.
    */
    window.setTimeout(() => {
        if (!document.hidden) {
            window.location.href = fallback;
        }
    }, 3000);

    return launched;
}


/* =========================
   MOSTRAR PERMISO
========================= */

function requestPermission(action) {

    if (!action)
        return;


    pendingAction = action;


    /*
        Si es una búsqueda o envío, mostramos
        exactamente qué quiere procesar Erly.
    */

    if (action.query) {

        permissionText.textContent =
            `${action.description} Detalle: "${action.query}"`;

    } else {

        permissionText.textContent =
            action.description ||
            "Erly solicita permiso para realizar una acción.";

    }


    permissionPanel.classList.remove(
        "hidden"
    );


    setEmotion("thinking");

    setState(
        "Esperando autorización..."
    );

    setStatus(
        "ESPERANDO PERMISO"
    );

}


/* =========================
   EJECUTAR ACCIONES
========================= */

function executeAction(action, approvedWindow = null) {

    if (!action)
        return;


    console.log(
        "ERLY EJECUTANDO ACCIÓN:",
        action
    );


    let url = null;
    let statusText = "";
    let stateTextValue = "";


    /* =========================
       YOUTUBE
    ========================= */

    if (action.id === "open_youtube") {

        url = "https://www.youtube.com/";
        stateTextValue = "Abriendo YouTube...";
        statusText = "ABRIENDO YOUTUBE";

    }


    else if (action.id === "search_tiktok") {

        if (!action.query) {
            console.warn("No existe una búsqueda para TikTok.");
            return;
        }

        url =
            "https://www.tiktok.com/search?q=" +
            encodeURIComponent(action.query);

        stateTextValue =
            `Buscando "${action.query}" en TikTok...`;
        statusText = "BUSCANDO EN TIKTOK";

    }


    /* =========================
       BUSCAR EN YOUTUBE
    ========================= */

    else if (action.id === "search_youtube") {

        if (!action.query) {
            console.warn("No existe una búsqueda para YouTube.");
            return;
        }

        url =
            "https://www.youtube.com/results?search_query=" +
            encodeURIComponent(action.query);

        stateTextValue =
            `Buscando "${action.query}" en YouTube...`;
        statusText = "BUSCANDO EN YOUTUBE";

    }


    /* =========================
       GOOGLE
    ========================= */

    else if (action.id === "open_google") {

        url = "https://www.google.com/";
        stateTextValue = "Abriendo Google...";
        statusText = "ABRIENDO GOOGLE";

    }


    /* =========================
       BUSCAR EN GOOGLE
    ========================= */

    else if (action.id === "search_google") {

        if (!action.query) {
            console.warn("No existe una búsqueda para Google.");
            return;
        }

        url =
            "https://www.google.com/search?q=" +
            encodeURIComponent(action.query);

        stateTextValue =
            `Buscando "${action.query}" en Google...`;
        statusText = "BUSCANDO EN GOOGLE";

    }


    /* =========================
       WIKIPEDIA
    ========================= */

    else if (action.id === "open_wikipedia") {

        url = "https://es.wikipedia.org/";
        stateTextValue = "Abriendo Wikipedia...";
        statusText = "ABRIENDO WIKIPEDIA";

    }


    /* =========================
       BUSCAR EN WIKIPEDIA
    ========================= */

    else if (action.id === "search_wikipedia_web") {

        if (!action.query) {
            console.warn("No existe una búsqueda para Wikipedia.");
            return;
        }

        url =
            "https://es.wikipedia.org/w/index.php?search=" +
            encodeURIComponent(action.query);

        stateTextValue =
            `Buscando "${action.query}" en Wikipedia...`;
        statusText = "BUSCANDO EN WIKIPEDIA";

    }

        /* =========================
           WHATSAPP
        ========================= */

        else if (action.id === "open_whatsapp") {

            url = "https://chat.whatsapp.com/";
            stateTextValue = "Abriendo WhatsApp...";
            statusText = "ABRIENDO WHATSAPP";

        }


        else if (action.id === "send_whatsapp") {

            if (!action.query)
                return;

            url =
                "https://api.whatsapp.com/send?text=" +
                encodeURIComponent(action.query);

        }
          
    /* =========================
       TELEGRAM
    ========================= */

    else if (action.id === "open_telegram") {

        url = "https://t.me/telegram";
        stateTextValue = "Abriendo Telegram...";
        statusText = "ABRIENDO TELEGRAM";

    }

    /* =========================
       INSTAGRAM
    ========================= */

    else if (action.id === "open_instagram") {

        url = "https://www.instagram.com/";
        stateTextValue = "Abriendo Instagram...";
        statusText = "ABRIENDO INSTAGRAM";

    }

    /* =========================
       TIKTOK
    ========================= */

    else if (action.id === "open_tiktok") {

        url = "https://www.tiktok.com/";
        stateTextValue = "Abriendo TikTok...";
        statusText = "ABRIENDO TIKTOK";

    }


    /* =========================
       SPOTIFY
    ========================= */

    else if (action.id === "open_spotify") {

        url = "spotify://";
        stateTextValue = "Abriendo Spotify...";
        statusText = "ABRIENDO SPOTIFY";

    }


    /* =========================
       MAPS / NAVEGACIÓN
    ========================= */

    else if (action.id === "open_maps") {

        if (action.query) {
            url = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(action.query);
            stateTextValue = `Buscando "${action.query}" en Maps...`;
        } else {
            url = "https://www.google.com/maps";
            stateTextValue = "Abriendo Google Maps...";
        }

        statusText = "ABRIENDO MAPS";

    }


    /* =========================
       LLAMADA TELEFÓNICA
    ========================= */

    else if (action.id === "make_call") {

        if (!action.query) {
            console.warn("No hay número especificado para llamar.");
            return;
        }

        url = "tel:" + encodeURIComponent(action.query);
        stateTextValue = `Preparando llamada a ${action.query}...`;
        statusText = "INICIANDO LLAMADA";

    }


    /* =========================
       CORREO ELECTRÓNICO
    ========================= */

    else if (action.id === "open_email") {

        url = "mailto:";
        stateTextValue = "Abriendo aplicación de correo...";
        statusText = "ABRIENDO CORREO";

    }


    /* =========================
       ACCIÓN DESCONOCIDA
    ========================= */

    else {

        console.warn("Acción no reconocida:", action.id);

        setEmotion("sad");
        setState("Acción no disponible");
        setStatus("ACCIÓN NO DISPONIBLE");

        speak(
            "No conozco esa acción todavía.",
            "sad"
        );

        return;
    }


    if (!url)
        return;


    setState(stateTextValue);
    setStatus(statusText);
    setEmotion("happy");

    if (action.id === "search_tiktok" && action.query) {
        openTikTokSearchNative(action.query, url);
        speak(`Permiso concedido. Buscando ${action.query} en TikTok.`, "happy");
        return;
    }

    let destinationWindow = approvedWindow;


    if (!destinationWindow) {

        try {

            destinationWindow =
                window.open("about:blank", "_blank");

        } catch (error) {

            console.error(
                "No se pudo crear la ventana de acción:",
                error
            );

        }
    }


    if (destinationWindow) {

        try {

            destinationWindow.location.href = url;

            console.log(
                "URL DE ACCIÓN ABIERTA:",
                url
            );

        } catch (error) {

            console.error(
                "No se pudo navegar a la URL:",
                error
            );

            destinationWindow.close();

        }

    } else {

        console.warn(
            "El navegador bloqueó la ventana nueva. URL:",
            url
        );

        setState("El navegador bloqueó la ventana nueva");
        setStatus("VENTANA BLOQUEADA");

        try {

            window.location.href = url;

        } catch (error) {

            console.error(
                "No se pudo abrir la URL:",
                error
            );

        }

    }


    speak(
        action.query
            ? `Permiso concedido. Procesando ${action.query}.`
            : `Permiso concedido. ${action.name}.`,
        "happy"
    );

}

/* =========================
   CERRAR PERMISO
========================= */

function closePermission() {

    permissionPanel.classList.add(
        "hidden"
    );


    pendingAction = null;


    setEmotion("neutral");

    setState("Neutral");
    setStatus("EN LÍNEA");

}

/* =========================
   PERMITIR
========================= */

allowPermission.addEventListener(
    "click",
    () => {

        if (!pendingAction)
            return;


        const action =
            pendingAction;


        let url = null;


        /* =========================
           YOUTUBE
        ========================= */

        if (action.id === "open_youtube") {

            url =
                "https://www.youtube.com/";

        }


        else if (action.id === "search_tiktok") {

            if (!action.query)
                return;

            url =
                "https://www.tiktok.com/search?q=" +
                encodeURIComponent(action.query);

        }


        else if (action.id === "search_youtube") {

            if (!action.query)
                return;

            url =
                "https://www.youtube.com/results?search_query=" +
                encodeURIComponent(action.query);

        }


        /* =========================
           GOOGLE
        ========================= */

        else if (action.id === "open_google") {

            url =
                "https://www.google.com/";

        }


        else if (action.id === "search_google") {

            if (!action.query)
                return;

            url =
                "https://www.google.com/search?q=" +
                encodeURIComponent(action.query);

        }


        /* =========================
           WIKIPEDIA
        ========================= */

        else if (action.id === "open_wikipedia") {

            url =
                "https://es.wikipedia.org/";

        }


        else if (action.id === "search_wikipedia_web") {

            if (!action.query)
                return;

            url =
                "https://es.wikipedia.org/w/index.php?search=" +
                encodeURIComponent(action.query);

        }

               /* =========================
           WHATSAPP
        ========================= */

        else if (action.id === "open_whatsapp") {

            url = "https://chat.whatsapp.com/";

        }


        else if (action.id === "send_whatsapp") {

            if (!action.query)
                return;

            closePermission();
            setState("Enviando mensaje...");
            setStatus("WHATSAPP");
            setEmotion("happy");

            speak(`Permiso concedido. Procesando ${action.query}.`, "happy");

            // Abre WhatsApp y precarga el texto en la lista de contactos
            window.location.href = "https://wa.me/?text=" + encodeURIComponent(action.query);
            return;

        }

        /*=========================
           TELEGRAM
        ========================= */

        else if (action.id === "open_telegram") {

            url = "https://t.me/telegram";

        }

        /* =========================
           INSTAGRAM
        ========================= */

        else if (action.id === "open_instagram") {

            url = "https://www.instagram.com/";

        }

        /* =========================
           TIKTOK
        ========================= */

        else if (action.id === "open_tiktok") {

            url = "https://www.tiktok.com/";

        }


        /* =========================
           SPOTIFY
        ========================= */

        else if (action.id === "open_spotify") {

            url = "spotify://";

        }


        /* =========================
           MAPS
        ========================= */

        else if (action.id === "open_maps") {

            url = action.query
                ? "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(action.query)
                : "https://www.google.com/maps";

        }


        /* =========================
           LLAMADA
        ========================= */

        else if (action.id === "make_call") {

            if (!action.query)
                return;

            url = "tel:" + encodeURIComponent(action.query);

        }


        /* =========================
           CORREO
        ========================= */

        else if (action.id === "open_email") {

            url = "mailto:";

        }


        /* =========================
           ACCIÓN DESCONOCIDA
        ========================= */

        else {

            console.warn(
                "Acción no reconocida:",
                action.id
            );

            return;

        }


        if (!url)
            return;

        if (action.id === "search_tiktok" && action.query) {
            closePermission();
            setState(`Buscando "${action.query}" en TikTok...`);
            setStatus("BUSCANDO EN TIKTOK");
            setEmotion("happy");
            openTikTokSearchNative(action.query, url);
            speak(`Permiso concedido. Buscando ${action.query} en TikTok.`, "happy");
            return;
        }


        console.log(
            "ABRIENDO ACCIÓN AUTORIZADA:",
            url
        );


        /*
            Apertura directa dentro del evento click del usuario.
        */

        const openedByAndroid = openExternalUrl(url);
        const newWindow = openedByAndroid ? true : window.open(url, "_blank");

        if (!newWindow) {

            console.warn(
                "El navegador bloqueó la apertura directa."
            );


            setState(
                "Abriendo aplicación..."
            );


            setStatus(
                "ABRIENDO"
            );


            window.location.href =
                url;


            return;

        }


        closePermission();


        /*
            Actualización del estado de Erly segun la app.
        */

        if (action.id.includes("whatsapp")) {

            setState("Abriendo WhatsApp...");
            setStatus("WHATSAPP");

        }

        else if (action.id.includes("spotify")) {

            setState("Abriendo Spotify...");
            setStatus("SPOTIFY");

        }

        else if (action.id.includes("maps")) {

            setState("Abriendo Google Maps...");
            setStatus("MAPS");

        }

        else if (action.id.includes("call")) {

            setState("Iniciando llamada...");
            setStatus("LLAMADA");

        }

        else if (action.id.includes("tiktok")) {

            setState(
                action.query
                    ? `Buscando "${action.query}" en TikTok...`
                    : "Abriendo TikTok..."
            );

            setStatus(
                action.query
                    ? "BUSCANDO EN TIKTOK"
                    : "ABRIENDO TIKTOK"
            );

        }

        else if (action.id.includes("youtube")) {

            setState(
                action.query
                    ? `Buscando "${action.query}" en YouTube...`
                    : "Abriendo YouTube..."
            );

            setStatus(
                action.query
                    ? "BUSCANDO EN YOUTUBE"
                    : "ABRIENDO YOUTUBE"
            );

        }

        else if (action.id.includes("google")) {

            setState(
                action.query
                    ? `Buscando "${action.query}" en Google...`
                    : "Abriendo Google..."
            );

            setStatus(
                action.query
                    ? "BUSCANDO EN GOOGLE"
                    : "ABRIENDO GOOGLE"
            );

        }

        else if (action.id.includes("wikipedia")) {

            setState(
                action.query
                    ? `Buscando "${action.query}" en Wikipedia...`
                    : "Abriendo Wikipedia..."
            );

            setStatus(
                action.query
                    ? "BUSCANDO EN WIKIPEDIA"
                    : "ABRIENDO WIKIPEDIA"
            );

        }


        setEmotion(
            "happy"
        );


        speak(
            action.query
                ? `Permiso concedido. Procesando ${action.query}.`
                : `Permiso concedido. ${action.name}.`,
            "happy"
        );

    }
);

/* =========================
   CANCELAR
========================= */

denyPermission.addEventListener(
    "click",
    () => {

        closePermission();


        setEmotion("neutral");

        setState(
            "Acción cancelada"
        );

        setStatus(
            "EN LÍNEA"
        );


        speak(
            "Acción cancelada.",
            "neutral"
        );

    }
);
