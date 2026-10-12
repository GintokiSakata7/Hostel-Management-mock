import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Student, Building, Room, Bed, FeeRecord,
  ExpenseCategory, Expense, Complaint, ActivityLog, HostelSettings
} from '../types';
import {
  initialBuildings, initialRooms, initialStudents,
  initialFeeRecords, initialCategories, initialExpenses,
  initialComplaints, initialActivities, initialSettings
} from '../demoData';

interface DemoDataContextType {
  // State
  settings: HostelSettings;
  buildings: Building[];
  rooms: Room[];
  students: Student[];
  feeRecords: FeeRecord[];
  categories: ExpenseCategory[];
  expenses: Expense[];
  complaints: Complaint[];
  activities: ActivityLog[];
  selectedBuildingId: string; // 'all' or building ID
  activeBuildingName: string;
  selectedMonth: string; // YYYY-MM
  setSelectedBuildingId: (id: string) => void;
  setSelectedMonth: (month: string) => void;

  // Actions
  updateSettings: (newSettings: Partial<HostelSettings>) => void;
  addBuilding: (name: string, address?: string) => void;
  deleteBuilding: (id: string) => void;
  addRoom: (room: Omit<Room, 'id' | 'beds'>, bedCount: number) => void;
  deleteRoom: (id: string) => void;

  // Student Actions
  addStudent: (data: Omit<Student, 'id' | 'createdAt'>) => Student;
  updateStudent: (student: Student) => void;
  deleteStudent: (id: string) => void;
  putOnNotice: (id: string, date: string, reason: string) => void;
  vacateStudent: (id: string) => void;
  readmitStudent: (id: string, roomId?: string, bedId?: string) => void;

  // Bed Actions
  allocateBed: (studentId: string, bedId: string) => void;
  deallocateBed: (bedId: string) => void;
  transferBed: (studentId: string, newBedId: string) => void;

  // Fee & Reminder Actions
  payFee: (paymentData: {
    studentId: string;
    month?: string;
    amount: number;
    method: 'Cash' | 'UPI' | 'Bank Transfer';
    upiProvider?: 'PhonePe' | 'Google Pay' | 'Paytm' | 'BHIM' | 'Other UPI';
    transactionRef?: string;
    notes?: string;
  }) => FeeRecord;
  sendWhatsAppReminder: (student: Student, targetNumber?: string) => { url: string; message: string };
  sendBulkWhatsAppReminders: (targetNumber?: string) => { count: number; url: string; previewText: string };

  // Expense Actions
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  deleteExpense: (id: string) => void;

  // Complaint Actions
  addComplaint: (complaint: Omit<Complaint, 'id' | 'date'>) => void;
  updateComplaintStatus: (id: string, status: 'pending' | 'in-progress' | 'resolved') => void;

  // Maintenance
  resetToDemoData: () => void;
}

const STORAGE_KEY = 'HOSTEL_DEMO_DATA_STATE_MAJIN_V3';

const DemoDataContext = createContext<DemoDataContextType | undefined>(undefined);

export const DemoDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<HostelSettings>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_settings`) || localStorage.getItem('HOSTEL_DEMO_DATA_STATE_V2_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.hostelName?.includes('VMR')) parsed.hostelName = 'Majin Hostel';
      return parsed;
    }
    return initialSettings;
  });

  const [buildings, setBuildings] = useState<Building[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_buildings`) || localStorage.getItem('HOSTEL_DEMO_DATA_STATE_V2_buildings');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.map((b: Building) => ({
        ...b,
        name: b.name.replace('VMR', 'Majin'),
      }));
    }
    return initialBuildings;
  });

  const [rooms, setRooms] = useState<Room[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_rooms`);
    return saved ? JSON.parse(saved) : initialRooms;
  });

  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_students`);
    return saved ? JSON.parse(saved) : initialStudents;
  });

  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_fees`);
    return saved ? JSON.parse(saved) : initialFeeRecords;
  });

  const [categories, setCategories] = useState<ExpenseCategory[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_categories`);
    return saved ? JSON.parse(saved) : initialCategories;
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_expenses`);
    return saved ? JSON.parse(saved) : initialExpenses;
  });

  const [complaints, setComplaints] = useState<Complaint[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_complaints`);
    return saved ? JSON.parse(saved) : initialComplaints;
  });

  const [activities, setActivities] = useState<ActivityLog[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_activities`);
    return saved ? JSON.parse(saved) : initialActivities;
  });

  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-10');

  // Persistence side effects
  useEffect(() => { localStorage.setItem(`${STORAGE_KEY}_settings`, JSON.stringify(settings)); }, [settings]);
  useEffect(() => { localStorage.setItem(`${STORAGE_KEY}_buildings`, JSON.stringify(buildings)); }, [buildings]);
  useEffect(() => { localStorage.setItem(`${STORAGE_KEY}_rooms`, JSON.stringify(rooms)); }, [rooms]);
  useEffect(() => { localStorage.setItem(`${STORAGE_KEY}_students`, JSON.stringify(students)); }, [students]);
  useEffect(() => { localStorage.setItem(`${STORAGE_KEY}_fees`, JSON.stringify(feeRecords)); }, [feeRecords]);
  useEffect(() => { localStorage.setItem(`${STORAGE_KEY}_categories`, JSON.stringify(categories)); }, [categories]);
  useEffect(() => { localStorage.setItem(`${STORAGE_KEY}_expenses`, JSON.stringify(expenses)); }, [expenses]);
  useEffect(() => { localStorage.setItem(`${STORAGE_KEY}_complaints`, JSON.stringify(complaints)); }, [complaints]);
  useEffect(() => { localStorage.setItem(`${STORAGE_KEY}_activities`, JSON.stringify(activities)); }, [activities]);

  const activeBuildingName = selectedBuildingId === 'all'
    ? 'All Buildings (Combined)'
    : buildings.find(b => b.id === selectedBuildingId)?.name || 'Selected Wing';

  const logActivity = (type: ActivityLog['type'], title: string, description: string, buildingId?: string, amount?: number) => {
    const newAct: ActivityLog = {
      id: `act-${Date.now()}`,
      type,
      title,
      description,
      timestamp: 'Just now',
      buildingId,
      amount,
    };
    setActivities(prev => [newAct, ...prev.slice(0, 19)]);
  };

  // Student Actions
  const addStudent = (data: Omit<Student, 'id' | 'createdAt'>): Student => {
    const newId = `stu-${Date.now()}`;
    const newStudent: Student = {
      ...data,
      id: newId,
      createdAt: new Date().toISOString(),
    };

    setStudents(prev => [newStudent, ...prev]);

    // Mark bed occupied
    if (data.bedId) {
      setRooms(prevRooms => prevRooms.map(rm => ({
        ...rm,
        beds: rm.beds.map(bed => bed.id === data.bedId ? { ...bed, studentId: newId, status: 'occupied' } : bed),
      })));
    }

    logActivity('student_admission', 'New Resident Admitted', `${newStudent.name} admitted to course ${newStudent.course}.`, newStudent.buildingId);
    return newStudent;
  };

  const updateStudent = (updated: Student) => {
    setStudents(prev => prev.map(s => s.id === updated.id ? updated : s));
  };

  const deleteStudent = (id: string) => {
    const st = students.find(s => s.id === id);
    if (st?.bedId) {
      deallocateBed(st.bedId);
    }
    setStudents(prev => prev.filter(s => s.id !== id));
  };

  const putOnNotice = (id: string, date: string, reason: string) => {
    setStudents(prev => prev.map(s => s.id === id ? {
      ...s,
      isOnNotice: true,
      noticeVacateDate: date,
      noticeReason: reason,
    } : s));
    const st = students.find(s => s.id === id);
    if (st) {
      logActivity('bed_transfer', 'Notice Period Marked', `${st.name} submitted notice to vacate by ${date}.`, st.buildingId);
    }
  };

  const vacateStudent = (id: string) => {
    const st = students.find(s => s.id === id);
    if (st?.bedId) {
      deallocateBed(st.bedId);
    }
    setStudents(prev => prev.map(s => s.id === id ? {
      ...s,
      status: 'Vacated',
      bedId: undefined,
      roomId: undefined,
    } : s));
    if (st) {
      logActivity('bed_transfer', 'Resident Vacated', `${st.name} vacated and bed released.`, st.buildingId);
    }
  };

  const readmitStudent = (id: string, roomId?: string, bedId?: string) => {
    setStudents(prev => prev.map(s => s.id === id ? {
      ...s,
      status: 'Active',
      roomId,
      bedId,
    } : s));
    if (bedId) {
      allocateBed(id, bedId);
    }
  };

  // Bed Actions
  const allocateBed = (studentId: string, bedId: string) => {
    let targetRoomId = '';
    setRooms(prevRooms => prevRooms.map(rm => {
      const hasBed = rm.beds.some(b => b.id === bedId);
      if (hasBed) targetRoomId = rm.id;
      return {
        ...rm,
        beds: rm.beds.map(b => b.id === bedId ? { ...b, studentId, status: 'occupied' } : b),
      };
    }));

    setStudents(prev => prev.map(s => s.id === studentId ? {
      ...s,
      bedId,
      roomId: targetRoomId || s.roomId,
    } : s));
  };

  const deallocateBed = (bedId: string) => {
    setRooms(prevRooms => prevRooms.map(rm => ({
      ...rm,
      beds: rm.beds.map(b => b.id === bedId ? { ...b, studentId: null, status: 'available' } : b),
    })));

    setStudents(prev => prev.map(s => s.bedId === bedId ? {
      ...s,
      bedId: undefined,
      roomId: undefined,
    } : s));
  };

  const transferBed = (studentId: string, newBedId: string) => {
    const st = students.find(s => s.id === studentId);
    if (st?.bedId) {
      deallocateBed(st.bedId);
    }
    allocateBed(studentId, newBedId);
    if (st) {
      logActivity('bed_transfer', 'Bed Transfer Completed', `${st.name} transferred to new bed.`, st.buildingId);
    }
  };

  // Fee & Payment Actions
  const payFee = (paymentData: {
    studentId: string;
    month?: string;
    amount: number;
    method: 'Cash' | 'UPI' | 'Bank Transfer';
    upiProvider?: 'PhonePe' | 'Google Pay' | 'Paytm' | 'BHIM' | 'Other UPI';
    transactionRef?: string;
    notes?: string;
  }): FeeRecord => {
    const student = students.find(s => s.id === paymentData.studentId);
    const targetMonth = paymentData.month || selectedMonth;
    const countForMonth = feeRecords.filter(f => f.month === targetMonth).length + 1;
    const receiptNo = `${targetMonth.replace('-', '').slice(2)}-${String(countForMonth).padStart(3, '0')}`;

    const newRecord: FeeRecord = {
      id: `fee-${Date.now()}`,
      studentId: paymentData.studentId,
      month: targetMonth,
      amount: paymentData.amount,
      date: new Date().toISOString(),
      method: paymentData.method,
      upiProvider: paymentData.upiProvider,
      transactionRef: paymentData.transactionRef || (paymentData.method === 'UPI' ? `UPI/${Date.now().toString().slice(-8)}` : undefined),
      status: 'Completed',
      receiptNo,
      whatsappStatus: 'DELIVERED',
      notes: paymentData.notes,
    };

    setFeeRecords(prev => [newRecord, ...prev]);

    // Update student fee status for current month
    if (targetMonth === selectedMonth) {
      setStudents(prev => prev.map(s => s.id === paymentData.studentId ? { ...s, feeStatus: 'Paid' } : s));
    }

    logActivity(
      'fee_payment',
      'Rent Payment Received',
      `${student?.name || 'Resident'} paid ₹${paymentData.amount.toLocaleString()} for ${targetMonth} (${paymentData.method}). Receipt #${receiptNo}.`,
      student?.buildingId,
      paymentData.amount
    );

    return newRecord;
  };

  // WhatsApp Reminder Actions
  const sendWhatsAppReminder = (student: Student, targetNumber?: string): { url: string; message: string } => {
    const studentRoom = rooms.find(r => r.id === student.roomId);
    const studentBed = studentRoom?.beds.find(b => b.id === student.bedId);

    // Format professional WhatsApp notification
    const reminderMsg = 
`🔔 *FEE REMINDER - ${settings.hostelName.toUpperCase()}* 🔔
━━━━━━━━━━━━━━━━━━━━
Dear *${student.name}*,

This is a gentle reminder from the management that your hostel fee for *${selectedMonth}* is currently pending.

🏠 *Room No:* ${studentRoom?.roomNumber || 'Assigned Room'} (Bed ${studentBed?.bedNumber || 1})
💰 *Amount Due:* ₹${student.monthlyFee.toLocaleString()}
📅 *Due Date:* 5th of ${new Date().toLocaleString('en-IN', { month: 'long' })}

💳 *Pay via UPI:* ${settings.upiId}
📞 *Office / Warden Contact:* +91 ${settings.whatsappDemoNumber}

_Please forward the payment screenshot after completion to generate your official GST receipt._
━━━━━━━━━━━━━━━━━━━━`;

    // The user requested: use 9491554114 no for WhatsApp redirect
    // Use targetNumber if explicitly passed, otherwise default to the client demo number 9491554114
    const destinationPhone = targetNumber || settings.whatsappDemoNumber || '9491554114';
    const cleanPhone = destinationPhone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('91') && cleanPhone.length > 10 ? cleanPhone : `91${cleanPhone}`;
    const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(reminderMsg)}`;

    logActivity('reminder_sent', 'WhatsApp Reminder Dispatched', `Automated reminder dispatched for ${student.name} to +${formattedPhone}.`, student.buildingId);

    // Open WhatsApp Web / App
    if (typeof window !== 'undefined') {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    }

    return { url: waUrl, message: reminderMsg };
  };

  const sendBulkWhatsAppReminders = (targetNumber?: string): { count: number; url: string; previewText: string } => {
    const pendingStudents = students.filter(s => s.status === 'Active' && s.feeStatus !== 'Paid');
    const destPhone = targetNumber || settings.whatsappDemoNumber || '9491554114';
    const cleanPhone = destPhone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('91') && cleanPhone.length > 10 ? cleanPhone : `91${cleanPhone}`;

    const summaryText = 
`📢 *BATCH FEE REMINDER BROADCAST - ${settings.hostelName.toUpperCase()}* 📢
━━━━━━━━━━━━━━━━━━━━
Dear Residents & Guardians,
Monthly accommodation & mess fees for *${selectedMonth}* are due for payment.

📊 *Pending Residents:* ${pendingStudents.length} students
💳 *Official UPI ID:* ${settings.upiId}
📞 *Admin Office Helpline:* +91 ${settings.whatsappDemoNumber}

Kindly make payment via UPI or visit the warden office. Digital PDF receipts will be delivered directly via WhatsApp upon receipt.
━━━━━━━━━━━━━━━━━━━━`;

    const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(summaryText)}`;

    logActivity('reminder_sent', 'Bulk Reminders Dispatched', `Batch WhatsApp reminder triggered for ${pendingStudents.length} pending residents to +${formattedPhone}.`);

    if (typeof window !== 'undefined') {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    }

    return { count: pendingStudents.length, url: waUrl, previewText: summaryText };
  };

  // Expenses
  const addExpense = (expense: Omit<Expense, 'id'>) => {
    const newExp: Expense = {
      ...expense,
      id: `exp-${Date.now()}`,
    };
    setExpenses(prev => [newExp, ...prev]);
    logActivity('expense_added', 'Operating Expense Recorded', `${newExp.title} (₹${newExp.amount.toLocaleString()}) logged under ${newExp.category}.`, newExp.buildingId, newExp.amount);
  };

  const deleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  // Complaints
  const addComplaint = (complaint: Omit<Complaint, 'id' | 'date'>) => {
    const newCmp: Complaint = {
      ...complaint,
      id: `cmp-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
    };
    setComplaints(prev => [newCmp, ...prev]);
  };

  const updateComplaintStatus = (id: string, status: 'pending' | 'in-progress' | 'resolved') => {
    setComplaints(prev => prev.map(c => c.id === id ? {
      ...c,
      status,
      resolvedAt: status === 'resolved' ? new Date().toISOString().split('T')[0] : undefined,
    } : c));
    const target = complaints.find(c => c.id === id);
    if (target && status === 'resolved') {
      logActivity('complaint_resolved', 'Maintenance Ticket Resolved', `Ticket "${target.title}" marked as resolved.`, target.buildingId);
    }
  };

  // Buildings & Rooms
  const addBuilding = (name: string, address?: string) => {
    const newBld: Building = {
      id: `bld-${Date.now()}`,
      name,
      address,
      floorsCount: 3,
      tag: 'New Wing',
    };
    setBuildings(prev => [...prev, newBld]);
  };

  const deleteBuilding = (id: string) => {
    setBuildings(prev => prev.filter(b => b.id !== id));
    setRooms(prev => prev.filter(r => r.buildingId !== id));
  };

  const addRoom = (roomData: Omit<Room, 'id' | 'beds'>, bedCount: number) => {
    const newRoomId = `rm-${Date.now()}`;
    const newBeds: Bed[] = Array.from({ length: bedCount }, (_, i) => ({
      id: `bed-${newRoomId}-${i + 1}`,
      bedNumber: i + 1,
      roomId: newRoomId,
      status: 'available',
    }));

    const newRoom: Room = {
      ...roomData,
      id: newRoomId,
      beds: newBeds,
    };

    setRooms(prev => [...prev, newRoom]);
  };

  const deleteRoom = (id: string) => {
    setRooms(prev => prev.filter(r => r.id !== id));
  };

  const updateSettings = (newSettings: Partial<HostelSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const resetToDemoData = () => {
    localStorage.removeItem(`${STORAGE_KEY}_settings`);
    localStorage.removeItem(`${STORAGE_KEY}_buildings`);
    localStorage.removeItem(`${STORAGE_KEY}_rooms`);
    localStorage.removeItem(`${STORAGE_KEY}_students`);
    localStorage.removeItem(`${STORAGE_KEY}_fees`);
    localStorage.removeItem(`${STORAGE_KEY}_categories`);
    localStorage.removeItem(`${STORAGE_KEY}_expenses`);
    localStorage.removeItem(`${STORAGE_KEY}_complaints`);
    localStorage.removeItem(`${STORAGE_KEY}_activities`);

    setSettings(initialSettings);
    setBuildings(initialBuildings);
    setRooms(initialRooms);
    setStudents(initialStudents);
    setFeeRecords(initialFeeRecords);
    setCategories(initialCategories);
    setExpenses(initialExpenses);
    setComplaints(initialComplaints);
    setActivities(initialActivities);
    setSelectedBuildingId('all');
    setSelectedMonth('2026-10');
  };

  return (
    <DemoDataContext.Provider
      value={{
        settings,
        buildings,
        rooms,
        students,
        feeRecords,
        categories,
        expenses,
        complaints,
        activities,
        selectedBuildingId,
        activeBuildingName,
        selectedMonth,
        setSelectedBuildingId,
        setSelectedMonth,
        updateSettings,
        addBuilding,
        deleteBuilding,
        addRoom,
        deleteRoom,
        addStudent,
        updateStudent,
        deleteStudent,
        putOnNotice,
        vacateStudent,
        readmitStudent,
        allocateBed,
        deallocateBed,
        transferBed,
        payFee,
        sendWhatsAppReminder,
        sendBulkWhatsAppReminders,
        addExpense,
        deleteExpense,
        addComplaint,
        updateComplaintStatus,
        resetToDemoData,
      }}
    >
      {children}
    </DemoDataContext.Provider>
  );
};

export const useDemoData = () => {
  const context = useContext(DemoDataContext);
  if (!context) {
    throw new Error('useDemoData must be used within a DemoDataProvider');
  }
  return context;
};
