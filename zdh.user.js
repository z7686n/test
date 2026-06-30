// ==UserScript==
// @name         标注助手
// @namespace    http://tampermonkey.net/
// @version      2.1.0
// @description  标注助手 - 分组布局 + 模板管理
// @author       Z
// @match        *://*/*
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/z7686n/test/main/zdh.user.js
// @updateURL    https://raw.githubusercontent.com/z7686n/test/main/zdh.user.js
// @require      https://raw.githubusercontent.com/z7686n/test/main/modules/config.js
// @require      https://raw.githubusercontent.com/z7686n/test/main/modules/utils.js
// @require      https://raw.githubusercontent.com/z7686n/test/main/modules/template-manager.js
// @require      https://raw.githubusercontent.com/z7686n/test/main/modules/tag-operations.js
// @require      https://raw.githubusercontent.com/z7686n/test/main/modules/tree-select-operations.js
// @require      https://raw.githubusercontent.com/z7686n/test/main/modules/ui-panel.js
// ==/UserScript==

(function () {
    'use strict';
    
    // 安全检查
    if (window.self !== window.top) return;
    if (!window.isSecureContext) {
        console.warn('⚠️ 标注助手：页面非安全上下文');
        return;
    }

    // 日志工具
    const logger = {
        info: (msg) => console.log('🏷️', msg),
        error: (msg) => console.error('❌', msg),
        warn: (msg) => console.warn('⚠️', msg),
        debug: (msg) => {
            if (window.__MODULES__?.CONFIG?.debug) {
                console.log('🔍', msg);
            }
        }
    };

    // 加载状态
    let isLoaded = false;
    let retryCount = 0;
    const MAX_RETRIES = 15;
    const RETRY_INTERVAL = 500;

    // 核心加载函数
    function loadModule() {
        try {
            // 检查模块是否存在
            if (!window.__MODULES__) {
                throw new Error('模块容器不存在');
            }

            const uiModule = window.__MODULES__.ui;
            if (!uiModule) {
                throw new Error('UI模块不存在');
            }

            // 检查API兼容性
            if (typeof uiModule.buildAndWatchPanel !== 'function') {
                throw new Error('UI模块API不兼容');
            }

            // 检查是否已加载
            if (isLoaded) {
                logger.warn('模块已加载，跳过重复初始化');
                return;
            }

            // 执行加载
            uiModule.buildAndWatchPanel();
            isLoaded = true;
            logger.info('标注助手 v2.1.0 已加载 [分组布局 + 模板管理]');
            
            // 清理重试定时器
            if (window.__retryTimer) {
                clearInterval(window.__retryTimer);
                delete window.__retryTimer;
            }

        } catch (error) {
            logger.error(`加载失败 (${retryCount}/${MAX_RETRIES}):`, error.message);
            
            // 重试逻辑
            if (retryCount < MAX_RETRIES) {
                retryCount++;
                if (!window.__retryTimer) {
                    window.__retryTimer = setTimeout(loadModule, RETRY_INTERVAL);
                }
            } else {
                logger.error('模块加载超时，请刷新页面重试');
                showErrorMessage();
            }
        }
    }

    // 错误提示
    function showErrorMessage() {
        const style = document.createElement('style');
        style.textContent = `
            .annotation-helper-error {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: #ff4444;
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                z-index: 999999;
                font-family: sans-serif;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                animation: slideIn 0.3s ease;
            }
            @keyframes slideIn {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'annotation-helper-error';
        errorDiv.textContent = '❌ 标注助手加载失败，请刷新页面';
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.style.opacity = '0';
            errorDiv.style.transition = 'opacity 0.5s';
            setTimeout(() => errorDiv.remove(), 500);
        }, 5000);
    }

    // SPA页面变化监听
    let lastUrl = location.href;
    const urlObserver = new MutationObserver(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            if (isLoaded) {
                logger.info('检测到页面变化，重新初始化...');
                isLoaded = false;
                setTimeout(loadModule, 1000);
            }
        }
    });
    
    if (document.readyState === 'complete') {
        urlObserver.observe(document, { subtree: true, childList: true });
    } else {
        window.addEventListener('load', () => {
            urlObserver.observe(document, { subtree: true, childList: true });
        });
    }

    loadModule();

    // 清理函数
    window.__cleanupAnnotationHelper = function() {
        if (window.__retryTimer) {
            clearInterval(window.__retryTimer);
            delete window.__retryTimer;
        }
        urlObserver.disconnect();
        logger.info('已清理标注助手');
    };

})();
