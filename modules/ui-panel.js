// UI 面板模块 - 分组布局 + 模板管理
window.__MODULES__ = window.__MODULES__ || {};
window.__MODULES__.ui = (function() {
    var panel = null;
    var isMinimized = false;
    var tagOps = window.__MODULES__.tagOps;
    var treeSelectOps = window.__MODULES__.treeSelectOps;
    var templateManager = window.__MODULES__.templateManager;
    var CONFIG = window.__MODULES__.CONFIG;
    var utils = window.__MODULES__.utils;
    var $ = utils.$, $$ = utils.$$, showToast = utils.showToast;
    
    // 分组折叠状态
    var groupCollapsed = {};

    // ====== 位置存储 ======
    function savePosition(top, right) {
        try { 
            localStorage.setItem(CONFIG.storageKey, JSON.stringify({ top: top, right: right })); 
        } catch (e) {}
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

    // ====== 获取分组标签 ======
    function getGroupTags(groupId) {
        var template = templateManager.getCurrentTemplate();
        if (template) {
            var group = template.groups.find(function(g) { return g.groupId === groupId; });
            if (group) return group.tags;
        }
        // 回退到默认配置
        var configGroup = CONFIG.groups.find(function(g) { return g.id === groupId; });
        return configGroup ? configGroup.defaultTags : [];
    }

    // ====== 更新标签按钮状态 ======
    function updateTagButtons() {
        var groups = CONFIG.groups;
        groups.forEach(function(group) {
            var container = $('#group-' + group.id + '-tags', panel);
            if (!container) return;
            
            var btns = $$('.tag-select-btn', container);
            var selectedTags = tagOps.getGroupSelections(group.id);
            
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
            
            var countEl = $('#group-' + group.id + '-count', panel);
            if (countEl) {
                countEl.textContent = selectedTags.size + '/' + getGroupTags(group.id).length;
            }
        });
    }

    // ====== 切换标签选择 ======
    function toggleTag(groupId, tag) {
        tagOps.toggleTag(groupId, tag);
        updateTagButtons();
        updateStatus();
    }

    // ====== 更新状态栏 ======
    function updateStatus(msg) {
        var bar = $('#tag-status-bar', panel);
        if (bar) {
            var total = tagOps.getSelectedCount();
            var groups = CONFIG.groups;
            var statusParts = [];
            groups.forEach(function(g) {
                var count = tagOps.getSelectedCount(g.id);
                statusParts.push(g.label + ': ' + count);
            });
            bar.textContent = msg || '就绪 | ' + statusParts.join(' | ') + ' | 总计: ' + total;
            if (msg) {
                bar.style.color = '#4fc3f7';
                setTimeout(function() { 
                    if (bar) bar.style.color = '#888'; 
                }, 3000);
            }
        }
    }

    // ====== 渲染分组标签 ======
    function renderGroup(group) {
        var container = $('#group-' + group.id + '-tags', panel);
        if (!container) return;
        
        container.innerHTML = '';
        var tags = getGroupTags(group.id);
        var selectedTags = tagOps.getGroupSelections(group.id);
        
        if (!tags || !tags.length) {
            container.innerHTML = '<span style="color:#666;font-size:12px;">暂无标签，请保存模板</span>';
            return;
        }
        
        tags.forEach(function(tag) {
            if (!tag) return;
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
            btn.addEventListener('click', function() { 
                toggleTag(group.id, tag); 
            });
            container.append(btn);
        });
        
        var countEl = $('#group-' + group.id + '-count', panel);
        if (countEl) {
            countEl.textContent = selectedTags.size + '/' + tags.length;
        }
    }

    // ====== 切换分组折叠 ======
    function toggleGroup(groupId) {
        var content = $('#group-' + groupId + '-content', panel);
        var btn = $('#group-' + groupId + '-toggle', panel);
        if (content) {
            var isCollapsed = groupCollapsed[groupId];
            if (isCollapsed) {
                content.style.display = 'block';
                if (btn) btn.textContent = '▼';
                groupCollapsed[groupId] = false;
            } else {
                content.style.display = 'none';
                if (btn) btn.textContent = '▶';
                groupCollapsed[groupId] = true;
            }
        }
    }

    // ====== 渲染所有分组 ======
    function renderGroups() {
        var container = $('#groups-container', panel);
        if (!container) return;
        
        container.innerHTML = '';
        var groups = CONFIG.groups;
        var template = templateManager.getCurrentTemplate();
        
        groups.forEach(function(group) {
            var groupDiv = document.createElement('div');
            groupDiv.className = 'group-container';
            groupDiv.style.cssText = 'margin-bottom:10px;border:1px solid #333;border-radius:6px;padding:6px 8px;';
            
            // 分组标题栏
            var header = document.createElement('div');
            header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;cursor:pointer;';
            header.addEventListener('click', function() { toggleGroup(group.id); });
            
            var titleLeft = document.createElement('span');
            titleLeft.style.cssText = 'display:flex;align-items:center;gap:6px;';
            titleLeft.innerHTML = 
                '<span style="font-size:14px;">' + group.icon + '</span>' +
                '<span style="font-size:13px;font-weight:bold;color:#ddd;">' + group.label + '</span>' +
                '<span style="font-size:11px;color:#666;">(' + (group.type === 'radio' ? '单选' : '多选') + ')</span>';
            
            var titleRight = document.createElement('span');
            titleRight.style.cssText = 'display:flex;align-items:center;gap:6px;';
            titleRight.innerHTML = 
                '<span id="group-' + group.id + '-count" style="font-size:11px;color:#4fc3f7;">0/' + getGroupTags(group.id).length + '</span>' +
                '<span id="group-' + group.id + '-toggle" style="font-size:12px;color:#888;">▼</span>';
            
            header.append(titleLeft);
            header.append(titleRight);
            groupDiv.append(header);
            
            // 标签内容
            var content = document.createElement('div');
            content.id = 'group-' + group.id + '-content';
            content.style.cssText = 'margin-top:6px;';
            
            var tagsContainer = document.createElement('div');
            tagsContainer.id = 'group-' + group.id + '-tags';
            tagsContainer.style.cssText = 
                'display:flex;flex-wrap:wrap;gap:4px;padding:2px 0;' +
                'max-height:150px;overflow-y:auto;';
            content.append(tagsContainer);
            
            groupDiv.append(content);
            container.append(groupDiv);
            
            // 初始展开状态
            groupCollapsed[group.id] = false;
        });
        
        // 渲染每个分组的标签
        groups.forEach(function(group) {
            renderGroup(group);
        });
    }

    // ====== 构建面板 ======
    function buildPanel() {
        if (document.getElementById('tag-selector-panel')) {
            var existingPanel = document.getElementById('tag-selector-panel');
            if (existingPanel) {
                panel = existingPanel;
                renderGroups();
                updateTagButtons();
                updateStatus();
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
                'border:1px solid #333;user-select:none;width:380px;' +
                'box-sizing:border-box;padding:12px 14px;' +
                'transition:width 0.3s,height 0.3s,border-radius 0.3s,padding 0.3s;' +
                'max-height:90vh;overflow-y:auto;' +
                '}' +
                '#tag-selector-panel.minimized {' +
                'width:auto !important;height:auto !important;' +
                'border-radius:20px !important;padding:6px 16px !important;' +
                'overflow:hidden !important;cursor:pointer !important;' +
                'min-width:120px !important;' +
                'background:#1a1a2e !important;' +
                'border:1px solid #4fc3f7 !important;' +
                'box-shadow:0 4px 20px rgba(0,0,0,0.6) !important;' +
                '}' +
                '#tag-selector-panel.minimized > div:not(.title-bar) { display:none !important; }' +
                '#tag-selector-panel.minimized .title-text { display:inline !important; font-size:14px !important; }' +
                '#tag-selector-panel.minimized .nav-btn { display:none !important; }' +
                '#tag-selector-panel.minimized .mode-title { display:none !important; }' +
                '#tag-selector-panel.minimized .toggle-btn { font-size:16px !important; margin-left:8px !important; }' +
                '#tag-selector-panel.minimized .title-bar { margin-bottom:0 !important; justify-content:space-between !important; width:100% !important; }' +
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
                '.action-btn.success { border-color:#81c784; color:#81c784; }' +
                '.nav-btn {' +
                'padding:2px 14px;border-radius:4px;border:1px solid #444;' +
                'background:transparent;color:#aaa;cursor:pointer;font-size:13px;' +
                'font-weight:bold;transition:all 0.15s ease;font-family:inherit;' +
                '}' +
                '.nav-btn:hover { background:#2a2a4a; border-color:#666; }' +
                '.nav-btn.active { background:#4fc3f7 !important; color:#1a1a2e !important; border-color:#4fc3f7 !important; }' +
                '.mode-title {' +
                'font-size:12px;color:#aaa;background:#2a2a4a;padding:2px 8px;border-radius:3px;' +
                '}';
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
            'border:1px solid #333;user-select:none;width:380px;' +
            'box-sizing:border-box;padding:12px 14px;' +
            'top:' + pos.top + 'px;right:' + pos.right + 'px;' +
            'transition:width 0.3s,height 0.3s,border-radius 0.3s,padding 0.3s;' +
            'max-height:90vh;overflow-y:auto;';

        // ---- 标题栏 ----
        var titleBar = document.createElement('div');
        titleBar.className = 'title-bar';
        titleBar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-shrink:0;';

        var titleLeft = document.createElement('span');
        titleLeft.style.cssText = 'display:flex;align-items:center;gap:8px;';
        titleLeft.innerHTML = 
            '<span class="title-text" style="font-weight:bold;font-size:16px;color:#4fc3f7;">🏷️ 标注助手</span>';

        // 模板选择器
        var templateSelector = document.createElement('select');
        templateSelector.id = 'template-selector';
        templateSelector.style.cssText = 
            'background:#2a2a4a;color:#ddd;border:1px solid #444;border-radius:4px;' +
            'padding:2px 6px;font-size:11px;font-family:inherit;cursor:pointer;max-width:120px;';
        templateSelector.addEventListener('change', function() {
            var val = this.value;
            if (val === '__create__') {
                createNewTemplate();
            } else if (val === '__auto__') {
                templateManager.autoDetectTemplate();
                refreshUI();
            } else {
                templateManager.switchTemplate(val);
                refreshUI();
            }
        });
        
        function updateTemplateSelector() {
            var currentId = templateManager.getCurrentId();
            var list = templateManager.getTemplateList();
            templateSelector.innerHTML = '';
            
            var defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = '选择模板...';
            templateSelector.append(defaultOption);
            
            var autoOption = document.createElement('option');
            autoOption.value = '__auto__';
            autoOption.textContent = '🔍 自动检测';
            templateSelector.append(autoOption);
            
            list.forEach(function(t) {
                var opt = document.createElement('option');
                opt.value = t.id;
                opt.textContent = t.name;
                if (t.id === currentId) opt.selected = true;
                templateSelector.append(opt);
            });
            
            var createOption = document.createElement('option');
            createOption.value = '__create__';
            createOption.textContent = '➕ 新建模板';
            templateSelector.append(createOption);
        }
        
        titleLeft.append(templateSelector);
        
        var toggleBtn = document.createElement('span');
        toggleBtn.className = 'toggle-btn';
        toggleBtn.style.cssText = 'cursor:pointer;font-size:20px;color:#aaa;padding:0 6px;';
        toggleBtn.textContent = '−';
        toggleBtn.title = '最小化';

        titleBar.append(titleLeft);
        titleBar.append(toggleBtn);
        panel.append(titleBar);

        // ---- 模板操作栏 ----
        var templateBar = document.createElement('div');
        templateBar.style.cssText = 'display:flex;gap:4px;margin-bottom:8px;flex-shrink:0;flex-wrap:wrap;';
        
        var saveTemplateBtn = document.createElement('button');
        saveTemplateBtn.className = 'action-btn success';
        saveTemplateBtn.textContent = '💾 保存模板';
        saveTemplateBtn.addEventListener('click', function() {
            var name = prompt('请输入模板名称:', '模板-' + new Date().toLocaleDateString());
            if (name) {
                templateManager.createTemplate(name);
                updateTemplateSelector();
                refreshUI();
            }
        });
        templateBar.append(saveTemplateBtn);
        
        var deleteTemplateBtn = document.createElement('button');
        deleteTemplateBtn.className = 'action-btn danger';
        deleteTemplateBtn.textContent = '🗑️ 删除';
        deleteTemplateBtn.addEventListener('click', function() {
            var currentId = templateManager.getCurrentId();
            if (currentId && confirm('确定要删除当前模板吗？')) {
                templateManager.deleteTemplate(currentId);
                updateTemplateSelector();
                refreshUI();
            }
        });
        templateBar.append(deleteTemplateBtn);
        
        var refreshBtn = document.createElement('button');
        refreshBtn.className = 'action-btn';
        refreshBtn.textContent = '🔄 刷新';
        refreshBtn.addEventListener('click', function() {
            refreshUI();
        });
        templateBar.append(refreshBtn);
        
        panel.append(templateBar);

        // ---- 分组容器 ----
        var groupsContainer = document.createElement('div');
        groupsContainer.id = 'groups-container';
        groupsContainer.style.cssText = 'margin-bottom:8px;flex-shrink:0;';
        panel.append(groupsContainer);

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
                var tags = tagOps.getAllSelectedTags();
                if (tags.length === 0) {
                    showToast('⚠️ 请先选择要执行的标签', true);
                    return;
                }
                tagOps.selectTags(tags).then(function() {
                    updateStatus('执行完成');
                }).catch(function(err) {
                    updateStatus('执行失败: ' + err.message, true);
                });
            }, '1.5')
        );
        actionGroup.append(
            createBtn('🔄 清除选中', '#ff8a65', '#d84315', function() {
                tagOps.clearAllSelections();
                updateTagButtons();
                updateStatus('已清除所有选中');
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
        status.textContent = '就绪';
        panel.append(status);

        document.body.append(panel);
        
        // 渲染所有内容
        renderGroups();
        updateTemplateSelector();
        updateTagButtons();
        updateStatus();
        initDraggable(panel);
    }

    // ====== 刷新UI ======
    function refreshUI() {
        renderGroups();
        updateTemplateSelector();
        updateTagButtons();
        updateStatus('已刷新');
        showToast('🔄 面板已刷新');
    }

    // ====== 创建新模板 ======
    function createNewTemplate() {
        var name = prompt('请输入模板名称:', '模板-' + new Date().toLocaleDateString());
        if (name) {
            var desc = prompt('请输入模板描述（可选）:', '');
            var template = templateManager.createTemplate(name, desc || '');
            if (template) {
                updateTemplateSelector();
                refreshUI();
            }
        }
        // 恢复选择器状态
        var selector = $('#template-selector', panel);
        if (selector) {
            var currentId = templateManager.getCurrentId();
            var options = selector.options;
            for (var i = 0; i < options.length; i++) {
                if (options[i].value === currentId) {
                    options[i].selected = true;
                    break;
                }
            }
        }
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
            if (toggleBtn) {
                toggleBtn.textContent = '➕';
                toggleBtn.title = '展开面板';
            }
        }

        function expand() {
            isMinimizedLocal = false;
            isMinimized = false;
            el.classList.remove('minimized');
            if (toggleBtn) {
                toggleBtn.textContent = '−';
                toggleBtn.title = '最小化';
            }
        }

        el.addEventListener('pointerdown', function(e) {
            if (e.target.tagName === 'BUTTON' || e.target.closest('button') || 
                e.target.tagName === 'SELECT' || e.target.closest('select')) return;
            
            e.preventDefault();
            startX = e.clientX;
            startY = e.clientY;
            origX = el.offsetLeft;
            origY = el.offsetTop;
            moved = false;
            dragging = true;
            el.style.cursor = 'grabbing';

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
                el.style.cursor = '';
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
                if (CONFIG.debug) console.warn('面板被移除，正在重建...');
                buildPanel();
            }
        });
        observer.observe(document.body, { childList: true });
        return observer;
    }

    // ====== 对外暴露的启动函数 ======
    return {
        buildAndWatchPanel: function() {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function() {
                    buildPanel();
                    watchPanel();
                    // 尝试自动检测模板
                    setTimeout(function() {
                        if (!templateManager.getCurrentTemplate()) {
                            templateManager.autoDetectTemplate();
                            refreshUI();
                        }
                    }, 1000);
                });
            } else {
                buildPanel();
                watchPanel();
                setTimeout(function() {
                    if (!templateManager.getCurrentTemplate()) {
                        templateManager.autoDetectTemplate();
                        refreshUI();
                    }
                }, 1000);
            }
        },
        
        refreshUI: refreshUI,
        
        getPanelState: function() {
            return {
                isMinimized: isMinimized,
                selectedCount: tagOps.getSelectedCount(),
                templateId: templateManager.getCurrentId()
            };
        }
    };
})();
