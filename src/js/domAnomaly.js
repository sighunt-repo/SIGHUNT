(function () {
  const MAX_HISTORY_LENGTH = 1000;
  const ANALYSIS_WINDOW_MS = 60000;

  const stats = {
    qs: 0,
    qsAll: 0,           // 👈 新增
    layoutReads: 0,
    timestamps: [],
    ops: [],            // 1=qs, 2=layout, 3=qsAll

    domAfterHumanCount: 0,
    domDuringKeyCount: 0,
    preClickDomCount: 0
  };

  // --- 人类事件状态 ---
  let lastHumanEventTs = performance.now();
  let keydownActive = false;
  let lastClickTs = null;

  // --- 事件监听 ---
  ['mousemove', 'mousedown', 'keydown', 'keyup', 'scroll', 'touchstart'].forEach(e => {
    addEventListener(e, evt => {
      lastHumanEventTs = performance.now();
      if (evt.type === 'keydown') keydownActive = true;
      if (evt.type === 'keyup') keydownActive = false;
    }, { passive: true });
  });

  addEventListener('click', () => {
    lastClickTs = performance.now();
  }, { passive: true });

  function record(type, node) {
    //可能要加ignore

    const now = performance.now();
    stats[type]++;

    stats.timestamps.push(now);
    stats.ops.push(
      type === 'qs' ? 1 :
        type === 'layoutReads' ? 2 :
          3 // qsAll
    );

    // 行为耦合指标（你原来的逻辑）
    if (now - lastHumanEventTs <= 80) stats.domAfterHumanCount++;
    if (keydownActive) stats.domDuringKeyCount++;
    if (lastClickTs && now - lastClickTs <= 120) stats.preClickDomCount++;

    if (stats.timestamps.length > MAX_HISTORY_LENGTH) {
      stats.timestamps.shift();
      stats.ops.shift();
    }
  }


  // --- Hook DOM API ---
  const qs = Element.prototype.querySelector;
  const qsAll = Element.prototype.querySelectorAll;
  const gbr = Element.prototype.getBoundingClientRect;

  Element.prototype.querySelector = function (sel) {
    record('qs', this);
    return qs.call(this, sel);
  };

  Element.prototype.querySelectorAll = function (sel) {
    record('qsAll', this);
    return qsAll.call(this, sel);
  };

  Element.prototype.getBoundingClientRect = function () {
    record('layoutReads', this);
    return gbr.call(this);
  };


  // --- 对外暴露 ---
  window.__domStats__ = stats;
  window.__domConfig__ = {
    ANALYSIS_WINDOW_MS
  };
})();


function analyzeBehavior() {
  const dom = window.__domStats__;
  const cfg = window.__domConfig__;
  if (!dom || !cfg) return null;

  const now = performance.now();
  const windowMs = cfg.ANALYSIS_WINDOW_MS;

  // 过滤最近 windowMs
  let startIndex = 0;
  for (let i = dom.timestamps.length - 1; i >= 0; i--) {
    if (now - dom.timestamps[i] > windowMs) {
      startIndex = i + 1;
      break;
    }
  }

  const recentTimestamps = dom.timestamps.slice(startIndex);
  const recentOps = dom.ops.slice(startIndex);

  let burstCount = 0;
  let layoutCount = 0;
  let minInterval = Infinity;

  for (let i = 1; i < recentTimestamps.length; i++) {
    const delta = recentTimestamps[i] - recentTimestamps[i - 1];
    if (delta < 4) burstCount++;
    if (delta < minInterval) minInterval = delta;
    if (recentOps[i] === 2) layoutCount++;
  }

  const qsCount = recentOps.filter(op => op === 1).length;
  const hookLayoutCount = recentOps.filter(op => op === 2).length;
  const qsAllCount = recentOps.filter(op => op === 3).length;

  return {
    windowMs,
    dom: {
      totalAccess: recentTimestamps.length,
      qsCount: qsCount,
      hookLayoutCount: hookLayoutCount,
      qsAllCount: qsAllCount,
      layoutCount,
      burstCount,
      minInterval: isFinite(minInterval) ? minInterval : null,
      domAfterHumanCount: dom.domAfterHumanCount,
      domDuringKeyCount: dom.domDuringKeyCount,
      preClickDomCount: dom.preClickDomCount
    }
  };
}

window.getDomAnomaly = analyzeBehavior;
