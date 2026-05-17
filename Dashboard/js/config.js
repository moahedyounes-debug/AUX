// ═══════════════════════════════
//  AUX ASC DASHBOARD · CONFIG
// ═══════════════════════════════
const CONFIG = {
  SHEET_ID:     '1x796CMZf8b3RUNkqsanO56F_Wmo75L2uLzIlgE65doY',
  DATA_SHEET:   'Sheet1',
  ACCESS_SHEET: 'Access',
  PARTS_SHEET:  'Parts',            // ← New: part requests in main sheet
  ALL_ACCESS:   'All',

  // Parts Management Sheet
  PARTS_SHEET_ID: '1jQvpH0ZA5V_JB0Y2uLBM-3_Bt9VurTbncAE4WDv4wUg',
  PARTS_TRANSACTION: 'Transaction',
  PARTS_DETAILS:     'Details Of Parts',
  PARTS_MODELS:      'Parts Model',
  PARTS_REQUESTED:   'Requested Spare Part',

  // Call Center Sheets
  CC_KPI_SHEET_ID:  '1U-GUCKqShHLkqg4FvCur-T0Tic0cMAP1ou9hvoSw_FI',
  CC_KPI_SHEET:     'Calls',           // tab name
  CC_WA_SHEET:      'WhatsApp Uniqe',  // WhatsApp tab — anything here = WhatsApp
  CC_EVAL_SHEET_ID: '1KDMVAKplmbNvfdd66Ha-TmJ3fm_6mD29F2AsT9UsqvE',

  // SMSA Tracking base URL — change here if needed
  TRACKING_URL: 'https://www.smsaexpress.com/en/gb/track-shipment?track=',

  // Parts columns
  PARTS_COLS: {
    LOCATION:    'Location',
    TYPE:        'Type',
    SORT:        'Sort',
    REF:         'Referance',
    ASC:         'ASC',
    BRANCH:      'Branch',
    CODE:        'Code',
    PART_NAME:   'Part Name',
    PART_NAME2:  'Second Part Name',
    ACC_CODE:    'Accessory Code',
    CN_NAME:     'Chinese Name',
    ACC_NAME:    'Accessory Name',
    QTY:         'Quantity (Pieces)',
    AMOUNT:      'Amount',
    AFFILIATED:  'Affiliated Service Center',
    DOC_TYPE:    'Document Type',
    PROVIDER:    'Service Provider Name',
    WAREHOUSE:   'Warehouse Name',
    TRANS_TYPE:  'Transaction Type',
    DIRECTION:   'Trading Direction',
    ORDER_NO:    'Associated Order Number',
    CREATED:     'Creation Time',
    CODE2:       'Second Code',
    BRANCH2:     'Second Branch',
    ASC2:        'Second ASC',
    CUSTOMER_MODEL: 'Customer Model',   // e.g. "ATW18A2DI-CSA"
  },

  // Call Center KPI columns
  CC_COLS: {
    DATE:       'Date',
    QUEUE:      'Queue',
    AGENT:      'Agent',
    NUMBER:     'Number',
    EVENT:      'Event',
    WAIT_TIME:  'Wait Time',
    TALK_TIME:  'Talk Time',
    DID:        'DID',
    UNIQUEID:   'uniqueid',
    AHT:        'AHT',
    THT:        'THT',
    AGENT_NAME: 'Agent Name',
    STATUS:     'Status',
    CALL_TYPE:  'Call Type',
    DATE_FMT:   'Date Format',
    MONTH:      'Month',
    WEEK:       'Week',
    DAY_NAME:   'Day Name',
    TIME:       'Time',
    HOUR:       'Hour',
    MINUTE:     'Minute',
    SLAP:       'SLAP',
    SLAP2:      'SLAP 2',
    QTY:        'Qty',
    WITHIN_SLA: 'Within SLA',
  },

  // Agent Evaluation columns
  EVAL_COLS: {
    AGENT:       'Agent',
    M_YEAR:      'M-Year',
    MONTH:       'Month',
    CATEGORY:    'Criteria Category',
    CRITERIA:    'Criteria',
    DESC:        'Description',
    SCORE_15:    'Score (1-5)',
    MGR_EVAL:    'Manager Evaluation',
    MAX:         'Max',
    SCORE:       'Score',
    SORT:        'Sort',
    REMARK:      'Remark',
    PHONE:       'Phone',
  },

  COLS: {
    TICKET_NUM:    'Ticket Number',
    PRODUCT_LINE:  'Product Line',
    PROVIDER_NAME: 'Service Provider Name',
    USER_NAME:     'User Name',
    LOCATION:      'Location',
    WORKER:        'Worker Name',
    SERVICE_TYPE:  'Service Type',
    SERVICE_INFO:  'Service Information',
    PRODUCT_TYPE:  'Product Type',
    PHASE:         'Processing Phase',
    STATUS:        'Ticket Status',
    AFFILIATED:    'Affiliated Service Center',
    CREATED:       'Order Creation Time',
    DISPATCH:      'Dispatch Point Time',
    REJECT_DOCS:   'Rejection Of Documents',
    COMPLETION_RESULT: 'Completion Result',
    COMPLETION_TIME:   'Completion time',
    SERVICE_HOURS: 'Service hours(H)',
    APPOINTED:     'Appointed Date',
    RESCHEDULING:  'Rescheduling',
    RESCHED_REASON:'Reason For Rescheduling',
    RESCHED_SUPP:  'The Reasons For The Modification Are Supplemented',
    MAINTENANCE:   'Maintenance Instructions',
    MILEAGE:       'Mileage',
  },

  COMPANIES: ['ZAM','wiFEX','Classic','DOZN','ABL'],

  TARGETS: {
    RATE_48H: 85,
    RATE_72H: 95,
    PENDING_RATE: 15,
    SLA: 80,
    CSAT: 80,
    ABANDON: 5,
    AHT_MAX: 300,
  },

  AGING_CATEGORIES: [
    { label:'≤ 12 Hours', max:12  },
    { label:'≤ 24 Hours', max:24  },
    { label:'≤ 48 Hours', max:48  },
    { label:'≤ 72 Hours', max:72  },
    { label:'> 72 Hours', max:Infinity },
  ],

  COLORS: {
    BLUE:   '#003D8F',
    BLUE2:  '#0056C7',
    BLUE3:  '#5BA4F5',
    BLUE4:  '#93c4fb',
    GRAY:   '#5a607a',
    GREEN:  '#16a34a',
    AMBER:  '#d97706',
    RED:    '#dc2626',
    TEAL:   '#0891b2',
    PURPLE: '#7c3aed',
  },
};

function sheetUrl(name) {
  return `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(name)}`;
}
function partsSheetUrl(name) {
  return `https://docs.google.com/spreadsheets/d/${CONFIG.PARTS_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(name)}`;
}
function ccKpiUrl() {
  // Use gviz export for Calls sheet - works correctly
  return `https://docs.google.com/spreadsheets/d/${CONFIG.CC_KPI_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(CONFIG.CC_KPI_SHEET)}`;
}
function ccWaUrl() {
  // Use gviz export for WhatsApp sheet - works correctly
  return `https://docs.google.com/spreadsheets/d/${CONFIG.CC_KPI_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(CONFIG.CC_WA_SHEET)}`;
}
function ccEvalUrl() {
  // Use direct CSV export for Evaluation sheet - gviz was returning empty Score (1-5) columns
  // Direct export ensures all column data including evaluation scores are included correctly
  return `https://docs.google.com/spreadsheets/d/${CONFIG.CC_EVAL_SHEET_ID}/export?format=csv`;
}
function trackingUrl(awb) {
  // ← CONFIG.TRACKING_URL — edit in config.js if carrier changes
  return CONFIG.TRACKING_URL + encodeURIComponent(awb);
}
