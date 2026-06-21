# NeoSynapse

NeoSynapse is a multi-role healthcare platform for patients, healthcare professionals, and administrators. It ships as a Vite/React web app and is wrapped for Android/iOS with Capacitor.

The full system overview, architecture notes, schema summary, Edge Function details, and operational checklist live in [DOCUMENTATION.md](DOCUMENTATION.md). Production domain setup lives in [DEPLOYMENT.md](DEPLOYMENT.md).

## Core Apps

- Patient app: AI health assistant, structured symptom triage, appointments, telemedicine, medical reports, medical history, notifications, and settings.
- Professional app: dashboard, patient access, encounter queue, appointments, telemedicine, transcripts, clinical notes, reports, and notifications.
- Admin app: user and role management, invitations, facilities, audit logs, templates, quick actions, notifications, push tests, and tenant-wide theming.

## Stack

- React 18, TypeScript, Vite, React Router, TanStack Query
- Tailwind CSS, shadcn/ui, Radix UI
- Supabase Auth, Postgres/RLS, Realtime, Storage, and Edge Functions
- Google Gemini for medical chat and symptom triage
- ElevenLabs for speech-to-text and text-to-speech
- Capacitor 8 for Android and iOS shells

## Local Development

```sh
npm install
npm run dev
```

The Vite dev server runs at `http://localhost:5173` by default.

Required frontend environment variables:

```sh
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_APP_URL=https://neosynapseai.com
```

The production web app uses `https://neosynapseai.com` as its canonical origin for authentication callbacks, password recovery, and invitation links.

For DNS, Supabase Auth redirect URLs, and production hosting variables, see [DEPLOYMENT.md](DEPLOYMENT.md).

## Verification

```sh
npm run test
npm run build
```

For the mobile wrapper:

```sh
npm run mobile:build
```

Mobile Playwright journeys for the patient and professional portals:

```sh
npm run test:e2e:mobile
```

See [e2e/README.md](e2e/README.md) for the dedicated test-account environment variables.

This builds the web app and syncs the output into the Android and iOS Capacitor projects.

## Supabase

Project config is in `supabase/config.toml`. Migrations live in `supabase/migrations`, and Edge Functions live in `supabase/functions`.

Common deployment commands:

```sh
supabase db push --yes
supabase functions deploy
```

See [DOCUMENTATION.md](DOCUMENTATION.md) for required Supabase secrets, RLS notes, function behavior, and the production validation checklist.
