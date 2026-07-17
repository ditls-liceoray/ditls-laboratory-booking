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
  'Information Communication Technology 1','Information Communication Technology 2','Information Communication Technology 3', 'Information Communication Technology 4',
  'Accountancy, Business, and Management 1','Accountancy, Business, and Management 2','Accountancy, Business, and Management 3','Accountancy, Business, and Management 4',
  'Accountancy, Business, and Management 5','Accountancy, Business, and Management 6','Accountancy, Business, and Management 7','Accountancy, Business, and Management 8',
  'Accountancy, Business, and Management 9','Accountancy, Business, and Management 10', 
  'Humanities and Social Sciences 1','Humanities and Social Sciences 2','Humanities and Social Sciences 3','Humanities and Social Sciences 4','Humanities and Social Sciences 5',
  'Humanities and Social Sciences 6','Humanities and Social Sciences 7','Humanities and Social Sciences 8','Humanities and Social Sciences 8','Humanities and Social Sciences 9',
  'Humanities and Social Sciences 10','Humanities and Social Sciences 11','Humanities and Social Sciences 12','Humanities and Social Sciences 13','Humanities and Social Sciences 14',
  'Humanities and Social Sciences 15','Humanities and Social Sciences 16', 'Home Economics 1','Home Economics 2','Home Economics 3','Home Economics 4', 'Arts and Design 1', 'Arts and Design 2',
  'Science, Technology, Engineering, and Mathematics 1','Science, Technology, Engineering, and Mathematics 2','Science, Technology, Engineering, and Mathematics 3',
  'Science, Technology, Engineering, and Mathematics 4','Science, Technology, Engineering, and Mathematics 5','Science, Technology, Engineering, and Mathematics 6',
  'Science, Technology, Engineering, and Mathematics 7','Science, Technology, Engineering, and Mathematics 8','Science, Technology, Engineering, and Mathematics 9',
  'Science, Technology, Engineering, and Mathematics 10','Science, Technology, Engineering, and Mathematics 11','Science, Technology, Engineering, and Mathematics 12',
  'Science, Technology, Engineering, and Mathematics 13','Science, Technology, Engineering, and Mathematics 14','Science, Technology, Engineering, and Mathematics 15',
  'Science, Technology, Engineering, and Mathematics 16','Science, Technology, Engineering, and Mathematics 17','Science, Technology, Engineering, and Mathematics 18',
  'Science, Technology, Engineering, and Mathematics 19','Science, Technology, Engineering, and Mathematics 20','Science, Technology, Engineering, and Mathematics 21',
  'Science, Technology, Engineering, and Mathematics 22','Science, Technology, Engineering, and Mathematics 23','Science, Technology, Engineering, and Mathematics 24',
  'Science, Technology, Engineering, and Mathematics 25','Science, Technology, Engineering, and Mathematics 26','Science, Technology, Engineering, and Mathematics 27',
  'Science, Technology, Engineering, and Mathematics 28','Science, Technology, Engineering, and Mathematics 29','Science, Technology, Engineering, and Mathematics 30',
  'Science, Technology, Engineering, and Mathematics 31','Science, Technology, Engineering, and Mathematics 32','Science, Technology, Engineering, and Mathematics 33',
  'Science, Technology, Engineering, and Mathematics 34','Science, Technology, Engineering, and Mathematics 35','Science, Technology, Engineering, and Mathematics 36',
  'Science, Technology, Engineering, and Mathematics 37 OLD','Science, Technology, Engineering, and Mathematics 37','Science, Technology, Engineering, and Mathematics 38',
  
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
