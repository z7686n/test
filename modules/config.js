// 配置模块
window.__MODULES__ = window.__MODULES__ || {};
window.__MODULES__.CONFIG = {
    clickDelay: 50,
    debug: false,
    storageKey: 'tag-panel-pos',
    selectionStorageKey: 'tag-selections-v2',
    templateStorageKey: 'tag-templates-v2',
    defaultPosition: { top: 100, right: 20 },
    dropdownTimeout: 500,
    operationTimeout: 30000,
    
    groups: [
        { id: 'correctness', label: '属性值正确性判断', icon: '📋' },
        { id: 'evidence', label: '证据来源', icon: '📷' },
        { id: 'errorTypes', label: '错误问题类型', icon: '❌' }
    ]
};
