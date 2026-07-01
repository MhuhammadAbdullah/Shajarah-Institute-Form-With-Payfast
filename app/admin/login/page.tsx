"use client";

import { useActionState } from "react";
import { loginAdminAction, type AdminLoginState } from "@/actions/admin-auth.actions";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const initialState: AdminLoginState = {};

export default function AdminLoginPage() {
  const [state, formAction, isPending] = useActionState(loginAdminAction, initialState);

  return (
    <div className="flex flex-1 items-center justify-center bg-slate-50 px-6 py-16">
      <Card className="w-full max-w-sm">
        <h1 className="text-lg font-semibold text-slate-900">Admin Sign In</h1>
        <p className="mt-1 text-sm text-slate-500">Shajarah Institute registration dashboard.</p>

        <form action={formAction} className="mt-6 flex flex-col gap-4">
          <Field label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" required autoComplete="username" />
          </Field>
          <Field label="Password" htmlFor="password">
            <Input id="password" name="password" type="password" required autoComplete="current-password" />
          </Field>

          {state.error && (
            <p role="alert" className="text-sm text-red-600">
              {state.error}
            </p>
          )}

          <Button type="submit" loading={isPending} className="w-full">
            Sign In
          </Button>
        </form>
      </Card>
    </div>
  );
}
