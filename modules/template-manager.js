// 模板管理模块 - 支持保存/加载/切换配置模板
window.__MODULES__ = window.__MODULES__ || {};
window.__MODULES__.templateManager = (function() {
    var CONFIG = window.__MODULES__.CONFIG;
    var utils = window.__MODULES__.utils;
    var showToast = utils.showToast;
    var safeJSONParse = utils.safeJSONParse;
    
    var templates = {};
    var currentTemplateId = null;
    var hasLoaded = false;
    
    // 加载所有模板
    function loadTemplates() {
        try {
            var saved = safeJSONParse(localStorage.getItem(CONFIG.templateStorageKey));
            if (saved && typeof saved === 'object') {
                templates = saved;
                if (templates._current) {
                    currentTemplateId = templates._current;
                }
                hasLoaded = true;
                return true;
            }
        } catch (e) {
            if (CONFIG.debug) console.warn('加载模板失败:', e);
        }
        return false;
    }
    
    // 保存所有模板
    function saveTemplates() {
        try {
            var data = Object.assign({}, templates);
            data._current = currentTemplateId;
            localStorage.setItem(CONFIG.templateStorageKey, JSON.stringify(data));
            return true;
        } catch (e) {
            if (CONFIG.debug) console.warn('保存模板失败:', e);
            return false;
        }
    }
    
    // 获取当前模板
    function getCurrentTemplate() {
        if (!hasLoaded) loadTemplates();
        if (currentTemplateId && templates[currentTemplateId]) {
            return templates[currentTemplateId];
        }
        return null;
    }
    
    // 获取所有模板列表
    function getTemplateList() {
        if (!hasLoaded) loadTemplates();
        var list = [];
        for (var key in templates) {
            if (key !== '_current') {
                list.push({
                    id: key,
                    name: templates[key].name || key,
                    description: templates[key].description || ''
                });
            }
        }
        return list;
    }
    
    // 创建新模板（从当前页面扫描）
    function createTemplate(name, description) {
        // 扫描页面标签
        var tagElements = document.querySelectorAll('.ant-tag-checkable, .ant-tag');
        var tags = Array.from(tagElements).map(function(el) {
            return el.textContent.trim();
        }).filter(function(t) { return t.length > 0; });
        
        // 按位置分组（智能分配）
        var groups = [];
        var total = tags.length;
        var groupCount = CONFIG.groups.length;
        
        if (total === 0) {
            showToast('⚠️ 未找到标签，请确保页面已加载', true);
            return null;
        }
        
        // 智能分组：按比例分配
        var perGroup = Math.ceil(total / groupCount);
        var start = 0;
        
        CONFIG.groups.forEach(function(group, idx) {
            var end = Math.min(start + perGroup, total);
            var groupTags = tags.slice(start, end);
            
            // 用关键词辅助归类
            var keywords = CONFIG.templateKeywords[group.id] || [];
            var matched = [];
            var unmatched = [];
            
            groupTags.forEach(function(tag) {
                var isMatch = keywords.some(function(kw) {
                    return tag.toLowerCase().includes(kw.toLowerCase());
                });
                if (isMatch) {
                    matched.push(tag);
                } else {
                    unmatched.push(tag);
                }
            });
            
            // 优先显示匹配的，再显示未匹配的
            var finalTags = matched.concat(unmatched);
            
            groups.push({
                groupId: group.id,
                tags: finalTags
            });
            
            start = end;
        });
        
        // 创建模板对象
        var template = {
            id: utils.generateId(),
            name: name || '模板-' + new Date().toLocaleDateString(),
            description: description || '',
            groups: groups,
            createdAt: new Date().toISOString()
        };
        
        // 保存模板
        templates[template.id] = template;
        currentTemplateId = template.id;
        saveTemplates();
        
        showToast('✅ 模板 "' + template.name + '" 已保存');
        return template;
    }
    
    // 删除模板
    function deleteTemplate(id) {
        if (id === currentTemplateId) {
            currentTemplateId = null;
        }
        delete templates[id];
        saveTemplates();
        showToast('🗑️ 模板已删除');
        return true;
    }
    
    // 切换模板
    function switchTemplate(id) {
        if (!templates[id]) {
            showToast('⚠️ 模板不存在', true);
            return false;
        }
        currentTemplateId = id;
        saveTemplates();
        showToast('🔄 已切换到模板: ' + templates[id].name);
        return true;
    }
    
    // 更新模板
    function updateTemplate(id, groups) {
        if (!templates[id]) {
            return false;
        }
        templates[id].groups = groups;
        templates[id].updatedAt = new Date().toISOString();
        saveTemplates();
        return true;
    }
    
    // 自动检测并应用模板（基于URL或页面特征）
    function autoDetectTemplate() {
        if (!hasLoaded) loadTemplates();
        
        var currentUrl = window.location.href;
        var bestMatch = null;
        var bestScore = 0;
        
        for (var key in templates) {
            if (key === '_current') continue;
            var template = templates[key];
            
            // 检查URL匹配
            if (template.urlPattern) {
                try {
                    var pattern = new RegExp(template.urlPattern);
                    if (pattern.test(currentUrl)) {
                        return key;
                    }
                } catch (e) {}
            }
            
            // 检查页面标签匹配度
            var tagElements = document.querySelectorAll('.ant-tag-checkable, .ant-tag');
            var currentTags = Array.from(tagElements).map(function(el) {
                return el.textContent.trim();
            }).filter(function(t) { return t.length > 0; });
            
            var allTemplateTags = [];
            template.groups.forEach(function(g) {
                allTemplateTags = allTemplateTags.concat(g.tags);
            });
            
            // 计算匹配度
            var matchCount = 0;
            currentTags.forEach(function(tag) {
                if (allTemplateTags.indexOf(tag) !== -1) {
                    matchCount++;
                }
            });
            
            var score = matchCount / Math.max(currentTags.length, allTemplateTags.length);
            if (score > bestScore && score > 0.3) {
                bestScore = score;
                bestMatch = key;
            }
        }
        
        if (bestMatch) {
            switchTemplate(bestMatch);
            return bestMatch;
        }
        
        return null;
    }
    
    // 初始化
    function init() {
        loadTemplates();
        // 如果有保存的模板但没加载，尝试自动检测
        if (!currentTemplateId) {
            autoDetectTemplate();
        }
    }
    
    // 初始化加载
    init();
    
    return {
        loadTemplates: loadTemplates,
        saveTemplates: saveTemplates,
        getCurrentTemplate: getCurrentTemplate,
        getTemplateList: getTemplateList,
        createTemplate: createTemplate,
        deleteTemplate: deleteTemplate,
        switchTemplate: switchTemplate,
        updateTemplate: updateTemplate,
        autoDetectTemplate: autoDetectTemplate,
        getCurrentId: function() { return currentTemplateId; },
        hasLoaded: function() { return hasLoaded; }
    };
})();
