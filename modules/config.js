// 配置模块 - 所有可调整参数集中管理
window.__MODULES__ = window.__MODULES__ || {};
window.__MODULES__.CONFIG = {
    // 基础配置
    clickDelay: 50,
    debug: false,
    storageKey: 'tag-panel-pos',
    selectionStorageKey: 'tag-selections',
    defaultPosition: { top: 100, right: 20 },
    dropdownTimeout: 500,
    operationTimeout: 30000, // 操作超时时间
    
    // 标签配置：按模式分组
    modes: {
        cpv: {
            label: 'CPV',
            tags: [
                '准确', '错误', '无法判断',
                'image', 'subject', 'seller_filled_cpv',
                '答非所问(输出了其他P的V)',
                '模型幻觉(输出了无依据的V)',
                '商品本身信息不一致(优先级导致错误的V)',
                '类目错放',
                '回答不全(V只识别了一部分)',
                '回答多了，多余部分不冲突',
                '其他原因'
            ]
        },
        sku: {
            label: 'SKU',
            tags: [
                '准确', '错误', '无法判断',
                'seller_filled_sku', 'image', 'subject', 'desc_texts', 'seller_filled_cpv',
                '答非所问(输出了其他P的V)',
                '模型幻觉(输出了无依据的V)',
                '商品本身信息不一致(优先级导致错误的V)',
                '类目错放',
                '回答不全(V只识别了一部分)',
                '回答多了，多余部分不冲突',
                '其他原因'
            ]
        }
    },
    
    // 下拉框匹配文本
    dropdownTargetText: '无法判断'
};
