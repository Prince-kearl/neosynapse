import { NotificationCenterPage } from "@/components/common/NotificationCenterPage";

export default function ProfessionalNotifications() {
  return (
    <NotificationCenterPage
      heading="Notifications"
      subheading="Clinical alerts and workflow updates"
      settingsPath="/professional/settings#notifications"
    />
  );
}
