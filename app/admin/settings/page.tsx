import { getSiteSettings } from "@/services/siteSetting.service";
import { Card, CardSection } from "@/components/ui/Card";
import { SiteSettingsForm } from "@/components/admin/SiteSettingsForm";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getSiteSettings();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">Site-wide configuration for the registration form.</p>
      </div>

      <Card>
        <CardSection title="Registration">
          <div className="sm:col-span-2">
            <SiteSettingsForm maxParticipants={settings.maxParticipants} />
          </div>
        </CardSection>
      </Card>
    </div>
  );
}
