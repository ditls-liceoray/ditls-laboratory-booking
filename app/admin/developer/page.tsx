'use client';

import { PageHeader } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Code, Github, Mail, Globe, Cpu, Database, Layers, Server, GraduationCap, Info } from 'lucide-react';

export default function DeveloperPage() {
  const info = [
    { icon: Code, label: 'Developer Name', value: 'Mr. Raymund Luceño' },
    { icon: Layers, label: 'Project Name', value: 'DITLS Computer Laboratory Booking System' },
    { icon: Cpu, label: 'System Version', value: 'v1.0.0' },
    { icon: Code, label: 'Programming Language', value: 'TypeScript / JavaScript' },
    { icon: Globe, label: 'Framework', value: 'Next.js (React) + Tailwind CSS + ShadCN UI' },
    { icon: Database, label: 'Database', value: 'Supabase (PostgreSQL)' },
    { icon: Server, label: 'Backend', value: 'Node.js / Next.js API + Supabase Edge' },
    { icon: GraduationCap, label: 'University', value: 'Liceo De Cagayan University' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Developer" description="About the system and its creators" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-lg">System Information</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {info.map((item) => (
                <div key={item.label} className="flex items-start gap-3 p-3 rounded-lg border">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{item.label}</p>
                    <p className="text-sm font-semibold mt-0.5">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">About the System</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                The Computer Laboratory Booking System (CLBS) is a modern, responsive web application designed to streamline laboratory reservations in university environments. It provides role-based access for administrators and teachers, real-time conflict detection, calendar management, and comprehensive booking tracking.
              </p>
            </div>
            <div className="space-y-2 pt-2">
              <a href="#" className="flex items-center gap-3 p-3 rounded-lg border hover:shadow-md transition-shadow group">
                <Github className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                <div>
                  <p className="text-sm font-medium">GitHub Repository</p>
                  <p className="text-xs text-muted-foreground">github.com/clbs/project (placeholder)</p>
                </div>
              </a>
              <a href="#" className="flex items-center gap-3 p-3 rounded-lg border hover:shadow-md transition-shadow group">
                <Mail className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                <div>
                  <p className="text-sm font-medium">Email Contact</p>
                  <p className="text-xs text-muted-foreground">rluceno@liceo.edu.ph (placeholder)</p>
                </div>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Computer Laboratory Booking System. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Built with React, TypeScript, Tailwind CSS, ShadCN UI, and Supabase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 
