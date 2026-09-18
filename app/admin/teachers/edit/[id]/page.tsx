'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import TeacherForm from '@/components/teacher-form';
import { Loader2 } from 'lucide-react';
import type { Teacher } from '@/lib/types';

export default function EditTeacherPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { id } = await params;

      if (cancelled) return;

      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data) {
        setTeacher(null);
      } else {
        setTeacher(data as Teacher);
      }

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [params]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Teacher not found.
      </div>
    );
  }

  return <TeacherForm teacher={teacher} />;
}