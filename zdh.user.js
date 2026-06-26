// ==UserScript==
// @name         标签批量选择器
// @namespace    http://tampermonkey.net/
// @version      2.0.0
// @description  标注助手 - CPV/SKU 双模式切换
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

    if (window.__MODULES__ && window.__MODULES__.ui) {
        window.__MODULES__.ui.buildAndWatchPanel();
        console.log('🏷️ 标注助手 v2.0.0 已加载 [CPV/SKU 双模式]');
    } else {
        console.error('❌ 模块加载失败，请检查网络或 @require 链接');
        var retries = 0;
        var checkModule = setInterval(function() {
            retries++;
            if (window.__MODULES__ && window.__MODULES__.ui) {
                clearInterval(checkModule);
                window.__MODULES__.ui.buildAndWatchPanel();
                console.log('🏷️ 标注助手 v2.0.0 已加载 (重试成功)');
            } else if (retries > 10) {
                clearInterval(checkModule);
                console.error('❌ 模块加载超时，请刷新页面重试');
            }
        }, 500);
    }
})();
