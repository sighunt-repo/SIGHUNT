/**
 * WebGuard Lite: Spatio-Temporal Interaction Collector
 * 基于论文 "The Ghost in the Browser" 的轻量级实现
 * * 改进点：
 * 1. 扩展了事件监听 (Mouse, Keyboard, Scroll, Interaction) [cite: 181]
 * 2. 增加了空间(x,y)与DOM元素(target)的关联记录 
 * 3. 统一了时序队列，便于后续分析 "Think-Action" 周期 [cite: 249]
 */

const CONFIG = {
    WINDOW_MS: 3000,        // 你要求的 3000ms 窗口
    MIN_PUSH_INTERVAL: 8,   // 针对高频事件(mousemove/scroll)的节流间隔
    MAX_QUEUE_SIZE: 1000    // 防止内存溢出的安全上限
};

// 统一的事件队列，存储所有类型的交互
let eventQueue = [];
let lastPushTs = 0;

/**
 * 核心记录函数：标准化数据格式
 * 论文中强调记录：Timestamp, Event Type, Position, Element [cite: 154]
 */
function recordEvent(e) {
    const now = Date.now();
    
    // 1. 提取空间坐标 (Spatial Data)
    // 并不是所有事件都有坐标，键盘事件通常为 null，但在分析时这本身就是特征
    let x = null;
    let y = null;
    
    if (e.type.startsWith('mouse') || e.type === 'click' || e.type === 'contextmenu') {
        x = e.clientX || 0;
        y = e.clientY || 0;
    } else if (e.type.startsWith('touch') && e.touches.length > 0) {
        x = e.touches[0].clientX || 0;
        y = e.touches[0].clientY || 0;
    }

    // 2. 提取目标元素信息 (Contextual Data)
    // 论文提到记录 DOM Object IDs 
    let targetTag = 'document';
    let targetId = null;
    if (e.target) {
        targetTag = e.target.tagName;
        targetId = e.target.id || null;
    }

    // 3. 构造数据包
    const eventData = {
        t: now,             // Temporal: 时间戳
        e: e.type,          // Type: 事件类型
        x: x,               // Spatial: X坐标
        y: y,               // Spatial: Y坐标
        tag: targetTag,     // Context: 标签名
        id: targetId,       // Context: 元素ID (如果有)
        // 对于键盘事件，可以选记录 key (慎用，涉及隐私，论文中主要用作频率分析)
        k: e.type.startsWith('key') ? e.code : undefined 
    };

    // 4. 节流处理 (针对 mousemove 和 scroll)
    // 如果是高频事件，且距离上次记录时间太短，则跳过（除非是不同的事件类型）
    const isHighFreq = (e.type === 'mousemove' || e.type === 'scroll' || e.type === 'wheel');
    if (isHighFreq) {
        if (now - lastPushTs < CONFIG.MIN_PUSH_INTERVAL) {
            // 可选：更新队列中最后一个同类型事件的坐标和时间，保持最新状态
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