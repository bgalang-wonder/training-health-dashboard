"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Activity, Dumbbell } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: Activity },
  { href: "/workouts", label: "Workouts", icon: Dumbbell },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.12),_transparent_36%),linear-gradient(180deg,_#f7fbfa_0%,_#eef4f1_48%,_#f8faf9_100%)] text-neutral-900">
      <header className="sticky top-0 z-50 border-b border-white/70 elevation-2 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-8">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-teal-200 bg-teal-50 shadow-sm">
                <Activity className="h-5 w-5 text-teal-700" />
              </div>
              <div>
                <p className="label-text text-teal-700">Training Health</p>
                <p className="text-sm text-neutral-500">Prescription, execution, recovery</p>
              </div>
            </Link>
          </div>

          <nav aria-label="Primary" className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/" ? pathname === item.href : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${isActive
                      ? "border-teal-600 bg-teal-600 text-white shadow-sm"
                      : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:text-neutral-900"
                    }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col space-y-8 px-4 py-6 md:px-8 md:py-8">
        {children}
      </main>
    </div>
  );
}
