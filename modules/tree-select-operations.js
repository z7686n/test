import { CONFIG } from './config.js';
import { showToast, sleep } from './utils.js';

let isProcessing = false;

// 核心：操作下拉框 TreeSelect
export async function selectTreeSelectUnable() {
    if (isProcessing) {
        showToast('⏳ 正在执行中，请稍候...');
        return;
    }

    isProcessing = true;
    const startTime = performance.now();

    try {
        const treeSelects = document.querySelectorAll('.ant-tree-select');
        if (!treeSelects.length) {
            showToast('⚠️ 未找到 Tree Select 组件', true);
            isProcessing = false;
            return;
        }

        console.log(`找到 ${treeSelects.length} 个 Tree Select 组件`);

        const needProcess = [];
        for (let i = 0; i < treeSelects.length; i++) {
            const select = treeSelects[i];
            const selectionItem = select.querySelector('.ant-select-selection-item');
            if (selectionItem && selectionItem.textContent.trim() === '无法判断') {
                if (CONFIG.debug) console.log(`第 ${i+1} 个已经是"无法判断"，跳过`);
            } else {
                needProcess.push({ index: i, element: select });
            }
        }

        if (!needProcess.length) {
            showToast('✅ 所有下拉框已选择"无法判断"');
            isProcessing = false;
            return;
        }

        console.log(`需要处理 ${needProcess.length} 个组件`);

        for (const item of needProcess) {
            const selector = item.element.querySelector('.ant-select-selector');
            if (selector) {
                selector.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                selector.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
                selector.click();
            }
        }

        await sleep(300);

        const allDropdowns = document.querySelectorAll('.ant-select-dropdown');
        const visibleDropdowns = [];
        for (const dropdown of allDropdowns) {
            const style = window.getComputedStyle(dropdown);
            if (style.display !== 'none' && style.visibility !== 'hidden' && dropdown.offsetParent !== null) {
                visibleDropdowns.push(dropdown);
            }
        }

        console.log(`找到 ${visibleDropdowns.length} 个可见下拉菜单`);

        const dropdownMap = new Map();
        for (let i = 0; i < Math.min(needProcess.length, visibleDropdowns.length); i++) {
            dropdownMap.set(needProcess[i].element, visibleDropdowns[i]);
        }

        let successCount = 0;
        let failCount = 0;

        for (const item of needProcess) {
            const dropdown = dropdownMap.get(item.element);
            if (!dropdown) {
                failCount++;
                continue;
            }

            let targetNode = null;

            const treeNodes = dropdown.querySelectorAll('.ant-tree-treenode, .ant-select-tree-treenode');
            for (const node of treeNodes) {
                const titleEl = node.querySelector('.ant-tree-node-content-wrapper, .ant-select-tree-node-content-wrapper, .ant-tree-title');
                if (titleEl && titleEl.textContent.trim() === '无法判断') {
                    targetNode = titleEl;
                    break;
                }
            }

            if (!targetNode) {
                const options = dropdown.querySelectorAll('.ant-select-item-option');
                for (const opt of options) {
                    const content = opt.querySelector('.ant-select-item-option-content');
                    if (content && content.textContent.trim() === '无法判断') {
                        targetNode = opt;
                        break;
                    }
                }
            }

            if (targetNode) {
                const clickEvent = new MouseEvent('click', {
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

        try {
            const escEvent = new KeyboardEvent('keydown', {
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

        const elapsed = (performance.now() - startTime).toFixed(0);
        const msg = `🎉 下拉框完成！成功 ${successCount} 个${failCount ? `，失败 ${failCount} 个` : ''} (${elapsed}ms)`;
        showToast(msg);
        return msg;

    } catch (error) {
        showToast('❌ 下拉框执行出错: ' + error.message, true);
        console.error('selectTreeSelectUnable error:', error);
    } finally {
        isProcessing = false;
    }
}
