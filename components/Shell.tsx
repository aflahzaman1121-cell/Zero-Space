import Link from "next/link";
import type { User } from "@/lib/auth";
import { Flash } from "./Flash";
import { Wordmark } from "./Wordmark";

type Item = { href: string; label: string; badge?: number };
export function Shell({ user, nav, children }: { user: User; nav: Item[]; children: React.ReactNode }) {
  return (
    <div className="min-h-screen pb-24 sm:pb-8">
      <header className="no-print sticky top-0 z-20 bg-paper/95 backdrop-blur border-b border-lilac/60">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between gap-3">
          <Link href={user.role === "mentor" ? "/mentor" : "/home"}><Wordmark /></Link>
          <nav className="hidden sm:flex flex-wrap items-center gap-1">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="px-3 py-2 rounded-xl text-sm font-medium hover:bg-lilac/40">
                {n.label}{n.badge ? <span className="ml-1.5 pill pill-o">{n.badge}</span> : null}
              </Link>
            ))}
          </nav>
          <form action="/api/logout" method="post" className="flex items-center gap-2">
            <span className="hidden sm:inline text-sm text-slate">{user.full_name}</span>
            <button className="text-sm font-medium text-blue px-3 py-2 rounded-xl hover:bg-lilac/40">Sign out</button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-5"><Flash />{children}</main>
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-20 bg-white border-t border-lilac flex overflow-x-auto py-2 no-print">
        {nav.map((n) => (
          <Link key={n.href} href={n.href} className="flex-1 shrink-0 px-3 text-center text-xs font-medium text-slate py-2 min-h-[44px]">
            {n.label}{n.badge ? <span className="ml-1 text-ignite font-bold">•{n.badge}</span> : null}
          </Link>
        ))}
      </nav>
    </div>
  );
}
export const studentNav: Item[] = [{ href: "/home", label: "Home" }, { href: "/tests", label: "Tests" }, { href: "/progress", label: "Progress" }];
export const mentorNav = (unread: number): Item[] => [
  { href: "/mentor", label: "Dashboard" }, { href: "/mentor/inbox", label: "Inbox", badge: unread || undefined }, { href: "/mentor/students", label: "Students" },
  { href: "/mentor/questions", label: "Questions" }, { href: "/mentor/tests", label: "Tests" }, { href: "/mentor/parents", label: "Parents" }, { href: "/mentor/settings", label: "Settings" },
];
