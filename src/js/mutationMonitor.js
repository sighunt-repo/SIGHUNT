// mutationMonitor.js
(function () {
  const MAX_RECORDS = 500;

  const stats = {
    totalMutations: 0,          // 总属性变更次数
    uniqueNodes: 0,             // 被改过的节点数
    mutationRecords: [],        // 原始记录
    startTs: performance.now()
  };

  const accessedNodes = new Set();

  function isIgnoredNode(node) {
    return node && node.closest && node.closest('[data-dom-ignore]');
  }

  const observer = new MutationObserver((mutations) => {
    const now = performance.now();

    mutations.forEach(mutation => {
      if (mutation.type !== 'attributes') return;
      if (isIgnoredNode(mutation.target)) return;

      accessedNodes.add(mutation.target);
      stats.totalMutations++;

      stats.mutationRecords.push({
        ts: now,
        tag: mutation.target.tagName,
        attr: mutation.attributeName,
        oldValue: mutation.oldValue
      });

      // 内存保护
      if (stats.mutationRecords.length > MAX_RECORDS) {
        stats.mutationRecords.shift();
      }
    });

    stats.uniqueNodes = accessedNodes.size;
  });

  observer.observe(document.documentElement, {
    attributes: true,
    subtree: true,
    attributeOldValue: true,
    attributeFilter: ['class', 'id', 'style']
  });

  // ---- 对外只暴露 getter ----
  window.getMutationStats = function () {
    return {
      totalMutations: stats.totalMutations,
      uniqueNodes: stats.uniqueNodes,
      recordCount: stats.mutationRecords.length,
      records: stats.mutationRecords,
      lifetimeMs: performance.now() - stats.startTs
    };
  };
})();
