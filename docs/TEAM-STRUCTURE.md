# Team Responsibilities & Core Features Structure

This document outlines the core development team (CoreWe-5), their areas of ownership within the Edu51Portal project, and how their respective features work along with file locations.

---

## Jahid
**Focus Areas:** Alumni Hub & Mentorship, AI Assistant

### 1. Alumni Hub & Mentorship
*   **How it works:** A dedicated directory for students to find and connect with verified alumni. Alumni can edit their profiles, list their skills, and accept mentorship requests via an in-app chat flow or social links. Approvals are gated by admins.
*   **Key Files:**
    *   `src/components/Alumni/AlumniDirectoryPage.tsx` - Search and filter directory.
    *   `src/components/Alumni/AlumniFilter.tsx` - Directory filters (major, availability, tags).
    *   `src/hooks/useAlumni.ts` - Data hook for fetching alumni.
    *   `src/components/Alumni/pages/AlumniProfilePage.tsx` - Alumni self-editing screen.
    *   `src/lib/api/mentorshipApi.ts` - Connections & mentorship suggestions API.

### 2. AI Assistant
*   **How it works:** A floating chat widget in the bottom-right corner powered by Gemini's free tier. It helps students navigate the platform and answers general academic queries. Features robust rate limiting (20 msgs/day per user) and JWT verification via a Supabase Edge Function to protect API quota.
*   **Key Files:**
    *   `src/components/AIAssistant/AIAssistant.tsx` - Chat widget UI and state.
    *   `src/lib/api/aiChatApi.ts` - Client API wrapper for invoking the Edge Function.
    *   `supabase/functions/ai-chat/index.ts` - Serverless backend handling Gemini integration.

---

## Asif
**Focus Areas:** Team Building Infrastructure, User Profiles

### 1. User Profiles (Social)
*   **How it works:** Provides all the personalized information for users including their avatar, education background, professional experiences, and skills. Leverages Supabase storage for images.
*   **Key Files:**
    *   `src/components/Profile/ProfilePage.tsx` - Main profile display.
    *   `src/components/Profile/EditBasicInfoModal.tsx`, `EducationSection.tsx`, `ExperienceSection.tsx`
    *   `src/components/Profile/SkillsEditor.tsx` - Skill tags management.
    *   `src/lib/api/profileApi.ts` - Supabase CRUD operations for profiles.

### 2. Team Building & Collaboration
*   **How it works:** Features a fully-fledged team collaboration suite. Users can discover, create, and join teams. Inside a team, members have real-time Chat, a Kanban Tasks Board (drag-and-drop), and secure File Sharing.
*   **Key Files:**
    *   `src/components/Teams/TeamsPage.tsx` / `TeamPage.tsx` - Main team layouts.
    *   `src/components/Teams/TeamChat.tsx` / `src/lib/api/chatApi.ts` - Real-time member chat with emoji reactions.
    *   `src/components/Teams/TeamTasksBoard.tsx` - Kanban board linked via realtime channels.
    *   `src/components/Teams/TeamFiles.tsx` / `src/lib/api/filesApi.ts` - In-team and public file sharing.

---

## Sara
**Focus Areas:** Testing, Network, Notifications, Footer Interactions

### 1. Testing
*   **How it works:** Platform-wide quality assurance, verifying UI logic, component renders, network states, and role-based access.

### 2. Network (Connections)
*   **How it works:** Manages peer-to-peer student connections, pending requests, and discoverability.
*   **Key Files:**
    *   `src/components/Network/NetworkPage.tsx` - Network dashboard (Connections, Requests, Discover tabs).
    *   `src/components/Network/UserCard.tsx` - Individual network user card display.
    *   `src/lib/api/connectionsApi.ts` - Network actions (send, approve, reject).

### 3. Notifications (Push & Email)
*   **How it works:** Robust notification system. Push notifications utilize service workers (`sw.js`) and VAPID. Emails are dispatched via transactional edge functions for broadcast updates, exam reminders, and specific user mentions.
*   **Key Files:**
    *   `src/lib/api/notificationsApi.ts` / `src/lib/pushNotifications.ts` - In-app messages and push helpers.
    *   `src/lib/emailNotifications.ts` / `src/lib/emailTemplates.ts` - Email handlers and markup.
    *   `supabase/functions/send-push-notification/` - Subscriptions handler.
    *   `public/sw.js` - Service worker for receiving background push events.

### 4. Footer (Send Feedback & Setup)
*   **How it works:** Ensures users can effectively contact admins or report bugs.
*   **Key Files:**
    *   `src/App.tsx` - Contains Footer linking.
    *   `src/components/FeedbackModal.tsx` - The feedback submission form.
    *   `src/lib/api/feedbackApi.ts` - API layer communicating with the feedback table.

---

## Nila
**Focus Areas:** UI / Layout, Study Resources, Custom Routine, Search

### 1. Unified Interface & Footer
*   **How it works:** Ensuring design consistency (fonts, coloring, components) across all models, implementing responsive design patterns (like dark mode styling) and ensuring layout fluidity in the global App UI including Footer elements (Team Meet, Legal).

### 2. Shared Resources (Team File Sharing)
*   **How it works:** A dedicated global page showing files that have been made public by various teams and alumni across the platform. Users can search and filter by file type (PDF, Doc, Sheet, Image), and preview or download items.
*   **Key Files:**
    *   `src/components/Teams/PublicFilesPage.tsx` - The main Shared Resources grid view.
    *   `src/components/Teams/TeamFiles.tsx` - Team-sided upload and visibility toggling.
    *   `src/lib/api/filesApi.ts` - File listing API (`listPublicFiles`) and Supabase storage wrappers.

### 3. Custom Routine
*   **How it works:** A flexible schedule manager (dual-view mode). On desktop, it features a gradient-wrapped weekly grid planner. On mobile, it acts as a day-switcher pill layout. Data is persisted to `localStorage`/`user_routines` table.
*   **Key Files:**
    *   `src/components/Student/CustomRoutine.tsx` - Interactive schedule manager.

### 4. Search
*   **How it works:** Global platform search mechanism for indexing courses, profiles, or public files.
*   **Key Files:**
    *   `src/components/Search/` - Entire search component directory.

---

## Swapnil
**Focus Areas:** Landing Page, Admin Panel, UI Polishing

### 1. Landing Page (Auth & Entry)
*   **How it works:** Controls the first impressions. Manages authentication modals, the animated major card selections, and session redirections across the `App.tsx` shell.
*   **Key Files:**
    *   `src/components/Student/IntakeView.tsx` - Platform home view post-login.
    *   `src/components/ui/MajorCardStack.tsx` - Animated fan/stack for department selection.
    *   `src/components/SignInModal.tsx`, `SignUpModal.tsx` - Security gates.

### 2. Admin Panel & Dashboard
*   **How it works:** Highly secured section for managing users, tracking live system metrics (Storage, active teams), creating notices, uploading materials with drag-and-drop queues, and approving alumni requests.
*   **Key Files:**
    *   `src/components/Admin/AdminDashboard.tsx` - Command center (Stat cards, Broadcast composer, user moderation).
    *   `src/components/Admin/MaterialManager.tsx` - Google Drive backend manipulation suite.
    *   `src/components/Admin/AdminDrivePanel.tsx` / `src/components/Admin/FileUpload.tsx` - Uploading resources.
    *   `src/lib/api/adminApi.ts` - Protected queries utilizing `is_app_admin()` RLS restrictions.

### 3. Polish & Optimization
*   **How it works:** Refines the look and feel (framer-motion transitions, lazy loading of Heavy components). Ensures strict security headers (`vercel.json`) and handles banner state deployments for announcements.
