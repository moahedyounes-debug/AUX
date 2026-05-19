// ═══════════════════════════════════════════════════════════════
//  LANGUAGE & LOCALIZATION SYSTEM
// ═══════════════════════════════════════════════════════════════

let TRANSLATIONS = {};
let CURRENT_LANGUAGE = localStorage.getItem('dashboard-language') || 'en';

// ─────────────────────────────────────────────────────────────
// Load translations from JSON file
async function loadTranslations() {
  try {
    const response = await fetch('/js/translations.json');
    TRANSLATIONS = await response.json();
    applyLanguage(CURRENT_LANGUAGE);
  } catch (error) {
    console.error('Failed to load translations:', error);
  }
}

// ─────────────────────────────────────────────────────────────
// Get translated text
function t(key, defaultText = '') {
  const keys = key.split('.');
  let text = TRANSLATIONS[CURRENT_LANGUAGE];

  for (const k of keys) {
    text = text?.[k];
    if (!text) return defaultText || key;
  }

  return text || defaultText || key;
}

// ─────────────────────────────────────────────────────────────
// Apply language to entire page
function applyLanguage(language) {
  CURRENT_LANGUAGE = language;
  localStorage.setItem('dashboard-language', language);

  // Set HTML lang attribute
  document.documentElement.lang = language;

  // Apply RTL for Arabic
  if (language === 'ar') {
    document.documentElement.dir = 'rtl';
    document.body.style.direction = 'rtl';
    document.body.style.textAlign = 'right';
  } else {
    document.documentElement.dir = 'ltr';
    document.body.style.direction = 'ltr';
    document.body.style.textAlign = 'left';
  }

  // Update all data-i18n elements
  updatePageTranslations();

  // Re-render if data is loaded
  if (window.PARTS_DB && PARTS_DB.transactions) {
    renderCurrentPage();
  }
}

// ─────────────────────────────────────────────────────────────
// Update all elements with data-i18n attribute
function updatePageTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    const translated = t(key);

    if (element.tagName === 'INPUT' && element.type === 'placeholder') {
      element.placeholder = translated;
    } else if (element.tagName === 'BUTTON' || element.tagName === 'A') {
      element.textContent = translated;
    } else {
      element.textContent = translated;
    }
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

  return (formatters[CURRENT_LANGUAGE] || formatters.en).format(num);
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

  return new Intl.DateTimeFormat(locales[CURRENT_LANGUAGE] || 'en-GB', options[format] || options.short)
    .format(new Date(date));
}

// ─────────────────────────────────────────────────────────────
// Get translated month name
function getMonthName(monthIndex) {
  const monthKeys = [
    'months.january', 'months.february', 'months.march', 'months.april',
    'months.may', 'months.june', 'months.july', 'months.august',
    'months.september', 'months.october', 'months.november', 'months.december'
  ];

  return t(monthKeys[monthIndex] || monthKeys[0]);
}

// ─────────────────────────────────────────────────────────────
// Create language switcher UI
function createLanguageSwitcher() {
  return `
    <div style="position:fixed; top:20px; right:20px; z-index:1000; display:flex; gap:8px; background:white; padding:8px; border-radius:6px; box-shadow:0 2px 8px rgba(0,0,0,0.1)">
      ${['en', 'ar', 'zh'].map(lang => {
        const langNames = { en: '🇬🇧 English', ar: '🇸🇦 العربية', zh: '🇨🇳 中文' };
        const isActive = CURRENT_LANGUAGE === lang ? 'background:#003D8F;color:white;font-weight:600' : 'background:#f0f0f0;color:#333';
        return `
          <button
            onclick="applyLanguage('${lang}')"
            style="
              padding:8px 14px;
              border:none;
              border-radius:4px;
              cursor:pointer;
              font-size:12px;
              transition:all 0.2s;
              ${isActive}
            "
            title="${langNames[lang]}"
          >
            ${langNames[lang]}
          </button>
        `;
      }).join('')}
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────
// Update navbar with translations
function updateNavbar() {
  const navItems = document.querySelectorAll('[data-page]');
  navItems.forEach(item => {
    const page = item.getAttribute('data-page');
    const key = `nav.${page}`;
    const translated = t(key);
    const span = item.querySelector('span');
    if (span) span.textContent = translated;
  });
}

// ─────────────────────────────────────────────────────────────
// Export numbers with translated headers
function getExcelHeaders(tableType = 'general') {
  const headers = {
    'return-status': [
      t('table_headers.location_asc'),
      t('table_headers.part_code'),
      t('table_headers.part_name'),
      t('table_headers.status'),
      t('table_headers.request_date'),
      t('table_headers.used_date'),
      t('table_headers.return_requested'),
      t('table_headers.return_received'),
      t('table_headers.return_ref')
    ],
    'branch-stock': [
      t('table_headers.branch'),
      t('table_headers.skus'),
      t('table_headers.svc_stock'),
      t('table_headers.low_stock'),
      t('table_headers.out_of_stock'),
      t('table_headers.consumed'),
      t('table_headers.health')
    ]
  };

  return headers[tableType] || headers['general'];
}

// ─────────────────────────────────────────────────────────────
// Initialize language system on page load
document.addEventListener('DOMContentLoaded', async () => {
  await loadTranslations();

  // Add language switcher to page
  if (!document.querySelector('[data-language-switcher]')) {
    const switcher = document.createElement('div');
    switcher.setAttribute('data-language-switcher', '');
    switcher.innerHTML = createLanguageSwitcher();
    document.body.appendChild(switcher);
  }
});

// ─────────────────────────────────────────────────────────────
// Escape HTML for safety
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ─────────────────────────────────────────────────────────────
// Helper: Create table with translated headers
function createLocalizedTable(tableId, headers, rows) {
  const translatedHeaders = headers.map(h => t(h));

  return `
    <table class="data-table" data-export-id="${tableId}">
      <thead>
        <tr>
          ${translatedHeaders.map(h => `<th>${escapeHtml(h)}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${rows.map(row => `
          <tr>
            ${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
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

console.log('✅ Language system loaded. Current language:', CURRENT_LANGUAGE);
