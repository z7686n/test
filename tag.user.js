// ==UserScript==
// @name         标签批量选择器
// @namespace    http://tampermonkey.net/
// @version      1.1.1
// @description  批量选择 Ant Design 标签，高性能、记忆位置、平滑拖动
// @author       Z
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // 仅顶层窗口运行
    if (window.self !== window.top) return;

    // ==================== 配置 ====================
    const CONFIG = {
        clickDelay: 80,            // 点击间隔 (ms)
        debug: false,              // 调试日志
        storageKey: 'tag-panel-pos', // localStorage 键名
        defaultPosition: { top: 100, right: 20 },
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
    function showToast(msg) {
        const old = document.getElementById('tag-toast');
        if (old) old.remove();

        const toast = document.createElement('div');
        toast.id = 'tag-toast';
        toast.textContent = msg;
        toast.style.cssText = `
            position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
            z-index: 1000000; background: #1a1a2e; color: #eee; padding: 12px 24px;
            border-radius: 8px; font-family: 'Segoe UI', Arial, sans-serif;
            font-size: 14px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            border: 1px solid #333; max-width: 80vw; text-align: center;
            animation: tag-toast-in 0.3s ease;
        `;

        // 注入动画仅一次
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
        const tagElements = document.querySelectorAll('.ant-tag-checkable');
        if (!tagElements.length) {
            showToast('⚠️ 未找到可操作标签');
            return;
        }

        let selected = 0, already = 0, errors = 0;

        for (const tag of tagElements) {
            const text = tag.textContent.trim();
            if (!targets.includes(text)) continue;

            const isChecked = tag.classList.contains('ant-tag-checkable-checked');
            if (isChecked) {
                if (CONFIG.debug) console.log(`⏭️ 已选中 ${text}`);
                already++;
                continue;
            }

            try {
                if (document.contains(tag)) {
                    tag.click();
                    if (CONFIG.debug) console.log(`✅ 选中 ${text}`);
                    selected++;
                    await sleep(CONFIG.clickDelay);
                }
            } catch (e) {
                errors++;
                console.warn(`点击失败 ${text}`, e);
            }
        }

        const msg = `🎉 完成！新选 ${selected} 个，已选 ${already} 个${errors ? ` (失败 ${errors})` : ''}`;
        updateStatus(msg);
        showToast(msg);
    }

    function clearAllSelections() {
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
    }

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

        // ---------- 最小化样式注入 ----------
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
            `;
            document.head.append(style);
        }

        // ---------- 面板 DOM ----------
        panel = document.createElement('div');
        panel.id = 'tag-selector-panel';
        const pos = loadPosition();
        panel.style.cssText = `
            position: fixed; z-index: 999999; background: #1a1a2e;
            color: #eee; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.6);
            font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px;
            border: 1px solid #333; user-select: none; width: 260px;
            box-sizing: border-box; padding: 12px 14px;
            top: ${pos.top}px; right: ${pos.right}px;
            transition: width 0.3s, height 0.3s, border-radius 0.3s, padding 0.3s;
        `;

        // ---- 标题栏 ----
        const titleBar = document.createElement('div');
        titleBar.className = 'title-bar';
        titleBar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;';
        titleBar.innerHTML = `
            <span class="title-text" style="font-weight:bold;font-size:16px;color:#4fc3f7;">🏷️ 标签选择器</span>
            <span class="toggle-btn" style="cursor:pointer;font-size:20px;color:#aaa;" title="最小化">−</span>
        `;
        panel.append(titleBar);

        // ---- 提示 ----
        const tip = document.createElement('div');
        tip.style.cssText = 'font-size:12px;color:#888;margin-bottom:10px;padding:4px 8px;background:#252540;border-radius:4px;';
        tip.textContent = '💡 勾选标签后点击执行';
        panel.append(tip);

        // ---- 复选框列表 ----
        const container = document.createElement('div');
        container.id = 'tag-checkbox-container';
        container.style.cssText = `
            display:flex;flex-direction:column;gap:6px;margin-bottom:12px;
            max-height:280px;overflow-y:auto;padding-right:4px;
            scrollbar-width: thin; scrollbar-color: #555 #1a1a2e;
        `;
        CONFIG.tags.forEach(tag => {
            const label = document.createElement('label');
            label.style.cssText = 'display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:#ccc;padding:2px 0;transition:color 0.2s;';
            label.addEventListener('mouseenter', () => label.style.color = '#fff');
            label.addEventListener('mouseleave', () => label.style.color = '#ccc');

            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.value = tag;
            cb.style.cssText = 'accent-color:#4fc3f7;width:16px;height:16px;cursor:pointer;flex-shrink:0;';
            label.append(cb);
            label.append(document.createTextNode(tag));
            container.append(label);
        });
        panel.append(container);

        // ---- 按钮 ----
        const btnGroup = document.createElement('div');
        btnGroup.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;';

        const createBtn = (text, bg, hoverBg, onClick) => {
            const btn = document.createElement('button');
            btn.textContent = text;
            btn.style.cssText = `
                flex:1;min-width:60px;padding:7px 10px;border:none;border-radius:6px;
                background:${bg};color:#1a1a2e;font-weight:bold;font-size:13px;cursor:pointer;
                transition:background 0.2s, transform 0.1s;
            `;
            btn.addEventListener('mouseenter', () => btn.style.background = hoverBg);
            btn.addEventListener('mouseleave', () => btn.style.background = bg);
            btn.addEventListener('mousedown', () => btn.style.transform = 'scale(0.97)');
            btn.addEventListener('mouseup', () => btn.style.transform = '');
            btn.addEventListener('click', onClick);
            return btn;
        };

        btnGroup.append(
            createBtn('✅ 执行选中', '#4fc3f7', '#0288d1', () => {
                const checked = getCheckedValues();
                checked.length ? selectTags(checked) : showToast('⚠️ 请至少选择一个标签');
            })
        );
        btnGroup.append(
            createBtn('🔄 全部取消', '#ff8a65', '#d84315', clearAllSelections)
        );
        btnGroup.append(
            createBtn('📌 全选', '#81c784', '#388e3c', () => {
                $$('#tag-checkbox-container input[type=checkbox]', panel).forEach(c => c.checked = true);
                showToast('已全选');
            })
        );
        btnGroup.append(
            createBtn('📌 全不选', '#e57373', '#c62828', () => {
                $$('#tag-checkbox-container input[type=checkbox]', panel).forEach(c => c.checked = false);
                showToast('已取消全选');
            })
        );
        panel.append(btnGroup);

        // ---- 状态栏 ----
        const status = document.createElement('div');
        status.id = 'tag-status-bar';
        status.style.cssText = 'padding-top:8px;border-top:1px solid #333;font-size:11px;color:#888;text-align:center;';
        status.textContent = `就绪 | ${CONFIG.tags.length} 种标签`;
        panel.append(status);

        document.body.append(panel);
        initDraggable(panel);
    }

    function getCheckedValues() {
        return $$('#tag-checkbox-container input[type=checkbox]:checked', panel).map(cb => cb.value);
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
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
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
                    // 点击行为
                    if (e.target === toggleBtn) {
                        isMinimized ? expand() : minimize();
                    } else if (isMinimized && el.contains(e.target)) {
                        expand();
                    }
                } else {
                    // 保存最终位置
                    const rect = el.getBoundingClientRect();
                    savePosition(rect.top, window.innerWidth - rect.right);
                }
            };

            document.addEventListener('pointermove', onMove);
            document.addEventListener('pointerup', onUp);
        });

        // 处理最小化状态下整个球体点击展开
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

    console.log('🏷️ 标签选择器 v2.5 已优化（记忆位置+性能增强）');
})();
