// 工具函数模块
window.__MODULES__ = window.__MODULES__ || {};
window.__MODULES__.utils = (function() {
    return {
        // DOM 查询简写
        $: function(sel, ctx) {
            ctx = ctx || document;
            return ctx.querySelector(sel);
        },
        
        // DOM 查询批量
        $$: function(sel, ctx) {
            ctx = ctx || document;
            return Array.from(ctx.querySelectorAll(sel));
        },
        
        // 延时函数
        sleep: function(ms) {
            return new Promise(function(r) { setTimeout(r, ms); });
        },
        
        // Toast 提示
        showToast: function(msg, isError, duration) {
            isError = isError || false;
            duration = duration || 3000;
            
            var old = document.getElementById('tag-toast');
            if (old) old.remove();

            var toast = document.createElement('div');
            toast.id = 'tag-toast';
            toast.textContent = msg;
            toast.style.cssText = 
                'position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);' +
                'z-index: 1000000; background: ' + (isError ? '#4a1a1a' : '#1a1a2e') + ';' +
                'color: ' + (isError ? '#ff6b6b' : '#eee') + '; padding: 12px 24px;' +
                'border-radius: 8px; font-family: "Segoe UI", Arial, sans-serif;' +
                'font-size: 14px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);' +
                'border: 1px solid ' + (isError ? '#ff6b6b' : '#333') + ';' +
                'max-width: 80vw; text-align: center;' +
                'animation: tag-toast-in 0.3s ease;';

            if (!document.getElementById('tag-toast-style')) {
                var style = document.createElement('style');
                style.id = 'tag-toast-style';
                style.textContent = 
                    '@keyframes tag-toast-in{from{opacity:0;transform:translateX(-50%) translateY(20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}' +
                    '.tag-toast-out{opacity:0;transition:opacity 0.5s;}';
                document.head.append(style);
            }

            document.body.append(toast);
            
            setTimeout(function() {
                toast.classList.add('tag-toast-out');
                setTimeout(function() { toast.remove(); }, 500);
            }, duration);
        },
        
        // 防抖函数
        debounce: function(func, wait) {
            var timeout;
            return function executedFunction() {
                var context = this;
                var args = arguments;
                var later = function() {
                    timeout = null;
                    func.apply(context, args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },
        
        // 节流函数
        throttle: function(func, limit) {
            var inThrottle;
            return function() {
                var args = arguments;
                var context = this;
                if (!inThrottle) {
                    func.apply(context, args);
                    inThrottle = true;
                    setTimeout(function() { inThrottle = false; }, limit);
                }
            };
        },
        
        // 安全解析JSON
        safeJSONParse: function(str, defaultValue) {
            try {
                return JSON.parse(str);
            } catch (e) {
                return defaultValue || null;
            }
        },
        
        // 生成唯一ID
        generateId: function() {
            return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        }
    };
})();
