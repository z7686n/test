// ==UserScript==
// @name         标签批量选择器
// @namespace    http://tampermonkey.net/
// @version      1.3.0
// @description  批量选择 Ant Design 标签 + TreeSelect下拉框 (模块化版本)
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

    // 所有功能已通过 @require 导入，直接启动面板
    if (typeof buildAndWatchPanel === 'function') {
        buildAndWatchPanel();
    } else {
        console.error('UI 模块加载失败，请检查网络或 @require 链接');
    }

    console.log('🏷️ 标签选择器 (模块化) v1.3.0 已加载');
})();
