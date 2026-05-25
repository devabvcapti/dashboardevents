# Domain Pitfalls: Excel Import Pipeline

**Domain:** Event/conference participant data import (Excel → Supabase)
**Project:** ABVCAP Congress Dashboard
**Researched:** 2026-05-21
**Overall Confidence:** HIGH — multiple official sources, library docs, and CVE databases confirmed

---

## Critical Pitfalls

Mistakes that require rewrites, data loss, or security incidents.

---

### Pitfall 1: Excel Date Serial Numbers Silently Produce Wrong Dates

**What goes wrong:** Excel stores dates as floating-point serial numbers (days since Dec 30, 1899). When SheetJS or ExcelJS parses a date cell without explicit UTC handling, the result shifts by your server's timezone offset — typically 1-3 hours for Brazil (BRT/BRST = UTC-3). A date stored as "2025-04-15" becomes "2025-04-14T21:00:00" and rounds down to the wrong day.

**Why it happens:** Excel's date origin is December 30, 1899 (not Jan 1, 1970). SheetJS applies a timezone correction based on the local system clock. A server running in America/Sao_Paulo applies -3h offset; the resulting ISO string's date portion becomes the previous day.

**Consequences:** Registration dates, check-in dates, and ticket purchase dates are all off by one day. Downstream reports and attendance counts are wrong. The bug is invisible until someone cross-references the original Excel.

**Prevention:**
```javascript
// SheetJS: force raw serial numbers, convert manually
const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false });
// Then convert serial → UTC date explicitly:
function excelSerialToUTCDate(serial) {
  // Excel leap year bug: serial 60 = Feb 29 1900 (doesn't exist)
  const adjusted = serial > 60 ? serial - 1 : serial;
  const msPerDay = 86400000;
  const epoch = new Date(Date.UTC(1899, 11, 30));
  return new Date(epoch.getTime() + adjusted * msPerDay);
}
```

**Detection:** Unit-test the parser with a known date (e.g., "2025-01-15") and assert the output equals `2025-01-15` regardless of server timezone.

**Sources:** [SheetJS dates docs](https://docs.sheetjs.com/docs/csf/features/dates/), [GitHub issue #1804](https://github.com/SheetJS/sheetjs/issues/1804), [ATLASSC parsing guide](https://atlassc.net/2024/04/03/parsing-excel-dates-with-node-js-xlsx-library)

---

### Pitfall 2: Merged Header Cells Destroy Column Mapping

**What goes wrong:** Event platform exports (Sympla, Eventbrite, in-house tools) frequently use merged cells for grouped headers — e.g., "Dados do Participante" spanning columns A–E, then "Formulário" spanning F–J. SheetJS only stores the value in the top-left cell of a merge range; all other cells in the range return `undefined`. The result: your header-detection code finds the right column names on row 1 but maps them to wrong indices, silently importing names into the company field.

**Why it happens:** XLSX merge ranges (`!merges` array) require explicit handling. `sheet_to_json()` does not unmerge cells automatically.

**Consequences:** Silent data corruption. Participant names go into wrong fields with no error thrown.

**Prevention:**
```javascript
// Detect and flatten merged header rows before parsing
const sheet = wb.Sheets[wb.SheetNames[0]];
const merges = sheet['!merges'] || [];

// Propagate top-left cell value across all merged cells
merges.forEach(merge => {
  const topLeftCell = sheet[XLSX.utils.encode_cell({ r: merge.s.r, c: merge.s.c })];
  for (let row = merge.s.r; row <= merge.e.r; row++) {
    for (let col = merge.s.c; col <= merge.e.c; col++) {
      if (row === merge.s.r && col === merge.s.c) continue;
      const addr = XLSX.utils.encode_cell({ r: row, c: col });
      sheet[addr] = { ...topLeftCell };
    }
  }
});
```

**Detection:** Log the raw header row before processing. Assert every expected column name appears exactly once.

**Sources:** [SheetJS merged cells docs](https://docs.sheetjs.com/docs/csf/features/merges/), [GitHub issue #2674](https://github.com/SheetJS/sheetjs/issues/2674)

---

### Pitfall 3: Brazilian Currency (BRL) Columns Arrive as Text Strings

**What goes wrong:** Excel exported from a Brazilian Windows machine formats the ticket value column as `R$ 1.234,56` (dot = thousands separator, comma = decimal separator). When parsed by SheetJS on a server with an English/US locale, the cell type may be `s` (string) instead of `n` (number), or the numeric value may be wrong because Excel stored a display format but not the raw number. `parseFloat("1.234,56")` returns `1.234` — silently dropping everything after the comma.

**Why it happens:** Brazil uses inverted number separators (comma for decimal, dot for thousands). Excel stores currency cells differently depending on whether the regional format was set when the file was created. Server-side parsing libraries assume US locale.

**Consequences:** Ticket revenue totals are wrong. `R$ 2.500,00` becomes `2.5` in the database. Aggregations break. No error is raised.

**Prevention:**
```javascript
function parseBRLCurrency(raw) {
  if (typeof raw === 'number') return raw; // Already a number — trust it
  if (typeof raw !== 'string') return null;
  // Remove currency symbol, spaces, then swap separators
  const cleaned = raw
    .replace(/R\$\s?/g, '')
    .replace(/\./g, '')      // remove thousands dots
    .replace(',', '.')       // swap decimal comma to point
    .trim();
  const value = parseFloat(cleaned);
  return isNaN(value) ? null : value;
}
```

Always validate: if the column is "ticket value" and the result is < 1 for values expected in hundreds, reject the row and report a parsing warning.

**Sources:** [Freeformatter BR standards](https://www.freeformatter.com/brazil-standards-code-snippets.html), [Microsoft Community: BR currency](https://techcommunity.microsoft.com/discussions/excelgeneral/formatting-cells-for-brazilian-currency-/4040624)

---

### Pitfall 4: Formula Injection via Cell Content (CSV/Formula Injection)

**What goes wrong:** A participant enters `=HYPERLINK("https://evil.com","click")` or `+cmd|'/C calc'!A0` as their name or company. If you ever export that data back to Excel (e.g., generating an attendance report), the formula executes in the victim admin's spreadsheet. This is a real attack vector against admin-facing dashboards.

**Why it happens:** SheetJS does not sanitize cell values. The npm `xlsx` package has an open GitHub issue (#1417) explicitly acknowledging it provides no defense against formula injection.

**Consequences:** At minimum, the admin's Excel opens a malicious hyperlink or popup. At worst, on older Office versions, DDE-based payloads can execute system commands.

**Prevention:**
```javascript
// On every string cell value before storing or re-exporting
function sanitizeFormulaInjection(value) {
  if (typeof value !== 'string') return value;
  // Prefix with single quote if starts with formula trigger chars
  if (/^[=+\-@\t\r]/.test(value.trim())) {
    return `'${value.trim()}`; // Excel renders the quote but stores the prefix
  }
  return value;
}
```

Apply this on IMPORT (normalize the stored data) so it never propagates.

**Sources:** [HackTricks formula injection](https://book.hacktricks.xyz/pentesting-web/formula-csv-doc-latex-ghostscript-injection), [SheetJS issue #1417](https://github.com/SheetJS/sheetjs/issues/1417), [CyberChief guide 2024](https://www.cyberchief.ai/2024/09/csv-formula-injection-attacks.html)

---

### Pitfall 5: XXE / Malicious XLSX Payload (Server Security)

**What goes wrong:** XLSX is a ZIP archive of XML files. A crafted XLSX can contain an XML External Entity (XXE) payload in one of its internal XML files. If the parsing library resolves external entities, it can read files from the server filesystem (`/etc/passwd`, `.env`, Supabase service key) and exfiltrate them. CVE-2024-45293 hit PHPSpreadsheet with exactly this attack.

**Why it happens:** XLSX XML parsers that don't disable `LIBXML_NOENT` or equivalent entity resolution are vulnerable.

**Consequences:** Service role key leakage = full database access. This is a catastrophic breach.

**Prevention for JavaScript (SheetJS / ExcelJS):**
- SheetJS uses its own XML parser that does not resolve external entities by default — but verify your installed version is current.
- Never pass a user-uploaded file path directly to any XML parser with entity resolution enabled.
- Always validate the file is a valid ZIP before parsing: check magic bytes (`PK\x03\x04` = 0x504B0304).
- Validate MIME type server-side — do not trust the `Content-Type` header the browser sends.
- Cap file size before parsing begins (reject > 10MB before the buffer even loads into memory).

```javascript
// Magic byte check
function isValidXLSX(buffer) {
  // ZIP magic bytes: 50 4B 03 04
  return buffer[0] === 0x50 && buffer[1] === 0x4B &&
         buffer[2] === 0x03 && buffer[3] === 0x04;
}
```

**Sources:** [CVE-2024-45293 advisory](https://github.com/advisories/GHSA-6hwr-6v2f-3m88), [OWASP unrestricted file upload](https://owasp.org/www-community/vulnerabilities/Unrestricted_File_Upload), [PortSwigger file uploads](https://portswigger.net/web-security/file-upload)

---

## Moderate Pitfalls

Mistakes that corrupt data or degrade UX but don't cause security incidents.

---

### Pitfall 6: Extra Header Rows Above the Real Header

**What goes wrong:** Many event platforms add a "report" banner above the actual column headers. The first two rows might be:
- Row 1: `"Relatório de Participantes — Congresso ABVCAP 2025"` (merged across all columns)
- Row 2: `"Exportado em: 15/04/2025"` 
- Row 3: `Nome`, `Empresa`, `Tipo de Ingresso`, ...

SheetJS `sheet_to_json()` with `{ header: 1 }` treats row 1 as headers. All column names are wrong and no data lands in the right field.

**Prevention:** Do not assume row 1 is always the header. Scan the first 5 rows for a row that contains the most expected column keywords (case-insensitive). Define a `KNOWN_HEADERS` set and score each row:

```javascript
const KNOWN_HEADERS = ['nome', 'email', 'empresa', 'ingresso', 'cpf', 'telefone'];

function detectHeaderRow(rows) {
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const cells = (rows[i] || []).map(c => String(c || '').toLowerCase());
    const matches = KNOWN_HEADERS.filter(h => cells.some(c => c.includes(h)));
    if (matches.length >= 3) return i;
  }
  throw new Error('Não foi possível encontrar a linha de cabeçalho na planilha.');
}
```

---

### Pitfall 7: Blank/Ghost Rows with Formatting but No Data

**What goes wrong:** An admin adds borders or background color to 500 rows "for readability" in Excel. SheetJS sees formatted cells and emits empty row objects. `sheet_to_json()` with `{ blankRows: false }` does not reliably skip these — rows with formatting but no values still appear.

**Consequences:** Importing 2000 "participants" when only 300 are real. Database fills with null-name records.

**Prevention:**
```javascript
// After parsing, filter rows that have zero meaningful values
function isDataRow(row, requiredFields = ['nome', 'email']) {
  return requiredFields.some(field => {
    const val = row[field];
    return val !== null && val !== undefined && String(val).trim() !== '';
  });
}
const cleanRows = parsedRows.filter(isDataRow);
```

Also set `defval: null` in `sheet_to_json` options so empty cells are explicit nulls rather than missing keys.

---

### Pitfall 8: CPF Stored as Number Loses Leading Zero

**What goes wrong:** CPF `023.456.789-09` gets entered into Excel without the formatting mask. Excel sees `023456789` and auto-converts to the number `23456789` — dropping the leading zero. In the database, `23456789` and `023456789` are different strings representing the same person. Duplicate detection based on CPF fails.

**Why it happens:** Excel auto-formats cells starting with `0` as numbers if no explicit text format was set. The event platform may not enforce text cell format on CPF columns.

**Consequences:** Every CPF starting with 0 (roughly 10% of CPFs) is corrupted. Upsert deduplication breaks. Compliance checks fail.

**Prevention:**
```javascript
function normalizeCPF(raw) {
  if (raw === null || raw === undefined) return null;
  // Convert number to string, pad to 11 digits
  const digits = String(raw).replace(/\D/g, '').padStart(11, '0');
  if (digits.length !== 11) return null; // Invalid
  // Validate mod-11 checksum
  return digits; // Store normalized, without formatting
}
```

Store CPF as a plain 11-character string (no dots/dashes) in the database. Apply normalization before any uniqueness check.

---

### Pitfall 9: Phone Numbers — Brazilian Formats Are Many

**What goes wrong:** A single spreadsheet may contain all of these for the same country:
- `(11) 99999-9999` (mobile, formatted)
- `11999999999` (mobile, raw)
- `+5511999999999` (mobile, E.164)
- `(11) 3333-3333` (landline, 8-digit)
- `11 3333-3333` (landline, no parens)
- `9999-9999` (local, no DDD)

If you try to use phone number as a uniqueness key or deduplicate by it, you will fail. Two entries for the same person will match zero columns.

**Prevention:** Normalize phone numbers on import using a consistent rule:
1. Strip all non-digits.
2. If starts with `55` and length is 12 or 13, strip the `55`.
3. If 11 digits and 3rd digit is `9`, it's mobile (DDD + 9 + 8 digits).
4. If 10 digits, it's landline (DDD + 8 digits).
5. Reject anything outside 10–11 digits after stripping `55`.
6. Store as E.164 without `+`: `5511999999999`.

Never use phone as a unique key for deduplication. Use email + CPF as the composite key.

---

### Pitfall 10: Re-import Duplicate Detection — Wrong Key Choice

**What goes wrong:** Using `nome` (name) as the conflict key for upserts. Two participants named "José Silva" exist at every large conference. Both get merged into one record on re-import.

**Why it happens:** Developers reach for the most human-readable field as the natural key. Name uniqueness is a false assumption for any event with 200+ participants.

**Consequences:** Participant records overwrite each other. Attendance counts are wrong. Ticket assignments are corrupted.

**The safe upsert strategy:**

Use a composite key of `(email, edition_id)` as the conflict target. Rules:
1. If email is present and non-empty → `upsert ON CONFLICT (email, edition_id) DO UPDATE SET ...`
2. If email is blank → treat as INSERT only, no conflict resolution (event platforms sometimes omit email for certain ticket types)
3. Never allow an empty string to be treated as a valid unique key — normalize empty strings to `NULL` before upsert

```sql
-- Supabase migration
ALTER TABLE participants 
  ADD CONSTRAINT participants_email_edition_unique 
  UNIQUE (email, edition_id)
  WHERE email IS NOT NULL;
```

For re-imports of the same edition, use `ignoreDuplicates: false` with Supabase `.upsert()` and specify `onConflict: 'email,edition_id'`. This updates existing rows (name change, company update, ticket upgrade) without creating duplicates.

**Sources:** [Supabase upsert docs](https://supabase.com/docs/reference/dart/upsert), [PostgREST ON CONFLICT discussion](https://github.com/orgs/supabase/discussions/18503)

---

### Pitfall 11: Encoding — UTF-8 vs Windows-1252 for Accented Characters

**What goes wrong:** An admin exports the spreadsheet on Windows with Brazilian locale. Old XLS files (BIFF8 format) use Windows-1252 / CP1252 encoding. The character `ã` (U+00E3) is `0xE3` in CP1252 but `0xC3 0xA3` in UTF-8. If the parser reads a CP1252 file as UTF-8, "São Paulo" becomes "S�o Paulo" in the database.

**Why it happens:** SheetJS detects encoding for XLSX (XML with encoding declaration) but for XLS (binary BIFF), it defaults to the `codepage` option. If no codepage is specified, garbled output results.

**Consequences:** Broken names and company names in the database. Search and filtering fail for Portuguese names. The admin sees "garbage" in the dashboard.

**Prevention:**
- Accept only `.xlsx` (not `.xls`) to avoid legacy encoding issues entirely. XLSX is UTF-8 XML internally.
- If `.xls` must be supported: `XLSX.read(buffer, { type: 'buffer', codepage: 1252 })` for Brazilian Windows exports.
- Validate that common Brazilian chars (á, ã, ç, é, ê, í, ó, ô, ú) appear correctly in at least one parsed row before committing the import.

---

### Pitfall 12: Form Response Columns — Dynamic and Unpredictable

**What goes wrong:** The event platform appends custom form question columns to the right of fixed columns. The column count varies by event edition. "How did you hear about ABVCAP?" exists in 2024 but not 2023. A parser that expects exactly N columns breaks when N+1 columns appear. A parser that uses column index (e.g., `row[7]`) instead of column name breaks immediately when a column is inserted.

**Prevention:**
- Always map by column header name, never by index position.
- Define a schema of `REQUIRED_COLUMNS` and `OPTIONAL_COLUMNS`.
- Any column not in either set → store in a `form_responses JSONB` column keyed by the original header name.
- This means form response columns are future-proof without schema migrations.

```javascript
const REQUIRED_COLUMNS = ['Nome', 'E-mail', 'Empresa', 'Tipo de Ingresso'];
const OPTIONAL_COLUMNS = ['CPF', 'Telefone', 'Valor', 'Data de Compra'];

function categorizeColumns(headers) {
  const required = {};
  const optional = {};
  const extra = {};
  headers.forEach(h => {
    if (REQUIRED_COLUMNS.includes(h)) required[h] = h;
    else if (OPTIONAL_COLUMNS.includes(h)) optional[h] = h;
    else extra[h] = h; // Goes to form_responses JSONB
  });
  return { required, optional, extra };
}
```

---

## Minor Pitfalls

Friction points that affect reliability but are recoverable.

---

### Pitfall 13: Supabase Edge Function Memory and Timeout Limits

**What goes wrong:** A large import file (1000+ participants, many form columns) is sent directly to a Supabase Edge Function. The function loads the entire file buffer into memory to parse it with SheetJS, hits the 256MB memory limit, and crashes with EF005.

**Exact limits (confirmed from official Supabase docs):**
- Maximum memory: 256 MB
- Maximum CPU time: 2 seconds
- Wall clock limit: 150 seconds (Free plan) / 400 seconds (Pro plan)
- Request idle timeout: 150 seconds (504 returned)

**Prevention:** For a congress import (typically 200–1500 participants), a 1MB–5MB XLSX file is well within limits IF you process it efficiently. The risk comes from naive parsing:
- Stream the upload to Supabase Storage first; parse from a storage URL, not from the request body.
- Process rows in chunks (100 at a time) with `supabase.from('participants').upsert(chunk)`.
- Do not hold all parsed rows in memory simultaneously.
- For Next.js Server Actions: configure `serverActionsBodySizeLimit: '10mb'` in `next.config.js`. Default is 1MB — will fail on any real XLSX.

**Sources:** [Supabase Edge Function limits](https://supabase.com/docs/guides/functions/limits), [Wall clock limit troubleshooting](https://supabase.com/docs/guides/troubleshooting/edge-function-wall-clock-time-limit-reached-Nk38bW)

---

### Pitfall 14: Import Error UX — "All or Nothing" Blocks Valid Data

**What goes wrong:** The import throws on the first bad row and rolls back the entire transaction. The admin uploaded 500 rows, 498 are valid, 2 have malformed CPFs. They see a generic error message with no indication which rows failed or why. They must fix the file and re-upload the whole thing.

**Prevention — two-pass strategy:**

1. **Validation pass:** Parse all rows, validate each one, collect errors with row numbers. Return the full error report to the frontend WITHOUT writing to the database.
2. **Import decision:** If errors exist, show a review screen:
   - "498 rows valid, 2 rows have errors (rows 47, 312)"
   - Option A: "Import 498 valid rows, skip errors" 
   - Option B: "Cancel — I'll fix the file first"
3. **Write pass:** Only execute if admin approves. Wrap in a single Postgres transaction. On transaction failure, rollback and report the database-level error.

```typescript
// API response shape for import validation
type ImportValidationResult = {
  totalRows: number;
  validRows: number;
  errors: Array<{
    row: number;           // 1-indexed (matches Excel row)
    column: string;        // Column name
    value: string;         // What was found
    message: string;       // Human-readable in Portuguese
  }>;
  preview: ParticipantRow[]; // First 5 valid rows for confirmation
}
```

Error messages must be in Portuguese and reference the exact row number as it appears in Excel (account for header offset: row 1 in Excel data = row 2 in file).

**Sources:** [Flatfile import errors guide](https://flatfile.com/blog/the-top-excel-import-errors-and-how-to-fix-them/), [DataFlowMapper analysis](https://dataflowmapper.com/blog/failed-data-import-quantitative-analysis)

---

### Pitfall 15: Whitespace and Invisible Characters in Names/Emails

**What goes wrong:** Copy-paste from a PDF or web form into Excel adds non-breaking spaces (U+00A0), zero-width spaces (U+200B), or trailing/leading spaces. "ana@empresa.com " (with trailing space) and "ana@empresa.com" are treated as different emails. Deduplication fails. Email communications bounce.

**Prevention:** Apply to every string field before storage:
```javascript
function normalizeString(val) {
  if (typeof val !== 'string') return val;
  return val
    .replace(/[ ​‌‍﻿]/g, ' ') // Replace invisible chars with space
    .replace(/\s+/g, ' ')                               // Collapse multiple spaces
    .trim();
}

// For email specifically, also lowercase
function normalizeEmail(val) {
  return normalizeString(val)?.toLowerCase() ?? null;
}
```

---

### Pitfall 16: "Tipo de Ingresso" Values Are Free Text

**What goes wrong:** Ticket type is exported as free text from the event platform. Across two editions, the same ticket might appear as:
- "Sócio ABVCAP"
- "Socio ABVCAP" (no accent)
- "sócio abvcap" (lowercase)
- "Sócio - ABVCAP"
- "Associado ABVCAP"

Filtering participants by ticket type in the dashboard silently excludes variants. Charts comparing editions break.

**Prevention:** Do not attempt to normalize ticket types during import. Store the raw string exactly as it appears. Create a separate `ticket_type_mappings` table where admins can map raw strings to canonical categories (e.g., "Sócio", "Não Sócio", "Patrocinador"). Apply the mapping at query time, not import time. This preserves the original data for audit purposes.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Parser setup | Merged headers + extra rows | Implement header auto-detection before any other logic |
| Date handling | Excel serial → wrong day | Use `cellDates: false` + manual UTC conversion from day one |
| Currency parsing | BRL format → truncated values | Implement `parseBRLCurrency()` in parser, validate range |
| CPF handling | Leading zero loss | Normalize to 11-char string with `padStart(11, '0')` |
| Deduplication | Wrong unique key | Use `(email, edition_id)` with partial unique index |
| Re-import | Overwriting valid data | Validate edition_id scope — never let an import touch another edition |
| Error UX | Silent failures | Two-pass validation before write; row-level error report |
| File security | Malicious XLSX | Magic byte check + size limit before parsing |
| Serverless limits | Memory crash on large files | Chunk inserts to 100 rows; configure body size limit |
| Ticket types | Free-text inconsistency | Store raw, map to canonical at query time |
| Phone as key | Dedup failure | Never use phone as unique key; normalize to E.164 for display only |

---

## Sources

- [SheetJS parse options](https://docs.sheetjs.com/docs/api/parse-options/)
- [SheetJS dates documentation](https://docs.sheetjs.com/docs/csf/features/dates/)
- [SheetJS merged cells](https://docs.sheetjs.com/docs/csf/features/merges/)
- [SheetJS blank rows issue #1078](https://github.com/SheetJS/sheetjs/issues/1078)
- [SheetJS date timezone issue #1804](https://github.com/SheetJS/sheetjs/issues/1804)
- [SheetJS formula injection issue #1417](https://github.com/SheetJS/sheetjs/issues/1417)
- [ExcelJS merged cells performance issue #2689](https://github.com/exceljs/exceljs/issues/2689)
- [Supabase Edge Function limits](https://supabase.com/docs/guides/functions/limits)
- [Supabase wall clock troubleshooting](https://supabase.com/docs/guides/troubleshooting/edge-function-wall-clock-time-limit-reached-Nk38bW)
- [Supabase upsert with onConflict](https://supabase.com/docs/reference/dart/upsert)
- [CVE-2024-45293: XXE in XLSX reader](https://github.com/advisories/GHSA-6hwr-6v2f-3m88)
- [OWASP unrestricted file upload](https://owasp.org/www-community/vulnerabilities/Unrestricted_File_Upload)
- [PortSwigger: file upload attacks](https://portswigger.net/web-security/file-upload)
- [HackTricks: formula/CSV injection](https://book.hacktricks.xyz/pentesting-web/formula-csv-doc-latex-ghostscript-injection)
- [CyberChief: CSV injection prevention 2024](https://www.cyberchief.ai/2024/09/csv-formula-injection-attacks.html)
- [Freeformatter: Brazil standards](https://www.freeformatter.com/brazil-standards-code-snippets.html)
- [Flatfile: top Excel import errors](https://flatfile.com/blog/the-top-excel-import-errors-and-how-to-fix-them/)
- [DataFlowMapper: import failure analysis](https://dataflowmapper.com/blog/failed-data-import-quantitative-analysis)
- [Integrate.io: Excel import errors](https://www.integrate.io/blog/excel-import-errors-heres-how-to-fix-them-fast/)
- [ATLASSC: parsing Excel dates in Node.js](https://atlassc.net/2024/04/03/parsing-excel-dates-with-node-js-xlsx-library)
