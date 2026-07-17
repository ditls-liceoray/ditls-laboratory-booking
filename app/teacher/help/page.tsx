'use client';

import { PageHeader } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { HelpCircle, BookOpen, CalendarCheck, Bell, User, Search } from 'lucide-react';

const FAQS = [
  { q: 'How do I book a laboratory?', a: 'Navigate to "Search Class" from the sidebar, find an available laboratory, and click "Book This Lab". Fill out the booking form with your class details and submit. Your request will be sent to the administrator for approval.' },
  { q: 'How do I know if my booking is approved?', a: 'You will receive a notification in the Notifications page when your booking is approved or rejected. You can also check the status in "My Appointments".' },
  { q: 'Can I cancel a booking?', a: 'Yes, you can cancel a booking only if its status is "Pending". Once approved or completed, you cannot cancel it yourself. Contact the administrator for assistance.' },
  { q: 'What if there is a schedule conflict?', a: 'The system automatically detects conflicts when you fill out the booking form. If a conflict is detected, you will see a warning and the submission will be blocked. Choose a different time slot or laboratory.' },
  { q: 'How do I update my profile?', a: 'Go to "Profile" from the sidebar. You can update your email, contact number, profile picture, and password. Your username cannot be changed.' },
  { q: 'Can I see all laboratory bookings?', a: 'No, teachers can only see their own bookings. Administrators have access to all bookings across the system.' },
];

const GUIDES = [
  { icon: Search, title: 'Search Class', desc: 'Find available laboratories by name, date, or time.' },
  { icon: BookOpen, title: 'Book a Lab', desc: 'Submit a booking request with class details and schedule.' },
  { icon: CalendarCheck, title: 'Track Appointments', desc: 'Monitor the status of all your booking requests.' },
  { icon: Bell, title: 'Get Notified', desc: 'Receive instant updates on booking approvals and rejections.' },
  { icon: User, title: 'Manage Profile', desc: 'Update your contact info and change your password.' },
];

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Help &amp; Support" description="Guides and frequently asked questions" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><HelpCircle className="h-5 w-5" /> Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {FAQS.map((faq, i) => (
                <AccordionItem key={i} value={`item-${i}`}>
                  <AccordionTrigger className="text-sm font-medium text-left">{faq.q}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">{faq.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Quick Guides</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {GUIDES.map((g) => (
                <div key={g.title} className="flex items-start gap-3 p-3 rounded-lg border">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <g.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{g.title}</p>
                    <p className="text-xs text-muted-foreground">{g.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Need more help? Contact your system administrator for assistance with account issues or booking problems.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
