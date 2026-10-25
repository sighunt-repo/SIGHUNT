// static/level3.js

async function getAudioFingerprint() {
    try {
        const OfflineCtx = window.OfflineAudioContext || window.AudioContext;
        if (!OfflineCtx) {
            return { error: "OfflineAudioContext not supported" };
        }
        const context = new OfflineCtx(1, 5000, 44100);

        const oscillator = context.createOscillator();
        oscillator.type = "sine";   
        oscillator.frequency.value = 1000; 

        const filter = context.createBiquadFilter();
        filter.type = "lowpass"; 
        filter.frequency.value = 1500;

        oscillator.connect(filter);
        filter.connect(context.destination);

        oscillator.start(0);

        const buffer = await context.startRendering();

        const channelData = buffer.getChannelData(0);
        const sample = Array.from(channelData.slice(0, 10));

        let diffs = [];
        for (let i = 1; i < sample.length; i++) {
            diffs.push(sample[i] - sample[i - 1]);
        }
        const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length;
        const variance = diffs.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / diffs.length;

        return {
            sample: sample.map(v => Number(v.toFixed(6))), 
            jitterVariance: Number(variance.toFixed(8)),   
        };
    } catch (e) {
        return { error: e.toString() };
    }
}

async function getRealtimeAudioFingerprint() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
        return { sample: null, jitterVar: null, error: "unsupported" };
    }

    const timeout = new Promise(resolve => {
        setTimeout(() => resolve({ sample: null, jitterVar: null, error: "timeout" }), 300);
    });

    const attempt = (async () => {
        try {
            const ctx = new AudioCtx();

            if (!ctx || ctx.state === "closed") {
                return { sample: null, jitterVar: null, error: "creation_failed" };
            }

            if (ctx.state === "suspended") return { sample: null, jitterVar: null, error: "blocked_by_autoplay_policy" }

            const oscillator = ctx.createOscillator();
            const analyser = ctx.createAnalyser();

            analyser.fftSize = 2048;
            oscillator.type = "sine";
            oscillator.frequency.value = 440;

            oscillator.connect(analyser);
            analyser.connect(ctx.destination);
            oscillator.start();

            await new Promise(r => setTimeout(r, 150));

            const array = new Float32Array(analyser.frequencyBinCount);
            analyser.getFloatFrequencyData(array);

            const sample = Array.from(array.slice(0, 5));
            const diffs = [];
            for (let i = 1; i < sample.length; i++) diffs.push(sample[i] - sample[i - 1]);
            const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length;
            const variance = diffs.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / diffs.length;

            oscillator.stop();
            ctx.close();

            return { sample, jitterVar: variance };
        } catch (e) {
            return { sample: null, jitterVar: null, error: e.message || "exception" };
        }
    })();

    return Promise.race([attempt, timeout]);
}

function safeRead(fn, fallback = null) {
    try {
        const value = fn();
        return value === undefined ? fallback : value;
    } catch (e) {
        return fallback;
    }
}

function installLevel3LifecycleMonitors() {
    if (window.__level3LifecycleStatsInstalled) return;
    window.__level3LifecycleStatsInstalled = true;

    window.__level3LifecycleStats = {
        pagehideCount: 0,
        lastPagehideAt: null,
        asyncChallengeFinishedCount: 0,
        lastAsyncChallengeFinishedAt: null
    };

    window.addEventListener("pagehide", () => {
        window.__level3LifecycleStats.pagehideCount += 1;
        window.__level3LifecycleStats.lastPagehideAt = Date.now();
    });

    window.addEventListener("asyncChallengeFinished", () => {
        window.__level3LifecycleStats.asyncChallengeFinishedCount += 1;
        window.__level3LifecycleStats.lastAsyncChallengeFinishedAt = Date.now();
    });
}

function collectCanvasGetContextSignals() {
    const result = {
        hasCanvasElement: typeof HTMLCanvasElement !== "undefined",
        getContextType: null,
        context2dAvailable: false,
        webglAvailable: false,
        webgl2Available: false,
        dataUrlPrefix: null,
        canvasHashHint: null
    };

    try {
        if (!result.hasCanvasElement) return result;

        const canvas = document.createElement("canvas");
        result.getContextType = typeof canvas.getContext;

        const ctx2d = canvas.getContext("2d");
        result.context2dAvailable = !!ctx2d;
        result.webglAvailable = !!(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
        result.webgl2Available = !!canvas.getContext("webgl2");

        if (ctx2d) {
            canvas.width = 240;
            canvas.height = 80;
            ctx2d.textBaseline = "top";
            ctx2d.font = "16px Arial";
            ctx2d.fillStyle = "#f60";
            ctx2d.fillRect(10, 10, 120, 25);
            ctx2d.fillStyle = "#069";
            ctx2d.fillText("fp-level3-canvas", 14, 14);

            const dataUrl = canvas.toDataURL();
            result.dataUrlPrefix = dataUrl.slice(0, 30);
            result.canvasHashHint = dataUrl.slice(-24);
        }
    } catch (e) {
        result.error = String(e);
    }

    return result;
}

async function collectDeepApiSignals() {
    const out = {
        permissions: {
            supported: !!(navigator.permissions && navigator.permissions.query),
            notifications: null,
            geolocation: null,
            camera: null
        },
        mediaDevices: {
            supported: !!(navigator.mediaDevices && navigator.mediaDevices.enumerateDevices),
            deviceCount: null,
            kinds: [],
            error: null
        },
        serviceWorker: {
            supported: !!navigator.serviceWorker,
            controller: false,
            readyState: null,
            scope: null,
            error: null
        }
    };

    try {
        if (out.permissions.supported) {
            out.permissions.notifications = await readPermissionState("notifications");
            out.permissions.geolocation = await readPermissionState("geolocation");
            out.permissions.camera = await readPermissionState("camera");
        }
    } catch (e) {
        out.permissions.error = String(e);
    }

    try {
        if (out.mediaDevices.supported) {
            const devices = await navigator.mediaDevices.enumerateDevices();
            out.mediaDevices.deviceCount = devices.length;
            out.mediaDevices.kinds = Array.from(new Set(devices.map((d) => d.kind)));
        }
    } catch (e) {
        out.mediaDevices.error = String(e);
    }

    try {
        if (out.serviceWorker.supported) {
            out.serviceWorker.controller = !!navigator.serviceWorker.controller;
            if (navigator.serviceWorker.ready) {
                const reg = await Promise.race([
                    navigator.serviceWorker.ready,
                    new Promise((resolve) => setTimeout(() => resolve(null), 250))
                ]);
                if (reg) {
                    out.serviceWorker.readyState = "ready";
                    out.serviceWorker.scope = reg.scope || null;
                } else {
                    out.serviceWorker.readyState = "pending_or_timeout";
                }
            }
        }
    } catch (e) {
        out.serviceWorker.error = String(e);
    }

    return out;
}

async function readPermissionState(name) {
    try {
        const status = await navigator.permissions.query({ name });
        return status ? status.state : "unknown";
    } catch (e) {
        return `error:${String(e)}`;
    }
}

function collectNavigatorPrototypeSignals() {
    const out = {
        protoType: null,
        constructorName: null,
        webdriverDescriptorExists: false,
        webdriverDescriptorConfigurable: null,
        webdriverOnNavigator: null,
        ownPropsSample: [],
        suspicious: false
    };

    try {
        const proto = Object.getPrototypeOf(navigator);
        out.protoType = Object.prototype.toString.call(proto);
        out.constructorName = proto && proto.constructor ? proto.constructor.name : null;

        const desc = Object.getOwnPropertyDescriptor(proto, "webdriver");
        out.webdriverDescriptorExists = !!desc;
        out.webdriverDescriptorConfigurable = desc ? !!desc.configurable : null;
        out.webdriverOnNavigator = safeRead(() => navigator.webdriver, null);

        out.ownPropsSample = Object.getOwnPropertyNames(proto).slice(0, 20);

        if (out.constructorName && out.constructorName !== "Navigator") {
            out.suspicious = true;
        }
    } catch (e) {
        out.error = String(e);
    }

    return out;
}

function collectLifecycleSignals() {
    installLevel3LifecycleMonitors();
    const stats = window.__level3LifecycleStats || {};
    return {
        pagehideCount: stats.pagehideCount || 0,
        lastPagehideAt: stats.lastPagehideAt || null,
        asyncChallengeFinishedCount: stats.asyncChallengeFinishedCount || 0,
        lastAsyncChallengeFinishedAt: stats.lastAsyncChallengeFinishedAt || null
    };
}

async function getLevel3Signals() {
    const signals = {};

    try {
        const availableFonts = await getFontsFingerprint();
        signals.fontsCount = availableFonts.length;
    } catch (e) {
        signals.fontsError = e.toString();
    }

    try {
        signals.hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.enumerateDevices);
        signals.hasSpeechSynthesis = typeof speechSynthesis !== 'undefined';
        signals.intlTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        signals.dateTimeZoneOffset = new Date().getTimezoneOffset();
    } catch (e) {
        signals.envError = e.toString();
    }

    try {
        const webglData = await getWebGLFingerprint();
        signals.gpuVendor = webglData.vendorUnmasked || webglData.vendor || "unknown";
        signals.gpuRenderer = webglData.rendererUnmasked || webglData.renderer || "unknown";
    } catch (e) {
        signals.gpuVendor = "error";
        signals.gpuRenderer = "error";
    }

    try {
        const audioData = await getAudioFingerprint();
        signals.audioSample = audioData.sample || [];
        signals.audioJitterVar = audioData.jitterVariance || 0;
    } catch (e) {
        signals.audioError = e.toString();
    }

    try {
        const audioResult = await getRealtimeAudioFingerprint();
        signals.realtimeAudioSample = audioResult.sample;
        signals.realtimeAudioJitterVar = audioResult.jitterVar;
        signals.realtimeAudioError = audioResult.error; 
    } catch (e) {
        signals.realtimeAudioSample = null;
        signals.realtimeAudioJitterVar = null;
        signals.realtimeAudioError = e.toString();
    }


    signals.requestIdleCallbackSupported = typeof requestIdleCallback === 'function';
    signals.queueMicrotaskSupported = typeof queueMicrotask === 'function';
    const maxTouchPoints = safeRead(() => Number(navigator.maxTouchPoints || 0), 0);
    signals.touchEventSupported = ("ontouchstart" in window) || maxTouchPoints > 0;
    signals.pointerEventSupported = typeof PointerEvent !== 'undefined';

    signals.idleCallbackExecuted = false;
    if (signals.requestIdleCallbackSupported) {
        await new Promise(resolve => {
            requestIdleCallback(() => {
                signals.idleCallbackExecuted = true;
                resolve();
            }, { timeout: 100 });
        });
    }

    signals.hasReactDevTools = !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    signals.hasDevtools = !!window.devtools;

    signals.canvasGetContext = collectCanvasGetContextSignals();
    signals.deepApi = await collectDeepApiSignals();
    signals.navigatorPrototype = collectNavigatorPrototypeSignals();
    signals.lifecycle = collectLifecycleSignals();

    return signals;
}

window.getLevel3Signals = getLevel3Signals;
