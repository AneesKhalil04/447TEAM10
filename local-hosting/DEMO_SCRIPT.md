# Demo script (about 7 minutes)

## Before you present
1. Start Docker Desktop and wait for "Engine running".
2. From the repo folder: `powershell -ExecutionPolicy Bypass -File local-hosting\start_demo.ps1`
   (or follow [DEMO_COMMANDS.md](DEMO_COMMANDS.md) step by step). The browser opens the sign-in page at http://localhost:5173 with the 52 sample weeks loaded.
3. Demo accounts: `admin` / `demo-admin-pass`, `staff` / `demo-staff-pass`, `dean` / `demo-dean-pass`.
4. To start over at any point: sign in as `admin`, **Testing** tab > **Reset to sample data** > Yes.
   Or **Clear everything** to start empty and upload `backend/sample_data/upload_sample.csv` live first.

## 1. The problem (30 sec)
Offices under the Dean of Students track numbers in separate spreadsheets and only produce yearly reports.
This gives them one place to upload weekly or monthly files and see the impact right away.

## 2. Signing in (1 min)
- The site opens on **Sign in**: nothing is visible without an account.
- Sign in as `dean` (leadership): only the **Dashboard** tab. Leadership can look but not change anything.
- **Sign out**, sign in as `staff`: **Upload data** appears, locked to Retriever Essentials.

## 3. Dashboard tab (1.5 min)
- It opens on the **last 12 uploaded weeks**. Summary: "In the last 12 weeks (Jul 20, 2026 to Oct 5, 2026), 2,184 visits served 1,436 students and moved 27,948 lb of food".
- Cards: **2,184 visits / 1,436 students / 27,948 lb**, each with a comparison: visits **+595 (+37%) vs previous 12 weeks**.
  Why the jump: these 12 weeks cover the start of fall semester; the 12 before were mostly summer.
- Charts: 12 readable weeks. Hover a point for the exact numbers.
- Click **All time**: 8,325 visits / 5,469 students / 109,811 lb across all 52 weeks, with no earlier period to compare.
  Then switch **Weekly** to **Monthly** to show the semester pattern (dips over winter and summer breaks).
  Monthly reads best with All time; with 12 weeks the first and last months are only partly included.
- Click **Last 12 weeks** (or **Reset filters**) to go back.
- Only aggregated totals are shown, never individual students.

## 4. Upload data tab, as `staff` (2.5 min)
Files are in `local-hosting/demo_files/` (see its README for every expected number).
The gold note after each upload shows **all-time** totals; the dashboard cards show the **last 12 weeks**.
- Walk through "How uploading works": template, one row per week, upload weekly or monthly.
- **Weekly:** upload `01_week_of_oct_12_2026.csv`. Green "Saved 1 week from 01_week_of_oct_12_2026.csv (Oct 12, 2026)", gold note "All-time totals updated: Visits 8,325 → 8,561", listed in Recent uploads.
  Click **View dashboard**: the 12-week window moves to **Jul 27 to Oct 12, 2026**, visits **2,333 (+832, +55%)**.
- **Monthly:** go back to Upload data and upload `04_month_of_sep_2025.csv` (5 weeks at once). All-time visits 8,561 → 9,578.
  These are older weeks (September 2025), so the 12-week cards do not change. On the dashboard, click **All time** and switch to **Monthly**: September 2025 now appears at the start of the chart.
- **Mistakes:** upload `06_has_mistakes.csv`. Table of 6 problems with row and column. Nothing saved.
- **Correction:** upload `07_correction_week_of_oct_12_2026.csv`. It asks "You already uploaded some of these weeks. Replace them?"
  Click **Replace these weeks**: all-time visits 9,578 → 9,590; on the dashboard, last-12-week visits 2,333 → **2,345**. In Recent uploads, file 01 now says "All weeks replaced by later uploads".
- Optional: `05_month_of_aug_2025.csv` shows messy headers, US dates and an extra Notes column are accepted (all-time visits +426; older weeks, so only All time changes).
- The **By** column in Recent uploads shows `staff` uploaded each file.

## 5. Users tab, as `admin` (1 min)
- **Sign out**, sign in as `admin`: **Users** and **Testing** tabs appear.
- **Add an account**: create a staff user with a temporary password; admins hand out accounts, there is no public sign-up.
- **Reset password** or **Deactivate** on a row: that person is signed out right away.
- **Upload activity**: the audit log shows `staff` uploaded and replaced weeks, with the files involved.

## 6. Wrap-up (30 sec)
- Stack: React + TypeScript, FastAPI, PostgreSQL, Docker; automated tests in CI.
- Next: more offices and services, hosting, final metrics with the client.
