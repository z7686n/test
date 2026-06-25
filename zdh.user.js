// ==UserScript==
// @name         标签批量选择器
// @namespace    http://tampermonkey.net/
// @version      1.2.1
// @description  批量选择 Ant Design 标签 + TreeSelect下拉框，按钮式，高性能
// @author       Z
// @match        *://*/*
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/z7686n/test/main/zdh.user.js
// @updateURL    https://raw.githubusercontent.com/z7686n/test/main/zdh.user.js
// ==/UserScript==

(function () {
    'use strict';

    // 仅顶层窗口运行
    if (window.self !== window.top) return;

    // ==================== 配置 ====================
    const CONFIG = {
        clickDelay: 50,
        debug: false,
        storageKey: 'tag-panel-pos',
        defaultPosition: { top: 100, right: 20 },
        dropdownTimeout: 500,
        // 所有标签（扁平数组）
        tags: [
            '准确', '错误', '无法判断', 'image', 'subject',
            'seller_filled_cpv', '答非所问(输出了其他P的V)',
            '模型幻觉(输出了无依据的V)', '商品本身信息不一致(优先级导致错误的V)',
            '类目错放', '回答不全(V只识别了一部分)', '回答多了，多余部分不冲突',
            '其他原因'
        ]
    };

    // ==================== 工具函数 ====================
    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    // ==================== 状态管理 ====================
    let panel = null;
    let isMinimized = false;
    let isProcessing = false;
    let selectedTags = new Set();

    // ==================== 存储位置 ====================
    function savePosition(top, right) {
        try { localStorage.setItem(CONFIG.storageKey, JSON.stringify({ top, right })); } catch (e) {}
    }

    function loadPosition() {
        try {
            const saved = JSON.parse(localStorage.getItem(CONFIG.storageKey));
            if (saved && typeof saved.top === 'number' && typeof saved.right === 'number') {
                return { top: saved.top, right: saved.right };
            }
        } catch (e) {}
        return { ...CONFIG.defaultPosition };
    }

    // ==================== Toast 提示 ====================
    function showToast(msg, isError = false) {
        const old = document.getElementById('tag-toast');
        if (old) old.remove();

        const toast = document.createElement('div');
        toast.id = 'tag-toast';
        toast.textContent = msg;
        toast.style.cssText = `
            position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
            z-index: 1000000; background: ${isError ? '#4a1a1a' : '#1a1a2e'};
            color: ${isError ? '#ff6b6b' : '#eee'}; padding: 12px 24px;
            border-radius: 8px; font-family: 'Segoe UI', Arial, sans-serif;
            font-size: 14px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            border: 1px solid ${isError ? '#ff6b6b' : '#333'};
            max-width: 80vw; text-align: center;
            animation: tag-toast-in 0.3s ease;
        `;

        if (!document.getElementById('tag-toast-style')) {
            const style = document.createElement('style');
            style.id = 'tag-toast-style';
            style.textContent = '@keyframes tag-toast-in{from{opacity:0;transform:translateX(-50%) translateY(20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}';
            document.head.append(style);
        }

        document.body.append(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.5s';
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    }

    // ==================== 核心：操作标签 ====================
    async function selectTags(targets) {
        if (isProcessing) {
            showToast('⏳ 正在执行中，请稍候...');
            return;
        }

        if (!targets || !targets.length) {
            showToast('⚠️ 请选择要执行的标签', true);
            return;
        }

        isProcessing = true;
        const startTime = performance.now();

        try {
            const tagElements = document.querySelectorAll('.ant-tag-checkable');
            if (!tagElements.length) {
                showToast('⚠️ 未找到可操作标签', true);
                isProcessing = false;
                return;
            }

            let selected = 0, already = 0, errors = 0;

            for (const tag of tagElements) {
                const text = tag.textContent.trim();
                if (!targets.includes(text)) continue;

                const isChecked = tag.classList.contains('ant-tag-checkable-checked');
                if (isChecked) {
                    already++;
                    continue;
                }

                try {
                    if (document.contains(tag)) {
                        tag.click();
                        selected++;
                        await sleep(CONFIG.clickDelay);
                    }
                } catch (e) {
                    errors++;
                    if (CONFIG.debug) console.warn(`点击失败 ${text}`, e);
                }
            }

            const elapsed = (performance.now() - startTime).toFixed(0);
            const msg = `🎉 完成！新选 ${selected} 个，已选 ${already} 个${errors ? ` (失败 ${errors})` : ''} (${elapsed}ms)`;
            updateStatus(msg);
            showToast(msg);
        } catch (error) {
            showToast('❌ 执行出错: ' + error.message, true);
            console.error('selectTags error:', error);
        } finally {
            isProcessing = false;
        }
    }

    // ==================== 核心：操作下拉框 TreeSelect ====================
    async function selectTreeSelectUnable() {
        if (isProcessing) {
            showToast('⏳ 正在执行中，请稍候...');
            return;
        }

        isProcessing = true;
        const startTime = performance.now();

        try {
            const treeSelects = document.querySelectorAll('.ant-tree-select');
            if (!treeSelects.length) {
                showToast('⚠️ 未找到 Tree Select 组件', true);
                isProcessing = false;
                return;
            }

            console.log(`找到 ${treeSelects.length} 个 Tree Select 组件`);

            const needProcess = [];
            for (let i = 0; i < treeSelects.length; i++) {
                const select = treeSelects[i];
                const selectionItem = select.querySelector('.ant-select-selection-item');
                if (selectionItem && selectionItem.textContent.trim() === '无法判断') {
                    if (CONFIG.debug) console.log(`第 ${i+1} 个已经是"无法判断"，跳过`);
                } else {
                    needProcess.push({ index: i, element: select });
                }
            }

            if (!needProcess.length) {
                showToast('✅ 所有下拉框已选择"无法判断"');
                isProcessing = false;
                return;
            }

            console.log(`需要处理 ${needProcess.length} 个组件`);

            for (const item of needProcess) {
                const selector = item.element.querySelector('.ant-select-selector');
                if (selector) {
                    selector.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                    selector.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
                    selector.click();
                }
            }

            await sleep(300);

            const allDropdowns = document.querySelectorAll('.ant-select-dropdown');
            const visibleDropdowns = [];
            for (const dropdown of allDropdowns) {
                const style = window.getComputedStyle(dropdown);
                if (style.display !== 'none' && style.visibility !== 'hidden' && dropdown.offsetParent !== null) {
                    visibleDropdowns.push(dropdown);
                }
            }

            console.log(`找到 ${visibleDropdowns.length} 个可见下拉菜单`);

            const dropdownMap = new Map();
            for (let i = 0; i < Math.min(needProcess.length, visibleDropdowns.length); i++) {
                dropdownMap.set(needProcess[i].element, visibleDropdowns[i]);
            }

            let successCount = 0;
            let failCount = 0;

            for (const item of needProcess) {
                const dropdown = dropdownMap.get(item.element);
                if (!dropdown) {
                    failCount++;
                    continue;
                }

                let targetNode = null;

                const treeNodes = dropdown.querySelectorAll('.ant-tree-treenode, .ant-select-tree-treenode');
                for (const node of treeNodes) {
                    const titleEl = node.querySelector('.ant-tree-node-content-wrapper, .ant-select-tree-node-content-wrapper, .ant-tree-title');
                    if (titleEl && titleEl.textContent.trim() === '无法判断') {
                        targetNode = titleEl;
                        break;
                    }
                }

                if (!targetNode) {
                    const options = dropdown.querySelectorAll('.ant-select-item-option');
                    for (const opt of options) {
                        const content = opt.querySelector('.ant-select-item-option-content');
                        if (content && content.textContent.trim() === '无法判断') {
                            targetNode = opt;
                            break;
                        }
                    }
                }

                if (targetNode) {
                    const clickEvent = new MouseEvent('click', {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    });
                    targetNode.dispatchEvent(clickEvent);
                    successCount++;
                } else {
                    failCount++;
                }
            }

            await sleep(200);

            try {
                const escEvent = new KeyboardEvent('keydown', {
                    key: 'Escape',
                    code: 'Escape',
                    keyCode: 27,
                    which: 27,
                    bubbles: true,
                    cancelable: true,
                    composed: true
                });
                document.dispatchEvent(escEvent);
            } catch (e) {
                try { document.body.click(); } catch (e2) {}
            }

            const elapsed = (performance.now() - startTime).toFixed(0);
            const msg = `🎉 下拉框完成！成功 ${successCount} 个${failCount ? `，失败 ${failCount} 个` : ''} (${elapsed}ms)`;
            updateStatus(msg);
            showToast(msg);

        } catch (error) {
            showToast('❌ 下拉框执行出错: ' + error.message, true);
            console.error('selectTreeSelectUnable error:', error);
        } finally {
            isProcessing = false;
        }
    }

    // ==================== 清除所有选中 ====================
    function clearAllSelections() {
        if (isProcessing) {
            showToast('⏳ 正在执行中，请稍候...');
            return;
        }

        const tags = document.querySelectorAll('.ant-tag-checkable');
        let cleared = 0;
        tags.forEach(tag => {
            if (tag.classList.contains('ant-tag-checkable-checked') && document.contains(tag)) {
                try { tag.click(); cleared++; } catch (e) {}
            }
        });
        const msg = `🔄 已取消 ${cleared} 个选中`;
        updateStatus(msg);
        showToast(msg);
        selectedTags.clear();
        updateTagButtons();
    }

    // ==================== 更新按钮状态 ====================
    function updateTagButtons() {
        const btns = $$('.tag-select-btn', panel);
        btns.forEach(btn => {
            const tag = btn.dataset.tag;
            if (selectedTags.has(tag)) {
                btn.classList.add('active');
                btn.style.background = '#4fc3f7';
                btn.style.color = '#1a1a2e';
                btn.style.borderColor = '#4fc3f7';
            } else {
                btn.classList.remove('active');
                btn.style.background = 'transparent';
                btn.style.color = '#ccc';
                btn.style.borderColor = '#444';
            }
        });

        const countEl = $('#selected-count', panel);
        if (countEl) {
            countEl.textContent = `已选 ${selectedTags.size} 个`;
        }
    }

    // ==================== 切换标签选择 ====================
    function toggleTag(tag) {
        if (selectedTags.has(tag)) {
            selectedTags.delete(tag);
        } else {
            selectedTags.add(tag);
        }
        updateTagButtons();
    }

    // ==================== 更新状态栏 ====================
    function updateStatus(msg) {
        const bar = $('#tag-status-bar', panel);
        if (bar) {
            bar.textContent = msg;
            bar.style.color = '#4fc3f7';
            setTimeout(() => { if (bar) bar.style.color = '#888'; }, 3000);
        }
    }

    // ==================== 面板构建 ====================
    function buildPanel() {
        if (document.getElementById('tag-selector-panel')) return;

        // 最小化样式注入
        if (!document.getElementById('tag-min-style')) {
            const style = document.createElement('style');
            style.id = 'tag-min-style';
            style.textContent = `
                #tag-selector-panel.minimized {
                    width: 42px !important; height: 42px !important;
                    border-radius: 50% !important; padding: 0 !important;
                    overflow: hidden !important; cursor: pointer !important;
                }
                #tag-selector-panel.minimized > div:not(.title-bar) { display: none !important; }
                #tag-selector-panel.minimized .title-text { display: none !important; }
                #tag-selector-panel.minimized .toggle-btn { font-size: 22px !important; }
                #tag-selector-panel.minimized .title-bar { margin-bottom: 0 !important; justify-content: center !important; }

                .tag-select-btn {
                    padding: 4px 10px;
                    border-radius: 4px;
                    border: 1px solid #444;
                    background: transparent;
                    color: #ccc;
                    cursor: pointer;
                    font-size: 12px;
                    transition: all 0.15s ease;
                    font-family: inherit;
                    white-space: nowrap;
                }
                .tag-select-btn:hover {
                    background: #2a2a4a;
                    border-color: #666;
                }
                .tag-select-btn.active {
                    background: #4fc3f7 !important;
                    color: #1a1a2e !important;
                    border-color: #4fc3f7 !important;
                }
                .action-btn {
                    padding: 3px 10px;
                    border-radius: 3px;
                    border: 1px solid #555;
                    background: #252540;
                    color: #aaa;
                    cursor: pointer;
                    font-size: 11px;
                    transition: all 0.15s ease;
                    font-family: inherit;
                }
                .action-btn:hover {
                    background: #333366;
                    color: #fff;
                }
                .action-btn.primary {
                    border-color: #4fc3f7;
                    color: #4fc3f7;
                }
                .action-btn.danger {
                    border-color: #e57373;
                    color: #e57373;
                }
            `;
            document.head.append(style);
        }

        // 面板 DOM
        panel = document.createElement('div');
        panel.id = 'tag-selector-panel';
        const pos = loadPosition();
        panel.style.cssText = `
            position: fixed; z-index: 999999; background: #1a1a2e;
            color: #eee; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.6);
            font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px;
            border: 1px solid #333; user-select: none; width: 300px;
            box-sizing: border-box; padding: 12px 14px;
            top: ${pos.top}px; right: ${pos.right}px;
            transition: width 0.3s, height 0.3s, border-radius 0.3s, padding 0.3s;
            max-height: 90vh; overflow-y: auto;
        `;

        // 标题栏
        const titleBar = document.createElement('div');
        titleBar.className = 'title-bar';
        titleBar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-shrink:0;';
        titleBar.innerHTML = `
            <span class="title-text" style="font-weight:bold;font-size:16px;color:#4fc3f7;">🏷️ 标签选择器</span>
            <span class="toggle-btn" style="cursor:pointer;font-size:20px;color:#aaa;padding:0 6px;" title="最小化">−</span>
        `;
        panel.append(titleBar);

        // 提示和计数
        const infoBar = document.createElement('div');
        infoBar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-shrink:0;';
        infoBar.innerHTML = `
            <span style="font-size:11px;color:#888;">💡 点击标签选择，再执行</span>
            <span id="selected-count" style="font-size:12px;color:#4fc3f7;font-weight:bold;">已选 0 个</span>
        `;
        panel.append(infoBar);

        // 快捷操作：全部 + 清空
        const actionBar = document.createElement('div');
        actionBar.style.cssText = 'display:flex;gap:6px;margin-bottom:8px;flex-shrink:0;';

        // 全部按钮
        const selectAllBtn = document.createElement('button');
        selectAllBtn.className = 'action-btn primary';
        selectAllBtn.textContent = '📌 全部';
        selectAllBtn.addEventListener('click', () => {
            const allSelected = CONFIG.tags.every(t => selectedTags.has(t));
            if (allSelected) {
                CONFIG.tags.forEach(t => selectedTags.delete(t));
                showToast('已取消全选');
            } else {
                CONFIG.tags.forEach(t => selectedTags.add(t));
                showToast('已全选');
            }
            updateTagButtons();
        });
        actionBar.append(selectAllBtn);

        // 清空按钮
        const clearBtn = document.createElement('button');
        clearBtn.className = 'action-btn danger';
        clearBtn.textContent = '🗑️ 清空';
        clearBtn.addEventListener('click', () => {
            selectedTags.clear();
            updateTagButtons();
            showToast('已清空选择');
        });
        actionBar.append(clearBtn);

        // 添加一个弹性空间，让按钮靠左
        const spacer = document.createElement('span');
        spacer.style.cssText = 'flex:1;';
        actionBar.append(spacer);

        panel.append(actionBar);

        // 标签按钮区域
        const tagContainer = document.createElement('div');
        tagContainer.id = 'tag-btn-container';
        tagContainer.style.cssText = `
            display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px;
            max-height:160px;overflow-y:auto;padding:4px 2px;
            scrollbar-width: thin; scrollbar-color: #555 #1a1a2e;
            flex-shrink:0; align-content:flex-start;
        `;

        // 创建标签按钮
        CONFIG.tags.forEach(tag => {
            const btn = document.createElement('button');
            btn.className = 'tag-select-btn';
            btn.dataset.tag = tag;
            btn.textContent = tag;
            btn.addEventListener('click', () => toggleTag(tag));
            tagContainer.append(btn);
        });
        panel.append(tagContainer);

        // 分割线
        const divider = document.createElement('div');
        divider.style.cssText = 'border-top:1px solid #333;margin:6px 0;flex-shrink:0;';
        panel.append(divider);

        // 执行按钮
        const actionGroup = document.createElement('div');
        actionGroup.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;flex-shrink:0;';

        const createBtn = (text, bg, hoverBg, onClick, flex) => {
            const btn = document.createElement('button');
            btn.textContent = text;
            btn.style.cssText = `
                ${flex ? `flex:${flex};` : 'flex:1;min-width:50px;'}
                padding:5px 8px;border:none;border-radius:5px;
                background:${bg};color:#1a1a2e;font-weight:bold;font-size:12px;cursor:pointer;
                transition:background 0.15s, transform 0.1s;
                white-space:nowrap;font-family:inherit;
            `;
            btn.addEventListener('mouseenter', () => btn.style.background = hoverBg);
            btn.addEventListener('mouseleave', () => btn.style.background = bg);
            btn.addEventListener('mousedown', () => btn.style.transform = 'scale(0.96)');
            btn.addEventListener('mouseup', () => btn.style.transform = '');
            btn.addEventListener('click', onClick);
            return btn;
        };

        actionGroup.append(
            createBtn('✅ 执行选中', '#4fc3f7', '#0288d1', () => {
                const tags = Array.from(selectedTags);
                selectTags(tags);
            }, '1.5')
        );
        actionGroup.append(
            createBtn('🔄 清除选中', '#ff8a65', '#d84315', clearAllSelections, '1')
        );
        panel.append(actionGroup);

        // 下拉框操作
        const dropdownGroup = document.createElement('div');
        dropdownGroup.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;flex-shrink:0;';
        dropdownGroup.append(
            createBtn('📋 下拉框 选"无法判断"', '#7c4dff', '#536dfe', selectTreeSelectUnable, '2')
        );
        panel.append(dropdownGroup);

        // 状态栏
        const status = document.createElement('div');
        status.id = 'tag-status-bar';
        status.style.cssText = 'padding-top:6px;border-top:1px solid #333;font-size:11px;color:#888;text-align:center;flex-shrink:0;';
        status.textContent = `就绪 | ${CONFIG.tags.length} 种标签`;
        panel.append(status);

        document.body.append(panel);
        initDraggable(panel);
        updateTagButtons();
    }

    // ==================== 拖动 & 最小化交互 ====================
    function initDraggable(el) {
        const toggleBtn = $('.toggle-btn', el);
        let startX, startY, origX, origY, moved = false;
        let dragging = false;

        function minimize() {
            isMinimized = true;
            el.classList.add('minimized');
            toggleBtn.textContent = '🏷️';
            toggleBtn.title = '展开面板';
        }

        function expand() {
            isMinimized = false;
            el.classList.remove('minimized');
            toggleBtn.textContent = '−';
            toggleBtn.title = '最小化';
        }

        el.addEventListener('pointerdown', e => {
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
            e.preventDefault();
            startX = e.clientX;
            startY = e.clientY;
            origX = el.offsetLeft;
            origY = el.offsetTop;
            moved = false;
            dragging = true;

            const onMove = e => {
                if (!dragging) return;
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                if (!moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
                    moved = true;
                    el.style.transition = 'none';
                }
                if (moved) {
                    el.style.left = (origX + dx) + 'px';
                    el.style.top = (origY + dy) + 'px';
                    el.style.right = 'auto';
                }
            };

            const onUp = e => {
                dragging = false;
                document.removeEventListener('pointermove', onMove);
                document.removeEventListener('pointerup', onUp);
                el.style.transition = '';

                if (!moved) {
                    if (e.target === toggleBtn) {
                        isMinimized ? expand() : minimize();
                    } else if (isMinimized && el.contains(e.target)) {
                        expand();
                    }
                } else {
                    const rect = el.getBoundingClientRect();
                    savePosition(rect.top, window.innerWidth - rect.right);
                }
            };

            document.addEventListener('pointermove', onMove);
            document.addEventListener('pointerup', onUp);
        });

        el.addEventListener('click', e => {
            if (isMinimized && e.target === el) {
                expand();
            }
        });
    }

    // ==================== 自动重新创建面板 ====================
    function watchPanel() {
        const observer = new MutationObserver(() => {
            if (!document.getElementById('tag-selector-panel')) buildPanel();
        });
        observer.observe(document.body, { childList: true });
    }

    // ==================== 启动 ====================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            buildPanel();
            watchPanel();
        });
    } else {
        buildPanel();
        watchPanel();
    }

    console.log('🏷️ 标签选择器 v1.2.0 已加载');
})();
