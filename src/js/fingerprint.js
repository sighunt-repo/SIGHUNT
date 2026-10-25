// fingerprint.js
async function getFingerprint(username = '') {
    try {
        // const domProbe = initDOMAnomalyProbe();
        const totalStart = performance.now();
        const timing = {};  // 用于记录每个 signal 的耗时（ms）

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

        // --- 总耗时 ---
        const totalEnd = performance.now();
        const duration = totalEnd - totalStart;
        timing.total = duration;

        // ✔ 最终返回完整 fingerprint（不上传）
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
        return {}; // 返回空对象，不是 'unknown'
    }
}

window.getFingerprint = getFingerprint;
