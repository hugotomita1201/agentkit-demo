# DS-156E Field Reference

> **Verified Feb 8, 2026** — All fields extracted from the official PDF at `https://eforms.state.gov/Forms/ds156_e.pdf` using `extract_form_field_info.py`, then test-filled and visually confirmed.

## Form Overview

- **Full Name:** Nonimmigrant Treaty Trader/Investor Application (DS-1601-129)
- **Agency:** U.S. Department of State (NOT USCIS)
- **Use:** Accompanies DS-160 for E-1/E-2 visa applications
- **Pages:** 4 total — Page 1 is instructions only (no fillable fields)
- **Fillable Fields:** 209 across pages 2-4
- **Fill Method:** PyMuPDF (NOT pdftk — this is a State Dept form)
- **Blank PDF:** `backend/assets/forms/ds-156e-official.pdf`
- **Field Info JSON:** `backend/assets/forms/ds156e_field_info.json`

## Global Rules

### Checkbox Values
ALL checkboxes in DS-156E are uniform — no swaps, no reversed values:
- **Checked:** `/Yes`
- **Unchecked:** `/Off`

### Formatting
- **Font size:** Always use `text_fontsize = 8` (NOT 0). The firm requires 8pt minimum.
- **Dates:** `mm-dd-yyyy` (hyphens, not slashes)
- **Email:** lowercase (e.g., `attorney@example-firm.net`)
- **Names on Part III (page 4):** Normal case (matches attorney-approved example below)
- **Financial fields:** Use raw numbers without `$` or commas to avoid NaN in Adobe Acrobat (see Financial Fields section)
- **Empty financial fields:** Use `-` (dash), not `N/A`

### Fields Prone to Text Overflow
These fields have narrow dimensions relative to typical content. Always run `check_text_overflow.py` after building `field_values.json`:
- `USHead` — multi-office addresses get long
- `Descrip` — business description often exceeds field
- `Exp` — professional experience summary often exceeds field
- `Duties` — U.S. position duties often exceeds field
- `Posit` — position title + duties description
- `EmpName` — employer name + full address combined
- `Foreign` — foreign parent name + full address combined

### Fields to SKIP (Do Not Fill)
| Field ID | Reason |
|----------|--------|
| `Signature1` | Digital signature field (type `/Sig`) — cannot accept text |
| `VFPage2AdditionalCalc` | Hidden JS calculation field (zero-size rect) |
| `VFPage3AdditionalCalc` | Hidden JS calculation field (zero-size rect) |
| `VFPage4AdditionalCalc` | Hidden JS calculation field (zero-size rect) |
| `Number4` | Hidden internal field |
| `H` | Hidden internal field |

---

## Page 2 — Part I: Business Profile (61 fields)

### Section 1: Name of Petitioning U.S. Enterprise
| Field ID | Type | Description |
|----------|------|-------------|
| `Name` | text | Full company name |

### Section 2: Type of Business
| Field ID | Type | Description |
|----------|------|-------------|
| `Corp` | checkbox | Corporation |
| `BrLiaOff` | checkbox | Branch/Liaison Office |
| `Partner` | checkbox | Partnership |
| `PriOwn` | checkbox | Privately Owned |
| `JointVen` | checkbox | Joint Venture |
| `Subsid` | checkbox | Subsidiary |
| `Other` | checkbox | Other |
| `OtherA` | text | Other — specify |

### Section 3: U.S. Office Addresses
| Field ID | Type | Description |
|----------|------|-------------|
| `USHead` | text | Multi-line office addresses. Use `\n` for line breaks. **Tabs (`\t`) do NOT work** — use multiple spaces for column alignment. Format: `Company Name    Address    Office Type` one office per line. |
| `PhoneA` | text | U.S. headquarters phone |
| `FaxA` | text | U.S. headquarters fax |

### Section 4: Date and Place of Establishment
| Field ID | Type | Description |
|----------|------|-------------|
| `DatePla` | text | Date only (mm-dd-yyyy format). NOT combined with place. |
| `Place` | text | Location only (e.g., "California"). NOT combined with date. |

### Section 5: Nature of Business

> **CRITICAL:** `Corpor` is a CHECKBOX for "General Trade" — NOT a text field for company name. Existing templates may incorrectly map it.

| Field ID | Type | Description |
|----------|------|-------------|
| `Corpor` | **checkbox** | **General Trade** (often incorrectly assumed to be company name text) |
| `ImpToUS` | checkbox | Imports to U.S. |
| `ExpFrUS` | checkbox | Exports from U.S. |
| `Manufact` | checkbox | Manufacturing |
| `RetSale` | checkbox | Retail Sales |
| `SerTech` | checkbox | Services/Technology Transfer |
| `NatOth` | checkbox | Other |
| `NatOthA` | text | Other — describe |

### Section 6: Description of Business
| Field ID | Type | Description |
|----------|------|-------------|
| `Descrip` | text | Full business description. Multi-line supported with `\n`. |

### Section 7: Foreign Parent Company

> **CRITICAL:** The `Foreign` text field should contain BOTH the company name AND its full address (multi-line). The company name does NOT go in `Corpor` (that's a checkbox).

| Field ID | Type | Description |
|----------|------|-------------|
| `Foreign` | text | Foreign parent name AND address combined. Format: `COMPANY NAME\nAddress Line 1\nCity, Postal Code, Country` |
| `ForePhon` | text | Foreign parent phone (include country code) |
| `ForeFax` | text | Foreign parent fax (include country code) |

### Section 8: Foreign Ownership (Corporate/Entity Owners Only)

> These fields are for CORPORATE/ENTITY owners, not individual people. Up to 6 entries (A-E + base).

| Field ID | Type | Description |
|----------|------|-------------|
| `ForName` | text | Owner 1 — entity name |
| `ForNat` | text | Owner 1 — nationality |
| `ForInv` | text | Owner 1 — investment amount |
| `ForOwn` | text | Owner 1 — ownership percentage |
| `ForNameA`–`ForNameE` | text | Owners 2-6 — entity name |
| `ForNatA`–`ForNatE` | text | Owners 2-6 — nationality |
| `ForInvA`–`ForInvE` | text | Owners 2-6 — investment amount |
| `ForOwnA`–`ForOwnE` | text | Owners 2-6 — ownership percentage |

### Section 9: Financial Statement

| Field ID | Type | Description |
|----------|------|-------------|
| `StateYr` | text | Financial year (e.g., "2025") |
| `FinCY` | checkbox | Calendar Year |
| `FinFY` | checkbox | Fiscal Year |
| `CurrCash` | checkbox | Current Cash |
| `HistCash` | checkbox | Historical Cost |
| `Assets` | text | Total Assets (use raw number — see Financial Fields) |
| `Liabil` | text | Total Liabilities (use raw number) |
| `Equity` | text | Owner's Equity (use raw number) |
| `BefTax` | text | Net Income Before Tax (use raw number) |
| `AftTax` | text | Net Income After Tax (use raw number) |

---

## Page 3 — Part I continued + Part II (110 fields)

### Section 10: Gross International Trade

> **CRITICAL:** `GrossTra` is a TEXT field for the year — NOT a checkbox. Existing templates may incorrectly map it.

| Field ID | Type | Description |
|----------|------|-------------|
| `GrossTra` | **text** | Year (e.g., "2024") — often incorrectly assumed to be a checkbox |
| `GITCY` | checkbox | Calendar Year |
| `GITFY` | checkbox | Fiscal Year |
| `GITEnd` | text | Fiscal year end date |

**Import/Export Table — Current Year:**

| Field ID | Type | Description |
|----------|------|-------------|
| `ImpCur` | text | Imports — dollar amount (raw number) |
| `ImpNo` | text | Imports — number of transactions |
| `ImpPer` | text | Imports — percentage of total |
| `ExpCur` | text | Exports — dollar amount (raw number) |
| `ExpNo` | text | Exports — number of transactions |
| `ExpPer` | text | Exports — percentage of total |

**Import/Export Table — 3rd Country:**

| Field ID | Type | Description |
|----------|------|-------------|
| `ImThiCur` | text | 3rd country imports — dollar amount |
| `ImpThiNo` | text | 3rd country imports — number |
| `ImpThPer` | text | 3rd country imports — percentage |
| `ExThiCur` | text | 3rd country exports — dollar amount |
| `ExThiNo` | text | 3rd country exports — number |
| `ExThiPer` | text | 3rd country exports — percentage |

**Other and Totals:**

| Field ID | Type | Description |
|----------|------|-------------|
| `OthCur` | text | Other trade — dollar amount |
| `OthNo` | text | Other trade — number |
| `TotCur` | text | Total trade — dollar amount |
| `TotNo` | text | Total trade — number |

### Section 11: Business Type
| Field ID | Type | Description |
|----------|------|-------------|
| `ExBus` | checkbox | Existing Business |
| `NewBus` | checkbox | New Business |
| `PurBus` | checkbox | Purchase of Existing Business |
| `NBCost` | text | New business — estimated cost |
| `PBPrice` | text | Purchase — price paid |
| `EBValue` | text | Existing — fair market value |

### Section 12: Total Investment in U.S. Enterprise
| Field ID | Type | Description |
|----------|------|-------------|
| `Year` | text | Year |
| `TotCY` | checkbox | Calendar Year |
| `TotFY` | checkbox | Fiscal Year |

**Investment Breakdown (Initial / Cumulative):**

| Field ID | Type | Description |
|----------|------|-------------|
| `CashInv` / `CashCum` | text | Cash — initial / cumulative |
| `InvInv` / `InvCum` | text | Inventory — initial / cumulative |
| `EqpInv` / `EqpCum` | text | Equipment — initial / cumulative |
| `PreInv` / `PreCum` | text | Premises — initial / cumulative |
| `OthInv` / `OthCum` | text | Other — initial / cumulative |
| `TotInv` / `TotCum` | text | Total — initial / cumulative |

### Section 14: Personnel

| Field ID | Type | Description |
|----------|------|-------------|
| `PerCY` | checkbox | Calendar Year |
| `PerFY` | checkbox | Fiscal Year |

**Employee Count Table (24 individual cells — fill each separately, do NOT sum rows):**

| Category | Mgr This Yr | Mgr Next Yr | Spec Emp This Yr | Spec Emp Next Yr | Other This Yr | Other Next Yr |
|----------|-------------|-------------|------------------|------------------|---------------|---------------|
| Nationals | `NatTY` | `NatNY` | `NatSEYr` | `NatEssYr` | `NatEmYr` | `NatEmNYr` |
| Citizens | `CitTYr` | `CitNYr` | `CitSEssY` | `CitEsNYr` | `CitEmTYr` | `CitEmNYr` |
| Other | `OthTYr` | `OthNYr` | `OthEsTYr` | `OthEsNYr` | `OthEmTYr` | `OthEmNYr` |
| **Total** | `TotTYr` | `TotNYr` | `TotEsTYR` | `TotEsNYr` | `TotEmTYr` | `TotEmNYr` |

### Section 15: Key Personnel (Up to 8 entries: A-H)

> **IMPORTANT:** There are NO separate name fields. Combine the person's full name with their title in the Title field: `"Full Name, Title"` (e.g., `"Takeshi Hayashi, President & CEO"`).

| Entry | Name+Title | Nationality | Visa Type | Date | Place |
|-------|------------|-------------|-----------|------|-------|
| A | `TitleA` | `NationA` | `TypeA` | `DateVisa` | `PlaceA` |
| B | `TitleB` | `NationB` | `TypeB` | `DatePos` | `PlaceP` |
| C | `TitleC` | `NationC` | `TypeC` | `DatePosB` | `PlaceB` |
| D | `TitleD` | `NationD` | `TypeD` | `DatePosC` | `PlaceC` |
| E | `TitleE` | `NationE` | `TypeE` | `DatePosD` | `PlaceD` |
| F | `TitleF` | `NationF` | `TypeF` | `DatePosE` | `PlaceE` |
| G | `TitleG` | `NationG` | `TypeG` | `DatePosF` | `PlaceF` |
| H | `TitleH` | `NationH` | `TypeH` | `DatPosG` | `PlaceG` |

Note the inconsistent date/place field naming (DateVisa vs DatePos vs DatePosB... and PlaceA vs PlaceP vs PlaceB...).

---

## Page 4 — Part III: Applicant Information (38 fields)

### Section 16: Applicant Name
| Field ID | Type | Description |
|----------|------|-------------|
| `LName` | text | Last name |
| `FName` | text | First name |
| `Middle` | text | Middle name |

### Section 17: Position Classification
| Field ID | Type | Description |
|----------|------|-------------|
| `Owner` | checkbox | Principal Owner |
| `Manage` | checkbox | Manager |
| `Super` | checkbox | Supervisor |
| `Exec` | checkbox | Executive |
| `Spec` | checkbox | Specialist |
| `OtherB` | checkbox | Other |
| `OtherC` | text | Other — specify |

### Section 18: Position and Duties
| Field ID | Type | Description |
|----------|------|-------------|
| `Posit` | text | Position title and duties description. Multi-line with `\n`. |

### Section 19: Employer Name and Address

> **IMPORTANT:** This is a SINGLE multi-line text field. Combine employer name AND full address.

| Field ID | Type | Description |
|----------|------|-------------|
| `EmpName` | text | `"COMPANY NAME\nFull Address"` (multi-line with `\n`) |

### Section 20-22: Background
| Field ID | Type | Description |
|----------|------|-------------|
| `YrEmp` | text | Years of employment |
| `School` | text | School/university name |
| `Subject` | text | Field of study |
| `Degree` | text | Degree type |
| `DegYr` | text | Year of degree |
| `Exp` | text | Professional experience summary. Multi-line with `\n`. |

### Section 23: U.S. Position
| Field ID | Type | Description |
|----------|------|-------------|
| `Title` | text | U.S. position title |
| `Duties` | text | U.S. position duties. Multi-line with `\n` and bullet points supported. |

### Section 24: Compensation
| Field ID | Type | Description |
|----------|------|-------------|
| `TotSal` | text | Salary amount |
| `Allow` | text | Allowances (use "Included" if included in salary) |
| `TotalSal` | text | Total compensation. Default: `-` (dash, not "N/A") |

### Section 25: Person Being Replaced

> **CRITICAL:** `WorkY`/`WorkN` and `TrainY`/`TrainN` have MISLEADING field names.

| Field ID | Type | Description |
|----------|------|-------------|
| `PerRep` | text | Name of person being replaced |
| `Visa` | text | Visa type of person replaced |
| `DateIss` | text | Date visa issued |
| `PlIss` | text | Place visa issued |
| `WorkY` | checkbox | **"a. An increase in staff?"** — YES (NOT "Did person work 6+ months?") |
| `WorkN` | checkbox | **"a. An increase in staff?"** — NO |
| `TrainY` | checkbox | **"b. Continuation of existing employment?"** — YES (NOT "Will receive training?") |
| `TrainN` | checkbox | **"b. Continuation of existing employment?"** — NO |

### Section 26: Signature
| Field ID | Type | Description |
|----------|------|-------------|
| `Print` | text | Printed name of signatory (e.g., `"Hideki Shide, Executive Vice President"`) |
| `SiDate` | text | Date signed (mm-dd-yyyy) |
| `Signature1` | /Sig | **SKIP — digital signature field, cannot accept text** |

### Section 27: Attorney Contact (HARDCODED)

> **ALWAYS use hardcoded values. NEVER extract from uploaded documents.**

| Field ID | Type | Value |
|----------|------|-------|
| `Contact` | text | `Jane Carolina Doe\nExample Law Firm PC\n1000 Example Blvd., Suite 200\nLos Angeles, CA 90025\nattorney@example-firm.net` |
| `Phone` | text | `310-555-0100` |
| `Fax` | text | `310-555-0101` |

Do NOT confuse `Phone`/`Fax` (Section 27, hardcoded attorney) with `PhoneA`/`FaxA` (Section 3, U.S. headquarters — extract from case docs).

---

## Part III — Complete Example (field_values.json)

This is a verified, attorney-approved Part III for an E-2 employee. Use it as a pattern for detail level, source routing, checkbox inclusion, and formatting.

**Field line counts at 8pt font:**

| Field | Lines | Content Source |
|-------|-------|----------------|
| Posit (18) | 4 lines | Worksheet or support letter summary |
| EmpName (19) | 2 lines | Company name line 1, full address line 2 |
| Exp (22) | 3 lines | Brief summary + "Please see the attached letter for more information" |
| Duties (23) | 23 lines | **Copy from support letter** — this is the primary content field |
| Contact (27) | 6 lines | Hardcoded attorney (never changes) |

```json
[
  {"field_id": "LName", "description": "Family name", "page": 4, "value": "Ugajin"},
  {"field_id": "FName", "description": "First name", "page": 4, "value": "Koji"},
  {"field_id": "Middle", "description": "Middle name", "page": 4, "value": ""},

  {"field_id": "Manage", "description": "17. Manager", "page": 4, "value": "/Yes"},
  {"field_id": "Owner", "description": "17. Owner", "page": 4, "value": "/Off"},
  {"field_id": "Super", "description": "17. Supervisor", "page": 4, "value": "/Off"},
  {"field_id": "Exec", "description": "17. Executive", "page": 4, "value": "/Off"},
  {"field_id": "Spec", "description": "17. Specialist", "page": 4, "value": "/Off"},
  {"field_id": "OtherB", "description": "17. Other", "page": 4, "value": "/Off"},

  {"field_id": "Posit", "description": "18. Present position and duties (source: worksheet/letter)", "page": 4, "value": "As Technical Specialist in the Vehicle Manufacturing Dept., Mr. Ugajin is responsible for planning training programs for production teams, developing standardization of work processes, and supporting the launch of production lines. He also coordinates daily team activities, monitors operational progress, prepares and executes planning documents, and ensures that production readiness aligns with Isuzu's global manufacturing standards."},

  {"field_id": "EmpName", "description": "19. Employer name and address (2 LINES MAX)", "page": 4, "value": "Isuzu Motors Limited (\"Isuzu\")\n8 Tsuchidana, Fujisawa, Kanagawa 252-0881, Japan"},

  {"field_id": "YrEmp", "description": "20. Years with present employer", "page": 4, "value": "27 years"},
  {"field_id": "School", "description": "21. School", "page": 4, "value": "Kanto Daiichi High School"},
  {"field_id": "Subject", "description": "21. Major/Subject", "page": 4, "value": "Machinery Eng."},
  {"field_id": "Degree", "description": "21. Degree", "page": 4, "value": "High School Diploma"},
  {"field_id": "DegYr", "description": "21. Year", "page": 4, "value": "1998"},
  {"field_id": "Exp", "description": "22. Other experience (3 LINES — brief summary + refer to attached letter)", "page": 4, "value": "In April 1998, Mr. Ugajin joined Isuzu and has continuously advanced through positions of increasing responsibility and oversight. Please see the attached letter for more information."},

  {"field_id": "Title", "description": "23. U.S. position title", "page": 4, "value": "Assistant Manager, General Assembly"},
  {"field_id": "Duties", "description": "23. Duties (source: SUPPORT LETTER — copy verbatim, 23 lines available)", "page": 4, "value": "Subject to your approval, Mr. Ugajin will manage three immediate subordinates and be responsible for supervising the General Assembly Division at Isuzu North America Corporation (\"INAC\")'s new manufacturing plant in South Carolina. More specifically, his day-to-day responsibilities will include:\n\n- Team Development and Training: Designing and executing training programs for managers, senior supervisors, team leaders, and operators. He will prepare structured education plans, define implementation schedules, assign responsibilities, monitor execution, and provide progress reports.\n- Standardization of Work Processes: Directing the preparation of operational manuals, work standards, and procedural guidelines for assembly, inspection, and logistics functions.\n- Production Line Establishment and Oversight: Managing the setup, organization, and ongoing improvement of production processes within the assembly lines. He will create detailed execution plans, coordinate procurement of equipment and materials, supervise installation and acceptance testing, and provide status updates to senior management.\n- Operational Coordination Across Functions: Supervising activities across the assembly, inspection, logistics, and maintenance functions within the production division.\n- Performance Monitoring and Reporting: Implementing systems for tracking operational results, including production volumes, quality metrics, safety compliance, and cost efficiency. He will analyze performance data, identify deviations from plan, and initiate corrective measures, providing regular updates to executive leadership on progress and issues.\n- Resource and Policy Implementation: Overseeing the allocation of human resources, equipment, and materials within the General Assembly Division. Please see the attached letter for more information.\n\nImmediate subordinates: Kazuya Akahira (Assistant Supervisor, General Assembly); Keishi Kikuchi (Management Coordinator, General Assembly); and Nagito Nakamura (Assistant Supervisor, Production Logistics)"},

  {"field_id": "TotSal", "description": "24. Salary", "page": 4, "value": "161,187.00"},
  {"field_id": "Allow", "description": "24. Allowances", "page": 4, "value": "Incl. in Sal."},
  {"field_id": "TotalSal", "description": "24. Total", "page": 4, "value": "161,187.00"},

  {"field_id": "PerRep", "description": "25. Person being replaced", "page": 4, "value": "None"},
  {"field_id": "Visa", "description": "25. Type of visa", "page": 4, "value": "N/A"},
  {"field_id": "DateIss", "description": "25. Date issued", "page": 4, "value": "N/A"},
  {"field_id": "PlIss", "description": "25. Place issued", "page": 4, "value": "N/A"},
  {"field_id": "WorkY", "description": "25a. Increase in staff? YES", "page": 4, "value": "/Yes"},
  {"field_id": "WorkN", "description": "25a. Increase in staff? NO", "page": 4, "value": "/Off"},
  {"field_id": "TrainY", "description": "25b. Continuation of employment? YES", "page": 4, "value": "/Off"},
  {"field_id": "TrainN", "description": "25b. Continuation of employment? NO", "page": 4, "value": "/Yes"},

  {"field_id": "Print", "description": "26. Printed name and position", "page": 4, "value": "Hideki Shide, Executive Vice President"},
  {"field_id": "SiDate", "description": "26. Signature date — leave BLANK", "page": 4, "value": ""},

  {"field_id": "Contact", "description": "27. Attorney contact (HARDCODED)", "page": 4, "value": "Jane Carolina Doe\nExample Law Firm PC\n1000 Example Blvd., Ste. 200\nLos Angeles, CA 90025\nattorney@example-firm.net"},
  {"field_id": "Phone", "description": "27. Phone (HARDCODED)", "page": 4, "value": "310-555-0100"},
  {"field_id": "Fax", "description": "27. Fax (HARDCODED)", "page": 4, "value": "310-555-0101"}
]
```

**Key patterns from this example:**
- Names are normal case (not UPPERCASE) on Part III
- Section 17: Check the **visa classification** (Manager/Executive/Specialist), not the job title. ALL 6 checkboxes must be included — one `/Yes`, five `/Off`
- Section 18 (Posit): Fill ALL 4 lines — detailed description of current duties from worksheet/letter. Do NOT use "Please see the attached letter" here (save that for Section 22 only). If the overflow checker flags it, trim slightly — do not gut the content
- Section 19 (EmpName): Company name on line 1, FULL address on line 2 (2 lines max — combine city/state/zip)
- Section 22 (Exp): Brief summary + "Please see the attached letter for more information" — do NOT list every position
- Section 23 (Duties): **Copy from support letter** — detailed bullet points filling ~20 lines, subordinates listed at end
- Section 24: Format salary with commas and `.00` (e.g., `161,187.00`). No `$` sign. These fields are on Page 4 and NOT affected by the Page 2-3 NaN issue. Use `Incl. in Sal.` for allowances if included in salary. Total should match salary or be the sum.
- Section 25: Both checkbox pairs included — exactly one `/Yes` and one `/Off` per pair
- Section 26: Signer name + title, date left BLANK
- Section 27: Always hardcoded attorney info

**Newline rule for Duties:** Use this exact structure:
- `\n\n` after the intro paragraph, before the first `- ` bullet
- `\n` before each `- Duty Category:` bullet (each duty starts on its own line)
- NO `\n` within a bullet's description text — let it word-wrap to fill the full width
- `\n\n` after the last bullet, before "Immediate subordinates:"
- **Posit/Exp:** Write as continuous text (no bullets, no `\n`). Only EmpName and Contact use `\n` for address line breaks.

---

## Financial Fields — NaN Risk

DS-156E has JavaScript validation scripts embedded in the PDF for financial fields. When filled with `$`, commas, or `%` symbols, Adobe Acrobat's JS tries to parse them as numbers and displays **NaN**.

**Affected fields (42+ fields):**
- Page 2: `Assets`, `Liabil`, `Equity`, `BefTax`, `AftTax`
- Page 3: `ImpCur`, `ImpNo`, `ImpPer`, `ExpCur`, `ExpNo`, `ExpPer`, `ImThiCur`, `ImpThiNo`, `ImpThPer`, `ExThiCur`, `ExThiNo`, `ExThiPer`, `OthCur`, `OthNo`, `TotCur`, `TotNo`, `NBCost`, `PBPrice`, `EBValue`, `CashInv`, `CashCum`, `InvInv`, `InvCum`, `EqpInv`, `EqpCum`, `PreInv`, `PreCum`, `OthInv`, `OthCum`, `TotInv`, `TotCum`

**Solutions:**
1. **Preferred:** Fill with raw numeric values only (e.g., `26006908` not `$26,006,908`)
2. **Alternative:** Use coordinate-based overlay filling for formatted display (coordinates documented in `ds156ePyMuPDFFiller.js`)

Note: pypdf static fill renders formatted values fine — the NaN issue only appears when Adobe Acrobat runs the embedded JavaScript.

---

## CRITICAL: Strip Embedded JavaScript After Filling

DS-156E has embedded JavaScript validation scripts that cause two problems:
1. **NaN display** in Adobe Acrobat when financial fields contain formatted values
2. **"API error"** when editing fields in Microsoft Edge on Windows

**After filling all fields and before saving the final PDF, you MUST strip the JavaScript:**

```python
# After filling all widgets...
doc.scrub(javascript=True, reset_fields=False, reset_responses=False)  # Removes JS; preserves field values
doc.save("filled_ds156e.pdf", garbage=4, deflate=True)
```

The `reset_fields=False` and `reset_responses=False` are **critical** — without them, `scrub()` defaults to wiping all field values (checkboxes revert to unchecked, text fields clear on click). This preserves field values while stripping JavaScript.

**Do NOT skip this step.** Without it, the filled PDF will trigger errors when users try to edit fields on Windows.

---

## Common Mistakes to Avoid

1. **`Corpor` is NOT a text field** — It's the "General Trade" checkbox in Section 5. The foreign parent company name goes in `Foreign` (text field, Section 7).

2. **`GrossTra` is NOT a checkbox** — It's a text field for the year in Section 10. The General Trade checkbox is `Corpor`.

3. **`WorkY`/`WorkN` are NOT "Did person work 6+ months?"** — They are "a. An increase in staff?" (Section 25a).

4. **`TrainY`/`TrainN` are NOT "Will receive training?"** — They are "b. Continuation of existing employment in the United States?" (Section 25b).

5. **`Phone`/`Fax` vs `PhoneA`/`FaxA`** — `Phone`/`Fax` are hardcoded attorney contact (Section 27). `PhoneA`/`FaxA` are U.S. headquarters (Section 3, extract from docs).

6. **Section 15 has no separate name fields** — Combine name + title into `TitleA`-`TitleH`.

7. **`Foreign` needs name AND address** — Not just the company name.

8. **`EmpName` needs name AND address** — Not just the employer name.

9. **Tabs don't work in text fields** — Use multiple spaces for column alignment in `USHead`.

10. **Section 27 is always hardcoded** — Never extract attorney contact from uploaded documents.
