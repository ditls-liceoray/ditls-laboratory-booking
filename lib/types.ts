export type UserRole = 'admin' | 'teacher';

export interface Profile {
  id: string;
  username: string;
  role: UserRole;
  created_at: string;
}

export interface Teacher {
  id: string;
  teacher_id: string;
  profile_id: string | null;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  email: string;
  contact_number: string | null;
  department: string;
  position: string;
  status: 'active' | 'inactive';
  profile_picture: string | null;
  created_at: string;
  updated_at: string;
}

export interface Laboratory {
  id: string;
  name: string;
  location: string | null;
  capacity: number;
  status: 'available' | 'maintenance' | 'closed';
  description: string | null;
  created_at: string;
}

export type BookingStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'cancelled';

export interface Booking {
  id: string;
  reference_no: string;
  teacher_id: string;
  laboratory_id: string;
  class_name: string;
  subject: string;
  course: string | null;
  year_level: string | null;
  section: string | null;
  purpose: string;
  description: string | null;
  booking_date: string;
  start_time: string;
  end_time: string;
  expected_students: number;
  equipment_needed: string | null;
  remarks: string | null;
  status: BookingStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  teacher?: Teacher;
  laboratory?: Laboratory;
}

export interface Notification {
  id: string;
  user_id: string;
  booking_id: string | null;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  created_at: string;
}

export type NoteType =
  | 'announcement'
  | 'maintenance'
  | 'holiday'
  | 'system'
  | 'pinned';

export interface Note {
  id: string;
  type: NoteType;
  title: string;
  content: string;
  pinned: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action: string;
  description: string | null;
  created_at: string;
  profile?: Profile;
}

export interface Setting {
  id: string;
  key: string;
  value: string;
  updated_at: string;
}
