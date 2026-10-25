

(function () {
    const CONFIG = {
        maxDepth: 10,
    };

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

    function extractNodeFeatures(node, depth) {
        if (depth > CONFIG.maxDepth) return null;

        if (node.nodeType !== Node.ELEMENT_NODE) {
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

        Array.from(node.childNodes).forEach(child => {
            const childData = extractNodeFeatures(child, depth + 1);
            if (childData) {
                nodeData.children.push(childData);
            }
        });

        return nodeData;
    }

    function collectHoneypotStatus() {
        const hiddenLinks = document.querySelectorAll('a[style*="display: none"], a[style*="visibility: hidden"], div[hidden] a');
        return Array.from(hiddenLinks).map(link => ({
            href: link.href,
            text: link.innerText,
            detected: true
        }));
    }

    function getDOMFingerprint() {
        try {
            return {
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                },
                domTree: extractNodeFeatures(document.body, 0),
                honeypots: collectHoneypotStatus()
            };
        } catch (e) {
            console.error("DOM Fingerprint collection failed:", e);
            return null;
        }
    }
    window.getDOMFingerprint = getDOMFingerprint;
})();
