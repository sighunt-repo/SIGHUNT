
/**
 * DOM 收集器 - 用于区分 LLM Bot 与 传统 Bot
 * 功能：生成当前页面的视觉/语义树快照
 */

(function () {
    const CONFIG = {
        maxDepth: 10,
    };

    /**
   * 判断元素是否在视觉上可见
   */
    function isVisible(elem) {
        if (!elem) return false;
        const style = window.getComputedStyle(elem);
        const rect = elem.getBoundingClientRect();

        return (
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0' &&
            rect.width > 0 &&
            rect.height > 0
        );
    }

    /**
 * 提取对于 LLM 决策至关重要的特征
 */
    function extractNodeFeatures(node, depth) {
        if (depth > CONFIG.maxDepth) return null;

        // 只关注元素节点
        if (node.nodeType !== Node.ELEMENT_NODE) {
            // 如果是文本节点，且不为空，返回文本内容
            if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0) {
                return { type: 'text', content: node.textContent.trim().substring(0, 50) };
            }
            return null;
        }

        const rect = node.getBoundingClientRect();
        const visible = isVisible(node);
        const isInteractive = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'].includes(node.tagName) || node.onclick;

        const nodeData = {
            tag: node.tagName.toLowerCase(),
            id: node.id || null,
            ariaLabel: node.getAttribute('aria-label') || null,
            rect: {
                x: Math.round(rect.x),
                y: Math.round(rect.y),
                w: Math.round(rect.width),
                h: Math.round(rect.height)
            },
            visible: visible,
            interactive: !!isInteractive,
            text: node.innerText ? node.innerText.substring(0, 50).replace(/\n/g, ' ') : null,
            children: []
        };

        // 递归收集子节点
        Array.from(node.childNodes).forEach(child => {
            const childData = extractNodeFeatures(child, depth + 1);
            if (childData) {
                nodeData.children.push(childData);
            }
        });

        return nodeData;
    }
    /**
     * 生成蜜罐 (Honeypot) 检测数据
     */
    function collectHoneypotStatus() {
        const hiddenLinks = document.querySelectorAll('a[style*="display: none"], a[style*="visibility: hidden"], div[hidden] a');
        return Array.from(hiddenLinks).map(link => ({
            href: link.href,
            text: link.innerText,
            detected: true
        }));
    }

    /**
     * 导出主函数：获取 DOM 指纹数据
     * 注意：这里不再发送请求，而是返回对象
     */
    function getDOMFingerprint() {
        try {
            return {
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                },
                // DOM 树快照 (从 body 开始)
                domTree: extractNodeFeatures(document.body, 0),
                // 页面上的蜜罐元素列表
                honeypots: collectHoneypotStatus()
            };
        } catch (e) {
            console.error("DOM Fingerprint collection failed:", e);
            return null;
        }
    }
    window.getDOMFingerprint = getDOMFingerprint;
})();
