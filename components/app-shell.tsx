'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { supabase } from '@/lib/supabase/client';
import { logActivity } from '@/lib/api';
import type { Notification } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  LayoutDashboard, Users, UserPlus, Calendar, CalendarCheck, CalendarX,
  CheckCircle, XCircle, StickyNote, Code, Settings, LogOut, Menu, Search,
  Bell, Sun, Moon, Monitor, ChevronDown, X, BookOpen, HelpCircle, UserCircle,
  AlertTriangle, CheckCircle2, Info, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  badge?: string;
}

interface NavGroup {
  id: 'teachers' | 'classes' | 'bookings' | 'system';
  heading: string;
  title: string;
  icon: typeof LayoutDashboard;
  children: NavItem[];
}

const adminNav: NavItem[] = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Add Teacher', href: '/admin/teachers/add', icon: UserPlus },
  { label: 'View Teachers', href: '/admin/teachers', icon: Users },
  { label: 'View Classes', href: '/admin/classes', icon: BookOpen },
  { label: 'View Appointments', href: '/admin/appointments', icon: CalendarCheck },
  { label: 'Booking Calendar', href: '/admin/calendar', icon: Calendar },
  { label: 'Approve Bookings', href: '/admin/appointments?status=pending', icon: CheckCircle },
  { label: 'Rejected Bookings', href: '/admin/appointments?status=rejected', icon: XCircle },
  { label: 'Completed Bookings', href: '/admin/appointments?status=completed', icon: CalendarCheck },
  { label: 'Notes', href: '/admin/notes', icon: StickyNote },
  { label: 'Developer', href: '/admin/developer', icon: Code },
  { label: 'System Settings', href: '/admin/settings', icon: Settings },
];

const adminGroups: NavGroup[] = [
  {
    id: 'teachers',
    heading: 'Teachers',
    title: 'TEACHERS',
    icon: Users,
    children: [
      { label: 'Add Teacher', href: '/admin/teachers/add', icon: UserPlus },
      { label: 'View Teachers', href: '/admin/teachers', icon: Users },
    ],
  },
  {
    id: 'classes',
    heading: 'View Classes',
    title: 'CLASSES',
    icon: BookOpen,
    children: [
      { label: 'View Classes', href: '/admin/classes', icon: BookOpen },
    ],
  },
  {
    id: 'bookings',
    heading: 'Bookings',
    title: 'BOOKINGS',
    icon: Calendar,
    children: [
      { label: 'View Appointments', href: '/admin/appointments', icon: CalendarCheck },
      { label: 'Booking Calendar', href: '/admin/calendar', icon: Calendar },
      { label: 'Approve Bookings', href: '/admin/appointments?status=pending', icon: CheckCircle },
      { label: 'Rejected Bookings', href: '/admin/appointments?status=rejected', icon: XCircle },
      { label: 'Completed Bookings', href: '/admin/appointments?status=completed', icon: CalendarCheck },
    ],
  },
  {
    id: 'system',
    heading: 'System',
    title: 'SYSTEM',
    icon: Settings,
    children: [
      { label: 'Notes', href: '/admin/notes', icon: StickyNote },
      { label: 'Developer', href: '/admin/developer', icon: Code },
      { label: 'System Settings', href: '/admin/settings', icon: Settings },
    ],
  },
];

const teacherNav: NavItem[] = [
  { label: 'Dashboard', href: '/teacher/dashboard', icon: LayoutDashboard },
  { label: 'Search Class', href: '/teacher/search', icon: Search },
  { label: 'My Appointments', href: '/teacher/appointments', icon: CalendarCheck },
  { label: 'Profile', href: '/teacher/profile', icon: UserCircle },
  { label: 'Notifications', href: '/teacher/notifications', icon: Bell },
  { label: 'Help', href: '/teacher/help', icon: HelpCircle },
];

export default function AppShell({ children, role }: { children: React.ReactNode; role: 'admin' | 'teacher' }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, teacher, signOut, loading } = useAuth();
  const [authChecked, setAuthChecked] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const nav = role === 'admin' ? adminNav : teacherNav;
  const defaultGroupState = () => ({
    teachers: adminGroups[0].children.some((item) => pathname === item.href || (item.href !== '/admin/dashboard' && item.href !== '/teacher/dashboard' && pathname.startsWith(item.href.split('?')[0]))),
    classes: adminGroups[1].children.some((item) => pathname === item.href || (item.href !== '/admin/dashboard' && item.href !== '/teacher/dashboard' && pathname.startsWith(item.href.split('?')[0]))),
    bookings: adminGroups[2].children.some((item) => pathname === item.href || (item.href !== '/admin/dashboard' && item.href !== '/teacher/dashboard' && pathname.startsWith(item.href.split('?')[0]))),
    system: adminGroups[3].children.some((item) => pathname === item.href || (item.href !== '/admin/dashboard' && item.href !== '/teacher/dashboard' && pathname.startsWith(item.href.split('?')[0]))),
  });
  const [expandedGroups, setExpandedGroups] = useState<Record<'teachers' | 'classes' | 'bookings' | 'system', boolean>>(defaultGroupState);

  useEffect(() => {
    setExpandedGroups((current) => ({
      teachers: current.teachers || defaultGroupState().teachers,
      classes: current.classes || defaultGroupState().classes,
      bookings: current.bookings || defaultGroupState().bookings,
      system: current.system || defaultGroupState().system,
    }));
  }, [pathname]);

  // Auth guard
  useEffect(() => {
    if (!loading) {
      if (!user || !profile) {
        router.replace('/');
        return;
      }
      if (profile.role !== role) {
        router.replace(profile.role === 'admin' ? '/admin/dashboard' : '/teacher/dashboard');
        return;
      }
      setAuthChecked(true);
    }
  }, [user, profile, loading, role, router]);

  // Load notifications
  useEffect(() => {
    if (!user) return;
    const loadNotifs = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      setNotifications((data || []) as Notification[]);
    };
    loadNotifs();
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, loadNotifs)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Keyboard shortcut: Ctrl+K for search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleLogout = async () => {
    await logActivity('logout', `User "${profile?.username}" logged out`);
    await signOut();
    setLogoutConfirm(false);
    toast.success('You have been logged out.');
    router.replace('/');
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!globalSearch.trim()) return;
    if (role === 'admin') {
      router.push(`/admin/classes?q=${encodeURIComponent(globalSearch)}`);
    } else {
      router.push(`/teacher/appointments?q=${encodeURIComponent(globalSearch)}`);
    }
  };

  const displayName = role === 'admin' ? 'Administrator' : (teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Teacher');
  const initials = role === 'admin' ? 'AD' : (teacher ? `${teacher.first_name[0] ?? ''}${teacher.last_name[0] ?? ''}` : 'TE');

  if (loading || !authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - desktop */}
      <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 left-0 z-40 bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))] shadow-[inset_-1px_0_0_rgba(148,163,184,0.12)] backdrop-blur-sm">
        <SidebarContent
          nav={nav}
          pathname={pathname}
          role={role}
          expandedGroups={expandedGroups}
          setExpandedGroups={setExpandedGroups}
        />
      </aside>

      {/* Sidebar - mobile drawer */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px] animate-fade-in" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 inset-y-0 w-64 bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))] flex flex-col shadow-2xl animate-slide-up">
            <button onClick={() => setSidebarOpen(false)} className="absolute right-3 top-3 p-1.5 rounded-full text-white/80 transition-colors duration-200 hover:bg-white/10 hover:text-white">
              <X className="h-4 w-4" />
            </button>
            <SidebarContent
              nav={nav}
              pathname={pathname}
              role={role}
              onNavigate={() => setSidebarOpen(false)}
              expandedGroups={expandedGroups}
              setExpandedGroups={setExpandedGroups}
            />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 border-b bg-background/80 backdrop-blur-md flex items-center px-4 lg:px-6 gap-3">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-accent">
            <Menu className="h-5 w-5" />
          </button>

          <form onSubmit={handleGlobalSearch} className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search... (Ctrl+K)"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="w-full h-9 pl-10 pr-4 rounded-lg bg-muted/60 border border-transparent focus:border-primary focus:bg-background text-sm outline-none transition-all"
              />
            </div>
          </form>

          <div className="flex items-center gap-1 ml-auto">
            <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-accent transition-colors" aria-label="Toggle theme">
              {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="p-2 rounded-lg hover:bg-accent transition-all duration-200 ease-out relative"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5 transition-transform duration-200 ease-out hover:scale-110" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-4 min-w-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-lg border bg-popover shadow-xl z-50 animate-scale-in scrollbar-thin">
                    <div className="flex items-center justify-between p-3 border-b">
                      <span className="font-semibold text-sm">Notifications</span>
                      {unreadCount > 0 && (
                        <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                          Mark all read
                        </button>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-sm text-muted-foreground">
                        <Bell className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        No notifications yet
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className={cn('p-3 border-b last:border-0 hover:bg-accent/50 transition-colors', !n.read && 'bg-blue-50/50 dark:bg-blue-950/20')}>
                          <div className="flex items-start gap-2">
                            {n.type === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />}
                            {n.type === 'error' && <XCircle className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />}
                            {n.type === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />}
                            {n.type === 'info' && <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{n.title}</p>
                              <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="group flex items-center gap-2 rounded-lg p-1.5 transition-all duration-200 ease-out hover:bg-accent/80">
                  <Avatar className="h-8 w-8 ring-2 ring-transparent transition-shadow duration-200 ease-out group-hover:ring-primary/10">
                    {role === 'teacher' && teacher?.profile_picture && (
                      <AvatarImage
                        src={teacher.profile_picture}
                        alt={displayName}
                        className="object-cover"
                      />
                    )}

                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:block text-sm font-medium transition-opacity duration-200 ease-out">{displayName}</span>
                  <ChevronDown className="hidden h-4 w-4 text-muted-foreground transition-transform duration-200 ease-out sm:block group-data-[state=open]:rotate-180" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="font-semibold">{displayName}</p>
                  <p className="text-xs text-muted-foreground font-normal capitalize">{role}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {role === 'teacher' && (
                  <DropdownMenuItem asChild>
                    <Link href="/teacher/profile"><UserCircle className="h-4 w-4 mr-2" /> Profile</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={toggleTheme}>
                  {theme === 'light' ? <Moon className="h-4 w-4 mr-2" /> : <Sun className="h-4 w-4 mr-2" />}
                  {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLogoutConfirm(true)} className="text-rose-600 dark:text-rose-400">
                  <LogOut className="h-4 w-4 mr-2" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 animate-fade-in">{children}</main>

        {/* Footer */}
        <footer className="border-t px-6 py-4 text-center text-xs text-muted-foreground">
          Computer and Robotics Laboratory Booking System v1.0.0 &middot; &copy; {new Date().getFullYear()} Liceo De Cagayan University. All rights reserved.
        </footer>
      </div>

      {/* Logout confirmation */}
      {logoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in" onClick={() => setLogoutConfirm(false)}>
          <div className="bg-background rounded-lg p-6 max-w-sm w-full mx-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center">
                <LogOut className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="font-semibold">Confirm Logout</h3>
                <p className="text-sm text-muted-foreground">Are you sure you want to log out?</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setLogoutConfirm(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleLogout}>Logout</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SidebarContent({
  nav,
  pathname,
  role,
  onNavigate,
  expandedGroups,
  setExpandedGroups,
}: {
  nav: NavItem[];
  pathname: string;
  role: string;
  onNavigate?: () => void;
  expandedGroups?: Record<'teachers' | 'classes' | 'bookings' | 'system', boolean>;
  setExpandedGroups?: React.Dispatch<React.SetStateAction<Record<'teachers' | 'classes' | 'bookings' | 'system', boolean>>>;
}) {
  const isPathActive = (href: string) => pathname === href || (href !== '/admin/dashboard' && href !== '/teacher/dashboard' && pathname.startsWith(href.split('?')[0]));

  const renderNavItem = (item: NavItem, nested = false) => {
    const active = isPathActive(item.href);

    return (
      <Link
        key={item.label}
        href={item.href}
        onClick={onNavigate}
        className={cn(
          'group relative mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ease-out',
          nested ? 'ml-2 pl-6' : '',
          active
            ? 'bg-white/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_24px_rgba(15,23,42,0.18)]'
            : 'text-white/72 hover:bg-white/8 hover:text-white',
        )}
      >
        <span className={cn(
          'absolute inset-y-1 left-1 w-0.5 rounded-full bg-white/80 transition-all duration-200 ease-out',
          active ? 'opacity-100' : 'opacity-0 group-hover:opacity-50',
        )} />
        <item.icon className={cn('relative z-10 h-4 w-4 shrink-0 transition-all duration-200 ease-out', active ? 'translate-x-0.5 scale-110' : 'group-hover:translate-x-0.5 group-hover:scale-110')} />
        <span className="relative z-10 truncate">{item.label}</span>
        {item.badge && <Badge className="relative z-10 ml-auto border border-white/10 bg-white/10 text-white shadow-none">{item.badge}</Badge>}
      </Link>
    );
  };

  return (
    <>
      <div className="h-16 flex items-center gap-3 px-5 border-b border-white/10 bg-white/[0.03]">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <Image
            src="/images/Ldcu_seal.png"
            alt="Liceo Logo"
            width={32}
            height={32}
            className="object-contain"
            priority
          />
        </div>

        <div>
          <p className="text-sm font-bold leading-tight tracking-[0.12em] text-white/95">DITLS</p>
          <p className="text-[10px] capitalize text-white/60">
            {role} Panel
          </p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
        {role === 'admin' ? (
          <>
            <div className="px-1 pb-2">
              {renderNavItem({ label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard })}
            </div>

            {adminGroups.map((group) => {
              const open = expandedGroups?.[group.id] ?? true;
              const groupActive = group.children.some((item) => isPathActive(item.href));

              if (group.id === 'classes') {
                return (
                  <div key={group.id} className="mb-2 px-1">
                    <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">{group.title}</p>
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => setExpandedGroups?.((prev) => ({ ...prev, [group.id]: !prev[group.id] }))}
                        className={cn(
                          'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-200 ease-out',
                          groupActive ? 'bg-white/8 text-white' : 'text-white/75 hover:bg-white/8 hover:text-white',
                        )}
                      >
                        <group.icon className={cn('h-4 w-4 shrink-0 transition-all duration-200 ease-out', groupActive ? 'text-white' : 'text-white/80 group-hover:translate-x-0.5 group-hover:scale-110')} />
                        <span className="flex-1 truncate">{group.heading}</span>
                        <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform duration-200 ease-out', open ? 'rotate-180' : 'rotate-0')} />
                      </button>

                      <div className={cn('grid transition-all duration-200 ease-out', open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
                        <div className="overflow-hidden">
                          <div className="pt-1.5 pl-2">
                            {group.children.map((child) => renderNavItem(child, true))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={group.id} className="mb-2 px-1">
                  <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">{group.title}</p>
                  <button
                    type="button"
                    onClick={() => setExpandedGroups?.((prev) => ({ ...prev, [group.id]: !prev[group.id] }))}
                    className={cn(
                      'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-200 ease-out',
                      groupActive ? 'bg-white/8 text-white' : 'text-white/75 hover:bg-white/8 hover:text-white',
                    )}
                  >
                    <group.icon className={cn('h-4 w-4 shrink-0 transition-all duration-200 ease-out', groupActive ? 'text-white' : 'text-white/80 group-hover:translate-x-0.5 group-hover:scale-110')} />
                    <span className="flex-1 truncate">{group.heading}</span>
                    <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform duration-200 ease-out', open ? 'rotate-180' : 'rotate-0')} />
                  </button>

                  <div className={cn('grid transition-all duration-200 ease-out', open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
                    <div className="overflow-hidden">
                      <div className="pt-1.5 pl-2">
                        {group.children.map((child) => renderNavItem(child, true))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          nav.map((item) => renderNavItem(item))
        )}
      </nav>
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center justify-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <span className="relative h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.15)]" />
          System Status
        </div>
      </div>
    </>
  );
}
