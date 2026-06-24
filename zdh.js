// ==UserScript==
// @downloadURL  https://raw.githubusercontent.com/z7686n/test/main/zdh.js
// @updateURL    https://raw.githubusercontent.com/z7686n/test/main/zdh.js
// @name         多功能工具箱
// @namespace    http://tampermonkey.net/
// @version      4.1
// @description  可扩展悬浮工具箱，拖动/最小化/记忆位置，内置标签选择器模块
// @author       You
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';
    if (window.self !== window.top) return;

    // ==================== 全局配置 ====================
    const THEME = {
        bg: '#1a1a2e',
        surface: '#252540',
        border: '#333',
        text: '#eee',
        textSecondary: '#888',
        accent: '#4fc3f7',
        danger: '#ff8a65',
        success: '#81c784',
        warning: '#e57373',
        radius: '6px',
        panelWidth: '300px',
        minimizedSize: '44px',
    };

    // ==================== 工具函数 ====================
    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    // 全局 Toast 提示
    function showToast(msg) {
        const old = $('#toolbox-toast');
        if (old) old.remove();
        const toast = document.createElement('div');
        toast.id = 'toolbox-toast';
        toast.textContent = msg;
        Object.assign(toast.style, {
            position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)',
            zIndex: '1000000', background: THEME.bg, color: THEME.text,
            padding: '12px 24px', borderRadius: THEME.radius,
            fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: '14px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)', border: `1px solid ${THEME.border}`,
            maxWidth: '80vw', textAlign: 'center', animation: 'toolbox-toast-in 0.3s ease',
        });
        if (!$('#toolbox-toast-style')) {
            const style = document.createElement('style');
            style.id = 'toolbox-toast-style';
            style.textContent = '@keyframes toolbox-toast-in{from{opacity:0;transform:translateX(-50%) translateY(20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}';
            document.head.append(style);
        }
        document.body.append(toast);
        setTimeout(() => {
            toast.style.transition = 'opacity 0.5s';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    }

    // 位置存储
    const STORAGE_KEY = 'toolbox-pos';
    function savePosition(top, right) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ top, right })); } catch (e) {}
    }
    function loadPosition() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
            if (saved && typeof saved.top === 'number' && typeof saved.right === 'number') {
                return { top: saved.top, right: saved.right };
            }
        } catch (e) {}
        return { top: 100, right: 20 };
    }

    // 创建按钮的工厂函数（全局可用）
    function createStyledButton(text, bgColor, hoverColor, onClick) {
        const btn = document.createElement('button');
        btn.textContent = text;
        Object.assign(btn.style, {
            flex: '1', minWidth: '60px', padding: '7px 10px', border: 'none',
            borderRadius: THEME.radius, background: bgColor, color: '#1a1a2e',
            fontWeight: 'bold', fontSize: '13px', cursor: 'pointer',
            transition: 'background 0.2s, transform 0.1s',
        });
        btn.addEventListener('mouseenter', () => btn.style.background = hoverColor);
        btn.addEventListener('mouseleave', () => btn.style.background = bgColor);
        btn.addEventListener('mousedown', () => btn.style.transform = 'scale(0.97)');
        btn.addEventListener('mouseup', () => btn.style.transform = '');
        btn.addEventListener('click', onClick);
        return btn;
    }

    // 注入全局样式（含滚动条美化）
    function injectGlobalStyles() {
        if (document.getElementById('toolbox-global-style')) return;
        const css = document.createElement('style');
        css.id = 'toolbox-global-style';
        css.textContent = `
            /* 最小化状态 */
            #toolbox-panel.minimized {
                width: ${THEME.minimizedSize} !important;
                height: ${THEME.minimizedSize} !important;
                border-radius: 50% !important;
                padding: 0 !important;
                overflow: hidden !important;
                cursor: pointer !important;
            }
            #toolbox-panel.minimized > *:not(.toolbox-titlebar) {
                display: none !important;
            }
            #toolbox-panel.minimized .toolbox-title-text {
                display: none !important;
            }
            #toolbox-panel.minimized .toolbox-toggle-btn {
                font-size: 24px !important;
            }
            #toolbox-panel.minimized .toolbox-tabs {
                display: none !important;
            }

            /* 滚动条美化 - Webkit */
            .toolbox-scroll::-webkit-scrollbar {
                width: 6px;
                height: 6px;
            }
            .toolbox-scroll::-webkit-scrollbar-track {
                background: ${THEME.bg};
                border-radius: 3px;
            }
            .toolbox-scroll::-webkit-scrollbar-thumb {
                background: #555;
                border-radius: 3px;
                border: 1px solid ${THEME.border};
            }
            .toolbox-scroll::-webkit-scrollbar-thumb:hover {
                background: #777;
            }
            /* 滚动条美化 - Firefox */
            .toolbox-scroll {
                scrollbar-width: thin;
                scrollbar-color: #555 ${THEME.bg};
            }
        `;
        document.head.appendChild(css);
    }

    // ==================== 模块基类 ====================
    class BaseModule {
        constructor({ id, name, icon = '📦' }) {
            this.id = id;
            this.name = name;
            this.icon = icon;
            this.container = null;
        }
        render(container) { throw new Error('必须实现 render 方法'); }
        onActivate() {}
        onDeactivate() {}

        // 便捷方法：在模块容器内创建按钮
        createButton(text, bg, hoverBg, onClick) {
            return createStyledButton(text, bg, hoverBg, onClick);
        }

        // 便捷方法：创建复选框列表
        createCheckboxList(items, checkedValues = []) {
            const list = document.createElement('div');
            list.style.cssText = 'display:flex;flex-direction:column;gap:6px;';
            items.forEach(item => {
                const label = document.createElement('label');
                label.style.cssText = 'display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:#ccc;';
                label.addEventListener('mouseenter', () => label.style.color = '#fff');
                label.addEventListener('mouseleave', () => label.style.color = '#ccc');

                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.value = item;
                cb.checked = checkedValues.includes(item);
                cb.style.cssText = 'accent-color:#4fc3f7;width:16px;height:16px;cursor:pointer;flex-shrink:0;';
                label.appendChild(cb);
                label.appendChild(document.createTextNode(item));
                list.appendChild(label);
            });
            return list;
        }
    }

    // ==================== 工具箱主类 ====================
    class Toolbox {
        constructor() {
            this.panel = null;
            this.modules = [];
            this.activeIndex = 0;
            this.tabBtns = [];
            this.contentEl = null;
            this.isMinimized = false;
        }

        register(module) {
            if (!(module instanceof BaseModule)) return console.error('模块必须继承 BaseModule');
            this.modules.push(module);
        }

        start() {
            if (document.getElementById('toolbox-panel')) return;
            injectGlobalStyles();
            this._buildPanel();
            this._renderTabs();
            if (this.modules.length) this._switchTo(0);
            this._initDraggable();
            this._observeDOM();
            console.log('🧰 工具箱已启动，模块：', this.modules.map(m => m.name));
        }

        _buildPanel() {
            const pos = loadPosition();
            this.panel = document.createElement('div');
            this.panel.id = 'toolbox-panel';
            Object.assign(this.panel.style, {
                position: 'fixed', zIndex: '999999', background: THEME.bg,
                color: THEME.text, borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: '14px',
                border: `1px solid ${THEME.border}`, userSelect: 'none',
                width: THEME.panelWidth, boxSizing: 'border-box', padding: '12px 14px',
                top: `${pos.top}px`, right: `${pos.right}px`,
                transition: 'width 0.3s, height 0.3s, border-radius 0.3s, padding 0.3s',
            });

            // 标题栏
            const titleBar = document.createElement('div');
            titleBar.className = 'toolbox-titlebar';
            titleBar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;';
            titleBar.innerHTML = `
                <span class="toolbox-title-text" style="font-weight:bold;font-size:16px;color:${THEME.accent};">🧰 工具箱</span>
                <span class="toolbox-toggle-btn" style="cursor:pointer;font-size:20px;color:#aaa;" title="最小化">−</span>
            `;
            this.panel.appendChild(titleBar);

            // Tab 栏
            const tabBar = document.createElement('div');
            tabBar.className = 'toolbox-tabs';
            tabBar.style.cssText = 'display:flex;gap:4px;margin-bottom:10px;flex-wrap:wrap;';
            this.panel.appendChild(tabBar);

            // 内容区（带滚动条类）
            this.contentEl = document.createElement('div');
            this.contentEl.className = 'toolbox-content toolbox-scroll';
            this.contentEl.style.cssText = 'min-height:150px;max-height:400px;overflow-y:auto;';
            this.panel.appendChild(this.contentEl);

            document.body.appendChild(this.panel);
        }

        _renderTabs() {
            const tabBar = $('.toolbox-tabs', this.panel);
            tabBar.innerHTML = '';
            this.tabBtns = [];
            this.modules.forEach((mod, idx) => {
                const btn = document.createElement('button');
                btn.textContent = `${mod.icon} ${mod.name}`;
                Object.assign(btn.style, {
                    padding: '5px 10px', border: 'none', borderRadius: THEME.radius,
                    background: THEME.surface, color: '#aaa', fontSize: '12px',
                    cursor: 'pointer', transition: 'background 0.2s, color 0.2s', whiteSpace: 'nowrap',
                });
                btn.addEventListener('click', () => this._switchTo(idx));
                tabBar.appendChild(btn);
                this.tabBtns.push(btn);
            });
        }

        _switchTo(index) {
            if (index === this.activeIndex && this.contentEl.children.length > 0) return;
            const oldMod = this.modules[this.activeIndex];
            if (oldMod && oldMod.onDeactivate) oldMod.onDeactivate();

            this.activeIndex = index;
            this.tabBtns.forEach((btn, i) => {
                btn.style.background = i === index ? THEME.accent : THEME.surface;
                btn.style.color = i === index ? '#1a1a2e' : '#aaa';
            });

            this.contentEl.innerHTML = '';
            const newMod = this.modules[index];
            if (newMod) {
                newMod.render(this.contentEl);
                if (newMod.onActivate) newMod.onActivate();
            }
        }

        _initDraggable() {
            const el = this.panel;
            const toggleBtn = $('.toolbox-toggle-btn', el);
            let startX, startY, origX, origY, moved = false;

            const minimize = () => {
                this.isMinimized = true;
                el.classList.add('minimized');
                toggleBtn.textContent = '🧰';
                toggleBtn.title = '展开工具箱';
            };
            const expand = () => {
                this.isMinimized = false;
                el.classList.remove('minimized');
                toggleBtn.textContent = '−';
                toggleBtn.title = '最小化';
            };

            el.addEventListener('pointerdown', e => {
                if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'LABEL') return;
                e.preventDefault();
                startX = e.clientX;
                startY = e.clientY;
                origX = el.offsetLeft;
                origY = el.offsetTop;
                moved = false;

                const onMove = e => {
                    const dx = e.clientX - startX;
                    const dy = e.clientY - startY;
                    if (!moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
                        moved = true;
                        el.style.transition = 'none';
                    }
                    if (moved) {
                        el.style.left = `${origX + dx}px`;
                        el.style.top = `${origY + dy}px`;
                        el.style.right = 'auto';
                    }
                };
                const onUp = e => {
                    document.removeEventListener('pointermove', onMove);
                    document.removeEventListener('pointerup', onUp);
                    el.style.transition = '';
                    if (!moved) {
                        if (e.target === toggleBtn) {
                            this.isMinimized ? expand() : minimize();
                        } else if (this.isMinimized && el.contains(e.target)) {
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
                if (this.isMinimized && e.target === el) expand();
            });
        }

        _observeDOM() {
            const observer = new MutationObserver(() => {
                if (!document.getElementById('toolbox-panel')) this.start();
            });
            observer.observe(document.body, { childList: true });
        }
    }

    // ==================== 实例化工具箱 ====================
    const toolbox = new Toolbox();

    // ---------- 模块：标签批量选择器 ----------
    class TagSelectorModule extends BaseModule {
        constructor() {
            super({ id: 'tag-selector', name: '标签选择器', icon: '🏷️' });
            this.tags = [
                '准确', '错误', '无法判断', 'image', 'subject',
                'seller_filled_cpv', '答非所问(输出了其他P的V)',
                '模型幻觉(输出了无依据的V)', '商品本身信息不一致(优先级导致错误的V)',
                '类目错放', '回答不全(V只识别了一部分)', '回答多了，多余部分不冲突',
                '其他原因'
            ];
            this.statusEl = null;
        }

        render(container) {
            // 提示文字
            const tip = document.createElement('div');
            tip.style.cssText = `font-size:12px;color:${THEME.textSecondary};margin-bottom:10px;padding:4px 8px;background:${THEME.surface};border-radius:4px;`;
            tip.textContent = '💡 勾选标签后点击执行';
            container.appendChild(tip);

            // 标签复选框列表（带滚动条类）
            const listWrapper = document.createElement('div');
            listWrapper.className = 'toolbox-scroll';
            listWrapper.style.cssText = 'max-height:220px;overflow-y:auto;margin-bottom:12px;';
            const checkboxList = this.createCheckboxList(this.tags);
            listWrapper.appendChild(checkboxList);
            container.appendChild(listWrapper);

            // 按钮组
            const btnGroup = document.createElement('div');
            btnGroup.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;';
            btnGroup.appendChild(
                this.createButton('✅ 执行选中', THEME.accent, '#0288d1', () => {
                    const checked = $$('input[type="checkbox"]:checked', container).map(cb => cb.value);
                    if (!checked.length) return showToast('⚠️ 请至少选择一个标签');
                    this._executeSelection(checked);
                })
            );
            btnGroup.appendChild(
                this.createButton('🔄 全部取消', THEME.danger, '#d84315', () => this._clearAll())
            );
            btnGroup.appendChild(
                this.createButton('📌 全选', THEME.success, '#388e3c', () => {
                    $$('input[type="checkbox"]', container).forEach(cb => cb.checked = true);
                    showToast('已全选');
                })
            );
            btnGroup.appendChild(
                this.createButton('📌 全不选', THEME.warning, '#c62828', () => {
                    $$('input[type="checkbox"]', container).forEach(cb => cb.checked = false);
                    showToast('已取消全选');
                })
            );
            container.appendChild(btnGroup);

            // 状态栏
            this.statusEl = document.createElement('div');
            this.statusEl.style.cssText = `padding-top:8px;border-top:1px solid ${THEME.border};font-size:11px;color:${THEME.textSecondary};text-align:center;`;
            this.statusEl.textContent = `就绪 | ${this.tags.length} 种标签`;
            container.appendChild(this.statusEl);
        }

        async _executeSelection(targets) {
            const tags = document.querySelectorAll('.ant-tag-checkable');
            if (!tags.length) return showToast('⚠️ 未找到可操作标签');
            let selected = 0, already = 0, errors = 0;
            for (const tag of tags) {
                const text = tag.textContent.trim();
                if (!targets.includes(text)) continue;
                if (tag.classList.contains('ant-tag-checkable-checked')) {
                    already++;
                    continue;
                }
                try {
                    if (document.contains(tag)) {
                        tag.click();
                        selected++;
                        await sleep(80);
                    }
                } catch (e) {
                    errors++;
                    console.warn('点击失败:', text, e);
                }
            }
            const msg = `新选 ${selected} 个，已选 ${already} 个${errors ? ` (失败 ${errors})` : ''}`;
            this._updateStatus(msg);
            showToast(msg);
        }

        _clearAll() {
            const tags = document.querySelectorAll('.ant-tag-checkable');
            let cleared = 0;
            tags.forEach(tag => {
                if (tag.classList.contains('ant-tag-checkable-checked') && document.contains(tag)) {
                    try { tag.click(); cleared++; } catch (e) {}
                }
            });
            const msg = `已取消 ${cleared} 个选中`;
            this._updateStatus(msg);
            showToast(msg);
        }

        _updateStatus(text) {
            if (this.statusEl) {
                this.statusEl.textContent = text;
                this.statusEl.style.color = THEME.accent;
                setTimeout(() => { if (this.statusEl) this.statusEl.style.color = THEME.textSecondary; }, 3000);
            }
        }
    }

    // ---------- 示例模块：简易便签 ----------
    class QuickNoteModule extends BaseModule {
        constructor() {
            super({ id: 'quick-note', name: '便签', icon: '📝' });
        }
        render(container) {
            container.innerHTML = `
                <div style="text-align:center;color:#aaa;padding:10px 0;">
                    📝 随手记录
                    <textarea style="width:100%;height:100px;margin-top:8px;background:${THEME.surface};color:${THEME.text};border:1px solid ${THEME.border};border-radius:${THEME.radius};padding:8px;resize:vertical;" placeholder="写点什么..."></textarea>
                </div>
            `;
        }
    }

    // ==================== 注册模块 ====================
    toolbox.register(new TagSelectorModule());
    toolbox.register(new QuickNoteModule()); // 可删除此行

    // ==================== 启动 ====================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => toolbox.start());
    } else {
        toolbox.start();
    }
})();
