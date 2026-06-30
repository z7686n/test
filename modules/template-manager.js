window.__MODULES__ = window.__MODULES__ || {};
window.__MODULES__.templateManager = (function() {
    var CONFIG = window.__MODULES__.CONFIG;
    var utils = window.__MODULES__.utils;
    var showToast = utils.showToast;
    var safeJSONParse = utils.safeJSONParse;
    var unique = utils.unique;
    
    var templates = {};
    var currentTemplateId = null;
    
    function loadTemplates() {
        try {
            var saved = safeJSONParse(localStorage.getItem(CONFIG.templateStorageKey));
            if (saved && typeof saved === 'object') {
                templates = saved;
                if (templates._current) {
                    currentTemplateId = templates._current;
                }
                return true;
            }
        } catch (e) {}
        return false;
    }
    
    function saveTemplates() {
        try {
            var data = Object.assign({}, templates);
            data._current = currentTemplateId;
            localStorage.setItem(CONFIG.templateStorageKey, JSON.stringify(data));
            return true;
        } catch (e) {
            return false;
        }
    }
    
    function scanPageTags() {
        var tagElements = document.querySelectorAll('.ant-tag-checkable, .ant-tag');
        var tags = [];
        var seen = {};
        
        Array.from(tagElements).forEach(function(el) {
            var text = el.textContent.trim();
            if (text && !seen[text]) {
                seen[text] = true;
                tags.push(text);
            }
        });
        
        return tags;
    }
    
    function smartGroup(tags) {
        var groups = CONFIG.groups;
        var total = tags.length;
        
        if (total === 0) {
            return groups.map(function(g) {
                return { groupId: g.id, tags: [] };
            });
        }
        
        var perGroup = Math.ceil(total / groups.length);
        var result = [];
        var start = 0;
        
        groups.forEach(function(group) {
            var end = Math.min(start + perGroup, total);
            var groupTags = tags.slice(start, end);
            result.push({
                groupId: group.id,
                tags: groupTags
            });
            start = end;
        });
        
        return result;
    }
    
    function getCurrentTemplate() {
        loadTemplates();
        if (currentTemplateId && templates[currentTemplateId]) {
            return templates[currentTemplateId];
        }
        return null;
    }
    
    function getTemplateList() {
        loadTemplates();
        var list = [];
        for (var key in templates) {
            if (key !== '_current') {
                list.push({
                    id: key,
                    name: templates[key].name || key
                });
            }
        }
        return list;
    }
    
    function createTemplate(name) {
        var tags = scanPageTags();
        if (tags.length === 0) {
            showToast('⚠️ 未找到标签，请确保页面已加载', true);
            return null;
        }
        
        var grouped = smartGroup(tags);
        
        var template = {
            id: 'tpl_' + Date.now(),
            name: name || '模板-' + new Date().toLocaleDateString(),
            groups: grouped,
            createdAt: new Date().toISOString()
        };
        
        templates[template.id] = template;
        currentTemplateId = template.id;
        saveTemplates();
        
        showToast('✅ 模板 "' + template.name + '" 已保存');
        return template;
    }
    
    function deleteTemplate(id) {
        if (id === currentTemplateId) {
            currentTemplateId = null;
        }
        delete templates[id];
        saveTemplates();
        showToast('🗑️ 模板已删除');
        return true;
    }
    
    function switchTemplate(id) {
        if (!templates[id]) {
            showToast('⚠️ 模板不存在', true);
            return false;
        }
        currentTemplateId = id;
        saveTemplates();
        showToast('🔄 已切换到: ' + templates[id].name);
        return true;
    }
    
    function editTemplate(id, groups) {
        if (!templates[id]) {
            return false;
        }
        templates[id].groups = groups;
        templates[id].updatedAt = new Date().toISOString();
        saveTemplates();
        return true;
    }
    
    function autoDetectAndApply() {
        loadTemplates();
        
        var currentTags = scanPageTags();
        if (currentTags.length === 0) {
            showToast('⚠️ 未找到标签', true);
            return null;
        }
        
        var templateKeys = Object.keys(templates).filter(function(k) { return k !== '_current'; });
        if (templateKeys.length === 0) {
            return createTemplate('自动模板-' + new Date().toLocaleDateString());
        }
        
        var bestMatch = null;
        var bestScore = 0;
        
        templateKeys.forEach(function(key) {
            var template = templates[key];
            var allTemplateTags = [];
            template.groups.forEach(function(g) {
                allTemplateTags = allTemplateTags.concat(g.tags);
            });
            
            var matchCount = 0;
            currentTags.forEach(function(tag) {
                if (allTemplateTags.indexOf(tag) !== -1) {
                    matchCount++;
                }
            });
            
            var score = matchCount / Math.max(currentTags.length, allTemplateTags.length);
            if (score > bestScore && score > 0.2) {
                bestScore = score;
                bestMatch = key;
            }
        });
        
        if (bestMatch) {
            switchTemplate(bestMatch);
            return bestMatch;
        }
        
        return createTemplate('自动模板-' + new Date().toLocaleDateString());
    }
    
    loadTemplates();
    
    return {
        loadTemplates: loadTemplates,
        saveTemplates: saveTemplates,
        getCurrentTemplate: getCurrentTemplate,
        getTemplateList: getTemplateList,
        createTemplate: createTemplate,
        deleteTemplate: deleteTemplate,
        switchTemplate: switchTemplate,
        editTemplate: editTemplate,
        autoDetectAndApply: autoDetectAndApply,
        scanPageTags: scanPageTags,
        getCurrentId: function() { return currentTemplateId; }
    };
})();window.__MODULES__ = window.__MODULES__ || {};
window.__MODULES__.templateManager = (function() {
    var CONFIG = window.__MODULES__.CONFIG;
    var utils = window.__MODULES__.utils;
    var showToast = utils.showToast;
    var safeJSONParse = utils.safeJSONParse;
    var unique = utils.unique;
    
    var templates = {};
    var currentTemplateId = null;
    
    function loadTemplates() {
        try {
            var saved = safeJSONParse(localStorage.getItem(CONFIG.templateStorageKey));
            if (saved && typeof saved === 'object') {
                templates = saved;
                if (templates._current) {
                    currentTemplateId = templates._current;
                }
                return true;
            }
        } catch (e) {}
        return false;
    }
    
    function saveTemplates() {
        try {
            var data = Object.assign({}, templates);
            data._current = currentTemplateId;
            localStorage.setItem(CONFIG.templateStorageKey, JSON.stringify(data));
            return true;
        } catch (e) {
            return false;
        }
    }
    
    function scanPageTags() {
        var tagElements = document.querySelectorAll('.ant-tag-checkable, .ant-tag');
        var tags = [];
        var seen = {};
        
        Array.from(tagElements).forEach(function(el) {
            var text = el.textContent.trim();
            if (text && !seen[text]) {
                seen[text] = true;
                tags.push(text);
            }
        });
        
        return tags;
    }
    
    function smartGroup(tags) {
        var groups = CONFIG.groups;
        var total = tags.length;
        
        if (total === 0) {
            return groups.map(function(g) {
                return { groupId: g.id, tags: [] };
            });
        }
        
        var perGroup = Math.ceil(total / groups.length);
        var result = [];
        var start = 0;
        
        groups.forEach(function(group) {
            var end = Math.min(start + perGroup, total);
            var groupTags = tags.slice(start, end);
            result.push({
                groupId: group.id,
                tags: groupTags
            });
            start = end;
        });
        
        return result;
    }
    
    function getCurrentTemplate() {
        loadTemplates();
        if (currentTemplateId && templates[currentTemplateId]) {
            return templates[currentTemplateId];
        }
        return null;
    }
    
    function getTemplateList() {
        loadTemplates();
        var list = [];
        for (var key in templates) {
            if (key !== '_current') {
                list.push({
                    id: key,
                    name: templates[key].name || key
                });
            }
        }
        return list;
    }
    
    function createTemplate(name) {
        var tags = scanPageTags();
        if (tags.length === 0) {
            showToast('⚠️ 未找到标签，请确保页面已加载', true);
            return null;
        }
        
        var grouped = smartGroup(tags);
        
        var template = {
            id: 'tpl_' + Date.now(),
            name: name || '模板-' + new Date().toLocaleDateString(),
            groups: grouped,
            createdAt: new Date().toISOString()
        };
        
        templates[template.id] = template;
        currentTemplateId = template.id;
        saveTemplates();
        
        showToast('✅ 模板 "' + template.name + '" 已保存');
        return template;
    }
    
    function deleteTemplate(id) {
        if (id === currentTemplateId) {
            currentTemplateId = null;
        }
        delete templates[id];
        saveTemplates();
        showToast('🗑️ 模板已删除');
        return true;
    }
    
    function switchTemplate(id) {
        if (!templates[id]) {
            showToast('⚠️ 模板不存在', true);
            return false;
        }
        currentTemplateId = id;
        saveTemplates();
        showToast('🔄 已切换到: ' + templates[id].name);
        return true;
    }
    
    function editTemplate(id, groups) {
        if (!templates[id]) {
            return false;
        }
        templates[id].groups = groups;
        templates[id].updatedAt = new Date().toISOString();
        saveTemplates();
        return true;
    }
    
    function autoDetectAndApply() {
        loadTemplates();
        
        var currentTags = scanPageTags();
        if (currentTags.length === 0) {
            showToast('⚠️ 未找到标签', true);
            return null;
        }
        
        var templateKeys = Object.keys(templates).filter(function(k) { return k !== '_current'; });
        if (templateKeys.length === 0) {
            return createTemplate('自动模板-' + new Date().toLocaleDateString());
        }
        
        var bestMatch = null;
        var bestScore = 0;
        
        templateKeys.forEach(function(key) {
            var template = templates[key];
            var allTemplateTags = [];
            template.groups.forEach(function(g) {
                allTemplateTags = allTemplateTags.concat(g.tags);
            });
            
            var matchCount = 0;
            currentTags.forEach(function(tag) {
                if (allTemplateTags.indexOf(tag) !== -1) {
                    matchCount++;
                }
            });
            
            var score = matchCount / Math.max(currentTags.length, allTemplateTags.length);
            if (score > bestScore && score > 0.2) {
                bestScore = score;
                bestMatch = key;
            }
        });
        
        if (bestMatch) {
            switchTemplate(bestMatch);
            return bestMatch;
        }
        
        return createTemplate('自动模板-' + new Date().toLocaleDateString());
    }
    
    loadTemplates();
    
    return {
        loadTemplates: loadTemplates,
        saveTemplates: saveTemplates,
        getCurrentTemplate: getCurrentTemplate,
        getTemplateList: getTemplateList,
        createTemplate: createTemplate,
        deleteTemplate: deleteTemplate,
        switchTemplate: switchTemplate,
        editTemplate: editTemplate,
        autoDetectAndApply: autoDetectAndApply,
        scanPageTags: scanPageTags,
        getCurrentId: function() { return currentTemplateId; }
    };
})();
