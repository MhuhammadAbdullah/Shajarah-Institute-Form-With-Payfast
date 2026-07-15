"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV_ITEMS } from "@/lib/admin/navigation";
import { logoutAdminAction } from "@/actions/admin-auth.actions";
import { cn } from "@/utils/cn";

const COLLAPSE_STORAGE_KEY = "shajarah-admin-sidebar-collapsed";

function isActiveHref(pathname: string, href: string): boolean {
  if (href === "/admin/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function CollapseIcon(props: { collapsed: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d={props.collapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"}
      />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function SidebarContent({ adminName, collapsed, onNavigate }: { adminName: string; collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <Link
        href="/admin/dashboard"
        onClick={onNavigate}
        className={cn("flex items-center gap-2 border-b border-slate-800 px-4 py-5 font-semibold text-white", collapsed && "justify-center px-2")}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold">SI</span>
        {!collapsed && <span className="truncate">Shajarah Institute</span>}
      </Link>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {ADMIN_NAV_ITEMS.map((item) => {
          const active = isActiveHref(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-emerald-700 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white",
                collapsed && "justify-center px-0",
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className={cn("border-t border-slate-800 p-3", collapsed && "flex flex-col items-center")}>
        {!collapsed && <p className="truncate px-1 pb-2 text-xs text-slate-400">{adminName}</p>}
        <form action={logoutAdminAction} className="w-full">
          <button
            type="submit"
            title={collapsed ? "Sign out" : undefined}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white",
              collapsed && "justify-center px-0",
            )}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {!collapsed && <span>Sign out</span>}
          </button>
        </form>
      </div>
    </div>
  );
}

export function AdminSidebar({ adminName }: { adminName: string }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(COLLAPSE_STORAGE_KEY);
    if (saved === "true") setCollapsed(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(COLLAPSE_STORAGE_KEY, String(next));
      return next;
    });
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <Link href="/admin/dashboard" className="font-semibold text-slate-900">
          Shajarah Institute — Admin
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
          aria-label="Open menu"
        >
          <MenuIcon />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} aria-hidden />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-slate-900">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              aria-label="Close menu"
            >
              <CloseIcon />
            </button>
            <SidebarContent adminName={adminName} collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className={cn("sticky top-0 hidden h-screen shrink-0 bg-slate-900 lg:flex lg:flex-col", collapsed ? "w-[76px]" : "w-64")}>
        <div className="flex-1 overflow-hidden">
          <SidebarContent adminName={adminName} collapsed={collapsed} />
        </div>
        <button
          type="button"
          onClick={toggleCollapsed}
          className="flex items-center justify-center gap-2 border-t border-slate-800 py-3 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <CollapseIcon collapsed={collapsed} />
          {!collapsed && <span>Collapse</span>}
        </button>
      </aside>
    </>
  );
}
