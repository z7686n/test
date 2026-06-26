// TreeSelect 下拉框操作模块
window.__MODULES__ = window.__MODULES__ || {};
window.__MODULES__.treeSelectOps = (function() {
    var isProcessing = false;

    return {
        isProcessing: function() {
            return isProcessing;
        },

        selectTreeSelectUnable: async function() {
            var CONFIG = window.__MODULES__.CONFIG;
            var utils = window.__MODULES__.utils;
            var showToast = utils.showToast, sleep = utils.sleep;

            if (isProcessing) {
                showToast('⏳ 正在执行中，请稍候...');
                return;
            }

            isProcessing = true;
            var startTime = performance.now();

            try {
                var treeSelects = document.querySelectorAll('.ant-tree-select');
                if (!treeSelects.length) {
                    showToast('⚠️ 未找到 Tree Select 组件', true);
                    isProcessing = false;
                    return;
                }

                console.log('找到 ' + treeSelects.length + ' 个 Tree Select 组件');

                var needProcess = [];
                for (var i = 0; i < treeSelects.length; i++) {
                    var select = treeSelects[i];
                    var selectionItem = select.querySelector('.ant-select-selection-item');
                    if (selectionItem && selectionItem.textContent.trim() === '无法判断') {
                        if (CONFIG.debug) console.log('第 ' + (i+1) + ' 个已经是"无法判断"，跳过');
                    } else {
                        needProcess.push({ index: i, element: select });
                    }
                }

                if (!needProcess.length) {
                    showToast('✅ 所有下拉框已选择"无法判断"');
                    isProcessing = false;
                    return;
                }

                console.log('需要处理 ' + needProcess.length + ' 个组件');

                // 点击展开所有需要处理的下拉框
                for (var j = 0; j < needProcess.length; j++) {
                    var item = needProcess[j];
                    var selector = item.element.querySelector('.ant-select-selector');
                    if (selector) {
                        selector.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                        selector.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
                        selector.click();
                    }
                }

                await sleep(300);

                // 收集所有可见下拉菜单
                var allDropdowns = document.querySelectorAll('.ant-select-dropdown');
                var visibleDropdowns = [];
                for (var k = 0; k < allDropdowns.length; k++) {
                    var dropdown = allDropdowns[k];
                    var style = window.getComputedStyle(dropdown);
                    if (style.display !== 'none' && style.visibility !== 'hidden' && dropdown.offsetParent !== null) {
                        visibleDropdowns.push(dropdown);
                    }
                }

                console.log('找到 ' + visibleDropdowns.length + ' 个可见下拉菜单');

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
                    var treeNodes = curDropdown.querySelectorAll('.ant-tree-treenode, .ant-select-tree-treenode');
                    for (var p = 0; p < treeNodes.length; p++) {
                        var node = treeNodes[p];
                        var titleEl = node.querySelector('.ant-tree-node-content-wrapper, .ant-select-tree-node-content-wrapper, .ant-tree-title');
                        if (titleEl && titleEl.textContent.trim() === '无法判断') {
                            targetNode = titleEl;
                            break;
                        }
                    }

                    // 方法B：普通选项
                    if (!targetNode) {
                        var options = curDropdown.querySelectorAll('.ant-select-item-option');
                        for (var q = 0; q < options.length; q++) {
                            var opt = options[q];
                            var content = opt.querySelector('.ant-select-item-option-content');
                            if (content && content.textContent.trim() === '无法判断') {
                                targetNode = opt;
                                break;
                            }
                        }
                    }

                    if (targetNode) {
                        var clickEvent = new MouseEvent('click', {
                            bubbles: true,
                            cancelable: true,
                            view: window
                        });
                        targetNode.dispatchEvent(clickEvent);
                        successCount++;
                    } else {
                        failCount++;
                    }
                }

                await sleep(200);

                // 按 ESC 关闭所有下拉
                try {
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
                    try { document.body.click(); } catch (e2) {}
                }

                var elapsed = (performance.now() - startTime).toFixed(0);
                var msg = '🎉 下拉框完成！成功 ' + successCount + ' 个' + 
                         (failCount ? '，失败 ' + failCount + ' 个' : '') + ' (' + elapsed + 'ms)';
                showToast(msg);
                return msg;

            } catch (error) {
                showToast('❌ 下拉框执行出错: ' + error.message, true);
                console.error('selectTreeSelectUnable error:', error);
            } finally {
                isProcessing = false;
            }
        }
    };
})();
