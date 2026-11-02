# Demo CSV files

Made-up data. Start from **Testing > Reset to sample data** (52 weeks, Oct 13, 2025 to Oct 5, 2026), then upload in order. CSV files open in Excel if you want to show what is inside.

Two numbers change as you upload:

- **All-time visits**: what the gold note on the Upload data tab reports, and what the dashboard shows after clicking **All time**.
- **Last-12-week visits**: what the dashboard cards show by default. The window ends at the latest uploaded week, so it moves forward when a newer week arrives. Files 04 and 05 add weeks from 2025, which are older than the window, so only the all-time number changes.

Starting point after a reset: **8,325** all-time visits; last 12 weeks (Jul 20 to Oct 5, 2026) **2,184** visits, +595 (+37%) vs the previous 12 weeks.

Uploading every file in this order:

| File | What it shows | Result | All-time visits after | Last-12-week visits after |
|---|---|---|---|---|
| 01_week_of_oct_12_2026.csv | Weekly upload (1 row) | Saved | 8,561 | 2,333 (Jul 27 to Oct 12) |
| 02_week_of_oct_19_2026.csv | Weekly upload | Saved | 8,823 | 2,513 (Aug 3 to Oct 19) |
| 03_week_of_oct_26_2026.csv | Weekly upload | Saved | 9,114 | 2,650 (Aug 10 to Oct 26) |
| 04_month_of_sep_2025.csv | Monthly upload (5 weeks), backfills older history | Saved | 10,131 | 2,650 (unchanged) |
| 05_month_of_aug_2025.csv | Monthly upload with Title Case headers, MM/DD/YYYY dates and an extra Notes column | Saved | 10,557 | 2,650 (unchanged) |
| 06_has_mistakes.csv | 6 problems: bad date, negative and decimal visits, wrong office, missing pounds, duplicate week | Nothing saved | 10,557 | 2,650 (unchanged) |
| 07_correction_week_of_oct_12_2026.csv | Re-uploads Oct 12 with corrected numbers | Asks to replace; after Replace | 10,569 | 2,662 |

The shorter path in [DEMO_SCRIPT.md](../DEMO_SCRIPT.md) uses only 01, 04, 06 and 07: all-time visits go 8,325 → 8,561 → 9,578 → 9,578 → 9,590, and last-12-week visits go 2,184 → 2,333 → 2,333 → 2,333 → 2,345.
