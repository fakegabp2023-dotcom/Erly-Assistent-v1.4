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

    let settings = {
        voice: true, gestures: true, animations: true, memory: true,
        voiceRate: 1, voicePitch: 1
    };

    try { Object.assign(settings, JSON.parse(localStorage.getItem("erlySettings") || "{}")); } catch (_) {}

    function syncUI() {
        voice.checked = settings.voice !== false;
        gestures.checked = settings.gestures !== false;
        animations.checked = settings.animations !== false;
        memory.checked = settings.memory !== false;
        rate.value = settings.voiceRate ?? 1;
        pitch.value = settings.voicePitch ?? 1;
    }

    function save() {
        settings = {
            voice: voice.checked,
            gestures: gestures.checked,
            animations: animations.checked,
            memory: memory.checked,
            voiceRate: Number(rate.value),
            voicePitch: Number(pitch.value)
        };
        localStorage.setItem("erlySettings", JSON.stringify(settings));
        if (window.ErlySettings) window.ErlySettings.apply(settings);
    }

    openBtn.addEventListener("click", () => { syncUI(); panel.classList.remove("hidden"); });
    closeBtn?.addEventListener("click", () => { save(); panel.classList.add("hidden"); });
    panel.addEventListener("click", e => { if (e.target === panel) { save(); panel.classList.add("hidden"); } });
    [voice, gestures, animations, memory, rate, pitch].forEach(el => el?.addEventListener("input", save));
    syncUI();
    save();
})();
