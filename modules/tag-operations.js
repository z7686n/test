// 标签操作模块 - 支持多模式
window.__MODULES__ = window.__MODULES__ || {};
window.__MODULES__.tagOps = (function() {
    var CONFIG = window.__MODULES__.CONFIG;
    var utils = window.__MODULES__.utils;
    var showToast = utils.showToast;
    var sleep = utils.sleep;
    
    // 每个模式独立维护选中状态
    var modeSelections = {
        cpv: new Set(),
        sku: new Set()
    };
    var currentMode = 'cpv';
    var isProcessing = false;
    var operationTimeout = null;

    // ========== 状态持久化 ==========
    function saveSelections() {
        try {
            var data = {
                cpv: Array.from(modeSelections.cpv),
                sku: Array.from(modeSelections.sku)
            };
            localStorage.setItem(CONFIG.selectionStorageKey, JSON.stringify(data));
        } catch (e) {
            if (CONFIG.debug) console.warn('保存选择状态失败:', e);
        }
    }

    function loadSelections() {
        try {
            var data = utils.safeJSONParse(localStorage.getItem(CONFIG.selectionStorageKey));
            if (data) {
                if (data.cpv) modeSelections.cpv = new Set(data.cpv);
                if (data.sku) modeSelections.sku = new Set(data.sku);
                return true;
            }
        } catch (e) {
            if (CONFIG.debug) console.warn('加载选择状态失败:', e);
        }
        return false;
    }

    // 初始化时加载保存的状态
    loadSelections();

    // ========== 核心方法 ==========
    return {
        // 切换当前模式
        setMode: function(mode) {
            if (mode === 'cpv' || mode === 'sku') {
                currentMode = mode;
            }
        },
        
        getCurrentMode: function() {
            return currentMode;
        },
        
        // 获取当前模式的选中集合
        getSelectedTags: function() {
            return modeSelections[currentMode];
        },
        
        // 获取指定模式的选中集合
        getModeSelections: function(mode) {
            return modeSelections[mode] || new Set();
        },
        
        // 重置指定模式的选中集合
        resetModeSelections: function(mode) {
            if (modeSelections[mode]) {
                modeSelections[mode].clear();
                saveSelections();
            }
        },
        
        // 检查标签是否被选中
        isTagSelected: function(mode, tag) {
            var set = modeSelections[mode] || new Set();
            return set.has(tag);
        },
        
        // 切换单个标签（当前模式）
        toggleTag: function(tag) {
            var set = modeSelections[currentMode];
            if (set.has(tag)) {
                set.delete(tag);
            } else {
                set.add(tag);
            }
            saveSelections();
            return set;
        },
        
        // 切换多个标签（当前模式）
        toggleTags: function(tags) {
            var set = modeSelections[currentMode];
            var allSelected = tags.every(function(t) { return set.has(t); });
            
            if (allSelected) {
                tags.forEach(function(t) { set.delete(t); });
            } else {
                tags.forEach(function(t) { set.add(t); });
            }
            saveSelections();
            return allSelected;
        },
        
        // 全选（当前模式）
        selectAll: function(tags) {
            var set = modeSelections[currentMode];
            tags.forEach(function(t) { set.add(t); });
            saveSelections();
        },
        
        // 清空当前模式选择
        clearAll: function() {
            modeSelections[currentMode].clear();
            saveSelections();
        },
        
        // 清空所有模式选择
        clearAllModes: function() {
            modeSelections.cpv.clear();
            modeSelections.sku.clear();
            saveSelections();
        },

        // 核心：执行选中标签（修复版）
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
                var tagElements = document.querySelectorAll('.ant-tag-checkable');
                if (!tagElements.length) {
                    showToast('⚠️ 未找到可操作标签', true);
                    isProcessing = false;
                    clearTimeout(operationTimeout);
                    return;
                }

                var selected = 0;
                var already = 0;
                var errors = 0;

                // 遍历页面上所有标签，只操作匹配的
                for (var i = 0; i < tagElements.length; i++) {
                    var tag = tagElements[i];
                    var text = tag.textContent.trim();
                    
                    // 检查是否在目标列表中
                    if (targets.indexOf(text) === -1) continue;

                    var isChecked = tag.classList.contains('ant-tag-checkable-checked');
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

            var tags = document.querySelectorAll('.ant-tag-checkable');
            var cleared = 0;
            var errors = 0;
            
            tags.forEach(function(tag) {
                if (tag.classList.contains('ant-tag-checkable-checked') && document.contains(tag)) {
                    try { 
                        tag.click(); 
                        cleared++; 
                    } catch (e) { 
                        errors++; 
                    }
                }
            });
            
            // 清空内存状态
            modeSelections[currentMode].clear();
            saveSelections();
            
            var msg = '🔄 已取消 ' + cleared + ' 个选中' + (errors ? ' (失败 ' + errors + ')' : '');
            showToast(msg);
            return msg;
        },
        
        isProcessing: function() {
            return isProcessing;
        },
        
        // 获取选中数量
        getSelectedCount: function(mode) {
            var targetMode = mode || currentMode;
            return modeSelections[targetMode] ? modeSelections[targetMode].size : 0;
        },
        
        // 获取状态快照（用于调试）
        getStateSnapshot: function() {
            return {
                currentMode: currentMode,
                cpv: Array.from(modeSelections.cpv),
                sku: Array.from(modeSelections.sku)
            };
        }
    };
})();
