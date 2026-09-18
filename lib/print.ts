'use client';

import { formatDate, formatTime, fullName } from '@/lib/api';
import type { Booking, Teacher } from '@/lib/types';

interface PrintBookingOptions {
  title?: string;
  includeTeacher?: boolean;
  includePurpose?: boolean;
  includeExpectedStudents?: boolean;
  includeRemarks?: boolean;
  includePrintDate?: boolean;
}

export function printBooking(booking: Booking, options: PrintBookingOptions = {}) {
  const {
    title = 'Booking Slip',
    includeTeacher = true,
    includePurpose = true,
    includeExpectedStudents = false,
    includeRemarks = false,
    includePrintDate = false,
  } = options;

  const teacherName = booking.teacher ? fullName(booking.teacher) : '—';
  const labName = booking.laboratory?.name || '—';

  const w = window.open('', '_blank');
  if (!w) return;

  const rows: string[] = [];

  if (includeTeacher) {
    rows.push(`<tr><td>Teacher</td><td>${teacherName}</td></tr>`);
  }
  rows.push(`<tr><td>Class</td><td>${booking.class_name}</td></tr>`);
  rows.push(`<tr><td>Subject</td><td>${booking.subject}</td></tr>`);
  rows.push(`<tr><td>Laboratory</td><td>${labName}</td></tr>`);
  rows.push(`<tr><td>Date</td><td>${formatDate(booking.booking_date)}</td></tr>`);
  rows.push(`<tr><td>Time</td><td>${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}</td></tr>`);

  if (includePurpose) {
    rows.push(`<tr><td>Purpose</td><td>${booking.purpose}</td></tr>`);
  }
  if (includeExpectedStudents) {
    rows.push(`<tr><td>Expected Students</td><td>${booking.expected_students}</td></tr>`);
  }
  rows.push(`<tr><td>Status</td><td>${booking.status}</td></tr>`);

  if (includeRemarks && booking.remarks) {
    rows.push(`<tr><td>Remarks</td><td>${booking.remarks}</td></tr>`);
  }

  const html = `
    <html>
      <head>
        <title>${title} - ${booking.reference_no}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 600px; margin: auto; }
          h1 { color: #2563eb; }
          .ref { font-size: 24px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          td { padding: 8px; border-bottom: 1px solid #ddd; }
          td:first-child { font-weight: bold; width: 40%; color: #555; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p class="ref">${booking.reference_no}</p>
        <table>
          ${rows.join('')}
        </table>
        ${includePrintDate ? `<p style="margin-top:40px;color:#999;font-size:12px;">Printed on ${new Date().toLocaleString()}</p>` : ''}
      </body>
    </html>
  `;

  w.document.write(html);
  w.document.close();
  w.print();
}