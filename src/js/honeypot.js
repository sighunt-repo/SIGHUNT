// honeypot.js
(function () {
    const CONFIG = {
        CONTAINER_ID: 'layout-helper-wrapper-' + Math.random().toString(36).slice(2, 7),
        // 假按钮的诱导性 ID，看起来比真的还真
        FAKE_BTN_ID: 'loginbutton', 
        INPUT_NAME: 'website_url_honeypot'
    };

    const report = {
        trapRendered: false,
        triggered: false,
        triggers: [],
        renderedAt: null
    };

    function markTriggered(type, detail) {
        console.log(`[Honeypot Triggered] Type: ${type}`, detail); // 本地调试用，生产环境可注释
        report.triggered = true;
        report.triggers.push({
            type,
            detail,
            ts: performance.now()
        });
    }

    // 1. 创建原本的隐藏链接和输入框陷阱 (针对传统爬虫)
    function createGeneralTrap() {
        const container = document.createElement('div');
        container.id = CONFIG.CONTAINER_ID;

        Object.assign(container.style, {
            position: 'absolute',
            left: '-9999px',
            top: '-9999px',
            width: '1px',
            height: '1px',
            overflow: 'hidden',
            opacity: '0.01',
            pointerEvents: 'none',
            zIndex: '-1'
        });

        // --- trap link ---
        const trapLink = document.createElement('a');
        trapLink.href = 'javascript:void(0);';
        trapLink.textContent = 'Verify Session';
        trapLink.tabIndex = -1;
        trapLink.addEventListener('click', e => {
            e.preventDefault();
            markTriggered('trap_click_link', { id: 'hidden-link' });
        });

        // --- trap input ---
        const trapInput = document.createElement('input');
        trapInput.type = 'text';
        trapInput.name = CONFIG.INPUT_NAME;
        trapInput.autocomplete = 'off';
        trapInput.tabIndex = -1;
        trapInput.addEventListener('focus', () => {
            markTriggered('trap_focus_input', { name: CONFIG.INPUT_NAME });
        });
        trapInput.addEventListener('input', e => {
            markTriggered('trap_fill_input', { valueLength: e.target.value.length });
        });

        container.appendChild(trapLink);
        container.appendChild(trapInput);
        document.body.appendChild(container);
    }

    // 2. 创建假登录按钮 (针对 LLM Bot / UI 自动化脚本)
    function createFakeButton() {
        // 寻找真实的登录按钮 (通过 class 或 id)
        // 注意：这里假设页面上有一个 class 为 'submit-btn' 或 id 为 'loginButton' 的真实按钮
        const realButton = document.querySelector('.submit-btn') || document.getElementById('loginButton');

        if (!realButton) return; // 如果找不到真按钮，就不放陷阱了，免得破坏布局

        const fakeBtn = document.createElement('button');
        fakeBtn.id = CONFIG.FAKE_BTN_ID; 
        fakeBtn.innerText = 'Login'; // 诱导性文本
        fakeBtn.type = 'button';     // 防止意外提交表单
        
        // 样式：看起来存在，但实际上不可见，且不占布局空间
        Object.assign(fakeBtn.style, {
            position: 'absolute', // 绝对定位，脱离文档流
            opacity: '0.01',      // 几乎透明，但不是 display:none
            height: '1px',
            width: '1px',
            overflow: 'hidden',
            border: 'none',
            padding: '0',
            zIndex: '1',          // 确保能被点到（虽然很小）
            pointerEvents: 'auto' // 允许点击
        });

        // 监听点击事件
        fakeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation(); // 阻止事件冒泡，防止触发外层 form 提交
            markTriggered('trap_click_fake_button', { 
                id: CONFIG.FAKE_BTN_ID,
                msg: 'Bot clicked the decoy login button' 
            });
            console.log("Authenticating..."); 
        });

        // 将假按钮插入到真按钮的前面 (DOM 顺序优先)
        // 很多 Bot 会简单的查找 "Button with text Login"，往往返回第一个找到的
        realButton.parentNode.insertBefore(fakeBtn, realButton);
    }

    function init() {
        createGeneralTrap();
        createFakeButton();
        report.trapRendered = true;
        report.renderedAt = performance.now();
    }

    // 确保 DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // --- 对外只暴露 getter ---
    Object.defineProperty(window, '__honeypotStats__', {
        get() {
            return {
                trapRendered: report.trapRendered,
                triggered: report.triggered,
                triggerCount: report.triggers.length,
                triggers: report.triggers
            };
        }
    });
})();

// 对外暴露获取方法
window.getHoneypot = function() {
    return window.__honeypotStats__ || null;
};