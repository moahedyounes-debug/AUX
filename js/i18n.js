// ═══════════════════════════════════════
//  AUX ASC DASHBOARD · i18n (Translations)
//  Languages: en | ar | zh
// ═══════════════════════════════════════

const I18N = {
  en: {
    // Auth
    login_title:        'Secure Access',
    login_desc:         'Enter your registered email address to access your service center data.',
    login_email_label:  'Email Address',
    login_email_ph:     'you@servicecentre.com',
    login_btn:          'Access Dashboard',
    login_loading:      'Loading data from Google Sheets…',
    login_error_email:  'Please enter a valid email address.',
    login_error_notfound:'Email not registered in Access sheet. Please contact your administrator.',
    login_footer:       'Confidential · For authorized personnel only',
    login_brand:        'ASC Dashboard',
    login_sub:          'Maintenance Performance Intelligence',

    // Nav
    nav_overview:   'KPI Overview',
    nav_trends:     'Monthly Trends',
    nav_daily:      'Daily Operations',
    nav_pending:    'Pending Analysis',
    nav_branches:   'Branch Comparison',
    nav_rejected:   'Rejected / Returned',
    nav_export:     'Export Center',
    nav_insights:   'Deep Insights',
    nav_activity:   'Activity Log',
    nav_filters:    'FILTERS',
    nav_analytics:  'ANALYTICS',
    sign_out:       'Sign Out',

    // Filters
    filter_asc:     'ASC (Admin)',
    filter_from:    'Date From',
    filter_to:      'Date To',
    filter_branch:  'Branch',
    filter_worker:  'Worker',
    filter_reset:   'Reset Filters',
    all_ascs:       'All ASCs',
    all_branches:   'All Branches',
    all_workers:    'All Workers',

    // KPI Labels
    total_tickets:  'Total Tickets',
    pending_rate:   'Pending Rate',
    rate_48h:       '48h Repair Rate',
    rate_72h:       '72h Repair Rate',
    unassigned:     'Unassigned (ALT)',
    completed:      'Completed',
    pending:        'Pending',
    pending_no_reason: 'Pending No Reason',
    all_statuses:   'All statuses',
    target:         'Target',

    // Page titles
    pg_overview:   ['KPI Overview',         'Performance Intelligence'],
    pg_trends:     ['Monthly Trends',        'Historical Analysis'],
    pg_daily:      ['Daily Operations',      "Today's Work Queue"],
    pg_pending:    ['Pending Analysis',      'Delay Reason Deep-Dive'],
    pg_branches:   ['Branch Comparison',     'Performance Ranking'],
    pg_rejected:   ['Rejected / Returned',   'Exception Management'],
    pg_export:     ['Export Center',         'Data Export & Reports'],
    pg_insights:   ['Deep Insights',         'Closed Tickets Analysis +48h'],
    pg_activity:   ['Activity Log',          'Admin Access Log'],
    pg_parts:      ['Spare Parts',           'Inventory & Forecast Management'],
    pg_cc:         ['Call Center',           'Performance & Agent Analytics'],

    // Daily
    today_visits:      "Today's Visits",
    rescheduled_today: 'Rescheduled to today',
    total_pending:     'Total Pending',
    active_workers:    'Active Workers',
    on_schedule:       "On today's schedule",
    dispatched_na:     'Dispatched (Not Accepted)',
    status_dispatched: 'Status = Dispatched Work',
    ticket_no:         'Ticket #',
    branch:            'Branch',
    worker:            'Worker',
    ticket_status:     'Ticket Status',
    aging:             'Aging',
    reason:            'Reason',
    date:              'Date',
    remark:            'Remark',
    no_visits:         'No visits scheduled for today',
    all_pending:       'All Pending Tickets',
    showing:           'Showing',
    of:                'of',

    // Status labels
    st_not_assigned:  'Not Assigned',
    st_disp_no_upd:   'Dispatched – No Update',
    st_disp_not_acc:  'Dispatched – Not Accepted',
    st_accepted:      'Accepted & Updated',
    st_warranty:      'Warranty – Under Validation',
    st_completed_ph:  'Completed',

    // Export
    export_excel_title: 'Raw Data Export — Excel (.xlsx)',
    export_pptx_title:  'KPI Report — PowerPoint (.pptx)',
    download_excel:     'Download Excel (.xlsx)',
    download_pptx:      'Download PowerPoint (.pptx)',
    all_tickets:        'All Tickets',
    pending_only:       'Pending Only',
    completed_only:     'Completed Only',

    // Footer
    footer_desc:   'Authorized Service Centre Performance Dashboard',
    footer_credit: 'Created by',

    // Topbar
    refresh:        'Refresh',
    refreshed:      'Refreshed ✓',
    refreshing:     'Refreshing…',
    updated:        'Updated',
  },

  ar: {
    // Auth
    login_title:        'دخول آمن',
    login_desc:         'أدخل بريدك الإلكتروني المسجّل للوصول إلى بيانات مركز الخدمة.',
    login_email_label:  'البريد الإلكتروني',
    login_email_ph:     'البريد الإلكتروني',
    login_btn:          'الدخول للوحة التحكم',
    login_loading:      'جاري تحميل البيانات من جوجل شيت…',
    login_error_email:  'الرجاء إدخال بريد إلكتروني صحيح.',
    login_error_notfound:'البريد الإلكتروني غير مسجّل. تواصل مع المسؤول.',
    login_footer:       'سري · للموظفين المخوّلين فقط',
    login_brand:        'لوحة تحكم مراكز الصيانة',
    login_sub:          'مؤشرات أداء مراكز الصيانة',

    // Nav
    nav_overview:   'مؤشرات الأداء',
    nav_trends:     'الاتجاهات الشهرية',
    nav_daily:      'العمليات اليومية',
    nav_pending:    'تحليل المعلّق',
    nav_branches:   'مقارنة الفروع',
    nav_rejected:   'المرفوض / المرتجع',
    nav_export:     'تصدير البيانات',
    nav_insights:   'تحليلات عميقة',
    nav_activity:   'سجل النشاط',
    nav_filters:    'الفلاتر',
    nav_analytics:  'التحليلات',
    sign_out:       'تسجيل الخروج',

    // Filters
    filter_asc:     'مركز الصيانة (مدير)',
    filter_from:    'من تاريخ',
    filter_to:      'إلى تاريخ',
    filter_branch:  'الفرع',
    filter_worker:  'الفني',
    filter_reset:   'إعادة تعيين',
    all_ascs:       'جميع المراكز',
    all_branches:   'جميع الفروع',
    all_workers:    'جميع الفنيين',

    // KPI Labels
    total_tickets:  'إجمالي التذاكر',
    pending_rate:   'نسبة المعلّق',
    rate_48h:       'معدل الإصلاح 48س',
    rate_72h:       'معدل الإصلاح 72س',
    unassigned:     'غير محال',
    completed:      'مكتملة',
    pending:        'معلّقة',
    pending_no_reason: 'معلّق بلا سبب',
    all_statuses:   'جميع الحالات',
    target:         'الهدف',

    // Page titles
    pg_overview:   ['مؤشرات الأداء الرئيسية', 'نظرة عامة على الأداء'],
    pg_trends:     ['الاتجاهات الشهرية',      'التحليل التاريخي'],
    pg_daily:      ['العمليات اليومية',        'قائمة أعمال اليوم'],
    pg_pending:    ['تحليل المعلّق',           'تحليل أسباب التأخير'],
    pg_branches:   ['مقارنة الفروع',          'تصنيف الأداء'],
    pg_rejected:   ['المرفوض / المرتجع',      'إدارة الاستثناءات'],
    pg_export:     ['تصدير البيانات',         'تصدير البيانات والتقارير'],
    pg_insights:   ['تحليلات عميقة',          'تحليل التذاكر المغلقة +48س'],
    pg_activity:   ['سجل النشاط',             'سجل وصول المديرين'],
    pg_parts:      ['قطع الغيار',             'إدارة المخزون والتوقعات'],
    pg_cc:         ['الكول سنتر',             'الأداء وتحليلات الوكلاء'],

    // Daily
    today_visits:      'زيارات اليوم',
    rescheduled_today: 'تمت جدولتها اليوم',
    total_pending:     'إجمالي المعلّق',
    active_workers:    'الفنيون النشطون',
    on_schedule:       'في جدول اليوم',
    dispatched_na:     'تم الإرسال (لم يُقبَل)',
    status_dispatched: 'الحالة = أُرسل للعمل',
    ticket_no:         'رقم التذكرة',
    branch:            'الفرع',
    worker:            'الفني',
    ticket_status:     'حالة التذكرة',
    aging:             'المدة',
    reason:            'السبب',
    date:              'التاريخ',
    remark:            'ملاحظات',
    no_visits:         'لا توجد زيارات مجدولة اليوم',
    all_pending:       'جميع التذاكر المعلّقة',
    showing:           'عرض',
    of:                'من',

    // Status labels
    st_not_assigned:  'غير محال',
    st_disp_no_upd:   'أُرسل – لا تحديث',
    st_disp_not_acc:  'أُرسل – لم يُقبَل',
    st_accepted:      'مقبول ومحدَّث',
    st_warranty:      'ضمان – قيد المراجعة',
    st_completed_ph:  'مكتمل',

    // Export
    export_excel_title: 'تصدير البيانات الخام — Excel',
    export_pptx_title:  'تقرير المؤشرات — PowerPoint',
    download_excel:     'تنزيل Excel (.xlsx)',
    download_pptx:      'تنزيل PowerPoint (.pptx)',
    all_tickets:        'جميع التذاكر',
    pending_only:       'المعلّقة فقط',
    completed_only:     'المكتملة فقط',

    // Footer
    footer_desc:   'لوحة تحكم أداء مراكز الصيانة المعتمدة',
    footer_credit: 'تطوير',

    // Topbar
    refresh:        'تحديث',
    refreshed:      'تم التحديث ✓',
    refreshing:     'جاري التحديث…',
    updated:        'آخر تحديث',
  },

  zh: {
    // Auth
    login_title:        '安全登录',
    login_desc:         '输入您注册的电子邮件地址以访问服务中心数据。',
    login_email_label:  '电子邮件',
    login_email_ph:     '您的电子邮件',
    login_btn:          '进入仪表板',
    login_loading:      '正在从 Google Sheets 加载数据…',
    login_error_email:  '请输入有效的电子邮件地址。',
    login_error_notfound:'该电子邮件未注册。请联系管理员。',
    login_footer:       '机密 · 仅限授权人员',
    login_brand:        'ASC 服务中心仪表板',
    login_sub:          '维修服务中心绩效监控',

    // Nav
    nav_overview:   'KPI 概览',
    nav_trends:     '月度趋势',
    nav_daily:      '日常运营',
    nav_pending:    '待处理分析',
    nav_branches:   '分支比较',
    nav_rejected:   '已拒绝/已退回',
    nav_export:     '导出中心',
    nav_insights:   '深度洞察',
    nav_activity:   '活动日志',
    nav_filters:    '筛选器',
    nav_analytics:  '数据分析',
    sign_out:       '退出登录',

    // Filters
    filter_asc:     'ASC（管理员）',
    filter_from:    '开始日期',
    filter_to:      '结束日期',
    filter_branch:  '分支机构',
    filter_worker:  '技术员',
    filter_reset:   '重置筛选',
    all_ascs:       '全部 ASC',
    all_branches:   '全部分支',
    all_workers:    '全部技术员',

    // KPI Labels
    total_tickets:  '总工单数',
    pending_rate:   '待处理率',
    rate_48h:       '48小时修复率',
    rate_72h:       '72小时修复率',
    unassigned:     '未分配',
    completed:      '已完成',
    pending:        '待处理',
    pending_no_reason: '无原因待处理',
    all_statuses:   '全部状态',
    target:         '目标',

    // Page titles
    pg_overview:   ['KPI 概览',       '绩效智能分析'],
    pg_trends:     ['月度趋势',        '历史数据分析'],
    pg_daily:      ['日常运营',        '今日工作队列'],
    pg_pending:    ['待处理分析',      '延误原因深度分析'],
    pg_branches:   ['分支比较',        '绩效排名'],
    pg_rejected:   ['已拒绝/已退回',   '异常管理'],
    pg_export:     ['导出中心',        '数据导出与报告'],
    pg_insights:   ['深度洞察',        '超48小时关闭工单分析'],
    pg_activity:   ['活动日志',        '管理员访问日志'],
    pg_parts:      ['备件管理',        '库存与预测管理'],
    pg_cc:         ['呼叫中心',        '绩效与坐席分析'],

    // Daily
    today_visits:      '今日访问',
    rescheduled_today: '今日已重新安排',
    total_pending:     '待处理总数',
    active_workers:    '活跃技术员',
    on_schedule:       '在今日计划中',
    dispatched_na:     '已派遣（未接受）',
    status_dispatched: '状态 = 已派遣工作',
    ticket_no:         '工单编号',
    branch:            '分支机构',
    worker:            '技术员',
    ticket_status:     '工单状态',
    aging:             '时效',
    reason:            '原因',
    date:              '日期',
    remark:            '备注',
    no_visits:         '今日暂无计划访问',
    all_pending:       '全部待处理工单',
    showing:           '显示',
    of:                '共',

    // Status labels
    st_not_assigned:  '未分配',
    st_disp_no_upd:   '已派遣 – 无更新',
    st_disp_not_acc:  '已派遣 – 未接受',
    st_accepted:      '已接受并更新',
    st_warranty:      '保修 – 验证中',
    st_completed_ph:  '已完成',

    // Export
    export_excel_title: '原始数据导出 — Excel',
    export_pptx_title:  'KPI 报告 — PowerPoint',
    download_excel:     '下载 Excel (.xlsx)',
    download_pptx:      '下载 PowerPoint (.pptx)',
    all_tickets:        '全部工单',
    pending_only:       '仅待处理',
    completed_only:     '仅已完成',

    // Footer
    footer_desc:   '授权服务中心绩效仪表板',
    footer_credit: '创建者',

    // Topbar
    refresh:        '刷新',
    refreshed:      '已刷新 ✓',
    refreshing:     '刷新中…',
    updated:        '最后更新',
  }
};

// ── Current language state ──────────────────────────────
let _lang = localStorage.getItem('aux_lang') || 'en';

function t(key) {
  return (I18N[_lang] && I18N[_lang][key]) || I18N['en'][key] || key;
}

function setLang(lang) {
  if (!I18N[lang]) return;
  _lang = lang;
  localStorage.setItem('aux_lang', lang);
  const isRTL = lang === 'ar';
  document.documentElement.lang = lang === 'ar' ? 'ar' : lang === 'zh' ? 'zh' : 'en';
  document.documentElement.dir  = isRTL ? 'rtl' : 'ltr';
  document.body.classList.toggle('rtl', isRTL);
  applyTranslations();
}

// Apply all data-i18n attributes
function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const attr = el.getAttribute('data-i18n-attr');
    const val = t(key);
    if (attr) el.setAttribute(attr, val);
    else el.textContent = val;
  });
  // Update lang switcher active state
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-lang') === _lang);
  });
}
