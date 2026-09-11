import React, { useState, useEffect, useMemo } from 'react';
import {
  Wallet, TrendingUp, TrendingDown, Plus, Calendar,
  Search, Filter, Trash2, Edit2, Download, RefreshCw,
  CheckCircle2, XCircle, ArrowUpRight, ArrowDownRight,
  PieChart, BarChart3, Utensils, Zap, Wrench,
  Users, Building, Package, Sparkles, FileSpreadsheet,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { useToast } from '../components/ToastContext';
import { useSettings } from '../components/SettingsContext';
import { useBuilding } from '../components/BuildingContext';


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
    scope: 'monthly' | 'yearly'
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

    const win = window.open('', '_blank', 'width=1050,height=850');
    if (!win) {
      showToast('Please allow popups to generate the PDF report', 'error');
      return;
    }

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
        setIsGeneratingReport(false);
        return;
      }

      const fetchedExpenses: Expense[] = await expRes.json();
      const fetchedSummary: SummaryData = await sumRes.json();

      if (fetchedExpenses.length === 0) {
        showToast(`No expense records found for ${periodTitle}`, 'info');
        setIsGeneratingReport(false);
        return;
      }

      renderMartPDFReport(fetchedExpenses, fetchedSummary, periodTitle, reportScope);
      setIsReportModalOpen(false);
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Error generating report', 'error');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Preset items across categories for 1-click quick add chips
  const ALL_PRESET_ITEMS = [
    { title: 'Vegetables', cat: 'Kitchen & Groceries' },
    { title: 'Non-Veg Groceries', cat: 'Kitchen & Groceries' },
    { title: 'Rice & Flours', cat: 'Kitchen & Groceries' },
    { title: 'Electricity Bill', cat: 'Utilities & Bills' },
    { title: 'Wifi / Internet Charges', cat: 'Utilities & Bills' },
    { title: 'Washing Machine Repair', cat: 'Maintenance & Repairs' },
    { title: 'Hostel Building Rent', cat: 'Rent & Infra' },
    { title: 'Worker Wages', cat: 'Staff & Wages' },
    { title: 'Utensils Purchase', cat: 'Rent & Infra' },
    { title: 'Drinking Water Cans', cat: 'Kitchen & Groceries' },
  ];

  return (
    <div className="finance-page" style={{ padding: '4px 0', animation: 'fadeIn 0.4s ease' }}>
      
      {/* ─── PAGE TOP HEADER & ACTIONS ────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '24px',
        background: 'rgba(255, 255, 255, 0.03)',
        padding: '16px 20px',
        borderRadius: '16px',
        border: '1px solid var(--border-dim)',
        backdropFilter: 'blur(12px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(245, 158, 11, 0.2))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(249, 115, 22, 0.3)',
            color: 'var(--primary)'
          }}>
            <Wallet size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 700, color: '#ffffff' }}>
              Hostel Hisab-Kitab & Money Tracker
            </h1>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.65)' }}>
              Simple overview of student fee income, daily hostel expenses, and total monthly savings
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>


          {/* Add Single Expense Button */}
          <button
            onClick={() => openSingleCreate()}
            style={{
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              color: '#fff',
              fontWeight: 700,
              padding: '9px 16px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(34, 197, 94, 0.35)',
              fontSize: '0.9rem',
              transition: 'all 0.2s ease'
            }}
          >
            <Plus size={18} />
            <span>+ Add Expense</span>
          </button>

          {/* Multi-Row Spreadsheet Quick Entry CTA */}
          <button
            onClick={() => setIsBulkModalOpen(true)}
            style={{
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              color: '#fff',
              fontWeight: 700,
              padding: '9px 16px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(249, 115, 22, 0.35)',
              fontSize: '0.9rem',
              transition: 'all 0.2s ease'
            }}
          >
            <FileSpreadsheet size={18} />
            <span>⚡ Fast Multi-Add</span>
          </button>

          {/* Download Mart-Style PDF Report */}
          <button
            onClick={() => setIsReportModalOpen(true)}
            title="Download & Print Detailed Customized PDF Financial Statement"
            style={{
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: '#ffffff',
              padding: '9px 16px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.88rem',
              fontWeight: 700,
              gap: '7px',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
              transition: 'all 0.2s ease'
            }}
          >
            <Download size={18} />
            <span>Download PDF Statement</span>
          </button>
        </div>
      </div>

      {/* ─── 1-CLICK COMMON EXPENSES QUICK RIBBON ────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        overflowX: 'auto',
        paddingBottom: '12px',
        marginBottom: '24px',
        scrollbarWidth: 'none'
      }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'rgba(255, 255, 255, 0.7)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={15} color="#f59e0b" /> 1-Click Common Expense Pickers:
        </span>
        {ALL_PRESET_ITEMS.map((item, idx) => (
          <button
            key={idx}
            onClick={() => openSingleCreate(item.title, item.cat)}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '20px',
              padding: '6px 14px',
              color: '#ffffff',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(249, 115, 22, 0.2)';
              e.currentTarget.style.borderColor = 'rgba(249, 115, 22, 0.5)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
              e.currentTarget.style.transform = 'none';
            }}
          >
            <Plus size={13} color="#f97316" />
            <span>{item.title}</span>
          </button>
        ))}
      </div>

      {/* ─── SUMMARY CARDS (PLAIN ENGLISH & EASY TO READ) ─────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: '16px',
        marginBottom: '28px'
      }}>
        {/* Total Income */}
        <div style={{
          padding: '22px',
          borderRadius: '20px',
          background: 'linear-gradient(145deg, rgba(34, 197, 94, 0.1) 0%, rgba(22, 163, 74, 0.03) 100%)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'rgba(255, 255, 255, 0.8)' }}>
              Total Income (Kamai)
            </span>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(34, 197, 94, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22c55e' }}>
              <TrendingUp size={22} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#22c55e', letterSpacing: '-0.5px' }}>
            ₹{(summary?.totalRevenue || 0).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.6)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <CheckCircle2 size={14} color="#22c55e" />
            <span>Total student fee payments collected</span>
          </div>
        </div>

        {/* Total Expenses */}
        <div style={{
          padding: '22px',
          borderRadius: '20px',
          background: 'linear-gradient(145deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.03) 100%)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'rgba(255, 255, 255, 0.8)' }}>
              Total Kharcha (Expenses)
            </span>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
              <TrendingDown size={22} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ef4444', letterSpacing: '-0.5px' }}>
            ₹{(summary?.totalExpense || 0).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.6)', marginTop: '8px' }}>
            <span>{summary?.expenseCount || 0} expense entries recorded</span>
          </div>
        </div>

        {/* Net Savings / Profit */}
        <div style={{
          padding: '22px',
          borderRadius: '20px',
          background: (summary?.netProfit || 0) >= 0 ? 'linear-gradient(145deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.03) 100%)' : 'linear-gradient(145deg, rgba(239, 68, 68, 0.12) 0%, rgba(220, 38, 38, 0.03) 100%)',
          border: `1px solid ${(summary?.netProfit || 0) >= 0 ? 'rgba(59, 130, 246, 0.3)' : 'rgba(239, 68, 68, 0.4)'}`,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'rgba(255, 255, 255, 0.8)' }}>
              Net Savings (Money Left)
            </span>
            <div style={{
              width: '40px', height: '40px', borderRadius: '12px',
              background: (summary?.netProfit || 0) >= 0 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: (summary?.netProfit || 0) >= 0 ? '#3b82f6' : '#ef4444'
            }}>
              {(summary?.netProfit || 0) >= 0 ? <ArrowUpRight size={22} /> : <ArrowDownRight size={22} />}
            </div>
          </div>
          <div style={{
            fontSize: '2rem',
            fontWeight: 800,
            color: (summary?.netProfit || 0) >= 0 ? '#3b82f6' : '#ef4444',
            letterSpacing: '-0.5px'
          }}>
            ₹{(summary?.netProfit || 0).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.6)', marginTop: '8px' }}>
            <span>Income left after paying all expenses</span>
          </div>
        </div>

        {/* Profit Margin % */}
        <div style={{
          padding: '22px',
          borderRadius: '20px',
          background: 'linear-gradient(145deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.03) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'rgba(255, 255, 255, 0.8)' }}>
              Profit Savings Share
            </span>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
              <PieChart size={22} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f59e0b', letterSpacing: '-0.5px' }}>
            {summary?.profitMargin || 0}%
          </div>
          {/* Progress Bar */}
          <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.12)', borderRadius: '4px', marginTop: '12px', overflow: 'hidden' }}>
            <div style={{
              width: `${Math.max(0, Math.min(100, summary?.profitMargin || 0))}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #f59e0b, #22c55e)',
              borderRadius: '4px',
              transition: 'width 0.5s ease'
            }} />
          </div>
        </div>
      </div>


      {/* ─── EXECUTIVE FINANCIAL OVERVIEW (6-MONTH AUDIT) ─────────────────── */}
      <div style={{
        marginBottom: '28px'
      }}>
        {/* 6-Month Income vs Expense Trend Table */}
        <div className="glass-card" style={{ padding: '22px', borderRadius: '18px', border: '1px solid var(--border-dim)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={20} color="var(--accent)" />
              <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 700, color: '#ffffff' }}>6-Month Profit & Loss Audit</h3>
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '14px' }}>
              {/* Direct Month & Year Filter Dropdown */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(249, 115, 22, 0.35)',
                padding: '5px 12px',
                borderRadius: '10px'
              }}>
                <Calendar size={15} color="#f97316" />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255, 255, 255, 0.75)' }}>Audit Month:</span>
                <select
                  value={selectedMonth.split('-')[1] || '09'}
                  onChange={(e) => {
                    const yr = selectedMonth.split('-')[0] || '2026';
                    setSelectedMonth(`${yr}-${e.target.value}`);
                  }}
                  style={{
                    background: '#1e293b',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '6px',
                    padding: '3px 6px',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {MONTH_LIST.map(m => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedMonth.split('-')[0] || '2026'}
                  onChange={(e) => {
                    const mo = selectedMonth.split('-')[1] || '09';
                    setSelectedMonth(`${e.target.value}-${mo}`);
                  }}
                  style={{
                    background: '#1e293b',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '6px',
                    padding: '3px 6px',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    outline: 'none',
                    cursor: 'pointer'
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
                onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                style={{
                  background: isHistoryExpanded ? 'rgba(249, 115, 22, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  border: isHistoryExpanded ? '1px solid rgba(249, 115, 22, 0.5)' : '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '8px',
                  padding: '4px 10px',
                  color: '#ffffff',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease'
                }}
              >
                <span>{isHistoryExpanded ? 'Hide History' : '6-Month History'}</span>
                {isHistoryExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.78rem', fontWeight: 600 }}>
                <span style={{ color: '#22c55e' }}>● Income</span>
                <span style={{ color: '#ef4444' }}>● Kharcha</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {((isHistoryExpanded 
              ? (summary?.monthlyTrends || [])
              : (summary?.monthlyTrends || []).filter(t => t.month === selectedMonth)
            ).length === 0 ? [{
              month: selectedMonth,
              label: summary?.monthLabel || 'Selected Month',
              revenue: summary?.totalRevenue || 0,
              expense: summary?.totalExpense || 0,
              profit: summary?.netProfit || 0
            }] : (isHistoryExpanded 
              ? (summary?.monthlyTrends || [])
              : (summary?.monthlyTrends || []).filter(t => t.month === selectedMonth)
            )).map((t, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedMonth(t.month)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: t.month === selectedMonth ? 'rgba(249, 115, 22, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                  border: t.month === selectedMonth ? '1px solid rgba(249, 115, 22, 0.4)' : '1px solid rgba(255, 255, 255, 0.05)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                title={`Click to view financial summary for ${t.label}`}
              >
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: t.month === selectedMonth ? 'var(--primary)' : '#ffffff' }}>
                    {t.label}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                    Rev: ₹{t.revenue.toLocaleString('en-IN')} · Exp: ₹{t.expense.toLocaleString('en-IN')}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    color: t.profit >= 0 ? '#22c55e' : '#ef4444',
                    background: t.profit >= 0 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    padding: '3px 10px',
                    borderRadius: '8px',
                    display: 'inline-block'
                  }}>
                    {t.profit >= 0 ? '+' : ''}₹{t.profit.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── CATEGORY & FILTER NAVIGATION BAR (BELOW MAIN SECTION) ─────────────────── */}
      <div className="glass-card" style={{
        padding: '20px 24px',
        borderRadius: '20px',
        border: '1px solid var(--border-dim)',
        marginBottom: '24px',
        background: 'linear-gradient(145deg, rgba(24, 27, 36, 0.8) 0%, rgba(17, 19, 25, 0.9) 100%)'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '16px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={18} color="var(--primary)" /> Category Filter & Quick Actions
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)' }}>
              Select category pill or search to filter transactions below
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
            {/* Month & Year Filter Selector */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#1a1c24',
              borderRadius: '12px',
              border: '1px solid rgba(249, 115, 22, 0.4)',
              padding: '6px 12px'
            }}>
              <Calendar size={15} color="#f97316" />
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'rgba(255, 255, 255, 0.75)' }}>Month:</span>
              <select
                value={selectedMonth.split('-')[1] || '09'}
                onChange={(e) => {
                  const yr = selectedMonth.split('-')[0] || '2026';
                  setSelectedMonth(`${yr}-${e.target.value}`);
                }}
                style={{
                  background: '#0f172a',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {MONTH_LIST.map(m => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>

              <select
                value={selectedMonth.split('-')[0] || '2026'}
                onChange={(e) => {
                  const mo = selectedMonth.split('-')[1] || '09';
                  setSelectedMonth(`${e.target.value}-${mo}`);
                }}
                style={{
                  background: '#0f172a',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {YEAR_LIST.map(y => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', background: '#1a1c24', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.14)', padding: '8px 14px', width: '260px' }}>
              <Search size={16} color="rgba(255,255,255,0.5)" style={{ marginRight: '8px' }} />
              <input
                type="text"
                placeholder="Search items, vendor, notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  outline: 'none',
                  fontSize: '0.88rem',
                  width: '100%'
                }}
              />
            </form>
          </div>
        </div>

        {/* Category Pills Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '4px',
          scrollbarWidth: 'none'
        }}>
          <button
            onClick={() => setCategoryFilter('All')}
            style={{
              background: categoryFilter === 'All' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
              color: categoryFilter === 'All' ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
              border: categoryFilter === 'All' ? 'none' : '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '12px',
              padding: '8px 16px',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease',
              boxShadow: categoryFilter === 'All' ? '0 4px 12px rgba(249, 115, 22, 0.35)' : 'none'
            }}
          >
            All Expenses ({expenses.length})
          </button>
          
          {categories.map((c) => {
            const isSelected = categoryFilter === c.name;
            const catCount = expenses.filter(e => e.category === c.name).length;
            return (
              <button
                key={c.id}
                onClick={() => setCategoryFilter(c.name)}
                style={{
                  background: isSelected ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' : 'rgba(255, 255, 255, 0.05)',
                  color: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
                  border: isSelected ? 'none' : '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '12px',
                  padding: '8px 14px',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                  boxShadow: isSelected ? '0 4px 12px rgba(249, 115, 22, 0.35)' : 'none'
                }}
              >
                {getCategoryIcon(c.name)}
                <span>{c.name}</span>
                {catCount > 0 && (
                  <span style={{
                    background: isSelected ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
                    padding: '2px 7px',
                    borderRadius: '10px',
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}>
                    {catCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── TRANSACTION LEDGER TABLE SECTION ───────────────────────────────────── */}
      <div className="glass-card" style={{ padding: '24px', borderRadius: '20px', border: '1px solid var(--border-dim)' }}>
        
        {/* Table Header Controls */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#ffffff' }}>All Recorded Expenses History</h2>
            <span style={{ background: 'rgba(249, 115, 22, 0.15)', border: '1px solid rgba(249, 115, 22, 0.3)', color: 'var(--primary)', padding: '3px 12px', borderRadius: '14px', fontSize: '0.8rem', fontWeight: 700 }}>
              {expenses.length} Records
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
            {/* Search Box */}
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', background: '#1a1c24', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.12)', padding: '6px 12px' }}>
              <Search size={16} color="rgba(255,255,255,0.5)" style={{ marginRight: '8px' }} />
              <input
                type="text"
                placeholder="Search item (e.g. Vegetables, Rent, Wifi)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  outline: 'none',
                  fontSize: '0.88rem',
                  width: '240px'
                }}
              />
            </form>


            {/* Category Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.25)', borderRadius: '10px', border: '1px solid var(--border-dim)', padding: '4px 10px' }}>
              <Filter size={14} color="var(--text-muted)" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="All" style={{ background: '#18181b', color: '#fff' }}>All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.name} style={{ background: '#18181b', color: '#fff' }}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            <RefreshCw size={24} className="spin" style={{ marginBottom: '8px' }} />
            <p style={{ margin: 0, fontSize: '0.9rem' }}>Loading transaction ledger...</p>
          </div>
        ) : expenses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
            <Package size={42} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-main)' }}>No expense transactions found</h3>
            <p style={{ margin: '6px 0 16px 0', fontSize: '0.85rem' }}>Start tracking hostel expenses by using Quick Entry or Add Single Expense.</p>
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="btn"
              style={{
                background: 'var(--primary)',
                color: '#fff',
                fontWeight: 600,
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              + Launch Multi-Row Quick Entry
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 14px', fontWeight: 600 }}>Date</th>
                  <th style={{ padding: '12px 14px', fontWeight: 600 }}>Title / Description</th>
                  <th style={{ padding: '12px 14px', fontWeight: 600 }}>Building Scope</th>
                  <th style={{ padding: '12px 14px', fontWeight: 600 }}>Category</th>
                  <th style={{ padding: '12px 14px', fontWeight: 600 }}>Payment Mode</th>
                  <th style={{ padding: '12px 14px', fontWeight: 600 }}>Vendor / Notes</th>
                  <th style={{ padding: '12px 14px', fontWeight: 600, textAlign: 'right' }}>Amount</th>
                  <th style={{ padding: '12px 14px', fontWeight: 600, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => {
                  const catColor = CATEGORY_COLORS[exp.category] || CATEGORY_COLORS['Miscellaneous'];
                  return (
                    <tr
                      key={exp.id}
                      style={{
                        borderBottom: '1px solid var(--border-dim)',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Date */}
                      <td style={{ padding: '12px 14px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {exp.date ? new Date(exp.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                      </td>

                      {/* Title */}
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-main)' }}>
                        {exp.title}
                      </td>

                      {/* Building Scope Badge */}
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          padding: '3px 9px',
                          borderRadius: '8px',
                          background: exp.building ? 'rgba(249,115,22,0.12)' : 'rgba(255,255,255,0.06)',
                          color: exp.building ? 'var(--primary)' : 'var(--text-muted)',
                          border: `1px solid ${exp.building ? 'rgba(249,115,22,0.3)' : 'rgba(255,255,255,0.1)'}`,
                          fontSize: '0.74rem',
                          fontWeight: 600
                        }}>
                          {exp.building ? exp.building.name : '🌐 Shared / All'}
                        </span>
                      </td>

                      {/* Category Badge */}
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          background: catColor.bg,
                          color: catColor.text,
                          border: `1px solid ${catColor.border}`,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}>
                          {getCategoryIcon(exp.category)}
                          {exp.category}
                        </span>
                      </td>

                      {/* Payment Method */}
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: 'rgba(255, 255, 255, 0.06)',
                          color: 'var(--text-main)',
                          fontSize: '0.78rem',
                          fontWeight: 500
                        }}>
                          {exp.paymentMethod}
                        </span>
                      </td>

                      {/* Vendor / Notes */}
                      <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        {exp.vendor && <strong>{exp.vendor}</strong>}
                        {exp.vendor && exp.notes && ' • '}
                        {exp.notes && <span>{exp.notes}</span>}
                        {!exp.vendor && !exp.notes && <span style={{ opacity: 0.4 }}>—</span>}
                      </td>

                      {/* Amount */}
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#ef4444', fontSize: '0.95rem' }}>
                        ₹{exp.amount.toLocaleString('en-IN')}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          <button
                            onClick={() => openSingleEdit(exp)}
                            title="Edit Expense"
                            style={{
                              background: 'rgba(255,255,255,0.06)',
                              border: 'none',
                              color: 'var(--text-main)',
                              padding: '6px',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteExpense(exp.id, exp.title)}
                            title="Delete Expense"
                            style={{
                              background: 'rgba(239,68,68,0.1)',
                              border: 'none',
                              color: '#ef4444',
                              padding: '6px',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={14} />
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
      {isBulkModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.82)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
          animation: 'modalBackdropIn 0.25s ease'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '1120px',
            maxHeight: '88vh',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '24px',
            background: 'linear-gradient(145deg, #13141a 0%, #0d0e12 100%)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            overflow: 'hidden',
            boxShadow: '0 30px 80px rgba(0,0,0,0.8), 0 0 60px rgba(249, 115, 22, 0.15)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 28px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(90deg, rgba(249, 115, 22, 0.08) 0%, rgba(0, 0, 0, 0) 100%)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #f97316, #ea580c)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  boxShadow: '0 4px 14px rgba(249, 115, 22, 0.4)'
                }}>
                  <FileSpreadsheet size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
                    Multi-Row Quick Expense Adder
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                    Add multiple hostel expenses at once. Click preset chips below to prefill rows rapidly.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsBulkModalOpen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'rgba(255, 255, 255, 0.7)',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                  e.currentTarget.style.color = '#ef4444';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                }}
              >
                <XCircle size={20} />
              </button>
            </div>

            {/* Quick Preset Buttons Ribbon */}
            <div style={{
              padding: '12px 28px',
              background: 'rgba(0, 0, 0, 0.4)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              overflowX: 'auto',
              scrollbarWidth: 'none'
            }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--primary)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={14} /> + Add Preset Row:
              </span>
              {categories.flatMap(c => (c.presetItems || []).map(p => ({ title: p, cat: c.name }))).slice(0, 12).map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => addPresetToBulk(preset.title, preset.cat)}
                  style={{
                    background: 'rgba(249, 115, 22, 0.08)',
                    border: '1px solid rgba(249, 115, 22, 0.25)',
                    borderRadius: '16px',
                    padding: '5px 12px',
                    color: '#fff',
                    fontSize: '0.78rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(249, 115, 22, 0.25)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(249, 115, 22, 0.08)';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  <Plus size={12} color="#f97316" />
                  <span>{preset.title}</span>
                </button>
              ))}
            </div>

            {/* Modal Body: Multi-row Table */}
            <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
              <div style={{
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(0, 0, 0, 0.25)',
                overflow: 'hidden'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      color: 'rgba(255, 255, 255, 0.6)',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                      fontSize: '0.78rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      <th style={{ padding: '12px 14px', width: '36px', textAlign: 'center' }}>#</th>
                      <th style={{ padding: '12px 14px', minWidth: '200px' }}>Item Title *</th>
                      <th style={{ padding: '12px 14px', minWidth: '180px' }}>Category</th>
                      <th style={{ padding: '12px 14px', width: '140px' }}>Amount (₹) *</th>
                      <th style={{ padding: '12px 14px', width: '150px' }}>Date</th>
                      <th style={{ padding: '12px 14px', width: '120px' }}>Mode</th>
                      <th style={{ padding: '12px 14px', minWidth: '150px' }}>Vendor / Paid To</th>
                      <th style={{ padding: '12px 14px', width: '50px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkRows.map((row, index) => (
                      <tr
                        key={row.id}
                        style={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        {/* Index */}
                        <td style={{ padding: '10px 14px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 600, textAlign: 'center' }}>
                          {index + 1}
                        </td>

                        {/* Title */}
                        <td style={{ padding: '10px 8px' }}>
                          <input
                            type="text"
                            placeholder="e.g. Vegetables, Wifi..."
                            value={row.title}
                            onChange={(e) => updateBulkRow(row.id, 'title', e.target.value)}
                            style={{
                              width: '100%',
                              background: '#1a1c24',
                              border: '1px solid rgba(255, 255, 255, 0.12)',
                              borderRadius: '10px',
                              padding: '10px 12px',
                              color: '#ffffff',
                              fontSize: '0.88rem',
                              fontWeight: 500,
                              outline: 'none',
                              colorScheme: 'dark',
                              transition: 'border 0.2s, box-shadow 0.2s'
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = '#f97316';
                              e.target.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.2)';
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                              e.target.style.boxShadow = 'none';
                            }}
                          />
                        </td>

                        {/* Category */}
                        <td style={{ padding: '10px 8px' }}>
                          <select
                            value={row.category}
                            onChange={(e) => updateBulkRow(row.id, 'category', e.target.value)}
                            style={{
                              width: '100%',
                              background: '#1a1c24',
                              border: '1px solid rgba(255, 255, 255, 0.12)',
                              borderRadius: '10px',
                              padding: '10px 12px',
                              color: '#ffffff',
                              fontSize: '0.88rem',
                              fontWeight: 500,
                              outline: 'none',
                              colorScheme: 'dark',
                              cursor: 'pointer'
                            }}
                          >
                            {categories.map(c => (
                              <option key={c.id} value={c.name} style={{ background: '#13141a', color: '#fff' }}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Amount */}
                        <td style={{ padding: '10px 8px' }}>
                          <input
                            type="number"
                            placeholder="Amount ₹"
                            value={row.amount}
                            onChange={(e) => updateBulkRow(row.id, 'amount', e.target.value)}
                            style={{
                              width: '100%',
                              background: 'rgba(239, 68, 68, 0.08)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              borderRadius: '10px',
                              padding: '10px 12px',
                              color: '#ef4444',
                              fontWeight: 700,
                              fontSize: '0.92rem',
                              outline: 'none'
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = '#ef4444';
                              e.target.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.2)';
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                              e.target.style.boxShadow = 'none';
                            }}
                          />
                        </td>

                        {/* Date */}
                        <td style={{ padding: '10px 8px' }}>
                          <input
                            type="date"
                            value={row.date}
                            onChange={(e) => updateBulkRow(row.id, 'date', e.target.value)}
                            style={{
                              width: '100%',
                              background: '#1a1c24',
                              border: '1px solid rgba(255, 255, 255, 0.12)',
                              borderRadius: '10px',
                              padding: '9px 10px',
                              color: '#ffffff',
                              fontSize: '0.85rem',
                              fontWeight: 500,
                              outline: 'none',
                              colorScheme: 'dark'
                            }}
                          />
                        </td>

                        {/* Payment Method */}
                        <td style={{ padding: '10px 8px' }}>
                          <select
                            value={row.paymentMethod}
                            onChange={(e) => updateBulkRow(row.id, 'paymentMethod', e.target.value)}
                            style={{
                              width: '100%',
                              background: '#1a1c24',
                              border: '1px solid rgba(255, 255, 255, 0.12)',
                              borderRadius: '10px',
                              padding: '10px 10px',
                              color: '#ffffff',
                              fontSize: '0.85rem',
                              outline: 'none',
                              colorScheme: 'dark'
                            }}
                          >
                            <option value="Cash" style={{ background: '#13141a', color: '#fff' }}>Cash</option>
                            <option value="UPI" style={{ background: '#13141a', color: '#fff' }}>UPI</option>
                            <option value="Bank Transfer" style={{ background: '#13141a', color: '#fff' }}>Bank</option>
                            <option value="Card" style={{ background: '#13141a', color: '#fff' }}>Card</option>
                          </select>
                        </td>

                        {/* Vendor */}
                        <td style={{ padding: '10px 8px' }}>
                          <input
                            type="text"
                            placeholder="Vendor/Person"
                            value={row.vendor}
                            onChange={(e) => updateBulkRow(row.id, 'vendor', e.target.value)}
                            style={{
                              width: '100%',
                              background: '#1a1c24',
                              border: '1px solid rgba(255, 255, 255, 0.12)',
                              borderRadius: '10px',
                              padding: '10px 12px',
                              color: '#ffffff',
                              fontSize: '0.85rem',
                              outline: 'none'
                            }}
                          />
                        </td>

                        {/* Remove Row */}
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <button
                            onClick={() => removeBulkRow(row.id)}
                            style={{
                              background: 'rgba(239, 68, 68, 0.12)',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                              color: '#ef4444',
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)'}
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add Empty Row Button */}
              <button
                onClick={addEmptyBulkRow}
                style={{
                  marginTop: '16px',
                  background: 'rgba(249, 115, 22, 0.05)',
                  border: '1.5px dashed rgba(249, 115, 22, 0.4)',
                  borderRadius: '14px',
                  width: '100%',
                  padding: '12px',
                  color: 'var(--primary)',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(249, 115, 22, 0.12)';
                  e.currentTarget.style.borderColor = 'rgba(249, 115, 22, 0.7)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(249, 115, 22, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(249, 115, 22, 0.4)';
                }}
              >
                <Plus size={18} /> Add Another Empty Expense Row
              </button>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '18px 28px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(0, 0, 0, 0.4)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)' }}>Total Expense Amount:</span>
                <span style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: '#ef4444',
                  background: 'rgba(239, 68, 68, 0.1)',
                  padding: '4px 12px',
                  borderRadius: '10px',
                  border: '1px solid rgba(239, 68, 68, 0.3)'
                }}>
                  ₹{bulkRows.reduce((acc, r) => acc + (Number(r.amount) || 0), 0).toLocaleString('en-IN')}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setIsBulkModalOpen(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: 'rgba(255, 255, 255, 0.8)',
                    padding: '10px 20px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.88rem'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkSubmit}
                  style={{
                    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                    border: 'none',
                    color: '#fff',
                    padding: '10px 24px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    boxShadow: '0 4px 16px rgba(249, 115, 22, 0.4)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                >
                  Save All Expenses
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: SINGLE EXPENSE CREATE / EDIT ─────────────────────────────────── */}
      {isSingleModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.82)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
          animation: 'modalBackdropIn 0.25s ease'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '540px',
            borderRadius: '24px',
            background: 'linear-gradient(145deg, #13141a 0%, #0d0e12 100%)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            overflow: 'hidden',
            boxShadow: '0 30px 80px rgba(0,0,0,0.8), 0 0 50px rgba(249, 115, 22, 0.15)'
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(90deg, rgba(249, 115, 22, 0.08) 0%, rgba(0, 0, 0, 0) 100%)'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
                {editingExpense ? 'Edit Expense Record' : 'Add Single Expense'}
              </h3>
              <button
                onClick={() => setIsSingleModalOpen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'rgba(255, 255, 255, 0.7)',
                  borderRadius: '50%',
                  width: '34px',
                  height: '34px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <XCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleSingleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Title */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.7)', marginBottom: '6px' }}>
                  Expense Item Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Vegetables, Wifi Repair, Building Rent"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    background: '#1a1c24',
                    border: '1px solid rgba(255, 255, 255, 0.14)',
                    borderRadius: '10px',
                    padding: '11px 14px',
                    color: '#ffffff',
                    fontSize: '0.92rem',
                    fontWeight: 500,
                    outline: 'none',
                    colorScheme: 'dark'
                  }}
                />
              </div>

              {/* Building Workspace Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'rgba(249, 115, 22, 0.9)', marginBottom: '6px' }}>
                  Building Workspace Scope *
                </label>
                <select
                  value={formData.buildingId}
                  onChange={(e) => setFormData({ ...formData, buildingId: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'rgba(249, 115, 22, 0.08)',
                    border: '1px solid rgba(249, 115, 22, 0.3)',
                    borderRadius: '10px',
                    padding: '11px 12px',
                    color: '#ffffff',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    outline: 'none',
                    colorScheme: 'dark'
                  }}
                >
                  <option value="all" style={{ background: '#13141a', color: '#fff' }}>All Buildings (General Shared Expense)</option>
                  {availableBuildings.map(b => (
                    <option key={b.id} value={b.id} style={{ background: '#13141a', color: '#fff' }}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Category & Amount Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.7)', marginBottom: '6px' }}>
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    style={{
                      width: '100%',
                      background: '#1a1c24',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                      borderRadius: '10px',
                      padding: '11px 12px',
                      color: '#ffffff',
                      fontSize: '0.88rem',
                      outline: 'none',
                      colorScheme: 'dark'
                    }}
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.name} style={{ background: '#13141a', color: '#fff' }}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.7)', marginBottom: '6px' }}>
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 2500"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '10px',
                      padding: '11px 14px',
                      color: '#ef4444',
                      fontWeight: 700,
                      fontSize: '0.98rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Date & Payment Mode */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.7)', marginBottom: '6px' }}>
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    style={{
                      width: '100%',
                      background: '#1a1c24',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      color: '#ffffff',
                      fontSize: '0.88rem',
                      outline: 'none',
                      colorScheme: 'dark'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.7)', marginBottom: '6px' }}>
                    Payment Method
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    style={{
                      width: '100%',
                      background: '#1a1c24',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      color: '#ffffff',
                      fontSize: '0.88rem',
                      outline: 'none',
                      colorScheme: 'dark'
                    }}
                  >
                    <option value="Cash" style={{ background: '#13141a', color: '#fff' }}>Cash</option>
                    <option value="UPI" style={{ background: '#13141a', color: '#fff' }}>UPI</option>
                    <option value="Bank Transfer" style={{ background: '#13141a', color: '#fff' }}>Bank Transfer</option>
                    <option value="Card" style={{ background: '#13141a', color: '#fff' }}>Card</option>
                  </select>
                </div>
              </div>

              {/* Vendor & Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.7)', marginBottom: '6px' }}>
                  Vendor / Paid To (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Local Supermarket, Electrician Name"
                  value={formData.vendor}
                  onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                  style={{
                    width: '100%',
                    background: '#1a1c24',
                    border: '1px solid rgba(255, 255, 255, 0.14)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    color: '#ffffff',
                    fontSize: '0.88rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.7)', marginBottom: '6px' }}>
                  Notes / Invoice Ref (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Add additional details or bill receipt notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  style={{
                    width: '100%',
                    background: '#1a1c24',
                    border: '1px solid rgba(255, 255, 255, 0.14)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    color: '#ffffff',
                    fontSize: '0.88rem',
                    outline: 'none',
                    resize: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsSingleModalOpen(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: 'rgba(255, 255, 255, 0.8)',
                    padding: '10px 20px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.88rem'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                    border: 'none',
                    color: '#fff',
                    padding: '10px 24px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    boxShadow: '0 4px 16px rgba(249, 115, 22, 0.4)'
                  }}
                >
                  {editingExpense ? 'Save Changes' : 'Record Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── CUSTOMIZABLE REPORT SELECTION MODAL ────────────────────────────────────── */}
      {isReportModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '20px'
        }}>
          <div style={{
            background: 'linear-gradient(145deg, #181b24 0%, #111319 100%)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '540px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(255, 255, 255, 0.02)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'rgba(37, 99, 235, 0.15)',
                  border: '1px solid rgba(37, 99, 235, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#3b82f6'
                }}>
                  <Download size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#ffffff' }}>
                    Download Financial Report
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                    Select statement scope, month, and year for tailored PDF export
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsReportModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.5)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px'
                }}
              >
                <XCircle size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px' }}>
              
              {/* 1. Report Scope Switcher */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'rgba(255, 255, 255, 0.8)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  1. Select Report Type
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  padding: '4px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}>
                  <button
                    type="button"
                    onClick={() => setReportScope('monthly')}
                    style={{
                      background: reportScope === 'monthly' ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : 'transparent',
                      color: reportScope === 'monthly' ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
                      border: 'none',
                      padding: '10px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <Calendar size={16} /> Monthly Statement
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportScope('yearly')}
                    style={{
                      background: reportScope === 'yearly' ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' : 'transparent',
                      color: reportScope === 'yearly' ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
                      border: 'none',
                      padding: '10px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <BarChart3 size={16} /> Yearly Audit Report
                  </button>
                </div>
              </div>

              {/* 2. Period Selection */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'rgba(255, 255, 255, 0.8)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  2. Select Time Period
                </label>
                
                {reportScope === 'monthly' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {/* Month Picker */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px' }}>
                        Select Month
                      </label>
                      <select
                        value={reportSelectedMonth}
                        onChange={(e) => setReportSelectedMonth(e.target.value)}
                        style={{
                          width: '100%',
                          background: '#1a1c24',
                          border: '1px solid rgba(255, 255, 255, 0.16)',
                          borderRadius: '10px',
                          padding: '10px 12px',
                          color: '#ffffff',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          outline: 'none',
                          colorScheme: 'dark',
                          cursor: 'pointer'
                        }}
                      >
                        {MONTH_LIST.map((m) => (
                          <option key={m.value} value={m.value} style={{ background: '#1a1c24', color: '#fff' }}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Year Picker */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px' }}>
                        Select Year
                      </label>
                      <select
                        value={reportSelectedYear}
                        onChange={(e) => setReportSelectedYear(e.target.value)}
                        style={{
                          width: '100%',
                          background: '#1a1c24',
                          border: '1px solid rgba(255, 255, 255, 0.16)',
                          borderRadius: '10px',
                          padding: '10px 12px',
                          color: '#ffffff',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          outline: 'none',
                          colorScheme: 'dark',
                          cursor: 'pointer'
                        }}
                      >
                        {YEAR_LIST.map((y) => (
                          <option key={y} value={y} style={{ background: '#1a1c24', color: '#fff' }}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px' }}>
                      Select Audit Year
                    </label>
                    <select
                      value={reportSelectedYear}
                      onChange={(e) => setReportSelectedYear(e.target.value)}
                      style={{
                        width: '100%',
                        background: '#1a1c24',
                        border: '1px solid rgba(255, 255, 255, 0.16)',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        color: '#ffffff',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        outline: 'none',
                        colorScheme: 'dark',
                        cursor: 'pointer'
                      }}
                    >
                      {YEAR_LIST.map((y) => (
                        <option key={y} value={y} style={{ background: '#1a1c24', color: '#fff' }}>
                          Year {y}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* 3. Category Filter */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'rgba(255, 255, 255, 0.8)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  3. Category Filter
                </label>
                <select
                  value={reportCategoryFilter}
                  onChange={(e) => setReportCategoryFilter(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#1a1c24',
                    border: '1px solid rgba(255, 255, 255, 0.16)',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    outline: 'none',
                    colorScheme: 'dark',
                    cursor: 'pointer'
                  }}
                >
                  <option value="All" style={{ background: '#1a1c24' }}>All Categories</option>
                  <option value="Kitchen & Groceries" style={{ background: '#1a1c24' }}>Kitchen & Groceries</option>
                  <option value="Utilities & Bills" style={{ background: '#1a1c24' }}>Utilities & Bills</option>
                  <option value="Staff & Wages" style={{ background: '#1a1c24' }}>Staff & Wages</option>
                  <option value="Maintenance & Repairs" style={{ background: '#1a1c24' }}>Maintenance & Repairs</option>
                  <option value="Rent & Infra" style={{ background: '#1a1c24' }}>Rent & Infra</option>
                  <option value="Miscellaneous" style={{ background: '#1a1c24' }}>Miscellaneous</option>
                </select>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: 'rgba(255, 255, 255, 0.8)',
                    padding: '10px 18px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.88rem'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteGeneratePDF}
                  disabled={isGeneratingReport}
                  style={{
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    border: 'none',
                    color: '#fff',
                    padding: '10px 22px',
                    borderRadius: '10px',
                    cursor: isGeneratingReport ? 'not-allowed' : 'pointer',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    boxShadow: '0 4px 16px rgba(37, 99, 235, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    opacity: isGeneratingReport ? 0.7 : 1
                  }}
                >
                  {isGeneratingReport ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Generating PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      <span>✨ Generate PDF Statement</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Finance;
