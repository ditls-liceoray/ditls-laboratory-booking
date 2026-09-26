'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation';

import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { supabase } from '@/lib/supabase/client';
import { logActivity } from '@/lib/api';

import type { Notification } from '@/lib/types';

import { Button } from '@/components/ui/button';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';

import { Badge } from '@/components/ui/badge';

import Image from 'next/image';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import {
  LayoutDashboard,
  Users,
  UserPlus,
  Calendar,
  CalendarCheck,
  CheckCircle,
  XCircle,
  StickyNote,
  Code,
  Settings,
  LogOut,
  Menu,
  Search,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  X,
  BookOpen,
  HelpCircle,
  UserCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  Clock,
  Building2,
  FlaskConical,
} from 'lucide-react';
import { LiceoLoader } from '@/components/ui/liceo-loader';

import { cn } from '@/lib/utils';
import { toast } from 'sonner';

/*
|--------------------------------------------------------------------------
| NAVIGATION TYPES
|--------------------------------------------------------------------------
*/

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  badge?: string;
}

interface NavGroup {
  id: 'teachers' | 'classes' | 'bookings' | 'system';
  title: string;
  children: NavItem[];
}

/*
|--------------------------------------------------------------------------
| ADMIN NAVIGATION GROUPS
|--------------------------------------------------------------------------
*/

const adminGroups: NavGroup[] = [
  {
    id: 'teachers',
    title: 'TEACHERS',
    children: [
      {
        label: 'Add Teacher',
        href: '/admin/teachers/add',
        icon: UserPlus,
      },
      {
        label: 'View Teachers',
        href: '/admin/teachers',
        icon: Users,
      },
    ],
  },

  {
    id: 'classes',
    title: 'CLASSES',
    children: [
      {
        label: 'View Classes',
        href: '/admin/classes',
        icon: BookOpen,
      },
    ],
  },

  {
    id: 'bookings',
    title: 'BOOKINGS',
    children: [
      {
        label: 'View Appointments',
        href: '/admin/appointments',
        icon: CalendarCheck,
      },
      {
        label: 'Booking Calendar',
        href: '/admin/calendar',
        icon: Calendar,
      },
      {
        label: 'Approve Bookings',
        href: '/admin/appointments?status=pending',
        icon: CheckCircle,
      },
      {
        label: 'Rejected Bookings',
        href: '/admin/appointments?status=rejected',
        icon: XCircle,
      },
      {
        label: 'Completed Bookings',
        href: '/admin/appointments?status=completed',
        icon: CalendarCheck,
      },
    ],
  },

  {
    id: 'system',
    title: 'SYSTEM',
    children: [
      {
        label: 'Notes',
        href: '/admin/notes',
        icon: StickyNote,
      },
      {
        label: 'Developer',
        href: '/admin/developer',
        icon: Code,
      },
      {
        label: 'Laboratories',
        href: '/admin/laboratories',
        icon: FlaskConical,
      },
      {
        label: 'Departments',
        href: '/admin/departments',
        icon: Building2,
      },
      {
        label: 'System Settings',
        href: '/admin/settings',
        icon: Settings,
      },
    ],
  },
];

/*
|--------------------------------------------------------------------------
| TEACHER NAVIGATION
|--------------------------------------------------------------------------
*/

const teacherNav: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/teacher/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Search Class',
    href: '/teacher/search',
    icon: Search,
  },
  {
    label: 'My Appointments',
    href: '/teacher/appointments',
    icon: CalendarCheck,
  },
  {
    label: 'Profile',
    href: '/teacher/profile',
    icon: UserCircle,
  },
  {
    label: 'Notifications',
    href: '/teacher/notifications',
    icon: Bell,
  },
  {
    label: 'Help',
    href: '/teacher/help',
    icon: HelpCircle,
  },
];

/*
|--------------------------------------------------------------------------
| CLOCK
|--------------------------------------------------------------------------
*/

function ClockDisplay() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="glass-card flex items-center gap-4 rounded-xl px-5 py-3">
      <Clock className="h-5 w-5 text-primary" />

      <div>
        <p className="text-sm font-semibold">
          {now.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </p>

        <p className="font-mono text-xs text-muted-foreground">
          {now.toLocaleTimeString('en-US')}
        </p>
      </div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| APP SHELL
|--------------------------------------------------------------------------
*/

export default function AppShell({
  children,
  role,
}: {
  children: React.ReactNode;
  role: 'admin' | 'teacher';
}) {
  const pathname = usePathname();
  const router = useRouter();

  const {
    user,
    profile,
    teacher,
    signOut,
    loading,
  } = useAuth();

  const { theme, toggleTheme } = useTheme();

  const [authChecked, setAuthChecked] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [logoutConfirm, setLogoutConfirm] =
    useState(false);

  const [notifications, setNotifications] =
    useState<Notification[]>([]);

  const [notifOpen, setNotifOpen] = useState(false);

  const [globalSearch, setGlobalSearch] = useState('');

  const searchRef = useRef<HTMLInputElement>(null);

  /*
  |--------------------------------------------------------------------------
  | AUTH CHECK
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!loading) {
      if (!user || !profile) {
        router.replace('/');
        return;
      }

      if (profile.role !== role) {
        router.replace(
          profile.role === 'admin'
            ? '/admin/dashboard'
            : '/teacher/dashboard'
        );

        return;
      }

      setAuthChecked(true);
    }
  }, [
    user,
    profile,
    loading,
    role,
    router,
  ]);

  /*
  |--------------------------------------------------------------------------
  | NOTIFICATIONS
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!user) return;

    const loadNotifs = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', {
          ascending: false,
        })
        .limit(20);

      setNotifications(
        (data || []) as Notification[]
      );
    };

    loadNotifs();

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        loadNotifs
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  /*
  |--------------------------------------------------------------------------
  | KEYBOARD SEARCH
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === 'k'
      ) {
        e.preventDefault();

        searchRef.current?.focus();
      }
    };

    window.addEventListener(
      'keydown',
      handler
    );

    return () => {
      window.removeEventListener(
        'keydown',
        handler
      );
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | NOTIFICATION COUNT
  |--------------------------------------------------------------------------
  */

  const unreadCount = notifications.filter(
    (n) => !n.read
  ).length;

  /*
  |--------------------------------------------------------------------------
  | LOGOUT
  |--------------------------------------------------------------------------
  */

  const handleLogout = async () => {
    await logActivity(
      'logout',
      `User "${profile?.username}" logged out`
    );

    await signOut();

    setLogoutConfirm(false);

    toast.success(
      'You have been logged out.'
    );

    router.replace('/');
  };

  /*
  |--------------------------------------------------------------------------
  | MARK ALL NOTIFICATIONS READ
  |--------------------------------------------------------------------------
  */

  const markAllRead = async () => {
    if (!user) return;

    await supabase
      .from('notifications')
      .update({
        read: true,
      })
      .eq('user_id', user.id)
      .eq('read', false);

    setNotifications((prev) =>
      prev.map((n) => ({
        ...n,
        read: true,
      }))
    );
  };

  /*
  |--------------------------------------------------------------------------
  | GLOBAL SEARCH
  |--------------------------------------------------------------------------
  */

  const handleGlobalSearch = (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!globalSearch.trim()) return;

    if (role === 'admin') {
      router.push(
        `/admin/classes?q=${encodeURIComponent(
          globalSearch
        )}`
      );
    } else {
      router.push(
        `/teacher/appointments?q=${encodeURIComponent(
          globalSearch
        )}`
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | DISPLAY USER
  |--------------------------------------------------------------------------
  */

  const displayName =
    role === 'admin'
      ? 'Administrator'
      : teacher
        ? `${teacher.first_name} ${teacher.last_name}`
        : 'Teacher';

  const initials =
    role === 'admin'
      ? 'AD'
      : teacher
        ? `${teacher.first_name[0] ?? ''}${teacher.last_name[0] ?? ''}`
        : 'TE';

  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  if (loading || !authChecked) {
    return (
      <LiceoLoader size="lg" fullScreen />
    );
  }

  /*
  |--------------------------------------------------------------------------
  | MAIN LAYOUT
  |--------------------------------------------------------------------------
  */

  return (
    <div className="flex min-h-screen bg-background">

      {/* ================================================================
          DESKTOP SIDEBAR
      ================================================================= */}

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))] shadow-[inset_-1px_0_0_rgba(148,163,184,0.12)] backdrop-blur-sm lg:flex">
        <SidebarContent
          pathname={pathname}
          role={role}
        />
      </aside>

      {/* ================================================================
          MOBILE SIDEBAR
      ================================================================= */}

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">

          {/* Overlay */}

          <div
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px] animate-fade-in"
            onClick={() =>
              setSidebarOpen(false)
            }
          />

          {/* Mobile Sidebar */}

          <aside className="absolute inset-y-0 left-0 flex w-64 max-w-[85vw] flex-col bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))] shadow-2xl animate-slide-up">

            <button
              onClick={() =>
                setSidebarOpen(false)
              }
              className="absolute right-3 top-3 rounded-full p-2.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white touch-target"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>

            <SidebarContent
              pathname={pathname}
              role={role}
              onNavigate={() =>
                setSidebarOpen(false)
              }
            />

          </aside>
        </div>
      )}

      {/* ================================================================
          MAIN CONTENT
      ================================================================= */}

      <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:ml-64">

        {/* ============================================================
            TOP BAR
        ============================================================= */}

        <header className="sticky top-0 z-30 flex h-16 min-w-0 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md lg:px-6">

          {/* Mobile Menu */}

          <button
            onClick={() =>
              setSidebarOpen(true)
            }
            className="shrink-0 rounded-lg p-2 hover:bg-accent lg:hidden"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Search */}

          <form
            onSubmit={handleGlobalSearch}
            className="min-w-0 max-w-md flex-1"
          >
            <div className="relative">

              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <input
                ref={searchRef}
                type="text"
                placeholder="Search... (Ctrl+K)"
                value={globalSearch}
                onChange={(e) =>
                  setGlobalSearch(
                    e.target.value
                  )
                }
                className="h-9 w-full rounded-lg border border-transparent bg-muted/60 pl-10 pr-4 text-sm outline-none transition-all focus:border-primary focus:bg-background"
              />

            </div>
          </form>

          {/* Clock */}

          <div className="hidden shrink-0 xl:block">
            <ClockDisplay />
          </div>

          {/* ==========================================================
              HEADER ACTIONS
          =========================================================== */}

          <div className="ml-auto flex shrink-0 items-center gap-1">

            {/* Theme */}

            <button
              onClick={toggleTheme}
              className="rounded-lg p-2 transition-colors hover:bg-accent"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </button>

            {/* ======================================================
                NOTIFICATIONS
            ======================================================= */}

            <div className="relative">

              <button
                onClick={() =>
                  setNotifOpen(
                    !notifOpen
                  )
                }
                className="relative rounded-lg p-2 transition-all hover:bg-accent"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />

                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-sm">
                    {unreadCount > 9
                      ? '9+'
                      : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() =>
                      setNotifOpen(false)
                    }
                  />

                  <div className="absolute right-0 z-50 mt-2 max-h-96 w-80 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-lg border bg-popover shadow-xl animate-scale-in">

                    <div className="flex items-center justify-between border-b p-3">

                      <span className="text-sm font-semibold">
                        Notifications
                      </span>

                      {unreadCount > 0 && (
                        <button
                          onClick={
                            markAllRead
                          }
                          className="text-xs text-primary hover:underline"
                        >
                          Mark all read
                        </button>
                      )}

                    </div>

                    {notifications.length ===
                      0 ? (
                      <div className="p-8 text-center text-sm text-muted-foreground">

                        <Bell className="mx-auto mb-2 h-8 w-8 opacity-40" />

                        No notifications yet

                      </div>
                    ) : (
                      notifications.map(
                        (n) => (
                          <div
                            key={n.id}
                            className={cn(
                              'border-b p-3 transition-colors last:border-0 hover:bg-accent/50',
                              !n.read &&
                              'bg-blue-50/50 dark:bg-blue-950/20'
                            )}
                          >

                            <div className="flex items-start gap-2">

                              {n.type ===
                                'success' && (
                                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                                )}

                              {n.type ===
                                'error' && (
                                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                                )}

                              {n.type ===
                                'warning' && (
                                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                                )}

                              {n.type ===
                                'info' && (
                                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                                )}

                              <div className="min-w-0 flex-1">

                                <p className="truncate text-sm font-medium">
                                  {n.title}
                                </p>

                                <p className="line-clamp-2 text-xs text-muted-foreground">
                                  {n.message}
                                </p>

                              </div>

                            </div>

                          </div>
                        )
                      )
                    )}

                  </div>
                </>
              )}

            </div>

            {/* ======================================================
                USER MENU
            ======================================================= */}

            <DropdownMenu>

              <DropdownMenuTrigger asChild>

                <button className="group flex items-center gap-2 rounded-lg p-1.5 transition-all hover:bg-accent/80">

                  <Avatar className="h-8 w-8 ring-2 ring-transparent transition-shadow group-hover:ring-primary/10">

                    {role === 'teacher' &&
                      teacher?.profile_picture && (
                        <AvatarImage
                          src={
                            teacher.profile_picture
                          }
                          alt={displayName}
                          className="object-cover"
                        />
                      )}

                    <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                      {initials}
                    </AvatarFallback>

                  </Avatar>

                  <span className="hidden max-w-32 truncate text-sm font-medium sm:block">
                    {displayName}
                  </span>

                  <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />

                </button>

              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                className="w-56 max-w-[calc(100vw-1rem)]"
              >

                <DropdownMenuLabel>

                  <p className="font-semibold">
                    {displayName}
                  </p>

                  <p className="text-xs font-normal capitalize text-muted-foreground">
                    {role}
                  </p>

                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                {role === 'teacher' && (
                  <DropdownMenuItem asChild>
                    <Link href="/teacher/profile">
                      <UserCircle className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem
                  onClick={toggleTheme}
                >
                  {theme === 'light' ? (
                    <Moon className="mr-2 h-4 w-4" />
                  ) : (
                    <Sun className="mr-2 h-4 w-4" />
                  )}

                  {theme === 'light'
                    ? 'Dark Mode'
                    : 'Light Mode'}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={() =>
                    setLogoutConfirm(true)
                  }
                  className="text-rose-600 dark:text-rose-400"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>

              </DropdownMenuContent>

            </DropdownMenu>

          </div>
        </header>

        {/* ============================================================
            PAGE CONTENT
        ============================================================= */}

        <main className="flex-1 p-4 animate-fade-in lg:p-6">
          {children}
        </main>

        {/* ============================================================
            FOOTER
        ============================================================= */}

        <footer className="border-t px-6 py-4 text-center text-xs text-muted-foreground">
          Laboratory Management and Services Department (LMSD) v2.0.0
          &middot; &copy; {new Date().getFullYear()} Liceo De Cagayan University.
          All rights reserved.
        </footer>

      </div>

      {/* ================================================================
          LOGOUT CONFIRMATION
      ================================================================= */}

      {logoutConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in"
          onClick={() =>
            setLogoutConfirm(false)
          }
        >

          <div
            className="mx-4 w-full max-w-sm rounded-lg bg-background p-6 animate-scale-in"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="mb-4 flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/40">

                <LogOut className="h-5 w-5 text-rose-600 dark:text-rose-400" />

              </div>

              <div>

                <h3 className="font-semibold">
                  Confirm Logout
                </h3>

                <p className="text-sm text-muted-foreground">
                  Are you sure you want to log out?
                </p>

              </div>

            </div>

            <div className="flex justify-end gap-2">

              <Button
                variant="outline"
                onClick={() =>
                  setLogoutConfirm(false)
                }
              >
                Cancel
              </Button>

              <Button
                variant="destructive"
                onClick={handleLogout}
              >
                Logout
              </Button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| SIDEBAR CONTENT
|--------------------------------------------------------------------------
*/

function SidebarContent({
  pathname,
  role,
  onNavigate,
}: {
  pathname: string;
  role: 'admin' | 'teacher';
  onNavigate?: () => void;
}) {
  const searchParams = useSearchParams();

  /*
  |--------------------------------------------------------------------------
  | COLLAPSIBLE GROUP STATE
  |--------------------------------------------------------------------------
  */

  const [expandedGroups, setExpandedGroups] = useState<
    Record<NavGroup['id'], boolean>
  >({
    teachers: true,
    classes: true,
    bookings: true,
    system: true,
  });

  /*
  |--------------------------------------------------------------------------
  | ACTIVE ROUTE
  |--------------------------------------------------------------------------
  */

  const isPathActive = useCallback(
    (href: string) => {
      const [basePath, queryString] =
        href.split('?');

      /*
      |----------------------------------------------------------------------
      | ROUTES WITH QUERY PARAMETERS
      |----------------------------------------------------------------------
      */

      if (queryString) {
        const targetParams =
          new URLSearchParams(
            queryString
          );

        if (pathname !== basePath) {
          return false;
        }

        let paramsMatch = true;

        targetParams.forEach(
          (value, key) => {
            if (
              searchParams.get(key) !==
              value
            ) {
              paramsMatch = false;
            }
          }
        );

        return paramsMatch;
      }

      /*
      |----------------------------------------------------------------------
      | DASHBOARD EXACT MATCH
      |----------------------------------------------------------------------
      */

      if (
        href === '/admin/dashboard' ||
        href === '/teacher/dashboard'
      ) {
        return pathname === href;
      }

      /*
      |----------------------------------------------------------------------
      | ADMIN APPOINTMENTS
      |
      | View Appointments is not active when a status
      | filter is selected.
      |----------------------------------------------------------------------
      */

      if (
        basePath ===
        '/admin/appointments'
      ) {
        if (pathname !== basePath) {
          return false;
        }

        return !searchParams.has(
          'status'
        );
      }

      /*
      |----------------------------------------------------------------------
      | NORMAL ROUTE MATCHING
      |----------------------------------------------------------------------
      */

      return (
        pathname === basePath ||
        pathname.startsWith(
          `${basePath}/`
        )
      );
    },
    [pathname, searchParams]
  );

  /*
  |--------------------------------------------------------------------------
  | CHECK IF GROUP HAS ACTIVE PAGE
  |--------------------------------------------------------------------------
  */

  const isGroupActive = useCallback(
    (group: NavGroup) => {
      return group.children.some(
        (item) =>
          isPathActive(item.href)
      );
    },
    [isPathActive]
  );

  /*
  |--------------------------------------------------------------------------
  | AUTO-OPEN ACTIVE GROUP
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const activeGroups: Partial<
      Record<
        NavGroup['id'],
        boolean
      >
    > = {};

    adminGroups.forEach(
      (group) => {
        if (
          isGroupActive(group)
        ) {
          activeGroups[
            group.id
          ] = true;
        }
      }
    );

    if (
      Object.keys(activeGroups)
        .length > 0
    ) {
      setExpandedGroups(
        (previous) => ({
          ...previous,
          ...activeGroups,
        })
      );
    }
  }, [
    isGroupActive,
  ]);

  /*
  |--------------------------------------------------------------------------
  | TOGGLE GROUP
  |--------------------------------------------------------------------------
  */

  const toggleGroup = (
    groupId: NavGroup['id']
  ) => {
    setExpandedGroups(
      (previous) => ({
        ...previous,
        [groupId]:
          !previous[groupId],
      })
    );
  };

  /*
  |--------------------------------------------------------------------------
  | NAV ITEM
  |--------------------------------------------------------------------------
  */

  const renderNavItem = (
    item: NavItem,
    nested = false
  ) => {
    const active =
      isPathActive(item.href);

    return (
      <Link
        key={item.label}
        href={item.href}
        onClick={onNavigate}
        className={cn(
          'group relative mb-1 flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 ease-out',

          nested
            ? 'ml-1 px-3 py-2.5 pl-5'
            : 'px-3 py-2.5',

          active
            ? 'bg-white/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_24px_rgba(15,23,42,0.18)]'
            : 'text-white/72 hover:bg-white/8 hover:text-white'
        )}
      >

        {/* Active Indicator */}

        <span
          className={cn(
            'absolute inset-y-1 left-1 w-0.5 rounded-full bg-white/80 transition-all duration-200',

            active
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-50'
          )}
        />

        {/* Icon */}

        <item.icon
          className={cn(
            'relative z-10 h-4 w-4 shrink-0 transition-all duration-200',

            active
              ? 'translate-x-0.5 scale-110'
              : 'group-hover:translate-x-0.5 group-hover:scale-110'
          )}
        />

        {/* Label */}

        <span className="relative z-10 truncate">
          {item.label}
        </span>

        {/* Badge */}

        {item.badge && (
          <Badge className="relative z-10 ml-auto border border-white/10 bg-white/10 text-white shadow-none">
            {item.badge}
          </Badge>
        )}

      </Link>
    );
  };

  /*
  |--------------------------------------------------------------------------
  | SIDEBAR
  |--------------------------------------------------------------------------
  */

  return (
    <>

      {/* ================================================================
          SIDEBAR HEADER
      ================================================================= */}

      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 bg-white/[0.03] px-5">

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">

          <Image
            src="/images/Ldcu_seal.png"
            alt="Liceo Logo"
            width={32}
            height={32}
            className="object-contain"
            priority
          />

        </div>

        <div className="min-w-0">

          <p className="text-sm font-bold leading-tight tracking-[0.12em] text-white/95">
            LSMD
          </p>

          <p className="text-[10px] capitalize text-white/60">
            {role} Panel
          </p>

        </div>

      </div>

      {/* ================================================================
          NAVIGATION
      ================================================================= */}

      <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">

        {role === 'admin' ? (
          <>

            {/* ========================================================
                DASHBOARD
            ========================================================= */}

            <div className="mb-5 px-1">

              {renderNavItem({
                label: 'Dashboard',
                href: '/admin/dashboard',
                icon: LayoutDashboard,
              })}

            </div>

            {/* ========================================================
                COLLAPSIBLE ADMIN GROUPS
            ========================================================= */}

            <div className="space-y-2">

              {adminGroups.map(
                (group) => {
                  const isOpen =
                    expandedGroups[
                    group.id
                    ];

                  const groupActive =
                    isGroupActive(
                      group
                    );

                  return (
                    <div
                      key={group.id}
                      className="px-1"
                    >

                      {/* ==================================================
                          CLICKABLE SECTION HEADER
                      =================================================== */}

                      <button
                        type="button"
                        onClick={() =>
                          toggleGroup(
                            group.id
                          )
                        }
                        aria-expanded={
                          isOpen
                        }
                        aria-controls={`sidebar-group-${group.id}`}
                        className={cn(
                          'group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-all duration-200',

                          groupActive
                            ? 'text-white'
                            : 'text-white/50 hover:bg-white/5 hover:text-white/80'
                        )}
                      >

                        <span
                          className={cn(
                            'text-[10px] font-semibold uppercase tracking-[0.2em] transition-colors',

                            groupActive
                              ? 'text-white/80'
                              : 'text-white/45 group-hover:text-white/70'
                          )}
                        >
                          {
                            group.title
                          }
                        </span>

                        <ChevronDown
                          className={cn(
                            'ml-auto h-3.5 w-3.5 shrink-0 transition-transform duration-200',

                            isOpen &&
                            'rotate-180',

                            groupActive
                              ? 'text-white/70'
                              : 'text-white/35'
                          )}
                        />

                      </button>

                      {/* ==================================================
                          COLLAPSIBLE CHILDREN
                      =================================================== */}

                      <div
                        id={`sidebar-group-${group.id}`}
                        className={cn(
                          'grid transition-[grid-template-rows,opacity] duration-200 ease-out',

                          isOpen
                            ? 'grid-rows-[1fr] opacity-100'
                            : 'grid-rows-[0fr] opacity-0'
                        )}
                      >

                        <div className="min-h-0 overflow-hidden">

                          <div className="space-y-1 pb-1 pl-1">

                            {group.children.map(
                              (child) =>
                                renderNavItem(
                                  child,
                                  true
                                )
                            )}

                          </div>

                        </div>

                      </div>

                    </div>
                  );
                }
              )}

            </div>

          </>
        ) : (

          /* ============================================================
              TEACHER NAVIGATION
          ============================================================= */

          <div className="space-y-1">

            {teacherNav.map(
              (item) =>
                renderNavItem(item)
            )}

          </div>
        )}

      </nav>

      {/* ================================================================
          SYSTEM STATUS
      ================================================================= */}

      <div className="shrink-0 border-t border-white/10 p-4">

        <div className="flex items-center justify-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">

          <span className="relative h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.15)]" />

          System Status

        </div>

      </div>

    </>
  );
}