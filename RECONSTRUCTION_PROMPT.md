BUILD THE AUX ASC DASHBOARD — COMPLETE SPECIFICATION
=====================================================

You are building a production-ready, single-file-per-module web dashboard called the
"AUX ASC Dashboard" — a performance intelligence platform for Authorized Service Centers
(ASCs) of AUX Air Conditioner. Build it exactly as specified below.
No frameworks (no React, Vue, Angular). Vanilla HTML5, CSS3, ES6+ JavaScript only.
Chart.js 4.4.1 via CDN. Google Sheets CSV as the data backend.

═══════════════════════════════════════════════════════════════
SECTION 1 — FILE STRUCTURE
═══════════════════════════════════════════════════════════════

Dashboard/
├── index.html
├── css/
│   └── main.css
└── js/
    ├── config.js
    ├── i18n.js
    ├── data.js
    ├── kpis.js
    ├── charts.js
    ├── pages.js
    ├── parts.js
    ├── callcenter.js
    ├── app.js
    └── tour.js

Root (alongside Dashboard/):
    AUX_Heartbeat_Script.gs   ← Google Apps Script

Script load order in index.html (bottom of body):
  Chart.js CDN → i18n.js → config.js → data.js → kpis.js →
  charts.js → pages.js → parts.js → callcenter.js → app.js → tour.js

═══════════════════════════════════════════════════════════════
SECTION 2 — DESIGN SYSTEM (css/main.css)
═══════════════════════════════════════════════════════════════

CSS custom properties (defined on :root):

  /* AUX Brand Blues */
  --aux-blue:        #003D8F   (primary corporate blue)
  --aux-blue-dark:   #002A6B
  --aux-blue-darker: #001A47
  --aux-blue-light:  #0056C7
  --aux-blue-mid:    #1E7BE3
  --aux-blue-soft:   #5BA4F5
  --aux-blue-pale:   #93c4fb
  --aux-blue-ghost:  #d0e8ff
  --aux-blue-mist:   #eaf3ff

  /* Grays */
  --gray-900: #111318   --gray-800: #1c1f27   --gray-700: #2a2e3a
  --gray-600: #3d4255   --gray-500: #5a607a   --gray-400: #7a8099
  --gray-300: #a0a8bd   --gray-200: #c8ccda   --gray-100: #e4e7f0
  --gray-50:  #f3f5f9   --white:    #ffffff

  /* Status */
  --success: #16a34a   --success-bg: #dcfce7
  --warning: #d97706   --warning-bg: #fef3c7
  --danger:  #dc2626   --danger-bg:  #fee2e2

  /* Layout */
  --sidebar-w: 264px    --topbar-h: 62px    --footer-h: 48px

  /* Border radius */
  --r-sm: 6px   --r-md: 10px   --r-lg: 14px   --r-xl: 20px

  /* Shadows */
  --sh-sm: 0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04)
  --sh-md: 0 4px 12px rgba(0,0,0,.09), 0 2px 6px rgba(0,0,0,.05)
  --sh-lg: 0 12px 32px rgba(0,0,0,.13), 0 4px 12px rgba(0,0,0,.06)

  /* Fonts */
  --font: 'DM Sans', -apple-system, sans-serif
  --mono: 'DM Mono', 'Fira Code', monospace

Font imports (Google Fonts, in <head>):
  DM Sans: opsz 9..40, weights 300/400/500/600/700
  DM Mono: weights 400/500

body: font-family: var(--font); background: var(--gray-50);
      color: var(--gray-900); font-size: 14px; line-height: 1.5;
      -webkit-font-smoothing: antialiased;

--- AUX LOGO COMPONENT ---
.aux-logo-card: white card, border 1.5px solid gray-100, border-radius 8px, padding 8px 16px
  .aux-logo-text: 'Arial Black' / Impact, weight 900, 26px, #003D8F, letter-spacing 2px
  .aux-logo-tag: Arial, 7px, weight 700, #003D8F, letter-spacing 1.5px, margin-top 3px

.aux-logo-sidebar: white card, border-radius 7px, padding 7px 12px, box-shadow 0 1px 4px rgba(0,0,0,.15)
  .aux-logo-sidebar-text: weight 900, 20px, #003D8F, letter-spacing 2px
  .aux-logo-sidebar-tag: 6px, weight 700, #003D8F, letter-spacing 1.2px

.aux-logo-topbar: white, border gray-100, border-radius 6px, padding 5px 10px
  .aux-logo-topbar-text: 16px, weight 900, #003D8F, letter-spacing 1.5px
  .aux-logo-topbar-tag: 5.5px, weight 700, #003D8F, letter-spacing 1px, margin-top 1px

--- LOGIN ---
.login-overlay: fixed inset:0, flex-col center, gradient(145deg, #001A47→#002A6B→#003D8F), z-index 1000
.login-bg-grid: absolute inset:0, blue-tinted 44px×44px CSS grid pattern at 7% opacity
.login-card: white, border-radius 20px, padding 40px 44px, width 440px, max-width calc(100vw-32px), sh-lg
  .login-logo-wrap: flex row, gap 16px, margin-bottom 28px
  .login-brand-name: 17px, weight 600, #003D8F
  .login-brand-sub: 11px, gray-400, margin-top 2px
  .login-divider: 1px, gray-100, margin-bottom 26px
  .login-title: 22px, weight 600, gray-900, margin-bottom 8px
  .login-desc: 13px, gray-400, margin-bottom 22px, line-height 1.6
  .form-label: block, 11px, weight 600, gray-500, UPPERCASE, letter-spacing .4px
  .form-input: full width, padding 11px 14px, border 1.5px gray-200, border-radius 10px, 14px
    :focus → border aux-blue-mid, box-shadow 0 0 0 3px rgba(30,123,227,.15)
  .login-btn: full width, padding 12px 20px, bg #003D8F, white, border-radius 10px, 14px weight 600
    :hover → bg #0056C7
.login-footer-txt: 11px, rgba(255,255,255,.3), letter-spacing .5px
.spinner: 18px circle, border 2px gray-200, border-top aux-blue-mid, animation spin .7s linear
@keyframes spin: to rotate(360deg)

--- APP SHELL ---
#app: display flex, height 100vh, overflow hidden

.sidebar: width 264px, flex-shrink 0, gradient(180deg, #001A47→#002A6B), flex-col, height 100vh, transition transform .25s
  .sidebar-header: padding 16px 16px 14px, border-bottom rgba(255,255,255,.08), flex-col gap 10px
  .sidebar-product-name: 13px, weight 600, white
  .sidebar-product-sub: 9px, rgba(255,255,255,.4), UPPERCASE, letter-spacing .8px
  .sidebar-user: flex row, gap 10px, padding 12px 16px, border-bottom rgba(255,255,255,.08)
  .user-avatar: 32×32px circle, bg #0056C7, white, 12px weight 600
  .user-email: 12px, rgba(255,255,255,.8), overflow ellipsis, max-width 155px
  .user-asc: 10px, #5BA4F5, weight 600, UPPERCASE, letter-spacing .5px
  .sidebar-nav: padding 12px 10px 6px, flex 0 0 auto, overflow-y auto
  .nav-section-label: 9px, weight 600, rgba(255,255,255,.3), UPPERCASE, letter-spacing 1.2px, padding 0 8px 8px
  .nav-item: flex row, gap 10px, padding 9px 10px, border-radius 6px, rgba(255,255,255,.55), 13px, cursor pointer
    :hover → bg rgba(255,255,255,.07), rgba(255,255,255,.85)
    .active → bg rgba(91,164,245,.2), color #93c4fb, weight 500
  .nav-export: border-top rgba(255,255,255,.08), margin-top 6px, padding-top 12px
  .sidebar-filters: padding 10px 10px 6px, border-top rgba(255,255,255,.08), flex-shrink 0, overflow-y auto, max-height 380px
  .filter-label: 9px, weight 600, rgba(255,255,255,.3), UPPERCASE, letter-spacing 1px
  .filter-input: full width, padding 7px 10px, bg rgba(255,255,255,.08), border rgba(255,255,255,.1), border-radius 6px, rgba(255,255,255,.8), 12px
    :focus → border #000, color #000
    option → bg #002A6B, color white
  .filter-reset-btn: full width, bg transparent, border rgba(255,255,255,.15), 11px, rgba(255,255,255,.5), margin-top 4px
  .sidebar-bottom: padding 12px 16px, border-top rgba(255,255,255,.08), margin-top auto
  .logout-btn: flex row, gap 8px, bg rgba(255,255,255,.12), border rgba(255,255,255,.25), border-radius 8px, white, 12px, padding 8px 12px, width 100%
    :hover → bg rgba(255,255,255,.22)
  .last-updated: 10px, rgba(255,255,255,.2), margin-top 5px, font-family mono

.topbar: height 62px, white, border-bottom gray-100, flex row space-between, padding 0 22px, sh-sm, z-index 100
  .topbar-left: flex row, gap 14px
  .menu-toggle: bg none, border none, gray-500, display NONE on desktop (shown at ≤960px)
  .page-title-area: flex-col, border-left gray-100, padding-left 14px, margin-left 4px
  .topbar-title: 16px, weight 600, gray-900, letter-spacing -.3px
  .topbar-crumb: 11px, gray-400
  .topbar-right: flex row, gap 14px
  .data-freshness: flex row, gap 6px, 12px, gray-400
  .freshness-dot: 7×7px circle, bg #16a34a, animation pulse 2s infinite
  @keyframes pulse: 0%,100% opacity:1 / 50% opacity:.4
  .asc-badge: padding 4px 12px, border-radius 20px, bg #eaf3ff, #003D8F, 12px weight 600, border #d0e8ff
  .admin-badge: flex, padding 4px 10px, bg #fef3c7, #d97706, 12px weight 700, border-radius 20px, border 1px #d97706
  .refresh-btn: flex row, gap 6px, padding 6px 12px, bg transparent, border gray-200, border-radius 10px, gray-500, 12px weight 500
    :hover → bg #eaf3ff, border #d0e8ff, color #003D8F
    :disabled → opacity .7
  .refresh-time: font-family mono, 10px, gray-300, border-left gray-200, padding-left 4px

.main-content: flex 1, flex-col, overflow hidden, bg gray-50
.content-area: flex 1, overflow-y auto, padding 22px
.page: display none, animation fadeIn .2s ease
.page.active: display block
@keyframes fadeIn: from opacity:0 translateY(6px) → to opacity:1

.app-footer: height 48px, border-top gray-100, white, flex row space-between, padding 0 22px
  .footer-logo: 'Arial Black'/Impact, weight 900, 14px, #003D8F, letter-spacing 1.5px
  .footer-desc: 11px, gray-400
  .footer-credit: 11px, gray-400, italic — "Created by Moahed Younes" in #003D8F weight 600

--- KPI CARDS ---
.kpi-grid: grid, auto-fill minmax(162px, 1fr), gap 13px, margin-bottom 22px
.kpi-card: white, border-radius 14px, padding 18px 16px, border gray-100, sh-sm
  :hover → sh-md, translateY(-1px)
  ::before → absolute top-0 left-0 right-0 height 3px (colored top stripe)
  .blue::before   → bg #003D8F
  .green::before  → bg #16a34a
  .amber::before  → bg #d97706
  .red::before    → bg #dc2626
  .gray::before   → bg #7a8099
  .accent: bg #003D8F, border #003D8F (all text inverted: label rgba(255,255,255,.7), value white, delta rgba(255,255,255,.6))
.kpi-label: 10px, weight 600, gray-400, UPPERCASE, letter-spacing .7px, margin-bottom 6px
.kpi-value: 28px, weight 600, gray-900, letter-spacing -1px, line-height 1
.kpi-delta: 11px, gray-400, margin-top 5px
.kpi-target: 10px, gray-300, margin-top 3px, font-family mono

--- SECTIONS & CHARTS ---
.section-header: flex row space-between, margin-bottom 14px
.section-title: 14px, weight 600, gray-800, flex row gap 8px
  ::before → 3×15px block, border-radius 2px, bg #003D8F
.section-badge: 11px, bg #eaf3ff, #003D8F, padding 2px 8px, border-radius 20px, weight 500

.chart-grid: grid 1fr 1fr, gap 14px, margin-bottom 22px
.chart-grid.single: 1fr
.chart-grid.two-thirds: 2fr 1fr
.chart-card: white, border-radius 14px, border gray-100, sh-sm, padding 18px, overflow hidden
  .chart-card-header: flex row space-between, margin-bottom 14px
  .chart-card-title: 13px, weight 600, gray-700
  .chart-card-sub: 11px, gray-400, margin-top 2px
.chart-wrap: position relative, height 220px
.chart-wrap.tall: height 280px
.chart-wrap.short: height 160px

--- TABLE ---
.table-card: white, border-radius 14px, border gray-100, sh-sm, overflow hidden, margin-bottom 22px
.table-header: padding 14px 18px, border-bottom gray-100, flex row space-between
.table-title: 14px, weight 600, gray-800
.table-count: 12px, gray-400
.data-table: width 100%, border-collapse collapse, 13px
  th: padding 10px 14px, bg gray-50, 10px weight 600 gray-400 UPPERCASE letter-spacing .7px, border-bottom gray-100
  td: padding 10px 14px, gray-700, border-bottom gray-50, vertical-align middle
  tr:last-child td: no border
  tr:hover td: bg #eaf3ff
  th, td: text-align center (except :first-child → left)
.ticket-id: font-family mono, 11px, #003D8F
.table-empty: padding 40px, center, gray-400, 13px
.table-scroll: overflow-x auto

--- BADGES ---
.badge: inline-flex, padding 3px 9px, border-radius 20px, 11px weight 600, white-space nowrap
.badge-green: bg #dcfce7, color #16a34a
.badge-amber: bg #fef3c7, color #d97706
.badge-red:   bg #fee2e2, color #dc2626
.badge-blue:  bg #eaf3ff, color #003D8F
.badge-gray:  bg gray-100, color gray-600

--- AGING BARS ---
.aging-row: flex row, gap 12px, margin-bottom 10px
.aging-label: 12px, gray-600, width 85px, flex-shrink 0
.aging-bar-wrap: flex 1, height 8px, bg gray-100, border-radius 4px, overflow hidden
.aging-bar-fill: height 100%, border-radius 4px, transition width .4s ease
.aging-count: 12px, gray-400, font-family mono, width 36px, text-align right
Colors for aging bars (index order): #16a34a, #003D8F, #d97706, #dc2626, #111318

--- RANK NUMBERS ---
.rank-num: 24×24px circle, flex center, 11px weight 700
  .gold:   bg #fef3c7, color #92400e
  .silver: bg gray-100, color gray-600
  .bronze: bg #fde8d8, color #9a3412
  .other:  bg gray-50,  color gray-400

--- INSIGHT CARD ---
.insight-card: gradient(135deg, #eaf3ff→white), border #d0e8ff, border-radius 14px, padding 16px 20px, margin-bottom 18px, flex row gap 12px
  .insight-icon: 32×32px, border-radius 6px, bg #d0e8ff, #003D8F, flex center, 15px
  .insight-text: 13px, gray-700, line-height 1.6
  .insight-title: weight 600, gray-900, margin-bottom 3px

--- FORMULA BOX ---
.formula-box: bg #111318, border-radius 10px, padding 14px 18px, margin 10px 0
              font-family mono, 12px, color #93c4fb, line-height 1.7
  .formula-comment: rgba(160,168,189,.45)
  .formula-key: #5BA4F5
  .formula-val: #93c5fd

--- EXPORT ---
.export-section: white, border-radius 14px, border gray-100, sh-sm, padding 22px, margin-bottom 18px
.export-options: grid auto-fill minmax(210px,1fr), gap 11px, margin-bottom 18px
.export-option: border 1.5px gray-100, border-radius 10px, padding 14px, cursor pointer
  :hover / .selected → border #5BA4F5, bg #eaf3ff
.export-btn.excel: bg #1D6F42, white; :hover → #155534
.export-btn.pptx:  bg #C43E1C, white; :hover → #a33418

--- ANALYSIS CARDS ---
.analysis-card: border-radius 10px, padding 14px 16px, margin-bottom 12px
  .parts:    bg #fdf4ff, border #e9d5ff
  .customer: bg #fef9ee, border #fde68a
  .technical: bg #eaf3ff, border #d0e8ff
  .distance: bg #fef2f2, border #fecaca
  .other:    bg gray-50,  border gray-200

--- INTERACTIVE FILTER STATE ---
.chart-filter-active: border 2px #003D8F !important, box-shadow 0 0 0 3px rgba(0,61,143,.15) !important
.filter-tag: inline-flex, gap 6px, padding 4px 10px, bg #eaf3ff, #003D8F, border-radius 20px, 11px, margin-bottom 12px
  .filter-tag-x: cursor pointer, weight 700, 13px

--- LANGUAGE SWITCHER ---
.lang-switcher: flex, gap 3px, bg gray-100, border-radius 20px, padding 3px
.lang-btn: padding 4px 10px, border none, border-radius 16px, 11px weight 600, bg transparent, gray-500
  :hover → rgba(0,61,143,.08) bg, #003D8F color
  .active → bg #003D8F, white
.login-lang: justify-content center, margin-bottom 16px, bg gray-50

--- RTL SUPPORT ---
body.rtl: direction rtl
body.rtl .sidebar: left auto; right 0; transform none (desktop)
body.rtl #app: flex-direction row-reverse
body.rtl .topbar-left: flex-direction row-reverse
body.rtl .page-title-area: border-left none; border-right 1px gray-100; padding-left 0; padding-right 14px
body.rtl .nav-item: flex-direction row-reverse; text-align right
body.rtl .kpi-card::before: left auto; right 0
body.rtl .section-title::before: margin-right 0; margin-left 8px
body.rtl .data-table th, td: text-align right !important
body.rtl .badge, .text-mono: direction ltr; display inline-block
body.rtl .insight-card: flex-direction row-reverse; text-align right
body.rtl .topbar-right: flex-direction row-reverse
body.rtl .app-footer: flex-direction row-reverse
body.rtl .aging-row: flex-direction row-reverse
body.rtl .chart-card-header: flex-direction row-reverse

--- RESPONSIVE BREAKPOINTS ---
≤960px (tablet): sidebar fixed left 0, transform translateX(-100%) when closed (translateX(100%) if RTL)
  .sidebar.open → transform translateX(0), sh-lg
  .menu-toggle: display flex
  chart-grid → single column
  kpi-grid → 2 columns
  .topbar: padding 0 14px; aux-logo-topbar hidden
  .page-title-area: no border/padding
  .data-freshness: hidden

≤600px (phone): --topbar-h 54px, --footer-h 42px
  content-area padding 12px 10px
  kpi-grid: 1fr 1fr, gap 8px
  kpi-card: padding 14px 12px; kpi-value 22px; kpi-label 9px
  login-card: calc(100vw-24px)
  topbar-crumb: hidden
  chart-wrap: 180px (tall: 220px)
  data-table: 11px; th/td padding 7px 8px
  badge: 10px, padding 2px 6px
  export-options: 1fr; export-btn.pptx margin-top 8px

≤380px: kpi-grid 1fr; lang-btn smaller padding

landscape phone (≤900px + landscape):
  kpi-grid: 4 columns, kpi-value 20px, chart-wrap 160px

≥1400px: content-area padding 28px 32px; kpi-grid minmax(180px)
≥1600px: kpi-value 34px; chart-wrap 260px (tall: 320px)

Safe area (notched phones):
  sidebar/topbar/footer/login-overlay: use env(safe-area-inset-*)

Special overrides:
  #track-order, #track-awb: bg #ffffff; color #111318; border gray-200; cursor text
    :focus → border #003D8F; box-shadow 0 0 0 3px rgba(0,61,143,.12)
  .req-btn: bg gray-50, border .5px gray-200, border-radius 5px, padding 3px 9px, 10px weight 500, gray-500
    :hover → bg #E6F1FB, border #85B7EB, color #0C447C

═══════════════════════════════════════════════════════════════
SECTION 3 — CONFIG (js/config.js)
═══════════════════════════════════════════════════════════════

const CONFIG = {
  SHEET_ID:     '1x796CMZf8b3RUNkqsanO56F_Wmo75L2uLzIlgE65doY',
  DATA_SHEET:   'Sheet1',
  ACCESS_SHEET: 'Access',
  PARTS_SHEET:  'Parts',
  ALL_ACCESS:   'All',

  PARTS_SHEET_ID:      '1jQvpH0ZA5V_JB0Y2uLBM-3_Bt9VurTbncAE4WDv4wUg',
  PARTS_TRANSACTION:   'Transaction',
  PARTS_DETAILS:       'Details Of Parts',
  PARTS_MODELS:        'Parts Model',
  PARTS_REQUESTED:     'Requested Spare Part',

  CC_KPI_SHEET_ID:  '1U-GUCKqShHLkqg4FvCur-T0Tic0cMAP1ou9hvoSw_FI',
  CC_KPI_SHEET:     'Calls',
  CC_WA_SHEET:      'WhatsApp Uniqe',
  CC_EVAL_SHEET_ID: '1KDMVAKplmbNvfdd66Ha-TmJ3fm_6mD29F2AsT9UsqvE',

  TRACKING_URL: 'https://www.smsaexpress.com/en/gb/track-shipment?track=',

  PARTS_COLS: {
    LOCATION:'Location', TYPE:'Type', SORT:'Sort', REF:'Referance',
    ASC:'ASC', BRANCH:'Branch', CODE:'Code', PART_NAME:'Part Name',
    PART_NAME2:'Second Part Name', ACC_CODE:'Accessory Code', CN_NAME:'Chinese Name',
    ACC_NAME:'Accessory Name', QTY:'Quantity (Pieces)', AMOUNT:'Amount',
    AFFILIATED:'Affiliated Service Center', DOC_TYPE:'Document Type',
    PROVIDER:'Service Provider Name', WAREHOUSE:'Warehouse Name',
    TRANS_TYPE:'Transaction Type', DIRECTION:'Trading Direction',
    ORDER_NO:'Associated Order Number', CREATED:'Creation Time',
    CODE2:'Second Code', BRANCH2:'Second Branch', ASC2:'Second ASC',
  },

  CC_COLS: {
    DATE:'Date', QUEUE:'Queue', AGENT:'Agent', NUMBER:'Number', EVENT:'Event',
    WAIT_TIME:'Wait Time', TALK_TIME:'Talk Time', DID:'DID', UNIQUEID:'uniqueid',
    AHT:'AHT', THT:'THT', AGENT_NAME:'Agent Name', STATUS:'Status',
    CALL_TYPE:'Call Type', DATE_FMT:'Date Format', MONTH:'Month', WEEK:'Week',
    DAY_NAME:'Day Name', TIME:'Time', HOUR:'Hour', MINUTE:'Minute',
    SLAP:'SLAP', SLAP2:'SLAP 2', QTY:'Qty', WITHIN_SLA:'Within SLA',
  },

  EVAL_COLS: {
    AGENT:'Agent', M_YEAR:'M-Year', MONTH:'Month', CATEGORY:'Criteria Category',
    CRITERIA:'Criteria', DESC:'Description', SCORE_15:'Score (1-5)',
    MGR_EVAL:'Manager Evaluation', MAX:'Max', SCORE:'Score', SORT:'Sort',
    REMARK:'Remark', PHONE:'Phone',
  },

  COLS: {
    TICKET_NUM:'Ticket Number', PRODUCT_LINE:'Product Line',
    PROVIDER_NAME:'Service Provider Name', USER_NAME:'User Name',
    LOCATION:'Location', WORKER:'Worker Name', SERVICE_TYPE:'Service Type',
    SERVICE_INFO:'Service Information', PRODUCT_TYPE:'Product Type',
    PHASE:'Processing Phase', STATUS:'Ticket Status',
    AFFILIATED:'Affiliated Service Center', CREATED:'Order Creation Time',
    DISPATCH:'Dispatch Point Time', REJECT_DOCS:'Rejection Of Documents',
    COMPLETION_RESULT:'Completion Result', COMPLETION_TIME:'Completion time',
    SERVICE_HOURS:'Service hours(H)', APPOINTED:'Appointed Date',
    RESCHEDULING:'Rescheduling', RESCHED_REASON:'Reason For Rescheduling',
    RESCHED_SUPP:'The Reasons For The Modification Are Supplemented',
    MAINTENANCE:'Maintenance Instructions', MILEAGE:'Mileage',
  },

  COMPANIES: ['ZAM','wiFEX','Classic','DOZN','ABL'],

  TARGETS: {
    RATE_48H: 85, RATE_72H: 95, PENDING_RATE: 15,
    SLA: 80, CSAT: 80, ABANDON: 5, AHT_MAX: 300,
  },

  AGING_CATEGORIES: [
    { label:'≤ 12 Hours', max:12  },
    { label:'≤ 24 Hours', max:24  },
    { label:'≤ 48 Hours', max:48  },
    { label:'≤ 72 Hours', max:72  },
    { label:'> 72 Hours', max:Infinity },
  ],

  COLORS: {
    BLUE:'#003D8F', BLUE2:'#0056C7', BLUE3:'#5BA4F5', BLUE4:'#93c4fb',
    GRAY:'#5a607a', GREEN:'#16a34a', AMBER:'#d97706', RED:'#dc2626',
    TEAL:'#0891b2', PURPLE:'#7c3aed',
  },
};

URL builder functions:
  sheetUrl(name)    → gviz CSV: docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet={encoded}
  partsSheetUrl(n)  → same with PARTS_SHEET_ID
  ccKpiUrl()        → gviz with CC_KPI_SHEET_ID + 'Calls'
  ccWaUrl()         → gviz with CC_KPI_SHEET_ID + 'WhatsApp Uniqe'
  ccEvalUrl()       → DIRECT export (NOT gviz): docs.google.com/spreadsheets/d/{CC_EVAL_SHEET_ID}/export?format=csv
    (IMPORTANT: Evaluation sheet MUST use direct export — gviz omits Score(1-5) column)
  trackingUrl(awb)  → CONFIG.TRACKING_URL + encodeURIComponent(awb)

═══════════════════════════════════════════════════════════════
SECTION 4 — DATA LAYER (js/data.js)
═══════════════════════════════════════════════════════════════

Global state:
  const DB = {
    raw:[], filtered:[], allRaw:[],
    accessMap:{}, adminAccessMap:{}, userASC:null,
    isAdmin:false, isAdminAccess:true, loadedAt:null,
  };

CSV PARSER — parseCSV(text):
  - Remove BOM (UTF-8 BOM)
  - Character-by-character tokeniser handling quoted fields with embedded newlines
  - Escaped quotes "" → single "
  - Fields separated by comma (outside quotes)
  - Rows separated by \n or \r\n (outside quotes)
  - On header row: duplicate headers → append __N; empty headers → __col_N (N = 0-indexed position)
  - Filter out completely empty rows
  - Returns array of objects {header: value} (all values trimmed)

parseCSV_GD(text): calls parseCSV then filters rows where first column (Ticket Number) starts with "GD"

async fetchSheet(name): fetch gviz CSV → parseCSV
async fetchDataSheet(): fetch gviz main sheet → parseCSV_GD

COMPANY EXTRACTION — extractCompany(providerName):
  lowercase includes 'zam'                               → 'ZAM'
  lowercase includes 'wifex' OR 'authorized maintenance' → 'wiFEX'
  lowercase includes 'classic'                           → 'Classic'
  lowercase includes 'dozn'                              → 'DOZN'
  lowercase includes 'abl'                               → 'ABL'
  else                                                   → '' (will be filtered)

BRANCH EXTRACTION — extractBranch(providerName):
  1. Get company
  2. Find last '-' in name, extract text after it
  3. Remove " Branch" suffix (case-insensitive)
  4. Return "{city} - {company}"
  null if no company or no dash

DATE PARSER — parseDate(str):
  Try ISO: /^\d{4}-\d{2}-\d{2}/ → replace space with T → new Date()
  Try "28 Apr, 13:17" or "28 Apr 2026 13:17" → manual parse
  Try "28 Apr, 2026" (date only)
  Try DD/MM/YYYY [HH:MM] → assume Saudi DD/MM format
  Fallback: native new Date(str)
  Return null if empty, '—', or '-'

Format helpers:
  fmtDate(d): en-GB { day:'2-digit', month:'short', year:'numeric' } → "28 Apr 2026"
  fmtDateTime(d): "28 Apr, 14:30"
  fmtTime(d): "14:30"
  fmtDateTimeFull(d): "28 Apr 2026, 14:30:00"

ROW ENRICHMENT — enrichRow(row):
  r._company = extractCompany(provider)
  r._branch  = extractBranch(provider)
  r._validTicket = ticket starts with 'GD'
  r._created  = parseDate(Order Creation Time)
  r._dispatch = parseDate(Dispatch Point Time)
  r._completion = parseDate(Completion time)
  r._rescheduled = parseDate(Rescheduling)
  r._appointed   = parseDate(Appointed Date)

  affiliated = Affiliated Service Center (trimmed)
  completion = Completion Result (trimmed)
  completionLow = completion.toLowerCase()
  phase = Processing Phase (trimmed)
  phaseLow = phase.toLowerCase()
  status = Ticket Status (trimmed)
  statusLow = status.toLowerCase()
  serviceInfo = Service Information || Service Type
  serviceInfoUp = serviceInfo.toUpperCase()

  r._isPending = affiliated ≠ '' AND completion === ''

  r._isRejected = (phaseLow includes 'refusal' OR statusLow includes 'rejected')
                  AND completion ≠ '' AND NOT completionLow includes 'cancel'

  r._isReturned = (phaseLow includes 'rejected upon review' OR statusLow includes 'returned')
                  AND completion ≠ '' AND NOT completionLow includes 'cancel'

  r._isOBMStatement = completionLow includes 'cancel' AND serviceInfoUp includes 'OBM'
  r._isCancelled    = completionLow includes 'cancel' AND NOT serviceInfoUp includes 'OBM'

  r._serviceHours = parseFloat(Service hours(H)) or null
  r._mileage      = parseFloat(Mileage) or null
  r._farDistance  = mileage !== null && mileage > 60
  r._hasWorker    = !! Worker Name (non-blank)

  AGING:
    if _isPending AND _dispatch:          _agingHours = (now - _dispatch) / 3600000
    elif !_isPending AND _completion AND _dispatch: _agingHours = (_completion - _dispatch) / 3600000
    elif _dispatch:                       _agingHours = (now - _dispatch) / 3600000
    else: null

  _pendingDurationHrs = (_completion || now) - _dispatch (if dispatch exists)
  _monthKey = "YYYY-MM" from _created

  Reschedule fields:
    _rescheduleReason = Reason For Rescheduling
    _rescheduleDate   = Rescheduling (raw string)
    _rescheduleRemark = The Reasons For The Modification Are Supplemented
    _rescheduleDisplay = "Date: {date}" · {remark} (combined display)
    _hasRescheduleReason = !! Reason For Rescheduling (non-blank)

  PHASE LABELS (from Processing Phase):
    contains 'dispatch network'   → _phaseLabel='Not Assigned',            _phaseColor='red'
    contains 'accepting orders'   → _phaseLabel='Dispatched – No Update',  _phaseColor='red'
    contains 'branch dispatching' → _phaseLabel='Dispatched – Not Accepted',_phaseColor='red'
    contains 'change of schedule' → _phaseLabel='Accepted & Updated',      _phaseColor='green'
    contains 'completion confirm' → _phaseLabel='Warranty – Under Validation',_phaseColor='amber'
    contains 'statement'          → _phaseLabel='Completed',               _phaseColor='green'
    else: phase or status or '—', color='gray'

  _isNotAssigned    = phase includes 'dispatch network'
  _isDispatchedWork = phase includes 'branch dispatching'

  AGING CATEGORY:
    null → '—'
    ≤12 → '≤ 12h'
    ≤24 → '≤ 24h'
    ≤48 → '≤ 48h'
    ≤72 → '≤ 72h'
    else → '> 72h'

LOAD ALL DATA — async loadAllData(email, userASC):
  1. Fetch data sheet (GD-filtered)
  2. Fetch 'Penidng Reason' sheet (NOTE: intentional typo "Penidng")
     → build reasonMap: {reason_lowercase → category}
  3. Map each row through enrichRow()
  4. Apply _reasonCategory from reasonMap (match by _rescheduleReason lowercase)
  5. Filter: remove rows where !_company || !_branch || _isCancelled
  6. Set DB.isAdmin = (userASC === 'All')
  7. DB.allRaw = all enriched if admin, DB.raw = filtered by company if not admin
  8. DB.filtered = [...DB.raw]; DB.userASC = userASC; DB.loadedAt = new Date()
  9. Call populateDropdowns(DB.raw)

FILTERS:
  applyFilters(): reads filter-from, filter-to, filter-branch, filter-worker, filter-company
    admin can filter by company; then date/branch/worker filter on source
    → DB.filtered = filtered; repopulate dropdowns; renderCurrentPage()

  resetFilters(): clear all filter inputs, restore DB.filtered to DB.raw or DB.allRaw

  populateDropdowns(src): populate #filter-branch and #filter-worker selects

HELPERS:
  groupByMonth(rows): group by _monthKey, return sorted [[month, rows]] array
  groupBy(rows, fn): group by fn(row), return object
  avg(rows, fn): average of fn(row), ignoring null/NaN
  esc(s): HTML-escape &, <, >, "
  fmt(n, d=0): toLocaleString('en', max/min fraction digits d)
  fmtPct(n, d=1): n.toFixed(d) + '%'
  formatMonthLabel(ym): "Apr 2026" from "2026-04"
  truncate(s, n): s.substring(0,n)+'…' if longer

═══════════════════════════════════════════════════════════════
SECTION 5 — KPI CALCULATIONS (js/kpis.js)
═══════════════════════════════════════════════════════════════

const KPI = {
  pending(rows):      rows where _isPending
  pendingRate(rows):  pending.length / rows.length * 100 (or null)
  completed(rows):    rows where NOT _isPending
  rate48h(rows):      done(not pending, has serviceHours) where serviceHours≤48 / done * 100
  rate72h(rows):      same but ≤72
  unassignedCount(rows): rows where !_hasWorker
  pendingNoReason(rows): pending AND !_hasRescheduleReason
  withRescheduleReason(rows): rows where _hasRescheduleReason

  agingDistribution(rows):
    For each AGING_CATEGORY {label, max, count=0}
    For each row: if _agingHours not null, increment first category where agingHours ≤ max
    Return cats array

  byMonth(rows):
    Group by _monthKey, for each month return:
      {month, label, total, pending (in month), pendingSnapshot (open overlapping month),
       pendingDuration (count open overlapping), completed, rate48h, rate72h,
       withReason (has reschedule reason), noReason (pending + no reason)}
    pendingSnapshot: rows where _dispatch ≤ mEnd AND (completion||now) ≥ mStart AND _isPending
    pendingDuration: same condition, count regardless of pending status

  pendingByReason(rows): group pending by _rescheduleReason||'(No reason)', sort desc
  pendingByBranch(rows): group pending by _branch, sort desc
  pendingByWorker(rows): group pending by Worker Name, sort desc
  pendingByProduct(rows): group pending by Product Type || Product Line, sort desc

  byBranch(rows):
    Group all rows by _branch. For each branch:
      {branch, total, pending, pendingRate, rate48h, rate72h, unassigned}
      score = (rate48h??50)*0.4 + (rate72h??50)*0.35 + (100-(pendingRate??50))*0.25
    Sort by score descending

  rejectedAll(rows):  rows where _isRejected || _isReturned || _isOBMStatement
  rejectedOnly(rows): rows where _isRejected
  returnedOnly(rows): rows where _isReturned
  obmOnly(rows):      rows where _isOBMStatement
  rejectedByBranch/Worker: group rejectedAll by branch/worker, sort desc

  todaySchedule(rows):
    Check _rescheduled date == today string (YYYY-MM-DD)
    Fallback: check _appointed date == today string

  analyzeDelayReasons(rows):
    For pending rows, search concatenated text of:
      Completion Result + Maintenance Instructions + Reschedule Supp + Reschedule Reason + Rescheduling
    Categories (in priority order):
      distance:  _farDistance = true (check FIRST, no keyword needed)
      parts:     keywords: part, spare, replacement, awaiting part, no parts, out of stock, قطع, قطعة
      customer:  keywords: customer not available, postponed, no answer, customer unavailable,
                           customer request, not available, reschedule, عميل, تأجيل
      technical: keywords: technician delay, no technician, technician unavailable, no worker,
                           no technician available, assignment delay, فني, لا يوجد فني
      unspecified: no match
    Each category: {key, label, color (css class), badge (hex), badgeBg (hex), tickets[], count, totalAging}
    Return only categories with count > 0, sorted desc, each with avgAging, branches[], technicians[]
}

BADGE HELPERS:
  targetBadge(v, target, higherIsBetter=true):
    null → badge-gray '—'
    green if meets target; amber if within 90% of target; red otherwise
    Display: fmtPct(v) if higher-is-better, else fmt(v,1)+'h'

  agingLabel(h): returns the label for h from AGING_CATEGORIES
  agingBadge(h): badge with color: null→gray, >72→red, >48→amber, >24→blue, else→green

  statusBadge(r):
    _isPending      → badge-amber 'Pending'
    _isRejected     → badge-red 'Rejected'
    _isReturned     → badge-red 'Returned'
    _isOBMStatement → badge-blue 'OBM Statement'
    _isCancelled    → badge-gray 'Cancelled'
    else            → badge-green 'Completed'

  ticketStatusBadge(r): badge from _phaseColor/_phaseLabel

  buildPendingPivot(rows):
    Rows of pending, columns = ['≤ 12h','≤ 24h','≤ 48h','≤ 72h','> 72h']
    Matrix: branch × aging count; sorted by total desc
    Returns {cols, rows, totalPending}

  branchesWithPending(rows):
    Map branch → {count, noReason, todayVisit}
    todayVisit = any of today's schedule tickets belong to this branch

═══════════════════════════════════════════════════════════════
SECTION 6 — CHART WRAPPERS (js/charts.js)
═══════════════════════════════════════════════════════════════

const CHART_REGISTRY = {};
const PAL = ['#003D8F','#5BA4F5','#0891b2','#16a34a','#d97706','#7c3aed','#dc2626','#5a607a'];

destroyChart(id): if exists in registry, destroy and delete
mkChart(id, cfg): destroyChart(id); new Chart(canvas.getContext('2d'), cfg); store in registry; return instance

dm(target, source): deep merge — objects merged recursively, arrays/primitives overwrite

baseOpts(overrides={}):
  responsive:true, maintainAspectRatio:false, animation:{duration:380}
  plugins.legend: position bottom, DM Sans 11px, gray-500, padding 14, boxWidth/Height 10
  plugins.tooltip: bg #111318, DM Sans 12px weight 600 (title) / 11px (body), padding 10, cornerRadius 8
  scales.x/y: grid rgba(0,0,0,.04), ticks DM Sans 10px #a0a8bd, border transparent

lineChart(id, labels, datasets, opts):
  Each dataset: tension:.35, fill:false, pointRadius:4, pointHoverRadius:6, borderWidth:2.5, pointBg = borderColor
  Uses dataset.borderColor || PAL[i]

barChart(id, labels, datasets, opts):
  Each dataset: borderRadius:4, barMaxWidth:40, backgroundColor = color || PAL[i]

hBarChart(id, labels, data, color, opts):
  Single dataset; indexAxis:'y'; legend display false
  color can be array (per-bar) or single string
  x: beginAtZero:true; y: grid display false

donutChart(id, labels, data, opts):
  type:'doughnut', cutout:'65%'
  Colors: PAL.slice(0, labels.length); borderWidth:2, borderColor:'#fff'
  legend: position:'right', DM Sans 11px

renderAgingBars(cid, agingData, total):
  Renders HTML aging bar rows into element with id=cid
  Colors by index: ['#16a34a','#003D8F','#d97706','#dc2626','#111318']

═══════════════════════════════════════════════════════════════
SECTION 7 — PAGES (js/pages.js)
═══════════════════════════════════════════════════════════════

INTERACTIVE FILTER STATE:
  let _chartFilter = null; // {type, value} or null
  setChartFilter(type, value): toggles if same, else sets; calls renderCurrentPage()
  clearChartFilter(): sets null; renderCurrentPage()
  getFilteredRows(): applies _chartFilter to DB.filtered
    type='reason' → pending where (rescheduleReason||'(No reason)') === value
    type='noReason' → pending AND !hasRescheduleReason
    type='pending' → pending
    type='dispatched' → _isDispatchedWork
    type='noWorker' → pending AND !hasWorker
    type='branch' → branch === value
    type='agingCat' → pending AND _agingCat === value
    type='category' → pending AND (_reasonCategory||'Unspecified') === value
  filterTagHtml(): returns filter-tag div if filter active, else ''

--- PAGE 1: KPI OVERVIEW (renderOverview) ---
KPI cards (8): Total(accent), Pending Rate(color-coded,clickable→setChartFilter('pending','all')),
  48h Rate, 72h Rate, Completed(blue), Pending(amber,clickable),
  Pending No Reason(red/green,clickable→'noReason'), No Worker(red/green,clickable→'noWorker')

Charts (4):
  ch-ov-48h: lineChart, 48h monthly, 0-100% y-axis, no legend, target badge shown in header
  ch-ov-72h: lineChart, 72h monthly, same
  ch-ov-resched: barChart, withReason monthly, amber, no legend
  ch-ov-reason: hBarChart, top 8 pending reasons, #dc2626, CLICKABLE (onClick → setChartFilter('reason', reason))

Formula boxes: show Pending, 48h Rate, No Reason, No Worker formulas; and Aging formulas

--- PAGE 2: MONTHLY TRENDS (renderTrends) ---
Summary KPI row (4, fixed 4-col): Best month 48h (blue), Worst month 48h (red),
  Avg 48h (gray), Avg 72h (gray)

Charts (5):
  ch-tr-rates: lineChart, 48h (blue) + 72h (blue3, dashed), 0-100%
  ch-tr-vol: barChart, Total(blue4) + Completed(blue2) + Pending(amber)
  ch-tr-pend: lineChart, pendingDuration, red fill, beginAtZero
  ch-tr-resched: barChart, withReason, amber
  ch-tr-compare: barChart grouped, 48h(blue) + 72h(blue3), 0-100%

--- PAGE 3: DAILY OPERATIONS (renderDaily) ---
KPI row (5): Today's Visits(accent), Total Pending(amber,clickable), Active Workers(blue),
  Dispatched Not Accepted(red/green,clickable→'dispatched'), No Worker(red/green,clickable→'noWorker')

Charts:
  Aging distribution: renderAgingBars('aging-daily',...)
  ch-daily-rsn: barChart, top 8 reasons, colors: '(No reason)'→red, else blue
    CLICKABLE (onClick → setChartFilter('reason', reason))

Tables:
  Today's Visits: cols Ticket#, Branch, Worker, Ticket Status, Aging, Reason, Date, Remark, Parts
    Worker shown as badge-red 'Unassigned' if blank; partsStatusCell(r) in Parts column
  All Pending Tickets: same columns, max 80 rows, note if truncated
  Pending Pivot (Branch × Aging): clickable rows → setChartFilter('branch', branch)

Admin-only Branch Alerts table (only if DB.isAdmin):
  cols: Branch, Pending, No Reason, Visit Today, Action (button → sendBranchAlert(branch))

Parts Status Cell logic (partsStatusCell):
  Check if ticket needs part: reason or supplement includes 'accessor', 'spare', 'part', 'قطعة'
  If needs part AND tracking found in PARTS_REQUESTS or PARTS_DB → show "📦 Track AWB" badge (onclick showTrackingFrame)
  If needs part AND no tracking → "🔩 Request Part" button (onclick openPartsRequestFromTicket)
  If doesn't need part → '—' span

--- PAGE 4: PENDING ANALYSIS (renderPending) ---
KPI row (4): Total Pending(accent), Pending Rate(amber), Far Distance(red/green), Pending No Reason(red/green,clickable)

If categories from Pending Reason sheet exist:
  chart-grid two-thirds: barChart (by category) + table (category, count, %)
  Table rows are clickable → setChartFilter('category', cat)

Delay Reason Analysis table: Reason badge, Count, %, Avg Aging

Analysis cards (one per delay category):
  .analysis-card.{color}: badge with count%, avg aging, top branches (badge-blue), top technicians (badge-gray)

Charts (4):
  ch-pend-rsn: hBarChart, by reason, #dc2626
  ch-pend-aging: donutChart
  aging-pend: renderAgingBars
  ch-pend-br: hBarChart, by branch, blue3
  ch-pend-wk: hBarChart, top 10 workers, teal

--- PAGE 5: BRANCH COMPARISON (renderBranches) ---
Insight card: "{N} branches · Score = 40% 48h + 35% 72h + 25% Resolution"

Charts (4):
  ch-br-48: hBarChart, 48h rate, BLUE, x max 100
  ch-br-72: hBarChart, 72h rate, BLUE3, x max 100
  ch-br-pend: hBarChart, pending rate, AMBER
  ch-br-rsch: hBarChart, count with reschedule reason, TEAL

Table: Rank(medal circle), Branch, Total, Pending, Pending Rate, 48h Rate, 72h Rate, Score
  Score badge: green≥80, blue≥60, amber<60
  Each row clickable → setChartFilter('branch', branch)

--- PAGE 6: REJECTED/RETURNED/OBM (renderRejected) ---
KPI row (4): Rejected(red), Returned(amber), OBM Statement(blue), Combined(gray, shows % of total)

Charts (4):
  ch-rj-type: donutChart, ['Rejected','Returned','OBM Statement']
  aging-rj: renderAgingBars
  ch-rj-br: hBarChart, by branch, red
  ch-rj-wk: hBarChart, top 10 workers, gray

Table: Ticket#, Branch, Worker, Type(statusBadge), Phase, Completion Result, Service Info(truncate 30), Aging
  Max 60 rows

--- PAGE 7: EXPORT CENTER (renderExport) ---
Excel section: 3 options (All/Pending/Completed, shown with row counts), Download Excel button
PowerPoint section: Download PowerPoint button

Excel export (doExcelExport):
  15 columns: Ticket Number, Service Provider Name, Worker Name, Service Information,
    Ticket Status, Dispatch Point Time, Rejection Of Documents, Completion Result,
    Service hours (H), Appointed Date, Rescheduling, Reason For Rescheduling,
    The Reasons For The Modification Are Supplemented, Maintenance Instructions, Mileage
  Build minimal XLSX from scratch using buildZipStore()
  File: AUX_{ASC}_{option}_{ISO-date}.xlsx

PowerPoint export (doPptxExport):
  5 slides (12192000 × 6858000 EMU = 16:9):
  Slide 1 — Title: dark blue bg, company branding, 4 key metrics in a row, "Created by Moahed Younes"
  Slide 2 — KPI Summary: 4 big numbers (Total, Pending Rate, 48h Rate, 72h Rate), last 6 months table
  Slide 3 — Branch Performance: top 8 branches with 48h rate bar + score
  Slide 4 — Delay Analysis: top 5 categories with count/%, avg aging, top branches
  Slide 5 — Strategic Recommendations: dark blue bg, strengths + improvement areas + 5 action items
  Build PPTX from scratch using buildZipStore() + slide XML builders
  File: AUX_{ASC}_KPI_{ISO-date}.pptx

PPTX helper functions:
  txb(x,y,cx,cy,text,color,sz,bold): text box XML element
  rect(x,y,cx,cy,fill,border): rectangle shape XML element
  escXml(s): XML-escape &, <, >, ", '
  buildSlide(content, bgColor): full slide XML
  buildPPTX(slides): assemble full PPTX file structure in ZIP

buildZipStore(files, mimeType):
  Build ZIP in STORE (uncompressed) mode
  CRC32 implementation included
  Returns Blob

--- PAGE 8: DEEP INSIGHTS (renderInsights) ---
Segment: closed tickets with serviceHours > 48

KPI row (5): Closed >48h(red), Troubleshooting(amber), Value Added(blue),
  Customer Delay(amber/green), Avg Service Hours(gray)

Delay categories (for closed >48h):
  distance/parts/customer/dispatch/unspecified (same keywords as pending analysis but applied to closed)

Root cause cards: color-coded grid, count + % + avg hours

Charts (5):
  ch-ins-hours: barChart, hour buckets [48-72h, 72-96h, 96-120h, >120h], 4 colors
  ch-ins-type: donutChart, [Troubleshooting, Value Added, Other]
  ch-ins-delay: hBarChart, delay categories, per-category colors
  ch-ins-branch: hBarChart, top branches, red
  ch-ins-worker: hBarChart, top workers, amber

Rescheduling impact: side-by-side with/without reschedule stats

Branch performance table: Branch, Total>48h, %ofClosed(inline bar), Avg Hours, Parts, Customer, Priority badge
  Priority: ≥40%→🔴Critical(red), ≥25%→🟠High(amber), ≥15%→🟡Medium(blue), else→🟢Low(green)

Maintenance Instructions sample table (last 15 tickets): Ticket#, Branch, Worker, Service Info, Type, Hours, Notes

Strategic insight cards (auto-generated, up to 6):
  48h rate status, parts supply chain, customer availability, critical branch, troubleshooting, distance
  Each: colored bg+border, icon, title, body text, action recommendation

--- PAGE 9: SPARE PARTS (renderParts) ---
(Logic in parts.js — see Section 10)
Loads from PARTS_SHEET_ID. Shows header banner with refresh button.

Live Tracking section (collapsible): order number input + AWB input + Track button (+ Save & Track for admin)
  Tracking uses SMSA iframe embed (CONFIG.TRACKING_URL)
  previewTracking(v): shows link preview as user types
  doTrackOnly(): opens tracking frame with AWB
  saveAndTrack(): posts to heartbeat URL (action='parts_request'), then shows frame

KPI row (5): Total SKUs(accent), Total Stock(blue), Low Stock(amber/green), Out of Stock(red/green), Reorder Alert(amber/green)

Split row:
  Left: Reorder alert bars (top 6, colored by months left: <1mo red, <3mo amber, ≥3mo green)
  Right: Pending status board (from PARTS_REQUESTS + in-memory PENDING_BOARD)
    Status progression: Pending → Sent (requires AWB entry) → Received
    AWB tracking button shown if awb present

Charts (4):
  ch-pm: barChart, last 6 months usage (Sort 8), blue
  ch-abc: donutChart, ABC classification
  ch-top: hBarChart, top 10 consumed, colored by ABC class
  ch-br: hBarChart, branch stock balance, blue

Tables:
  Branch Stock Summary: Branch, SKUs, Balance, Low, Zero, Usage, Health badge
  Reorder Alert: ABC, Code, Name, SVC Stock, Avg/Month, Months Left, Reorder Qty, Priority, Request button
  Full Inventory (first 120): ABC, Code, Name, Branch, WH, SVC, Consumed, Returned, Avg/Mo, Months Left, Request button

Parts Request Modal (showPartsRequestModal):
  Fields: Part Name, Part Number/Code, Quantity, Order Number (required, GD prefix), Branch, Notes
  Submit → post to heartbeat (action='parts_request') + open mailto to arslan@auxair.com (cc nawthah, nujud, moahed.younis)
  Add to PENDING_BOARD immediately

--- PAGE 10: CALL CENTER (renderCallCenter) ---
(Logic in callcenter.js — see Section 9)
Async — shows spinner while loading CC_DB if needed.

Filters row: Agent, Year, Month, Channel (All/Calls/WhatsApp), Direction (IB+OB/Inbound/Outbound)

KPI row (8): SLA Rate, Abandon Rate, Total Calls(accent), WhatsApp(blue), Avg AHT(gray), Avg THT(gray), Inbound(blue), Outbound(gray)

KPI color coding:
  SLA: green≥80%, amber≥72%, red<72%
  Abandon: green≤5%, amber≤10%, red>10%

Charts:
  ch-cc-sla: line, monthly SLA%, green, 0-100%
  ch-cc-abn: line, monthly abandon%, red, fill
  ch-cc-vol: bar grouped, Inbound(blue) + Outbound(blue-pale)
  ch-cc-wa: bar, WhatsApp monthly, green
  ch-cc-peak: bar, 24h peak hours, intensity-colored by volume (darker = more)
    Calls: rgba(0,61,143, 0.2 + v/max*0.8)
    WhatsApp: rgba(22,163,74, 0.2 + v/max*0.8)

Agent Evaluation Cards (if evalFiltered data exists):
  Grid auto-fill minmax(240px,1fr)
  Each agent card: avatar (initials), name, overall % + grade (A/B/C/D)
  Category bars for: Call Handling Process, Communication Skills, Efficiency & Quality,
    Product/System Knowledge, Soft Skills & Customer Experience
  Grade thresholds: A≥90%, B≥80%, C≥70%, D<70%
  Color: ≥85%→green, ≥70%→amber, <70%→red

Monthly Evaluation Table: Agent, Month, per-category %, Overall %, Grade

--- PAGE 11: ACTIVITY LOG (renderActivityLog, Admin only) ---
Access check: DB.isAdmin AND DB.isAdminAccess required

Reads heartbeat data from HEARTBEAT_URL (GET ?action=read)
Active TTL: 5 minutes

KPI row (4): Total Users, Active Now(green/gray), Login Events(blue), Failed Logins(red/green)

User Access List table: Email, ASC badge, Admin badge, Last Seen, Current Page, Status (Active●/Offline)
  Active rows highlighted with green background

Activity Log table: Time, Email, ASC, Action
  Failed logins: red background, ⚠️ prefix
  Clear button available

═══════════════════════════════════════════════════════════════
SECTION 8 — APP CORE (js/app.js)
═══════════════════════════════════════════════════════════════

State:
  let currentPage = 'page-overview';
  let _currentEmail = '';
  let _currentASC = '';

NAVIGATION — navigate(pageId, el):
  Remove .active from all .nav-item; add to el
  Hide all .page divs; show pageId div
  Set topbar title/crumb from I18N page keys (pgKeys map → I18N[lang][key])
  Call renderCurrentPage()
  Apply translations
  Close sidebar on mobile (width < 960px)

renderCurrentPage():
  logActivity('View page: ' + pageName)
  writeHeartbeat()
  Dispatch to: renderOverview / renderTrends / renderDaily / renderPending /
    renderBranches / renderRejected / renderExport / renderActivityLog /
    renderInsights / renderParts / renderCallCenter

toggleSidebar(): toggle .open class on #sidebar

REFRESH — async refreshData():
  Destroy all charts in CHART_REGISTRY
  await loadAllData(_currentEmail, _currentASC)
  Update date range display
  Update timestamps
  renderCurrentPage()
  Show success (green button) → restore after 2s
  On error: red button → restore after 3s

AUTO-REFRESH & HEARTBEAT:
  HEARTBEAT_URL = 'https://script.google.com/macros/s/AKfycbyRGaKvBin32c4B-L2aVjYnO2LmKYkB1yeuhkN9EgLubV7AA3XR384KBxbcA9eSuz7tbQ/exec'
  Auto-refresh interval: 5 minutes
  Heartbeat interval: 90 seconds

  writeHeartbeat(): POST to HEARTBEAT_URL (mode:'no-cors')
    body: {action:'heartbeat', email, asc, page, ts}

  readActiveUsers(): GET HEARTBEAT_URL?action=read → returns {email:{ts,asc,page}}

  startAutoRefresh(): set intervals, write initial heartbeat
  stopAutoRefresh(): clear intervals; POST logout signal

ACTIVITY LOG:
  const _activityLog = []; (max 100 entries in memory)
  logActivity(action): push {time, email, asc, action}
  Persistent log: localStorage 'aux_activity_log', last 500 entries

LOGIN — async handleLogin():
  Validate email format (must contain @)
  Fetch Access sheet
  Build DB.accessMap {email → asc} and DB.adminAccessMap {email → bool}
    Read columns: Email/email/EMAIL, ASC/Company, Admin Access/Admin (yes/true/1 → true)
  Lookup email; if not found AND accessMap has entries → log failed attempt → error
  If accessMap empty (demo mode) → userASC = 'ZAM'
  Set DB.isAdminAccess = adminAccessMap[email] === true
  await loadAllData(email, userASC)
  Call setupDashboard(email, userASC)

SETUP DASHBOARD — setupDashboard(email, userASC):
  Hide login-screen; show app
  Set user avatar (first 2 chars of local email part, uppercase)
  Set user-email-display, user-asc-display (with ★ if admin access), asc-badge-top
  Show/hide admin-badge (topbar)
  Update timestamps
  Show #filter-asc-wrap only if DB.isAdmin
  Show #nav-alerts only if DB.isAdmin AND DB.isAdminAccess
  Set date range from data (filter-from = earliest, filter-to = latest)
  startAutoRefresh()
  navigate('page-overview', ...)
  startOnboardingTourIfFirstLogin(email)

LOGOUT:
  stopAutoRefresh()
  Clear DB, CHART_REGISTRY
  Show login-screen; hide app

BRANCH ALERT EMAIL — async sendBranchAlert(branchName):
  Admin + isAdminAccess required
  Fetch Access sheet, find emails where 'If Branch has pending' column matches branch (fuzzy city match)
  Build mailto with pending ticket details (max 15 tickets shown)
  Open mailto in new tab

═══════════════════════════════════════════════════════════════
SECTION 9 — CALL CENTER (js/callcenter.js)
═══════════════════════════════════════════════════════════════

const CC_DB = { calls:[], wa:[], evals:[], loaded:false, loading:false };

async loadCCData():
  Parallel fetch: ccKpiUrl() + ccWaUrl() + ccEvalUrl()
  calls = parseCSV(callsText).map(enrichCall)
  wa    = parseCSV(waText).map(enrichWA)
  evals = parseCSV(evalText).map(enrichEval)

enrichCall(row):
  Parse date from Date column (MM/DD/YYYY or MM/DD/YY) → _monthKey "YYYY-MM"
  _hour: parseInt(SLAP2 || HOUR) or 0

  parseTime(val): tries H:MM:SS format first → h*3600+m*60+s
    Then decimal: if <1 → *86400 (fraction of day); if 1-3600 → seconds as-is; if ≥3600 → as-is
  AHT search: try C.AHT, 'Average Handle Time', 'AHT', __col_5, __col_9
  THT search: try C.THT, 'Total Handle Time', 'talk time', 'THT', __col_6, __col_10
  If still not found: search all columns for time-formatted values (H:MM:SS or decimal <1)
    Sort by converted seconds (AHT < THT)
  _aht = parseTime(ahtVal); _tht = parseTime(thtVal)
  _qty = parseFloat(QTY) || 1
  _agent = AGENT_NAME || AGENT
  _status = STATUS.toUpperCase()
  _callType = CALL_TYPE.toUpperCase()
  _event = EVENT.toUpperCase()

  Within SLA: try WITHIN_SLA, 'Within SLA', 'SLA', __col_23, __col_24, __col_7
    Also search columns with 'sla', 'within', 'compliance' in key name
    _withinSLA = (val === '1' || 'yes' || 'true' || 'y' || parseFloat === 1)

  _isAbandoned = _event.includes('ABANDON')
  _isInbound   = _callType.includes('IB')
  _isOutbound  = _callType.includes('OB')

enrichWA(row):
  Date column format YYYY-MM-DD → _monthKey
  Fallback: Month column
  _hour: Slap2 || Hours || Hour
  _agent: Agent Name || Agent

enrichEval(row):
  _agent, _mYear, _month (M-Year || Month), _category, _criteria
  _max: Max column || __col_8 || 5

  Score lookup priority:
    1. Manager Evaluation (C.MGR_EVAL, 'Manager Evaluation', etc.)
    2. Score (1-5) if manager eval missing
    3. Score (percentage)
    4. __col_7, __col_6, __col_5
    5. Search columns containing 'evaluation' or 'score' (excluding 'sort')

  Clean score: trim, remove %, parseFloat
  If score >5 and ≤100 → divide by 20 (convert 0-100 to 0-5 scale)
  _score = clamp(0, 5)
  _pct = _score / _max * 100

SLA Calculation:
  Filter: _isInbound AND _status === 'ANSWERED' → answeredIB
  slaRate = count(_withinSLA) / answeredIB.length * 100

Abandon Calculation:
  Filter: _isInbound → inboundCalls
  abandonRate = count(_isAbandoned among inbound) / inbound.length * 100

groupByMonthCC(calls):
  Per month: total, sla (all), abandon (all), inbound, outbound, totalAHT, ahtN, totalTHT, thtN
  answeredIB (for SLA), slaAnsweredIB (within SLA and answered IB), abandonedIB (abandoned and IB)
  Derived: slaRate = slaAnsweredIB/answeredIB*100, abandonRate = abandonedIB/inbound*100

peakHours(calls, wa): 24-element arrays, one count per hour

agentEvalSummary(evals):
  Per agent: totalScore, totalMax, cats{} (by category), months{} (by month)
  overallPct = totalScore/totalMax*100
  catPcts: per category percentage
  monthPcts: per month percentage
  Sorted by overallPct desc

monthlyEvalTable(evals):
  Per (agent, month) combination: category percentages + overall
  Sorted by month then agent

═══════════════════════════════════════════════════════════════
SECTION 10 — SPARE PARTS (js/parts.js)
═══════════════════════════════════════════════════════════════

const PARTS_DB = { transactions:[], loaded:false, loading:false };
let PARTS_REQUESTS = [];
const PENDING_BOARD = [];

async loadPartsData():
  Parallel: partsSheetUrl(PARTS_TRANSACTION) + sheetUrl(PARTS_SHEET) (optional)
  transactions = parseCSV(tx).map(enrichTransaction)
  PARTS_REQUESTS = parseCSV(req) (raw, not enriched)

enrichTransaction(row):
  _sort: parseInt(Sort column) || 0
  _qty: Math.abs(parseFloat(Quantity)) || 0
  _date: parseDate(Creation Time)
  _branch: Branch || Second Branch, default 'Unknown'
  _asc: ASC || Second ASC
  _partName: Part Name → Second Part Name → Accessory Name (first non-blank)
  _partCode: Accessory Code → Code → Second Code (first non-blank)
  _key: _partCode || _partName
  _awb: Referance column
  _monthKey: YYYY-MM from _date

calcStockMap(transactions):
  Per unique _key: {code, name, branch, asc, wh:0, svc:0, consumed:0, returnedWH:0, awb:'', monthlyConsumption:{}}
  Sort 5:  wh  += qty
  Sort 6:  wh  -= qty; svc += qty
  Sort 8:  svc -= qty; consumed += qty; monthlyConsumption[mk] += qty; update lastUsed
  Sort 10: wh  += qty; returnedWH += qty
  Sort 12: wh  += qty; returnedWH += qty
  Clamp wh and svc to ≥ 0

classifyABC(partsArray):
  Sort by consumed desc; cumulative % → A ≤70%, B ≤90%, C ≤100%

calcForecast(p):
  avgMonthly = sum(monthlyConsumption.values) / months.length
  monthsLeft = svc / avgMonthly (toFixed 1)
  reorderQty = ceil(avgMonthly * 3)
  Return null if no consumption data

getFilteredTx():
  Filter transactions by current user's ASC (or company dropdown if admin)
  Then by branch if filter-branch selected

Reorder alert: parts where calcForecast(p).monthsLeft < 3 AND svc > 0

═══════════════════════════════════════════════════════════════
SECTION 11 — INTERNATIONALISATION (js/i18n.js)
═══════════════════════════════════════════════════════════════

let _lang = 'en'; (stored in localStorage 'aux_lang')
const I18N = { en:{...}, ar:{...}, zh:{...} };

Key translation groups:
  Auth: login_brand, login_sub, login_title, login_desc, login_email_label, login_email_ph,
    login_btn, login_loading, login_footer, login_error_email, login_error_notfound
  Nav: nav_analytics, nav_overview, nav_trends, nav_daily, nav_pending, nav_branches,
    nav_insights, nav_rejected, nav_export, nav_activity, nav_filters
  Filters: filter_from, filter_to, filter_branch, filter_worker, filter_reset, filter_asc,
    all_branches, all_workers, all_ascs
  Page titles (pairs: [title, crumb]):
    pg_overview: ['KPI Overview', 'Performance Intelligence']
    pg_trends:   ['Monthly Trends', 'Repair Rate Analysis']
    pg_daily:    ['Daily Operations', 'Live Ticket Tracking']
    pg_pending:  ['Pending Analysis', 'Delay Investigation']
    pg_branches: ['Branch Comparison', 'Performance Ranking']
    pg_rejected: ['Rejected / Returned', 'Exception Analysis']
    pg_export:   ['Export Center', 'Download Data']
    pg_activity: ['Activity Log', 'System Access Monitoring']
    pg_insights: ['Deep Insights', 'Closed Ticket Analysis']
    pg_parts:    ['Spare Parts', 'Inventory & Tracking']
    pg_cc:       ['Call Center', 'Communication KPIs']
  Status labels: badge_pending, badge_completed, badge_rejected, badge_returned,
    badge_obm, badge_cancelled, badge_unassigned
  Actions: sign_out, refresh, refreshed, save_track

setLang(lang):
  _lang = lang; localStorage set; update all .lang-btn active states
  document.body direction (rtl for Arabic, ltr for others)
  applyTranslations()

applyTranslations():
  All elements with data-i18n: set textContent
  All elements with data-i18n + data-i18n-attr: set that attribute

t(key): returns I18N[_lang][key] || I18N['en'][key] || key

═══════════════════════════════════════════════════════════════
SECTION 12 — ONBOARDING TOUR (js/tour.js)
═══════════════════════════════════════════════════════════════

startOnboardingTourIfFirstLogin(email):
  Check localStorage 'aux_tour_done_{email}'
  If not done: show step-by-step overlay tour
  Mark done after completion

Tour steps (5): Welcome → Filters → Navigation → Refresh → Export
  Each step: highlighted element, tooltip with title + description, Next/Skip/Done buttons
  Highlight: box-shadow 0 0 0 4px rgba(0,61,143,.4)
  Tooltip: white card, border-radius 12px, 280px wide, sh-lg, #003D8F top border 3px

═══════════════════════════════════════════════════════════════
SECTION 13 — HTML STRUCTURE (index.html)
═══════════════════════════════════════════════════════════════

<!DOCTYPE html> lang="en" dir="ltr"
<head>: charset UTF-8, viewport no-scale, mobile-web-app metas, theme-color #001A47
  Title: "AUX ASC Dashboard"
  Google Fonts preconnect + DM Sans + DM Mono
  <link rel="stylesheet" href="css/main.css">

<body>:
  <!-- LOGIN SCREEN -->
  <div id="login-screen" class="login-overlay">
    login-bg-grid (decorative), login-card:
      login-logo-wrap: aux-logo-card (AUX + AIR CONDITIONER) + login-brand-info
      lang-switcher.login-lang: EN / ع / 中 buttons
      login-divider
      h1.login-title "Secure Access"
      p.login-desc
      form-group: email input (#login-email) with Enter key → handleLogin()
      #login-btn (onclick=handleLogin)
      #login-error (hidden)
      #login-loading (hidden): spinner + translatable text
    login-footer-txt "Confidential · For authorized personnel only"

  <!-- APP -->
  <div id="app" style="display:none">
    <aside class="sidebar" id="sidebar">
      sidebar-header: aux-logo-sidebar (AUX + AIR CONDITIONER) + sidebar-product (ASC Dashboard / Performance Intelligence)
      sidebar-user: user-avatar + user-info (email, asc)
      nav.sidebar-nav:
        "Analytics" section-label
        nav items (each: SVG icon + span with data-i18n):
          page-overview: 4 rectangles icon, "KPI Overview"
          page-trends: line chart icon, "Monthly Trends"
          page-daily: calendar icon, "Daily Operations"
          page-pending: clock icon, "Pending Analysis"
          page-branches: branch/tree icon, "Branch Comparison"
          page-insights: bar chart icon, "Deep Insights"
          page-parts: circle/gear icon, "Spare Parts"
          page-callcenter: phone icon, "Call Center"
          page-rejected: X-circle icon, "Rejected / Returned"
          page-export: download icon, "Export Center" (class nav-export = separated with top border)
          page-activity: info-circle icon, "Activity Log" (id=nav-alerts, hidden by default)
      sidebar-filters:
        "Filters" section-label
        #filter-asc-wrap (hidden by default): ASC select (All/ZAM/wiFEX/Classic/DOZN/ABL)
        Date From (#filter-from), Date To (#filter-to)
        Branch select (#filter-branch), Worker select (#filter-worker)
        Reset button
      sidebar-bottom:
        logout-btn (SVG + "Sign Out")
        .last-updated #last-updated

    <main class="main-content">
      <header class="topbar">
        topbar-left: menu-toggle (hamburger SVG) + aux-logo-topbar + page-title-area (h1#topbar-title + span#topbar-crumb)
        topbar-right:
          .data-freshness: freshness-dot + #data-date-display
          #admin-badge (hidden) "★ Admin"
          lang-switcher: EN / ع / 中
          #refresh-btn: refresh SVG + "Refresh" span + #refresh-time span
          .asc-badge #asc-badge-top

      <div class="content-area">
        Page divs (display:none, .active shows current):
          #page-overview, #page-trends, #page-daily, #page-pending,
          #page-branches, #page-rejected, #page-export, #page-activity,
          #page-insights, #page-parts, #page-callcenter

      <footer class="app-footer">
        left: "AUX" logo + "Authorized Service Centre Performance Dashboard"
        right: "Created by" + "Moahed Younes"

  <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js">
  <script src="js/i18n.js"> ... (all other JS files in order)
  Inline: DOMContentLoaded → setLang(stored or 'en'); bind Enter key on login email

═══════════════════════════════════════════════════════════════
SECTION 14 — GOOGLE APPS SCRIPT (AUX_Heartbeat_Script.gs)
═══════════════════════════════════════════════════════════════

Deploy as Google Apps Script Web App (Execute as: Me, Access: Anyone).

doGet(e): action=read → return JSON.stringify({email:{ts,asc,page}}) from cache
doPost(e): parse JSON body
  action='heartbeat': store {ts,asc,page} in cache (6h TTL) by email; append row to ActiveUsers sheet
  action='logout':    delete from cache
  action='parts_request': append row to Parts sheet in main Google Sheet
    columns: Order Number, Part Number, Part Description, AWB, Request Date, Final Status,
             Branch, Qty, Notes, Requested By, ASC, Timestamp

Active users cache key: 'heartbeat_' + email
Cleanup: remove entries older than 5 minutes on each read

Return: ContentService.createTextOutput(json).setMimeType(APPLICATION_JSON)
CORS: set headers allowing any origin

═══════════════════════════════════════════════════════════════
SECTION 15 — GOOGLE SHEETS REQUIREMENTS
═══════════════════════════════════════════════════════════════

ALL sheets must be shared as "Anyone with the link can view" (public).

Main Sheet (SHEET_ID):
  Tab "Sheet1": service ticket data. Required columns (exact names):
    Ticket Number, Product Line, Service Provider Name, User Name, Location, Worker Name,
    Service Type, Service Information, Product Type, Processing Phase, Ticket Status,
    Affiliated Service Center, Order Creation Time, Dispatch Point Time,
    Rejection Of Documents, Completion Result, Completion time, Service hours(H),
    Appointed Date, Rescheduling, Reason For Rescheduling,
    The Reasons For The Modification Are Supplemented, Maintenance Instructions, Mileage

  Tab "Access": Email, ASC, Admin Access (yes/no), [optional: "If Branch has pending" for alerts]
  Tab "Penidng Reason": Reason For Rescheduling, Category  ← INTENTIONAL TYPO in sheet name
  Tab "Parts": Order Number, Part Description, Part Number, AWB, Qty, Branch, Final Status, Request Date

CC KPI Sheet (CC_KPI_SHEET_ID):
  Tab "Calls": Date, Queue, Agent, Number, Event, Wait Time, Talk Time, DID, uniqueid,
    AHT, THT, Agent Name, Status, Call Type, Date Format, Month, Week, Day Name,
    Time, Hour, Minute, SLAP, SLAP 2, Qty, Within SLA
  Tab "WhatsApp Uniqe": Date (YYYY-MM-DD), Hour, Agent Name, Slap2, Month

Evaluation Sheet (CC_EVAL_SHEET_ID): [MUST be fetched via direct export, NOT gviz]
  Agent, M-Year, Month, Criteria Category, Criteria, Description,
  Score (1-5), Manager Evaluation, Max, Score, Sort, Remark, Phone

Parts Sheet (PARTS_SHEET_ID):
  Tab "Transaction": Location, Type, Sort, Referance, ASC, Branch, Code, Part Name,
    Second Part Name, Accessory Code, Chinese Name, Accessory Name, Quantity (Pieces),
    Amount, Affiliated Service Center, Document Type, Service Provider Name, Warehouse Name,
    Transaction Type, Trading Direction, Associated Order Number, Creation Time,
    Second Code, Second Branch, Second ASC

═══════════════════════════════════════════════════════════════
SECTION 16 — CRITICAL IMPLEMENTATION NOTES
═══════════════════════════════════════════════════════════════

1. PENDING DETECTION: _isPending requires BOTH Affiliated SC ≠ blank AND Completion Result = blank.
   These are separate conditions — a ticket with no affiliated SC is NOT pending.

2. CANCELLATION HANDLING: Tickets where Completion Result contains 'cancel' are removed from all
   analysis EXCEPT when Service Information contains 'OBM' (those become OBM Statements and are kept).

3. COMPANY FILTERING: Only rows matching the 5 known companies (ZAM/wiFEX/Classic/DOZN/ABL)
   by provider name pattern are kept. Unknown providers are discarded.

4. CSV COLUMN NAMING: The gviz export can produce empty or duplicate column headers.
   Handle this: empty → __col_N, duplicate → append __2, __3, etc.

5. EVALUATION SHEET: MUST use direct export URL (not gviz). The gviz endpoint silently
   drops the Score (1-5) column. This is a known Google Sheets gviz behavior.

6. CALL CENTER SLA:
   Denominator = Answered IB calls (Status=ANSWERED AND Call Type=IB)
   Numerator   = Within SLA=1 among those answered IB calls
   NOT all calls. NOT all inbound calls.

7. CALL CENTER ABANDON:
   Denominator = ALL IB calls (Call Type=IB, any status)
   Numerator   = IB calls where Event contains 'ABANDON'
   NOT all calls. NOT all abandon events.

8. PARTS STOCK BALANCE:
   Warehouse balance = +Sort5 -Sort6 +Sort10 +Sort12 (clamped ≥ 0)
   SVC balance       = +Sort6 -Sort8 (clamped ≥ 0)
   Only Sort 8 counts as "consumption" for ABC analysis and forecast.

9. BRANCH FORMAT: Always "{City} - {Company}" — never just city or company alone.

10. HEARTBEAT MODE: Uses fetch with mode:'no-cors'. This means no response body is readable.
    POST to heartbeat silently succeeds/fails. Never try to read the response.

11. DATE FORMAT TOLERANCE: The data contains multiple date formats. The parser must handle
    all of: ISO datetime, "28 Apr, 13:17", "28 Apr 2026", DD/MM/YYYY, MM/DD/YYYY.
    Saudi locale convention: assume DD/MM/YYYY when ambiguous.

12. CHART MEMORY MANAGEMENT: Always call destroyChart(id) before creating a new chart
    with the same canvas id. Use CHART_REGISTRY for this. Never instantiate Chart.js
    directly — always use mkChart().

13. PENDING REASON SHEET NAME: The sheet tab is named "Penidng Reason" — this is an
    intentional typo that exists in the actual Google Sheet. Use exactly this string.

14. ADMIN ACCESS: There are two levels:
    DB.isAdmin = (userASC === 'All') → can see all companies' data
    DB.isAdminAccess = (Admin Access column = yes) → can send alerts, see activity log
    Both can coexist independently.

15. TOUR: Check localStorage 'aux_tour_done_{email}' before showing onboarding.
    This ensures first-time users see it and returning users don't.

═══════════════════════════════════════════════════════════════
SECTION 17 — VERIFICATION CHECKLIST
═══════════════════════════════════════════════════════════════

After building, verify each of these:

□ Login with valid email from Access sheet → loads data, shows dashboard
□ Login with unknown email → shows error "Email not registered in Access sheet"
□ Pending count = rows where Affiliated SC ≠ blank AND Completion Result = blank
□ 48h Rate = completed tickets with serviceHours ≤ 48 / total completed with serviceHours
□ Cancelled+OBM rows kept; cancelled non-OBM rows removed from all pages
□ Branch Comparison score = rate48h*0.4 + rate72h*0.35 + (100-pendingRate)*0.25
□ Call Center SLA = Within SLA=1 rows / Answered IB rows × 100
□ Call Center Abandon = Abandoned IB rows / Total IB rows × 100
□ Spare parts reorder alert shows only when monthsLeft < 3 AND svc > 0
□ Arabic (ع) toggles RTL layout — sidebar moves to right, text right-aligned
□ Auto-refresh triggers after 5 minutes (check browser network tab)
□ Heartbeat POST fires on every page navigation
□ Excel export downloads .xlsx file opening in Excel with 15 columns
□ PowerPoint export downloads .pptx with 5 slides, AUX branding
□ Interactive chart click (reason bar → pending analysis) filters all KPIs
□ Sidebar collapse at ≤960px viewport width
□ Parts request modal sends mailto to arslan@auxair.com
□ Activity log visible only to full-admin (All + Admin Access=yes)
