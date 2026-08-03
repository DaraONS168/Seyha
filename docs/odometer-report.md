# Daily Odometer Check — Function Report

**File:** [src/pages/DailyOdometerCheckPage.jsx](src/pages/DailyOdometerCheckPage.jsx#L1-L400)

## សេចក្តីសង្ខេប
- Component exported: `DailyOdometerCheckPage` — React functional component (default export) ម៉ាស៊ីន UI សម្រាប់បំពេញកំណត់ត្រា "Daily Odometer Check" (ចាប់ផ្តើម, បញ្ចប់, ពិនិត្យពេលយប់) និងបង្ហាញប្រវត្តិ។
- ទិន្នន័យរក្សាទុកក្នុង `localStorage` និងអាច Export ជា CSV ដើម្បីសាកល្បង prototype មុនភ្ជាប់ Supabase។

## លក្ខណៈ និង state
- `const [form, setForm] = useState(emptyForm)` — បង្កើត form state ដើម្បីផ្ទុកតម្លៃទំហំ input (date, sales, vehicle, times, odometer, photos, notes)
- `const [rows, setRows] = useState([])` — បញ្ជីកំណត់ត្រាដែលបានរក្សាទុក
- `const [query, setQuery] = useState('')` និង `const [dateFilter, setDateFilter] = useState({ mode: 'all', from: '', to: '' })` — ការស្វែងរក និងញឹកញាប់ filter ថ្ងៃ
- `useEffect(() => setRows(loadRows()), [])` — ផ្ទុក rows ពី `localStorage` នៅលើ mount

## មុខងារ និង Helper functions
- `number(value)` — ការបម្លែងទៅ `Number` និង fallback 0
- `km(value)` — រៀបចំលេខជាស្រទាប់ `123 KM`
- `savedAt(value)` — ផ្ទុក និងរាងពេលដែលបានរក្សាទុក
- `loadRows()` — ដក JSON ពី `localStorage` (key = `seyha_daily_odometer_checks`), ស្ថិតិ fallback ជា `sampleRow()`
- `sampleRow()` — ដាក់ row ตัวอย่าง ដែលប្រើសម្រាប់ UI preview
- `saveRows(rows)` — ធ្វើ `localStorage.setItem`
- `PhotoButton` — component reusable សម្រាប់ upload / view ហើយបញ្ចូល file name
- `OdometerLine` — component សម្រាប់ input time + odometer

## Behavior និង Validation
- ការគណនា totals:
  - `workDistance = Math.max(work_end_odometer - work_start_odometer, 0)`
  - `afterHoursDistance = Math.max(night_check_odometer - work_end_odometer, 0)`
  - `total = workDistance + afterHoursDistance`
- Validation នៅក្នុង `save`:
  - ទាមទារ `form.sales` និង `form.vehicle`
  - បញ្ជាក់ថា `work_end_odometer >= work_start_odometer`
  - បញ្ជាក់ថា `night_check_odometer >= work_end_odometer`
  - ប្រសិនបើ validation ok → រក្សាទុក row ទៅតារាង `rows` និង `localStorage`
- `remove(id)` — លុបកំណត់ត្រា និង sync ទៅ `localStorage`
- `exportCsv()` — បង្កើត CSV string ពី `filteredRows` → Blob → trigger download

## Side effects / External interactions
- `localStorage` key: `seyha_daily_odometer_checks`
- UI notifications: `toast` (sonner)
- Browser download via `URL.createObjectURL` និង `<a>.click()`
- Uses browser `File` inputs for photos but only stores file name (not file content)

## Edge-cases និងកន្លែងដែលគួរតែសង្កេត
- `localStorage` JSON corruption handled (try/catch)
- Time & date: uses string ISO date values; no timezone normalization
- Photo handling: only filename saved — លើកទឹកចិត្តចាំបាច់ផ្ទេរទៅ storage (Supabase / S3) ប្រសិនបើចង់រក្សារូបភាពពិត
- Numeric parsing: relies on `Number()`; consider validation for non-integer / negative inputs
- CSV export: uses `today` constant for filename — ហៅ `form.check_date` ប្រសិនបើចង់មានឈ្មោះពាក់ព័ន្ធកាលបរិច្ឆេទ

## Unit tests suggestions
- Test totals calculation for combinations (work_end < start → 0, night < end → 0)
- Test `save` validation behaviour (missing sales/vehicle, decreasing odometer values)
- Test `loadRows` when `localStorage` is empty / corrupted
- Test `exportCsv` output lines and escaping for quotes
- Test `remove` modifies `rows` and `localStorage`

## Suggested improvements
- Persist to Supabase or backend instead of `localStorage` (use `src/services/dailyReportService.js`)
- Save images to remote storage and store URLs (not only filenames)
- Use controlled numeric input with min/max and step; format large numbers
- Use locale-safe date formatting and timezone handling for `saved_at`
- Add unit tests and E2E test for CSV export & persistence
- Accessibility: improve labels on file inputs and buttons, add `aria` attributes

## Quick reference (important lines)
- Component implementation: [src/pages/DailyOdometerCheckPage.jsx](src/pages/DailyOdometerCheckPage.jsx#L1-L400)
- localStorage key: `seyha_daily_odometer_checks`

---
Report generated from current workspace source on 2026-08-03.
