// 标签操作模块 - 支持多模式
window.__MODULES__ = window.__MODULES__ || {};
window.__MODULES__.tagOps = (function() {
    // 每个模式独立维护选中状态
    var modeSelections = {
        cpv: new Set(),
        sku: new Set()
    };
    var currentMode = 'cpv';
    var isProcessing = false;

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
            }
        },
        
        // 切换单个标签（当前模式）
        toggleTag: function(tag) {
            var set = modeSelections[currentMode];
            if (set.has(tag)) {
                set.delete(tag);
            } else {
                set.add(tag);
            }
            return set;
        },
        
        // 全选/取消全选（当前模式）
        toggleAllTags: function(tags) {
            var set = modeSelections[currentMode];
            var allSelected = tags.every(function(t) { return set.has(t); });
            if (allSelected) {
                tags.forEach(function(t) { set.delete(t); });
                return false;
            } else {
                tags.forEach(function(t) { set.add(t); });
                return true;
            }
        },
        
        // 清空当前模式选择
        clearAll: function() {
            modeSelections[currentMode].clear();
        },

        // 核心：执行选中标签
        selectTags: async function(targets) {
            var CONFIG = window.__MODULES__.CONFIG;
            var utils = window.__MODULES__.utils;
            var $$ = utils.$$, sleep = utils.sleep, showToast = utils.showToast;

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

            try {
                var tagElements = document.querySelectorAll('.ant-tag-checkable');
                if (!tagElements.length) {
                    showToast('⚠️ 未找到可操作标签', true);
                    isProcessing = false;
                    return;
                }

                var selected = 0, already = 0, errors = 0;

                for (var i = 0; i < tagElements.length; i++) {
                    var tag = tagElements[i];
                    var text = tag.textContent.trim();
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
            } finally {
                isProcessing = false;
            }
        },

        // 清除所有选中（界面标签）
        clearAllSelections: function() {
            var showToast = window.__MODULES__.utils.showToast;

            if (isProcessing) {
                showToast('⏳ 正在执行中，请稍候...');
                return;
            }

            var tags = document.querySelectorAll('.ant-tag-checkable');
            var cleared = 0;
            tags.forEach(function(tag) {
                if (tag.classList.contains('ant-tag-checkable-checked') && document.contains(tag)) {
                    try { tag.click(); cleared++; } catch (e) {}
                }
            });
            var msg = '🔄 已取消 ' + cleared + ' 个选中';
            showToast(msg);
            modeSelections[currentMode].clear();
            return msg;
        },
        
        isProcessing: function() {
            return isProcessing;
        }
    };
})();
