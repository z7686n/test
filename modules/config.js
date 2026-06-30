// 配置模块 - 所有可调整参数集中管理
window.__MODULES__ = window.__MODULES__ || {};
window.__MODULES__.CONFIG = {
    // 基础配置
    clickDelay: 50,
    debug: false,
    storageKey: 'tag-panel-pos',
    selectionStorageKey: 'tag-selections',
    templateStorageKey: 'tag-templates',
    defaultPosition: { top: 100, right: 20 },
    dropdownTimeout: 500,
    operationTimeout: 30000,
    
    // 分组配置
    groups: [
        { 
            id: 'correctness', 
            label: '属性值正确性判断', 
            icon: '📋',
            type: 'radio', // 单选
            defaultTags: ['准确', '错误', '无法判断']
        },
        { 
            id: 'evidence', 
            label: '证据来源', 
            icon: '📷',
            type: 'checkbox', // 多选
            defaultTags: ['image', 'subject', 'seller_filled_cpv']
        },
        { 
            id: 'errorTypes', 
            label: '错误问题类型', 
            icon: '❌',
            type: 'radio', // 单选
            defaultTags: ['答非所问(输出了其他P的V)', '模型幻觉(输出了无依据的V)', '商品本身信息不一致(优先级导致错误的V)', '类目错放', '回答不全(V只识别了一部分)', '回答多了，多余部分不冲突', '其他原因']
        }
    ],
    
    // 模板匹配关键词（用于智能识别）
    templateKeywords: {
        correctness: ['准确', '错误', '无法判断', '暂定准确', '正确'],
        evidence: ['image', 'subject', 'desc', 'seller', '图片', '标题', '描述'],
        errorTypes: ['答非所问', '模型', '幻觉', '类目', '不全', '多余', '其他', '错放']
    },
    
    // 下拉框目标文本
    dropdownTargetText: '无法判断'
};
