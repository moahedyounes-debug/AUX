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
    nav_parts:      'Spare Parts',
    nav_rejected:   'Rejected / Returned',
    nav_callcenter: 'Call Center',
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
    no_worker_assigned: 'No Worker Assigned',
    page_total:     'total',

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
    type:              'Type',
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

    // KPI Cards (Parts Dashboard)
    total_skus:         'TOTAL SKUS',
    total_skus_desc:    'Parts in inventory',
    low_stock:          'LOW STOCK',
    low_stock_desc:     '≤ 3 units at SVC',
    out_of_stock:       'OUT OF STOCK',
    out_of_stock_desc:  'Zero balance',
    reorder_alert:      'REORDER ALERT',
    reorder_alert_desc: '< 3 months stock',
    total_stock:        'TOTAL STOCK',
    total_stock_desc:   'Main WH inventory',

    // Parts Dashboard - Main Views
    main_branch_stock:          'Main Branch Stock',
    svc_center_distribution:    'SVC Center Distribution',
    consumption_tracker:        'Consumption Tracker',
    return_management:          'Return Management',
    part_tracking_lifecycle:    'Part Tracking Lifecycle',
    pending_requests_board:     'Pending Requests Board',

    // Parts Dashboard - Column Headers
    part_code:          'Part Code',
    part_name:          'Part Name',
    balance:            'Balance',
    consumed_ytd:       'Consumed YTD',
    last_received:      'Last Received',
    svc_point:          'SVC Point',
    inventory_count:    'Inventory Count',
    consumption_rate:   'Consumption Rate (30d)',
    low_stock_flag:     'Low Stock',
    branch:             'Branch',
    stock_point:        'Stock Point',
    warehouse:          'Warehouse',
    consumed_count:     'Consumed Count',
    consumed_by:        'Consumed By',
    last_used:          'Last Used',
    return_reference:   'Reference #',
    request_date:       'Request Date',
    return_requested:   'Return Requested',
    return_received:    'Return Received',
    status:             'Status',
    days_in_transit:    'Days in Transit',
    outstanding:        'Outstanding',

    // Return Status Labels
    pending_return:     'Pending Return',
    in_transit:         'In Transit',
    returned:           'Returned',
    in_use:             'In Use',
    awaiting_receipt:   'Awaiting Receipt',

    // Status Badges
    status_pending_return:  'PENDING RETURN',
    status_in_transit:      'IN TRANSIT',
    status_returned:        'RETURNED',
    status_in_use:          'IN USE',

    // Months
    january:    'January',
    february:   'February',
    march:      'March',
    april:      'April',
    may:        'May',
    june:       'June',
    july:       'July',
    august:     'August',
    september:  'September',
    october:    'October',
    november:   'November',
    december:   'December',

    // Charts (General)
    monthly_trend:      'Monthly Trend',
    daily_performance:  'Daily Performance',
    consumption_chart:  'Consumption by Part',
    return_status:      'Return Status Overview',
    monthly_usage:      'Monthly Usage',
    last_6_months:      'Last 6 months',
    abc_classification: 'ABC Classification',
    top_consumed:       'Top 10 Consumed Parts',
    stock_by_branch:    'Stock Balance by Branch',
    reorder_alert_title: 'Reorder Alert',
    months_stock:       'Months of SVC Stock',
    pending_requests:   'Pending Part Requests',
    status_board:       'Status Board',

    // Buttons & Actions
    export_excel:       '📊 Export to Excel',
    filter:             'Filter',
    reset:              'Reset',
    search:             'Search',
    apply:              'Apply',
    close:              'Close',
    edit:               'Edit',
    save:               'Save',
    cancel:             'Cancel',
    delete:             'Delete',
    print:              'Print',

    // Messages
    no_data:            'No data available',
    loading:            'Loading…',
    error_loading:      'Error loading data',
    success:            'Success',
    warning:            'Warning',
    please_select:      'Please select',

    // Call Center
    cc_sla_rate:           'SLA Rate',
    cc_abandon_rate:       'Abandon Rate',
    cc_total_calls:        'Total Calls',
    cc_whatsapp:           'WhatsApp',
    cc_avg_aht:            'Avg AHT',
    cc_avg_tht:            'Avg THT',
    cc_inbound:            'Inbound',
    cc_outbound:           'Outbound',
    cc_all_calls:          'All calls',
    cc_conversations:      'Conversations',
    cc_handle_time:        'Handle time',
    cc_talk_time:          'Talk time',
    cc_of_total:           'of total',
    cc_target_sla:         'Target ≥',
    cc_target_abandon:     'Target ≤',
    cc_sla_rate_monthly:   'SLA Rate — Monthly',
    cc_abandon_rate_monthly: 'Abandon Rate — Monthly',
    cc_call_volume_monthly:  'Call Volume — Inbound vs Outbound',
    cc_wa_volume_monthly:    'WhatsApp Volume — Monthly',
    cc_peak_hours:           'Peak Hours — Calls & WhatsApp',
    cc_peak_hours_sub:       'Volume by hour of day (darker = more volume)',
    cc_within_sla_formula:   'Within SLA=1 ÷ total · target',
    cc_abandon_formula:      'Event=ABANDON ÷ total · target ≤',
    cc_agent_evaluation:     'Agent Evaluation — Overall Scores',
    cc_agents:               'agents',
    cc_monthly_evaluation:   'Monthly Evaluation — All Agents',
    cc_call_center_agent:    'Call center agent',
    cc_no_eval_data:         'No evaluation data for this period',

    // Pages - Common UI elements
    completion_result_blank:  'Completion Result blank',
    no_reason_reschedule:     'No Reason For Rescheduling',
    worker_name_blank:        'Worker Name = blank',
    kpi_formulas:             'KPI Formulas',
    aging_formula:            'Aging Formula',
    pending_aging:            'Pending Aging',
    completed_aging:          'Completed Aging',
    today_dispatch_time:      'TODAY − Dispatch Point Time',
    completion_to_dispatch:   'Completion Time − Dispatch Point Time',
    best_month_48h:           'Best Month (48h)',
    worst_month_48h:          'Worst Month (48h)',
    avg_48h_rate:             'Avg 48h Rate',
    avg_72h_rate:             'Avg 72h Rate',
    rate_48h_trend:           '48h & 72h Rate Trend',
    ticket_volume:            'Ticket Volume',
    pending_trend_duration:   'Pending Trend (Duration)',
    monthly_comparison:       'Monthly Comparison',
    todays_visits:            "Today's Visits",
    from_reschedule_date:     'from Rescheduling date',
    aging_distribution:       'Aging Distribution (Pending)',
    reschedule_reasons:       'Reschedule Reasons',
    tickets_count:            'tickets',
    pending_summary_pivot:    'Pending Summary — Pivot (Branch × Aging)',
    by_service_center_aging:  'Pending by Service Center & Aging',
    load_by_city:             'Load by City',
    with_reason:              'With Reason',
    rate_48h_monthly:         '48h Rate — Monthly',
    rate_72h_monthly:         '72h Rate — Monthly',
    rescheduled_tickets_monthly: 'Rescheduled Tickets — Monthly',
    pending_by_reason:        'Pending by Reschedule Reason',
    formula_pending:          'Affiliated SC ≠ blank AND Completion Result = blank',
    formula_48h_rate:         'Completed(≤48h) ÷ Total Completed × 100',
    formula_no_reason:        'Pending AND Reason For Rescheduling = blank',
    formula_no_worker:        'Pending AND Worker Name = blank',

    // Rejected/Returned Page
    rejected:                 'Rejected',
    returned:                 'Returned',
    obm_statement:            'OBM Statement',
    combined:                 'Combined',
    type_breakdown:           'Type Breakdown',
    by_branch:                'By Branch',
    by_technician:            'By Technician',
    rejected_returned_obm:    'Rejected / Returned / OBM',
    records:                  'records',
    phase:                    'Phase',
    result:                   'Result',
    service_info:             'Service Info',
    refusal_worker:           'Refusal (worker)',
    rejected_review:          'Rejected upon review',
    cancel_obm:               'Cancel + OBM',
    of_total:                 'of total',

    // Deep Insights Page
    closed_gt_48h:            'Closed >48h',
    exceeded_target:          'Exceeded target',
    troubleshooting:          'Troubleshooting',
    device_fault_parts:       'Device fault / parts',
    value_added_service:      'Value Added',
    extra_service_freon:      'Extra service / freon',
    customer_delay:           'Customer Delay',
    postponed_no_answer:      'Postponed / no answer',
    avg_service_hours:        'Avg Service Hours',
    for_gt_48h:               'For >48h tickets',
    deep_insights_title:      'Deep Insights — Closed Tickets Analysis (>48h)',
    tickets_exceeded_48h:     'tickets closed after 48h out of',
    total_closed:             'total closed',
    exceeded_48h_target:      'exceeded 48h target',
    root_cause_analysis:      'Root Cause Analysis — Why Did It Take >48h?',
    of_gt_48h_tickets:        'of >48h tickets',
    service_hours_distribution: 'Service Hours Distribution (>48h tickets)',
    how_long_beyond_48h:      'How long beyond 48h did they take?',
    completion_type_breakdown: 'Completion Type Breakdown',
    troubleshooting_vs_value: 'Troubleshooting vs Value Added vs Other',
    delay_cause_distribution: 'Delay Cause Distribution',
    top_branches_most_48h:    'Top Branches — Most >48h Tickets',
    appointment_reschedule_analysis: 'Appointment & Rescheduling Analysis',
    reschedule_impact_closure: 'Reschedule Impact on Closure Time',
    tickets_rescheduled_vs_not: 'Tickets rescheduled vs not — avg service hours',
    had_reschedule_reason:    'Had reschedule reason',
    no_reschedule_reason:     'No reschedule reason',
    avg:                      'Avg:',
    maintenance_instructions_analysis: 'Maintenance Instructions Analysis',
    worker_performance_48h:   'Worker Performance — Most >48h Tickets',
    branches_improving:       'Branches & Improvement Focus',
    branch_performance_48h:   'Branch Performance (% >48h)',
    recommendations:          'Recommendations & Next Steps',
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
    nav_parts:      'قطع الغيار',
    nav_rejected:   'المرفوض / المرتجع',
    nav_callcenter: 'مركز الاتصال',
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
    no_worker_assigned: 'لم يتم تعيين فني',
    page_total:     'إجمالي',

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
    type:              'النوع',
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

    // KPI Cards (Parts Dashboard)
    total_skus:         'إجمالي الأصناف',
    total_skus_desc:    'الأصناف المتاحة',
    low_stock:          'مخزون منخفض',
    low_stock_desc:     '≤ 3 وحدات',
    out_of_stock:       'نافد من المخزون',
    out_of_stock_desc:  'رصيد صفر',
    reorder_alert:      'تنبيه إعادة الطلب',
    reorder_alert_desc: 'أقل من 3 أشهر',
    total_stock:        'إجمالي المخزون',
    total_stock_desc:   'مخزون المستودع الرئيسي',

    // Parts Dashboard - Main Views
    main_branch_stock:          'مخزون الفرع الرئيسي',
    svc_center_distribution:    'توزيع مراكز الخدمة',
    consumption_tracker:        'تتبع الاستهلاك',
    return_management:          'إدارة المرتجعات',
    part_tracking_lifecycle:    'دورة حياة الأصناف',
    pending_requests_board:     'لوحة الطلبات المعلّقة',

    // Parts Dashboard - Column Headers
    part_code:          'رمز الصنف',
    part_name:          'اسم الصنف',
    balance:            'الرصيد',
    consumed_ytd:       'المستهلك (سنة)',
    last_received:      'آخر استقبال',
    svc_point:          'نقطة الخدمة',
    inventory_count:    'عدد المخزون',
    consumption_rate:   'معدل الاستهلاك (30 يوم)',
    low_stock_flag:     'مخزون منخفض',
    branch:             'الفرع',
    stock_point:        'نقطة المخزون',
    warehouse:          'المستودع',
    consumed_count:     'عدد المستهلك',
    consumed_by:        'مستهلك بواسطة',
    last_used:          'آخر استخدام',
    return_reference:   'رقم المرجع',
    request_date:       'تاريخ الطلب',
    return_requested:   'تم طلب المرتجع',
    return_received:    'تم استقبال المرتجع',
    status:             'الحالة',
    days_in_transit:    'أيام في الطريق',
    outstanding:        'قيد المعالجة',

    // Return Status Labels
    pending_return:     'انتظار الإرجاع',
    in_transit:         'قيد النقل',
    returned:           'تم الإرجاع',
    in_use:             'قيد الاستخدام',
    awaiting_receipt:   'في انتظار الاستقبال',

    // Status Badges
    status_pending_return:  'انتظار الإرجاع',
    status_in_transit:      'قيد النقل',
    status_returned:        'تم الإرجاع',
    status_in_use:          'قيد الاستخدام',

    // Months
    january:    'يناير',
    february:   'فبراير',
    march:      'مارس',
    april:      'إبريل',
    may:        'مايو',
    june:       'يونيو',
    july:       'يوليو',
    august:     'أغسطس',
    september:  'سبتمبر',
    october:    'أكتوبر',
    november:   'نوفمبر',
    december:   'ديسمبر',

    // Charts (General)
    monthly_trend:      'الاتجاه الشهري',
    daily_performance:  'الأداء اليومي',
    consumption_chart:  'الاستهلاك حسب الصنف',
    return_status:      'نظرة عامة على المرتجعات',
    monthly_usage:      'الاستخدام الشهري',
    last_6_months:      'آخر 6 أشهر',
    abc_classification: 'تصنيف ABC',
    top_consumed:       'أكثر 10 أصناف استهلاكاً',
    stock_by_branch:    'رصيد المخزون حسب الفرع',
    reorder_alert_title: 'تنبيه إعادة الطلب',
    months_stock:       'أشهر مخزون الخدمة',
    pending_requests:   'طلبات الأصناف المعلّقة',
    status_board:       'لوحة الحالة',

    // Buttons & Actions
    export_excel:       '📊 تصدير إلى Excel',
    filter:             'فلتر',
    reset:              'إعادة تعيين',
    search:             'بحث',
    apply:              'تطبيق',
    close:              'إغلاق',
    edit:               'تعديل',
    save:               'حفظ',
    cancel:             'إلغاء',
    delete:             'حذف',
    print:              'طباعة',

    // Messages
    no_data:            'لا توجد بيانات',
    loading:            'جاري التحميل…',
    error_loading:      'خطأ في تحميل البيانات',
    success:            'نجح',
    warning:            'تحذير',
    please_select:      'يرجى التحديد',

    // Call Center
    cc_sla_rate:           'معدل الخدمة SLA',
    cc_abandon_rate:       'معدل الإهمال',
    cc_total_calls:        'إجمالي المكالمات',
    cc_whatsapp:           'واتساب',
    cc_avg_aht:            'متوسط وقت المعالجة',
    cc_avg_tht:            'متوسط وقت الحديث',
    cc_inbound:            'واردة',
    cc_outbound:           'صادرة',
    cc_all_calls:          'جميع المكالمات',
    cc_conversations:      'المحادثات',
    cc_handle_time:        'وقت المعالجة',
    cc_talk_time:          'وقت الحديث',
    cc_of_total:           'من الإجمالي',
    cc_target_sla:         'الهدف ≥',
    cc_target_abandon:     'الهدف ≤',
    cc_sla_rate_monthly:   'معدل الخدمة — شهري',
    cc_abandon_rate_monthly: 'معدل الإهمال — شهري',
    cc_call_volume_monthly:  'حجم المكالمات — واردة مقابل صادرة',
    cc_wa_volume_monthly:    'حجم واتساب — شهري',
    cc_peak_hours:           'ساعات الذروة — المكالمات وواتساب',
    cc_peak_hours_sub:       'الحجم حسب ساعة اليوم (أغمق = حجم أكبر)',
    cc_within_sla_formula:   'SLA=1 ÷ المجموع · الهدف',
    cc_abandon_formula:      'ABANDON ÷ المجموع · الهدف ≤',
    cc_agent_evaluation:     'تقييم الوكلاء — النتائج الإجمالية',
    cc_agents:               'وكلاء',
    cc_monthly_evaluation:   'التقييم الشهري — جميع الوكلاء',
    cc_call_center_agent:    'وكيل مركز الاتصالات',
    cc_no_eval_data:         'لا توجد بيانات تقييم لهذه الفترة',

    // Pages - Common UI elements
    completion_result_blank:  'نتيجة الإنجاز فارغة',
    no_reason_reschedule:     'لا يوجد سبب لإعادة الجدولة',
    worker_name_blank:        'اسم الفني = فارغ',
    kpi_formulas:             'معادلات KPI',
    aging_formula:            'صيغة العمر',
    pending_aging:            'انتظار العمر',
    completed_aging:          'إنجاز العمر',
    today_dispatch_time:      'اليوم − وقت الإرسال',
    completion_to_dispatch:   'وقت الإنجاز − وقت الإرسال',
    best_month_48h:           'أفضل شهر (48 ساعة)',
    worst_month_48h:          'أسوأ شهر (48 ساعة)',
    avg_48h_rate:             'متوسط معدل 48 ساعة',
    avg_72h_rate:             'متوسط معدل 72 ساعة',
    rate_48h_trend:           'اتجاه معدل 48 و 72 ساعة',
    ticket_volume:            'حجم التذاكر',
    pending_trend_duration:   'اتجاه الانتظار (المدة)',
    monthly_comparison:       'المقارنة الشهرية',
    todays_visits:            'زيارات اليوم',
    from_reschedule_date:     'من تاريخ إعادة الجدولة',
    aging_distribution:       'توزيع العمر (الانتظار)',
    reschedule_reasons:       'أسباب إعادة الجدولة',
    tickets_count:            'تذاكر',
    pending_summary_pivot:    'ملخص الانتظار — محور (الفرع × العمر)',
    by_service_center_aging:  'الانتظار حسب مركز الخدمة والعمر',
    load_by_city:             'الحمل حسب المدينة',
    with_reason:              'مع السبب',
    rate_48h_monthly:         'معدل 48 ساعة — شهري',
    rate_72h_monthly:         'معدل 72 ساعة — شهري',
    rescheduled_tickets_monthly: 'التذاكر المعاد جدولتها — شهري',
    pending_by_reason:        'الانتظار حسب سبب إعادة الجدولة',
    formula_pending:          'SC المرتبط ≠ فارغ AND نتيجة الإنجاز = فارغ',
    formula_48h_rate:         'المنجز(≤48h) ÷ إجمالي المنجز × 100',
    formula_no_reason:        'الانتظار AND سبب إعادة الجدولة = فارغ',
    formula_no_worker:        'الانتظار AND اسم الفني = فارغ',

    // Rejected/Returned Page
    rejected:                 'مرفوض',
    returned:                 'مرتجع',
    obm_statement:            'بيان OBM',
    combined:                 'مدمج',
    type_breakdown:           'تفصيل النوع',
    by_branch:                'حسب الفرع',
    by_technician:            'حسب الفني',
    rejected_returned_obm:    'مرفوض / مرتجع / OBM',
    records:                  'سجلات',
    phase:                    'المرحلة',
    result:                   'النتيجة',
    service_info:             'معلومات الخدمة',
    refusal_worker:           'رفض (من الفني)',
    rejected_review:          'مرفوض عند المراجعة',
    cancel_obm:               'إلغاء + OBM',
    of_total:                 'من الإجمالي',

    // Deep Insights Page
    closed_gt_48h:            'مغلق >48 ساعة',
    exceeded_target:          'تجاوز الهدف',
    troubleshooting:          'استكشاف الأخطاء',
    device_fault_parts:       'عطل الجهاز / قطع الغيار',
    value_added_service:      'القيمة المضافة',
    extra_service_freon:      'خدمة إضافية / فريون',
    customer_delay:           'تأخير العميل',
    postponed_no_answer:      'مؤجل / لا رد',
    avg_service_hours:        'متوسط ساعات الخدمة',
    for_gt_48h:               'للتذاكر >48 ساعة',
    deep_insights_title:      'رؤى عميقة — تحليل التذاكر المغلقة (>48 ساعة)',
    tickets_exceeded_48h:     'تذاكر مغلقة بعد 48 ساعة من بين',
    total_closed:             'إجمالي مغلق',
    exceeded_48h_target:      'تجاوز هدف 48 ساعة',
    root_cause_analysis:      'تحليل الأسباب الجذرية — لماذا استغرق >48 ساعة؟',
    of_gt_48h_tickets:        'من التذاكر >48 ساعة',
    service_hours_distribution: 'توزيع ساعات الخدمة (التذاكر >48 ساعة)',
    how_long_beyond_48h:      'كم استغرق الوقت بعد 48 ساعة؟',
    completion_type_breakdown: 'تفصيل نوع الإنجاز',
    troubleshooting_vs_value: 'استكشاف الأخطاء مقابل القيمة المضافة',
    delay_cause_distribution: 'توزيع أسباب التأخير',
    top_branches_most_48h:    'أفضل الفروع — معظم التذاكر >48 ساعة',
    appointment_reschedule_analysis: 'تحليل الموعد وإعادة الجدولة',
    reschedule_impact_closure: 'تأثير إعادة الجدولة على وقت الإغلاق',
    tickets_rescheduled_vs_not: 'التذاكر المعاد جدولتها مقابل غير المعاد — متوسط ساعات الخدمة',
    had_reschedule_reason:    'كان لديه سبب إعادة جدولة',
    no_reschedule_reason:     'لا يوجد سبب إعادة جدولة',
    avg:                      'متوسط:',
    maintenance_instructions_analysis: 'تحليل تعليمات الصيانة',
    worker_performance_48h:   'أداء الفني — معظم التذاكر >48 ساعة',
    branches_improving:       'الفروع والتركيز على التحسين',
    branch_performance_48h:   'أداء الفرع (% >48 ساعة)',
    recommendations:          'التوصيات والخطوات التالية',
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
    nav_parts:      '备件管理',
    nav_rejected:   '已拒绝/已退回',
    nav_callcenter: '呼叫中心',
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
    no_worker_assigned: '未分配技术员',
    page_total:     '总数',

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
    type:              '类型',
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

    // KPI Cards (Parts Dashboard)
    total_skus:         '库存总数',
    total_skus_desc:    '库存中的零件',
    low_stock:          '库存不足',
    low_stock_desc:     '≤ 3 件',
    out_of_stock:       '缺货',
    out_of_stock_desc:  '无库存',
    reorder_alert:      '补货提醒',
    reorder_alert_desc: '< 3 个月库存',
    total_stock:        '总库存',
    total_stock_desc:   '主仓库存',

    // Parts Dashboard - Main Views
    main_branch_stock:          '主分支库存',
    svc_center_distribution:    '服务中心分布',
    consumption_tracker:        '消耗跟踪',
    return_management:          '退货管理',
    part_tracking_lifecycle:    '零件追踪生命周期',
    pending_requests_board:     '待处理请求板',

    // Parts Dashboard - Column Headers
    part_code:          '零件代码',
    part_name:          '零件名称',
    balance:            '余额',
    consumed_ytd:       '年度消耗',
    last_received:      '最后接收',
    svc_point:          '服务点',
    inventory_count:    '库存数量',
    consumption_rate:   '消耗率（30天）',
    low_stock_flag:     '库存不足',
    branch:             '分支',
    stock_point:        '库存点',
    warehouse:          '仓库',
    consumed_count:     '消耗数量',
    consumed_by:        '消耗者',
    last_used:          '最后使用',
    return_reference:   '参考编号',
    request_date:       '请求日期',
    return_requested:   '已请求退货',
    return_received:    '已收到退货',
    status:             '状态',
    days_in_transit:    '运输天数',
    outstanding:        '待处理',

    // Return Status Labels
    pending_return:     '待退货',
    in_transit:         '运输中',
    returned:           '已退货',
    in_use:             '使用中',
    awaiting_receipt:   '等待接收',

    // Status Badges
    status_pending_return:  '待退货',
    status_in_transit:      '运输中',
    status_returned:        '已退货',
    status_in_use:          '使用中',

    // Months
    january:    '一月',
    february:   '二月',
    march:      '三月',
    april:      '四月',
    may:        '五月',
    june:       '六月',
    july:       '七月',
    august:     '八月',
    september:  '九月',
    october:    '十月',
    november:   '十一月',
    december:   '十二月',

    // Charts (General)
    monthly_trend:      '月度趋势',
    daily_performance:  '日常绩效',
    consumption_chart:  '按零件消耗',
    return_status:      '退货状态概览',
    monthly_usage:      '月度使用量',
    last_6_months:      '最后 6 个月',
    abc_classification: 'ABC 分类',
    top_consumed:       '消耗最多的 10 个零件',
    stock_by_branch:    '按分支库存余额',
    reorder_alert_title: '补货提醒',
    months_stock:       '服务点库存月份',
    pending_requests:   '待处理零件请求',
    status_board:       '状态板',

    // Buttons & Actions
    export_excel:       '📊 导出为 Excel',
    filter:             '筛选',
    reset:              '重置',
    search:             '搜索',
    apply:              '应用',
    close:              '关闭',
    edit:               '编辑',
    save:               '保存',
    cancel:             '取消',
    delete:             '删除',
    print:              '打印',

    // Messages
    no_data:            '没有可用数据',
    loading:            '加载中…',
    error_loading:      '加载数据出错',
    success:            '成功',
    warning:            '警告',
    please_select:      '请选择',

    // Call Center
    cc_sla_rate:           '服务水平率',
    cc_abandon_rate:       '放弃率',
    cc_total_calls:        '总呼叫数',
    cc_whatsapp:           'WhatsApp',
    cc_avg_aht:            '平均处理时长',
    cc_avg_tht:            '平均通话时长',
    cc_inbound:            '呼入',
    cc_outbound:           '呼出',
    cc_all_calls:          '所有呼叫',
    cc_conversations:      '对话数',
    cc_handle_time:        '处理时长',
    cc_talk_time:          '通话时长',
    cc_of_total:           '占总数',
    cc_target_sla:         '目标 ≥',
    cc_target_abandon:     '目标 ≤',
    cc_sla_rate_monthly:   '服务水平率 — 月度',
    cc_abandon_rate_monthly: '放弃率 — 月度',
    cc_call_volume_monthly:  '呼叫量 — 呼入与呼出',
    cc_wa_volume_monthly:    'WhatsApp量 — 月度',
    cc_peak_hours:           '高峰时段 — 呼叫与WhatsApp',
    cc_peak_hours_sub:       '按小时统计量（颜色越深 = 量越大）',
    cc_within_sla_formula:   'SLA=1 ÷ 总数 · 目标',
    cc_abandon_formula:      '放弃 ÷ 总数 · 目标 ≤',
    cc_agent_evaluation:     '坐席评估 — 总体得分',
    cc_agents:               '坐席',
    cc_monthly_evaluation:   '月度评估 — 所有坐席',
    cc_call_center_agent:    '呼叫中心坐席',
    cc_no_eval_data:         '本期无评估数据',

    // Pages - Common UI elements
    completion_result_blank:  '完成结果为空',
    no_reason_reschedule:     '未提供重新安排原因',
    worker_name_blank:        '技术员名称为空',
    kpi_formulas:             'KPI 公式',
    aging_formula:            '老化公式',
    pending_aging:            '待处理老化',
    completed_aging:          '完成老化',
    today_dispatch_time:      '今天 − 调度时间',
    completion_to_dispatch:   '完成时间 − 调度时间',
    best_month_48h:           '最佳月份 (48小时)',
    worst_month_48h:          '最差月份 (48小时)',
    avg_48h_rate:             '平均 48小时完成率',
    avg_72h_rate:             '平均 72小时完成率',
    rate_48h_trend:           '48小时 & 72小时完成率趋势',
    ticket_volume:            '工单数量',
    pending_trend_duration:   '待处理趋势 (持续时间)',
    monthly_comparison:       '月度比较',
    todays_visits:            "今天的访问",
    from_reschedule_date:     '从重新安排日期',
    aging_distribution:       '老化分布 (待处理)',
    reschedule_reasons:       '重新安排原因',
    tickets_count:            '工单',
    pending_summary_pivot:    '待处理摘要 — 透视 (分支 × 老化)',
    by_service_center_aging:  '按服务中心和老化的待处理',
    load_by_city:             '按城市负载',
    with_reason:              '有原因',
    rate_48h_monthly:         '48小时完成率 — 月度',
    rate_72h_monthly:         '72小时完成率 — 月度',
    rescheduled_tickets_monthly: '重新安排的工单 — 月度',
    pending_by_reason:        '按原因的待处理',
    formula_pending:          '关联 SC ≠ 空 AND 完成结果 = 空',
    formula_48h_rate:         '已完成(≤48h) ÷ 总已完成 × 100',
    formula_no_reason:        '待处理 AND 重新安排原因 = 空',
    formula_no_worker:        '待处理 AND 技术员名称 = 空',

    // Rejected/Returned Page
    rejected:                 '已拒绝',
    returned:                 '已退回',
    obm_statement:            'OBM 声明',
    combined:                 '综合',
    type_breakdown:           '类型细分',
    by_branch:                '按分支',
    by_technician:            '按技术员',
    rejected_returned_obm:    '已拒绝 / 已退回 / OBM',
    records:                  '记录',
    phase:                    '阶段',
    result:                   '结果',
    service_info:             '服务信息',
    refusal_worker:           '拒绝（技术员）',
    rejected_review:          '审查时拒绝',
    cancel_obm:               '取消 + OBM',
    of_total:                 '占总数',

    // Deep Insights Page
    closed_gt_48h:            '已关闭 >48小时',
    exceeded_target:          '超过目标',
    troubleshooting:          '故障排除',
    device_fault_parts:       '设备故障 / 零件',
    value_added_service:      '增值服务',
    extra_service_freon:      '额外服务 / 制冷剂',
    customer_delay:           '客户延迟',
    postponed_no_answer:      '已推迟 / 无回复',
    avg_service_hours:        '平均服务小时数',
    for_gt_48h:               '对于 >48小时工单',
    deep_insights_title:      '深度洞察 — 已关闭工单分析 (>48小时)',
    tickets_exceeded_48h:     '在以下时间后关闭的工单 48 小时共',
    total_closed:             '总关闭数',
    exceeded_48h_target:      '超过 48 小时目标',
    root_cause_analysis:      '根本原因分析 — 为什么花费 >48 小时？',
    of_gt_48h_tickets:        '占 >48 小时工单',
    service_hours_distribution: '服务小时分布（>48 小时工单）',
    how_long_beyond_48h:      '超过 48 小时的时间有多长？',
    completion_type_breakdown: '完成类型细分',
    troubleshooting_vs_value: '故障排除与增值服务',
    delay_cause_distribution: '延迟原因分布',
    top_branches_most_48h:    '排名分支 — 最多 >48 小时工单',
    appointment_reschedule_analysis: '预约和重新安排分析',
    reschedule_impact_closure: '重新安排对关闭时间的影响',
    tickets_rescheduled_vs_not: '已重新安排的工单与未重新安排的工单 — 平均服务小时数',
    had_reschedule_reason:    '有重新安排原因',
    no_reschedule_reason:     '无重新安排原因',
    avg:                      '平均:',
    maintenance_instructions_analysis: '维护说明分析',
    worker_performance_48h:   '技术员表现 — 最多 >48 小时工单',
    branches_improving:       '分支与改进重点',
    branch_performance_48h:   '分支绩效（% >48 小时）',
    recommendations:          '建议和后续步骤',
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
  // Re-render the current page so JS-generated content (cards, charts) gets translated
  if (typeof renderCurrentPage === 'function') {
    renderCurrentPage();
  }
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

// ─────────────────────────────────────────────────────────────
// Format numbers based on language
function formatNumber(num, decimals = 0) {
  if (num === null || num === undefined) return '—';

  const options = {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  };

  // Language-specific number formatting
  const formatters = {
    en: new Intl.NumberFormat('en-US', options),
    ar: new Intl.NumberFormat('ar-SA', options),
    zh: new Intl.NumberFormat('zh-CN', options)
  };

  return (formatters[_lang] || formatters.en).format(num);
}

// ─────────────────────────────────────────────────────────────
// Format date based on language
function formatLocalizedDate(date, format = 'short') {
  if (!date) return '—';

  const options = {
    short: { day: '2-digit', month: 'short', year: 'numeric' },
    long: { day: 'numeric', month: 'long', year: 'numeric' },
    month: { month: 'short', year: 'numeric' }
  };

  const locales = {
    en: 'en-GB',
    ar: 'ar-SA',
    zh: 'zh-CN'
  };

  return new Intl.DateTimeFormat(locales[_lang] || 'en-GB', options[format] || options.short)
    .format(new Date(date));
}

// ─────────────────────────────────────────────────────────────
// Get translated month name
function getMonthName(monthIndex) {
  const monthKeys = [
    'january', 'february', 'march', 'april',
    'may', 'june', 'july', 'august',
    'september', 'october', 'november', 'december'
  ];

  return t(monthKeys[monthIndex] || monthKeys[0]);
}

// ─────────────────────────────────────────────────────────────
// Format KPI value with language consideration
function formatKPI(value, type = 'number') {
  if (type === 'percent') {
    return formatNumber(value, 1) + '%';
  } else if (type === 'hours') {
    return formatNumber(value, 1) + ' h';
  } else if (type === 'count') {
    return formatNumber(value, 0);
  }
  return formatNumber(value, 0);
}

// ─────────────────────────────────────────────────────────────
// Create month labels in current language
function getMonthLabels() {
  return Array.from({length: 12}, (_, i) => getMonthName(i));
}

console.log('✅ i18n system loaded. Current language:', _lang);
