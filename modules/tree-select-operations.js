// TreeSelect 下拉框操作模块
window.__MODULES__ = window.__MODULES__ || {};
window.__MODULES__.treeSelectOps = (function() {
    var CONFIG = window.__MODULES__.CONFIG;
    var utils = window.__MODULES__.utils;
    var showToast = utils.showToast;
    var sleep = utils.sleep;
    var isProcessing = false;
    var operationTimeout = null;

    // 匹配目标文本（支持多种变体）
    function matchTargetText(text) {
        if (!text) return false;
        var trimmed = text.trim();
        var target = CONFIG.dropdownTargetText || '无法判断';
        return trimmed === target || trimmed.includes(target);
    }

    return {
        isProcessing: function() {
            return isProcessing;
        },

        // 选择"无法判断"（增强版）
        selectTreeSelectUnable: async function() {
            if (isProcessing) {
                showToast('⏳ 正在执行中，请稍候...');
                return;
            }

            isProcessing = true;
            var startTime = performance.now();
            
            // 超时保护
            operationTimeout = setTimeout(function() {
                if (isProcessing) {
                    isProcessing = false;
                    showToast('⏰ 操作超时，请重试', true);
                }
            }, CONFIG.operationTimeout || 30000);

            try {
                var treeSelects = document.querySelectorAll('.ant-tree-select, .ant-select-tree-select');
                if (!treeSelects.length) {
                    showToast('⚠️ 未找到 Tree Select 组件', true);
                    isProcessing = false;
                    clearTimeout(operationTimeout);
                    return;
                }

                if (CONFIG.debug) console.log('找到 ' + treeSelects.length + ' 个 Tree Select 组件');

                // 收集需要处理的组件
                var needProcess = [];
                for (var i = 0; i < treeSelects.length; i++) {
                    var select = treeSelects[i];
                    var selectionItem = select.querySelector('.ant-select-selection-item, .ant-select-selection-text');
                    if (selectionItem && matchTargetText(selectionItem.textContent)) {
                        if (CONFIG.debug) console.log('第 ' + (i+1) + ' 个已经是目标值，跳过');
                    } else {
                        needProcess.push({ index: i, element: select });
                    }
                }

                if (!needProcess.length) {
                    showToast('✅ 所有下拉框已选择目标值');
                    isProcessing = false;
                    clearTimeout(operationTimeout);
                    return;
                }

                if (CONFIG.debug) console.log('需要处理 ' + needProcess.length + ' 个组件');

                // 点击展开所有需要处理的下拉框
                for (var j = 0; j < needProcess.length; j++) {
                    var item = needProcess[j];
                    var selector = item.element.querySelector('.ant-select-selector, .ant-select-selection');
                    if (selector) {
                        selector.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                        selector.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
                        selector.click();
                        await sleep(CONFIG.clickDelay || 50);
                    }
                }

                await sleep(CONFIG.dropdownTimeout || 500);

                // 收集所有可见下拉菜单
                var allDropdowns = document.querySelectorAll('.ant-select-dropdown, .ant-select-tree-dropdown');
                var visibleDropdowns = [];
                for (var k = 0; k < allDropdowns.length; k++) {
                    var dropdown = allDropdowns[k];
                    var style = window.getComputedStyle(dropdown);
                    if (style.display !== 'none' && style.visibility !== 'hidden' && dropdown.offsetParent !== null) {
                        visibleDropdowns.push(dropdown);
                    }
                }

                if (CONFIG.debug) console.log('找到 ' + visibleDropdowns.length + ' 个可见下拉菜单');

                // 建立映射关系
                var dropdownMap = new Map();
                for (var m = 0; m < Math.min(needProcess.length, visibleDropdowns.length); m++) {
                    dropdownMap.set(needProcess[m].element, visibleDropdowns[m]);
                }

                var successCount = 0;
                var failCount = 0;

                // 逐个处理
                for (var n = 0; n < needProcess.length; n++) {
                    var curItem = needProcess[n];
                    var curDropdown = dropdownMap.get(curItem.element);
                    if (!curDropdown) {
                        failCount++;
                        continue;
                    }

                    var targetNode = null;

                    // 方法A：树节点
                    var treeNodes = curDropdown.querySelectorAll(
                        '.ant-tree-treenode, .ant-select-tree-treenode, .ant-tree-node'
                    );
                    for (var p = 0; p < treeNodes.length; p++) {
                        var node = treeNodes[p];
                        var titleEl = node.querySelector(
                            '.ant-tree-node-content-wrapper, .ant-select-tree-node-content-wrapper, ' +
                            '.ant-tree-title, .ant-select-tree-title, .ant-tree-node-content'
                        );
                        if (titleEl && matchTargetText(titleEl.textContent)) {
                            targetNode = titleEl;
                            break;
                        }
                    }

                    // 方法B：普通选项
                    if (!targetNode) {
                        var options = curDropdown.querySelectorAll(
                            '.ant-select-item-option, .ant-select-tree-option, .ant-select-dropdown-menu-item'
                        );
                        for (var q = 0; q < options.length; q++) {
                            var opt = options[q];
                            var content = opt.querySelector(
                                '.ant-select-item-option-content, .ant-select-tree-option-content, .ant-select-dropdown-menu-item-content'
                            ) || opt;
                            if (matchTargetText(content.textContent)) {
                                targetNode = opt;
                                break;
                            }
                        }
                    }

                    // 方法C：直接查找包含目标文本的元素
                    if (!targetNode) {
                        var allElements = curDropdown.querySelectorAll('*');
                        for (var r = 0; r < allElements.length; r++) {
                            var el = allElements[r];
                            if (el.children.length === 0 && matchTargetText(el.textContent)) {
                                // 检查是否是叶子节点
                                var parent = el.parentElement;
                                if (parent && (parent.classList.contains('ant-tree-treenode') || 
                                              parent.classList.contains('ant-select-tree-treenode'))) {
                                    targetNode = el;
                                    break;
                                }
                            }
                        }
                    }

                    if (targetNode) {
                        try {
                            var clickEvent = new MouseEvent('click', {
                                bubbles: true,
                                cancelable: true,
                                view: window
                            });
                            targetNode.dispatchEvent(clickEvent);
                            successCount++;
                            await sleep(CONFIG.clickDelay || 50);
                        } catch (e) {
                            failCount++;
                            if (CONFIG.debug) console.warn('点击目标失败:', e);
                        }
                    } else {
                        failCount++;
                        if (CONFIG.debug) console.warn('未找到目标节点:', curItem.element);
                    }
                }

                await sleep(200);

                // 关闭所有下拉（多种方式）
                try {
                    // 方式1: ESC键
                    var escEvent = new KeyboardEvent('keydown', {
                        key: 'Escape',
                        code: 'Escape',
                        keyCode: 27,
                        which: 27,
                        bubbles: true,
                        cancelable: true,
                        composed: true
                    });
                    document.dispatchEvent(escEvent);
                } catch (e) {
                    try { 
                        // 方式2: 点击页面空白
                        document.body.click(); 
                    } catch (e2) {
                        // 方式3: 清空选择
                        document.activeElement?.blur?.();
                    }
                }

                var elapsed = (performance.now() - startTime).toFixed(0);
                var msg = '🎉 下拉框完成！成功 ' + successCount + ' 个' + 
                         (failCount ? '，失败 ' + failCount + ' 个' : '') + ' (' + elapsed + 'ms)';
                showToast(msg);
                return msg;

            } catch (error) {
                showToast('❌ 下拉框执行出错: ' + error.message, true);
                console.error('selectTreeSelectUnable error:', error);
                throw error;
            } finally {
                isProcessing = false;
                clearTimeout(operationTimeout);
            }
        },
        
        // 重置所有下拉框
        resetAllTreeSelects: async function() {
            if (isProcessing) {
                showToast('⏳ 正在执行中，请稍候...');
                return;
            }

            isProcessing = true;
            try {
                var treeSelects = document.querySelectorAll('.ant-tree-select, .ant-select-tree-select');
                var resetCount = 0;
                
                for (var i = 0; i < treeSelects.length; i++) {
                    var select = treeSelects[i];
                    var clearBtn = select.querySelector('.ant-select-clear, .ant-select-selection-clear');
                    if (clearBtn) {
                        clearBtn.click();
                        resetCount++;
                        await sleep(CONFIG.clickDelay || 50);
                    }
                }
                
                showToast('🔄 已重置 ' + resetCount + ' 个下拉框');
                return resetCount;
            } catch (error) {
                showToast('❌ 重置失败: ' + error.message, true);
                console.error('resetAllTreeSelects error:', error);
            } finally {
                isProcessing = false;
            }
        }
    };
})();
