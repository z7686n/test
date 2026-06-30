// 标签操作模块 - 支持分组管理
window.__MODULES__ = window.__MODULES__ || {};
window.__MODULES__.tagOps = (function() {
    var CONFIG = window.__MODULES__.CONFIG;
    var utils = window.__MODULES__.utils;
    var showToast = utils.showToast;
    var sleep = utils.sleep;
    var templateManager = window.__MODULES__.templateManager;
    
    // 当前选中的标签（按分组存储）
    var selections = {};
    var currentMode = 'cpv';
    var isProcessing = false;
    var operationTimeout = null;
    
    // 初始化选择状态
    function initSelections() {
        var groups = CONFIG.groups;
        groups.forEach(function(group) {
            if (!selections[group.id]) {
                selections[group.id] = new Set();
            }
        });
    }
    initSelections();
    
    // ========== 状态持久化 ==========
    function saveSelections() {
        try {
            var data = {};
            for (var key in selections) {
                data[key] = Array.from(selections[key]);
            }
            localStorage.setItem(CONFIG.selectionStorageKey, JSON.stringify(data));
        } catch (e) {
            if (CONFIG.debug) console.warn('保存选择状态失败:', e);
        }
    }

    function loadSelections() {
        try {
            var data = utils.safeJSONParse(localStorage.getItem(CONFIG.selectionStorageKey));
            if (data) {
                for (var key in data) {
                    if (selections[key]) {
                        selections[key] = new Set(data[key]);
                    }
                }
                return true;
            }
        } catch (e) {
            if (CONFIG.debug) console.warn('加载选择状态失败:', e);
        }
        return false;
    }
    loadSelections();

    // ========== 核心方法 ==========
    return {
        // 获取分组配置
        getGroups: function() {
            return CONFIG.groups;
        },
        
        // 获取指定分组的选中标签
        getGroupSelections: function(groupId) {
            return selections[groupId] || new Set();
        },
        
        // 获取所有选中的标签（用于执行）
        getAllSelectedTags: function() {
            var allTags = [];
            for (var key in selections) {
                selections[key].forEach(function(tag) {
                    allTags.push(tag);
                });
            }
            return allTags;
        },
        
        // 切换标签选择（按分组）
        toggleTag: function(groupId, tag) {
            if (!selections[groupId]) {
                selections[groupId] = new Set();
            }
            var set = selections[groupId];
            
            // 检查是否是单选组
            var group = CONFIG.groups.find(function(g) { return g.id === groupId; });
            if (group && group.type === 'radio') {
                // 单选：清空该组其他选择
                set.clear();
                set.add(tag);
            } else {
                // 多选：切换
                if (set.has(tag)) {
                    set.delete(tag);
                } else {
                    set.add(tag);
                }
            }
            saveSelections();
            return set;
        },
        
        // 清空指定分组
        clearGroup: function(groupId) {
            if (selections[groupId]) {
                selections[groupId].clear();
                saveSelections();
            }
        },
        
        // 清空所有分组
        clearAll: function() {
            for (var key in selections) {
                selections[key].clear();
            }
            saveSelections();
        },
        
        // 获取选中数量
        getSelectedCount: function(groupId) {
            if (groupId) {
                return selections[groupId] ? selections[groupId].size : 0;
            }
            var total = 0;
            for (var key in selections) {
                total += selections[key].size;
            }
            return total;
        },
        
        // 检查标签是否被选中
        isTagSelected: function(groupId, tag) {
            if (!selections[groupId]) return false;
            return selections[groupId].has(tag);
        },

        // 核心：执行选中标签
        selectTags: async function(targets) {
            if (isProcessing) {
                showToast('⏳ 正在执行中，请稍候...');
                return;
            }

            if (!targets || !targets.length) {
                showToast('⚠️ 请选择要执行的标签', true);
                return;
            }

            isProcessing = true;
            var startTime = performance.now();
            
            // 设置超时保护
            operationTimeout = setTimeout(function() {
                if (isProcessing) {
                    isProcessing = false;
                    showToast('⏰ 操作超时（' + CONFIG.operationTimeout/1000 + '秒），请重试', true);
                }
            }, CONFIG.operationTimeout);

            try {
                var tagElements = document.querySelectorAll('.ant-tag-checkable, .ant-tag');
                if (!tagElements.length) {
                    showToast('⚠️ 未找到可操作标签', true);
                    isProcessing = false;
                    clearTimeout(operationTimeout);
                    return;
                }

                var selected = 0;
                var already = 0;
                var errors = 0;

                for (var i = 0; i < tagElements.length; i++) {
                    var tag = tagElements[i];
                    var text = tag.textContent.trim();
                    
                    if (targets.indexOf(text) === -1) continue;

                    var isChecked = tag.classList.contains('ant-tag-checkable-checked') || 
                                   tag.classList.contains('ant-tag-checked');
                    
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
                        if (CONFIG.debug) console.warn('点击失败 ' + text, e);
                    }
                }

                var elapsed = (performance.now() - startTime).toFixed(0);
                var msg = '🎉 完成！新选 ' + selected + ' 个，已选 ' + already + ' 个' + 
                         (errors ? ' (失败 ' + errors + ')' : '') + ' (' + elapsed + 'ms)';
                showToast(msg);
                return msg;
                
            } catch (error) {
                showToast('❌ 执行出错: ' + error.message, true);
                console.error('selectTags error:', error);
                throw error;
            } finally {
                isProcessing = false;
                clearTimeout(operationTimeout);
            }
        },

        // 清除所有选中（界面标签）
        clearAllSelections: function() {
            if (isProcessing) {
                showToast('⏳ 正在执行中，请稍候...');
                return;
            }

            var tags = document.querySelectorAll('.ant-tag-checkable, .ant-tag');
            var cleared = 0;
            var errors = 0;
            
            tags.forEach(function(tag) {
                var isChecked = tag.classList.contains('ant-tag-checkable-checked') || 
                               tag.classList.contains('ant-tag-checked');
                if (isChecked && document.contains(tag)) {
                    try { 
                        tag.click(); 
                        cleared++; 
                    } catch (e) { 
                        errors++; 
                    }
                }
            });
            
            // 清空内存状态
            for (var key in selections) {
                selections[key].clear();
            }
            saveSelections();
            
            var msg = '🔄 已取消 ' + cleared + ' 个选中' + (errors ? ' (失败 ' + errors + ')' : '');
            showToast(msg);
            return msg;
        },
        
        isProcessing: function() {
            return isProcessing;
        },
        
        // 获取状态快照
        getStateSnapshot: function() {
            var snapshot = {};
            for (var key in selections) {
                snapshot[key] = Array.from(selections[key]);
            }
            return snapshot;
        },
        
        // 恢复状态
        restoreState: function(snapshot) {
            for (var key in snapshot) {
                if (selections[key]) {
                    selections[key] = new Set(snapshot[key]);
                }
            }
            saveSelections();
        }
    };
})();
