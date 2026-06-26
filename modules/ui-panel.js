import { CONFIG } from './config.js';
import { $, $$, showToast } from './utils.js';
import { selectTags, clearAllSelections, updateTagButtons } from './tag-operations.js';
import { selectTreeSelectUnable } from './tree-select-operations.js';

let panel = null;
let isMinimized = false;
let selectedTags = new Set();

// 存储位置
function savePosition(top, right) {
    try { localStorage.setItem(CONFIG.storageKey, JSON.stringify({ top, right })); } catch (e) {}
}

function loadPosition() {
    try {
        const saved = JSON.parse(localStorage.getItem(CONFIG.storageKey));
        if (saved && typeof saved.top === 'number' && typeof saved.right === 'number') {
            return { top: saved.top, right: saved.right };
        }
    } catch (e) {}
    return { ...CONFIG.defaultPosition };
}

// 切换标签选择
function toggleTag(tag) {
    if (selectedTags.has(tag)) {
        selectedTags.delete(tag);
    } else {
        selectedTags.add(tag);
    }
    updateTagButtons(panel, selectedTags);
}

// 构建面板
function buildPanel() {
    if (document.getElementById('tag-selector-panel')) return;

    // 注入样式
    if (!document.getElementById('tag-min-style')) {
        const style = document.createElement('style');
        style.id = 'tag-min-style';
        style.textContent = `
            #tag-selector-panel.minimized {
                width: 42px !important; height: 42px !important;
                border-radius: 50% !important; padding: 0 !important;
                overflow: hidden !important; cursor: pointer !important;
            }
            #tag-selector-panel.minimized > div:not(.title-bar) { display: none !important; }
            #tag-selector-panel.minimized .title-text { display: none !important; }
            #tag-selector-panel.minimized .toggle-btn { font-size: 22px !important; }
            #tag-selector-panel.minimized .title-bar { margin-bottom: 0 !important; justify-content: center !important; }

            .tag-select-btn {
                padding: 4px 10px;
                border-radius: 4px;
                border: 1px solid #444;
                background: transparent;
                color: #ccc;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.15s ease;
                font-family: inherit;
                white-space: nowrap;
            }
            .tag-select-btn:hover {
                background: #2a2a4a;
                border-color: #666;
            }
            .tag-select-btn.active {
                background: #4fc3f7 !important;
                color: #1a1a2e !important;
                border-color: #4fc3f7 !important;
            }
            .action-btn {
                padding: 3px 10px;
                border-radius: 3px;
                border: 1px solid #555;
                background: #252540;
                color: #aaa;
                cursor: pointer;
                font-size: 11px;
                transition: all 0.15s ease;
                font-family: inherit;
            }
            .action-btn:hover {
                background: #333366;
                color: #fff;
            }
            .action-btn.primary {
                border-color: #4fc3f7;
                color: #4fc3f7;
            }
            .action-btn.danger {
                border-color: #e57373;
                color: #e57373;
            }
        `;
        document.head.append(style);
    }

    // 创建面板
    panel = document.createElement('div');
    panel.id = 'tag-selector-panel';
    const pos = loadPosition();
    panel.style.cssText = `
        position: fixed; z-index: 999999; background: #1a1a2e;
        color: #eee; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.6);
        font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px;
        border: 1px solid #333; user-select: none; width: 300px;
        box-sizing: border-box; padding: 12px 14px;
        top: ${pos.top}px; right: ${pos.right}px;
        transition: width 0.3s, height 0.3s, border-radius 0.3s, padding 0.3s;
        max-height: 90vh; overflow-y: auto;
    `;

    // 标题栏
    const titleBar = document.createElement('div');
    titleBar.className = 'title-bar';
    titleBar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-shrink:0;';
    titleBar.innerHTML = `
        <span class="title-text" style="font-weight:bold;font-size:16px;color:#4fc3f7;">🏷️ 标签选择器</span>
        <span class="toggle-btn" style="cursor:pointer;font-size:20px;color:#aaa;padding:0 6px;" title="最小化">−</span>
    `;
    panel.append(titleBar);

    // 信息栏
    const infoBar = document.createElement('div');
    infoBar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-shrink:0;';
    infoBar.innerHTML = `
        <span style="font-size:11px;color:#888;">💡 点击标签选择，再执行</span>
        <span id="selected-count" style="font-size:12px;color:#4fc3f7;font-weight:bold;">已选 0 个</span>
    `;
    panel.append(infoBar);

    // 快捷操作
    const actionBar = document.createElement('div');
    actionBar.style.cssText = 'display:flex;gap:6px;margin-bottom:8px;flex-shrink:0;';
    
    const selectAllBtn = document.createElement('button');
    selectAllBtn.className = 'action-btn primary';
    selectAllBtn.textContent = '📌 全部';
    selectAllBtn.addEventListener('click', () => {
        const allSelected = CONFIG.tags.every(t => selectedTags.has(t));
        if (allSelected) {
            CONFIG.tags.forEach(t => selectedTags.delete(t));
            showToast('已取消全选');
        } else {
            CONFIG.tags.forEach(t => selectedTags.add(t));
            showToast('已全选');
        }
        updateTagButtons(panel, selectedTags);
    });
    actionBar.append(selectAllBtn);

    const clearBtn = document.createElement('button');
    clearBtn.className = 'action-btn danger';
    clearBtn.textContent = '🗑️ 清空';
    clearBtn.addEventListener('click', () => {
        selectedTags.clear();
        updateTagButtons(panel, selectedTags);
        showToast('已清空选择');
    });
    actionBar.append(clearBtn);

    const spacer = document.createElement('span');
    spacer.style.cssText = 'flex:1;';
    actionBar.append(spacer);
    panel.append(actionBar);

    // 标签按钮容器
    const tagContainer = document.createElement('div');
    tagContainer.style.cssText = `
        display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px;
        max-height:160px;overflow-y:auto;padding:4px 2px;
        scrollbar-width: thin; scrollbar-color: #555 #1a1a2e;
        flex-shrink:0; align-content:flex-start;
    `;

    CONFIG.tags.forEach(tag => {
        const btn = document.createElement('button');
        btn.className = 'tag-select-btn';
        btn.dataset.tag = tag;
        btn.textContent = tag;
        btn.addEventListener('click', () => toggleTag(tag));
        tagContainer.append(btn);
    });
    panel.append(tagContainer);

    // 分割线
    const divider = document.createElement('div');
    divider.style.cssText = 'border-top:1px solid #333;margin:6px 0;flex-shrink:0;';
    panel.append(divider);

    // 执行按钮组
    const actionGroup = document.createElement('div');
    actionGroup.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;flex-shrink:0;';
    
    const createBtn = (text, bg, hoverBg, onClick, flex) => {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.style.cssText = `
            ${flex ? `flex:${flex};` : 'flex:1;min-width:50px;'}
            padding:5px 8px;border:none;border-radius:5px;
            background:${bg};color:#1a1a2e;font-weight:bold;font-size:12px;cursor:pointer;
            transition:background 0.15s, transform 0.1s;
            white-space:nowrap;font-family:inherit;
        `;
        btn.addEventListener('mouseenter', () => btn.style.background = hoverBg);
        btn.addEventListener('mouseleave', () => btn.style.background = bg);
        btn.addEventListener('mousedown', () => btn.style.transform = 'scale(0.96)');
        btn.addEventListener('mouseup', () => btn.style.transform = '');
        btn.addEventListener('click', onClick);
        return btn;
    };

    actionGroup.append(
        createBtn('✅ 执行选中', '#4fc3f7', '#0288d1', () => {
            const tags = Array.from(selectedTags);
            selectTags(tags);
        }, '1.5')
    );
    actionGroup.append(
        createBtn('🔄 清除选中', '#ff8a65', '#d84315', clearAllSelections, '1')
    );
    panel.append(actionGroup);

    // 下拉框操作
    const dropdownGroup = document.createElement('div');
    dropdownGroup.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;flex-shrink:0;';
    dropdownGroup.append(
        createBtn('📋 下拉框 选"无法判断"', '#7c4dff', '#536dfe', selectTreeSelectUnable, '2')
    );
    panel.append(dropdownGroup);

    // 状态栏
    const status = document.createElement('div');
    status.id = 'tag-status-bar';
    status.style.cssText = 'padding-top:6px;border-top:1px solid #333;font-size:11px;color:#888;text-align:center;flex-shrink:0;';
    status.textContent = `就绪 | ${CONFIG.tags.length} 种标签`;
    panel.append(status);

    document.body.append(panel);
    initDraggable(panel);
    updateTagButtons(panel, selectedTags);
}

// 拖动和最小化
function initDraggable(el) {
    const toggleBtn = el.querySelector('.toggle-btn');
    let startX, startY, origX, origY, moved = false;
    let dragging = false;

    function minimize() {
        isMinimized = true;
        el.classList.add('minimized');
        toggleBtn.textContent = '🏷️';
        toggleBtn.title = '展开面板';
    }

    function expand() {
        isMinimized = false;
        el.classList.remove('minimized');
        toggleBtn.textContent = '−';
        toggleBtn.title = '最小化';
    }

    el.addEventListener('pointerdown', e => {
        if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
        e.preventDefault();
        startX = e.clientX;
        startY = e.clientY;
        origX = el.offsetLeft;
        origY = el.offsetTop;
        moved = false;
        dragging = true;

        const onMove = e => {
            if (!dragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            if (!moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
                moved = true;
                el.style.transition = 'none';
            }
            if (moved) {
                el.style.left = (origX + dx) + 'px';
                el.style.top = (origY + dy) + 'px';
                el.style.right = 'auto';
            }
        };

        const onUp = e => {
            dragging = false;
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
            el.style.transition = '';

            if (!moved) {
                if (e.target === toggleBtn) {
                    isMinimized ? expand() : minimize();
                } else if (isMinimized && el.contains(e.target)) {
                    expand();
                }
            } else {
                const rect = el.getBoundingClientRect();
                savePosition(rect.top, window.innerWidth - rect.right);
            }
        };

        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
    });

    el.addEventListener('click', e => {
        if (isMinimized && e.target === el) {
            expand();
        }
    });
}

// 监听面板是否被意外移除，并重建
function watchPanel() {
    const observer = new MutationObserver(() => {
        if (!document.getElementById('tag-selector-panel')) {
            console.warn('面板被移除，正在重建...');
            buildPanel();
        }
    });
    observer.observe(document.body, { childList: true });
}

// 主启动函数
export function buildAndWatchPanel() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            buildPanel();
            watchPanel();
        });
    } else {
        buildPanel();
        watchPanel();
    }
}
