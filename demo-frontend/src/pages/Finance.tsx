import React, { useState } from 'react';
import {
  Wallet, IndianRupee, TrendingUp, TrendingDown, Plus,
  PieChart as PieIcon, BarChart3, Filter, Trash2, Calendar,
  CreditCard, ArrowUpRight, ArrowDownRight, Tag, X
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { useDemoData } from '../context/DemoDataContext';
import { useToast } from '../context/ToastContext';
import { Expense } from '../types';

export const Finance: React.FC = () => {
  const {
    expenses,
    feeRecords,
    categories,
    selectedBuildingId,
    activeBuildingName,
    selectedMonth,
    addExpense,
    deleteExpense,
  } = useDemoData();

  const { success } = useToast();

  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');

  // New Expense form state
  const [newExpense, setNewExpense] = useState({
    title: '',
    category: categories[0]?.name || 'Mess & Food Provisions',
    amount: 5000,
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'UPI' as 'Cash' | 'UPI' | 'Bank Transfer' | 'Card',
    vendor: '',
    notes: '',
  });

  // Filter expenses by building & category
  const filteredExpenses = expenses.filter(e => {
    if (selectedBuildingId !== 'all' && e.buildingId && e.buildingId !== selectedBuildingId) return false;
    if (selectedCategoryFilter !== 'All' && e.category !== selectedCategoryFilter) return false;
    return true;
  });

  // Calculate Monthly Financials
  const monthlyFeeRecords = feeRecords.filter(f => f.month === selectedMonth);
  const totalRevenue = monthlyFeeRecords.reduce((acc, f) => acc + f.amount, 0);

  const monthlyExpenses = expenses.filter(e => e.date.startsWith(selectedMonth));
  const totalExpenses = monthlyExpenses.reduce((acc, e) => acc + e.amount, 0);

  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

  // Aggregate Category breakdown data for Pie Chart
  const categoryTotals: { [key: string]: number } = {};
  monthlyExpenses.forEach(e => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  });

  const pieColors = ['#10b981', '#6366f1', '#f59e0b', '#06b6d4', '#ec4899', '#8b5cf6', '#64748b'];

  const pieData = Object.keys(categoryTotals).map((cat, idx) => ({
    name: cat,
    value: categoryTotals[cat],
    color: pieColors[idx % pieColors.length],
  }));

  // Historical Bar Chart Data (October, September, August)
  const barChartData = [
    { month: 'Aug 2026', Income: 142000, Expenses: 78000, Profit: 64000 },
    { month: 'Sep 2026', Income: 168000, Expenses: 92000, Profit: 76000 },
    { month: 'Oct 2026', Income: totalRevenue, Expenses: totalExpenses, Profit: netProfit },
  ];

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.title.trim() || newExpense.amount <= 0) return;

    addExpense({
      title: newExpense.title.trim(),
      category: newExpense.category,
      amount: Number(newExpense.amount),
      date: newExpense.date,
      paymentMethod: newExpense.paymentMethod,
      vendor: newExpense.vendor.trim() || undefined,
      notes: newExpense.notes.trim() || undefined,
      buildingId: selectedBuildingId !== 'all' ? selectedBuildingId : undefined,
    });

    success(`Operating expense of ₹${newExpense.amount.toLocaleString()} logged under ${newExpense.category}!`);
    setShowAddExpenseModal(false);
    setNewExpense({
      title: '',
      category: categories[0]?.name || 'Mess & Food Provisions',
      amount: 5000,
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'UPI',
      vendor: '',
      notes: '',
    });
  };

  return (
    <div className="animate-fade-in finance-page">
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Financial MIS & Profit/Loss</h1>
          <p className="page-subtitle">
            Facility: <strong>{activeBuildingName}</strong> · Month: <strong>{selectedMonth}</strong> · Real-time cashflow accounting.
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => setShowAddExpenseModal(true)}>
          <Plus size={16} />
          <span>+ Record Operating Expense</span>
        </button>
      </div>

      {/* Top P&L KPI Cards */}
      <div className="responsive-grid-4 mb-6">
        <div className="glass-card stat-card">
          <div className="stat-card-title">TOTAL REVENUE (INFLOW)</div>
          <div className="stat-card-value text-emerald">₹{totalRevenue.toLocaleString('en-IN')}</div>
          <div className="stat-card-footer">
            <span className="trend-badge trend-up">
              <ArrowUpRight size={13} /> Fee Collections
            </span>
            <span className="text-muted">{monthlyFeeRecords.length} Receipts</span>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-card-title">OPERATING EXPENSES (OUTFLOW)</div>
          <div className="stat-card-value text-danger">₹{totalExpenses.toLocaleString('en-IN')}</div>
          <div className="stat-card-footer">
            <span className="trend-badge trend-down">
              <ArrowDownRight size={13} /> Utilities, Mess, Staff
            </span>
            <span className="text-muted">{monthlyExpenses.length} Bills</span>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-card-title">NET OPERATING PROFIT (EBITDA)</div>
          <div className={`stat-card-value ${netProfit >= 0 ? 'text-cyan' : 'text-danger'}`}>
            ₹{netProfit.toLocaleString('en-IN')}
          </div>
          <div className="stat-card-footer">
            <span className="text-muted">Net Cash Surplus</span>
            <span className={`badge ${netProfit >= 0 ? 'badge-success' : 'badge-danger'}`}>
              {netProfit >= 0 ? 'Positive ROI' : 'Deficit'}
            </span>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-card-title">PROFIT MARGIN</div>
          <div className="stat-card-value text-amber">{profitMargin}%</div>
          <div className="stat-card-footer">
            <span className="text-muted">Operating efficiency</span>
            <span className="badge badge-accent">Optimal</span>
          </div>
        </div>
      </div>

      {/* Interactive Charts Row */}
      <div className="charts-grid-2 mb-6">
        {/* Income vs Expenses Bar Chart */}
        <div className="glass-card p-6 chart-card">
          <div className="widget-header">
            <div>
              <h3 className="widget-title">Monthly Income vs Operating Expenses</h3>
              <p className="widget-subtitle">Historical quarterly cash flow comparison (INR)</p>
            </div>
            <span className="badge badge-outline">Quarterly MIS</span>
          </div>

          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.4)" fontSize={12} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, '']}
                />
                <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Category Pie / Donut Chart */}
        <div className="glass-card p-6 chart-card">
          <div className="widget-header">
            <div>
              <h3 className="widget-title">Expense Distribution by Category</h3>
              <p className="widget-subtitle">Breakdown for {selectedMonth}</p>
            </div>
            <span className="badge badge-outline">{pieData.length} Categories</span>
          </div>

          <div style={{ width: '100%', height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {pieData.length === 0 ? (
              <div className="text-muted" style={{ fontSize: '0.85rem' }}>No expenses recorded for {selectedMonth} yet.</div>
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                  />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Expense Categories Cards */}
      <div className="mb-6">
        <h3 className="section-title mb-3">Operating Expense Categories</h3>
        <div className="categories-scroll-grid">
          {categories.map(cat => {
            const spent = expenses
              .filter(e => e.category === cat.name && e.date.startsWith(selectedMonth))
              .reduce((acc, e) => acc + e.amount, 0);

            return (
              <div key={cat.id} className="glass-card category-pill-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <div className="cat-bullet" style={{ backgroundColor: cat.color }} />
                  <span className="cat-name">{cat.name}</span>
                </div>
                <div className="cat-amount">₹{spent.toLocaleString('en-IN')}</div>
                <div className="cat-items-hint">{cat.presetItems.slice(0, 2).join(' • ')}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expense Records Log Table */}
      <div className="glass-card p-4 table-card">
        <div className="table-header-info">
          <div>
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>Operating Expenses Ledger</span>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Showing {filteredExpenses.length} transaction entries
            </div>
          </div>

          {/* Category Filter */}
          <div className="filter-pill-select">
            <select
              value={selectedCategoryFilter}
              onChange={e => setSelectedCategoryFilter(e.target.value)}
            >
              <option value="All">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Expense Item</th>
                <th>Category</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Payment Mode</th>
                <th>Vendor / Notes</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>
                    <div className="text-muted">No expenses recorded for this filter.</div>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map(exp => (
                  <tr key={exp.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{exp.title}</div>
                    </td>
                    <td>
                      <span className="badge badge-outline">
                        <Tag size={11} style={{ marginRight: 4 }} />
                        {exp.category}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>
                        {new Date(exp.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </td>
                    <td style={{ fontWeight: 700, color: '#ef4444' }}>
                      ₹{exp.amount.toLocaleString('en-IN')}
                    </td>
                    <td>
                      <span className="badge badge-outline">{exp.paymentMethod}</span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>{exp.vendor || 'Direct Purchase'}</div>
                      {exp.notes && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{exp.notes}</div>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-ghost btn-sm text-danger"
                        onClick={() => {
                          deleteExpense(exp.id);
                          success('Expense entry deleted');
                        }}
                        title="Delete Expense"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===================== ADD EXPENSE MODAL ===================== */}
      {showAddExpenseModal && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setShowAddExpenseModal(false)}>
          <div className="modal-card modal-md animate-scale-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Record Operating Expense</h3>
              <button className="btn-close" onClick={() => setShowAddExpenseModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleCreateExpense}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="form-label">EXPENSE DESCRIPTION / TITLE *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Weekly Vegetables & Fruits Wholesale"
                    value={newExpense.title}
                    onChange={e => setNewExpense({ ...newExpense, title: e.target.value })}
                  />
                </div>

                <div className="form-grid-2">
                  <div>
                    <label className="form-label">EXPENSE CATEGORY *</label>
                    <select
                      className="form-input"
                      value={newExpense.category}
                      onChange={e => setNewExpense({ ...newExpense, category: e.target.value })}
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label">AMOUNT (INR) *</label>
                    <input
                      type="number"
                      required
                      className="form-input"
                      value={newExpense.amount}
                      onChange={e => setNewExpense({ ...newExpense, amount: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div>
                    <label className="form-label">EXPENSE DATE *</label>
                    <input
                      type="date"
                      required
                      className="form-input"
                      value={newExpense.date}
                      onChange={e => setNewExpense({ ...newExpense, date: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="form-label">PAYMENT METHOD</label>
                    <select
                      className="form-input"
                      value={newExpense.paymentMethod}
                      onChange={e => setNewExpense({ ...newExpense, paymentMethod: e.target.value as any })}
                    >
                      <option value="UPI">UPI</option>
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Card">Card</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="form-label">VENDOR / RECIPIENT NAME</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Rythu Bazaar / D-Mart / Staff"
                    value={newExpense.vendor}
                    onChange={e => setNewExpense({ ...newExpense, vendor: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowAddExpenseModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Finance;
