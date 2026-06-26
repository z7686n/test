// CPV 模式 - 一键标注模块
window.__MODULES__ = window.__MODULES__ || {};
window.__MODULES__.cpvMode = (function() {
    var isProcessing = false;
    var utils = window.__MODULES__.utils;
    var showToast = utils.showToast;
    var sleep = utils.sleep;

    // CPV 模式的配置
    var CPV_CONFIG = {
        // 属性值判断（单选）
        attributeOptions: ['准确', '错误', '无法判断'],
        // 证据来源（多选）
        evidenceOptions: ['image', 'subject', 'seller_filled_cpv'],
        // 错误问题类型（单选）
        errorOptions: [
            '答非所问(输出了其他P的V)',
            '模型幻觉(输出了无依据的V)',
            '商品本身信息不一致(优先级导致错误的V)',
            '类目错放',
            '回答不全(V只识别了一部分)',
            '回答多了，多余部分不冲突',
            '其他原因'
        ]
    };

    // 查找页面上的标签（根据 class 特征）
    function findTagsByText(texts) {
        var results = [];
        var allTags = document.querySelectorAll('.ant-tag-checkable, .ant-radio-button-wrapper, .ant-btn');
        for (var i = 0; i < allTags.length; i++) {
            var tag = allTags[i];
            var tagText = tag.textContent.trim();
            // 检查是否匹配目标文本
            for (var j = 0; j < texts.length; j++) {
                if (tagText === texts[j]) {
                    results.push({ element: tag, text: tagText });
                    break;
                }
            }
        }
        return results;
    }

    // 点击标签（清空其他同组标签）
    function clickTagWithClear(element, groupSelector) {
        // 如果提供了组选择器，先清除同组其他选中
        if (groupSelector) {
            var siblings = document.querySelectorAll(groupSelector);
            for (var i = 0; i < siblings.length; i++) {
                var sibling = siblings[i];
                if (sibling !== element && sibling.classList.contains('ant-tag-checkable-checked')) {
                    try { sibling.click(); } catch (e) {}
                }
            }
        }
        // 如果当前未选中，则点击选中
        if (!element.classList.contains('ant-tag-checkable-checked')) {
            try { element.click(); } catch (e) {}
        }
    }

    // 清除指定组的所有选中
    function clearGroup(groupSelector) {
        var items = document.querySelectorAll(groupSelector);
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            if (item.classList.contains('ant-tag-checkable-checked')) {
                try { item.click(); } catch (e) {}
            }
        }
    }

    // ====== 核心执行函数 ======
    function executeCPV() {
        if (isProcessing) {
            showToast('⏳ 正在执行中，请稍候...');
            return;
        }

        isProcessing = true;
        var startTime = performance.now();

        try {
            // ----- 1. 处理属性值正确性判断（单选） -----
            var attrTags = findTagsByText(CPV_CONFIG.attributeOptions);
            var selectedCount = 0;
            
            // 先清除该组所有选中
            attrTags.forEach(function(item) {
                if (item.element.classList.contains('ant-tag-checkable-checked')) {
                    try { item.element.click(); selectedCount++; } catch(e) {}
                }
            });

            // 等待一帧
            setTimeout(function() {
                // 选中"无法判断"
                for (var i = 0; i < attrTags.length; i++) {
                    if (attrTags[i].text === '无法判断') {
                        try {
                            if (!attrTags[i].element.classList.contains('ant-tag-checkable-checked')) {
                                attrTags[i].element.click();
                            }
                        } catch(e) {}
                        break;
                    }
                }

                // ----- 2. 处理证据来源（多选） -----
                var eviTags = findTagsByText(CPV_CONFIG.evidenceOptions);
                eviTags.forEach(function(item) {
                    if (!item.element.classList.contains('ant-tag-checkable-checked')) {
                        try { item.element.click(); } catch(e) {}
                    }
                });

                // ----- 3. 处理错误问题类型（单选） -----
                var errTags = findTagsByText(CPV_CONFIG.errorOptions);
                // 先清除该组所有选中
                errTags.forEach(function(item) {
                    if (item.element.classList.contains('ant-tag-checkable-checked')) {
                        try { item.element.click(); } catch(e) {}
                    }
                });

                // 选中"其他原因"
                setTimeout(function() {
                    for (var j = 0; j < errTags.length; j++) {
                        if (errTags[j].text === '其他原因') {
                            try {
                                if (!errTags[j].element.classList.contains('ant-tag-checkable-checked')) {
                                    errTags[j].element.click();
                                }
                            } catch(e) {}
                            break;
                        }
                    }

                    var elapsed = (performance.now() - startTime).toFixed(0);
                    showToast('✅ CPV 模式完成！(属性:无法判断 + 证据全选 + 其他原因) (' + elapsed + 'ms)');
                    isProcessing = false;
                }, 100);
            }, 100);

        } catch (error) {
            showToast('❌ CPV 执行出错: ' + error.message, true);
            console.error('CPV error:', error);
            isProcessing = false;
        }
    }

    // ====== 创建 CPV 专用按钮 ======
    function createCPVButton(container) {
        var btn = document.createElement('button');
        btn.textContent = '📋 CPV 一键标注';
        btn.style.cssText = 
            'padding:5px 12px;border:none;border-radius:5px;' +
            'background:#00bcd4;color:#1a1a2e;font-weight:bold;font-size:12px;cursor:pointer;' +
            'transition:background 0.15s, transform 0.1s;' +
            'white-space:nowrap;font-family:inherit;flex:1;min-width:80px;';
        btn.addEventListener('mouseenter', function() { btn.style.background = '#0097a7'; });
        btn.addEventListener('mouseleave', function() { btn.style.background = '#00bcd4'; });
        btn.addEventListener('mousedown', function() { btn.style.transform = 'scale(0.96)'; });
        btn.addEventListener('mouseup', function() { btn.style.transform = ''; });
        btn.addEventListener('click', executeCPV);
        return btn;
    }

    // ====== 对外接口 ======
    return {
        execute: executeCPV,
        createButton: createCPVButton,
        config: CPV_CONFIG
    };
})();
