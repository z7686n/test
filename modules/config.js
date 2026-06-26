// 配置模块 - 所有可调整参数集中管理
window.__MODULES__ = window.__MODULES__ || {};
window.__MODULES__.CONFIG = {
    clickDelay: 50,          // 标签点击间隔(ms)
    debug: false,            // 是否开启调试日志
    storageKey: 'tag-panel-pos',  // 面板位置存储键名
    defaultPosition: { top: 100, right: 20 },  // 面板默认位置
    dropdownTimeout: 500,    // 下拉框超时(ms)
    // 所有标签列表（按需增删改）
    tags: [
        '准确', '错误', '无法判断', 'image', 'subject',
        'seller_filled_cpv', '答非所问(输出了其他P的V)',
        '模型幻觉(输出了无依据的V)', '商品本身信息不一致(优先级导致错误的V)',
        '类目错放', '回答不全(V只识别了一部分)', '回答多了，多余部分不冲突',
        '其他原因'
    ]
};
