# Mobile E2E tests

These Playwright tests exercise the real Supabase-backed patient and professional portals using a Pixel 7 mobile viewport. They are read-only: no appointment, call, note, or report is created.

Create a local `.env.e2e` file or export these variables in your shell:

```sh
E2E_PATIENT_EMAIL=patient@example.com
E2E_PATIENT_PASSWORD=...
E2E_PROFESSIONAL_EMAIL=doctor@example.com
E2E_PROFESSIONAL_PASSWORD=...
```

Load the file and run the suite:

```sh
set -a
source .env.e2e
set +a
npm run test:e2e:mobile
```

Without credentials, role-specific tests are skipped. Set `E2E_BASE_URL` to test an already deployed application instead of starting the local Vite server.
