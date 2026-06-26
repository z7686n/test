// 标签操作模块
window.__MODULES__ = window.__MODULES__ || {};
window.__MODULES__.tagOps = (function() {
    // 内部状态
    var isProcessing = false;
    var selectedTags = new Set();

    return {
        // 获取选中标签集合（供UI模块读取）
        getSelectedTags: function() {
            return selectedTags;
        },
        
        // 重置选中集合（供UI模块使用）
        resetSelectedTags: function() {
            selectedTags.clear();
        },
        
        // 切换单个标签
        toggleTag: function(tag) {
            if (selectedTags.has(tag)) {
                selectedTags.delete(tag);
            } else {
                selectedTags.add(tag);
            }
            return selectedTags;
        },
        
        // 全选/取消全选
        toggleAllTags: function(tags) {
            var allSelected = tags.every(function(t) { return selectedTags.has(t); });
            if (allSelected) {
                tags.forEach(function(t) { selectedTags.delete(t); });
                return false; // 返回 false 表示已取消全选
            } else {
                tags.forEach(function(t) { selectedTags.add(t); });
                return true; // 返回 true 表示已全选
            }
        },
        
        // 清空选择
        clearAll: function() {
            selectedTags.clear();
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
            selectedTags.clear();
            return msg;
        },
        
        // 获取处理状态
        isProcessing: function() {
            return isProcessing;
        }
    };
})();
