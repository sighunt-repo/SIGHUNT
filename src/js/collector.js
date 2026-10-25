// js/collector.js

(function(window) {
    // 1. 脚本加载时，立即记录当前时间戳（这就是 t_start）
    const _startTime = Date.now();

    // 2. 把工具对象挂载到 window 上
    window.Collector = {
        // 获取从页面加载到现在的时长 (单位：秒)
        getDeltaTime: function () {
            const now = Date.now();
            return (now - _startTime) / 1000;
        },

        //  获取当前的北京时间字符串
        getBeijingTime: function () {
            return new Date().toLocaleString('zh-CN', {
                timeZone: 'Asia/Shanghai',
                hour12: false
            });
        }
    };

})(window);