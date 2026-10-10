# Edu51Portal
**CSE 400: Software Development Project I/II/III/IV**

**SUBMITTED BY**
*   **Jahidul Nishat** (Alumni + AI System)
*   **Asif** (Team + Profile Network)
*   **Sara** (Testing + Network + Notification Infrastructure)
*   **Nila** (UI/UX + Shared Resources + Routine Tools)
*   **Md. Miftahur Rahman Swapnil** (Landing Page + Admin + System Polishing)
*(CoreWe-5)*

**SUPERVISED BY:**
*(Supervisor Name)*
Lecturer,
Department of CSE

**DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING**  
**BANGLADESH UNIVERSITY OF BUSINESS AND TECHNOLOGY (BUBT)**  
*(Date)*

---

## Abstract
Edu51Portal is a comprehensive, multi-tenant learning and social operating system designed specifically for the students and alumni of the BUBT CSE department (Intake 51). The system aims to bridge the gap between academic resources, peer collaboration, and alumni mentorship. By seamlessly integrating Google Drive study materials, a tailored smart routine generator, real-time team collaboration kanban boards, and a centralized notice board, it solves the fragmentation of academic workflows. Furthermore, it incorporates an AI Assistant powered by Gemini for 24/7 navigation and academic support. 

---

## Table of Contents
*   **Abstract**
*   **Chapter: 1 | Introduction**
    *   1.1. Problem Specification/Statement
    *   1.2. Objectives
    *   1.3. Scope 
    *   1.4. Organization Of Project Report
*   **Chapter: 2 | Background**
    *   2.1. Existing System Analysis
    *   2.2. Supporting Literatures
*   **Chapter: 3 | System Analysis & Design**
    *   3.1. Technology & Tools
    *   3.2. Model & Diagram (System Architecture, DFD, Schema, Flowchart)
*   **Chapter: 4 | Implementation**
    *   4.1. Interface Design/Front-End
    *   4.2. Back-End
    *   4.3. Modules/Features
*   **Chapter: 5 | User Manual**
    *   5.1. System Requirement
    *   5.2. User Interfaces
    *   5.3. Login Credentials
*   **Chapter: 6 | Conclusion**
    *   6.1. Conclusion
    *   6.2. Limitation
    *   6.3. Future Works
*   **References**

---

## Chapter 1: INTRODUCTION

### 1.1 Problem Specification/Statement
Students frequently struggle with disjointed educational resources. Exam routines are scattered across various social media groups, study materials are difficult to locate, and reaching out to alumni for professional mentorship involves navigating fragmented platforms. There is no centralized ecosystem that combines academic necessities with professional peer-to-peer networking tailored for a specific intake.

### 1.2 Objectives
*   Develop a centralized hub for organizing and navigating Google Drive-backed course materials.
*   Implement a robust real-time team collaboration space supporting team chat, Kanban task boards, and file sharing.
*   Create an Alumni Mentorship network where current students can easily discover and connect with verified alumni.
*   Automate notifications and broadcast emails for class schedules, exams, and announcements.
*   Provide 24/7 AI-powered assistance for general queries and platform navigation.

### 1.3 Scope
The scope of Edu51Portal encompasses development of a web-based responsive SaaS portal serving BUBT Intake 51. The system features a public-facing landing area, secure user authentication, role-based access control (Student, Alumni, Admin), personal customized routines, global search mechanisms, and secure backend operations (including real-time database syncing, Edge Functions, and external cloud integrations). 

### 1.4 Organization Of Project Report
*   **Chapter 1 (Introduction):** Defines the purpose, scope, and objectives.
*   **Chapter 2 (Background):** Analyzes existing systems and reviews the literature and technologies applicable.
*   **Chapter 3 (System Analysis & Design):** Details the tools, methodologies, architectures, and database design.
*   **Chapter 4 (Implementation):** Covers the core front-end and back-end developments.
*   **Chapter 5 (User Manual):** Offers hardware/software requirements and UI interactions.
*   **Chapter 6 (Conclusion):** Summarizes findings, limitations, and potential future upgrades.

---

## Chapter 2: BACKGROUND

### 2.1 Existing System Analysis
Current solutions generally include Messenger groups and fragmented online drives. These systems lack indexability, structured file sharing, and automated moderation. While Facebook groups serve notifications, they cause distractions and bury crucial study files. Our system brings all features into a unified, distraction-free environment.

### 2.2 Supporting Literatures
To tackle real-time synchronization, we employ WebSockets (via Supabase Real-time) to ensure instantaneous interactions (like team chat and kanban drags). We adopt React's modular component structure to enable high refactorability, while TailwindCSS affords us atomic utility capabilities required for rapidly prototyping standard and dark-mode themes.

---

## Chapter 3: SYSTEM ANALYSIS & DESIGN

### 3.1 Technology & Tools
*   **Frontend Library:** React.js (TypeScript) + Vite
*   **Styling:** Tailwind CSS, daisyUI, Framer Motion
*   **Backend as a Service:** Supabase (PostgreSQL database, Auth, Storage, Edge Functions)
*   **Third-Party APIs:** Google Drive REST API, Gemini AI (Virtual Assistant)
*   **Infrastructure:** Vercel Hosting

### 3.2 Model & Diagram

**3.2.1 SDLC Model (Agile Incremental Model)**
The development of Edu51Portal followed an Agile Incremental Methodology structured into continuous two-week iterative sprints. This approach ensured that usable segments of the system were delivered and evaluated continuously, allowing the project to adapt to changing requirements from students and faculty. The specific sprints progressed logically: Foundation & Schema -> Academic Tools -> Collaboration & Team Spaces -> Alumni Hub & Gemini AI -> Administrative Hardening & Security Audit. 

Aligning with the 7-stage Agile lifecycle (Figure 3.1), our process was executed as follows:
1. **Requirement & Analysis:** We gathered initial pain points from BUBT students regarding fragmented study materials, routine tracking, and missing alumni networking.
2. **Design:** We prototyped UI/UX utilizing Figma and mapped out the database schema for Supabase (Auth, Profiles, and Roles).
3. **Implementation:** Coding the front-end components with React/Tailwind and spinning up backend Edge Functions (e.g., Push Notifications, Gemini connections).
4. **Testing:** Each increment underwent QA testing for bugs, mobile responsiveness, and Role-Level Security (RLS) policies to ensure normal users couldn't access admin privileges.
5. **Development (Iterative Refinement):** Feedback from tests pushed the code into iterative refinements, such as fixing rate-limits for the AI or optimizing Kanban drag-and-drop state.
6. **Maintenance:** Observing real-time database loads and optimizing Google Drive API fetching speed for materials. 
7. **Launch:** Seamlessly deploying the increment to the live Vercel production environment after passing all sprint checks, before looping back to step 1 for the next feature.

**3.2.2 System Architecture**
The React/Vite front-end orchestrates view interactions independently and dispatches API calls to Supabase. Supabase acts as our proxy and DB, handling Row Level Security (RLS) definitions to enforce isolation between normal user requests and Admin-level writes.

**3.2.3 Use Case Diagram**
*(To be inserted here: A diagram displaying the "Student", "Alumni", and "Admin" actors interacting with subsystems like Join Team, Setup Drive config, and Approve Alumni.)*

**3.2.4 Context Level Diagram**
*(To be inserted here: Diagram showing the Edu51Portal Central System pointing outwards to Google Drive API, Gemini AI Server, and end-user browsers.)*

**3.2.5 Data Flow Diagram**
*(To be inserted here: DFD Level 0 & Level 1 models.)*

**3.2.6 Database Schema**
The PostgreSQL relational schema centers around the `profiles` table. Significant mappings include:
*   `profiles` -> (1:N) -> `teams`, `team_members`, `connections`
*   `teams` -> (1:N) -> `team_messages`, `team_tasks`, `team_files`

**3.2.7 Algorithms/Flowchart**
*   **Routine Conflict Algorithm:** Prevents a student from plotting overlapping classes.
*   **Alumni Suggestion Flow:** Connects students dynamically to alumni using vector/major overlapping methodologies.

---

## Chapter 4: IMPLEMENTATION

### 4.1 Interface Design/Front-End
Our front-end utilizes a custom routing state model. We used `framer-motion` to implement glassmorphism transitions, floating navigation pills, and dynamic UI feedback components. Code splitting via `manualChunks` in Vite ensures rapid initial page loads.

### 4.2 Back-End
We deployed edge functions (`supabase/functions`) for administrative and secure tasks that bypass user constraints, these include:
*   `send-push-notification`: Triggering push alerts to web clients.
*   `admin-delete-user`: Cascading user sanitizations securely.
*   `ai-chat`: Acts as a secure proxy to the Gemini API monitoring a 30-msg/day limit.

### 4.3 Modules
1.  **Authentication & Profiles:** Multi-layered auth ensuring regular role partitioning.
2.  **Study Materials:** Uses OAuth + GDrive browsing.
3.  **Teams Collaboration:** Realtime task boards, chat channels, and sharing.
4.  **Alumni Hub:** Direct search catalog bridging graduates.
5.  **Smart Routine:** Dynamic local planner displaying hourly views.
6.  **AI Assistant Widget:** A Gemini-backed portal widget assisting directly inside the app.

---

## Chapter 5: USER MANUAL

### 5.1 System Requirement
**5.1.1 Hardware Requirement**
*   Internet-connected device with minimum 2GB RAM.

**5.1.2 Software Requirement**
*   Modern Chromium/Webkit based browser (Chrome, Safari).

### 5.2 User Interfaces
*   **Landing Dashboard:** Allows a user to login.
*   **Department Card Stack:** Lets users pick their engineering or arts department.
*   **Admin Dashboard:** Exclusive panel featuring material management.
*   **Team Kanban Board:** Workspace where users update global statuses.
*(Note: Attach screenshots in this section of the actual submission).*

### 5.3 Login Credentials
Registration is open via Google / Email Auth flows conditionally requiring Admin Approval for Alumni.

---

## Chapter 6: CONCLUSION

### 6.1 Conclusion
The Edu51Portal achieves its purpose of bridging BUBT departmental communications and reducing digital fragmentation. By consolidating notices, course resources, peer connections, and alumni advice via a reliable cloud-synchronized PWA, we've enabled our batchmates to focus exclusively on academics and teamwork.

### 6.2 Limitation
*   The free tier of Gemini AI limits daily generative chats.
*   Native mobile app is not provided; reliant entirely on Web Push standards.

### 6.3 Future Works
*   Integrate Canvas or Moodle compatibility layers.
*   Expand the custom routine generator to apply automated AI sorting.
*   Extend the alumni mentorship to feature in-app Zoom or Meet scheduling.

---

## References
1.  React Documentation, Meta Platforms, inc. https://react.dev/
2.  Supabase, "Postgres Realtime & Row Level Security", https://supabase.com/docs
3.  Tailwind Labs, "Tailwind CSS", https://tailwindcss.com/
