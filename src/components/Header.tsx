'use client';

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/authContext";
import { useRouter } from "next/navigation";

export default function Header() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const initials = profile?.display_name
    ? profile.display_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-black/10 dark:border-white/10 backdrop-blur supports-[backdrop-filter]:bg-background/60 bg-background/80">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="CampusCare logo" width={28} height={28} priority />
          <span className="text-lg font-semibold tracking-tight">CampusCare</span>
        </Link>

        <nav className="hidden sm:flex items-center gap-6 text-sm text-foreground/80">
          <Link className="hover:text-foreground transition-colors" href="/">Home</Link>
          <Link className="hover:text-foreground transition-colors" href="/chat">Chat</Link>
          <Link className="hover:text-foreground transition-colors" href="/media">Wellness Hub</Link>
          {user && (
            <>
              <Link className="hover:text-foreground transition-colors" href="/dashboard">Dashboard</Link>
              <Link className="hover:text-foreground transition-colors" href="/student_matching">Peers</Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 rounded-xl border border-black/10 dark:border-white/10 px-3 py-1.5 text-sm hover:bg-black/[.04] dark:hover:bg-white/[.04] transition-colors"
              >
                <div className="size-6 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                  {initials}
                </div>
                <span className="hidden sm:inline font-medium">{profile?.display_name?.split(' ')[0] || 'Dashboard'}</span>
              </Link>
              <button
                onClick={handleSignOut}
                className="rounded-full border px-3 py-2 text-xs border-black/10 dark:border-white/15 hover:bg-black/[.04] dark:hover:bg-white/[.06] transition-colors text-foreground/60"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth"
                className="rounded-full border px-4 py-2 text-sm border-black/10 dark:border-white/15 hover:bg-black/[.04] dark:hover:bg-white/[.06] transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/auth"
                className="rounded-full bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
