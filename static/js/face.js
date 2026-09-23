/* =========================================================
   ERLY — FACE + GAZE + SENSOR PRESERVED + FLOATING HANDS
   ChatbotErly 1.2.5
   ========================================================= */

const SENSOR_ENABLED = false;

const ERLY_SETTINGS = {
    voice: true,
    gestures: true,
    animations: true,
    voiceRate: 1,
    voicePitch: 1
};

try {
    const saved = JSON.parse(localStorage.getItem("erlySettings") || "{}");
    Object.assign(ERLY_SETTINGS, saved);
} catch (_) {}

const face = document.getElementById("face");
const cameraBtn = document.getElementById("cameraBtn");
const webcam = document.getElementById("webcam");
const stateText = document.getElementById("stateText");
const pupils = document.querySelectorAll(".pupil");
const eyes = document.querySelectorAll(".eye");
const eyebrows = document.querySelectorAll(".eyebrow");
const leftEyebrow = document.querySelector(".eyebrow-left");
const rightEyebrow = document.querySelector(".eyebrow-right");
const leftHand = document.getElementById("leftHand");
const rightHand = document.getElementById("rightHand");

let cameraActive = false;
let sensorStarting = false;
let cameraInstance = null;
let hands = null;
let handDetected = false;
let processingFrame = false;
let lastSensorFrame = 0;
const SENSOR_FRAME_INTERVAL = 45;
const HAND_LOST_DELAY = 650;

let filteredHandX = 0;
let filteredHandY = 0;
let lastHandTargetX = 0;
let lastHandTargetY = 0;
let lastHandTime = 0;

let gazeX = 0;
let gazeY = 0;
let targetGazeX = 0;
let targetGazeY = 0;

let naturalTimer = null;
let naturalActive = false;
let naturalTargetX = 0;
let naturalTargetY = 0;

let eyebrowBase = {
    left: { y: 0, rotation: 0 },
    right: { y: 0, rotation: 0 }
};

let eyebrowMotion = {
    left: { y: 0, rotation: 0 },
    right: { y: 0, rotation: 0 }
};

let eyebrowTarget = {
    left: { y: 0, rotation: 0 },
    right: { y: 0, rotation: 0 }
};

let speakingActive = false;
let eyebrowMotionTimer = null;

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function lerp(a, b, amount) {
    return a + (b - a) * amount;
}

function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

function setGaze(x, y) {
    targetGazeX = clamp(x, -1, 1);
    targetGazeY = clamp(y, -1, 1);
}

function updateGaze() {
    const smoothing = cameraActive ? 0.28 : 0.12;

    gazeX = lerp(gazeX, targetGazeX, smoothing);
    gazeY = lerp(gazeY, targetGazeY, smoothing);

    pupils.forEach(pupil => {
        pupil.style.transform =
            `translate(calc(-50% + ${gazeX * 22}px), calc(-50% + ${gazeY * 14}px))`;
    });

    eyes.forEach(eye => {
        eye.style.transform =
            `translate(${gazeX * 1.5}px, ${gazeY * 1.0}px)`;
    });

    requestAnimationFrame(updateGaze);
}

function clearNaturalTimer() {
    if (naturalTimer) {
        clearTimeout(naturalTimer);
        naturalTimer = null;
    }
}

function chooseNaturalTarget() {
    if (cameraActive || sensorStarting) return;

    naturalActive = true;
    naturalTargetX = randomRange(-0.38, 0.38);
    naturalTargetY = randomRange(-0.20, 0.20);
    setGaze(naturalTargetX, naturalTargetY);

    const pause = randomRange(900, 2100);
    naturalTimer = setTimeout(() => {
        if (cameraActive || sensorStarting) return;
        naturalActive = false;
        setGaze(0, 0);
        naturalTimer = setTimeout(chooseNaturalTarget, randomRange(900, 1800));
    }, pause);
}

function startNaturalGaze() {
    clearNaturalTimer();
    naturalTimer = setTimeout(chooseNaturalTarget, randomRange(1200, 2600));
}

/* =========================================================
   MIRADA POR TOQUE / RATÓN
========================================================= */

function pointerGaze(clientX, clientY) {
    if (cameraActive || sensorStarting || !face) return;

    const rect = face.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const x = ((clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((clientY - rect.top) / rect.height - 0.5) * 2;

    clearNaturalTimer();
    naturalActive = false;
    setGaze(clamp(x, -1, 1), clamp(y, -1, 1));
}

if (face) {
    face.addEventListener("pointermove", event => {
        pointerGaze(event.clientX, event.clientY);
    });

    face.addEventListener("pointerdown", event => {
        pointerGaze(event.clientX, event.clientY);
    });

    face.addEventListener("pointerleave", () => {
        if (!cameraActive && !sensorStarting) {
            setGaze(0, 0);
            startNaturalGaze();
        }
    });
}

/* =========================================================
   CEJAS DINÁMICAS
========================================================= */

function setEyebrowBase(emotion) {
    eyebrowBase = {
        left: { y: 0, rotation: 0 },
        right: { y: 0, rotation: 0 }
    };

    switch (emotion) {
        case "surprised":
            eyebrowBase.left.y = -6;
            eyebrowBase.right.y = -6;
            break;

        case "thinking":
            eyebrowBase.left.y = -5;
            eyebrowBase.left.rotation = -8;
            eyebrowBase.right.y = 2;
            eyebrowBase.right.rotation = 5;
            break;

        case "angry":
            eyebrowBase.left.y = 3;
            eyebrowBase.left.rotation = 12;
            eyebrowBase.right.y = 3;
            eyebrowBase.right.rotation = -12;
            break;

        case "sad":
            eyebrowBase.left.y = 3;
            eyebrowBase.left.rotation = 10;
            eyebrowBase.right.y = 3;
            eyebrowBase.right.rotation = -10;
            break;
    }
}

function scheduleEyebrowMicroMotion() {
    if (eyebrowMotionTimer) {
        clearTimeout(eyebrowMotionTimer);
    }

    const delay = speakingActive
        ? randomRange(220, 520)
        : randomRange(900, 2200);

    eyebrowMotionTimer = setTimeout(() => {
        const amount = speakingActive ? 1.8 : 1.1;

        eyebrowTarget.left.y = randomRange(-amount, amount);
        eyebrowTarget.right.y = randomRange(-amount, amount);
        eyebrowTarget.left.rotation = randomRange(-1.5, 1.5);
        eyebrowTarget.right.rotation = randomRange(-1.5, 1.5);

        scheduleEyebrowMicroMotion();
    }, delay);
}

function updateEyebrows() {
    ["left", "right"].forEach(side => {
        eyebrowMotion[side].y = lerp(
            eyebrowMotion[side].y,
            eyebrowTarget[side].y,
            0.08
        );

        eyebrowMotion[side].rotation = lerp(
            eyebrowMotion[side].rotation,
            eyebrowTarget[side].rotation,
            0.08
        );
    });

    if (leftEyebrow) {
        leftEyebrow.style.setProperty(
            "--brow-y",
            `${eyebrowBase.left.y + eyebrowMotion.left.y}px`
        );
        leftEyebrow.style.setProperty(
            "--brow-rotate",
            `${eyebrowBase.left.rotation + eyebrowMotion.left.rotation}deg`
        );
    }

    if (rightEyebrow) {
        rightEyebrow.style.setProperty(
            "--brow-y",
            `${eyebrowBase.right.y + eyebrowMotion.right.y}px`
        );
        rightEyebrow.style.setProperty(
            "--brow-rotate",
            `${eyebrowBase.right.rotation + eyebrowMotion.right.rotation}deg`
        );
    }

    requestAnimationFrame(updateEyebrows);
}

/* =========================================================
   SENSOR — CONSERVADO, PERO DESACTIVADO
========================================================= */

async function initMediaPipe() {
    if (!SENSOR_ENABLED || hands) return;
    if (typeof Hands === "undefined") return;

    hands = new Hands({
        locateFile: file =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 0,
        minDetectionConfidence: 0.60,
        minTrackingConfidence: 0.60
    });

    hands.onResults(onHandResults);
}

function onHandResults(results) {
    if (!SENSOR_ENABLED || !cameraActive) return;

    const landmarks = results.multiHandLandmarks;

    if (!landmarks || !landmarks.length) {
        if (handDetected && performance.now() - lastHandTime > HAND_LOST_DELAY) {
            handDetected = false;
            setGaze(0, 0);
        }
        return;
    }

    const tip = landmarks[0][8];
    if (!tip) return;

    handDetected = true;
    lastHandTime = performance.now();
    setHandGaze(tip.x, tip.y);
}

function setHandGaze(
    x,
    y
) {

    if (!SENSOR_ENABLED) {
        return;
    }

    const deadZone = 0.08;

    let normalizedX =
        (x - 0.5) * 2;

    let normalizedY =
        (y - 0.5) * 2;

    normalizedX =
        clamp(
            normalizedX,
            -1,
            1
        );

    normalizedY =
        clamp(
            normalizedY,
            -1,
            1
        );

    if (
        Math.abs(normalizedX) <
        deadZone
    ) {
        normalizedX = 0;
    }

    if (
        Math.abs(normalizedY) <
        deadZone
    ) {
        normalizedY = 0;
    }

    filteredHandX =
        lerp(
            filteredHandX,
            normalizedX,
            0.18
        );

    filteredHandY =
        lerp(
            filteredHandY,
            normalizedY,
            0.18
        );

    lastHandTargetX =
        filteredHandX;

    lastHandTargetY =
        filteredHandY;

    setGaze(
        filteredHandX,
        filteredHandY
    );
}


async function processSensorFrame(
    timestamp
) {

    if (!SENSOR_ENABLED) {
        return;
    }

    if (!cameraActive) {
        return;
    }

    if (processingFrame) {
        return;
    }

    if (
        timestamp -
        lastSensorFrame <
        SENSOR_FRAME_INTERVAL
    ) {

        requestAnimationFrame(
            processSensorFrame
        );

        return;
    }

    lastSensorFrame =
        timestamp;

    processingFrame = true;

    try {

        if (
            webcam.readyState >= 2 &&
            hands
        ) {

            await hands.send({
                image: webcam
            });
        }

    } catch (error) {

        console.warn(
            "MediaPipe:",
            error
        );

    } finally {

        processingFrame = false;

        if (cameraActive) {

            requestAnimationFrame(
                processSensorFrame
            );
        }
    }
}


async function startCamera() {

    /*
        BLOQUEO PRINCIPAL DEL SENSOR.
    */

    if (!SENSOR_ENABLED) {

        console.info(
            "Erly: sensor desactivado en 1.2.4."
        );

        return;
    }

    /* Código preparado para futuro */

    if (
        cameraActive ||
        sensorStarting
    ) {
        return;
    }

    sensorStarting = true;

    clearNaturalTimer();

    setGaze(0, 0);

    try {

        await initMediaPipe();

        const stream =
            await navigator.mediaDevices
                .getUserMedia({

                    video: {
                        facingMode: "user",

                        width: {
                            ideal: 480
                        },

                        height: {
                            ideal: 360
                        },

                        frameRate: {
                            ideal: 24,
                            max: 30
                        }
                    },

                    audio: false
                });

        webcam.srcObject =
            stream;

        await webcam.play();

        cameraActive = true;

        sensorStarting = false;

        requestAnimationFrame(
            processSensorFrame
        );

    } catch (error) {

        console.error(
            "No se pudo iniciar la cámara:",
            error
        );

        cameraActive = false;

        sensorStarting = false;
    }
}


function stopCamera() {

    if (!SENSOR_ENABLED) {
        return;
    }

    cameraActive = false;

    sensorStarting = false;

    processingFrame = false;

    handDetected = false;

    if (webcam.srcObject) {

        webcam.srcObject
            .getTracks()
            .forEach(
                track => track.stop()
            );

        webcam.srcObject = null;
    }

    cameraInstance = null;
}


/*
    El botón existe para conservar compatibilidad,
    pero está desactivado en 1.2.4.
*/

if (cameraBtn) {

    cameraBtn.addEventListener(
        "click",
        () => {

            if (!SENSOR_ENABLED) {

                console.info(
                    "Sensor desactivado."
                );

                return;
            }

            if (cameraActive) {
                stopCamera();
            } else {
                startCamera();
            }
        }
    );
}


/* =========================================================
   MOVIMIENTO NATURAL + GESTOS VISIBLES DE LAS MANOS
========================================================= */

const HAND_MOTION = {
    x: 2.2,
    y: 1.8,
    rotation: 1.0,
    speed: 0.00105
};

let handMotionFrame = null;
const handGestureTimers = { left: [], right: [] };
const handGestureTokens = { left: 0, right: 0 };

function clearHandGesture(side) {
    if (!handGestureTimers[side]) return;

    handGestureTimers[side].forEach(timer => clearTimeout(timer));
    handGestureTimers[side] = [];
    handGestureTokens[side]++;
}

function setHandOffset(side, x = 0, y = 0, rotation = 0, scale = 1) {
    const hand = handElements[side];
    if (!hand) return;

    hand.style.setProperty("--manual-x", `${x}px`);
    hand.style.setProperty("--manual-y", `${y}px`);
    hand.style.setProperty("--manual-rotation", `${rotation}deg`);
    hand.style.setProperty("--manual-scale", `${scale}`);
}

function animateHandTo(side, target, duration = 280) {
    const hand = handElements[side];
    if (!hand) return;

    const token = handGestureTokens[side];
    const start = performance.now();
    const from = {
        x: parseFloat(hand.style.getPropertyValue("--manual-x")) || 0,
        y: parseFloat(hand.style.getPropertyValue("--manual-y")) || 0,
        rotation: parseFloat(hand.style.getPropertyValue("--manual-rotation")) || 0,
        scale: parseFloat(hand.style.getPropertyValue("--manual-scale")) || 1
    };

    function frame(now) {
        if (token !== handGestureTokens[side]) return;

        const progress = clamp((now - start) / duration, 0, 1);
        const eased = 1 - Math.pow(1 - progress, 3);

        setHandOffset(
            side,
            lerp(from.x, target.x || 0, eased),
            lerp(from.y, target.y || 0, eased),
            lerp(from.rotation, target.rotation || 0, eased),
            lerp(from.scale, target.scale ?? 1, eased)
        );

        if (progress < 1) {
            requestAnimationFrame(frame);
        }
    }

    requestAnimationFrame(frame);
}

function queueHandPose(side, steps) {
    clearHandGesture(side);
    const token = handGestureTokens[side];
    let elapsed = 0;

    steps.forEach(step => {
        const timer = setTimeout(() => {
            if (token !== handGestureTokens[side]) return;
            animateHandTo(side, step, Math.min(320, step.duration || 260));
        }, elapsed);

        handGestureTimers[side].push(timer);
        elapsed += step.duration || 260;
    });
}

function updateNaturalHandMotion(timestamp) {
    if (!leftHand && !rightHand) return;

    const wave = timestamp * HAND_MOTION.speed;
    const x = Math.sin(wave) * HAND_MOTION.x;
    const y = Math.sin(wave * 0.73 + 1.7) * HAND_MOTION.y;
    const rotation = Math.sin(wave * 0.61 + 0.8) * HAND_MOTION.rotation;

    [leftHand, rightHand].forEach((hand, index) => {
        if (!hand) return;

        const side = index === 0 ? -1 : 1;

        hand.style.setProperty("--hand-motion-x", `${x * side}px`);
        hand.style.setProperty("--hand-motion-y", `${y}px`);
        hand.style.setProperty("--hand-motion-rotation", `${rotation * side}deg`);
    });

    handMotionFrame = requestAnimationFrame(updateNaturalHandMotion);
}

function stopNaturalHandMotion() {
    if (handMotionFrame) {
        cancelAnimationFrame(handMotionFrame);
        handMotionFrame = null;
    }
}

/* =========================================================
   MANOS VIRTUALES
========================================================= */

const handElements = {
    left: leftHand,
    right: rightHand
};

const HAND_POSES = [
    "neutral",
    "talking",
    "point",
    "wave",
    "thinking",
    "happy",
    "surprised",
    "thumbup"
];

function setHandPose(side, pose) {
    if (!ERLY_SETTINGS.gestures || !ERLY_SETTINGS.animations) return;
    const hand = handElements[side];
    if (!hand) return;

    if (!HAND_POSES.includes(pose)) pose = "neutral";

    clearHandGesture(side);

    HAND_POSES.forEach(poseName => {
        hand.classList.remove(`pose-${poseName}`);
    });

    hand.classList.add(`pose-${pose}`);

    /*
       Ahora la pose mueve la MANO COMPLETA, no solamente los dedos.
       Los dedos siguen siendo controlados por CSS para conservar
       la forma de cada gesto.
    */
    switch (pose) {
        case "wave":
            queueHandPose(side, [
                { x: 0, y: -12, rotation: side === "left" ? -8 : 8, scale: 1.04, duration: 220 },
                { x: side === "left" ? -16 : 16, y: -12, rotation: side === "left" ? -16 : 16, scale: 1.04, duration: 180 },
                { x: side === "left" ? 16 : -16, y: -12, rotation: side === "left" ? 16 : -16, scale: 1.04, duration: 180 },
                { x: side === "left" ? -13 : 13, y: -12, rotation: side === "left" ? -13 : 13, scale: 1.04, duration: 180 },
                { x: 0, y: 0, rotation: 0, scale: 1, duration: 280 }
            ]);
            break;

        case "thinking":
            hand.classList.add("thinking-front");
            queueHandPose(side, side === "left" ? [
                { x: 35, y: -14, rotation: -18, scale: 1.04, duration: 360 },
                { x: 43, y: -20, rotation: -24, scale: 1.04, duration: 320 },
                { x: 35, y: -14, rotation: -18, scale: 1.04, duration: 300 },
                { x: 0, y: 0, rotation: 0, scale: 1, duration: 360 }
            ] : [
                { x: -8, y: -5, rotation: 5, scale: 1, duration: 260 },
                { x: 0, y: 0, rotation: 0, scale: 1, duration: 300 }
            ]);
            break;

        case "point":
            queueHandPose(side, [
                { x: side === "right" ? 18 : -18, y: -12, rotation: side === "right" ? -8 : 8, scale: 1.05, duration: 300 },
                { x: side === "right" ? 28 : -28, y: -10, rotation: side === "right" ? -13 : 13, scale: 1.05, duration: 260 },
                { x: side === "right" ? 20 : -20, y: -8, rotation: side === "right" ? -8 : 8, scale: 1.03, duration: 260 },
                { x: 0, y: 0, rotation: 0, scale: 1, duration: 300 }
            ]);
            break;

        case "thumbup":
            queueHandPose(side, [
                { x: side === "right" ? -10 : 10, y: -14, rotation: side === "right" ? -6 : 6, scale: 1.07, duration: 300 },
                { x: side === "right" ? -10 : 10, y: -20, rotation: side === "right" ? -4 : 4, scale: 1.08, duration: 240 },
                { x: 0, y: 0, rotation: 0, scale: 1, duration: 360 }
            ]);
            break;

        case "surprised":
            queueHandPose(side, [
                { x: side === "left" ? -8 : 8, y: -34, rotation: side === "left" ? -9 : 9, scale: 1.12, duration: 300 },
                { x: side === "left" ? -12 : 12, y: -38, rotation: side === "left" ? -11 : 11, scale: 1.14, duration: 240 },
                { x: side === "left" ? -5 : 5, y: -20, rotation: side === "left" ? -5 : 5, scale: 1.05, duration: 300 },
                { x: 0, y: 0, rotation: 0, scale: 1, duration: 360 }
            ]);
            break;

        case "happy":
            queueHandPose(side, [
                { x: side === "left" ? -6 : 6, y: -12, rotation: side === "left" ? -7 : 7, scale: 1.04, duration: 300 },
                { x: side === "left" ? 6 : -6, y: -18, rotation: side === "left" ? 7 : -7, scale: 1.06, duration: 300 },
                { x: 0, y: -8, rotation: 0, scale: 1.02, duration: 300 },
                { x: 0, y: 0, rotation: 0, scale: 1, duration: 320 }
            ]);
            break;

        case "talking":
            queueHandPose(side, [
                { x: side === "left" ? -7 : 7, y: -8, rotation: side === "left" ? -5 : 5, scale: 1.02, duration: 260 },
                { x: side === "left" ? 7 : -7, y: 2, rotation: side === "left" ? 5 : -5, scale: 1.01, duration: 260 },
                { x: 0, y: -5, rotation: 0, scale: 1.02, duration: 260 },
                { x: 0, y: 0, rotation: 0, scale: 1, duration: 260 }
            ]);
            break;

        default:
            animateHandTo(side, { x: 0, y: 0, rotation: 0, scale: 1 }, 300);
            break;
    }

    if (pose === "thinking") {
        const token = handGestureTokens[side];
        setTimeout(() => {
            if (handGestureTokens[side] === token && hand) {
                hand.classList.remove("thinking-front");
            }
        }, 1250);
    } else if (hand) {
        hand.classList.remove("thinking-front");
    }
}

function setBothHands(pose) {
    if (!ERLY_SETTINGS.gestures || !ERLY_SETTINGS.animations) return;
    setHandPose("left", pose);
    setHandPose("right", pose);
}

function moveHand(side, x, y, rotation = 0, scale = 1) {
    setHandOffset(side, Number(x) || 0, Number(y) || 0, Number(rotation) || 0, Number(scale) || 1);
}

function resetHandPosition(side) {
    if (!handElements[side]) return;
    clearHandGesture(side);
    animateHandTo(side, { x: 0, y: 0, rotation: 0, scale: 1 }, 300);
}

window.ErlyHands = {
    left: pose => setHandPose("left", pose),
    right: pose => setHandPose("right", pose),
    both: pose => setBothHands(pose),
    setPose: pose => setBothHands(pose),
    move: (side, x, y, rotation, scale) => moveHand(side, x, y, rotation, scale),
    reset: side => {
        if (side) resetHandPosition(side);
        else {
            resetHandPosition("left");
            resetHandPosition("right");
        }
    },
    poses: [...HAND_POSES]
};

/* =========================================================
   PARPADEO
========================================================= */

function blink() {

    if (!face) {
        return;
    }

    if (
        face.classList.contains(
            "blink"
        )
    ) {
        return;
    }

    face.classList.add(
        "blink"
    );

    setTimeout(
        () => {

            face.classList.remove(
                "blink"
            );

        },
        120
    );
}


function scheduleBlink() {

    const delay =
        randomRange(
            2800,
            6500
        );

    setTimeout(
        () => {

            blink();

            scheduleBlink();

        },
        delay
    );
}


/* =========================================================
   EMOCIONES
========================================================= */

function setEmotion(
    emotion
) {

    if (!face) {
        return;
    }

    face.classList.remove(
        "happy",
        "surprised",
        "thinking",
        "angry",
        "sad"
    );

    setEyebrowBase(emotion);

    if (
        emotion !==
        "neutral"
    ) {

        face.classList.add(
            emotion
        );
    }

    if (stateText) {

        stateText.textContent =
            emotion;
    }

    document
        .querySelectorAll(
            ".emotion-panel button"
        )
        .forEach(
            button => {

                button.classList.toggle(
                    "active",
                    button.dataset.emotion ===
                    emotion
                );

            }
        );


    /*
        Las manos acompañan la emoción.
    */

    switch (emotion) {

        case "happy":

            setBothHands(
                "happy"
            );

            break;


        case "surprised":

            setBothHands(
                "surprised"
            );

            break;


        case "thinking":

            setHandPose(
                "left",
                "thinking"
            );

            setHandPose(
                "right",
                "neutral"
            );

            break;


        case "angry":

            setBothHands(
                "neutral"
            );

            break;


        default:

            setBothHands(
                "neutral"
            );

            break;
    }
}


/* =========================================================
   BOTONES DE EMOCIÓN
========================================================= */

document
    .querySelectorAll(
        ".emotion-panel button"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    setEmotion(
                        button.dataset.emotion
                    );

                }
            );

        }
    );


/* =========================================================
   HABLAR
========================================================= */

function speak(text, emotion = "neutral") {

    if (!ERLY_SETTINGS.voice || !text) return;

    // AndroidBridge: usa TextToSpeech nativo si Web Speech API no está disponible.
    if (!("speechSynthesis" in window) && window.ErlyAndroid && typeof window.ErlyAndroid.speak === "function") {
        speakingActive = true;
        if (face) face.classList.add("speaking");
        if (ERLY_SETTINGS.gestures && ERLY_SETTINGS.animations) setBothHands("talking");
        const nativeDone = () => {
            speakingActive = false;
            if (face) face.classList.remove("speaking", "mouth-wide");
            if (ERLY_SETTINGS.gestures && ERLY_SETTINGS.animations) setBothHands("neutral");
        };
        try {
            window.ErlyAndroid.speak(String(text), Number(ERLY_SETTINGS.voiceRate) || 1, Number(ERLY_SETTINGS.voicePitch) || 1);
            window.setTimeout(nativeDone, Math.max(1200, String(text).length * 55));
        } catch (_) { nativeDone(); }
        return;
    }

    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-ES";
    utterance.rate = Number(ERLY_SETTINGS.voiceRate) || 1;
    utterance.pitch = Number(ERLY_SETTINGS.voicePitch) || 1;

    speakingActive = true;
    scheduleEyebrowMicroMotion();
    if (face) face.classList.add("speaking");
    if (ERLY_SETTINGS.gestures && ERLY_SETTINGS.animations) setBothHands("talking");

    const mouthTimer = setInterval(() => {
        if (!speakingActive || !face) return;
        face.classList.toggle("mouth-wide", Math.random() > 0.35);
    }, 90);

    const finish = () => {
        clearInterval(mouthTimer);
        speakingActive = false;
        scheduleEyebrowMicroMotion();
        if (face) {
            face.classList.remove("speaking", "mouth-wide");
        }
        if (ERLY_SETTINGS.gestures && ERLY_SETTINGS.animations) setBothHands("neutral");
    };

    utterance.onend = finish;
    utterance.onerror = finish;
    window.speechSynthesis.speak(utterance);
}

window.ErlySettings = {
    get: () => ({ ...ERLY_SETTINGS }),
    apply: settings => {
        Object.assign(ERLY_SETTINGS, settings || {});
        try { localStorage.setItem("erlySettings", JSON.stringify(ERLY_SETTINGS)); } catch (_) {}
        if (!ERLY_SETTINGS.gestures || !ERLY_SETTINGS.animations) {
            resetHandPosition("left");
            resetHandPosition("right");
        }
    },
    speak
};


/* =========================================================
   INICIO
========================================================= */

window.addEventListener(
    "load",
    () => {

        /*
            Sensor NO se inicializa.
        */

        setGaze(
            0,
            0
        );

        /*
            Mirada.
        */

        requestAnimationFrame(
            updateGaze
        );

        requestAnimationFrame(
            updateEyebrows
        );

        scheduleEyebrowMicroMotion();

        /*
            Parpadeo.
        */

        scheduleBlink();

        /*
            Manos.
        */

        setBothHands(
            "neutral"
        );

        handMotionFrame =
            requestAnimationFrame(
                updateNaturalHandMotion
            );

        /*
            Mirada natural.
        */

        naturalTimer =
            setTimeout(
                () => {

                    if (
                        !cameraActive &&
                        !sensorStarting
                    ) {

                        chooseNaturalTarget();

                    }

                },
                1800
            );
    }
);


/* =========================================================
   LIMPIEZA
========================================================= */

window.addEventListener(
    "beforeunload",
    () => {

        clearNaturalTimer();

        stopNaturalHandMotion();

        /*
            Conservado por compatibilidad
            con el sensor futuro.
        */

        if (
            SENSOR_ENABLED &&
            webcam.srcObject
        ) {

            webcam.srcObject
                .getTracks()
                .forEach(
                    track => {
                        track.stop();
                    }
                );
        }
    }
);