// ==UserScript==
// @name         标注助手 - 提取 + 填入（同页显示版）
// @namespace    http://tampermonkey.net/
// @version      4.0.0
// @description  提取 subject + 按题号对应填入（同页显示，React 兼容）
// @author       Z
// @match        *://*/*
// @grant        GM_setClipboard
// ==/UserScript==

(function() {
    'use strict';

    if (window.self !== window.top) return;

    // ============================================================
    //  Toast 提示
    // ============================================================

    function showToast(msg, isError) {
        var old = document.getElementById('filler-toast');
        if (old) old.remove();

        var toast = document.createElement('div');
        toast.id = 'filler-toast';
        toast.textContent = msg;
        toast.style.cssText =
            'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);' +
            'z-index:1000000;background:' + (isError ? '#4a1a1a' : '#1a1a2e') + ';' +
            'color:' + (isError ? '#ff6b6b' : '#4fc3f7') + ';padding:12px 24px;' +
            'border-radius:8px;font-family:"Segoe UI",Arial,sans-serif;' +
            'font-size:14px;box-shadow:0 4px 20px rgba(0,0,0,0.5);' +
            'border:1px solid ' + (isError ? '#ff6b6b' : '#4fc3f7') + ';' +
            'max-width:80vw;text-align:center;z-index:9999999;';
        document.body.append(toast);
        setTimeout(function() {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.5s';
            setTimeout(function() { toast.remove(); }, 500);
        }, 3000);
    }

    // ============================================================
    //  提取器
    // ============================================================

    function extractAllSubjects() {
        var items = [];
        var containers = document.querySelectorAll('div[id$="-2"]');

        containers.forEach(function(container) {
            var textDiv = container.querySelector('.textSrc___T0QL6');
            if (!textDiv) return;

            var text = textDiv.textContent.trim();
            text = text.replace(/\s+/g, ' ');

            if (text && !text.match(/^https?:\/\//)) {
                items.push(text);
            }
        });

        return items;
    }

    function formatExtracted(items) {
        if (!items.length) return '⚠️ 未找到任何 -2 卡片数据。';
        var result = '';
        items.forEach(function(text, index) {
            result += (index + 1) + '. ' + text + '\n';
        });
        return result.trim();
    }

    // ============================================================
    //  填入器（React 兼容）
    // ============================================================

    function findTargetTextareas() {
        var textareas = [];
        var containers = document.querySelectorAll('.question___Vdy3Z');

        containers.forEach(function(container) {
            var title = container.querySelector('.title___UWwgB');
            if (title && title.textContent.trim() === '正确属性值（错误时填写，填写正确的）') {
                var textarea = container.querySelector('textarea.input___yNLxA');
                if (textarea) {
                    textareas.push(textarea);
                }
            }
        });

        return textareas;
    }

    function parseAIDataByQuestion(text) {
        if (!text || !text.trim()) return {};

        var lines = text.split('\n')
            .map(function(line) { return line.trim(); })
            .filter(function(line) { return line !== ''; });

        var result = {};

        lines.forEach(function(line) {
            var match = line.match(/^(\d+)\.\s*(.+)$/);
            if (match) {
                var questionNum = parseInt(match[1], 10);
                var content = match[2].trim();

                if (!content) return;

                if (content.indexOf('，') !== -1 || content.indexOf(',') !== -1) {
                    var parts = content.split(/[，,]\s*/).map(function(p) { return p.trim(); });
                    parts = parts.filter(function(p) { return p !== ''; });
                    if (parts.length === 0) return;
                    if (parts.length === 1) {
                        result[questionNum] = parts[0];
                    } else {
                        result[questionNum] = parts;
                    }
                } else {
                    result[questionNum] = content;
                }
            }
        });

        return result;
    }

    function fillByQuestion(dataMap) {
        var textareas = findTargetTextareas();

        if (textareas.length === 0) {
            showToast('⚠️ 未找到"正确属性值"的文本框', true);
            return { filledQuestions: 0, totalValues: 0 };
        }

        var filledCount = 0;
        var totalValues = 0;

        var nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype,
            'value'
        )?.set;

        for (var i = 0; i < textareas.length; i++) {
            var questionNum = i + 1;
            var textarea = textareas[i];
            var value = dataMap[questionNum];

            if (value === undefined || value === null) continue;

            var fillText = Array.isArray(value) ? value.join(',') : value;

            if (nativeInputValueSetter) {
                nativeInputValueSetter.call(textarea, fillText);
            } else {
                textarea.value = fillText;
            }

            var inputEvent = new Event('input', { bubbles: true });
            textarea.dispatchEvent(inputEvent);
            var changeEvent = new Event('change', { bubbles: true });
            textarea.dispatchEvent(changeEvent);

            filledCount++;
            totalValues += Array.isArray(value) ? value.length : 1;
        }

        return { filledQuestions: filledCount, totalValues: totalValues };
    }

    function clearAllTextareas() {
        var textareas = findTargetTextareas();
        var count = 0;
        var nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype,
            'value'
        )?.set;

        textareas.forEach(function(ta) {
            if (nativeInputValueSetter) {
                nativeInputValueSetter.call(ta, '');
            } else {
                ta.value = '';
            }
            var event = new Event('input', { bubbles: true });
            ta.dispatchEvent(event);
            count++;
        });
        return count;
    }

    // ============================================================
    //  复制
    // ============================================================

    function copyToClipboard(text) {
        try {
            if (typeof GM_setClipboard === 'function') {
                GM_setClipboard(text, 'text');
                return true;
            }
        } catch (e) {}

        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text);
                return true;
            }
        } catch (e) {}

        try {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
            document.body.append(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
            return true;
        } catch (e) {
            return false;
        }
    }

    // ============================================================
    //  创建面板（同页显示版）
    // ============================================================

    function createPanel() {
        var old = document.getElementById('filler-panel');
        if (old) old.remove();

        var panel = document.createElement('div');
        panel.id = 'filler-panel';
        panel.style.cssText =
            'position:fixed;bottom:20px;right:20px;z-index:999998;' +
            'background:#1a1a2e;color:#eee;border-radius:12px;' +
            'box-shadow:0 8px 32px rgba(0,0,0,0.6);' +
            'border:1px solid #4fc3f7;padding:12px 16px;' +
            'max-width:480px;max-height:90vh;' +
            'display:flex;flex-direction:column;' +
            'font-family:"Segoe UI",Arial,sans-serif;font-size:13px;' +
            'min-width:280px;';

        // ---- 标题 ----
        var titleBar = document.createElement('div');
        titleBar.style.cssText =
            'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;cursor:move;';
        titleBar.innerHTML =
            '<span style="font-weight:bold;color:#4fc3f7;font-size:15px;">🏷️ 标注助手</span>' +
            '<span id="filler-toggle-btn" style="cursor:pointer;font-size:18px;color:#aaa;padding:0 4px;">−</span>';
        panel.append(titleBar);

        // ============================================================
        //  提取区
        // ============================================================

        var extractSection = document.createElement('div');
        extractSection.id = 'extract-section';
        extractSection.style.cssText = 'margin-bottom:8px;border-bottom:1px solid #333;padding-bottom:8px;';

        var extractTitle = document.createElement('div');
        extractTitle.style.cssText = 'font-weight:bold;color:#4fc3f7;font-size:13px;margin-bottom:4px;';
        extractTitle.textContent = '📋 提取';
        extractSection.append(extractTitle);

        var extractInfo = document.createElement('div');
        extractInfo.style.cssText = 'font-size:11px;color:#888;margin-bottom:4px;';
        extractInfo.innerHTML = '💡 提取所有 -2 卡片 <span style="color:#ffa726;">（AI 处理时保留题号，如 "3. iPhone 15,iPhone 14"）</span>';
        extractSection.append(extractInfo);

        var extractBtnBar = document.createElement('div');
        extractBtnBar.style.cssText = 'display:flex;gap:6px;margin-bottom:4px;';

        var extractBtn = document.createElement('button');
        extractBtn.textContent = '🔍 提取并复制';
        extractBtn.style.cssText =
            'padding:4px 14px;background:#4fc3f7;color:#1a1a2e;' +
            'border:none;border-radius:4px;font-weight:bold;font-size:12px;' +
            'cursor:pointer;flex:2;font-family:inherit;';
        extractBtn.onmouseover = function() { this.style.background = '#0288d1'; };
        extractBtn.onmouseout = function() { this.style.background = '#4fc3f7'; };
        extractBtnBar.append(extractBtn);

        var extractClearBtn = document.createElement('button');
        extractClearBtn.textContent = '🗑️';
        extractClearBtn.style.cssText =
            'padding:4px 10px;background:#e57373;color:#1a1a2e;' +
            'border:none;border-radius:4px;font-weight:bold;font-size:12px;' +
            'cursor:pointer;flex:0.5;font-family:inherit;';
        extractClearBtn.onmouseover = function() { this.style.background = '#d32f2f'; };
        extractClearBtn.onmouseout = function() { this.style.background = '#e57373'; };
        extractBtnBar.append(extractClearBtn);

        extractSection.append(extractBtnBar);

        var extractPreview = document.createElement('div');
        extractPreview.id = 'extract-preview';
        extractPreview.style.cssText =
            'overflow-y:auto;max-height:120px;padding:4px 6px;' +
            'font-size:11px;line-height:1.5;white-space:pre-wrap;' +
            'word-break:break-all;background:#0d0d1a;border-radius:4px;' +
            'color:#a8d8ea;font-family:Consolas,monospace;border:1px solid #2a2a3a;';
        extractPreview.textContent = '点击"提取并复制"获取数据';
        extractSection.append(extractPreview);

        panel.append(extractSection);

        // ============================================================
        //  填入区
        // ============================================================

        var fillSection = document.createElement('div');
        fillSection.id = 'fill-section';
        fillSection.style.cssText = 'flex:1;min-height:0;';

        var fillTitle = document.createElement('div');
        fillTitle.style.cssText = 'font-weight:bold;color:#ff9800;font-size:13px;margin-bottom:4px;';
        fillTitle.textContent = '📝 填入';
        fillSection.append(fillTitle);

        var fillInfo = document.createElement('div');
        fillInfo.style.cssText = 'font-size:11px;color:#888;margin-bottom:4px;';
        fillInfo.innerHTML = '💡 按题号对应填入（AI 返回必须带题号）<span style="color:#4fc3f7;">多型号用英文逗号（,）分隔</span>';
        fillSection.append(fillInfo);

        var fillBtnBar = document.createElement('div');
        fillBtnBar.style.cssText = 'display:flex;gap:6px;margin-bottom:4px;flex-wrap:wrap;';

        var fillPasteBtn = document.createElement('button');
        fillPasteBtn.textContent = '📥 从剪贴板填入';
        fillPasteBtn.style.cssText =
            'padding:4px 14px;background:#ff9800;color:#1a1a2e;' +
            'border:none;border-radius:4px;font-weight:bold;font-size:12px;' +
            'cursor:pointer;flex:2;font-family:inherit;';
        fillPasteBtn.onmouseover = function() { this.style.background = '#e68900'; };
        fillPasteBtn.onmouseout = function() { this.style.background = '#ff9800'; };
        fillBtnBar.append(fillPasteBtn);

        var fillManualBtn = document.createElement('button');
        fillManualBtn.textContent = '✏️ 手动输入';
        fillManualBtn.style.cssText =
            'padding:4px 12px;background:#7c4dff;color:#fff;' +
            'border:none;border-radius:4px;font-weight:bold;font-size:12px;' +
            'cursor:pointer;flex:1;font-family:inherit;';
        fillManualBtn.onmouseover = function() { this.style.background = '#536dfe'; };
        fillManualBtn.onmouseout = function() { this.style.background = '#7c4dff'; };
        fillBtnBar.append(fillManualBtn);

        var fillClearBtn = document.createElement('button');
        fillClearBtn.textContent = '🗑️ 清空';
        fillClearBtn.style.cssText =
            'padding:4px 10px;background:#e57373;color:#1a1a2e;' +
            'border:none;border-radius:4px;font-weight:bold;font-size:12px;' +
            'cursor:pointer;flex:0.8;font-family:inherit;';
        fillClearBtn.onmouseover = function() { this.style.background = '#d32f2f'; };
        fillClearBtn.onmouseout = function() { this.style.background = '#e57373'; };
        fillBtnBar.append(fillClearBtn);

        fillSection.append(fillBtnBar);

        // 手动输入框
        var fillManualArea = document.createElement('div');
        fillManualArea.id = 'fill-manual-area';
        fillManualArea.style.cssText = 'display:none;margin-bottom:4px;';

        var fillManualInput = document.createElement('textarea');
        fillManualInput.id = 'fill-manual-input';
        fillManualInput.style.cssText =
            'width:100%;height:60px;padding:4px 6px;' +
            'background:#0d0d1a;color:#a8d8ea;border:1px solid #444;' +
            'border-radius:4px;font-size:11px;font-family:Consolas,monospace;' +
            'resize:vertical;box-sizing:border-box;';
        fillManualInput.placeholder = '3. iPhone 15,iPhone 14,iPhone 13\n7. iPhone 15';
        fillManualArea.append(fillManualInput);

        var fillManualConfirmBtn = document.createElement('button');
        fillManualConfirmBtn.textContent = '✅ 确认填入';
        fillManualConfirmBtn.style.cssText =
            'padding:3px 12px;background:#4fc3f7;color:#1a1a2e;' +
            'border:none;border-radius:4px;font-weight:bold;font-size:12px;' +
            'cursor:pointer;margin-top:4px;font-family:inherit;';
        fillManualConfirmBtn.onmouseover = function() { this.style.background = '#0288d1'; };
        fillManualConfirmBtn.onmouseout = function() { this.style.background = '#4fc3f7'; };
        fillManualArea.append(fillManualConfirmBtn);

        fillSection.append(fillManualArea);

        var fillPreview = document.createElement('div');
        fillPreview.id = 'fill-preview';
        fillPreview.style.cssText =
            'overflow-y:auto;max-height:140px;padding:4px 6px;' +
            'font-size:11px;line-height:1.5;white-space:pre-wrap;' +
            'word-break:break-all;background:#0d0d1a;border-radius:4px;' +
            'color:#888;font-family:Consolas,monospace;border:1px solid #2a2a3a;';
        fillPreview.textContent = '等待数据...';
        fillSection.append(fillPreview);

        panel.append(fillSection);

        // ---- 状态栏 ----
        var status = document.createElement('div');
        status.id = 'filler-status';
        status.style.cssText =
            'font-size:11px;color:#666;margin-top:6px;padding-top:4px;' +
            'border-top:1px solid #2a2a2a;text-align:center;';
        status.textContent = '就绪';
        panel.append(status);

        document.body.append(panel);

        // ============================================================
        //  事件绑定
        // ============================================================

        // 更新状态栏的卡片数量
        function updateStatus() {
            var count = document.querySelectorAll('div[id$="-2"]').length;
            var textareaCount = findTargetTextareas().length;
            status.textContent = '就绪 | ' + count + ' 个 -2 卡片 | ' + textareaCount + ' 个文本框';
        }
        updateStatus();

        // ---- 提取 ----
        extractBtn.addEventListener('click', function() {
            var items = extractAllSubjects();
            var formatted = formatExtracted(items);

            if (items.length === 0) {
                extractPreview.textContent = '⚠️ 未找到任何 -2 卡片数据。';
                status.textContent = '❌ 未找到数据';
                status.style.color = '#e57373';
                showToast('⚠️ 未找到 -2 卡片', true);
                return;
            }

            extractPreview.textContent = formatted + '\n\n' + '⚠️ AI 处理时保留题号格式（如 "3. iPhone 15,iPhone 14"）';
            var ok = copyToClipboard(formatted);
            if (ok) {
                status.textContent = '✅ 已复制 ' + items.length + ' 条到剪贴板';
                status.style.color = '#4fc3f7';
                showToast('✅ 已复制 ' + items.length + ' 条到剪贴板');
                updateStatus();
            } else {
                status.textContent = '⚠️ 复制失败';
                status.style.color = '#ffa726';
            }
        });

        extractClearBtn.addEventListener('click', function() {
            extractPreview.textContent = '已清空';
            status.textContent = '🗑️ 已清空';
            status.style.color = '#666';
            updateStatus();
        });

        // ---- 填入 ----
        var manualVisible = false;

        fillManualBtn.addEventListener('click', function() {
            manualVisible = !manualVisible;
            fillManualArea.style.display = manualVisible ? 'block' : 'none';
            fillManualBtn.textContent = manualVisible ? '✏️ 收起输入' : '✏️ 手动输入';
        });

        function doFill(text) {
            var dataMap = parseAIDataByQuestion(text);
            var keys = Object.keys(dataMap);

            if (keys.length === 0) {
                fillPreview.textContent = '⚠️ 无法解析数据。请确保格式为 "数字. 内容"，如 "3. iPhone 15,iPhone 14"';
                status.textContent = '❌ 解析失败';
                status.style.color = '#e57373';
                showToast('⚠️ 无法解析数据，请检查格式', true);
                return;
            }

            var previewText = '📋 解析到 ' + keys.length + ' 个题号的数据：\n';
            keys.sort(function(a, b) { return parseInt(a, 10) - parseInt(b, 10); });
            keys.forEach(function(key) {
                var val = dataMap[key];
                if (Array.isArray(val)) {
                    previewText += '  ' + key + '. → ' + val.join(',') + '\n';
                } else {
                    previewText += '  ' + key + '. → ' + val + '\n';
                }
            });
            fillPreview.textContent = previewText;

            var result = fillByQuestion(dataMap);
            if (result.filledQuestions > 0) {
                status.textContent = '✅ 已填入 ' + result.filledQuestions + ' 个题号（共 ' + result.totalValues + ' 个型号）';
                status.style.color = '#4fc3f7';
                showToast('✅ 已填入 ' + result.filledQuestions + ' 个题号（共 ' + result.totalValues + ' 个型号）');
            } else {
                status.textContent = '❌ 填入失败';
                status.style.color = '#e57373';
                showToast('❌ 填入失败，请检查页面', true);
            }
            updateStatus();
        }

        fillPasteBtn.addEventListener('click', function() {
            if (navigator.clipboard && navigator.clipboard.readText) {
                navigator.clipboard.readText().then(function(text) {
                    doFill(text);
                }).catch(function() {
                    showToast('⚠️ 无法读取剪贴板', true);
                });
            } else {
                showToast('⚠️ 浏览器不支持读取剪贴板', true);
            }
        });

        fillManualConfirmBtn.addEventListener('click', function() {
            var text = document.getElementById('fill-manual-input').value;
            if (!text.trim()) {
                showToast('⚠️ 请输入数据', true);
                return;
            }
            doFill(text);
        });

        fillClearBtn.addEventListener('click', function() {
            var count = clearAllTextareas();
            fillPreview.textContent = '🗑️ 已清空 ' + count + ' 个文本框';
            status.textContent = '🗑️ 已清空 ' + count + ' 个文本框';
            status.style.color = '#666';
            showToast('🗑️ 已清空 ' + count + ' 个文本框');
            updateStatus();
        });

        // ---- 最小化 ----
        var isCollapsed = false;
        var toggleBtn = document.getElementById('filler-toggle-btn');
        var children = [extractSection, fillSection, status];

        toggleBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            isCollapsed = !isCollapsed;
            children.forEach(function(el) {
                el.style.display = isCollapsed ? 'none' : '';
            });
            toggleBtn.textContent = isCollapsed ? '+' : '−';
            panel.style.maxHeight = isCollapsed ? '50px' : '90vh';
            panel.style.padding = isCollapsed ? '8px 14px' : '12px 16px';
        });

        // ---- 拖动 ----
        var dragging = false,
            startX, startY, origX, origY;
        titleBar.addEventListener('pointerdown', function(e) {
            if (e.target.closest('button') || e.target.closest('#filler-toggle-btn')) return;
            e.preventDefault();
            var rect = panel.getBoundingClientRect();
            startX = e.clientX;
            startY = e.clientY;
            origX = rect.left;
            origY = rect.top;
            dragging = true;

            function onMove(e) {
                if (!dragging) return;
                panel.style.left = (origX + e.clientX - startX) + 'px';
                panel.style.top = (origY + e.clientY - startY) + 'px';
                panel.style.right = 'auto';
                panel.style.bottom = 'auto';
            }

            function onUp() {
                dragging = false;
                document.removeEventListener('pointermove', onMove);
                document.removeEventListener('pointerup', onUp);
            }
            document.addEventListener('pointermove', onMove);
            document.addEventListener('pointerup', onUp);
        });

        console.log('🏷️ 标注助手 v4.0.0 已加载（同页显示版）');
    }

    // ============================================================
    //  启动
    // ============================================================

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createPanel);
    } else {
        setTimeout(createPanel, 300);
    }

})();
