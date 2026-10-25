
const CONFIG = {
    WINDOW_MS: 3000,       
    MIN_PUSH_INTERVAL: 8,   
    MAX_QUEUE_SIZE: 1000    
};

let eventQueue = [];
let lastPushTs = 0;

function recordEvent(e) {
    const now = Date.now();
    
    let x = null;
    let y = null;
    
    if (e.type.startsWith('mouse') || e.type === 'click' || e.type === 'contextmenu') {
        x = e.clientX || 0;
        y = e.clientY || 0;
    } else if (e.type.startsWith('touch') && e.touches.length > 0) {
        x = e.touches[0].clientX || 0;
        y = e.touches[0].clientY || 0;
    }

    let targetTag = 'document';
    let targetId = null;
    if (e.target) {
        targetTag = e.target.tagName;
        targetId = e.target.id || null;
    }

    const eventData = {
        t: now,             
        e: e.type,          
        x: x,               
        y: y,               
        tag: targetTag,     
        id: targetId,       
        k: e.type.startsWith('key') ? e.code : undefined 
    };

    const isHighFreq = (e.type === 'mousemove' || e.type === 'scroll' || e.type === 'wheel');
    if (isHighFreq) {
        if (now - lastPushTs < CONFIG.MIN_PUSH_INTERVAL) {
            const last = eventQueue[eventQueue.length - 1];
            if (last && last.e === e.type) {
                last.x = x;
                last.y = y;
                last.t = now;
                cleanup(now);
                return; 
            }
        }
    }

    // 入队
    eventQueue.push(eventData);
    lastPushTs = now;
    
    // 清理过期数据
    cleanup(now);
}

// 清理函数：移除 3000ms 之前的数据
function cleanup(now = Date.now()) {
    const cutoff = now - CONFIG.WINDOW_MS;
    
    // 移除过期数据
    while (eventQueue.length && eventQueue[0].t < cutoff) {
        eventQueue.shift();
    }
    
    // 安全截断：防止极端情况下队列过大
    if (eventQueue.length > CONFIG.MAX_QUEUE_SIZE) {
        eventQueue.splice(0, eventQueue.length - CONFIG.MAX_QUEUE_SIZE);
    }
}

/**
 * 注册监听器
 * 论文附录 Table 4 列出了 40+ 种事件。这里选取最具鉴别力的核心事件。
 * [cite: 579, 580]
 */
function initWebGuard() {
    const options = { passive: true, capture: true };

    // 鼠标类 (用于捕捉轨迹和点击意图)
    document.addEventListener('mousemove', recordEvent, options);
    document.addEventListener('mousedown', recordEvent, options);
    document.addEventListener('mouseup', recordEvent, options);
    document.addEventListener('click', recordEvent, options);
    document.addEventListener('wheel', recordEvent, options);

    // 键盘类 (LLM Agent 填写表单时会有极快或极规律的输入)
    document.addEventListener('keydown', recordEvent, options);
    document.addEventListener('keyup', recordEvent, options);

    // 页面交互类 (Agent 可能会触发 focus/blur 但没有鼠标移动)
    window.addEventListener('scroll', recordEvent, options);
    window.addEventListener('focus', recordEvent, options);
    window.addEventListener('blur', recordEvent, options);
    
    // 移动端支持 (防止 Agent 伪装成移动设备)
    document.addEventListener('touchstart', recordEvent, options);
    document.addEventListener('touchend', recordEvent, options);
}

// 导出数据接口
function getInteractionTrace() {
    const now = Date.now();
    cleanup(now);
    
    // 返回深拷贝，防止外部修改
    return {
        trace: JSON.parse(JSON.stringify(eventQueue)),
        meta: {
            timestamp: now,
            windowMs: CONFIG.WINDOW_MS,
            eventCount: eventQueue.length
        }
    };
}

// 初始化
initWebGuard();

// 暴露给全局调用
window.WebGuard = {
    getTrace: getInteractionTrace
};