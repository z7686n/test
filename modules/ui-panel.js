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
        try { 
            localStorage.setItem(CONFIG.storageKey, JSON.stringify({ top: top, right: right })); 
        } catch (e) {
            if (CONFIG.debug) console.warn('保存位置失败:', e);
        }
    }

    function loadPosition() {
        try {
            var saved = JSON.parse(localStorage.getItem(CONFIG.storageKey));
            if (saved && typeof saved.top === 'number' && typeof saved.right === 'number') {
                return { top: saved.top, right: saved.right };
            }
        } catch (e) {
            if (CONFIG.debug) console.warn('加载位置失败:', e);
        }
        return { top: CONFIG.defaultPosition.top, right: CONFIG.defaultPosition.right };
    }

    // ====== 获取当前模式的标签列表 ======
    function getCurrentTags() {
        return CONFIG.modes[currentMode].tags || [];
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
            var count = tagOps.getSelectedCount();
            countEl.textContent = '已选 ' + count + ' 个';
        }
    }

    // ====== 切换标签选择 ======
    function toggleTag(tag) {
        tagOps.toggleTag(tag);
        updateTagButtons();
    }

    // ====== 更新状态栏 ======
    function updateStatus(msg, isError) {
        var bar = $('#tag-status-bar', panel);
        if (bar) {
            bar.textContent = msg || '就绪';
            bar.style.color = isError ? '#ff6b6b' : '#4fc3f7';
            setTimeout(function() { 
                if (bar) {
                    var count = tagOps.getSelectedCount();
                    var tags = getCurrentTags();
                    bar.textContent = '就绪 | ' + currentMode.toUpperCase() + ' 模式 | ' + tags.length + ' 种标签';
                    bar.style.color = '#888';
                }
            }, 3000);
        }
    }

    // ====== 切换模式 ======
    function switchMode(mode) {
        if (mode === currentMode) return;
        currentMode = mode;
        tagOps.setMode(mode);
        
        // 更新导航按钮
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

        var modeTitle = panel.querySelector('.mode-title');
        if (modeTitle) {
            modeTitle.textContent = mode.toUpperCase();
        }

        renderTags();
        updateStatus('已切换到 ' + mode.toUpperCase() + ' 模式');
        showToast('🔄 切换到 ' + mode.toUpperCase() + ' 模式');
    }

    // ====== 渲染标签按钮 ======
    function renderTags() {
        var container = $('#tag-btn-container', panel);
        if (!container) return;
        
        container.innerHTML = '';
        var tags = getCurrentTags();
        var selectedTags = tagOps.getSelectedTags();
        
        if (!tags.length) {
            container.innerHTML = '<span style="color:#888;font-size:12px;">暂无标签配置</span>';
            return;
        }
        
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
        
        var countEl = $('#selected-count', panel);
        if (countEl) {
            countEl.textContent = '已选 ' + selectedTags.size + ' 个';
        }
    }

    // ====== 构建面板 ======
    function buildPanel() {
        if (document.getElementById('tag-selector-panel')) {
            // 如果面板已存在，更新而非重建
            var existingPanel = document.getElementById('tag-selector-panel');
            if (existingPanel) {
                panel = existingPanel;
                renderTags();
                updateTagButtons();
                return;
            }
        }

        // 注入样式
        if (!document.getElementById('tag-min-style')) {
            var style = document.createElement('style');
            style.id = 'tag-min-style';
            style.textContent = 
                '#tag-selector-panel {' +
                'position:fixed;z-index:999999;background:#1a1a2e;' +
                'color:#eee;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.6);' +
                'font-family:"Segoe UI",Arial,sans-serif;font-size:13px;' +
                'border:1px solid #333;user-select:none;width:340px;' +
                'box-sizing:border-box;padding:12px 14px;' +
                'transition:width 0.3s,height 0.3s,border-radius 0.3s,padding 0.3s;' +
                'max-height:90vh;overflow-y:auto;' +
                '}' +
                '#tag-selector-panel.minimized {' +
                'width:auto !important;height:auto !important;' +
                'border-radius:20px !important;padding:6px 16px !important;' +
                'overflow:hidden !important;cursor:pointer !important
