// 保存按键记录
const keystrokes = [];
let lastKeyTime = null;

// 最大保留按键数量（避免日志无限增长，可根据需求调大或设为 null）
const MAX_KEYS = 500;

// 键盘监听
document.addEventListener('keydown', (e) => {
    const now = Date.now();
    const interval = lastKeyTime ? now - lastKeyTime : 0;
    lastKeyTime = now;

    keystrokes.push({
        key: e.key,        
        code: e.code,     
        timestamp: now,
        interval: interval
    });


    if (MAX_KEYS && keystrokes.length > MAX_KEYS) {
        keystrokes.shift();
    }
}, { passive: true }); // 不阻止默认事件


function getKeyboardData() {
    return {
        strokes: keystrokes.slice(),  
        total: keystrokes.length,
        timestamp: Date.now()
    };
}

window.getKeyboardData = getKeyboardData;
