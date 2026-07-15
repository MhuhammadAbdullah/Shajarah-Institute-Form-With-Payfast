import { getPublicFormSchema } from "@/services/formBuilder.service";
import { listPrograms } from "@/services/program.service";
import { listCampuses } from "@/services/campus.service";
import { listSessions } from "@/services/session.service";
import { getSiteSettings } from "@/services/siteSetting.service";
import { DynamicRegistrationForm } from "@/components/registration/DynamicRegistrationForm";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [steps, programs, campuses, sessions, siteSettings] = await Promise.all([
    getPublicFormSchema(),
    listPrograms(),
    listCampuses(),
    listSessions(),
    getSiteSettings(),
  ]);

  const cmsOptions = {
    programs: programs.filter((p) => p.isActive).map((p) => ({ name: p.name })),
    campuses: campuses.filter((c) => c.isActive).map((c) => ({ name: c.name })),
    sessions: sessions.filter((s) => s.isActive).map((s) => ({ name: s.name })),
  };

  return (
    <div className="flex flex-1 flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl flex-col gap-2 px-6 py-10 sm:py-12 lg:max-w-4xl">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700 text-sm font-bold text-white">SI</span>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Shajarah Institute</p>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Program &amp; Course Registration</h1>
          <p className="max-w-xl text-base text-slate-500">
            Complete the form below and pay securely via PayFast to confirm your enrollment.
          </p>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10 sm:py-12 lg:max-w-4xl">
        <DynamicRegistrationForm steps={steps} cmsOptions={cmsOptions} maxParticipants={siteSettings.maxParticipants} />
      </main>
    </div>
  );
}
