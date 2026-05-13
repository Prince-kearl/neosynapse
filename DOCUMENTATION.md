# NeoSynapse — Project Documentation

> **Last updated:** 9 May 2026  
> This file is the single source of truth for the NeoSynapse platform. Update it whenever features, workflows, stack decisions, or database schemas change.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Architecture Overview](#3-architecture-overview)
4. [Repository Structure](#4-repository-structure)
5. [Authentication & Role System](#5-authentication--role-system)
6. [Patient App](#6-patient-app)
7. [Professional App](#7-professional-app)
8. [Admin App](#8-admin-app)
9. [Shared Infrastructure](#9-shared-infrastructure)
10. [Supabase Edge Functions](#10-supabase-edge-functions)
11. [Database Schema](#11-database-schema)
12. [Theming & Branding System](#12-theming--branding-system)
13. [Localisation](#13-localisation)
14. [Real-Time & WebRTC](#14-real-time--webrtc)
15. [AI / ML Integrations](#15-ai--ml-integrations)
16. [Security Model (RLS)](#16-security-model-rls)
17. [Environment Variables & Secrets](#17-environment-variables--secrets)
18. [Build, Test & Deploy](#18-build-test--deploy)
19. [Known Limitations & TODOs](#19-known-limitations--todos)
20. [Changelog](#20-changelog)

---

## 1. Project Overview

NeoSynapse is a multi-role healthcare platform designed for use in Ghana. It connects **patients**, **healthcare professionals**, and **platform administrators** in one unified web application.

**Core capabilities:**

| Capability | Description |
|---|---|
| AI Health Assistant | Patients chat with a Gemini-powered medical AI in 5 Ghanaian languages |
| Symptom Triage | Patients describe symptoms and receive structured urgency assessments |
| Telemedicine | Real-time video consultations between patients and professionals via WebRTC |
| Clinical Notes | Professionals create, draft, review, and finalise encounter notes |
| Medical Reports | AI-generated PDF/shareable reports tied to encounters or triage sessions |
| Appointments | Patients book appointments; professionals manage their schedule |
| Medical History | Patients manage structured health records and upload supporting documents |
| Admin Control Panel | Full tenant management: users, invitations, facilities, RLS-compliant audit logs |
| Brand Theming | Admins set a tenant-wide colour palette; all users see it instantly |

---

## 2. Technology Stack

### Frontend

| Technology | Version | Role |
|---|---|---|
| **React** | 18.3.x | UI rendering |
| **TypeScript** | 5.x | Type safety across all modules |
| **Vite** | 5.x | Build tool and dev server |
| **React Router v6** | 6.30.x | Client-side routing with nested route layouts |
| **@tanstack/react-query** | 5.83.x | Server state: caching, mutations, invalidation |
| **Capacitor** (`@capacitor/core`, platforms, plugins) | 8.x | Mobile wrapper runtime for Android/iOS native shells |
| **Tailwind CSS** | 3.x | Utility-first styling |
| **shadcn/ui** (Radix UI) | mixed | Pre-built accessible UI primitives |
| **next-themes** | 0.3.x | Dark / light mode with `class` strategy |
| **lucide-react** | 0.462 | Icon set |
| **Embla Carousel** | 8.x | Hero carousel component |
| **Recharts** | 2.x | Data visualisation (admin dashboard) |
| **React Hook Form + Zod** | 7.x / 3.x | Form state and validation |
| **date-fns** | 3.x | Date formatting and manipulation |
| **react-markdown** | 10.x | Renders AI markdown responses |
| **pdfjs-dist** | 5.x | PDF parsing for uploaded medical documents |
| **mammoth** | 1.12.x | `.docx` text extraction |
| **Tesseract.js** | 7.x | Client-side OCR for image-based medical documents |
| **html2pdf.js** | 0.14 | Export AI reports as downloadable PDFs |
| **Leaflet / react-leaflet** | 1.9 / 4.2 | Map for nearby hospitals on patient dashboard |
| **react-google-maps** | 2.20 | Google Maps integration (optional) |

### Backend

| Technology | Role |
|---|---|
| **Supabase** | Hosted PostgreSQL + Auth + Realtime + Object Storage + Edge Functions |
| **Supabase Auth** | JWT-based authentication; email/password + invite flow |
| **Supabase Realtime** | WebSocket channel subscriptions for WebRTC signalling and live dashboard updates |
| **Supabase Storage** | `medical-history-documents` bucket for patient file uploads |
| **Supabase Edge Functions** | Deno-based serverless compute for AI proxying, invitations, and speech |

### AI Providers

| Provider | Used for |
|---|---|
| **Google AI (Gemini 2.5 Flash)** | Primary: medical chat streaming + symptom triage |
| **ElevenLabs** | Speech-to-text (Scribe v2 model) and text-to-speech (`eleven_multilingual_v2`) |
| **Lovable AI Gateway** | Legacy fallback if `GOOGLE_AI_API_KEY` is not set |

### Testing

| Tool | Role |
|---|---|
| **Vitest** | Unit and integration tests |
| **@testing-library/react** | Component testing helpers |

### Mobile Wrapper (Capacitor)

**Current setup status (2026-04-18):**
- Capacitor initialized with `capacitor.config.ts`.
- Native projects scaffolded in `android/` and `ios/`.
- Build/sync scripts added to `package.json` (`mobile:build`, `mobile:sync`, `mobile:copy`, `mobile:android`, `mobile:ios`, `mobile:run:android`, `mobile:run:ios`).
- Native shell bootstrap wired in `src/mobile/capacitorBootstrap.ts` and called from `src/main.tsx`.

**Configured plugins (installed + synced):**
- `@capacitor/app`
- `@capacitor/browser`
- `@capacitor/device`
- `@capacitor/haptics`
- `@capacitor/keyboard`
- `@capacitor/push-notifications`
- `@capacitor/splash-screen`
- `@capacitor/status-bar`

**Required plugin wiring plan:**
1. **App lifecycle and back navigation**
  - Keep `@capacitor/app` handling in `src/mobile/capacitorBootstrap.ts`.
  - Extend with deep-link handling (`appUrlOpen`) for auth redirects.
2. **Status bar and keyboard ergonomics**
  - Keep `StatusBar` + `Keyboard` setup in `src/mobile/capacitorBootstrap.ts`.
  - Validate against key pages (`AIAssistant`, `SymptomChecker`, `Reports`) for safe insets and keyboard overlap.
3. **Push notifications (production-critical)**
  - Implemented `src/mobile/pushNotifications.ts` to request permissions, register token, and attach listeners.
  - Implemented Supabase persistence via `auth.user_metadata.mobile_push_tokens` (deduped token list with platform/version/timestamp).
  - Remaining setup: configure APNs (iOS) and Firebase Cloud Messaging (Android) credentials for real delivery.
4. **Native browser handoff for external links**
  - Use `@capacitor/browser` for trusted external URLs where in-app context should remain controlled.
5. **Device metadata and diagnostics**
  - Use `@capacitor/device` for environment tagging (platform/app version) in logs/health checks.
6. **Haptics for key interactions**
  - Add subtle haptics only on high-value actions (primary CTA submit, call accept/end, important confirmations).

**Android build note:**
- Initial Gradle sync reported JVM 8 in local environment. Android build requires Java 11+ (prefer Java 17) for AGP 8.x.
- Projects were still scaffolded successfully; set local `JAVA_HOME` to Java 17 before running Android Studio/Gradle builds.

**Implemented continuation (2026-04-18):**
- Added `src/mobile/pushNotifications.ts` as a unified native/web push permission + registration service.
- Updated `src/legacy/hooks/usePushNotifications.ts` to use the unified service and trigger native registration after grant.
- Updated `src/contexts/AuthContext.tsx` to auto-attempt native push registration for authenticated users.

**Splash branding update (2026-05-09):**
- Added a branded native splash artwork source at `resources/splash.svg` and applied generated splash images to iOS (`ios/App/App/Assets.xcassets/Splash.imageset`) and Android (`android/app/src/main/res/**/splash.png`).
- Updated Capacitor splash timing (`launchShowDuration: 5000`) to reduce timeout auto-hide warnings on slower cold starts.
- Refined the splash to a minimal Apple-style variant (logo-only, no subtitle) for a cleaner native launch appearance.

---

## 3. Architecture Overview

```
Browser
  │
  ├─ React SPA (Vite)
  │    ├─ AuthContext     (Supabase Auth session)
  │    ├─ LanguageContext (active locale)
  │    ├─ AppThemeSync    (applies tenant CSS vars on load)
  │    │
  │    ├─ /patient/**     ← PatientGuard → PatientLayout → pages
  │    ├─ /professional/**← ProfessionalGuard → ProfessionalLayout → pages
  │    └─ /admin/**       ← AdminGuard → AdminLayout → pages
  │
  └─ Supabase Project (yzdnjmgpfuifgdizzlpz)
       ├─ PostgreSQL (RLS-enforced tables)
       ├─ Auth (JWT, sessions)
       ├─ Realtime (WebSocket channels)
       ├─ Storage (medical-history-documents)
       └─ Edge Functions (Deno)
            ├─ medical-chat
            ├─ symptom-triage
            ├─ speech-to-text
            ├─ text-to-speech
            ├─ send-invitation
            └─ accept-invitation
```

**Data flow pattern:**  
Components call typed service helpers in `src/shared/services/healthcare.ts`, which return raw Supabase responses. These are wrapped in `useQuery` / `useMutation` hooks defined in `src/shared/hooks/useHealthcare.ts`. React Query handles caching, background refetching, and error states.

---

## 4. Repository Structure

```
neosynapse/
├─ src/
│   ├─ App.tsx                   Route tree (all three apps unified)
│   ├─ main.tsx                  Entry point
│   ├─ index.css                 Tailwind base + CSS variable declarations
│   │
│   ├─ apps/
│   │   ├─ admin/
│   │   │   ├─ components/       AdminSidebar, AdminMobileNav
│   │   │   ├─ layouts/          AdminLayout.tsx
│   │   │   └─ pages/            Dashboard, Users, Invitations, Facilities,
│   │   │                        Roles, Templates, Audit, Settings,
│   │   │                        QuickActions, Notifications, NotificationTemplates
│   │   ├─ patient/
│   │   │   ├─ components/       PatientSidebar, PatientMobileNav
│   │   │   ├─ layouts/          PatientLayout.tsx
│   │   │   └─ pages/            Dashboard, AIAssistant, SymptomChecker,
│   │   │                        Appointments, Telemedicine, Reports,
│   │   │                        Profile, Settings, Notifications,
│   │   │                        MedicalHistorySetup, MedicalReportTools
│   │   └─ professional/
│   │       ├─ components/       ProfessionalSidebar, ProfessionalMobileNav,
│   │       │                    ProfessionalHeroCarousel,
│   │       │                    ProfessionalIncomingCallListener,
│   │       │                    EncounterFilterBanner, TransitionTimeline
│   │       ├─ layouts/          ProfessionalLayout.tsx
│   │       └─ pages/            Dashboard, Patients, PatientDetail,
│   │                            Encounters, Telemedicine, Transcripts,
│   │                            Notes, Reports, Settings, Notifications
│   │
│   ├─ auth/
│   │   ├─ guards/               PatientGuard, ProfessionalGuard, AdminGuard
│   │   ├─ hooks/                useUserRole.ts
│   │   └─ pages/                SignIn, PatientSignUp, InviteAccept,
│   │                            ForgotPassword, RoleRedirect
│   │
│   ├─ components/
│   │   ├─ AppThemeSync.tsx      Applies DB theme settings as CSS vars on mount
│   │   ├─ NavLink.tsx
│   │   ├─ RoleSwitcher.tsx
│   │   ├─ ThemeToggle.tsx
│   │   ├─ telemedicine/         CallControls, DoctorCard,
│   │   │                        PreConsultationSettings, VideoDisplay
│   │   └─ ui/                   shadcn/ui component library
│   │
│   ├─ contexts/
│   │   ├─ AuthContext.tsx        User + session state; sign-in/up/out methods
│   │   └─ LanguageContext.tsx    Active language code; persisted to localStorage
│   │
│   ├─ hooks/
│   │   ├─ useMedicalChat.ts      Multi-session chat store (localStorage + sync)
│   │   ├─ useWebRTC.ts           WebRTC peer connection lifecycle
│   │   ├─ use-mobile.tsx         Responsive breakpoint hook
│   │   └─ use-toast.ts           Toast notification helper
│   │
│   ├─ lib/
│   │   ├─ ui-theme.ts            Colour preset registry + applyAppThemeSettings()
│   │   ├─ medical-chat.ts        Streaming fetch to medical-chat edge function
│   │   └─ utils.ts               cn() tailwind class merger
│   │
│   ├─ shared/
│   │   ├─ constants/
│   │   ├─ hooks/
│   │   │   ├─ useHealthcare.ts   All React Query hooks for domain data
│   │   │   ├─ useNotifications.ts
│   │   │   └─ useTouchedFields.ts
│   │   ├─ services/
│   │   │   └─ healthcare.ts      Supabase query helpers (typed service layer)
│   │   └─ types/
│   │       └─ healthcare.ts      Domain type definitions
│   │
│   └─ integrations/
│       └─ supabase/
│           ├─ client.ts          Supabase JS client (singleton)
│           └─ types.ts           Auto-generated DB types
│
├─ supabase/
│   ├─ config.toml                project_id + function JWT config
│   ├─ migrations/                Sequential SQL migration files
│   └─ functions/
│       ├─ medical-chat/          Streaming Gemini medical assistant
│       ├─ symptom-triage/        Structured triage via Gemini function calling
│       ├─ speech-to-text/        ElevenLabs Scribe v2 STT
│       ├─ text-to-speech/        ElevenLabs TTS (multilingual v2)
│       ├─ send-invitation/       Email invitation + DB record creation
│       └─ accept-invitation/     Token validation + profile provisioning
│
├─ public/
├─ index.html
├─ package.json
├─ tailwind.config.ts
├─ vite.config.ts
├─ vitest.config.ts
└─ DOCUMENTATION.md              ← this file
```

---

## 5. Authentication & Role System

### Sign-up flows

| Flow | Path | Who |
|---|---|---|
| Patient self-registration | `/auth/patient-sign-up` | Anyone via public form |
| Invitation-based | `/auth/invite-accept?token=...` | Professionals and admins invited by an admin |
| Forgot password | `/auth/forgot-password` | Any registered user |

### Session management (`AuthContext`)

- On mount: subscribes to `supabase.auth.onAuthStateChange` first, then calls `getSession()`.
- Exposes `user`, `session`, `isLoading`, `signUp`, `signIn`, `signOut`.
- All protected routes check `isLoading` before redirecting to prevent flicker.

### Role model

- Roles are stored in **two** places for compatibility:
  - `profiles.role` — legacy single-role column
  - `user_roles` table — multi-role join table (primary source of truth for guards and `send-invitation`)
- `useUserRole()` resolves `isPatient`, `isProfessional`, `isAdmin` from `user_roles`.

### Route guards

| Guard | Allows | On fail |
|---|---|---|
| `PatientGuard` | `patient` or `admin` | Redirect to `/auth/sign-in` |
| `ProfessionalGuard` | `professional` or `admin` | Redirect to `/auth/sign-in` |
| `AdminGuard` | `admin` only | Redirect to `/auth/sign-in` |

After authentication, `RoleRedirect` (mounted at `/`) reads the user's primary role and sends them to `/patient/dashboard`, `/professional/dashboard`, or `/admin/dashboard`.

---

## 6. Patient App

**Route prefix:** `/patient`  
**Guard:** `PatientGuard`  
**Layout:** `PatientLayout` — responsive sidebar (desktop) + bottom mobile nav + `PatientMobileNav`

### Pages

#### 6.1 Dashboard (`/patient/dashboard`)

- **Hero carousel** — three slides (Symptom Checker, AI Assistant, Telemedicine) with theme-aware gradients driven by CSS custom properties.
- **Health profile card** — shows DOB, gender, BMI, blood type from `patient_profiles`.
- **Quick actions grid** — four cards with title + subtitle navigating to key features.  
  | Action | Subtitle |
  |---|---|
  | Symptom Checker | Fast triage for urgency and next-step care |
  | AI Health Assistant | General health questions, explanations, and guidance |
  | Telemedicine Consultation | Start a real-time video consultation |
  | Medical Reports | View generated reports and summaries |
- **Location selector** — auto-detects GPS via `navigator.geolocation`, reverse-geocodes with OpenStreetMap Nominatim.
- **Nearby hospitals map** — Leaflet map showing hospitals within configured delivery radius.

#### 6.2 AI Health Assistant (`/patient/ai-assistant`)

A full-featured conversational AI interface.

**Key features:**
- Multi-session chat — sessions created, named, pinned, archived. Stored in `localStorage` and synced to DB.
- Streaming responses via `useMedicalChat` hook → `streamMedicalChat()` → `medical-chat` edge function.
- Mobile fixed chrome — top action bar, mobile conversation selector, and bottom input/search bar stay fixed while only message content scrolls.
- Mobile conversation controls keep the `+` new-conversation button inline beside the conversation dropdown on small screens.
- Mobile keyboard-aware composer — AI Assistant input/search bar now moves with the on-screen keyboard so the text box remains visible while typing on iOS/Android.
- Keyboard-open context preservation — when the mobile keyboard opens, AI Assistant auto-scrolls the latest message into view so current conversation context is not hidden.
- Native keyboard event alignment — on Capacitor iOS/Android, composer offset now uses `Keyboard` plugin show/hide event heights (with browser `visualViewport` fallback) for more reliable movement above the keyboard.
- Markdown rendering of AI replies.
- Voice input — microphone button records audio, uploads to `speech-to-text` edge function (ElevenLabs Scribe v2), inserts transcribed text into the message box.
- Text-to-speech — "Listen" button on each assistant message calls `text-to-speech` edge function (ElevenLabs multilingual v2).
- Image & file upload — patients can attach images (displayed inline) or documents (PDF/DOCX/images parsed client-side via pdfjs/mammoth/Tesseract).
- Medical context injection — the patient's `medical_history` record is automatically prepended to every conversation for personalised responses.
- Report generation — at any point, the AI can emit a structured JSON + markdown report (split by `---JSON---` delimiter) that is auto-saved to `medical_reports` and available as a PDF download.
- Language switching — supports English, Twi, Ga, Ewe, Hausa per `LanguageContext`.
- **Guidance banner (empty state):** "Need urgency triage?" button cross-links to Symptom Checker.

**Distinction from Symptom Checker:** AI Assistant is for open-ended conversation, explanation, follow-up questions, and report interpretation. It does NOT return a structured urgency level.

#### 6.3 Symptom Checker (`/patient/symptom-checker`)

Structured, single-purpose urgent triage tool.

**Workflow:**
1. Patient completes a conversational intake flow (mobile-first): intro, who the assessment is for, name (if for someone else), sex assigned at birth, age, symptom duration, and symptom entry.
2. Symptoms can be provided using localised quick-select chips and/or multi-input free-form entry.
  - Free-form input supports adding multiple symptoms with Enter, comma, or semicolon.
  - Added custom symptoms appear as removable chips before submission.
3. Submits from the final "Start symptom assessment" CTA → `handleSubmit()`:
  - Uses `supabase.functions.invoke("symptom-triage")` without manual auth header (supabase-js auto-manages session tokens).
  - POSTs symptoms, demographics, and `medicalHistoryContext`.
  - Includes duration context in the symptoms payload for better triage quality.
  - Shows loading animation.
4. Result screen displays:
   - **Urgency badge** — `non-urgent` | `needs-attention` | `urgent` | `emergency` (colour-coded).
   - **Summary** paragraph.
   - **Possible conditions** list (up to 3) with likelihood tags.
   - **Recommended action**.
   - **Warning signs** to watch for.
   - **Follow-up questions** for the doctor.
5. Auto-saves triage result as a `medical_report` entry.
6. "New Check" resets to step 1.

**UI style update (2026-04-14):** redesigned to an ADA-inspired conversational assessment layout with a fixed top title bar, explicit "Previous" step control, right-aligned pill answer buttons, and a minimal footer privacy action.

**Responsive polish update (2026-04-14):** conversational step typography and controls were re-scaled for better readability across phone, tablet, and desktop breakpoints, and prompt grammar was corrected for self vs third-person flows (for example, "your" vs "Prince's").

**Typography refinement (2026-04-14):** reduced hero/prompt heading and helper-copy sizes in the conversational intake steps to avoid oversized text on small and mid-size screens.

Localised in: English, Twi, Ga, Ewe, Hausa.

#### 6.4 Appointments (`/patient/appointments`)

- Lists patient appointments from `appointments` table.
- Book new appointment: select professional, type, reason, datetime.
- Status badges: `pending` | `confirmed` | `in_progress` | `completed` | `cancelled`.

#### 6.5 Telemedicine (`/patient/telemedicine`)

- **Lobby state:** Shows list of verified professionals with availability status; patient selects a doctor.
- **Pre-call settings:** Toggle video/audio; grant recording consent (`consents` table).
- **Waiting state:** Patient creates a `consultation_room` and an `encounter` record; waits for professional.
- **Active call:** WebRTC peer-to-peer video/audio stream using `useWebRTC` hook. Controls: mute, camera toggle, end call.
- **Emergency contacts sidebar:** Hardcoded Ghana emergency numbers (112, 193, 191, 192), Ghana Health Service, NHIS, and regional contacts.
- End of call: encounter marked `completed`; audit log entry written.

#### 6.6 Medical Reports (`/patient/reports`)

- Lists all `medical_reports` for the current patient.
- View report details in plain-language sections (summary, urgency, recommended next steps, symptoms, warning signs, and consultation questions) designed for non-technical users.
- Technical JSON remains available under an expandable "Show technical report data (JSON)" section.
- Download as PDF via `html2pdf.js`.
- Share link (copy to clipboard).
- Filter by report type.
- Mobile-first report cards: metadata wraps and action buttons switch to a stacked/grid layout on small screens to prevent horizontal clipping.

#### 6.7 Medical History Setup (`/patient/medical-history` & `/patient/onboarding/medical-history`)

**Onboarding flow for new patients:**
1. Privacy acknowledgement + consent.
2. Existing conditions (multi-chip input).
3. Allergies.
4. Current medications.
5. Past surgeries.
6. Family medical history (text).
7. File uploads — PDF, images, DOCX stored in `medical-history-documents` Supabase Storage bucket.
8. Record saved to `medical_history` with `onboarding_completed: true`.

Returns patient to dashboard on completion.

#### 6.8 Profile (`/patient/profile`)

- Edit `display_name`, `full_name`, `avatar_url`.
- View role.

#### 6.9 Notifications (`/patient/notifications`)

Real-time notification feed from `notifications` table.

#### 6.10 Settings (`/patient/settings`)

- Language picker (persisted to `localStorage` + `LanguageContext`).
- Dark/light theme toggle.
- Account sign-out.

---

## 7. Professional App

**Route prefix:** `/professional`  
**Guard:** `ProfessionalGuard`  
**Layout:** `ProfessionalLayout` — sidebar (desktop) + mobile nav + `ProfessionalIncomingCallListener` (always mounted)

### 7.1 Dashboard (`/professional/dashboard`)

- **Hero carousel** — theme-aware gradient slides for the professional context.
- **Quick stats** (rotating every 5 s): assigned patients, active encounters, pending notes, completed encounters.
- **High-priority alert banner** — shown if any encounter has `status = pending`.
- **Active Queue** — top 3 pending/in-progress encounters with patient avatar initial and status badge.
- **Overall stats row** — total patients, notes to review, completion rate.

### 7.2 Patients (`/professional/patients`)

- Paginated list of assigned patients (from `encounters` table, cross-referenced with `profiles`).
- Search by name.
- Navigate to `PatientDetail` for any patient.

### 7.3 Patient Detail (`/professional/patient/:patientId`)

- Loads `patient_profiles`, `medical_history`, and `medical_history_files` for the selected patient (RLS-enforced to assigned patients only).
- **Tabs:**
  - **Overview** — DOB, gender, phone, emergency contact.
  - **Medical History** — conditions, allergies, medications, surgeries, family history notes.
  - **Uploaded Documents** — list with type, size, upload date.
- Professional cannot edit patient data (read-only view).

### 7.4 Encounters (`/professional/encounters`)

- Lists all encounters for the professional.
- Filter by status: `pending` | `in_progress` | `completed` | `cancelled`.
- `EncounterFilterBanner` component provides quick status filter pills.
- Click encounter → navigate to Telemedicine or Notes.

### 7.5 Telemedicine (`/professional/telemedicine`)

Mirrors patient Telemedicine but from the professional's side.

**Flow:**
1. List pending encounters (patient waiting).
2. Professional clicks "Join" or deep-links via `?encounterId=` query param (from incoming call toast).
3. Pre-call settings (video/audio).
4. Joins `consultation_room` as answerer via WebRTC: reads `offer` from DB, sets remote description, creates `answer`.
5. ICE candidates exchanged through `ice_candidates` table via Supabase Realtime.
6. Active call with `VideoDisplay` + `CallControls`.
7. Rollback window (10 s): if professional disconnects within 10 s, encounter is reverted to `pending`.
8. Call end: encounter set to `completed`, audit log entry created.

**Ringtone system (on this page only):**
- Polls `encounters` every 5 s for pending encounters.
- On new encounter detected: plays Web Audio API oscillator ringtone (triangle wave, 880 Hz / 988 Hz beeps).
- Browser notification if tab is hidden.
- Call can be snoozed (countdown shown).

**Global incoming call listener (`ProfessionalIncomingCallListener`):**  
The same detection logic runs in `ProfessionalLayout` on **every** professional page. When on the telemedicine page, the listener self-disables to avoid double-ringing. On other pages, a toast with an "Open" action button navigates to `/professional/telemedicine?encounterId=...`.

### 7.6 Transcripts (`/professional/transcripts`, `/professional/transcripts/:transcriptId`)

- Lists encounter transcripts from `transcripts` table.
- View full transcript JSON with speaker attribution from `speaker_map`.

### 7.7 Notes (`/professional/notes`, `/professional/notes/:noteId/edit`)

- List `clinical_notes` for encounters the professional is part of.
- Status: `draft` | `review` | `finalized`.
- Rich text editor for note content.
- `TransitionTimeline` component visualises note status progression.

### 7.8 Reports (`/professional/reports`)

- Lists all `medical_reports` the professional has access to (RLS-enforced).
- View / download / share (same as patient reports).
- Report detail supports two modes:
  - **Technical Editor** for JSON/template editing and workflow transitions.
  - **Patient-safe Preview** that renders the same report in plain-language sections (summary, urgency, next steps, symptoms, warning signs, follow-up questions) for easy clinician-to-patient review.
- Mobile-first report layout: patient/report metadata and status/actions wrap into stacked/grid controls on small screens to avoid overflow.

### 7.9 Notifications (`/professional/notifications`)

Notification feed; real-time via Supabase Realtime subscriptions.

### 7.10 Settings (`/professional/settings`)

- Profile editing.
- Language, theme, notifications preferences.

---

## 8. Admin App

**Route prefix:** `/admin`  
**Guard:** `AdminGuard`  
**Layout:** `AdminLayout` — sidebar + mobile nav

### 8.1 Dashboard (`/admin/dashboard`)

**Metric cards:**
- Total users (count from `profiles`)
- Pending invitations
- Registered facilities
- Professional profiles
- Pending professional verifications

**Recent audit logs** — last 5 entries from `audit_logs`.

**Quick actions** — configurable cards loaded from `admin_quick_actions` table. Falls back to 4 hardcoded defaults if table is empty. Real-time updates via Supabase Realtime on `admin_quick_actions` table changes.

### 8.2 Users (`/admin/users`)

- Full user list from `profiles` + `user_roles` joined.
- Search by name.
- Filter by role (patient / professional / admin).
- **Enable / Disable** user account (`profiles.status`).
- Role badges with colour coding.

### 8.3 Invitations (`/admin/invitations`)

- List of all invitations (`invitations` table) with status badges.
- **Send invitation** form: email, role (professional/admin), facility.
- Calls `send-invitation` edge function → creates DB record + sends email via Resend API.
- Revoke pending invitation.

### 8.4 Facilities (`/admin/facilities`)

- CRUD for healthcare facilities (`facilities` table).
- Fields: name, type, location, contact phone.

### 8.5 Roles (`/admin/roles`)

- View and assign roles from `user_roles` table.
- Multi-role support — a user can hold more than one role.

### 8.6 Quick Actions (`/admin/quick-actions`)

- Manage the configurable quick action cards shown on the admin dashboard.
- Fields: label, path, description, icon (mapped to Lucide icons), display order, active flag.

### 8.7 Templates (`/admin/templates`)

- Manage document/notification templates for the platform.

### 8.8 Audit Log (`/admin/audit`)

- Paginated, searchable list of all `audit_logs` (latest 100 entries).
- Filter by entity type (user, encounter, report, etc.).
- Action colour codes: `create` (green), `update` (blue), `delete` (red), `login` (primary).

### 8.9 Notifications (`/admin/notifications`)

- Send or review platform-wide notifications.

### 8.10 Notification Templates (`/admin/notification-templates`)

- Manage reusable notification message templates.

### 8.11 Settings (`/admin/settings`)

**Appearance (tenant-wide, affects all users):**

- **Preset colour palettes** — 8 named presets displayed as 3-swatch cards:
  | Preset | Description |
  |---|---|
  | Medical Green | Default; teal-green |
  | Light Blue | Clinical sky blue |
  | Sunset Orange | Warm orange |
  | Royal Blue | Rich navy |
  | Violet Bloom | Purple |
  | Rose Blush | Pink |
  | Golden Amber | Warm yellow |
  | Teal Ocean | Deep teal |

- **Custom colour picker** — 4 native `<input type="color">` pickers (primary, accent, secondary, ring). Live preview applies immediately via `applyAppThemeSettings()`. "Apply Custom Palette" saves the hex values to `app_settings`.

- **UI radius & scale** — coming soon (fields exist in DB).

**Notifications preferences:**
- System alerts toggle.
- New registrations alert toggle.
- Audit logging visibility toggle.
- Data retention days.

**Language picker** — admin's personal locale preference.

**Sign out.**

---

## 9. Shared Infrastructure

### Service Layer (`src/shared/services/healthcare.ts`)

Typed Supabase query wrappers, grouped by entity:

| Service object | Covers |
|---|---|
| `profileService` | `profiles` CRUD, `getAllProfiles`, `updateStatus` |
| `patientProfileService` | `patient_profiles` get/upsert, assigned-patient read |
| `medicalHistoryService` | `medical_history` + `medical_history_files` get/upsert/upload/delete |
| `professionalProfileService` | `professional_profiles` get/upsert |
| `facilityService` | `facilities` CRUD |
| `invitationService` | `invitations` list/create/revoke |
| `appointmentService` | `appointments` CRUD |
| `encounterService` | `encounters` CRUD |
| `triageSessionService` | `triage_sessions` create/list |
| `consentService` | `consents` create/get |
| `transcriptService` | `transcripts` create/list |
| `clinicalNoteService` | `clinical_notes` CRUD |
| `medicalReportService` | `medical_reports` create/list |
| `auditLogService` | `audit_logs` create/list |
| `appSettingsService` | `app_settings` get/update (fetch-then-update-by-id pattern) |

### React Query Hooks (`src/shared/hooks/useHealthcare.ts`)

Every service call is wrapped with a `useQuery` or `useMutation` hook. Naming convention: `use<Entity>` for queries, wrapped with React Query keys for cache invalidation.

Notable hooks:

| Hook | Behaviour |
|---|---|
| `useAppSettings()` | Uses `maybeSingle()`, `retry: false`, returns `null` on PGRST116/PGRST205 |
| `useProfileNames(ids)` | Batch-loads display names for a list of user IDs |
| `useAssignedPatients()` | Returns patients with active encounters for current professional |
| `useProfessionalEncounters()` | Encounters for the current professional |
| `useMedicalHistoryForAssignedPatient(patientId)` | Professional reading a patient's history |

### Notifications (`src/shared/hooks/useNotifications.ts`)

Real-time notification subscriptions and read/unread management.

### Push Notification Invocation (`src/shared/services/pushNotificationService.ts`)

- Client helper for invoking `send-push-notification` edge function from the frontend.
- Supports dry-run and real-send flows with typed request/response contracts.
- Used by Admin Notifications page for controlled test sends.

---

## 10. Supabase Edge Functions

All functions are located in `supabase/functions/` and run on Deno.

### `medical-chat`

- **Purpose:** Stream AI medical assistant responses.
- **Auth:** Requires a valid Supabase JWT. Passes `medicalHistoryContext` for personalised responses.
- **Provider:** Google Gemini 2.5 Flash (primary) → Lovable AI Gateway (fallback).
- **Response format:** Server-Sent Events (SSE) streaming text/event-stream.
- **Report parsing:** AI is instructed to append `---JSON---` followed by a JSON block. The frontend splits on this delimiter to extract structured report data.
- **Languages:** Instruction injected for Twi, Ga, Ewe, Hausa if `language` is not `en`.

### `symptom-triage`

- **Purpose:** Return a structured urgency assessment.
- **Provider:** Google Gemini 2.5 Flash using OpenAI-compatible function calling (`tool_choice: "required"`).
- **Tool schema:** `triage_assessment` function with fields: `urgency`, `summary`, `possible_conditions`, `recommended_action`, `questions`, `warning_signs`.
- **Rate limiting:** Returns 429 if upstream rate-limited; 402 if credits exhausted.
- **Auth:** Bearer token passed from client. The function itself does NOT validate JWT — auth is handled at the Supabase gateway level.

### `speech-to-text`

- **Purpose:** Transcribe a patient's voice message.
- **Provider:** ElevenLabs Scribe v2.
- **Input:** `multipart/form-data` with an `audio` field (any common audio format).
- **Output:** JSON transcription object from ElevenLabs.
- **Secret required:** `ELEVENLABS_API_KEY`.

### `text-to-speech`

- **Purpose:** Convert AI text responses to audio for playback.
- **Provider:** ElevenLabs `eleven_multilingual_v2`, default voice `EXAVITQu4vr4xnSDxMaL` (Sarah).
- **Input:** `{ text: string, voiceId?: string }`.
- **Output:** `audio/mpeg` binary stream.
- **Secret required:** `ELEVENLABS_API_KEY`.

### `send-invitation`

- **Purpose:** Create an `invitation` record and email the recipient.
- **Auth:** Validates caller JWT and checks `user_roles` for `admin` role.
- **Email provider:** Resend API (`RESEND_API_KEY` secret). If key is missing, DB record is created but email fails.
- **JWT verification disabled** in `config.toml` (`verify_jwt = false`) — the function does its own auth check.

### `accept-invitation`

- **Purpose:** Validate an invitation token and provision the new user's profile.
- **Flow:** Reads token from `invitations`, verifies not expired / already accepted, creates `profiles` + role-specific profile record, marks invitation `accepted`.

### `send-push-notification`

- **Purpose:** Send mobile push notifications to one or more users by reading `mobile_push_tokens` from Supabase Auth `user_metadata`.
- **Auth:** Requires caller JWT and checks `user_roles`; only `admin` and `professional` can dispatch.
- **Input:**
  - `target_user_id` or `target_user_ids` (max 50 users)
  - `title`, `body`
  - optional `data` object
  - optional `urgency` (`normal` | `high`)
  - optional `dry_run` boolean
- **Providers:**
  - Android: Firebase Cloud Messaging (legacy server key path via `FCM_SERVER_KEY`)
  - iOS: Apple Push Notification service via HTTP API (`APNS_BEARER_TOKEN`, `APNS_TOPIC`)
- **Output:** Per-token delivery results (`sent` | `failed` | `skipped`) plus totals.
- **Audit:** Writes `push_notification_dispatch` / `push_notification_dry_run` events into `audit_logs`.

### Admin push test UI (`/admin/notifications`)

- Added a **Mobile Push Test** panel to send a dry-run or real push to a selected user.
- Admin can configure target user, title, body, urgency, and dry-run toggle.
- Function response totals and per-token delivery result JSON are displayed inline for verification.

---

## 11. Database Schema

### Core Tables

#### `profiles`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK → auth.users | unique |
| `display_name` | text | |
| `full_name` | text | |
| `avatar_url` | text | |
| `role` | text | Legacy single-role. Use `user_roles` for guards. |
| `status` | text | `active` \| `disabled` |
| `settings_json` | jsonb | Per-user notification / UI preferences |
| `created_at` / `updated_at` | timestamptz | |

#### `user_roles`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK → auth.users | |
| `role` | text | `patient` \| `professional` \| `admin` |

#### `patient_profiles`

| Column | Type | Notes |
|---|---|---|
| `user_id` | uuid PK/FK | |
| `date_of_birth` | date | |
| `gender` | text | |
| `preferred_language` | text | |
| `phone` | text | |
| `emergency_contact_name` | text | |
| `emergency_contact_phone` | text | |
| `insurance_info` | jsonb | |

#### `professional_profiles`

| Column | Type | Notes |
|---|---|---|
| `user_id` | uuid PK/FK | |
| `profession_type` | text | e.g., "Doctor", "Nurse" |
| `license_number` | text | |
| `specialty` | text | |
| `facility_id` | uuid FK → facilities | |
| `verification_status` | text | `pending` \| `verified` \| `rejected` |

#### `facilities`

| Column | Type |
|---|---|
| `id` | uuid PK |
| `name` | text |
| `facility_type` | text |
| `location` | text |
| `contact_phone` | text |

#### `medical_history`

| Column | Type | Notes |
|---|---|---|
| `user_id` | uuid PK/FK | one per patient |
| `existing_conditions` | text[] | |
| `allergies` | text[] | |
| `current_medications` | text[] | |
| `past_surgeries` | text[] | |
| `family_medical_history` | text | |
| `notes` | text | |
| `onboarding_completed` | boolean | |
| `privacy_acknowledged_at` | timestamptz | |

#### `medical_history_files`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `medical_history_id` | uuid FK | |
| `user_id` | uuid FK | |
| `storage_bucket` | text | `medical-history-documents` |
| `file_path` | text | Supabase Storage path |
| `file_name` | text | |
| `mime_type` | text | |
| `file_size` | int | bytes |
| `document_type` | text | `lab_result`, `prescription`, etc. |

#### `invitations`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `email` | text | |
| `role` | text | |
| `facility_id` | uuid | optional |
| `invited_by` | uuid FK | |
| `status` | text | `pending` \| `accepted` \| `revoked` \| `expired` |
| `token` | text | unique secure token |
| `expires_at` | timestamptz | |

#### `appointments`

| Column | Type |
|---|---|
| `id` | uuid PK |
| `patient_id` | uuid FK |
| `professional_id` | uuid FK |
| `facility_id` | uuid FK |
| `appointment_type` | text |
| `reason_for_visit` | text |
| `scheduled_at` | timestamptz |
| `status` | text |

#### `encounters`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `appointment_id` | uuid FK | optional |
| `patient_id` | uuid FK | |
| `professional_id` | uuid FK | |
| `encounter_type` | text | `telemedicine`, `in-person`, etc. |
| `status` | text | `pending` \| `in_progress` \| `completed` \| `cancelled` |
| `started_at` / `ended_at` | timestamptz | |

#### `consultation_rooms`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `encounter_id` | uuid FK | |
| `created_by` | uuid FK | |
| `doctor_id` | uuid FK | |
| `status` | text | `waiting` \| `active` \| `ended` |
| `consent_recording` | boolean | patient consent for recording |
| `offer` | jsonb | WebRTC SDP offer |
| `answer` | jsonb | WebRTC SDP answer |

#### `ice_candidates`

| Column | Type |
|---|---|
| `id` | uuid PK |
| `room_id` | uuid FK → consultation_rooms |
| `sender` | uuid FK |
| `candidate` | jsonb |

#### `transcripts`

| Column | Type |
|---|---|
| `id` | uuid PK |
| `encounter_id` | uuid FK |
| `transcript_json` | jsonb |
| `speaker_map` | jsonb |

#### `clinical_notes`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `encounter_id` | uuid FK | |
| `draft_json` | jsonb | |
| `final_json` | jsonb | |
| `status` | text | `draft` \| `review` \| `finalized` |
| `approved_by` | uuid FK | |
| `approved_at` | timestamptz | |

#### `medical_reports`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `encounter_id` | uuid FK | optional |
| `patient_id` | uuid FK | |
| `report_type` | text | `ai_assessment`, `triage`, `summary` |
| `report_json` | jsonb | Structured content |

#### `audit_logs`

| Column | Type |
|---|---|
| `id` | uuid PK |
| `actor_id` | uuid FK |
| `action` | text |
| `entity_type` | text |
| `entity_id` | uuid |
| `metadata` | jsonb |
| `created_at` | timestamptz |

#### `triage_sessions`

| Column | Type |
|---|---|
| `id` | uuid PK |
| `patient_id` | uuid FK |
| `inputs_json` | jsonb |
| `result_json` | jsonb |
| `urgency_level` | text |

#### `consents`

| Column | Type |
|---|---|
| `id` | uuid PK |
| `patient_id` | uuid FK |
| `encounter_id` | uuid FK |
| `consent_type` | text |
| `granted` | boolean |
| `version` | text |

#### `app_settings`

Single-row table controlling tenant-wide appearance.

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | uuid PK | | |
| `app_color_preset` | text | `medical_green` | 8 preset keys |
| `app_color_mode` | text | `preset` | `preset` \| `custom` |
| `app_custom_primary_hex` | text | `#22c55e` | 6-digit hex |
| `app_custom_accent_hex` | text | `#14b8a6` | |
| `app_custom_secondary_hex` | text | `#0f766e` | |
| `app_custom_ring_hex` | text | `#22c55e` | |
| `app_ui_radius` | text | `0.75rem` | CSS border-radius value |
| `app_ui_scale` | text | `1` | CSS scale multiplier |
| `updated_by` | uuid FK | | |

#### `admin_quick_actions`

| Column | Type |
|---|---|
| `id` | uuid PK |
| `label` | text |
| `path` | text |
| `description` | text |
| `icon` | text |
| `is_active` | boolean |
| `display_order` | int |

---

## 12. Theming & Branding System

The theming system allows admins to change the platform's colour scheme for all users instantly.

### How it works

1. **Admin selects a preset or custom palette** in `/admin/settings`.
2. Settings are saved to `app_settings` table via `appSettingsService.update()` (fetch-then-update-by-id pattern to satisfy RLS WHERE clause requirement).
3. On every page load, `AppThemeSync` component reads `app_settings` and calls `applyAppThemeSettings()`.
4. `applyAppThemeSettings()` (in `src/lib/ui-theme.ts`) writes HSL values to CSS custom properties on `:root`.
5. All Tailwind/shadcn colour utilities (`text-primary`, `bg-accent`, etc.) read from these CSS variables.

### CSS custom properties set

```css
--primary         /* Main brand colour */
--primary-foreground
--accent
--accent-foreground
--secondary
--secondary-foreground
--ring            /* Focus ring colour */
--radius          /* Border radius */
```

### Preset details (`src/lib/ui-theme.ts`)

8 named presets, each storing HSL strings for primary / accent / secondary / ring.

### Custom mode

Admin inputs 4 hex colour values. `hexToHslString(hex)` converts them to HSL format at save time. Hex values stored in `app_settings` for persistence; HSL applied to CSS at runtime.

### Theme-aware components

- `HeroCarousel` (patient) — gradient uses `hsl(var(--primary) / 0.72)` / `hsl(var(--accent) / 0.88)`
- `ProfessionalHeroCarousel` — same
- Pagination dots — active dot: `hsl(var(--primary))`, inactive: `hsl(var(--muted-foreground) / 0.25)`

---

## 13. Localisation

Supported languages:

| Code | Language | Native name |
|---|---|---|
| `en` | English | English |
| `tw` | Twi (Akan) | Twi |
| `ga` | Ga | Gã |
| `ee` | Ewe | Eʋegbe |
| `ha` | Hausa | Hausa |

**Implementation:**
- `LanguageContext` stores the active `LanguageCode`, persisted to `localStorage`.
- Pages with multilingual copy (SymptomChecker, AIAssistant) contain a locale map keyed by language code.
- The active language is passed to edge functions (`medical-chat`, `symptom-triage`) so AI responses match the patient's language.
- Voice recognition in AIAssistant uses a `RECOGNITION_LANGUAGE_MAP` to set the correct `lang` attribute for Web Speech API / ElevenLabs.

---

## 14. Real-Time & WebRTC

### WebRTC signalling flow

```
Patient browser                    Supabase DB                    Professional browser
     │                                   │                                  │
     │── creates consultation_room ──────►│                                  │
     │   (offer: SDP)                    │                                  │
     │                                   │◄─── polls encounters every 5s ───│
     │                                   │    (ProfessionalIncomingCallListener)
     │                                   │                                  │
     │                                   │── incoming call detected ─────────► toast + ringtone
     │                                   │                                  │
     │                                   │◄────── reads room, writes answer ─│
     │                                   │        (SDP answer)               │
     │◄── reads answer from DB ──────────│                                   │
     │                                   │                                   │
     │── ICE candidates ─────────────────►│◄─────────── ICE candidates ───────│
     │         (via ice_candidates table + Supabase Realtime broadcast)
     │                                   │                                   │
     │◄══════════════ P2P WebRTC connection established ════════════════════►│
```

**ICE Servers:** Google STUN servers (`stun.l.google.com:19302`, `stun1.l.google.com:19302`).

**`useWebRTC` hook responsibilities:**
- `getUserMedia()` with video+audio fallback (audio-only if camera unavailable).
- `RTCPeerConnection` creation and ICE candidate buffering.
- `ontrack` → populates remote `MediaStream`.
- Cleanup on unmount (tracks stopped, channel unsubscribed, DB room status updated).

### Realtime subscriptions used

| Channel | Table | Events | Used by |
|---|---|---|---|
| `consultation-room-{roomId}` | `consultation_rooms` | UPDATE | Patient waiting for answer |
| `ice-candidates-{roomId}-{userId}` | `ice_candidates` | INSERT | Both sides |
| `admin-quick-actions-dashboard` | `admin_quick_actions` | *, DELETE | Admin dashboard |
| `pro-incoming-call-listener-{userId}` | `encounters` | INSERT | ProfessionalIncomingCallListener |

---

## 15. AI / ML Integrations

### Google Gemini 2.5 Flash

- Used for both streaming chat (medical-chat) and structured triage (symptom-triage).
- Chat endpoint: `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions` (OpenAI-compatible).
- Triage endpoint: same, with `tool_choice: { type: "function", function: { name: "triage_assessment" } }`.
- System prompt instructs Gemini to act as a cautious medical professional.

### ElevenLabs

- **STT:** Scribe v2 model. Accepts multipart audio upload. Returns JSON with `text` field.
- **TTS:** `eleven_multilingual_v2` model. Default voice: Sarah (`EXAVITQu4vr4xnSDxMaL`). Returns `audio/mpeg`.

### Tesseract.js (OCR)

- Runs in the browser when a patient uploads an image as a medical document.
- Extracts text from the image and injects it as context into the next AI message.

### pdfjs-dist

- Parses uploaded PDF medical documents in-browser.
- Extracted text injected as AI context.

### mammoth

- Parses `.docx` files in-browser.
- Extracted text injected as AI context.

---

## 16. Security Model (RLS)

All Supabase tables have Row Level Security enabled. RLS policies enforce:

- **Patients** can only read and write their own data.
- **Professionals** can read encounter-related data for patients assigned to them. Cannot modify patient records.
- **Admins** have full read access to all tables (enforced by policy checks against `user_roles`).
- `app_settings` — everyone can SELECT; only admin can UPDATE/INSERT.

See `src/shared/services/healthcare.ts` header for the full RLS status table and known TODOs (e.g., professional needing SELECT on `triage_sessions`).

**Token handling in Symptom Checker:**
**Token handling in Symptom Checker:**
- `supabase.functions.invoke` is called without a custom `Authorization` header — the Supabase JS client supplies the session token automatically and auto-refreshes it before each request (`autoRefreshToken: true`).
- Passing a manual token (e.g., from the cached `getSession()` result) bypassed auto-refresh and caused 401 errors with expired tokens.
- `symptom-triage` is listed in `config.toml` with `verify_jwt = false` so the Supabase gateway does not require a user JWT at the network layer; access is enforced client-side by `PatientGuard`.

---

## 17. Environment Variables & Secrets

### Frontend (`.env` / Vite)

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key |

### Supabase Secrets (set via `supabase secrets set`)

| Secret | Required by | Notes |
|---|---|---|
| `GOOGLE_AI_API_KEY` | medical-chat, symptom-triage | Primary AI provider |
| `ELEVENLABS_API_KEY` | speech-to-text, text-to-speech | |
| `RESEND_API_KEY` | send-invitation | Email delivery; optional — invitation is still created if missing |
| `LOVABLE_API_KEY` | medical-chat, symptom-triage | Legacy fallback only |
| `FCM_SERVER_KEY` | send-push-notification | Required for Android push dispatch (legacy FCM key flow) |
| `APNS_BEARER_TOKEN` | send-push-notification | Required for iOS APNs direct send (JWT bearer token) |
| `APNS_TOPIC` | send-push-notification | iOS app bundle identifier used as APNs topic |
| `SUPABASE_URL` | send-invitation, accept-invitation | Auto-injected by Supabase |
| `SUPABASE_ANON_KEY` | send-invitation, send-push-notification | Auto-injected |
| `SUPABASE_SERVICE_ROLE_KEY` | send-invitation, accept-invitation, send-push-notification | Auto-injected |

---

## 18. Build, Test & Deploy

### Local development

```bash
# Install dependencies
bun install         # or: npm install

# Start dev server (Vite HMR on http://localhost:5173)
npm run dev

# Start Supabase local stack
supabase start

# Push pending migrations to remote
supabase db push --yes

# Deploy all edge functions
supabase functions deploy
```

### Build

```bash
npm run build       # Production build → dist/
npm run build:dev   # Development mode build (source maps retained)
npm run preview     # Serve dist/ locally
```

### Tests

```bash
npm run test        # Vitest run (single pass)
npm run test:watch  # Watch mode
```

Test files: `src/test/` — currently includes `example.test.ts` and `setup.ts`.

### Linting

```bash
npm run lint        # ESLint across all source files
```

### Migrations

```bash
# Create a new migration
supabase migration new <description>

# Repair a stuck migration (mark as reverted)
supabase migration repair --status reverted <migration_timestamp>

# Apply to remote
supabase db push --yes
```

---

## 19. Known Limitations & TODOs

### RLS gaps (tracked in `src/shared/services/healthcare.ts`)

- Admin needs `SELECT all` on `profiles` and `professional_profiles`.
- Admin needs `INSERT`, `UPDATE`, `DELETE` on `facilities`.
- Professional needs `SELECT` on `triage_sessions` for assigned patients.
- Professional needs `SELECT` / `UPDATE` on `consultation_rooms` for assigned rooms.
- `consents` table lacks `UPDATE` for revocation.
- `medical_reports` lacks `UPDATE` for corrections.
- `audit_logs` admin-wide SELECT not enforced.

### Feature gaps

- `app_ui_radius` and `app_ui_scale` fields exist in DB but no UI controls yet in admin settings.
- `send-invitation` email delivery requires `RESEND_API_KEY`; invitation still created without it.
- Hospital map on patient dashboard uses OpenStreetMap Nominatim for geocoding — rate-limited; not suitable for high traffic without a geocoding API key.
- Transcript speaker labelling (`speaker_map`) is manual — not automatic.
- Supabase CLI is at v2.75.0; v2.84.2 is available.

### Browser compatibility

- Web Audio API ringtone requires a user gesture on some browsers (iOS Safari). The app installs a `pointerdown`/`touchstart`/`keydown` unlock listener to handle this.
- Web Speech API (`SpeechRecognition`) is not supported in all browsers; fallback to ElevenLabs STT via microphone recording is used.

---

## 20. Changelog

> Append an entry here whenever a significant change is made to the codebase.

| Date | Change | Files affected |
|---|---|---|
| 2026-04-06 | Created `app_settings` table; built `appSettingsService`, `useAppSettings()`, `AppThemeSync` | `healthcare.ts`, `useHealthcare.ts`, `AppThemeSync.tsx`, migration |
| 2026-04-06 | Fixed `UPDATE requires WHERE clause` — changed `update().limit(1)` to fetch-then-update-by-id | `healthcare.ts` (appSettingsService) |
| 2026-04-06 | Made hero carousels theme-aware (CSS variable gradients) | `HeroCarousel.tsx`, `ProfessionalHeroCarousel.tsx` |
| 2026-04-07 | Expanded colour presets from 3 to 8; added 3-swatch preview cards in admin Settings | `ui-theme.ts`, `Settings.tsx` (admin) |
| 2026-04-07 | Added custom colour picker (4 inputs, live preview, hex-to-HSL save) | `ui-theme.ts`, `Settings.tsx` (admin) |
| 2026-04-07 | New migration: `app_color_mode`, `app_custom_*_hex` columns in `app_settings` | migration file |
| 2026-04-10 | Created `ProfessionalIncomingCallListener` — global call ringtone on all professional pages | `ProfessionalIncomingCallListener.tsx`, `ProfessionalLayout.tsx` |
| 2026-04-10 | Sharpened UI distinction between Symptom Checker and AI Assistant: subtitles on Dashboard, guidance banners in each tool with cross-navigation | `Dashboard.tsx` (patient), `AIAssistant.tsx`, `SymptomChecker.tsx` |
| 2026-04-10 | Fixed `useNavigate()` called at module level in `AIAssistant.tsx` (invalid hook call crash) | `AIAssistant.tsx` |
| 2026-04-14 | Fixed Symptom Checker "Session expired" false positive: added `getValidAccessToken()` with refresh + one-shot retry on 401 | `SymptomChecker.tsx` |
| 2026-04-14 | Fixed Symptom Checker persistent 401 errors: removed manual token passing that bypassed supabase-js auto-refresh; added `verify_jwt = false` in config.toml for `symptom-triage` | `src/apps/patient/pages/SymptomChecker.tsx`, `supabase/config.toml`, `DOCUMENTATION.md` |
| 2026-04-14 | Redesigned Patient Symptom Checker into an ADA-inspired conversational mobile flow (step intake with pill choices, previous navigation, and staged symptom capture) while keeping the existing Neo Synapse triage backend | `src/apps/patient/pages/SymptomChecker.tsx`, `DOCUMENTATION.md` |
| 2026-04-14 | Refined Symptom Checker conversational UX to match app theme tokens, improved responsive text sizing across breakpoints, and fixed dynamic grammar in self/other question prompts | `src/apps/patient/pages/SymptomChecker.tsx`, `DOCUMENTATION.md` |
| 2026-04-14 | Redesigned patient report detail view for readability: replaced raw JSON-first display with plain-language sections and moved JSON to a collapsible technical block | `src/apps/patient/pages/Reports.tsx`, `DOCUMENTATION.md` |
| 2026-04-14 | Added Professional Reports patient-safe preview mode as a separate non-technical reader view alongside the JSON technical editor | `src/apps/professional/pages/Reports.tsx`, `DOCUMENTATION.md` |
| 2026-04-14 | Reduced Symptom Checker conversational heading/helper text sizes to improve readability and visual balance across screen sizes | `src/apps/patient/pages/SymptomChecker.tsx`, `DOCUMENTATION.md` |
| 2026-04-14 | Reduced only the bold conversational prompt headings by about 30% to improve visual balance on mobile and small screens | `src/apps/patient/pages/SymptomChecker.tsx`, `DOCUMENTATION.md` |
| 2026-04-14 | Enabled true multi-input symptom capture in Symptom Checker: users can add several typed symptoms (Enter/comma/semicolon), review them as chips, and combine them with pill selections | `src/apps/patient/pages/SymptomChecker.tsx`, `DOCUMENTATION.md` |
| 2026-04-15 | Updated browser tab icon to use the app favicon from `public/favicon.ico` by adding an explicit favicon link in the HTML head | `index.html`, `DOCUMENTATION.md` |
| 2026-04-15 | Clarified favicon setup with explicit standard + shortcut icon tags so browsers consistently load `public/favicon.ico` | `index.html`, `DOCUMENTATION.md` |
| 2026-04-15 | Added favicon cache-busting and Apple touch icon tags so browsers refresh and use `public/favicon.ico` consistently | `index.html`, `DOCUMENTATION.md` |
| 2026-04-18 | Set up Capacitor mobile wrapper structure: installed Capacitor core/platform/plugins, added `capacitor.config.ts`, scaffolded `android` and `ios`, added mobile scripts, and wired native bootstrap initialization | `package.json`, `capacitor.config.ts`, `src/mobile/capacitorBootstrap.ts`, `src/main.tsx`, `android/**`, `ios/**`, `DOCUMENTATION.md` |
| 2026-04-18 | Continued mobile setup by implementing unified native/web push registration with Supabase metadata token persistence and auth-triggered native registration | `src/mobile/pushNotifications.ts`, `src/legacy/hooks/usePushNotifications.ts`, `src/contexts/AuthContext.tsx`, `DOCUMENTATION.md` |
| 2026-04-18 | Added `send-push-notification` Supabase Edge Function to dispatch notifications from stored `mobile_push_tokens` with role checks, per-token delivery reporting, and audit logging | `supabase/functions/send-push-notification/index.ts`, `DOCUMENTATION.md` |
| 2026-04-18 | Added frontend push invocation helper and Admin Notifications test panel for dry-run/real send verification against `send-push-notification` | `src/shared/services/pushNotificationService.ts`, `src/apps/admin/pages/Notifications.tsx`, `DOCUMENTATION.md` |
| 2026-05-09 | Added branded native splash screen assets for iOS/Android and tuned Capacitor splash duration to improve cold-start launch experience | `resources/splash.svg`, `ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png`, `ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-1.png`, `ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-2.png`, `android/app/src/main/res/drawable/splash.png`, `android/app/src/main/res/drawable-port-*/splash.png`, `android/app/src/main/res/drawable-land-*/splash.png`, `capacitor.config.ts`, `DOCUMENTATION.md` |
| 2026-05-09 | Refined the native splash to a lighter minimal variant (logo only, no subtitle) to better match Apple launch-screen style | `resources/splash.svg`, `ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png`, `ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-1.png`, `ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-2.png`, `android/app/src/main/res/drawable/splash.png`, `android/app/src/main/res/drawable-port-*/splash.png`, `android/app/src/main/res/drawable-land-*/splash.png`, `DOCUMENTATION.md` |
| 2026-05-09 | Fixed AI Assistant mobile keyboard overlap by making the bottom input/search composer track keyboard height so the text box stays visible while typing | `src/apps/patient/pages/AIAssistant.tsx`, `DOCUMENTATION.md` |
| 2026-05-09 | Added AI Assistant keyboard-open auto-scroll so the latest message stays visible when the mobile keyboard appears | `src/apps/patient/pages/AIAssistant.tsx`, `DOCUMENTATION.md` |
| 2026-05-09 | Improved AI Assistant keyboard handling reliability on native mobile by using Capacitor Keyboard event heights for composer offset with browser fallback logic | `src/apps/patient/pages/AIAssistant.tsx`, `DOCUMENTATION.md` |
| 2026-04-14 | Improved Patient Reports mobile responsiveness by stacking/wrapping metadata and action controls so report cards fully fit small screens | `src/apps/patient/pages/Reports.tsx`, `DOCUMENTATION.md` |
| 2026-04-14 | Improved Professional Reports mobile responsiveness by stacking/wrapping detail and list actions so controls fit cleanly on small screens | `src/apps/professional/pages/Reports.tsx`, `DOCUMENTATION.md` |
| 2026-04-14 | Fixed AI Assistant mobile scrolling UX by pinning the top bar, conversation selector, and bottom input bar while chat content scrolls independently | `src/apps/patient/pages/AIAssistant.tsx`, `DOCUMENTATION.md` |
| 2026-04-14 | Fixed AI Assistant mobile conversation controls so the `+` new-conversation button stays inline beside the dropdown | `src/apps/patient/pages/AIAssistant.tsx`, `DOCUMENTATION.md` |
| 2026-04-14 | Created this documentation file | `DOCUMENTATION.md` |
