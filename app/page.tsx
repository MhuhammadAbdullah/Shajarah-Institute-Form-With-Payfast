import { RegistrationForm } from "@/components/registration/RegistrationForm";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl flex-col gap-1 px-6 py-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Shajarah Institute</p>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Program & Course Registration</h1>
          <p className="text-sm text-slate-500">
            Complete the form below and pay securely via PayFast to confirm your enrollment.
          </p>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <RegistrationForm />
      </main>
    </div>
  );
}
