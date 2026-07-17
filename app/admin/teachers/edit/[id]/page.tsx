'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import TeacherForm from '@/components/teacher-form';
import { Loader2 } from 'lucide-react';
import type { Teacher } from '@/lib/types';

export default function EditTeacherPage({ params }: { params: { id: string } }) {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .eq('id', params.id)
        .maybeSingle();
      if (error || !data) {
        setTeacher(null);
      } else {
        setTeacher(data as Teacher);
      }
      setLoading(false);
    })();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!teacher) {
    return <div className="text-center py-20 text-muted-foreground">Teacher not found.</div>;
  }

  return <TeacherForm teacher={teacher} />;
}
