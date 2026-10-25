// Level 2: Inconsistency Detection (cross-check rules)
// Input: Level 1 raw attributes
// Output: grouped inconsistency findings + summary score

async function getLevel2Signals(options = {}) {
    const level1 = options.level1Signals || (window.getLevelOneSignals ? window.getLevelOneSignals() : {});
    const ipInfoUrl = options.ipInfoUrl || null;

    const context = buildContext(level1);
    const findings = {
        screen: [],
        device: [],
        browser: [],
        location: []
    };

    runScreenChecks(context, findings.screen);
    runDeviceChecks(context, findings.device);
    runBrowserChecks(context, findings.browser);
    await runLocationChecks(context, findings.location, ipInfoUrl);

    const all = [
        ...findings.screen,
        ...findings.device,
        ...findings.browser,
        ...findings.location
    ];
    const inconsistent = all.filter((f) => f.inconsistent === true);
    const unavailable = all.filter((f) => f.inconsistent === null);

    return {
        context,
        findings,
        summary: {
            totalChecks: all.length,
            inconsistentCount: inconsistent.length,
            unavailableCount: unavailable.length,
            inconsistencyScore: all.length > 0 ? Number((inconsistent.length / all.length).toFixed(4)) : 0
        }
    };
}

function buildContext(level1) {
    const ua = level1.userAgent || navigator.userAgent || "";
    const parsed = parseUserAgent(ua);

    return {
        raw: level1,
        ua,
        uaParsed: parsed,
        browserVendor: level1.vendor || navigator.vendor || "",
        platform: level1.platform || navigator.platform || "",
        oscpu: level1.oscpu || null,
        language: level1.language || navigator.language || "",
        languages: level1.languages || navigator.languages || [],
        screen: {
            width: safeRead(() => screen.width, null),
            height: safeRead(() => screen.height, null),
            windowInnerWidth: safeRead(() => window.innerWidth, null),
            windowInnerHeight: safeRead(() => window.innerHeight, null),
            colorDepth: level1.screenColorDepth != null ? level1.screenColorDepth : safeRead(() => screen.colorDepth, null),
            colorGamut: detectColorGamut(),
            screenVsWindowMismatch:
                safeRead(() => screen.width, null) !== safeRead(() => window.innerWidth, null) ||
                safeRead(() => screen.height, null) !== safeRead(() => window.innerHeight, null)
        },
        touch: {
            maxTouchPoints: level1.maxTouchPoints != null ? level1.maxTouchPoints : safeRead(() => navigator.maxTouchPoints, 0),
            touchEventSupported:
                ("ontouchstart" in window) ||
                (level1.maxTouchPoints != null
                    ? Number(level1.maxTouchPoints) > 0
                    : safeRead(() => Number(navigator.maxTouchPoints || 0) > 0, false))
        },
        hardware: {
            deviceMemory: safeRead(() => navigator.deviceMemory, null),
            hardwareConcurrency: level1.hardwareConcurrency != null ? level1.hardwareConcurrency : safeRead(() => navigator.hardwareConcurrency, null)
        },
        timezone: safeRead(() => Intl.DateTimeFormat().resolvedOptions().timeZone, null)
    };
}

function runScreenChecks(ctx, out) {
    const d = ctx.uaParsed.device;
    const w = ctx.screen.width;
    const h = ctx.screen.height;
    const ww = ctx.screen.windowInnerWidth;
    const wh = ctx.screen.windowInnerHeight;
    const maxDim = Math.max(w || 0, h || 0);

    // UA Device vs Screen Resolution
    if (w == null || h == null) {
        out.push(unavailable("ua_device_vs_screen_resolution", "screen size unavailable"));
    } else {
        let inconsistent = false;
        let reason = "looks_plausible";

        if (d === "iphone" && (maxDim < 500 || maxDim > 1200)) {
            inconsistent = true;
            reason = "iPhone CSS resolution out of expected range";
        } else if (d === "ipad" && (maxDim < 700 || maxDim > 1600)) {
            inconsistent = true;
            reason = "iPad CSS resolution out of expected range";
        } else if (d === "android_phone" && maxDim > 1400) {
            inconsistent = true;
            reason = "Android phone reports unusually large CSS resolution";
        }

        out.push(result("ua_device_vs_screen_resolution", inconsistent, {
            uaDevice: d,
            screenWidth: w,
            screenHeight: h,
            reason
        }));
    }

    // Screen size vs Window inner size
    if (w == null || h == null || ww == null || wh == null) {
        out.push(unavailable("screen_vs_window_mismatch", "screen/window size unavailable"));
    } else {
        const mismatch = !!ctx.screen.screenVsWindowMismatch;
        out.push(result("screen_vs_window_mismatch", !mismatch, {
            screenWidth: w,
            screenHeight: h,
            windowInnerWidth: ww,
            windowInnerHeight: wh,
            screenVsWindowMismatch: mismatch,
            reason: mismatch ? "looks_plausible" : "screen and window are identical"
        }));
    }

    // UA Device vs Touch Support / Max Touch Points
    const isMobileFamily = ["iphone", "ipad", "android_phone", "android_tablet"].includes(d);
    if (isMobileFamily) {
        const mtp = ctx.touch.maxTouchPoints;
        const noTouch = !ctx.touch.touchEventSupported && (!mtp || mtp <= 0);
        out.push(result("ua_device_vs_touch_support", noTouch, {
            uaDevice: d,
            touchEventSupported: ctx.touch.touchEventSupported,
            maxTouchPoints: mtp,
            reason: noTouch ? "mobile ua without touch capability" : "looks_plausible"
        }));

        let mtpInconsistent = false;
        let mtpReason = "looks_plausible";
        if (mtp <= 0) {
            mtpInconsistent = true;
            mtpReason = "maxTouchPoints is 0 for mobile UA";
        } else if ((d === "iphone" || d === "ipad") && (mtp === 1 || mtp === 7 || mtp > 12)) {
            mtpInconsistent = true;
            mtpReason = "unlikely maxTouchPoints for Apple mobile device";
        }
        out.push(result("ua_device_vs_max_touch_points", mtpInconsistent, {
            uaDevice: d,
            maxTouchPoints: mtp,
            reason: mtpReason
        }));
    } else {
        out.push(result("ua_device_vs_touch_support", false, { uaDevice: d, reason: "not_mobile_ua" }));
        out.push(result("ua_device_vs_max_touch_points", false, { uaDevice: d, reason: "not_mobile_ua" }));
    }

    // UA Device vs Color Depth / Color Gamut
    const colorDepth = ctx.screen.colorDepth;
    if (colorDepth == null) {
        out.push(unavailable("ua_device_vs_color_depth", "colorDepth unavailable"));
    } else {
        const colorDepthInconsistent = isMobileFamily && colorDepth < 24;
        out.push(result("ua_device_vs_color_depth", colorDepthInconsistent, {
            uaDevice: d,
            colorDepth,
            reason: colorDepthInconsistent ? "mobile ua with unusually low color depth" : "looks_plausible"
        }));
    }

    const gamut = ctx.screen.colorGamut;
    if (gamut === "unknown") {
        out.push(unavailable("ua_device_vs_color_gamut", "color-gamut media query unsupported"));
    } else {
        const gamutInconsistent = (d === "iphone" || d === "ipad") && gamut === "srgb";
        out.push(result("ua_device_vs_color_gamut", gamutInconsistent, {
            uaDevice: d,
            colorGamut: gamut,
            reason: gamutInconsistent ? "apple mobile ua but only sRGB gamut reported" : "looks_plausible"
        }));
    }
}

function runDeviceChecks(ctx, out) {
    const d = ctx.uaParsed.device;
    const mem = ctx.hardware.deviceMemory;
    const cores = ctx.hardware.hardwareConcurrency;
    const isMobileFamily = ["iphone", "ipad", "android_phone", "android_tablet"].includes(d);

    // UA Device vs Device Memory
    if (mem == null) {
        out.push(unavailable("ua_device_vs_device_memory", "navigator.deviceMemory unavailable"));
    } else {
        const memInconsistent = isMobileFamily && (mem > 12 || mem <= 0);
        out.push(result("ua_device_vs_device_memory", memInconsistent, {
            uaDevice: d,
            deviceMemory: mem,
            reason: memInconsistent ? "mobile ua reports implausible memory" : "looks_plausible"
        }));
    }

    // UA Device vs Hardware Concurrency
    if (cores == null) {
        out.push(unavailable("ua_device_vs_hardware_concurrency", "hardwareConcurrency unavailable"));
    } else {
        let coreInconsistent = false;
        let reason = "looks_plausible";
        if (d === "iphone" && cores > 12) {
            coreInconsistent = true;
            reason = "iPhone UA reports too many cores";
        } else if (d === "iphone" && cores <= 1) {
            coreInconsistent = true;
            reason = "iPhone UA reports too few cores";
        } else if (isMobileFamily && cores > 16) {
            coreInconsistent = true;
            reason = "mobile UA reports unusually high cores";
        }
        out.push(result("ua_device_vs_hardware_concurrency", coreInconsistent, {
            uaDevice: d,
            hardwareConcurrency: cores,
            reason
        }));
    }
}

function runBrowserChecks(ctx, out) {
    const browser = ctx.uaParsed.browser;
    const os = ctx.uaParsed.os;
    const vendor = (ctx.browserVendor || "").toLowerCase();
    const platform = (ctx.platform || "").toLowerCase();

    // UA Browser vs UA OS
    let browserOsInconsistent = false;
    let browserOsReason = "looks_plausible";
    if (browser === "safari" && !["ios", "macos"].includes(os)) {
        browserOsInconsistent = true;
        browserOsReason = "Safari UA on non-Apple OS";
    }
    out.push(result("ua_browser_vs_ua_os", browserOsInconsistent, {
        browser,
        os,
        reason: browserOsReason
    }));

    // UA Browser / Platform vs Vendor
    let uaBrowserVendorInconsistent = false;
    let uaBrowserVendorReason = "looks_plausible";
    if (browser === "safari" && vendor.indexOf("apple") === -1) {
        uaBrowserVendorInconsistent = true;
        uaBrowserVendorReason = "Safari UA but non-Apple navigator.vendor";
    } else if (["chrome", "edge"].includes(browser) && vendor.indexOf("google") === -1) {
        uaBrowserVendorInconsistent = true;
        uaBrowserVendorReason = "Chromium-like UA but non-Google vendor";
    }
    out.push(result("ua_browser_platform_vs_vendor", uaBrowserVendorInconsistent, {
        browser,
        platform: ctx.platform,
        vendor: ctx.browserVendor,
        reason: uaBrowserVendorReason
    }));

    // Platform vs UA OS
    let platformOsInconsistent = false;
    let platformOsReason = "looks_plausible";
    if (os === "windows" && platform.indexOf("win") === -1) {
        platformOsInconsistent = true;
        platformOsReason = "UA says Windows but platform is not Win*";
    } else if ((os === "macos" || os === "ios") && (platform.indexOf("win") !== -1 || platform.indexOf("linux") !== -1 || platform.indexOf("android") !== -1)) {
        platformOsInconsistent = true;
        platformOsReason = "UA says Apple OS but platform points to non-Apple OS";
    } else if (os === "android" && platform.indexOf("linux") === -1 && platform.indexOf("android") === -1) {
        platformOsInconsistent = true;
        platformOsReason = "UA says Android but platform is not Linux/Android-like";
    }
    out.push(result("platform_vs_ua_os", platformOsInconsistent, {
        platform: ctx.platform,
        os,
        reason: platformOsReason
    }));
}

async function runLocationChecks(ctx, out, ipInfoUrl) {
    // IP Location vs Time Zone
    if (!ipInfoUrl) {
        out.push(unavailable("ip_location_vs_timezone", "ipInfoUrl not provided"));
        return;
    }

    try {
        const res = await fetch(ipInfoUrl, { method: "GET", credentials: "omit", cache: "no-store" });
        const info = await res.json();
        const ipCountry = (info.country || info.country_code || "").toUpperCase();
        const ipTimezone = info.timezone || null;
        const browserTimezone = ctx.timezone;

        let inconsistent = null;
        let reason = "insufficient_data";
        if (ipTimezone && browserTimezone) {
            inconsistent = !isSameTimezoneFamily(ipTimezone, browserTimezone);
            reason = inconsistent ? "browser timezone mismatches ip timezone family" : "looks_plausible";
        } else if (ipCountry && browserTimezone) {
            inconsistent = !isTimezoneLikelyForCountry(ipCountry, browserTimezone);
            reason = inconsistent ? "browser timezone unlikely for ip country" : "looks_plausible";
        }

        out.push(result("ip_location_vs_timezone", inconsistent, {
            ipCountry,
            ipTimezone,
            browserTimezone,
            reason
        }));
    } catch (e) {
        out.push(unavailable("ip_location_vs_timezone", `ip lookup failed: ${String(e)}`));
    }
}

function parseUserAgent(ua) {
    const u = (ua || "").toLowerCase();
    let device = "desktop";
    if (u.includes("iphone")) device = "iphone";
    else if (u.includes("ipad")) device = "ipad";
    else if (u.includes("android") && u.includes("mobile")) device = "android_phone";
    else if (u.includes("android")) device = "android_tablet";

    let os = "unknown";
    if (u.includes("windows nt")) os = "windows";
    else if (u.includes("android")) os = "android";
    else if (u.includes("iphone") || u.includes("ipad") || u.includes("cpu iphone os") || u.includes("cpu os")) os = "ios";
    else if (u.includes("mac os x")) os = "macos";
    else if (u.includes("linux")) os = "linux";

    let browser = "unknown";
    if (u.includes("edg/")) browser = "edge";
    else if (u.includes("firefox/")) browser = "firefox";
    else if (u.includes("safari/") && u.includes("version/") && !u.includes("chrome/")) browser = "safari";
    else if (u.includes("chrome/")) browser = "chrome";

    return { device, os, browser };
}

function detectColorGamut() {
    try {
        if (window.matchMedia && window.matchMedia("(color-gamut: rec2020)").matches) return "rec2020";
        if (window.matchMedia && window.matchMedia("(color-gamut: p3)").matches) return "p3";
        if (window.matchMedia && window.matchMedia("(color-gamut: srgb)").matches) return "srgb";
        return "unknown";
    } catch (e) {
        return "unknown";
    }
}

function isSameTimezoneFamily(a, b) {
    const aa = String(a || "").split("/")[0];
    const bb = String(b || "").split("/")[0];
    return aa && bb && aa === bb;
}

function isTimezoneLikelyForCountry(countryCode, timezone) {
    const tz = String(timezone || "");
    const map = {
        US: ["America/"],
        CA: ["America/"],
        FR: ["Europe/Paris", "Europe/"],
        DE: ["Europe/Berlin", "Europe/"],
        GB: ["Europe/London", "Europe/"],
        CN: ["Asia/Shanghai", "Asia/Urumqi", "Asia/"],
        JP: ["Asia/Tokyo", "Asia/"],
        KR: ["Asia/Seoul", "Asia/"],
        IN: ["Asia/Kolkata", "Asia/"],
        AU: ["Australia/", "Antarctica/"],
        BR: ["America/"],
        RU: ["Europe/", "Asia/"],
        SG: ["Asia/Singapore", "Asia/"],
        HK: ["Asia/Hong_Kong", "Asia/"]
    };
    const prefixes = map[countryCode];
    if (!prefixes || prefixes.length === 0) return true; // Unknown mapping: do not hard-fail
    return prefixes.some((p) => tz.indexOf(p) === 0);
}

function safeRead(fn, fallback) {
    try {
        const v = fn();
        return v === undefined ? fallback : v;
    } catch (e) {
        return fallback;
    }
}

function result(ruleId, inconsistent, evidence) {
    return {
        ruleId,
        inconsistent,
        evidence
    };
}

function unavailable(ruleId, reason) {
    return {
        ruleId,
        inconsistent: null,
        evidence: { reason }
    };
}

window.getLevel2Signals = getLevel2Signals;
