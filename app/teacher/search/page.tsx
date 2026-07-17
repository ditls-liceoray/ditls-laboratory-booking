'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { fetchLaboratories, formatTime, formatDate } from '@/lib/api';
import type { Laboratory, Booking } from '@/lib/types';
import { PageHeader, EmptyState, Pagination, StatusBadge } from '@/components/shared';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Monitor, MapPin, Users, Plus, Loader2, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SearchClassPage() {
  const router = useRouter();
  const [labs, setLabs] = useState<Laboratory[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [labFilter, setLabFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const load = useCallback(async () => {
    setLoading(true);
    const [l, { data: b }] = await Promise.all([
      fetchLaboratories(),
      supabase.from('bookings').select(`*, laboratory:laboratories(*), teacher:teachers(*)`).order('booking_date', { ascending: true }),
    ]);
    setLabs(l);
    setBookings((b || []) as unknown as Booking[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Build availability: for each lab, show available slots (all-day default) minus booked slots
  const availableLabs = useMemo(() => {
    let result = labs.filter((l) => l.status === 'available');
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((l) => l.name.toLowerCase().includes(q) || (l.location || '').toLowerCase().includes(q) || (l.description || '').toLowerCase().includes(q));
    }
    if (labFilter !== 'all') result = result.filter((l) => l.id === labFilter);
    return result;
  }, [labs, search, labFilter]);

  // Show booked slots for the selected date
  const bookedSlots = useMemo(() => {
    let result = [...bookings];
    if (dateFilter) result = result.filter((b) => b.booking_date === dateFilter);
    else result = result.filter((b) => b.booking_date >= new Date().toISOString().slice(0, 10));
    return result.filter((b) => b.status === 'approved' || b.status === 'pending');
  }, [bookings, dateFilter]);

  const totalPages = Math.ceil(availableLabs.length / pageSize);
  const paged = availableLabs.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6">
      <PageHeader title="Search Class" description="Find available laboratories and book a slot" />

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by lab name, location, or description..." className="pl-10" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <select className="flex h-10 rounded-md border border-input bg-background px-3 text-sm" value={labFilter} onChange={(e) => { setLabFilter(e.target.value); setPage(1); }}>
              <option value="all">All Laboratories</option>
              {labs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <Input type="date" className="sm:w-44" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : paged.length === 0 ? (
            <EmptyState icon={Monitor} title="No laboratories found" description="Try adjusting your search filters." />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paged.map((lab) => {
                  const labBookings = bookedSlots.filter((b) => b.laboratory_id === lab.id);
                  return (
                    <Card key={lab.id} className="hover:shadow-lg transition-shadow animate-slide-up">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Monitor className="h-5 w-5 text-primary" />
                          </div>
                          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', lab.status === 'available' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-gray-100 text-gray-600')}>
                            {lab.status}
                          </span>
                        </div>
                        <h3 className="font-semibold">{lab.name}</h3>
                        <div className="space-y-1 text-sm text-muted-foreground mt-2">
                          <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> {lab.location || '—'}</p>
                          <p className="flex items-center gap-2"><Users className="h-3.5 w-3.5" /> Capacity: {lab.capacity}</p>
                        </div>
                        {lab.description && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{lab.description}</p>}

                        {labBookings.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Booked slots{dateFilter ? ` on ${formatDate(dateFilter)}` : ''}:</p>
                            <div className="space-y-1">
                              {labBookings.slice(0, 3).map((b) => (
                                <div key={b.id} className="flex items-center justify-between text-xs">
                                  <span>{formatTime(b.start_time)} - {formatTime(b.end_time)}</span>
                                  <StatusBadge status={b.status} />
                                </div>
                              ))}
                              {labBookings.length > 3 && <p className="text-xs text-muted-foreground">+{labBookings.length - 3} more</p>}
                            </div>
                          </div>
                        )}

                        <Button className="w-full mt-3" size="sm" onClick={() => router.push(`/teacher/book?lab=${lab.id}`)}>
                          <Plus className="h-4 w-4 mr-1" /> Book This Lab
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
