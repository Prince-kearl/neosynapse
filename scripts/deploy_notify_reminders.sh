#!/usr/bin/env bash
set -euo pipefail

# Deploy notify-appointments-due function and optionally set secrets.
# Usage:
#   SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_URL=... FCM_SERVER_KEY=... \
#     APNS_BEARER_TOKEN=... APNS_TOPIC=... ./scripts/deploy_notify_reminders.sh [--project-ref <ref>]

PROJECT_REF=""
if [[ "$#" -ge 2 && "$1" == "--project-ref" ]]; then
  PROJECT_REF="$2"
fi

function supabase_cmd() {
  if [[ -n "$PROJECT_REF" ]]; then
    supabase "$@" --project-ref "$PROJECT_REF"
  else
    supabase "$@"
  fi
}

echo "Deploying notify-appointments-due Edge Function..."
if [[ -n "$PROJECT_REF" ]]; then
  supabase_cmd functions deploy notify-appointments-due
else
  supabase_cmd functions deploy notify-appointments-due
fi

echo "Setting provided secrets (if any)..."
for VAR in SUPABASE_SERVICE_ROLE_KEY SUPABASE_URL FCM_SERVER_KEY APNS_BEARER_TOKEN APNS_TOPIC; do
  VAL="${!VAR-}"
  if [[ -n "$VAL" ]]; then
    echo " - Setting secret $VAR"
    if [[ -n "$PROJECT_REF" ]]; then
      supabase_cmd secrets set "$VAR=$VAL"
    else
      supabase_cmd secrets set "$VAR=$VAL"
    fi
  fi
done

echo "Deploy complete. If you haven't, remember to run 'supabase db push' to apply migrations." 

echo "Done."