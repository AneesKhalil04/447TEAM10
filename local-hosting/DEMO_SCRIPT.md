# Demo script (about 5 minutes)

## Before you present
1. Start Docker Desktop and wait for "Engine running".
2. From the repo folder: `powershell -ExecutionPolicy Bypass -File local-hosting\start_demo.ps1`
   (or follow [DEMO_COMMANDS.md](DEMO_COMMANDS.md) step by step). The browser opens http://localhost:5173 with the 52 sample weeks loaded.
3. To start over at any point: **Testing** tab > **Reset to sample data** > Yes.
   Or **Clear everything** to start empty and upload `backend/sample_data/upload_sample.csv` live first.

## 1. The problem (30 sec)
Offices under the Dean of Students track numbers in separate spreadsheets and only produce yearly reports.
This gives them one place to upload weekly or monthly files and see the impact right away.

## 2. Dashboard tab (1.5 min)
- Summary sentence and three cards: 8,325 visits / 5,469 students / 109,811 lb.
- Charts: switch **Weekly** to **Monthly** to show the semester pattern (dips over winter and summer breaks).
- Set From = Aug 17, 2026: cards now compare against the prior period of the same length.
- Only aggregated totals are shown, never individual students.

## 3. Upload data tab (2.5 min)
Files are in `local-hosting/demo_files/` (see its README for expected numbers).
- Walk through "How uploading works": template, one row per week, upload weekly or monthly.
- **Weekly:** upload `01_week_of_oct_12_2026.csv`. Green "Saved 1 week", gold note "Visits 8,325 -> 8,561", listed in Recent uploads.
- **Monthly:** upload `04_month_of_sep_2025.csv` (5 weeks at once). Visits 8,561 -> 9,578.
  Click **View dashboard** and switch to **Monthly**: September 2025 now appears at the start of the chart.
- **Mistakes:** upload `06_has_mistakes.csv`. Table of 6 problems with row and column. Nothing saved.
- **Correction:** upload `07_correction_week_of_oct_12_2026.csv`. It asks "You already uploaded some of these weeks. Replace them?"
  Click **Replace these weeks**: visits 9,578 -> 9,590. In Recent uploads, file 01 now says "All weeks replaced by later uploads".
- Optional: `05_month_of_aug_2025.csv` shows messy headers, US dates and an extra Notes column are accepted.

## 4. Wrap-up (30 sec)
- Stack: React + TypeScript, FastAPI, PostgreSQL, Docker; automated tests in CI.
- Next: login with roles (staff, admin, leadership), more offices, hosting.
