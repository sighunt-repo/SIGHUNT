// js/collector.js

(function(window) {
    const _startTime = Date.now();

    window.Collector = {
        getDeltaTime: function () {
            const now = Date.now();
            return (now - _startTime) / 1000;
        },

        getBeijingTime: function () {
            return new Date().toLocaleString('zh-CN', {
                timeZone: 'Asia/Shanghai',
                hour12: false
            });
        }
    };

})(window);