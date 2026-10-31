import React, { useState, useEffect, useMemo } from 'react';
import {
  Wallet, TrendingUp, TrendingDown, Plus, Calendar,
  Search, Filter, Trash2, Edit2, Download, RefreshCw,
  CheckCircle2, XCircle, ArrowUpRight, ArrowDownRight,
  PieChart, BarChart3, Utensils, Zap, Wrench,
  Users, Building, Package, Sparkles, FileSpreadsheet,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  ArrowRight, Clock
} from 'lucide-react';
import { useToast } from '../components/ToastContext';
import { useSettings } from '../components/SettingsContext';
import { useBuilding } from '../components/BuildingContext';
import Modal from '../components/Modal';


interface Expense {
  id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  paymentMethod: string;
  vendor?: string | null;
  notes?: string | null;
  buildingId?: string | null;
  building?: { id: string; name: string } | null;
}

interface ExpenseCategory {
  id: string;
  name: string;
  icon?: string;
  presetItems: string[];
}

interface SummaryData {
  month: string;
  monthLabel: string;
  totalRevenue: number;
  totalExpense: number;
  netProfit: number;
  profitMargin: number;
  expenseCount: number;
  categoryBreakdown: {
    category: string;
    amount: number;
    count: number;
    percentage: number;
  }[];
  monthlyTrends: {
    month: string;
    label: string;
    revenue: number;
    expense: number;
    profit: number;
  }[];
}

interface BulkItem {
  id: string;
  title: string;
  category: string;
  amount: string;
  date: string;
  paymentMethod: string;
  vendor: string;
  notes: string;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; bar: string }> = {
  'Kitchen & Groceries': { bg: 'rgba(249, 115, 22, 0.15)', text: '#f97316', border: 'rgba(249, 115, 22, 0.3)', bar: '#f97316' },
  'Utilities & Bills': { bg: 'rgba(234, 179, 8, 0.15)', text: '#eab308', border: 'rgba(234, 179, 8, 0.3)', bar: '#eab308' },
  'Maintenance & Repairs': { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6', border: 'rgba(59, 130, 246, 0.3)', bar: '#3b82f6' },
  'Staff & Wages': { bg: 'rgba(168, 85, 247, 0.15)', text: '#a855f7', border: 'rgba(168, 85, 247, 0.3)', bar: '#a855f7' },
  'Rent & Infra': { bg: 'rgba(236, 72, 153, 0.15)', text: '#ec4899', border: 'rgba(236, 72, 153, 0.3)', bar: '#ec4899' },
  'Miscellaneous': { bg: 'rgba(107, 114, 128, 0.15)', text: '#9ca3af', border: 'rgba(107, 114, 128, 0.3)', bar: '#9ca3af' },
};

const getCategoryIcon = (catName: string) => {
  switch (catName) {
    case 'Kitchen & Groceries': return <Utensils size={16} />;
    case 'Utilities & Bills': return <Zap size={16} />;
    case 'Maintenance & Repairs': return <Wrench size={16} />;
    case 'Staff & Wages': return <Users size={16} />;
    case 'Rent & Infra': return <Building size={16} />;
    default: return <Package size={16} />;
  }
};

const Finance: React.FC = () => {
  const { showToast } = useToast();
  const { settings } = useSettings();
  const { selectedBuildingId, buildings: availableBuildings } = useBuilding();

  // Helper: get current YYYY-MM
  const getCurrentMonthStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const getCurrentDateStr = () => new Date().toISOString().split('T')[0];

  const [filterMode] = useState<'month' | 'day'>('month');

  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthStr());
  const [selectedDate] = useState<string>(getCurrentDateStr());

  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  // Instant in-memory client filtering for zero tab switching lag
  const expenses = useMemo(() => {
    return allExpenses.filter(exp => {
      const matchesCategory = categoryFilter === 'All' || exp.category.toLowerCase() === categoryFilter.toLowerCase();
      const matchesSearch = !searchQuery.trim() || 
        exp.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (exp.vendor && exp.vendor.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (exp.notes && exp.notes.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [allExpenses, categoryFilter, searchQuery]);

  // Controls whether 6-month history is expanded or collapsed
  const [isHistoryExpanded, setIsHistoryExpanded] = useState<boolean>(false);

  // Modals
  const [isSingleModalOpen, setIsSingleModalOpen] = useState<boolean>(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Report Download Selection Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [reportScope, setReportScope] = useState<'monthly' | 'yearly'>('monthly');
  const [reportSelectedMonth, setReportSelectedMonth] = useState<string>(
    String(new Date().getMonth() + 1).padStart(2, '0')
  );
  const [reportSelectedYear, setReportSelectedYear] = useState<string>(
    String(new Date().getFullYear())
  );
  const [reportCategoryFilter, setReportCategoryFilter] = useState<string>('All');
  const [isGeneratingReport, setIsGeneratingReport] = useState<boolean>(false);

  const MONTH_LIST = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const YEAR_LIST = ['2024', '2025', '2026', '2027', '2028'];

  // Single Form State
  const [formData, setFormData] = useState({
    title: '',
    category: 'Kitchen & Groceries',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'Cash',
    vendor: '',
    notes: '',
    buildingId: selectedBuildingId !== 'all' ? selectedBuildingId : 'all'
  });

  // Bulk Form State (Multi-row spreadsheet mode)
  const [bulkRows, setBulkRows] = useState<BulkItem[]>([
    { id: '1', title: '', category: 'Kitchen & Groceries', amount: '', date: new Date().toISOString().split('T')[0], paymentMethod: 'Cash', vendor: '', notes: '' },
    { id: '2', title: '', category: 'Utilities & Bills', amount: '', date: new Date().toISOString().split('T')[0], paymentMethod: 'UPI', vendor: '', notes: '' },
    { id: '3', title: '', category: 'Staff & Wages', amount: '', date: new Date().toISOString().split('T')[0], paymentMethod: 'Cash', vendor: '', notes: '' },
  ]);

  // Fetch Categories
  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/finance/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch Summary
  const fetchSummary = async () => {
    try {
      const param = filterMode === 'day' ? `date=${selectedDate}` : `month=${selectedMonth}`;
      const res = await fetch(`/api/finance/summary?${param}&buildingId=${selectedBuildingId}`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch Expenses (loads full list for current date/month scope once into memory)
  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const url = filterMode === 'day' 
        ? `/api/finance/expenses?date=${selectedDate}&buildingId=${selectedBuildingId}` 
        : `/api/finance/expenses?month=${selectedMonth}&buildingId=${selectedBuildingId}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setAllExpenses(data);
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to load expenses', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchSummary();
    fetchExpenses();
  }, [selectedMonth, selectedDate, filterMode, selectedBuildingId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  // Open Single Create Modal
  const openSingleCreate = (presetTitle?: string, presetCat?: string) => {
    setEditingExpense(null);
    setFormData({
      title: presetTitle || '',
      category: presetCat || 'Kitchen & Groceries',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'Cash',
      vendor: '',
      notes: '',
      buildingId: selectedBuildingId !== 'all' ? selectedBuildingId : 'all'
    });
    setIsSingleModalOpen(true);
  };

  // Open Single Edit Modal
  const openSingleEdit = (exp: Expense) => {
    setEditingExpense(exp);
    setFormData({
      title: exp.title,
      category: exp.category,
      amount: String(exp.amount),
      date: exp.date.split('T')[0],
      paymentMethod: exp.paymentMethod || 'Cash',
      vendor: exp.vendor || '',
      notes: exp.notes || '',
      buildingId: exp.buildingId || 'all'
    });
    setIsSingleModalOpen(true);
  };

  // Save Single Expense
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.amount) {
      showToast('Please provide a title and amount', 'error');
      return;
    }

    try {
      const url = editingExpense ? `/api/finance/expenses/${editingExpense.id}` : '/api/finance/expenses';
      const method = editingExpense ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        showToast(editingExpense ? 'Expense updated successfully' : 'Expense recorded successfully', 'success');
        setIsSingleModalOpen(false);
        fetchExpenses();
        fetchSummary();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to save expense', 'error');
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  // Delete Expense
  const handleDeleteExpense = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete expense "${title}"?`)) return;

    try {
      const res = await fetch(`/api/finance/expenses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Expense deleted successfully', 'success');
        fetchExpenses();
        fetchSummary();
      } else {
        showToast('Failed to delete expense', 'error');
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  // Quick Preset Add into Multi-Row Table
  const addPresetToBulk = (presetName: string, categoryName: string) => {
    const newRow: BulkItem = {
      id: Date.now().toString() + Math.random().toString().slice(2, 6),
      title: presetName,
      category: categoryName,
      amount: '',
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'Cash',
      vendor: '',
      notes: ''
    };
    setBulkRows(prev => [...prev, newRow]);
    showToast(`Added row for "${presetName}"`, 'info');
  };

  // Update Multi-Row item
  const updateBulkRow = (id: string, field: keyof BulkItem, value: string) => {
    setBulkRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  // Add Empty Row in Multi-Row Table
  const addEmptyBulkRow = () => {
    setBulkRows(prev => [
      ...prev,
      { id: Date.now().toString(), title: '', category: 'Kitchen & Groceries', amount: '', date: new Date().toISOString().split('T')[0], paymentMethod: 'Cash', vendor: '', notes: '' }
    ]);
  };

  // Remove Row in Multi-Row Table
  const removeBulkRow = (id: string) => {
    if (bulkRows.length <= 1) {
      showToast('At least 1 row must be maintained', 'info');
      return;
    }
    setBulkRows(prev => prev.filter(r => r.id !== id));
  };

  // Save Bulk Expenses
  const handleBulkSubmit = async () => {
    const validItems = bulkRows.filter(r => r.title.trim() && Number(r.amount) > 0);
    if (validItems.length === 0) {
      showToast('Please fill out at least one item title and amount', 'info');
      return;
    }

    try {
      const res = await fetch('/api/finance/expenses/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: validItems })
      });

      if (res.ok) {
        const data = await res.json();
        showToast(`Successfully added ${data.count} expense items!`, 'success');
        setIsBulkModalOpen(false);
        // Reset rows
        setBulkRows([
          { id: '1', title: '', category: 'Kitchen & Groceries', amount: '', date: new Date().toISOString().split('T')[0], paymentMethod: 'Cash', vendor: '', notes: '' },
          { id: '2', title: '', category: 'Utilities & Bills', amount: '', date: new Date().toISOString().split('T')[0], paymentMethod: 'UPI', vendor: '', notes: '' }
        ]);
        fetchExpenses();
        fetchSummary();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to add bulk expenses', 'error');
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  // Render & Print Mart-Style Detailed PDF Financial Statement
  const renderMartPDFReport = (
    targetExpenses: Expense[],
    targetSummary: SummaryData | null,
    periodTitle: string,
    scope: 'monthly' | 'yearly',
    targetWin?: Window | null
  ) => {
    const hostelName = settings?.hostelName || 'VMR Hostel';
    const adminName = settings?.adminName || 'Hostel Owner / Manager';
    const hostelAddress = settings?.hostelAddress || '';
    const hostelPhone = settings?.hostelPhone || '';

    const totalExpense = targetExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const totalIncome = targetSummary?.totalRevenue || 0;
    const netSavings = targetSummary?.netProfit ?? (totalIncome - totalExpense);

    // Calculate category breakdown
    const categoryTotals: Record<string, number> = {};
    targetExpenses.forEach(e => {
      const cat = e.category || 'Other';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(e.amount || 0);
    });

    const reportNo = `HST-STMT-${scope === 'yearly' ? 'ANNUAL-' : ''}${new Date().getTime().toString().substring(6)}`;
    const generatedOn = new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const win = targetWin || window.open('', '_blank', 'width=1050,height=850');
    if (!win) {
      showToast('Please allow popups to generate the PDF report', 'error');
      return;
    }

    win.document.open();

    const rowsHtml = targetExpenses.map((item, idx) => `
      <tr>
        <td style="text-align: center; color: #64748b; font-weight: 600;">${idx + 1}</td>
        <td>
          <div style="font-weight: 700; color: #0f172a; font-size: 13px;">${item.title}</div>
          ${item.notes ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">Note: ${item.notes}</div>` : ''}
        </td>
        <td>
          <span style="background: #f1f5f9; color: #334155; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; display: inline-block;">
            ${item.category}
          </span>
        </td>
        <td style="color: #475569; font-weight: 500;">
          ${item.date ? new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
        </td>
        <td>
          <span style="color: ${item.paymentMethod === 'Cash' ? '#16a34a' : '#2563eb'}; font-weight: 700; font-size: 11px;">
            ${item.paymentMethod || 'Cash'}
          </span>
        </td>
        <td style="color: #475569;">${item.vendor || '—'}</td>
        <td style="text-align: right; font-weight: 800; color: #0f172a; font-size: 13px;">
          ₹${Number(item.amount).toLocaleString('en-IN')}
        </td>
      </tr>
    `).join('');

    const categoryRowsHtml = Object.entries(categoryTotals).map(([cat, amt]) => {
      const pct = totalExpense > 0 ? ((amt / totalExpense) * 100).toFixed(1) : '0';
      return `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
          <div>
            <div style="font-weight: 700; color: #1e293b; font-size: 12px;">${cat}</div>
            <div style="font-size: 10px; color: #64748b; margin-top: 1px;">${pct}% of total spent</div>
          </div>
          <div style="font-weight: 800; color: #ea580c; font-size: 14px;">
            ₹${amt.toLocaleString('en-IN')}
          </div>
        </div>
      `;
    }).join('');

    const monthlyTrendsHtml = (targetSummary?.monthlyTrends || []).map((t) => `
      <tr>
        <td style="font-weight: 700; color: #0f172a;">${t.label || t.month}</td>
        <td style="text-align: right; color: #16a34a; font-weight: 700;">₹${Number(t.revenue || 0).toLocaleString('en-IN')}</td>
        <td style="text-align: right; color: #ea580c; font-weight: 700;">₹${Number(t.expense || 0).toLocaleString('en-IN')}</td>
        <td style="text-align: right; color: ${t.profit >= 0 ? '#2563eb' : '#dc2626'}; font-weight: 800;">₹${Number(t.profit || 0).toLocaleString('en-IN')}</td>
      </tr>
    `).join('');

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${hostelName} - ${periodTitle}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            background: #ffffff;
            color: #0f172a;
            padding: 40px;
            font-size: 12px;
            line-height: 1.5;
          }
          @media print {
            body { padding: 20px; }
            .no-print { display: none !important; }
          }
          
          .header-container {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 3px solid #ea580c;
            padding-bottom: 20px;
            margin-bottom: 24px;
          }
          .brand-name {
            font-size: 26px;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: -0.5px;
          }
          .brand-subtitle {
            color: #64748b;
            font-size: 12px;
            margin-top: 4px;
            font-weight: 500;
          }
          
          .statement-badge {
            background: #fff7ed;
            border: 1px solid #fed7aa;
            color: #ea580c;
            font-size: 11px;
            font-weight: 800;
            padding: 5px 12px;
            border-radius: 20px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            display: inline-block;
            margin-bottom: 6px;
          }
          
          .summary-banner {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            margin-bottom: 28px;
          }
          .summary-card {
            border-radius: 12px;
            padding: 16px 18px;
            border: 1px solid #e2e8f0;
          }
          .summary-card.income { background: #f0fdf4; border-color: #bbf7d0; }
          .summary-card.expense { background: #fff7ed; border-color: #fed7aa; }
          .summary-card.savings { background: #eff6ff; border-color: #bfdbfe; }
          
          .card-title {
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            margin-bottom: 4px;
          }
          .summary-card.income .card-title { color: #166534; }
          .summary-card.expense .card-title { color: #c2410c; }
          .summary-card.savings .card-title { color: #1e40af; }
          
          .card-amount {
            font-size: 24px;
            font-weight: 800;
            letter-spacing: -0.5px;
          }
          .summary-card.income .card-amount { color: #15803d; }
          .summary-card.expense .card-amount { color: #ea580c; }
          .summary-card.savings .card-amount { color: #2563eb; }

          .section-heading {
            font-size: 14px;
            font-weight: 800;
            color: #0f172a;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }

          .category-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            margin-bottom: 28px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 28px;
            font-size: 12px;
          }
          th {
            background: #0f172a;
            color: #ffffff;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.5px;
            padding: 10px 12px;
            text-align: left;
          }
          td {
            padding: 11px 12px;
            border-bottom: 1px solid #e2e8f0;
          }
          tr:nth-child(even) td {
            background: #fafafa;
          }
          
          .tfoot-total td {
            background: #f8fafc;
            border-top: 2px solid #0f172a;
            border-bottom: 2px solid #0f172a;
            font-size: 14px;
            font-weight: 800;
            color: #0f172a;
            padding: 14px 12px;
          }

          .footer-section {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px dashed #cbd5e1;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .sign-box {
            text-align: center;
            width: 220px;
          }
          .sign-line {
            border-top: 2px solid #0f172a;
            margin-top: 45px;
            padding-top: 6px;
            font-weight: 800;
            font-size: 12px;
            color: #0f172a;
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px; text-align: right;">
          <button onclick="window.print()" style="background: #ea580c; color: #fff; border: none; padding: 10px 20px; font-weight: 700; border-radius: 8px; cursor: pointer; font-size: 14px; font-family: inherit;">
            🖨️ Save as PDF / Print Statement
          </button>
        </div>

        <div class="header-container">
          <div>
            <div class="brand-name">${hostelName}</div>
            <div class="brand-subtitle">
              ${hostelAddress ? hostelAddress + ' · ' : ''}${hostelPhone ? 'Phone: ' + hostelPhone : 'Official Hostel Hisab-Kitab Statement'}
            </div>
          </div>
          <div style="text-align: right;">
            <div class="statement-badge">${scope === 'yearly' ? 'Annual Audit Statement' : 'Supermarket & Mart Style Audit Statement'}</div>
            <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 4px;">Period: ${periodTitle}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Statement Ref: ${reportNo}</div>
          </div>
        </div>

        <!-- KPI SUMMARY -->
        <div class="summary-banner">
          <div class="summary-card income">
            <div class="card-title">Total Fee Income (Kamai)</div>
            <div class="card-amount">₹${totalIncome.toLocaleString('en-IN')}</div>
          </div>
          <div class="summary-card expense">
            <div class="card-title">Total Hostel Expenses (Kharcha)</div>
            <div class="card-amount">₹${totalExpense.toLocaleString('en-IN')}</div>
          </div>
          <div class="summary-card savings">
            <div class="card-title">Net Profit / Savings (Bachat)</div>
            <div class="card-amount">₹${netSavings.toLocaleString('en-IN')}</div>
          </div>
        </div>

        ${scope === 'yearly' && monthlyTrendsHtml ? `
          <div class="section-heading">
            <span>Annual Monthly Comparison Breakdown</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th style="text-align: right;">Revenue (₹)</th>
                <th style="text-align: right;">Expense (₹)</th>
                <th style="text-align: right;">Net Profit / Loss (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${monthlyTrendsHtml}
            </tbody>
          </table>
        ` : ''}

        <!-- CATEGORY WISE SUMMARY -->
        <div class="section-heading">
          <span>Department & Category Breakdown</span>
          <span style="font-size: 11px; color: #64748b; font-weight: 500;">${Object.keys(categoryTotals).length} Active Categories</span>
        </div>
        <div class="category-grid">
          ${categoryRowsHtml}
        </div>

        <!-- DETAILED AUDIT TABLE -->
        <div class="section-heading">
          <span>Itemized Expense Ledger (${targetExpenses.length} Total Items Billed)</span>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">#</th>
              <th>Expense Item / Description</th>
              <th>Category</th>
              <th>Date</th>
              <th>Payment</th>
              <th>Vendor / Paid To</th>
              <th style="text-align: right;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr class="tfoot-total">
              <td colspan="6" style="text-align: right; text-transform: uppercase; letter-spacing: 0.5px;">Grand Total Expense:</td>
              <td style="text-align: right; color: #ea580c;">₹${totalExpense.toLocaleString('en-IN')}</td>
            </tr>
          </tfoot>
        </table>

        <!-- FOOTER & SIGNATURE STAMP -->
        <div class="footer-section">
          <div>
            <div style="font-weight: 700; color: #0f172a; font-size: 12px;">Computer Generated Audit Report</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Verified & Generated on ${generatedOn}</div>
            <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">System ID: ${reportNo} · Authorized for ${adminName}</div>
          </div>
          <div class="sign-box">
            <div style="font-size: 11px; color: #64748b; font-weight: 600;">Authorized Stamp</div>
            <div class="sign-line">Hostel Owner / Manager Signature</div>
          </div>
        </div>
      </body>
      </html>
    `);

    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
    }, 600);
  };

  // Fetch & Execute Customized Report Generation
  const handleExecuteGeneratePDF = async () => {
    // Open popup window IMMEDIATELY on user click gesture so browser popup blockers NEVER block it
    const printWin = window.open('', '_blank', 'width=1050,height=850');
    if (!printWin) {
      showToast('Popup blocker prevented opening statement window. Please allow popups for this site.', 'error');
      return;
    }

    // Write initial loading state inside pre-opened tab
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Generating Statement...</title>
          <style>
            body {
              margin: 0; background: #0f172a; color: #ffffff;
              font-family: system-ui, -apple-system, sans-serif;
              display: flex; flex-direction: column;
              align-items: center; justify-content: center;
              height: 100vh; text-align: center;
            }
            .spinner {
              width: 48px; height: 48px; border: 4px solid rgba(255,255,255,0.1);
              border-left-color: #3b82f6; border-radius: 50%;
              animation: spin 1s linear infinite; margin-bottom: 20px;
            }
            @keyframes spin { to { transform: rotate(360deg); } }
          </style>
        </head>
        <body>
          <div class="spinner"></div>
          <h2 style="font-weight:700; margin:0 0 8px 0;">Generating Financial Statement...</h2>
          <p style="color:#94a3b8; margin:0; font-size:14px;">Fetching accounting data & formatting PDF document.</p>
        </body>
      </html>
    `);

    setIsGeneratingReport(true);
    try {
      let expensesUrl = '';
      let summaryUrl = '';
      let periodTitle = '';

      if (reportScope === 'monthly') {
        const monthParam = `${reportSelectedYear}-${reportSelectedMonth}`;
        const monthName = MONTH_LIST.find(m => m.value === reportSelectedMonth)?.label || '';
        periodTitle = `${monthName} ${reportSelectedYear}`;

        expensesUrl = `/api/finance/expenses?month=${monthParam}`;
        if (reportCategoryFilter !== 'All') {
          expensesUrl += `&category=${encodeURIComponent(reportCategoryFilter)}`;
        }
        summaryUrl = `/api/finance/summary?month=${monthParam}`;
      } else {
        periodTitle = `Annual Financial Audit ${reportSelectedYear}`;
        expensesUrl = `/api/finance/expenses?year=${reportSelectedYear}`;
        if (reportCategoryFilter !== 'All') {
          expensesUrl += `&category=${encodeURIComponent(reportCategoryFilter)}`;
        }
        summaryUrl = `/api/finance/summary?year=${reportSelectedYear}`;
      }

      const [expRes, sumRes] = await Promise.all([
        fetch(expensesUrl),
        fetch(summaryUrl)
      ]);

      if (!expRes.ok || !sumRes.ok) {
        showToast('Failed to fetch data for selected report period', 'error');
        printWin.close();
        setIsGeneratingReport(false);
        return;
      }

      const fetchedExpenses: Expense[] = await expRes.json();
      const fetchedSummary: SummaryData = await sumRes.json();

      if (fetchedExpenses.length === 0) {
        showToast(`No expense records found for ${periodTitle}`, 'info');
        printWin.close();
        setIsGeneratingReport(false);
        return;
      }

      renderMartPDFReport(fetchedExpenses, fetchedSummary, periodTitle, reportScope, printWin);
      setIsReportModalOpen(false);
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Error generating report', 'error');
      if (printWin && !printWin.closed) {
        printWin.close();
      }
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Helper for navigating months
  const goToPrevMonth = () => {
    const [yr, mo] = selectedMonth.split('-').map(Number);
    const d = new Date(yr, mo - 2, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const goToNextMonth = () => {
    const [yr, mo] = selectedMonth.split('-').map(Number);
    const d = new Date(yr, mo, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  // Find latest active month if current has 0 records
  const latestActiveMonth = useMemo(() => {
    if (!summary?.monthlyTrends) return null;
    const activeTrends = [...summary.monthlyTrends].reverse().find(t => (t.revenue > 0 || t.expense > 0));
    return activeTrends || null;
  }, [summary]);

  // Max value for 6-month chart scaling
  const maxTrendVal = useMemo(() => {
    if (!summary?.monthlyTrends || summary.monthlyTrends.length === 0) return 100000;
    const max = Math.max(...summary.monthlyTrends.map(t => Math.max(t.revenue, t.expense)));
    return max > 0 ? max : 100000;
  }, [summary]);

  const totalRev = summary?.totalRevenue || 0;
  const totalExp = summary?.totalExpense || 0;
  const netProfit = summary?.netProfit !== undefined ? summary.netProfit : (totalRev - totalExp);
  const profitMargin = summary?.profitMargin !== undefined ? summary.profitMargin : (totalRev > 0 ? Number(((totalRev - totalExp) / totalRev * 100).toFixed(1)) : 0);
  const isCurrentMonthEmpty = totalRev === 0 && totalExp === 0;

  // Preset items across categories for 1-click quick add chips
  const ALL_PRESET_ITEMS = [
    { title: 'Vegetables', cat: 'Kitchen & Groceries', icon: '🥬' },
    { title: 'Meat & Poultry', cat: 'Kitchen & Groceries', icon: '🍗' },
    { title: 'Rice & Flours', cat: 'Kitchen & Groceries', icon: '🍚' },
    { title: 'Electricity Bill', cat: 'Utilities & Bills', icon: '⚡' },
    { title: 'Wifi Internet', cat: 'Utilities & Bills', icon: '📶' },
    { title: 'Appliance Repair', cat: 'Maintenance & Repairs', icon: '🔧' },
    { title: 'Hostel Rent', cat: 'Rent & Infra', icon: '🏢' },
    { title: 'Staff Wages', cat: 'Staff & Wages', icon: '👥' },
    { title: 'Water Cans', cat: 'Kitchen & Groceries', icon: '💧' },
  ];

  return (
    <div className="finance-page">
      
      {/* ─── 1. EXECUTIVE HEADER & FISCAL NAVIGATOR ────────────────────────────── */}
      <div className="finance-header-card">
        <div className="finance-header-brand">
          <div className="finance-brand-icon">
            <Wallet size={26} />
          </div>
          <div>
            <h1 className="finance-brand-title">
              Finance & Accounting Ledger
            </h1>
            <p className="finance-brand-subtitle">
              Monitor student revenue collections, daily operating expenditures, and monthly profit margins
            </p>
          </div>
        </div>

        {/* Action Controls & Fiscal Navigator */}
        <div className="finance-header-actions">
          {/* Fiscal Month Navigator */}
          <div className="fiscal-navigator">
            <button
              onClick={goToPrevMonth}
              className="fiscal-nav-btn"
              title="Previous Month"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="fiscal-current-label">
              <Calendar size={14} color="var(--primary)" />
              <select
                className="fiscal-select"
                value={selectedMonth.split('-')[1] || '09'}
                onChange={(e) => {
                  const yr = selectedMonth.split('-')[0] || '2026';
                  setSelectedMonth(`${yr}-${e.target.value}`);
                }}
              >
                {MONTH_LIST.map(m => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>

              <select
                className="fiscal-select"
                value={selectedMonth.split('-')[0] || '2026'}
                onChange={(e) => {
                  const mo = selectedMonth.split('-')[1] || '09';
                  setSelectedMonth(`${e.target.value}-${mo}`);
                }}
              >
                {YEAR_LIST.map(y => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={goToNextMonth}
              className="fiscal-nav-btn"
              title="Next Month"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="finance-action-buttons-wrap">
            {/* Add Single Expense */}
            <button
              onClick={() => openSingleCreate()}
              className="btn-finance-primary"
              id="btn-add-single-expense"
            >
              <Plus size={16} />
              <span>Record Expense</span>
            </button>

            {/* Multi-Row Spreadsheet Quick Entry */}
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="btn-finance-secondary"
              id="btn-fast-multi-add"
            >
              <FileSpreadsheet size={16} />
              <span>Fast Multi-Add</span>
            </button>

            {/* Download Statement */}
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="btn-finance-report"
              id="btn-download-pdf-statement"
              title="Download & Print Detailed Customized PDF Financial Statement"
            >
              <Download size={16} />
              <span>Statement</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── EMPTY CURRENT MONTH HELPER BANNER ───────────────────────────────── */}
      {isCurrentMonthEmpty && latestActiveMonth && latestActiveMonth.month !== selectedMonth && (
        <div className="finance-jump-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={16} color="var(--primary)" />
            <span style={{ fontSize: '0.84rem', color: 'var(--text-main)', fontWeight: 500 }}>
              Viewing {summary?.monthLabel || selectedMonth} (no recorded expenses yet). Latest active hisab-kitab is in <strong>{latestActiveMonth.label}</strong>.
            </span>
          </div>
          <button
            onClick={() => setSelectedMonth(latestActiveMonth.month)}
            className="finance-jump-btn"
          >
            <span>Jump to {latestActiveMonth.label} (₹{latestActiveMonth.revenue.toLocaleString('en-IN')})</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* ─── 2. EXECUTIVE FINANCIAL HUD (4 CARDS) ────────────────────────────── */}
      <div className="finance-hud-grid">
        {/* Net Savings / Free Cashflow (Hero Highlight) */}
        <div className={`finance-kpi-card hero-net ${netProfit < 0 ? 'negative' : ''}`}>
          <div className="finance-kpi-header">
            <span className="finance-kpi-label">Net Free Cashflow</span>
            <div
              className="finance-kpi-badge"
              style={{
                background: netProfit >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                color: netProfit >= 0 ? '#10b981' : '#ef4444'
              }}
            >
              {netProfit >= 0 ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
            </div>
          </div>
          <div
            className="finance-kpi-value"
            style={{ color: netProfit >= 0 ? '#10b981' : '#ef4444' }}
          >
            {netProfit >= 0 ? '+' : ''}₹{netProfit.toLocaleString('en-IN')}
          </div>
          <div className="finance-kpi-footer">
            <span style={{
              background: netProfit >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              color: netProfit >= 0 ? '#10b981' : '#ef4444',
              padding: '2px 8px',
              borderRadius: '6px',
              fontWeight: 800,
              fontSize: '0.74rem'
            }}>
              {profitMargin}% Margin
            </span>
            <span>Retained surplus cash</span>
          </div>
        </div>

        {/* Total Fee Income */}
        <div className="finance-kpi-card income-card">
          <div className="finance-kpi-header">
            <span className="finance-kpi-label">Collected Income</span>
            <div className="finance-kpi-badge" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="finance-kpi-value" style={{ color: '#3b82f6' }}>
            ₹{totalRev.toLocaleString('en-IN')}
          </div>
          <div className="finance-kpi-footer">
            <CheckCircle2 size={13} color="#3b82f6" />
            <span>Student fee payments received</span>
          </div>
        </div>

        {/* Total Operating Expenses */}
        <div className="finance-kpi-card expense-card">
          <div className="finance-kpi-header">
            <span className="finance-kpi-label">Operating Expenses</span>
            <div className="finance-kpi-badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>
              <TrendingDown size={20} />
            </div>
          </div>
          <div className="finance-kpi-value" style={{ color: '#ef4444' }}>
            ₹{totalExp.toLocaleString('en-IN')}
          </div>
          <div className="finance-kpi-footer">
            <span>{summary?.expenseCount ?? expenses.length} expense transactions billed</span>
          </div>
        </div>

        {/* Margin & Cost Efficiency Gauge */}
        <div className="finance-kpi-card margin-card">
          <div className="finance-kpi-header">
            <span className="finance-kpi-label">Cost Burn Efficiency</span>
            <div className="finance-kpi-badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' }}>
              <PieChart size={20} />
            </div>
          </div>
          <div className="finance-kpi-value" style={{ color: '#f59e0b' }}>
            {totalRev > 0 ? (100 - profitMargin).toFixed(1) : 0}%
          </div>
          <div style={{
            width: '100%',
            height: '6px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '4px',
            marginTop: '8px',
            overflow: 'hidden',
            display: 'flex'
          }}>
            <div
              style={{
                width: `${Math.min(100, Math.max(0, totalRev > 0 ? (totalExp / totalRev) * 100 : 0))}%`,
                height: '100%',
                background: '#ef4444',
                transition: 'width 0.4s ease'
              }}
              title="Operating Expenses"
            />
            <div
              style={{
                width: `${Math.min(100, Math.max(0, profitMargin))}%`,
                height: '100%',
                background: '#10b981',
                transition: 'width 0.4s ease'
              }}
              title="Net Profit"
            />
          </div>
          <div className="finance-kpi-footer" style={{ justifyContent: 'space-between' }}>
            <span style={{ color: '#ef4444' }}>● Cost: ₹{totalExp.toLocaleString('en-IN')}</span>
            <span style={{ color: '#10b981' }}>● Profit: ₹{netProfit.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* ─── 3. TWO-COLUMN ANALYTICS SECTION ─────────────────────────────────── */}
      <div className="finance-analytics-grid">
        {/* Left: 6-Month Cashflow & Profit Trends */}
        <div className="finance-chart-card">
          <div className="finance-card-title-row">
            <h3 className="finance-card-title">
              <BarChart3 size={19} color="var(--primary)" />
              <span>6-Month Comparative Cashflow Trends</span>
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.76rem', fontWeight: 700 }}>
              <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
                Revenue
              </span>
              <span style={{ color: '#f97316', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f97316' }}></span>
                Expense
              </span>
            </div>
          </div>

          <div className="finance-trend-columns">
            {(summary?.monthlyTrends || []).map((t) => {
              const revHeight = Math.min(100, Math.max(4, Math.round((t.revenue / maxTrendVal) * 100)));
              const expHeight = Math.min(100, Math.max(4, Math.round((t.expense / maxTrendVal) * 100)));
              const isSelected = t.month === selectedMonth;

              return (
                <div
                  key={t.month}
                  onClick={() => setSelectedMonth(t.month)}
                  className={`finance-trend-col ${isSelected ? 'active' : ''}`}
                  title={`${t.label}: Revenue ₹${t.revenue.toLocaleString('en-IN')}, Expense ₹${t.expense.toLocaleString('en-IN')}, Net ${t.profit >= 0 ? '+' : ''}₹${t.profit.toLocaleString('en-IN')}`}
                >
                  <div className="finance-bar-duo">
                    <div
                      className="finance-bar-rev"
                      style={{ height: `${revHeight}%` }}
                    />
                    <div
                      className="finance-bar-exp"
                      style={{ height: `${expHeight}%` }}
                    />
                  </div>
                  <div className="finance-trend-month-label">
                    {t.label}
                  </div>
                  <div
                    className="finance-trend-profit-tag"
                    style={{ color: t.profit >= 0 ? '#10b981' : '#ef4444' }}
                  >
                    {t.profit >= 0 ? '+' : ''}₹{(t.profit / 1000).toFixed(0)}k
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <span>Click any month column to inspect its ledger</span>
            <span>Selected Period: <strong style={{ color: 'var(--text-main)' }}>{summary?.monthLabel || selectedMonth}</strong></span>
          </div>
        </div>

        {/* Right: Department & Category Spending Breakdown */}
        <div className="finance-category-card">
          <div className="finance-card-title-row">
            <h3 className="finance-card-title">
              <PieChart size={19} color="#ec4899" />
              <span>Department Spending Breakdown</span>
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Total ₹{totalExp.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="finance-category-list">
            {(summary?.categoryBreakdown && summary.categoryBreakdown.length > 0) ? (
              summary.categoryBreakdown.map((catItem) => {
                const colorConfig = CATEGORY_COLORS[catItem.category] || CATEGORY_COLORS['Miscellaneous'];
                const isSelected = categoryFilter.toLowerCase() === catItem.category.toLowerCase();

                return (
                  <div
                    key={catItem.category}
                    onClick={() => {
                      setCategoryFilter(isSelected ? 'All' : catItem.category);
                    }}
                    className={`finance-category-row ${isSelected ? 'active' : ''}`}
                    title={`Click to filter ledger by ${catItem.category}`}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          color: colorConfig.text,
                          background: colorConfig.bg,
                          padding: '4px',
                          borderRadius: '6px',
                          display: 'flex'
                        }}>
                          {getCategoryIcon(catItem.category)}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text-main)' }}>
                          {catItem.category}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          ({catItem.count} {catItem.count === 1 ? 'item' : 'items'})
                        </span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                          ₹{catItem.amount.toLocaleString('en-IN')}
                        </span>
                        <span style={{ fontSize: '0.74rem', color: colorConfig.text, marginLeft: '6px', fontWeight: 700 }}>
                          {catItem.percentage}%
                        </span>
                      </div>
                    </div>

                    <div className="finance-cat-progress-track">
                      <div
                        className="finance-cat-progress-bar"
                        style={{
                          width: `${Math.min(100, Math.max(3, catItem.percentage))}%`,
                          background: colorConfig.bar
                        }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 12px', color: 'var(--text-muted)' }}>
                <Package size={34} style={{ opacity: 0.35, marginBottom: '8px' }} />
                <p style={{ margin: 0, fontSize: '0.85rem' }}>No expense categorizations in this period.</p>
                <button
                  onClick={() => openSingleCreate()}
                  style={{
                    background: 'transparent',
                    border: '1px dashed var(--primary)',
                    color: 'var(--primary)',
                    padding: '5px 12px',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    marginTop: '10px',
                    cursor: 'pointer'
                  }}
                >
                  + Add First Expense
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── 4. QUICK PRESET EXPENSE DOCK ─────────────────────────────────────── */}
      <div className="finance-presets-dock">
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={14} color="#f59e0b" />
          <span>Quick 1-Tap Pickers:</span>
        </span>
        {ALL_PRESET_ITEMS.map((item, idx) => (
          <button
            key={idx}
            onClick={() => openSingleCreate(item.title, item.cat)}
            className="finance-preset-chip"
          >
            <span>{item.icon}</span>
            <span>{item.title}</span>
          </button>
        ))}
      </div>

      {/* ─── 5. TRANSACTION LEDGER CARD ───────────────────────────────────────── */}
      <div className="finance-ledger-card">
        {/* Ledger Filter & Search Header */}
        <div className="finance-filter-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={18} color="var(--primary)" />
              <span>Expense Audit Ledger</span>
            </h2>
            <span style={{
              background: 'rgba(249, 115, 22, 0.12)',
              border: '1px solid rgba(249, 115, 22, 0.3)',
              color: 'var(--primary)',
              padding: '2px 10px',
              borderRadius: '12px',
              fontSize: '0.78rem',
              fontWeight: 800
            }}>
              {expenses.length} {expenses.length === 1 ? 'Record' : 'Records'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="finance-search-box">
              <Search size={15} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Search items, vendor, notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="finance-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                >
                  <XCircle size={14} />
                </button>
              )}
            </form>
          </div>
        </div>

        {/* Category Pills Bar */}
        <div className="finance-category-pills" style={{ marginBottom: '1.25rem' }}>
          <button
            onClick={() => setCategoryFilter('All')}
            className={`finance-filter-pill ${categoryFilter === 'All' ? 'active' : ''}`}
          >
            All Categories ({allExpenses.length})
          </button>
          {categories.map((c) => {
            const isSelected = categoryFilter.toLowerCase() === c.name.toLowerCase();
            const catCount = allExpenses.filter(e => e.category.toLowerCase() === c.name.toLowerCase()).length;

            return (
              <button
                key={c.id}
                onClick={() => setCategoryFilter(c.name)}
                className={`finance-filter-pill ${isSelected ? 'active' : ''}`}
              >
                {getCategoryIcon(c.name)}
                <span>{c.name}</span>
                {catCount > 0 && (
                  <span style={{
                    background: isSelected ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.1)',
                    padding: '1px 6px',
                    borderRadius: '8px',
                    fontSize: '0.72rem',
                    fontWeight: 800
                  }}>
                    {catCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content Table / Cards */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
            <RefreshCw size={26} className="spin" style={{ marginBottom: '10px' }} />
            <p style={{ margin: 0, fontSize: '0.9rem' }}>Loading transaction ledger...</p>
          </div>
        ) : expenses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '52px 20px', color: 'var(--text-muted)' }}>
            <Package size={44} style={{ opacity: 0.35, marginBottom: '12px' }} />
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-main)', fontWeight: 700 }}>
              No expense transactions found
            </h3>
            <p style={{ margin: '6px auto 18px', maxWidth: '420px', fontSize: '0.85rem' }}>
              {searchQuery || categoryFilter !== 'All' 
                ? 'No items matched your search filter. Try clearing filters or selecting another category.'
                : `No expenses have been recorded for ${summary?.monthLabel || selectedMonth}. You can record a single expense or use fast multi-row entry.`}
            </p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {(searchQuery || categoryFilter !== 'All') ? (
                <button
                  onClick={() => { setSearchQuery(''); setCategoryFilter('All'); }}
                  className="btn-finance-secondary"
                >
                  Clear Filters
                </button>
              ) : (
                <>
                  <button
                    onClick={() => openSingleCreate()}
                    className="btn-finance-primary"
                  >
                    <Plus size={16} />
                    <span>+ Add Expense</span>
                  </button>
                  <button
                    onClick={() => setIsBulkModalOpen(true)}
                    className="btn-finance-secondary"
                  >
                    <FileSpreadsheet size={16} />
                    <span>Fast Multi-Add</span>
                  </button>
                </>
              )}
            </div>
          </div>
        ) : isMobile ? (
          /* Mobile Card Layout */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {expenses.map((exp) => {
              const catColor = CATEGORY_COLORS[exp.category] || CATEGORY_COLORS['Miscellaneous'];
              return (
                <div key={exp.id} className="finance-mobile-card">
                  {/* Top: Title + Amount */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {exp.title}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={12} />
                        <span>{exp.date ? new Date(exp.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</span>
                        <span>·</span>
                        <span style={{ fontWeight: 700, color: exp.paymentMethod === 'Cash' ? '#10b981' : '#60a5fa' }}>{exp.paymentMethod || 'Cash'}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: '1.18rem', fontWeight: 800, color: '#ef4444', flexShrink: 0 }}>
                      -₹{exp.amount.toLocaleString('en-IN')}
                    </div>
                  </div>

                  {/* Middle: Badges */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '3px 9px',
                        borderRadius: '10px',
                        background: catColor.bg,
                        color: catColor.text,
                        border: `1px solid ${catColor.border}`,
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {getCategoryIcon(exp.category)}
                        {exp.category}
                      </span>
                      {exp.building && (
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: 'rgba(249, 115, 22, 0.1)',
                          color: 'var(--primary)',
                          border: '1px solid rgba(249, 115, 22, 0.25)',
                          fontSize: '0.7rem',
                          fontWeight: 700
                        }}>
                          {exp.building.name}
                        </span>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <button
                        onClick={() => openSingleEdit(exp)}
                        className="icon-btn-micro"
                        title="Edit Expense"
                        style={{
                          background: 'rgba(255, 255, 255, 0.06)',
                          border: 'none',
                          color: 'var(--text-main)',
                          padding: '6px 8px',
                          borderRadius: '8px',
                          cursor: 'pointer'
                        }}
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteExpense(exp.id, exp.title)}
                        className="icon-btn-micro danger"
                        title="Delete Expense"
                        style={{
                          background: 'rgba(239, 68, 68, 0.12)',
                          border: 'none',
                          color: '#ef4444',
                          padding: '6px 8px',
                          borderRadius: '8px',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Bottom: Vendor / Notes */}
                  {(exp.vendor || exp.notes) && (
                    <div style={{
                      fontSize: '0.76rem',
                      color: 'var(--text-muted)',
                      paddingTop: '6px',
                      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {exp.vendor && <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Paid to: {exp.vendor}</span>}
                      {exp.vendor && exp.notes && <span>•</span>}
                      {exp.notes && <span>Note: {exp.notes}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Desktop Modern Table Layout */
          <div style={{ overflowX: 'auto' }}>
            <table className="finance-table">
              <thead>
                <tr>
                  <th style={{ width: '110px' }}>Date</th>
                  <th>Expense Title / Notes</th>
                  <th style={{ width: '150px' }}>Building Scope</th>
                  <th style={{ width: '180px' }}>Category</th>
                  <th style={{ width: '120px' }}>Payment Mode</th>
                  <th style={{ width: '160px' }}>Vendor / Paid To</th>
                  <th style={{ textAlign: 'right', width: '130px' }}>Amount (₹)</th>
                  <th style={{ textAlign: 'center', width: '90px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => {
                  const catColor = CATEGORY_COLORS[exp.category] || CATEGORY_COLORS['Miscellaneous'];
                  return (
                    <tr key={exp.id}>
                      {/* Date */}
                      <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                        {exp.date ? new Date(exp.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                      </td>

                      {/* Title & Notes */}
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                          {exp.title}
                        </div>
                        {exp.notes && (
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {exp.notes}
                          </div>
                        )}
                      </td>

                      {/* Building Badge */}
                      <td>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '8px',
                          background: exp.building ? 'rgba(249, 115, 22, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                          color: exp.building ? 'var(--primary)' : 'var(--text-muted)',
                          border: `1px solid ${exp.building ? 'rgba(249, 115, 22, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <Building size={12} />
                          {exp.building ? exp.building.name : 'Shared / All'}
                        </span>
                      </td>

                      {/* Category Badge */}
                      <td>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          background: catColor.bg,
                          color: catColor.text,
                          border: `1px solid ${catColor.border}`,
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}>
                          {getCategoryIcon(exp.category)}
                          {exp.category}
                        </span>
                      </td>

                      {/* Payment Method */}
                      <td>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: exp.paymentMethod === 'Cash' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                          color: exp.paymentMethod === 'Cash' ? '#10b981' : '#60a5fa',
                          border: `1px solid ${exp.paymentMethod === 'Cash' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(59, 130, 246, 0.25)'}`,
                          fontSize: '0.76rem',
                          fontWeight: 700
                        }}>
                          {exp.paymentMethod || 'Cash'}
                        </span>
                      </td>

                      {/* Vendor */}
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                        {exp.vendor ? <strong>{exp.vendor}</strong> : <span style={{ opacity: 0.35 }}>—</span>}
                      </td>

                      {/* Amount */}
                      <td style={{ textAlign: 'right', fontWeight: 800, color: '#ef4444', fontSize: '0.96rem' }}>
                        -₹{exp.amount.toLocaleString('en-IN')}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <button
                            onClick={() => openSingleEdit(exp)}
                            title="Edit Expense"
                            style={{
                              background: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              color: 'var(--text-main)',
                              padding: '6px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteExpense(exp.id, exp.title)}
                            title="Delete Expense"
                            style={{
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.2)',
                              color: '#ef4444',
                              padding: '6px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── MODAL 1: MULTI-ROW SPREADSHEET QUICK ENTRY ────────────────────────────── */}
      <Modal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title="Multi-Row Quick Expense Adder"
        maxWidth="1080px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Preset Buttons Ribbon */}
          <div style={{
            padding: '10px 14px',
            background: 'var(--border-dim)',
            border: '1px solid var(--border-light)',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflowX: 'auto',
            scrollbarWidth: 'none'
          }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Sparkles size={14} /> + Preset Row:
            </span>
            {categories.flatMap(c => (c.presetItems || []).map(p => ({ title: p, cat: c.name }))).slice(0, 12).map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => addPresetToBulk(preset.title, preset.cat)}
                style={{
                  background: 'rgba(249, 115, 22, 0.08)',
                  border: '1px solid rgba(249, 115, 22, 0.25)',
                  borderRadius: '16px',
                  padding: '5px 12px',
                  color: 'var(--text-main)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Plus size={12} color="var(--primary)" />
                <span>{preset.title}</span>
              </button>
            ))}
          </div>

          {/* Body: Responsive Table (Desktop) vs Responsive Cards (Mobile) */}
          {isMobile ? (
            /* Mobile Card List for Bulk Rows */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {bulkRows.map((row, index) => (
                <div
                  key={row.id}
                  style={{
                    background: 'var(--border-dim)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '16px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                      Expense Row #{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeBulkRow(row.id)}
                      style={{
                        background: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        color: '#ef4444',
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="Expense Item Title (e.g. Vegetables, Repair) *"
                      value={row.title}
                      onChange={(e) => updateBulkRow(row.id, 'title', e.target.value)}
                      className="custom-input"
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <select
                        value={row.category}
                        onChange={(e) => updateBulkRow(row.id, 'category', e.target.value)}
                        className="custom-input"
                      >
                        {categories.map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <input
                        type="number"
                        placeholder="Amount (₹) *"
                        value={row.amount}
                        onChange={(e) => updateBulkRow(row.id, 'amount', e.target.value)}
                        className="custom-input"
                        style={{ color: '#ef4444', fontWeight: 700 }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '8px' }}>
                    <div>
                      <input
                        type="date"
                        value={row.date}
                        onChange={(e) => updateBulkRow(row.id, 'date', e.target.value)}
                        className="custom-input"
                      />
                    </div>
                    <div>
                      <select
                        value={row.paymentMethod}
                        onChange={(e) => updateBulkRow(row.id, 'paymentMethod', e.target.value)}
                        className="custom-input"
                      >
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="Bank Transfer">Bank</option>
                        <option value="Card">Card</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="Vendor / Paid to (Optional)"
                      value={row.vendor}
                      onChange={(e) => updateBulkRow(row.id, 'vendor', e.target.value)}
                      className="custom-input"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Desktop Spreadsheet Table */
            <div style={{
              borderRadius: '16px',
              border: '1px solid var(--border-light)',
              overflow: 'hidden'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{
                    background: 'var(--border-dim)',
                    color: 'var(--text-muted)',
                    borderBottom: '1px solid var(--border-light)',
                    fontSize: '0.76rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    <th style={{ padding: '10px 12px', width: '36px', textAlign: 'center' }}>#</th>
                    <th style={{ padding: '10px 12px', minWidth: '180px' }}>Item Title *</th>
                    <th style={{ padding: '10px 12px', minWidth: '160px' }}>Category</th>
                    <th style={{ padding: '10px 12px', width: '130px' }}>Amount (₹) *</th>
                    <th style={{ padding: '10px 12px', width: '140px' }}>Date</th>
                    <th style={{ padding: '10px 12px', width: '110px' }}>Mode</th>
                    <th style={{ padding: '10px 12px', minWidth: '140px' }}>Vendor</th>
                    <th style={{ padding: '10px 12px', width: '46px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkRows.map((row, index) => (
                    <tr
                      key={row.id}
                      style={{
                        borderBottom: '1px solid var(--border-dim)',
                        transition: 'background 0.2s'
                      }}
                    >
                      <td style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>
                        {index + 1}
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <input
                          type="text"
                          placeholder="e.g. Vegetables, Wifi..."
                          value={row.title}
                          onChange={(e) => updateBulkRow(row.id, 'title', e.target.value)}
                          className="custom-input"
                        />
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <select
                          value={row.category}
                          onChange={(e) => updateBulkRow(row.id, 'category', e.target.value)}
                          className="custom-input"
                        >
                          {categories.map(c => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <input
                          type="number"
                          placeholder="Amount ₹"
                          value={row.amount}
                          onChange={(e) => updateBulkRow(row.id, 'amount', e.target.value)}
                          className="custom-input"
                          style={{ color: '#ef4444', fontWeight: 700 }}
                        />
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <input
                          type="date"
                          value={row.date}
                          onChange={(e) => updateBulkRow(row.id, 'date', e.target.value)}
                          className="custom-input"
                        />
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <select
                          value={row.paymentMethod}
                          onChange={(e) => updateBulkRow(row.id, 'paymentMethod', e.target.value)}
                          className="custom-input"
                        >
                          <option value="Cash">Cash</option>
                          <option value="UPI">UPI</option>
                          <option value="Bank Transfer">Bank</option>
                          <option value="Card">Card</option>
                        </select>
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <input
                          type="text"
                          placeholder="Vendor / Paid To"
                          value={row.vendor}
                          onChange={(e) => updateBulkRow(row.id, 'vendor', e.target.value)}
                          className="custom-input"
                        />
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => removeBulkRow(row.id)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.12)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            color: '#ef4444',
                            width: '30px',
                            height: '30px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Add Row Button */}
          <button
            type="button"
            onClick={addEmptyBulkRow}
            style={{
              background: 'rgba(249, 115, 22, 0.06)',
              border: '1.5px dashed var(--primary)',
              borderRadius: '12px',
              width: '100%',
              padding: '10px',
              color: 'var(--primary)',
              fontWeight: 700,
              fontSize: '0.86rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <Plus size={16} /> Add Another Empty Expense Row
          </button>

          {/* Footer */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
            paddingTop: '8px',
            borderTop: '1px solid var(--border-light)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>Total:</span>
              <span style={{
                fontSize: '1.15rem',
                fontWeight: 800,
                color: '#ef4444',
                background: 'rgba(239, 68, 68, 0.1)',
                padding: '3px 10px',
                borderRadius: '8px',
                border: '1px solid rgba(239, 68, 68, 0.25)'
              }}>
                ₹{bulkRows.reduce((acc, r) => acc + (Number(r.amount) || 0), 0).toLocaleString('en-IN')}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="custom-select"
                style={{ padding: '0 18px', minWidth: 80, textAlign: 'center' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkSubmit}
                className="primary-btn"
                style={{ padding: '9px 20px', fontSize: '0.88rem' }}
              >
                Save All Expenses
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* ─── MODAL 2: SINGLE EXPENSE CREATE / EDIT ─────────────────────────────────── */}
      <Modal
        isOpen={isSingleModalOpen}
        onClose={() => setIsSingleModalOpen(false)}
        title={editingExpense ? 'Edit Expense Record' : 'Add Single Expense'}
      >
        <form onSubmit={handleSingleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Title */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Expense Item Title *
            </label>
            <input
              type="text"
              placeholder="e.g. Vegetables, Wifi Repair, Building Rent"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="custom-input"
              autoFocus={!isMobile}
            />
          </div>

          {/* Building Workspace Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '6px' }}>
              Building Workspace Scope *
            </label>
            <select
              value={formData.buildingId}
              onChange={(e) => setFormData({ ...formData, buildingId: e.target.value })}
              className="custom-input"
            >
              <option value="all">All Buildings (General Shared Expense)</option>
              {availableBuildings.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Category & Amount Row */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="custom-input"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Amount (₹) *
              </label>
              <input
                type="number"
                placeholder="e.g. 2500"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
                className="custom-input"
                style={{ fontWeight: 700, fontSize: '1rem', color: '#ef4444' }}
              />
            </div>
          </div>

          {/* Date & Payment Mode */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="custom-input"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Payment Method
              </label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                className="custom-input"
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Card">Card</option>
              </select>
            </div>
          </div>

          {/* Vendor / Paid To */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Vendor / Paid To (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Local Supermarket, Electrician Name"
              value={formData.vendor}
              onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
              className="custom-input"
            />
          </div>

          {/* Notes / Invoice Ref */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Notes / Invoice Ref (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Add additional details or bill receipt notes..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="custom-input"
              style={{ resize: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={() => setIsSingleModalOpen(false)}
              className="custom-select"
              style={{ padding: '0 20px', minWidth: 90, textAlign: 'center' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary-btn"
              style={{ padding: '10px 22px', fontSize: '0.88rem' }}
            >
              {editingExpense ? 'Save Changes' : 'Record Expense'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── CUSTOMIZABLE REPORT SELECTION MODAL ────────────────────────────────────── */}
      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title="Download Financial Report"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            Select statement scope, month, and year for tailored PDF export.
          </p>

          {/* 1. Report Scope Switcher */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              1. Select Report Type
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              background: 'var(--border-dim)',
              padding: '4px',
              borderRadius: '12px',
              border: '1px solid var(--border-light)'
            }}>
              <button
                type="button"
                onClick={() => setReportScope('monthly')}
                style={{
                  background: reportScope === 'monthly' ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : 'transparent',
                  color: reportScope === 'monthly' ? '#ffffff' : 'var(--text-muted)',
                  border: 'none',
                  padding: '9px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Calendar size={15} /> Monthly Statement
              </button>
              <button
                type="button"
                onClick={() => setReportScope('yearly')}
                style={{
                  background: reportScope === 'yearly' ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' : 'transparent',
                  color: reportScope === 'yearly' ? '#ffffff' : 'var(--text-muted)',
                  border: 'none',
                  padding: '9px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <BarChart3 size={15} /> Yearly Audit Report
              </button>
            </div>
          </div>

          {/* 2. Period Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              2. Select Time Period
            </label>
            
            {reportScope === 'monthly' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Month
                  </label>
                  <select
                    value={reportSelectedMonth}
                    onChange={(e) => setReportSelectedMonth(e.target.value)}
                    className="custom-input"
                  >
                    {MONTH_LIST.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Year
                  </label>
                  <select
                    value={reportSelectedYear}
                    onChange={(e) => setReportSelectedYear(e.target.value)}
                    className="custom-input"
                  >
                    {YEAR_LIST.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Audit Year
                </label>
                <select
                  value={reportSelectedYear}
                  onChange={(e) => setReportSelectedYear(e.target.value)}
                  className="custom-input"
                >
                  {YEAR_LIST.map((y) => (
                    <option key={y} value={y}>Year {y}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 3. Category Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              3. Category Filter
            </label>
            <select
              value={reportCategoryFilter}
              onChange={(e) => setReportCategoryFilter(e.target.value)}
              className="custom-input"
            >
              <option value="All">All Categories (Complete Ledger)</option>
              <option value="Kitchen & Groceries">Kitchen & Groceries</option>
              <option value="Utilities & Bills">Utilities & Bills</option>
              <option value="Staff & Wages">Staff & Wages</option>
              <option value="Maintenance & Repairs">Maintenance & Repairs</option>
              <option value="Rent & Infra">Rent & Infra</option>
              <option value="Miscellaneous">Miscellaneous</option>
            </select>
          </div>

          {/* Modal Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={() => setIsReportModalOpen(false)}
              className="custom-select"
              style={{ padding: '0 20px', minWidth: 90, textAlign: 'center' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteGeneratePDF}
              disabled={isGeneratingReport}
              className="primary-btn"
              style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', boxShadow: '0 4px 16px rgba(37, 99, 235, 0.4)' }}
            >
              {isGeneratingReport ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>Generating PDF…</span>
                </>
              ) : (
                <>
                  <Download size={15} />
                  <span>Download PDF Statement</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default Finance;
