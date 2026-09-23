/* =========================================================
   ERLY 1.3.0 — SETTINGS
========================================================= */
(function () {
    const panel = document.getElementById("settingsPanel");
    const openBtn = document.getElementById("settingsBtn");
    const closeBtn = document.getElementById("closeSettings");
    if (!panel || !openBtn) return;

    const voice = document.getElementById("settingVoice");
    const gestures = document.getElementById("settingGestures");
    const animations = document.getElementById("settingAnimations");
    const memory = document.getElementById("settingMemory");
    const rate = document.getElementById("settingRate");
    const pitch = document.getElementById("settingPitch");

    // En Android, Erly puede conectarse a un servidor Flask en la PC
    // mediante AndroidBridge. En navegador normal se mantiene /chat.
    let backendInput = document.getElementById("settingBackendUrl");
    if (!backendInput) {
        const row = document.createElement("label");
        row.className = "setting-row";
        row.innerHTML = '<span>Servidor IA</span><input id="settingBackendUrl" type="text" placeholder="http://192.168.x.x:5000">';
        const close = document.getElementById("closeSettings");
        panel.querySelector(".settings-card")?.insertBefore(row, close || null);
        backendInput = row.querySelector("#settingBackendUrl");
    }

    let settings = {
        voice: true, gestures: true, animations: true, memory: true,
        voiceRate: 1, voicePitch: 1, backendUrl: ""
    };

    try { Object.assign(settings, JSON.parse(localStorage.getItem("erlySettings") || "{}")); } catch (_) {}

    function syncUI() {
        voice.checked = settings.voice !== false;
        gestures.checked = settings.gestures !== false;
        animations.checked = settings.animations !== false;
        memory.checked = settings.memory !== false;
        rate.value = settings.voiceRate ?? 1;
        pitch.value = settings.voicePitch ?? 1;
        if (backendInput) {
            try {
                const bridgeUrl = window.ErlyAndroid && typeof window.ErlyAndroid.getBackendUrl === "function"
                    ? String(window.ErlyAndroid.getBackendUrl() || "") : "";
                backendInput.value = settings.backendUrl || bridgeUrl || localStorage.getItem("erlyBackendUrl") || "";
            } catch (_) { backendInput.value = settings.backendUrl || ""; }
        }
    }

    function save() {
        settings = {
            voice: voice.checked,
            gestures: gestures.checked,
            animations: animations.checked,
            memory: memory.checked,
            voiceRate: Number(rate.value),
            voicePitch: Number(pitch.value),
            backendUrl: backendInput ? backendInput.value.trim().replace(/\/$/, "") : ""
        };
        localStorage.setItem("erlySettings", JSON.stringify(settings));
        if (settings.backendUrl) localStorage.setItem("erlyBackendUrl", settings.backendUrl);
        try {
            if (window.ErlyAndroid && typeof window.ErlyAndroid.setBackendUrl === "function") {
                window.ErlyAndroid.setBackendUrl(settings.backendUrl || "");
            }
        } catch (_) {}
        if (window.ErlySettings) window.ErlySettings.apply(settings);
    }

    openBtn.addEventListener("click", () => { syncUI(); panel.classList.remove("hidden"); });
    closeBtn?.addEventListener("click", () => { save(); panel.classList.add("hidden"); });
    panel.addEventListener("click", e => { if (e.target === panel) { save(); panel.classList.add("hidden"); } });
    [voice, gestures, animations, memory, rate, pitch, backendInput].forEach(el => el?.addEventListener("input", save));
    syncUI();
    save();
})();
