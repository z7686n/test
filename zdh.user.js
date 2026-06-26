// ==UserScript==
// @name         标签批量选择器
// @namespace    http://tampermonkey.net/
// @version      1.4.0
// @description  批量选择 Ant Design 标签 + TreeSelect下拉框 (模块化修复版)
// @author       Z
// @match        *://*/*
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/z7686n/test/main/zdh.user.js
// @updateURL    https://raw.githubusercontent.com/z7686n/test/main/zdh.user.js
// @require      https://raw.githubusercontent.com/z7686n/test/main/modules/config.js
// @require      https://raw.githubusercontent.com/z7686n/test/main/modules/utils.js
// @require      https://raw.githubusercontent.com/z7686n/test/main/modules/tag-operations.js
// @require      https://raw.githubusercontent.com/z7686n/test/main/modules/tree-select-operations.js
// @require      https://raw.githubusercontent.com/z7686n/test/main/modules/ui-panel.js
// ==/UserScript==

(function () {
    'use strict';
    if (window.self !== window.top) return;

    // 等待所有模块加载完成
    if (window.__MODULES__ && window.__MODULES__.ui) {
        window.__MODULES__.ui.buildAndWatchPanel();
        console.log('🏷️ 标签选择器 (模块化修复版) v1.4.0 已加载');
    } else {
        console.error('❌ 模块加载失败，请检查网络或 @require 链接');
        // 重试机制
        var retries = 0;
        var checkModule = setInterval(function() {
            retries++;
            if (window.__MODULES__ && window.__MODULES__.ui) {
                clearInterval(checkModule);
                window.__MODULES__.ui.buildAndWatchPanel();
                console.log('🏷️ 标签选择器 (模块化修复版) v1.4.0 已加载 (重试成功)');
            } else if (retries > 10) {
                clearInterval(checkModule);
                console.error('❌ 模块加载超时，请刷新页面重试');
            }
        }, 500);
    }
})();
