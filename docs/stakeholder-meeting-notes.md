# Stakeholder Meeting Notes: Webex Call with Dean of Students / Retriever Essentials

Source: Webex transcript of a class-wide call (many student teams asked questions; the course instructor hosted alongside the client). Mid-September 2026. Titles were not stated in the transcript and should be confirmed before use in formal documents.

## Who's who

- **Jacob "Jake" Diaz:** leads the Dean of Students portfolio, new to UMBC. The final stakeholder. Wants a data dashboard that reflects impact.
- **Michael Berardi:** Retriever Essentials (basic needs hub). Submitted the original problem statement and is the day-to-day stakeholder. Offered to provide sample data.
- **Lesa Goodhue:** Dean of Students colleague (student engagement and belonging side). Knows engagement data systems.
- **Dr. Samit:** course instructor.
- Others mentioned: the director of Essential Needs and Connections, the head of the Retriever CARE Center, the religious and spiritual life center, Mary Ellen (has a grant to build her own dashboard on student engagement versus retention and graduation).

## Scope widened beyond Retriever Essentials

- The submitted statement is about Retriever Essentials but also talks about bringing the whole Dean of Students portfolio together. The client described a single dashboard where all units under the Dean of Students submit data.
- The scope is still being negotiated based on what is feasible in one semester. Retriever Essentials is a priority, and Jake said that focusing on Retriever Essentials alone is fine.
- Dean of Students portfolio: (1) student experience, engagement, and belonging; (2) student support and life challenges (Essential Needs and Connections, Retriever CARE); (3) Student Conduct and Community Standards; (4) religious and spiritual life.

## What the client wants

- A dashboard that easily shows the good work being done and where to improve, so busy people can "get it in a nutshell". It should also support a business case for requesting more resources.
- Snapshot views by department or demographic.
- Example metrics: student organization involvement over time, popular event programs, whether involved students graduate at a higher rate, and for Retriever Essentials: pounds of food distributed, visits, and members served.
- Pantry figures shown live (Pantrysoft, Aug 1 to mid-September): about 13,000 lbs distributed, about $38,000 estimated value, about 2,000 visits for food, and 99 clothing items via 64 visits. Verify exact figures with Michael before quoting.

## Key decision: batch uploads, not real-time

- Michael said real-time automated pulling from all the different systems would be incredibly challenging and is not possible in this project.
- Recommended approach: each department exports a standardized CSV/Excel file and uploads it on a schedule (weekly or monthly). Today only yearly reports exist, so this is a big improvement.
- A discovery process with each department is needed: what data they have, how it is captured, and whether it can be exported to one unified file type. Focus on the most important data points.
- Teams offered to supply a CSV/Excel template for offices to fill in. Creating sample data is fine.

## Data sources named (all separate and manual)

Pantrysoft (Retriever Essentials, exports CSV/Excel), Retriever CARE team software, MyUMBC (event attendance and organization involvement), the new student organization platform, Qualtrics, Blackboard, Google Drive, Microsoft OneDrive, Tableau, and many Excel/CSV files. PeopleSoft holds university-wide demographics and graduation data. It is restricted, and most staff only get aggregated data.

## Privacy and security

- FERPA-type concerns. Retriever CARE data is especially sensitive.
- Aggregated data is preferred, and the dashboard should avoid exposing individual student records.

## Technical and hosting hints

- The client does not know where UMBC would host it. The instructor said to host on localhost initially, with deployment decisions at the end. A container (Docker) was suggested so it is easy to deploy anywhere.
- UMBC gold and black branding is welcome.

## Open items

- Jake's homework: define the questions the dashboard should answer and list the types of data he wants to see.
- Michael to provide sample data (rows, columns, fields) for Retriever Essentials.
- Teams asked for the org chart, concrete metrics, example dashboards, and possibly separate discovery meetings with each office.
- Caution from Lesa: do not go too far into engagement versus retention and graduation, since Mary Ellen's grant-funded dashboard covers that.
- Next meeting date was not stated.

## Implications for our project

1. Replace "real-time" with "refreshed on each scheduled batch upload" in goals, requirements, and the tech stack.
2. Make the CSV/Excel import pipeline and template validation the core feature.
3. Design the data model to be department-extensible (Office, Data Source, Upload Batch, Metrics).
4. RBAC and aggregated-only views by default. No direct PeopleSoft integration. Student-level data is optional and limited.
5. Requirements are still being clarified by the client, so treat current documents as a rough overview.
