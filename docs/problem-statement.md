# CMSC 447 Semester Project: Problem Statement

**Project:** Problem Statement #3, Retriever Essentials: Basic Needs Impact Dashboard
**Client:** Retriever Essentials, UMBC's basic needs hub, housed under the Dean of Students Office. It works closely with Retriever CARE.

## Team

- Anees Khalil
- Faseeh Imtiaz (Scrum Master)
- Soufiane

## Verbatim problem statement

> Retriever Essentials is UMBC's basic needs hub; we work to ensure all members of the UMBC community have access to meet their basic needs. We are housed under The Dean of Students Office and work closely with teams like Retriever CARE. There are several offices doing important work that are currently operating in silos and we don't have a centralized dashboard to understand the impact of our collective work. To solve this, we are hoping to build a secure, Basic Needs Impact Dashboard that aggregates multi-source data, replaces manual spreadsheet tracking, and safeguards sensitive student information through role-based access controls. By unifying quantitative service metrics with qualitative student stories into dynamic, real-time visualizations, this platform will streamline daily operations for staff, break down departmental silos, and provide university leadership with clear, data-driven insights into how basic needs support directly drives student retention and success.

Note: after the client meeting, "real-time" was revised to "refreshed on each scheduled batch upload". See `stakeholder-meeting-notes.md`.

## Key requirements from the statement

- **Problem:** several UMBC offices work in silos, there is no centralized way to see the collective impact of basic-needs work, and tracking is manual (spreadsheets).
- **Solution:** a secure, web-based Basic Needs Impact Dashboard.
- **Core capabilities:**
  1. Aggregate multi-source data from multiple offices.
  2. Replace manual spreadsheet tracking.
  3. Role-based access control (RBAC) to safeguard sensitive student information.
  4. Unify quantitative service metrics with qualitative student stories.
  5. Dynamic visualizations.
- **Intended outcomes:** streamline daily staff operations, break down departmental silos, and give university leadership clear, data-driven insight into how basic-needs support drives student retention and success.
- **Likely user classes:** Retriever Essentials staff, department and office staff (for example Retriever CARE), administrators, and university leadership. Students are the data subjects. The Dean of Students Office is the sponsor.
- **Constraints:** privacy and security of student data (FERPA-style concerns), UMBC-approved technology and hosting, integration with existing departmental data sources, and a one-semester timeline with a team of three.

## Open questions

- Which offices provide data, and in what formats? What services are offered?
- Individual-student-level tracking or aggregated data only?
- Can one student receive multiple services? Can one service be provided by several offices?
- Who may see personally identifiable information (PII), and at what granularity?
- What exactly is a "student story" (format, consent, anonymization)?
- What must university leadership see (KPIs, retention metrics, time ranges)?

## Preliminary conceptual model

Entities: STUDENT, OFFICE, SERVICE (with Office_ID foreign key), SERVICE_USAGE, STAFF_USER, ROLE, STUDENT_STORY.
