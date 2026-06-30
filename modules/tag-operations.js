window.__MODULES__ = window.__MODULES__ || {};
window.__MODULES__.tagOps = (function() {
    var CONFIG = window.__MODULES__.CONFIG;
    var utils = window.__MODULES__.utils;
    var showToast = utils.showToast;
    var sleep = utils.sleep;
    
    var selections = {
        correctness: new Set(),
        evidence: new Set(),
        errorTypes: new Set()
    };
    
    var isProcessing = false;
    var operationTimeout = null;
    
    function saveSelections() {
        try {
            var data = {};
            for (var key in selections) {
                data[key] = Array.from(selections[key]);
            }
            localStorage.setItem(CONFIG.selectionStorageKey, JSON.stringify(data));
        } catch (e) {}
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
        } catch (e) {}
        return false;
    }
    loadSelections();
    
    return {
        getGroups: function() {
            return CONFIG.groups;
        },
        
        getGroupSelections: function(groupId) {
            return selections[groupId] || new Set();
        },
        
        getAllSelectedTags: function() {
            var allTags = [];
            for (var key in selections) {
                selections[key].forEach(function(tag) {
                    allTags.push(tag);
                });
            }
            return allTags;
        },
        
        toggleTag: function(groupId, tag, isRadio) {
            if (!selections[groupId]) {
                selections[groupId] = new Set();
            }
            var set = selections[groupId];
            
            if (isRadio) {
                set.clear();
                set.add(tag);
            } else {
                if (set.has(tag)) {
                    set.delete(tag);
                } else {
                    set.add(tag);
                }
            }
            saveSelections();
            return set;
        },
        
        clearGroup: function(groupId) {
            if (selections[groupId]) {
                selections[groupId].clear();
                saveSelections();
            }
        },
        
        clearAll: function() {
            for (var key in selections) {
                selections[key].clear();
            }
            saveSelections();
        },
        
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
        
        isTagSelected: function(groupId, tag) {
            if (!selections[groupId]) return false;
            return selections[groupId].has(tag);
        },
        
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
            
            operationTimeout = setTimeout(function() {
                if (isProcessing) {
                    isProcessing = false;
                    showToast('⏰ 操作超时', true);
                }
            }, CONFIG.operationTimeout);

            try {
                var tagElements = document.querySelectorAll('.ant-tag-checkable, .ant-tag');
                var selected = 0;
                var already = 0;
                var errors = 0;
                
                for (var i = 0; i < tagElements.length; i++) {
                    var el = tagElements[i];
                    var text = el.textContent.trim();
                    
                    if (targets.indexOf(text) === -1) continue;
                    
                    var isChecked = el.classList.contains('ant-tag-checkable-checked') || 
                                   el.classList.contains('ant-tag-checked') ||
                                   el.getAttribute('aria-checked') === 'true';
                    
                    if (isChecked) {
                        already++;
                        continue;
                    }
                    
                    try {
                        if (document.contains(el)) {
                            el.click();
                            selected++;
                            await sleep(CONFIG.clickDelay);
                        }
                    } catch (e) {
                        errors++;
                        if (CONFIG.debug) console.warn('点击失败:', text, e);
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
        
        clearAllSelections: function() {
            if (isProcessing) {
                showToast('⏳ 正在执行中，请稍候...');
                return;
            }
            
            var tagElements = document.querySelectorAll('.ant-tag-checkable, .ant-tag');
            var cleared = 0;
            
            tagElements.forEach(function(el) {
                var isChecked = el.classList.contains('ant-tag-checkable-checked') || 
                               el.classList.contains('ant-tag-checked') ||
                               el.getAttribute('aria-checked') === 'true';
                if (isChecked && document.contains(el)) {
                    try { 
                        el.click(); 
                        cleared++; 
                    } catch (e) {}
                }
            });
            
            for (var key in selections) {
                selections[key].clear();
            }
            saveSelections();
            
            showToast('🔄 已取消 ' + cleared + ' 个选中');
            return cleared;
        },
        
        isProcessing: function() {
            return isProcessing;
        },
        
        restoreSelections: function(groupId, tags) {
            if (selections[groupId]) {
                selections[groupId] = new Set(tags || []);
            }
            saveSelections();
        }
    };
})();
