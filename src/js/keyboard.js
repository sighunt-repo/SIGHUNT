const keystrokes = [];
let lastKeyTime = null;

const MAX_KEYS = 500;

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
}, { passive: true }); 

function getKeyboardData() {
    return {
        strokes: keystrokes.slice(),  
        total: keystrokes.length,
        timestamp: Date.now()
    };
}

window.getKeyboardData = getKeyboardData;
