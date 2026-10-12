# Requirements Draft (for the SRS)

Working list drafted from the client Webex meeting (`stakeholder-meeting-notes.md`). This is a starting point for the SRS. The client is still defining the questions the dashboard should answer.

## Functional requirements (MVP, Retriever Essentials pilot)

- **FR1 Upload:** Staff upload a CSV or Excel file that follows a standard template. The system validates columns and types and reports clear row-level errors. A failed upload saves nothing.
- **FR2 Dashboard:** Staff and leadership view charts and summaries (visits, students served, pounds distributed, trends), filtered by date and office.
- **FR3 Login and roles:** Users sign in. Role-based access control limits what each role sees (Retriever Essentials staff, department staff, administrator, leadership).
- Considered but not selected as core: qualitative student stories. They stay in the backlog for a later phase.

## Non-functional requirements (featured)

- **Usability:** understandable at a glance, upload without training, UMBC gold and black styling welcomed.
- **Performance:** a typical upload and dashboard load in a few seconds (proposed target, to confirm with the client).
- **Reliability and data accuracy:** validation prevents bad data, totals are correct, and there are no partial saves.
- **Privacy and security (lighter emphasis):** aggregated by default, RBAC, FERPA-aware.

## Open questions for the client

- The exact questions and metrics the dashboard must answer.
- Which offices and data sources, and which fields (sample data expected from Michael).
- Whether any student-level data is included, or only aggregated data.
- Hosting location, and who does discovery outreach with each office.

## Validation plan

Done: meeting notes turned into a requirements list.
Planned: written confirmation with the client, testing the upload template against the sample data, mockup dashboard feedback, and tracking changes in the backlog with review each sprint. So far there has been only one meeting with the client.
