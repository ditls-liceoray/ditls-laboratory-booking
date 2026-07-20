export const DEPARTMENTS: string[] = [
  /* 'Computer Science',
  'Information Technology',
  'Computer Engineering',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'English',
  'Filipino',
  'Social Studies', */

   "Department of Integrated Technology and Library Services"


];

export const POSITIONS: string[] = [
  'Full - Time Teacher',
  'Part-Time Teacher',
  'Assistant Teacher',
  'Associate Teacher',
  'Teaching Assistant',
];

export const COURSES: string[] = [
  'Arts and Design',
  'Home Economics', 
  'Basic Education',
  'Humanities and Social Sciences', 
  'Academic Strand – Senior High',
  'Information Communication Technology',
  'Accountancy, Business, and Management', 
  'Science, Technology, Engineering, and Mathematics',
];

export const YEAR_LEVELS: string[] = ['Grade 11', 'Grade 12', /*'3rd Year', '4th Year', '5th Year'*/];

export const EQUIPMENT_OPTIONS: string[] = [
  'Projector',
  'Whiteboard',
  'Speakers',
  'Microphone',
  'Printer',
  'Scanner',
  'Air Conditioning',
  'Smart Board',
];

export const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  rejected: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export const CALENDAR_COLORS: Record<string, string> = {
  approved: 'bg-emerald-500',
  pending: 'bg-amber-500',
  rejected: 'bg-rose-500',
  completed: 'bg-blue-500',
  cancelled: 'bg-gray-400',
};
