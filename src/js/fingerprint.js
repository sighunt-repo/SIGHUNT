// fingerprint.js
async function getFingerprint(username = '') {
    try {
        // const domProbe = initDOMAnomalyProbe();
        const totalStart = performance.now();
        const timing = {};  

        let t1 = performance.now();
        const audioData = await getAudioFingerprint();
        timing.audio = performance.now() - t1;

        t1 = performance.now();
        const canvasData = getCanvasFingerprint();
        timing.canvas = performance.now() - t1;

        t1 = performance.now();
        const webglData = await getWebGLFingerprint();
        timing.webgl = performance.now() - t1;

        t1 = performance.now();
        const fontsData = await getFontsFingerprint();
        timing.fonts = performance.now() - t1;

        t1 = performance.now();
        const level1Signals = getLevelOneSignals();
        timing.level1 = performance.now() - t1;

        t1 = performance.now();
        const level2Signals = await getLevel2Signals();
        timing.level2 = performance.now() - t1;

        t1 = performance.now();
        const level3Signals = await getLevel3Signals();
        timing.level3 = performance.now() - t1;

        t1 = performance.now();
        const interactionData = getInteractionTrace();
        timing.interaction = performance.now() - t1;

        t1 = performance.now();
        const keyboardData = getKeyboardData();
        timing.keyboard = performance.now() - t1;

        const domData = getDomAnomaly();
        const honeypotData = window.getHoneypot ? window.getHoneypot() : null;
        const mutationData = getMutationStats();

        const totalEnd = performance.now();
        const duration = totalEnd - totalStart;
        timing.total = duration;

        return {
            audioData,
            canvasData,
            webglData,
            fontsData,
            level1Signals,
            level2Signals,
            level3Signals,
            interactionData,
            keyboardData,
            domData,
            honeypotData,
            mutationData,
            timing,
            duration
        };

    } catch (e) {
        console.error("Fingerprint error: ", e);
        return {}; 
    }
}

window.getFingerprint = getFingerprint;
