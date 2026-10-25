// honeypot.js
(function () {
    const CONFIG = {
        CONTAINER_ID: 'layout-helper-wrapper-' + Math.random().toString(36).slice(2, 7),
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

        const trapLink = document.createElement('a');
        trapLink.href = 'javascript:void(0);';
        trapLink.textContent = 'Verify Session';
        trapLink.tabIndex = -1;
        trapLink.addEventListener('click', e => {
            e.preventDefault();
            markTriggered('trap_click_link', { id: 'hidden-link' });
        });

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

    function createFakeButton() {
        const realButton = document.querySelector('.submit-btn') || document.getElementById('loginButton');

        if (!realButton) return; 

        const fakeBtn = document.createElement('button');
        fakeBtn.id = CONFIG.FAKE_BTN_ID; 
        fakeBtn.innerText = 'Login'; 
        fakeBtn.type = 'button';     
        
        Object.assign(fakeBtn.style, {
            position: 'absolute', 
            opacity: '0.01',      
            height: '1px',
            width: '1px',
            overflow: 'hidden',
            border: 'none',
            padding: '0',
            zIndex: '1',          
            pointerEvents: 'auto' 
        });

        fakeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation(); 
            markTriggered('trap_click_fake_button', { 
                id: CONFIG.FAKE_BTN_ID,
                msg: 'Bot clicked the decoy login button' 
            });
            console.log("Authenticating..."); 
        });

        realButton.parentNode.insertBefore(fakeBtn, realButton);
    }

    function init() {
        createGeneralTrap();
        createFakeButton();
        report.trapRendered = true;
        report.renderedAt = performance.now();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

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

window.getHoneypot = function() {
    return window.__honeypotStats__ || null;
};