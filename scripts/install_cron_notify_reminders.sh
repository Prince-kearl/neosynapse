#!/usr/bin/env bash
set -euo pipefail

# Installs a small trigger script and a crontab entry to call the notify function every minute.
# Usage:
#   export SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
#   sudo ./scripts/install_cron_notify_reminders.sh

if [[ -z "${SUPABASE_URL-}" || -z "${SUPABASE_SERVICE_ROLE_KEY-}" ]]; then
  echo "ERROR: You must export SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment before running this script."
  exit 1
fi

TRIGGER_PATH="/usr/local/bin/trigger_notify_appointments.sh"

cat > "$TRIGGER_PATH" <<EOF
#!/usr/bin/env bash
# Trigger script for notify-appointments-due
SUPABASE_URL="${SUPABASE_URL}"
SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"

curl -s -X POST "${SUPABASE_URL}/functions/v1/notify-appointments-due" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{}' >/dev/null 2>&1
EOF

chmod +x "$TRIGGER_PATH"

echo "Installing crontab entry (runs every minute)..."
# Append the cron entry if it doesn't exist
CRON_ENTRY="* * * * * $TRIGGER_PATH"
(crontab -l 2>/dev/null | grep -Fv "$TRIGGER_PATH" || true; echo "$CRON_ENTRY") | crontab -

echo "Done. Crontab updated. To view: crontab -l"