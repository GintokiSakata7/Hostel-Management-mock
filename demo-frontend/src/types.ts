export interface Bed {
  id: string;
  bedNumber: number;
  roomId: string;
  studentId?: string | null;
  status: 'available' | 'occupied' | 'maintenance';
}

export interface Room {
  id: string;
  roomNumber: string;
  floor: string;
  buildingId: string;
  sharingType: '1-Sharing' | '2-Sharing' | '3-Sharing' | '4-Sharing';
  monthlyRent: number;
  hasAC: boolean;
  hasAttachedWashroom: boolean;
  beds: Bed[];
}

export interface Building {
  id: string;
  name: string;
  tag?: string;
  address?: string;
  floorsCount: number;
}

export interface Student {
  id: string;
  name: string;
  gender: 'Male' | 'Female' | 'Other';
  dob?: string;
  phone: string;
  email: string;
  photoUrl?: string;
  course: string;
  branch: string;
  year: string;
  rollNumber: string;
  dateOfJoining: string;
  aadhar: string;
  address: string;
  pincode: string;
  state: string;
  parentName: string;
  parentPhone: string;
  parentRelationship: string;
  emergencyName: string;
  emergencyPhone: string;
  securityDeposit: number;
  monthlyFee: number;
  buildingId: string;
  roomId?: string;
  bedId?: string;
  feeStatus: 'Paid' | 'Pending' | 'Overdue';
  status: 'Active' | 'On Leave' | 'Vacated';
  isOnNotice: boolean;
  noticeVacateDate?: string;
  noticeReason?: string;
  createdAt: string;
}

export interface FeeRecord {
  id: string;
  studentId: string;
  month: string; // "YYYY-MM"
  amount: number;
  date: string;
  method: 'Cash' | 'UPI' | 'Bank Transfer';
  upiProvider?: 'PhonePe' | 'Google Pay' | 'Paytm' | 'BHIM' | 'Other UPI';
  transactionRef?: string;
  status: 'Completed' | 'Pending';
  receiptNo: string;
  whatsappStatus?: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  notes?: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  presetItems: string[];
}

export interface Expense {
  id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  paymentMethod: 'Cash' | 'UPI' | 'Bank Transfer' | 'Card';
  vendor?: string;
  notes?: string;
  buildingId?: string;
}

export interface Complaint {
  id: string;
  title: string;
  description: string;
  category: 'Wi-Fi / Internet' | 'Plumbing & Water' | 'Electrical' | 'Food & Mess' | 'Cleaning & Hygiene' | 'Furniture' | 'Other';
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'resolved';
  date: string;
  studentId: string;
  buildingId: string;
  roomId?: string;
  resolvedAt?: string;
}

export interface ActivityLog {
  id: string;
  type: 'fee_payment' | 'student_admission' | 'reminder_sent' | 'bed_transfer' | 'complaint_resolved' | 'expense_added';
  title: string;
  description: string;
  timestamp: string;
  buildingId?: string;
  amount?: number;
}

export interface HostelSettings {
  hostelName: string;
  tagline: string;
  ownerName: string;
  ownerPhone: string;
  whatsappDemoNumber: string; // 9491554114
  ownerEmail: string;
  address: string;
  city: string;
  upiId: string;
  upiQrUrl?: string;
  reminderCronSchedule: string;
  reminderTime: string;
  themeColor: string;
  currencySymbol: string;
}
