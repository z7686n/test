window.__MODULES__ = window.__MODULES__ || {};
window.__MODULES__.ui = (function() {
    var CONFIG = window.__MODULES__.CONFIG;
    var utils = window.__MODULES__.utils;
    var tagOps = window.__MODULES__.tagOps;
    var templateManager = window.__MODULES__.templateManager;
    var $ = utils.$, $$ = utils.$$, showToast = utils.showToast;
    
    var panel = null;
    var isMinimized = false;
    
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
    
    function getGroupTags(groupId) {
        var template = templateManager.getCurrentTemplate();
        if (template && template.groups) {
            var group = template.groups.find(function(g) { return g.groupId === groupId; });
            if (group && group.tags) {
                return group.tags;
            }
        }
        return [];
    }
    
    function updateButtons() {
        var groups = CONFIG.groups;
        groups.forEach(function(group) {
            var container = $('#group-' + group.id + '-tags');
            if (!container) return;
            
            var btns = $$('.tag-btn', container);
            var selected = tagOps.getGroupSelections(group.id);
            
            btns.forEach(function(btn) {
                var tag = btn.dataset.tag;
                if (selected.has(tag)) {
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
            
            var countEl = $('#group-' + group.id + '-count');
            if (countEl) {
                countEl.textContent = selected.size + '/' + getGroupTags(group.id).length;
            }
        });
        
        updateStatus();
    }
    
    function toggleTag(groupId, tag) {
        var tags = getGroupTags(groupId);
        var isRadio = tags.length <= 1;
        var selected = tagOps.getGroupSelections(groupId);
        if (selected.size > 0 && !selected.has(tag)) {
            isRadio = true;
        }
        
        tagOps.toggleTag(groupId, tag, isRadio);
        updateButtons();
    }
    
    function updateStatus(msg) {
        var bar = $('#tag-status-bar');
        if (bar) {
            var total = tagOps.getSelectedCount();
            var parts = [];
            CONFIG.groups.forEach(function(g) {
                var count = tagOps.getSelectedCount(g.id);
                parts.push(g.label + ': ' + count);
            });
            bar.textContent = msg || '就绪 | ' + parts.join(' | ') + ' | 总计: ' + total;
            if (msg) {
                bar.style.color = '#4fc3f7';
                setTimeout(function() { if (bar) bar.style.color = '#888'; }, 3000);
            }
        }
    }
    
    function renderUI() {
        var container = $('#groups-container');
        if (!container) return;
        
        container.innerHTML = '';
        var groups = CONFIG.groups;
        
        groups.forEach(function(group) {
            var tags = getGroupTags(group.id);
            
            var groupDiv = document.createElement('div');
            groupDiv.className = 'group-container';
            groupDiv.style.cssText = 'margin-bottom:8px;border:1px solid #333;border-radius:6px;padding:6px 8px;';
            
            var header = document.createElement('div');
            header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;';
            
            var title = document.createElement('span');
            title.style.cssText = 'font-size:13px;font-weight:bold;color:#ddd;';
            title.textContent = group.icon + ' ' + group.label;
            
            var count = document.createElement('span');
            count.id = 'group-' + group.id + '-count';
            count.style.cssText = 'font-size:11px;color:#4fc3f7;';
            var selected = tagOps.getGroupSelections(group.id);
            count.textContent = selected.size + '/' + tags.length;
            
            header.append(title);
            header.append(count);
            groupDiv.append(header);
            
            var tagContainer = document.createElement('div');
            tagContainer.id = 'group-' + group.id + '-tags';
            tagContainer.style.cssText = 
                'display:flex;flex-wrap:wrap;gap:4px;padding:2px 0;' +
                'max-height:120px;overflow-y:auto;';
            
            tags.forEach(function(tag) {
                if (!tag) return;
                var btn = document.createElement('button');
                btn.className = 'tag-btn';
                btn.dataset.tag = tag;
                btn.textContent = tag;
                btn.style.cssText = 
                    'padding:3px 10px;border-radius:4px;border:1px solid #444;' +
                    'background:transparent;color:#ccc;cursor:pointer;font-size:12px;' +
                    'transition:all 0.15s ease;font-family:inherit;white-space:nowrap;';
                
                if (tagOps.isTagSelected(group.id, tag)) {
                    btn.classList.add('active');
                    btn.style.background = '#4fc3f7';
                    btn.style.color = '#1a1a2e';
                    btn.style.borderColor = '#4fc3f7';
                }
                
                btn.addEventListener('click', function() {
                    toggleTag(group.id, tag);
                });
                
                tagContainer.append(btn);
            });
            
            groupDiv.append(tagContainer);
            container.append(groupDiv);
        });
        
        updateButtons();
    }
    
    function updateSelector() {
        var selector = $('#template-selector');
        if (!selector) return;
        
        var currentId = templateManager.getCurrentId();
        var list = templateManager.getTemplateList();
        
        selector.innerHTML = '';
        
        var defaultOpt = document.createElement('option');
        defaultOpt.value = '';
        defaultOpt.textContent = '-- 选择模板 --';
        selector.append(defaultOpt);
        
        list.forEach(function(t) {
            var opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = t.name;
            if (t.id === currentId) opt.selected = true;
            selector.append(opt);
        });
        
        var createOpt = document.createElement('option');
        createOpt.value = '__create__';
        createOpt.textContent = '+ 新建模板';
        selector.append(createOpt);
        
        var autoOpt = document.createElement('option');
        autoOpt.value = '__auto__';
        autoOpt.textContent = '🔍 自动检测';
        selector.append(autoOpt);
    }
    
    function buildPanel() {
        var oldPanel = document.getElementById('tag-selector-panel');
        if (oldPanel) oldPanel.remove();
        
        if (!document.getElementById('tag-style')) {
            var style = document.createElement('style');
            style.id = 'tag-style';
            style.textContent = `
                #tag-selector-panel {
                    position: fixed; z-index: 999999;
                    background: #1a1a2e; color: #eee;
                    border-radius: 12px; border: 1px solid #333;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.6);
                    font-family: "Segoe UI", Arial, sans-serif;
                    font-size: 13px; user-select: none;
                    width: 360px; padding: 12px 14px;
                    max-height: 90vh; overflow-y: auto;
                    box-sizing: border-box;
                }
                #tag-selector-panel.minimized {
                    width: auto !important; height: auto !important;
                    padding: 6px 16px !important;
                    border-radius: 20px !important;
                    min-width: 120px !important;
                }
                #tag-selector-panel.minimized > div:not(.title-bar) {
                    display: none !important;
                }
                #tag-selector-panel.minimized .title-text {
                    display: inline !important;
                    font-size: 14px !important;
                }
                #tag-selector-panel.minimized .toggle-btn {
                    font-size: 16px !important;
                    margin-left: 8px !important;
                }
                #tag-selector-panel.minimized .title-bar {
                    margin-bottom: 0 !important;
                }
                .tag-btn.active {
                    background: #4fc3f7 !important;
                    color: #1a1a2e !important;
                    border-color: #4fc3f7 !important;
                }
                .action-btn {
                    padding: 4px 12px; border-radius: 4px;
                    border: 1px solid #555; background: #252540;
                    color: #aaa; cursor: pointer; font-size: 12px;
                    transition: all 0.15s ease;
                    font-family: inherit;
                }
                .action-btn:hover { background: #333366; color: #fff; }
                .action-btn.primary { border-color: #4fc3f7; color: #4fc3f7; }
                .action-btn.danger { border-color: #e57373; color: #e57373; }
                .action-btn.success { border-color: #81c784; color: #81c784; }
                #template-selector {
                    background: #2a2a4a; color: #ddd;
                    border: 1px solid #444; border-radius: 4px;
                    padding: 2px 6px; font-size: 12px;
                    font-family: inherit; cursor: pointer;
                    max-width: 130px;
                }
                .group-container {
                    margin-bottom: 8px;
                    border: 1px solid #333;
                    border-radius: 6px;
                    padding: 6px 8px;
                }
            `;
            document.head.append(style);
        }
        
        var pos = loadPosition();
        panel = document.createElement('div');
        panel.id = 'tag-selector-panel';
        panel.style.cssText = 
            'position:fixed;z-index:999999;background:#1a1a2e;' +
            'color:#eee;border-radius:12px;border:1px solid #333;' +
            'box-shadow:0 8px 32px rgba(0,0,0,0.6);' +
            'font-family:"Segoe UI",Arial,sans-serif;font-size:13px;' +
            'user-select:none;width:360px;padding:12px 14px;' +
            'max-height:90vh;overflow-y:auto;box-sizing:border-box;' +
            'top:' + pos.top + 'px;right:' + pos.right + 'px;';
        
        var titleBar = document.createElement('div');
        titleBar.className = 'title-bar';
        titleBar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-shrink:0;';
        
        var titleLeft = document.createElement('span');
        titleLeft.style.cssText = 'display:flex;align-items:center;gap:6px;';
        titleLeft.innerHTML = '<span class="title-text" style="font-weight:bold;font-size:16px;color:#4fc3f7;">🏷️ 标注助手</span>';
        
        var selector = document.createElement('select');
        selector.id = 'template-selector';
        selector.style.cssText = 
            'background:#2a2a4a;color:#ddd;border:1px solid #444;' +
            'border-radius:4px;padding:2px 6px;font-size:12px;' +
            'font-family:inherit;cursor:pointer;max-width:130px;';
        selector.addEventListener('change', function() {
            var val = this.value;
            if (val === '__create__') {
                var name = prompt('请输入模板名称:');
                if (name) {
                    var tpl = templateManager.createTemplate(name);
                    if (tpl) {
                        updateSelector();
                        renderUI();
                    }
                }
                var currentId = templateManager.getCurrentId();
                if (currentId) {
                    this.value = currentId;
                }
            } else if (val === '__auto__') {
                var result = templateManager.autoDetectAndApply();
                if (result) {
                    updateSelector();
                    renderUI();
                    showToast('✅ 已自动匹配模板');
                }
            } else if (val) {
                templateManager.switchTemplate(val);
                renderUI();
            }
        });
        titleLeft.append(selector);
        
        var toggleBtn = document.createElement('span');
        toggleBtn.className = 'toggle-btn';
        toggleBtn.style.cssText = 'cursor:pointer;font-size:20px;color:#aaa;padding:0 6px;';
        toggleBtn.textContent = '−';
        toggleBtn.title = '最小化';
        
        titleBar.append(titleLeft);
        titleBar.append(toggleBtn);
        panel.append(titleBar);
        
        var groupsContainer = document.createElement('div');
        groupsContainer.id = 'groups-container';
        groupsContainer.style.cssText = 'margin-bottom:8px;flex-shrink:0;';
        panel.append(groupsContainer);
        
        var btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;flex-shrink:0;';
        
        var execBtn = document.createElement('button');
        execBtn.className = 'action-btn primary';
        execBtn.textContent = '✅ 执行选中';
        execBtn.style.cssText = 'flex:2;padding:5px 8px;border:none;border-radius:5px;' +
            'background:#4fc3f7;color:#1a1a2e;font-weight:bold;font-size:12px;cursor:pointer;';
        execBtn.addEventListener('click', function() {
            var tags = tagOps.getAllSelectedTags();
            if (tags.length === 0) {
                showToast('⚠️ 请先选择标签', true);
                return;
            }
            tagOps.selectTags(tags).catch(function(err) {
                showToast('❌ 执行失败: ' + err.message, true);
            });
        });
        btnRow.append(execBtn);
        
        var clearBtn = document.createElement('button');
        clearBtn.className = 'action-btn danger';
        clearBtn.textContent = '🔄 清除';
        clearBtn.style.cssText = 'flex:1;padding:5px 8px;border:none;border-radius:5px;' +
            'background:#ff8a65;color:#1a1a2e;font-weight:bold;font-size:12px;cursor:pointer;';
        clearBtn.addEventListener('click', function() {
            tagOps.clearAllSelections();
            updateButtons();
            showToast('已清除所有选中');
        });
        btnRow.append(clearBtn);
        panel.append(btnRow);
        
        var dropdownRow = document.createElement('div');
        dropdownRow.style.cssText = 'display:flex;gap:6px;margin-bottom:6px;flex-shrink:0;';
        
        var dropdownBtn = document.createElement('button');
        dropdownBtn.className = 'action-btn';
        dropdownBtn.textContent = '📋 下拉框选"无法判断"';
        dropdownBtn.style.cssText = 'flex:1;padding:4px 8px;border:none;border-radius:5px;' +
            'background:#7c4dff;color:#fff;font-weight:bold;font-size:12px;cursor:pointer;';
        dropdownBtn.addEventListener('click', function() {
            var treeSelectOps = window.__MODULES__.treeSelectOps;
            if (treeSelectOps) {
                treeSelectOps.selectTreeSelectUnable();
            }
        });
        dropdownRow.append(dropdownBtn);
        panel.append(dropdownRow);
        
        var statusBar = document.createElement('div');
        statusBar.id = 'tag-status-bar';
        statusBar.style.cssText = 'padding-top:6px;border-top:1px solid #333;font-size:11px;color:#888;text-align:center;flex-shrink:0;';
        statusBar.textContent = '就绪';
        panel.append(statusBar);
        
        document.body.append(panel);
        
        updateSelector();
        renderUI();
        initDraggable(panel);
    }
    
    function initDraggable(el) {
        var toggleBtn = el.querySelector('.toggle-btn');
        var startX, startY, origX, origY, moved = false;
        var dragging = false;
        
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
                        if (isMinimized) {
                            isMinimized = false;
                            el.classList.remove('minimized');
                            toggleBtn.textContent = '−';
                            toggleBtn.title = '最小化';
                        } else {
                            isMinimized = true;
                            el.classList.add('minimized');
                            toggleBtn.textContent = '➕';
                            toggleBtn.title = '展开面板';
                        }
                    } else if (isMinimized && el.contains(e.target)) {
                        isMinimized = false;
                        el.classList.remove('minimized');
                        toggleBtn.textContent = '−';
                        toggleBtn.title = '最小化';
                    }
                } else {
                    var rect = el.getBoundingClientRect();
                    savePosition(rect.top, window.innerWidth - rect.right);
                }
            }
            
            document.addEventListener('pointermove', onMove);
            document.addEventListener('pointerup', onUp);
        });
    }
    
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
    
    return {
        buildAndWatchPanel: function() {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function() {
                    buildPanel();
                    watchPanel();
                    setTimeout(function() {
                        if (!templateManager.getCurrentTemplate()) {
                            templateManager.autoDetectAndApply();
                            updateSelector();
                            renderUI();
                        }
                    }, 1000);
                });
            } else {
                buildPanel();
                watchPanel();
                setTimeout(function() {
                    if (!templateManager.getCurrentTemplate()) {
                        templateManager.autoDetectAndApply();
                        updateSelector();
                        renderUI();
                    }
                }, 1000);
            }
        },
        
        refreshUI: function() {
            renderUI();
            updateSelector();
            showToast('🔄 面板已刷新');
        }
    };
})();
