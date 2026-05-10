# Column Mapping Reference

## Calls Sheet (CC_KPI_SHEET_ID)

| Column # | Config Key | Column Name | JS Index | Used For |
|----------|-----------|------------|----------|----------|
| 1 | DATE | Date | 0 | Extract _monthKey |
| 2 | QUEUE | Queue | 1 | - |
| 3 | AGENT | Agent | 2 | - |
| 4 | NUMBER | Number | 3 | - |
| 5 | EVENT | Event | 4 | Check if "ABANDON" for _isAbandoned |
| 6 | WAIT_TIME | Wait Time | 5 | - |
| 7 | TALK_TIME | Talk Time | 6 | - |
| 8 | DID | DID | 7 | - |
| 9 | UNIQUEID | uniqueid | 8 | - |
| 10 | AHT | AHT | 9 | Parse _aht (average handle time) |
| 11 | THT | THT | 10 | Parse _tht (total handle time) |
| 12 | AGENT_NAME | Agent Name | 11 | Extract _agent |
| **13** | **STATUS** | **Status** | **12** | **Extract _status (ANSWERED/ABANDON/etc)** ✓ |
| **14** | **CALL_TYPE** | **Call Type** | **13** | **Check _isInbound (IB) / _isOutbound (OB)** ✓ |
| 15 | DATE_FMT | Date Format | 14 | - |
| **16** | **MONTH** | **Month** | **15** | **Extract month for filtering** ✓ |
| 17 | WEEK | Week | 16 | - |
| 18 | DAY_NAME | Day Name | 17 | - |
| 19 | TIME | Time | 18 | - |
| 20 | HOUR | Hour | 19 | Extract _hour |
| 21 | MINUTE | Minute | 20 | - |
| 22 | SLAP | SLAP | 21 | - |
| 23 | SLAP2 | SLAP 2 | 22 | Extract _hour (priority over HOUR) |
| 24 | QTY | Qty | 23 | - |
| **25** | **WITHIN_SLA** | **Within SLA** | **24** | **Check _withinSLA (1 = within SLA)** ✓ |

## WhatsApp Sheet (CC_KPI_SHEET_ID)

| Column # | Column Name | JS Index | Used For |
|----------|------------|----------|----------|
| 1 | inbox_name | 0 | - |
| 2 | name | 1 | - |
| 3 | content | 2 | - |
| 4 | created_at | 3 | - |
| 5 | Channel | 4 | - |
| 6 | Qty | 5 | - |
| 7 | Date | 6 | Extract _monthKey (YYYY-MM-DD format) |
| 8 | Hours | 7 | Extract _hour |
| 9 | Minutes | 8 | - |
| 10 | SLAP | 9 | - |
| 11 | Slap2 | 10 | Extract _hour (priority over Hours) |
| 12 | Day | 11 | - |
| 13 | Year | 12 | - |
| 14 | Month | 13 | Extract month for filtering |
| 15 | Week | 14 | - |
| 16 | Day Name | 15 | - |

## Evaluation Form Sheet (CC_EVAL_SHEET_ID)

| Column # | Config Key | Column Name | JS Index | Used For |
|----------|-----------|------------|----------|----------|
| **1** | **AGENT** | **Agent** | **0** | **Extract _agent name** ✓ |
| **2** | **M_YEAR** | **M-Year** | **1** | **Extract year/period** |
| **3** | **MONTH** | **Month** | **2** | **Extract _month for filtering** ✓ |
| 4 | CATEGORY | Criteria Category | 3 | Extract _category |
| 5 | CRITERIA | Criteria | 4 | Extract _criteria |
| 6 | DESC | Description | 5 | - |
| **7** | **SCORE_15** | **Score (1-5)** | **6** | **Primary score column** ✓ |
| **8** | **MGR_EVAL** | **Manager Evaluation** | **7** | **Fallback score column** ✓ |
| 9 | MAX | Max | 8 | Maximum score value |
| **10** | **SCORE** | **Score** | **9** | **Final score (aggregated)** ✓ |
| 11 | SORT | Sort | 10 | Sorting order |
| 12 | REMARK | Remark | 11 | Comments/remarks |
| 13 | PHONE | Phone | 12 | Agent phone |

## Key Formulas

### SLA Rate (Answered IB Calls Only)
```
Filter: Status = "Answered" AND Call Type = "IB"
Formula: (Count with Within SLA = 1) / (Total Answered IB) * 100
May 2025: 19 / 33 = 57.6%
Jun 2025: 12 / 27 = 44.4%
```

### Abandon Rate (IB Calls Only)
```
Filter: Call Type = "IB"
Formula: (Count with Event = "ABANDON") / (Total IB) * 100
May 2025: 28 / 61 = 45.9%
Jun 2025: 23 / 50 = 46.0%
```
