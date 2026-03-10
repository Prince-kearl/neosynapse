# Neo Synapse — Supabase Migration Guide

> Migrate from Lovable Cloud Supabase to your own Supabase project  
> Target project: `yzdnjmgpfuifgdizzlpz`

---

## Table of Contents

1. [Phase 6: Auth & Invitation Hardening](#phase-6)
2. [Phase 7: Data Migration Strategy](#phase-7)
3. [Phase 8: Regenerate Types](#phase-8)
4. [Phase 9: Validation & Test Plan](#phase-9)
5. [Phase 10: Complete Summary](#phase-10)

---

<a id="phase-6"></a>
## Phase 6 — Auth & Invitation Flow Hardening

### Auth Architecture (already correct)

| Flow | Method | Status |
|------|--------|--------|
| Patient self-signup | `supabase.auth.signUp()` via `/auth/patient-sign-up` | ✅ Correct — defaults to `patient` role via `handle_new_user()` trigger |
| Professional/Admin onboarding | Invite-only via `accept-invitation` edge function | ✅ Correct — uses `admin.createUser()` with `email_confirm: true` |
| Sign-in | `supabase.auth.signInWithPassword()` | ✅ Correct |
| Password reset | `supabase.auth.resetPasswordForEmail()` | ✅ Correct |
| Role-based redirect | `RoleRedirect` checks `user_roles` table | ✅ Correct |

### Invitation Status Transitions

```
pending → sent (after email delivered via Resend)
pending → accepted (after invite-accept edge function completes)
pending/sent → revoked (admin action)
pending/sent → expired (TTL: 7 days, checked client-side + server-side)
```

### Email Delivery

The `send-invitation` edge function uses **Resend API** for email delivery.

- **With `RESEND_API_KEY` configured**: Emails are sent, status becomes `sent`
- **Without `RESEND_API_KEY`**: Invitation is created (status `pending`), invite link is returned to admin UI for manual sharing
- **Test mode (Resend free tier)**: Can only send to verified emails. Add recipient emails in Resend dashboard first.

### Required Supabase Auth Settings (Dashboard → Authentication → Settings)

- [ ] **Email confirmations**: Enable (patients must verify email)
- [ ] **Leaked password protection**: Enable
- [ ] **Site URL**: Set to your app's public URL (e.g., `https://your-app.com`)
- [ ] **Redirect URLs**: Add your app URL (e.g., `https://your-app.com/*`)

### No Lovable-specific dependencies remain in auth flows

- `AuthContext.tsx`: Uses only `supabase.auth` methods ✅
- `InviteAccept.tsx`: Uses `supabase.functions.invoke()` ✅
- `accept-invitation/index.ts`: Uses `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (auto-provided) ✅
- `send-invitation/index.ts`: `.lovable.app` fallback **removed** in Phase 3 ✅

---

<a id="phase-7"></a>
## Phase 7 — Data Migration Strategy

### Schema Migration (automated via `supabase db push`)

All 8 migration files run cleanly in order on a fresh Supabase project. No fix-up needed.

```bash
supabase link --project-ref yzdnjmgpfuifgdizzlpz
supabase db push
```

### Data Migration (manual)

Since Lovable Cloud doesn't expose direct database export, you'll need to use the **Supabase Dashboard SQL Editor** on the OLD project (if you have dashboard access) or export via the Lovable Cloud UI.

#### Tables worth migrating (healthcare-relevant)

| Table | Migrate? | Notes |
|-------|----------|-------|
| `profiles` | ✅ Yes | Core user data |
| `user_roles` | ✅ Yes | Multi-role assignments |
| `patient_profiles` | ✅ Yes | Patient demographics |
| `professional_profiles` | ✅ Yes | Professional credentials |
| `facilities` | ✅ Yes | Healthcare facilities |
| `invitations` | ⚠️ Optional | Only if pending invitations exist |
| `appointments` | ✅ Yes | Patient appointments |
| `encounters` | ✅ Yes | Clinical encounters |
| `triage_sessions` | ✅ Yes | AI triage history |
| `consents` | ✅ Yes | Patient consent records |
| `transcripts` | ✅ Yes | Consultation transcripts |
| `clinical_notes` | ✅ Yes | Clinical documentation |
| `medical_reports` | ✅ Yes | Medical reports |
| `audit_logs` | ⚠️ Optional | Historical audit trail |
| `consultation_rooms` | ❌ No | Ephemeral WebRTC signaling |
| `ice_candidates` | ❌ No | Ephemeral WebRTC signaling |

#### Tables to NOT migrate (legacy marketplace)

| Table | Reason |
|-------|--------|
| `vendors` | Legacy marketplace — unused |
| `meals` | Legacy marketplace — unused |
| `orders` | Legacy marketplace — unused |
| `order_items` | Legacy marketplace — unused |
| `favorites` | Legacy marketplace — unused |
| `reviews` | Legacy marketplace — unused |
| `vendor_follows` | Legacy marketplace — unused |

#### Export/Import Strategy

**Option A: SQL Export (if you have dashboard access to old project)**

```sql
-- Run on OLD Supabase project SQL Editor, per table:
COPY (SELECT * FROM public.profiles) TO STDOUT WITH CSV HEADER;
```

Then import on NEW project:
```sql
COPY public.profiles FROM STDIN WITH CSV HEADER;
```

**Option B: JSON via Supabase JS client**

```js
// Export script (run locally with old project credentials)
const { data } = await oldSupabase.from('profiles').select('*');
fs.writeFileSync('profiles.json', JSON.stringify(data));

// Import script (run locally with new project credentials)
const profiles = JSON.parse(fs.readFileSync('profiles.json'));
await newSupabase.from('profiles').upsert(profiles);
```

**Option C: Lovable Cloud UI**

Use the Cloud UI table view to export tables as CSV (Cloud tab → Database → Tables → Export).

#### ⚠️ Auth Users Migration

`auth.users` cannot be migrated via standard SQL. Options:
1. **Re-invite users**: Send new invitations from the new project
2. **Supabase CLI**: `supabase auth export` / `supabase auth import` (if you have CLI access to old project)
3. **Manual re-creation**: Users sign up again on the new project

**Important**: `profiles`, `user_roles`, and `patient_profiles` reference `auth.users.id`. If you migrate data without migrating auth users, the foreign key references will be orphaned. Either migrate auth users first, or re-create profiles after users sign up.

---

<a id="phase-8"></a>
## Phase 8 — Regenerate Types / Integration Layer

### After schema is deployed to your project:

```bash
# Generate TypeScript types from your Supabase schema
supabase gen types typescript --project-id yzdnjmgpfuifgdizzlpz > src/integrations/supabase/types.ts
```

### Files that depend on types (no changes needed if schema matches):

- `src/integrations/supabase/client.ts` — reads from env vars only ✅
- `src/shared/types/healthcare.ts` — manually maintained domain types ✅
- `src/shared/services/healthcare.ts` — uses Supabase client with table names ✅
- `src/shared/hooks/useHealthcare.ts` — wraps services with React Query ✅
- `src/auth/hooks/useUserRole.ts` — queries `user_roles` table ✅

All these files use table names and column names that match the migration schema. No code changes needed as long as the schema is identical.

---

<a id="phase-9"></a>
## Phase 9 — Validation & Test Checklist

### Pre-deployment checklist

- [ ] `.env` updated with new Supabase URL and anon key
- [ ] `supabase/config.toml` updated with new project ID
- [ ] All migrations applied (`supabase db push`)
- [ ] All edge functions deployed (`supabase functions deploy`)
- [ ] All secrets configured (see Phase 10)
- [ ] Auth settings configured (email confirmation, site URL, redirect URLs)
- [ ] Types regenerated (`supabase gen types typescript`)

### Functional test matrix

| # | Test | Route | Expected Result |
|---|------|-------|-----------------|
| 1 | Patient sign-up | `/auth/patient-sign-up` | Creates account, sends verification email, profile + user_role created by trigger |
| 2 | Email verification | Email link | Confirms email, allows sign-in |
| 3 | Patient sign-in | `/auth/sign-in` | Signs in, redirects to `/patient/dashboard` |
| 4 | Patient dashboard data | `/patient/dashboard` | Loads profile, appointments, triage sessions via RLS |
| 5 | Symptom checker | `/patient/symptom-checker` | Calls `symptom-triage` edge function, returns triage result |
| 6 | AI assistant | `/patient/ai-assistant` | Calls `medical-chat` edge function, streams response |
| 7 | Voice input | `/patient/ai-assistant` | Calls `speech-to-text` edge function (requires ELEVENLABS_API_KEY) |
| 8 | Voice output | `/patient/ai-assistant` | Calls `text-to-speech` edge function (requires ELEVENLABS_API_KEY) |
| 9 | Admin sign-in | `/auth/sign-in` | Signs in with admin account, redirects to `/admin/dashboard` |
| 10 | Admin create invitation | `/admin/invitations` | Calls `send-invitation`, creates invitation record |
| 11 | Invitation email | Resend delivery | Email sent with correct invite link using `APP_URL` |
| 12 | Accept invitation | `/auth/invite-accept?token=...` | Creates account, assigns role + user_roles, auto sign-in |
| 13 | Professional access | `/professional/dashboard` | Loads professional workspace with correct data |
| 14 | Multi-role access | All dashboards | User with multiple roles can access all assigned dashboards |
| 15 | RLS enforcement | Any data query | Users can only see their own data; admins see all |
| 16 | Password reset | `/auth/forgot-password` | Sends reset email, allows password update |
| 17 | Telemedicine room | `/patient/telemedicine` | Creates consultation room, WebRTC signaling works |

### Edge function test commands

```bash
# Test medical-chat
curl -X POST https://yzdnjmgpfuifgdizzlpz.supabase.co/functions/v1/medical-chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"messages":[{"role":"user","content":"What causes headaches?"}]}'

# Test symptom-triage
curl -X POST https://yzdnjmgpfuifgdizzlpz.supabase.co/functions/v1/symptom-triage \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"symptoms":"headache, fever","age":"30","gender":"male"}'
```

---

<a id="phase-10"></a>
## Phase 10 — Complete Migration Summary

### Files changed during migration (inside Lovable)

| File | Change |
|------|--------|
| `supabase/functions/send-invitation/index.ts` | Removed `.lovable.app` fallback; admin check uses `user_roles`; requires `APP_URL` secret |
| `supabase/functions/accept-invitation/index.ts` | Updated CORS headers; now inserts into `user_roles` on acceptance |

### Files that need manual changes (after GitHub export)

| File | Change needed |
|------|---------------|
| `.env` | Replace all 3 vars with new project values |
| `supabase/config.toml` | Replace `project_id` + add all function entries with `verify_jwt = false` |
| `src/integrations/supabase/types.ts` | Regenerate with `supabase gen types typescript` |

### Updated `.env` (set these after export)

```env
VITE_SUPABASE_PROJECT_ID="yzdnjmgpfuifgdizzlpz"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6ZG5qbWdwZnVpZmdkaXp6bHB6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzg2NDMsImV4cCI6MjA4ODY1NDY0M30.SbYZGvzlxCvSiwjjPTJW3bNqqbSNNF1OBeM7a5ivipI"
VITE_SUPABASE_URL="https://yzdnjmgpfuifgdizzlpz.supabase.co"
```

### Updated `supabase/config.toml`

```toml
project_id = "yzdnjmgpfuifgdizzlpz"

[functions.send-invitation]
verify_jwt = false

[functions.accept-invitation]
verify_jwt = false

[functions.medical-chat]
verify_jwt = false

[functions.symptom-triage]
verify_jwt = false

[functions.speech-to-text]
verify_jwt = false

[functions.text-to-speech]
verify_jwt = false
```

### Secrets to configure (Supabase Dashboard → Edge Functions → Secrets)

| Secret | Where to get it | Used by |
|--------|----------------|---------|
| `LOVABLE_API_KEY` | Lovable Cloud (⚠️ may not work outside Lovable) | `medical-chat`, `symptom-triage` |
| `ELEVENLABS_API_KEY` | https://elevenlabs.io/app/settings/api-keys | `speech-to-text`, `text-to-speech` |
| `RESEND_API_KEY` | https://resend.com/api-keys | `send-invitation` |
| `APP_URL` | Your deployed app URL (e.g., `https://your-app.com`) | `send-invitation` |

> `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are auto-provided by Supabase.

### Edge functions: all 6 present ✅

| Function | Present | Secrets needed |
|----------|---------|----------------|
| `medical-chat` | ✅ | `LOVABLE_API_KEY` |
| `symptom-triage` | ✅ | `LOVABLE_API_KEY` |
| `speech-to-text` | ✅ | `ELEVENLABS_API_KEY` |
| `text-to-speech` | ✅ | `ELEVENLABS_API_KEY` |
| `send-invitation` | ✅ | `RESEND_API_KEY`, `APP_URL` |
| `accept-invitation` | ✅ | (auto-provided) |

### Migrations: all 8 ready ✅

All migrations run cleanly on a fresh project in order. Legacy marketplace tables (vendors, meals, orders) are created but unused.

### ⚠️ Remaining blockers

1. **`LOVABLE_API_KEY`**: The AI gateway (`ai.gateway.lovable.dev`) is Lovable-specific. If the key doesn't work outside Lovable Cloud, you'll need to:
   - Replace with direct Google Gemini API calls (set `GOOGLE_API_KEY`)
   - Or use OpenAI directly (set `OPENAI_API_KEY`)
   - Update `medical-chat/index.ts` and `symptom-triage/index.ts` accordingly

2. **Auth users**: Cannot be automatically migrated. Users must either:
   - Re-register on the new project
   - Be re-invited via the admin invitation flow
   - Be migrated via `supabase auth export/import` CLI commands

3. **Resend free tier**: Only sends to verified recipient emails. Add recipients in Resend dashboard or upgrade to a paid plan.

### Complete deployment sequence

```bash
# 1. Export from Lovable to GitHub
# (Settings → GitHub → Push to GitHub)

# 2. Clone and update config
git clone <your-repo>
cd <your-repo>
# Edit .env and supabase/config.toml as shown above

# 3. Link to your Supabase project
supabase link --project-ref yzdnjmgpfuifgdizzlpz

# 4. Push database schema
supabase db push

# 5. Set secrets
supabase secrets set LOVABLE_API_KEY=<your-key>
supabase secrets set ELEVENLABS_API_KEY=<your-key>
supabase secrets set RESEND_API_KEY=<your-key>
supabase secrets set APP_URL=https://your-app.com

# 6. Deploy all edge functions
supabase functions deploy

# 7. Regenerate types
supabase gen types typescript --project-id yzdnjmgpfuifgdizzlpz > src/integrations/supabase/types.ts

# 8. Configure auth settings in Supabase Dashboard
# - Authentication → Settings → Site URL
# - Authentication → Settings → Redirect URLs
# - Authentication → Settings → Enable email confirmations

# 9. Create initial admin user
# Option A: Direct SQL in Supabase Dashboard SQL Editor:
#   INSERT INTO auth.users (...) -- use supabase auth admin API instead
# Option B: Use supabase CLI:
#   supabase auth admin create-user --email admin@example.com --password <pwd>
# Then add admin role:
#   INSERT INTO public.user_roles (user_id, role) VALUES ('<user-id>', 'admin');

# 10. Build and deploy frontend
npm run build
# Deploy dist/ to your hosting (Vercel, Netlify, etc.)
```
