// UI 面板模块 - 主页面导航 + CPV/SKU 子页面
window.__MODULES__ = window.__MODULES__ || {};
window.__MODULES__.ui = (function() {
    var panel = null;
    var isMinimized = false;
    var currentMode = 'cpv';
    var tagOps = window.__MODULES__.tagOps;
    var treeSelectOps = window.__MODULES__.treeSelectOps;
    var CONFIG = window.__MODULES__.CONFIG;
    var utils = window.__MODULES__.utils;
    var $ = utils.$, $$ = utils.$$, sleep = utils.sleep, showToast = utils.showToast;

    // ====== 位置存储 ======
    function savePosition(top, right) {
        try { localStorage.setItem(CONFIG.storageKey, JSON.stringify({ top: top, right: right })); } catch (e) {}
    }

    function loadPosition() {
        try {
            var saved = JSON.parse(localStorage.getItem(CONFIG.storageKey));
            if (saved && typeof saved.top === 'number' && typeof saved.right === 'number') {
                return { top: saved.top, right: saved.right };
            }
        } catch (e) {}
        return { top: CONFIG.defaultPosition.top, right: CONFIG.defaultPosition.right };
    }

    // ====== 获取当前模式的标签列表 ======
    function getCurrentTags() {
        return CONFIG.modes[currentMode].tags;
    }

    // ====== 更新标签按钮状态 ======
    function updateTagButtons() {
        var btns = $$('.tag-select-btn', panel);
        var selectedTags = tagOps.getSelectedTags();
        btns.forEach(function(btn) {
            var tag = btn.dataset.tag;
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

        var countEl = $('#selected-count', panel);
        if (countEl) {
            countEl.textContent = '已选 ' + selectedTags.size + ' 个';
        }
    }

    // ====== 切换标签选择 ======
    function toggleTag(tag) {
        tagOps.toggleTag(tag);
        updateTagButtons();
    }

    // ====== 更新状态栏 ======
    function updateStatus(msg) {
        var bar = $('#tag-status-bar', panel);
        if (bar) {
            bar.textContent = msg;
            bar.style.color = '#4fc3f7';
            setTimeout(function() { if (bar) bar.style.color = '#888'; }, 3000);
        }
    }

    // ====== 切换模式 ======
    function switchMode(mode) {
        if (mode === currentMode) return;
        currentMode = mode;
        tagOps.setMode(mode);
        
        // 更新导航按钮高亮
        var navBtns = $$('.nav-btn', panel);
        navBtns.forEach(function(btn) {
            var btnMode = btn.dataset.mode;
            if (btnMode === mode) {
                btn.classList.add('active');
                btn.style.background = '#4fc3f7';
                btn.style.color = '#1a1a2e';
            } else {
                btn.classList.remove('active');
                btn.style.background = 'transparent';
                btn.style.color = '#aaa';
            }
        });

        // 重新渲染标签按钮
        renderTags();
        
        // 更新标题
        var titleEl = $('#mode-title', panel);
        if (titleEl) {
            titleEl.textContent = mode.toUpperCase() + ' 模式';
        }
        
        showToast('🔄 切换到 ' + mode.toUpperCase() + ' 模式');
    }

    // ====== 渲染标签按钮 ======
    function renderTags() {
        var container = $('#tag-btn-container', panel);
        if (!container) return;
        
        // 清空容器
        container.innerHTML = '';
        
        var tags = getCurrentTags();
        var selectedTags = tagOps.getSelectedTags();
        
        tags.forEach(function(tag) {
            var btn = document.createElement('button');
            btn.className = 'tag-select-btn';
            btn.dataset.tag = tag;
            btn.textContent = tag;
            if (selectedTags.has(tag)) {
                btn.classList.add('active');
                btn.style.background = '#4fc3f7';
                btn.style.color = '#1a1a2e';
                btn.style.borderColor = '#4fc3f7';
            } else {
                btn.style.background = 'transparent';
                btn.style.color = '#ccc';
                btn.style.borderColor = '#444';
            }
            btn.addEventListener('click', function() { toggleTag(tag); });
            container.append(btn);
        });
        
        // 更新计数
        var countEl = $('#selected-count', panel);
        if (countEl) {
            countEl.textContent = '已选 ' + selectedTags.size + ' 个';
        }
    }

    // ====== 构建面板 ======
    function buildPanel() {
        if (document.getElementById('tag-selector-panel')) return;

        // 注入样式
        if (!document.getElementById('tag-min-style')) {
            var style = document.createElement('style');
            style.id = 'tag-min-style';
            style.textContent = 
                '#tag-selector-panel.minimized {' +
                'width:42px !important;height:42px !important;' +
                'border-radius:50% !important;padding:0 !important;' +
                'overflow:hidden !important;cursor:pointer !important;' +
                '}' +
                '#tag-selector-panel.minimized > div:not(.title-bar) { display:none !important; }' +
                '#tag-selector-panel.minimized .title-text { display:none !important; }' +
                '#tag-selector-panel.minimized .toggle-btn { font-size:22px !important; }' +
                '#tag-selector-panel.minimized .title-bar { margin-bottom:0 !important; justify-content:center !important; }' +
                '.tag-select-btn {' +
                'padding:4px 10px;border-radius:4px;border:1px solid #444;' +
                'background:transparent;color:#ccc;cursor:pointer;font-size:12px;' +
                'transition:all 0.15s ease;font-family:inherit;white-space:nowrap;' +
                '}' +
                '.tag-select-btn:hover { background:#2a2a4a; border-color:#666; }' +
                '.tag-select-btn.active { background:#4fc3f7 !important; color:#1a1a2e !important; border-color:#4fc3f7 !important; }' +
                '.action-btn {' +
                'padding:3px 10px;border-radius:3px;border:1px solid #555;' +
                'background:#252540;color:#aaa;cursor:pointer;font-size:11px;' +
                'transition:all 0.15s ease;font-family:inherit;' +
                '}' +
                '.action-btn:hover { background:#333366; color:#fff; }' +
                '.action-btn.primary { border-color:#4fc3f7; color:#4fc3f7; }' +
                '.action-btn.danger { border-color:#e57373; color:#e57373; }' +
                '.nav-btn {' +
                'padding:2px 14px;border-radius:4px;border:1px solid #444;' +
                'background:transparent;color:#aaa;cursor:pointer;font-size:13px;' +
                'font-weight:bold;transition:all 0.15s ease;font-family:inherit;' +
                '}' +
                '.nav-btn:hover { background:#2a2a4a; border-color:#666; }' +
                '.nav-btn.active { background:#4fc3f7 !important; color:#1a1a2e !important; border-color:#4fc3f7 !important; }';
            document.head.append(style);
        }

        // 创建面板
        panel = document.createElement('div');
        panel.id = 'tag-selector-panel';
        var pos = loadPosition();
        panel.style.cssText = 
            'position:fixed;z-index:999999;background:#1a1a2e;' +
            'color:#eee;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.6);' +
            'font-family:"Segoe UI",Arial,sans-serif;font-size:13px;' +
            'border:1px solid #333;user-select:none;width:340px;' +
            'box-sizing:border-box;padding:12px 14px;' +
            'top:' + pos.top + 'px;right:' + pos.right + 'px;' +
            'transition:width 0.3s,height 0.3s,border-radius 0.3s,padding 0.3s;' +
            'max-height:90vh;overflow-y:auto;';

        // ---- 标题栏（含导航） ----
        var titleBar = document.createElement('div');
        titleBar.className = 'title-bar';
        titleBar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-shrink:0;';
        
        var titleLeft = document.createElement('span');
        titleLeft.style.cssText = 'display:flex;align-items:center;gap:8px;';
        titleLeft.innerHTML = 
            '<span class="title-text" style="font-weight:bold;font-size:16px;color:#4fc3f7;">🏷️ 标注助手</span>' +
            '<span id="mode-title" style="font-size:12px;color:#aaa;background:#2a2a4a;padding:2px 8px;border-radius:3px;">CPV 模式</span>';
        
        var navGroup = document.createElement('span');
        navGroup.style.cssText = 'display:flex;gap:4px;';
        
        // CPV 导航按钮
        var cpvNavBtn = document.createElement('button');
        cpvNavBtn.className = 'nav-btn active';
        cpvNavBtn.dataset.mode = 'cpv';
        cpvNavBtn.textContent = 'CPV';
        cpvNavBtn.style.background = '#4fc3f7';
        cpvNavBtn.style.color = '#1a1a2e';
        cpvNavBtn.addEventListener('click', function() { switchMode('cpv'); });
        navGroup.append(cpvNavBtn);
        
        // SKU 导航按钮
        var skuNavBtn = document.createElement('button');
        skuNavBtn.className = 'nav-btn';
        skuNavBtn.dataset.mode = 'sku';
        skuNavBtn.textContent = 'SKU';
        skuNavBtn.addEventListener('click', function() { switchMode('sku'); });
        navGroup.append(skuNavBtn);
        
        // 最小化按钮
        var toggleBtn = document.createElement('span');
        toggleBtn.className = 'toggle-btn';
        toggleBtn.style.cssText = 'cursor:pointer;font-size:20px;color:#aaa;padding:0 6px;';
        toggleBtn.textContent = '−';
        toggleBtn.title = '最小化';
        
        titleBar.append(titleLeft);
        titleBar.append(navGroup);
        titleBar.append(toggleBtn);
        panel.append(titleBar);

        // ---- 信息栏 ----
        var infoBar = document.createElement('div');
        infoBar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-shrink:0;';
        infoBar.innerHTML = 
            '<span style="font-size:11px;color:#888;">💡 点击标签选择，再执行</span>' +
            '<span id="selected-count" style="font-size:12px;color:#4fc3f7;font-weight:bold;">已选 0 个</span>';
        panel.append(infoBar);

        // ---- 快捷操作栏 ----
        var actionBar = document.createElement('div');
        actionBar.style.cssText = 'display:flex;gap:6px;margin-bottom:8px;flex-shrink:0;';

        var selectAllBtn = document.createElement('button');
        selectAllBtn.className = 'action-btn primary';
        selectAllBtn.textContent = '📌 全部';
        selectAllBtn.addEventListener('click', function() {
            var tags = getCurrentTags();
            var allSelected = tags.every(function(t) { return tagOps.getSelectedTags().has(t); });
            if (allSelected) {
                tags.forEach(function(t) { tagOps.getSelectedTags().delete(t); });
                showToast('已取消全选');
            } else {
                tags.forEach(function(t) { tagOps.getSelectedTags().add(t); });
                showToast('已全选');
            }
            updateTagButtons();
        });
        actionBar.append(selectAllBtn);

        var clearBtn = document.createElement('button');
        clearBtn.className = 'action-btn danger';
        clearBtn.textContent = '🗑️ 清空';
        clearBtn.addEventListener('click', function() {
            tagOps.clearAll();
            updateTagButtons();
            showToast('已清空选择');
        });
        actionBar.append(clearBtn);

        var spacer = document.createElement('span');
        spacer.style.cssText = 'flex:1;';
        actionBar.append(spacer);
        panel.append(actionBar);

        // ---- 标签按钮容器 ----
        var tagContainer = document.createElement('div');
        tagContainer.id = 'tag-btn-container';
        tagContainer.style.cssText = 
            'display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px;' +
            'max-height:200px;overflow-y:auto;padding:4px 2px;' +
            'scrollbar-width:thin;scrollbar-color:#555 #1a1a2e;' +
            'flex-shrink:0;align-content:flex-start;';
        panel.append(tagContainer);

        // ---- 分割线 ----
        var divider = document.createElement('div');
        divider.style.cssText = 'border-top:1px solid #333;margin:6px 0;flex-shrink:0;';
        panel.append(divider);

        // ---- 执行按钮组 ----
        var actionGroup = document.createElement('div');
        actionGroup.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;flex-shrink:0;';

        function createBtn(text, bg, hoverBg, onClick, flex) {
            var btn = document.createElement('button');
            btn.textContent = text;
            var flexStyle = flex ? 'flex:' + flex + ';' : 'flex:1;min-width:50px;';
            btn.style.cssText = 
                flexStyle +
                'padding:5px 8px;border:none;border-radius:5px;' +
                'background:' + bg + ';color:#1a1a2e;font-weight:bold;font-size:12px;cursor:pointer;' +
                'transition:background 0.15s, transform 0.1s;' +
                'white-space:nowrap;font-family:inherit;';
            btn.addEventListener('mouseenter', function() { btn.style.background = hoverBg; });
            btn.addEventListener('mouseleave', function() { btn.style.background = bg; });
            btn.addEventListener('mousedown', function() { btn.style.transform = 'scale(0.96)'; });
            btn.addEventListener('mouseup', function() { btn.style.transform = ''; });
            btn.addEventListener('click', onClick);
            return btn;
        }

        actionGroup.append(
            createBtn('✅ 执行选中', '#4fc3f7', '#0288d1', function() {
                var tags = Array.from(tagOps.getSelectedTags());
                tagOps.selectTags(tags);
            }, '1.5')
        );
        actionGroup.append(
            createBtn('🔄 清除选中', '#ff8a65', '#d84315', function() {
                tagOps.clearAllSelections();
                updateTagButtons();
            }, '1')
        );
        panel.append(actionGroup);

        // ---- 下拉框操作 ----
        var dropdownGroup = document.createElement('div');
        dropdownGroup.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;flex-shrink:0;';
        dropdownGroup.append(
            createBtn('📋 下拉框 选"无法判断"', '#7c4dff', '#536dfe', function() {
                treeSelectOps.selectTreeSelectUnable();
            }, '2')
        );
        panel.append(dropdownGroup);

        // ---- 状态栏 ----
        var status = document.createElement('div');
        status.id = 'tag-status-bar';
        status.style.cssText = 'padding-top:6px;border-top:1px solid #333;font-size:11px;color:#888;text-align:center;flex-shrink:0;';
        status.textContent = '就绪 | CPV 模式 | ' + getCurrentTags().length + ' 种标签';
        panel.append(status);

        document.body.append(panel);
        
        // 初始化：渲染 CPV 的标签
        renderTags();
        initDraggable(panel);
    }

    // ====== 拖动和最小化 ======
    function initDraggable(el) {
        var toggleBtn = el.querySelector('.toggle-btn');
        var startX, startY, origX, origY, moved = false;
        var dragging = false;
        var isMinimizedLocal = false;

        function minimize() {
            isMinimizedLocal = true;
            isMinimized = true;
            el.classList.add('minimized');
            toggleBtn.textContent = '🏷️';
            toggleBtn.title = '展开面板';
        }

        function expand() {
            isMinimizedLocal = false;
            isMinimized = false;
            el.classList.remove('minimized');
            toggleBtn.textContent = '−';
            toggleBtn.title = '最小化';
        }

        el.addEventListener('pointerdown', function(e) {
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
            e.preventDefault();
            startX = e.clientX;
            startY = e.clientY;
            origX = el.offsetLeft;
            origY = el.offsetTop;
            moved = false;
            dragging = true;

            function onMove(e) {
                if (!dragging) return;
                var dx = e.clientX - startX;
                var dy = e.clientY - startY;
                if (!moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
                    moved = true;
                    el.style.transition = 'none';
                }
                if (moved) {
                    el.style.left = (origX + dx) + 'px';
                    el.style.top = (origY + dy) + 'px';
                    el.style.right = 'auto';
                }
            }

            function onUp(e) {
                dragging = false;
                document.removeEventListener('pointermove', onMove);
                document.removeEventListener('pointerup', onUp);
                el.style.transition = '';

                if (!moved) {
                    if (e.target === toggleBtn) {
                        isMinimizedLocal ? expand() : minimize();
                    } else if (isMinimizedLocal && el.contains(e.target)) {
                        expand();
                    }
                } else {
                    var rect = el.getBoundingClientRect();
                    savePosition(rect.top, window.innerWidth - rect.right);
                }
            }

            document.addEventListener('pointermove', onMove);
            document.addEventListener('pointerup', onUp);
        });

        el.addEventListener('click', function(e) {
            if (isMinimizedLocal && e.target === el) {
                expand();
            }
        });
    }

    // ====== 监听面板是否被意外移除 ======
    function watchPanel() {
        var observer = new MutationObserver(function() {
            if (!document.getElementById('tag-selector-panel')) {
                console.warn('面板被移除，正在重建...');
                buildPanel();
            }
        });
        observer.observe(document.body, { childList: true });
    }

    // ====== 对外暴露的启动函数 ======
    return {
        buildAndWatchPanel: function() {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function() {
                    buildPanel();
                    watchPanel();
                });
            } else {
                buildPanel();
                watchPanel();
            }
        }
    };
})();
