import { CONFIG } from './config.js';
import { $$, sleep, showToast } from './utils.js';

let isProcessing = false;
let selectedTags = new Set();

// 核心：操作标签
export async function selectTags(targets) {
    if (isProcessing) {
        showToast('⏳ 正在执行中，请稍候...');
        return;
    }

    if (!targets || !targets.length) {
        showToast('⚠️ 请选择要执行的标签', true);
        return;
    }

    isProcessing = true;
    const startTime = performance.now();

    try {
        const tagElements = document.querySelectorAll('.ant-tag-checkable');
        if (!tagElements.length) {
            showToast('⚠️ 未找到可操作标签', true);
            isProcessing = false;
            return;
        }

        let selected = 0, already = 0, errors = 0;

        for (const tag of tagElements) {
            const text = tag.textContent.trim();
            if (!targets.includes(text)) continue;

            const isChecked = tag.classList.contains('ant-tag-checkable-checked');
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
                if (CONFIG.debug) console.warn(`点击失败 ${text}`, e);
            }
        }

        const elapsed = (performance.now() - startTime).toFixed(0);
        const msg = `🎉 完成！新选 ${selected} 个，已选 ${already} 个${errors ? ` (失败 ${errors})` : ''} (${elapsed}ms)`;
        showToast(msg);
        return msg;
    } catch (error) {
        showToast('❌ 执行出错: ' + error.message, true);
        console.error('selectTags error:', error);
    } finally {
        isProcessing = false;
    }
}

// 清除所有选中
export function clearAllSelections() {
    if (isProcessing) {
        showToast('⏳ 正在执行中，请稍候...');
        return;
    }

    const tags = document.querySelectorAll('.ant-tag-checkable');
    let cleared = 0;
    tags.forEach(tag => {
        if (tag.classList.contains('ant-tag-checkable-checked') && document.contains(tag)) {
            try { tag.click(); cleared++; } catch (e) {}
        }
    });
    const msg = `🔄 已取消 ${cleared} 个选中`;
    showToast(msg);
    selectedTags.clear();
    return msg;
}

// 更新标签按钮状态（需要传入按钮容器和更新函数）
export function updateTagButtons(panel, selectedTags, updateFn) {
    const btns = panel.querySelectorAll('.tag-select-btn');
    btns.forEach(btn => {
        const tag = btn.dataset.tag;
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

    const countEl = panel.querySelector('#selected-count');
    if (countEl) {
        countEl.textContent = `已选 ${selectedTags.size} 个`;
    }
}
