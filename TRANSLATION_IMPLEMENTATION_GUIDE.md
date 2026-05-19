# Translation System Implementation Guide

## Overview

The dashboard now supports **3 languages with full localization:**
- 🇬🇧 **English** (en)
- 🇸🇦 **Arabic** (ar) - with RTL support
- 🇨🇳 **Chinese** (zh)

---

## System Architecture

### Files

1. **`js/translations.json`** - All translation strings (3 languages)
2. **`js/language.js`** - Language management system
3. **`index.html`** - Include language.js in header
4. **All page files** - Use `t()` function for translations

### How It Works

```
User selects language → applyLanguage() → RTL applied → Page re-rendered with translated text
```

---

## Setup Instructions

### Step 1: Add Script to index.html

Add this to the `<head>` section of **index.html**:

```html
<head>
  <!-- ... existing scripts ... -->
  <script src="/js/language.js"></script>
</head>
```

**Place it BEFORE** any other JS files that use translations.

---

## Usage in Code

### 1. Translate Text Strings

**Before:**
```javascript
const label = "TOTAL TICKETS";
const description = "All Services";
```

**After:**
```javascript
const label = t('kpi.total_tickets');
const description = t('kpi.total_tickets_desc');
```

### 2. Translate Chart Titles

**Before:**
```javascript
options.title = "48h Rate — Monthly";
```

**After:**
```javascript
options.title = t('charts.48h_rate_monthly');
```

### 3. Translate Table Headers

**Before:**
```html
<th>Ticket Number</th>
<th>Product Line</th>
<th>Status</th>
```

**After:**
```html
<th>${t('table_headers.ticket_number')}</th>
<th>${t('table_headers.product_line')}</th>
<th>${t('table_headers.status')}</th>
```

### 4. Format Numbers by Language

```javascript
// English: 1,234.56
// Arabic: 1,234.56 (RTL)
// Chinese: 1234.56

const formatted = formatNumber(1234.56, 2);
```

### 5. Format Dates by Language

```javascript
// English: 15 May 2026
// Arabic: 15 مايو 2026
// Chinese: 2026年5月15日

const date = formatLocalizedDate(new Date(2026, 4, 15));
```

### 6. Get Month Names

```javascript
// English: "May"
// Arabic: "مايو"
// Chinese: "5月"

const month = getMonthName(4); // May (0-indexed)
```

---

## Translation Keys Structure

All keys follow this pattern: `category.key`

```
kpi.total_tickets           → KPI section, total tickets label
charts.48h_rate_monthly     → Charts section, 48h rate chart title
table_headers.ticket_number → Table headers, ticket number
status.pending_return       → Status section, pending return
buttons.refresh             → Buttons section, refresh button
filters.all_branches        → Filters section, all branches option
months.january              → Month names
```

---

## Common Translation Tasks

### Task 1: Add New KPI Card

1. Add English text to `translations.json`:
```json
"kpi": {
  "new_metric": "NEW METRIC",
  "new_metric_desc": "Description here"
}
```

2. Add Arabic translation:
```json
"new_metric": "مقياس جديد",
"new_metric_desc": "الوصف هنا"
```

3. Add Chinese translation:
```json
"new_metric": "新指标",
"new_metric_desc": "这里是描述"
```

4. Use in code:
```javascript
const kpiCard = {
  label: t('kpi.new_metric'),
  description: t('kpi.new_metric_desc'),
  value: 123
};
```

### Task 2: Add Chart Title

1. Add to translations.json:
```json
"charts": {
  "my_chart": "My Chart Title"
}
```

2. Use in code:
```javascript
options.title = t('charts.my_chart');
```

### Task 3: Add Button Label

1. Add to translations.json:
```json
"buttons": {
  "save": "Save",
  "save_desc": "Save changes"
}
```

2. Use in HTML:
```html
<button onclick="save()">${t('buttons.save')}</button>
```

---

## RTL Styling for Arabic

The system automatically applies RTL when Arabic is selected:

```javascript
// Automatically applied:
document.documentElement.dir = 'rtl';
document.body.style.direction = 'rtl';
document.body.style.textAlign = 'right';
```

### CSS for RTL

If you need custom RTL styling:

```css
/* Normal LTR styles */
.sidebar {
  left: 0;
  border-right: 1px solid #ddd;
}

/* RTL styles for Arabic */
[dir="rtl"] .sidebar {
  right: 0;
  left: auto;
  border-left: 1px solid #ddd;
  border-right: none;
}
```

---

## Excel Export with Translations

```javascript
function exportTableToExcel(tableId, sheetName) {
  // Get translated headers
  const headers = getExcelHeaders('return-status');
  
  // Build workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
  
  XLSX.utils.book_append_sheet(wb, ws, t('charts.part_return_tracking'));
  XLSX.writeFile(wb, `${sheetName}-${new Date().toISOString().split('T')[0]}.xlsx`);
}
```

---

## Language Switcher UI

The system automatically creates a language switcher in the top-right:

```
┌─────────────────────────────┐
│ 🇬🇧 English | 🇸🇦 العربية | 🇨🇳 中文 │
└─────────────────────────────┘
```

Click any flag to switch language. Selection is saved in localStorage.

---

## Example: Complete KPI Card Update

### Before (English only):
```javascript
const kpiHtml = `
  <div class="kpi-card blue">
    <div class="kpi-label">TOTAL TICKETS</div>
    <div class="kpi-value">${totalCount}</div>
    <div class="kpi-delta">All Services</div>
  </div>
`;
```

### After (Multi-language):
```javascript
const kpiHtml = `
  <div class="kpi-card blue">
    <div class="kpi-label">${t('kpi.total_tickets')}</div>
    <div class="kpi-value">${formatNumber(totalCount)}</div>
    <div class="kpi-delta">${t('kpi.total_tickets_desc')}</div>
  </div>
`;
```

---

## Example: Translate Table

### Before:
```javascript
const tableHtml = `
  <table>
    <thead>
      <tr>
        <th>Ticket Number</th>
        <th>Status</th>
        <th>Created Date</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map(row => `
        <tr>
          <td>${row.ticketNum}</td>
          <td>${row.status}</td>
          <td>${row.created}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
`;
```

### After:
```javascript
const tableHtml = `
  <table class="data-table">
    <thead>
      <tr>
        <th>${t('table_headers.ticket_number')}</th>
        <th>${t('table_headers.status')}</th>
        <th>${t('table_headers.created')}</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map(row => `
        <tr>
          <td>${row.ticketNum}</td>
          <td>${row.status}</td>
          <td>${formatLocalizedDate(row.created)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
`;
```

---

## Example: Translate Chart with Months

### Before:
```javascript
const chartData = google.visualization.arrayToDataTable([
  ['Month', 'Rate'],
  ['Jan 2026', 85],
  ['Feb 2026', 87],
  ['Mar 2026', 89],
  // ...
]);
```

### After:
```javascript
const monthLabels = [
  getMonthName(0) + ' 2026',  // January 2026 (translated)
  getMonthName(1) + ' 2026',  // February 2026 (translated)
  getMonthName(2) + ' 2026',  // March 2026 (translated)
];

const chartData = google.visualization.arrayToDataTable([
  [t('months.january'), 'Rate'],  // Header is also translated
  [monthLabels[0], 85],
  [monthLabels[1], 87],
  [monthLabels[2], 89],
  // ...
]);
```

---

## Common Functions Reference

```javascript
// Get translated text
t('key.subkey')                      // Returns translated string

// Format numbers
formatNumber(1234.56, 2)             // "1,234.56" (English) or "1.234,56" (German)
formatKPI(85, 'percent')             // "85.0%" in current language

// Format dates
formatLocalizedDate(date)            // "15 May 2026" (English) or "15 مايو 2026" (Arabic)
getMonthName(0)                      // "January" (English) or "يناير" (Arabic)

// Language management
applyLanguage('ar')                  // Switch to Arabic with RTL
CURRENT_LANGUAGE                     // Get current language code

// UI helpers
createLanguageSwitcher()             // Get HTML for language buttons
getExcelHeaders('return-status')    // Get translated Excel headers
```

---

## Testing Translation

1. **Start dashboard**
2. **Click language buttons** in top-right
3. **Verify:**
   - ✅ All text translates
   - ✅ Numbers format correctly
   - ✅ Dates display in language format
   - ✅ RTL works for Arabic
   - ✅ Charts update with translated labels
   - ✅ Excel exports with translated headers

---

## Performance Notes

- ✅ Translations loaded once at startup
- ✅ Language switching is instant (no page reload needed)
- ✅ localStorage caches language preference
- ✅ Minimal overhead: ~50KB for all 3 languages
- ✅ RTL/LTR switching automatic

---

## Adding New Languages

To add a 4th language (e.g., Spanish):

1. Add `"es"` object to `translations.json` with all keys
2. Update language switcher in `language.js`
3. Use `applyLanguage('es')` to switch

Example:
```json
{
  "en": { ... },
  "ar": { ... },
  "zh": { ... },
  "es": {
    "kpi": {
      "total_tickets": "TOTAL DE ENTRADAS",
      "total_tickets_desc": "Todos los Servicios"
      // ... all other keys
    }
  }
}
```

---

## Troubleshooting

### Issue: Text not translating
**Solution:** Make sure `language.js` is loaded before other scripts

### Issue: Arabic text appears reversed
**Solution:** This is correct! The browser handles RTL automatically

### Issue: Numbers formatting wrong
**Solution:** Use `formatNumber()` instead of `fmt()` for localized numbers

### Issue: Language switcher not appearing
**Solution:** Check browser console for errors, verify `translations.json` loads

---

**Ready to implement?** Start with Step 1 (Add to index.html) and work through each page file, replacing hardcoded text with `t()` function calls. 🚀
