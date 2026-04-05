import { NotificationCenterPage } from "@/components/common/NotificationCenterPage";

export default function PatientNotifications() {
  return (
    <NotificationCenterPage
      heading="Notifications"
      subheading="Patient alerts and reminders"
      settingsPath="/patient/settings#notifications"
    />
  );
}
