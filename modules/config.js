// 配置模块 - 所有可调整参数集中管理
window.__MODULES__ = window.__MODULES__ || {};
window.__MODULES__.CONFIG = {
    clickDelay: 50,
    debug: false,
    storageKey: 'tag-panel-pos',
    defaultPosition: { top: 100, right: 20 },
    dropdownTimeout: 500,
    
    // 标签配置：不再使用扁平数组，而是按模式分组
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
    }
};
