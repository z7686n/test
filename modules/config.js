// 所有配置集中管理
export const CONFIG = {
    clickDelay: 50,
    debug: false,
    storageKey: 'tag-panel-pos',
    defaultPosition: { top: 100, right: 20 },
    dropdownTimeout: 500,
    tags: [
        '准确', '错误', '无法判断', 'image', 'subject',
        'seller_filled_cpv', '答非所问(输出了其他P的V)',
        '模型幻觉(输出了无依据的V)', '商品本身信息不一致(优先级导致错误的V)',
        '类目错放', '回答不全(V只识别了一部分)', '回答多了，多余部分不冲突',
        '其他原因'
    ]
};
