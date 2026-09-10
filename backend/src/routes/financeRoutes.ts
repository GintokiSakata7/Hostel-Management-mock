import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

export function createFinanceRouter(prisma: PrismaClient) {
  const router = Router();

  // In-Memory Fast Cache for Financial Summaries
  const summaryCache = new Map<string, { data: any; timestamp: number }>();
  const CACHE_TTL_MS = 30000; // 30 seconds
  const invalidateCache = () => summaryCache.clear();

  // Helper: get current month string YYYY-MM
  const currentMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  // Helper: format month label
  const monthLabel = (m?: string | null) => {
    if (!m || typeof m !== 'string') return 'N/A';
    const parts = m.split('-');
    if (parts.length < 2) return m;
    const [y, mo] = parts;
    const date = new Date(Number(y), Number(mo) - 1, 1);
    if (isNaN(date.getTime())) return m;
    return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  };

  // Default Categories & Dynamic Presets
  const DEFAULT_CATEGORIES = [
    {
      name: 'Kitchen & Groceries',
      icon: 'Utensils',
      presetItems: ['Vegetables', 'Non-Veg Groceries', 'Rice & Flours', 'Milk & Dairy', 'Cooking Oil', 'Gas Cylinder', 'Spices & Provisions', 'Drinking Water Cans']
    },
    {
      name: 'Utilities & Bills',
      icon: 'Zap',
      presetItems: ['Electricity Bill', 'Wifi / Internet Charges', 'Washing Machine Charges', 'Water Bill', 'Waste Disposal']
    },
    {
      name: 'Maintenance & Repairs',
      icon: 'Wrench',
      presetItems: ['Washing Machine Repair', 'Plumbing Repair', 'Electrical Repair', 'RO Water Service', 'Building Painting', 'Carpenter / Lock Repair']
    },
    {
      name: 'Staff & Wages',
      icon: 'Users',
      presetItems: ['Worker Wages', 'Cook Salary', 'Cleaning Maid Salary', 'Security Guard Salary']
    },
    {
      name: 'Rent & Infra',
      icon: 'Building',
      presetItems: ['Hostel Building Rent', 'Property Tax', 'Utensils Purchase', 'Appliance Purchase', 'Furniture Repair']
    },
    {
      name: 'Miscellaneous',
      icon: 'Package',
      presetItems: ['Cleaning Supplies', 'First Aid / Medical', 'Emergency Cash Expense', 'Stationery & Printing']
    }
  ];

  // Seed default categories if none exist
  const seedDefaultCategories = async () => {
    try {
      const count = await (prisma as any).expenseCategory.count();
      if (count === 0) {
        for (const cat of DEFAULT_CATEGORIES) {
          await (prisma as any).expenseCategory.create({
            data: cat
          });
        }
      }
    } catch (e) {
      console.error('Failed to seed categories:', e);
    }
  };

  // 1. GET Categories
  router.get('/categories', async (req: Request, res: Response) => {
    try {
      await seedDefaultCategories();
      const categories = await (prisma as any).expenseCategory.findMany({
        orderBy: { name: 'asc' }
      });
      res.json(categories);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch categories: ' + err.message });
    }
  });

  // 2. POST Add/Update Category
  router.get('/categories/seed', async (req: Request, res: Response) => {
    try {
      for (const cat of DEFAULT_CATEGORIES) {
        await (prisma as any).expenseCategory.upsert({
          where: { name: cat.name },
          update: { presetItems: cat.presetItems, icon: cat.icon },
          create: cat
        });
      }
      res.json({ success: true, message: 'Categories seeded successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. GET Expenses (Filterable & Searchable)
  router.get('/expenses', async (req: Request, res: Response) => {
    try {
      const { month, date, category, search, startDate, endDate, year } = req.query as {
        month?: string;
        date?: string;
        category?: string;
        search?: string;
        startDate?: string;
        endDate?: string;
        year?: string;
      };

      const whereClause: any = {};

      if (category && category !== 'All') {
        whereClause.category = category;
      }

      if (search && search.trim() !== '') {
        whereClause.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { vendor: { contains: search, mode: 'insensitive' } },
          { notes: { contains: search, mode: 'insensitive' } }
        ];
      }

      if (date) {
        const startOfDay = new Date(`${date}T00:00:00.000Z`);
        const endOfDay = new Date(`${date}T23:59:59.999Z`);
        whereClause.date = { gte: startOfDay, lte: endOfDay };
      } else if (startDate && endDate) {
        whereClause.date = {
          gte: new Date(startDate),
          lte: new Date(`${endDate}T23:59:59.999Z`)
        };
      } else if (year && !month) {
        const yNum = Number(year);
        const start = new Date(yNum, 0, 1);
        const end = new Date(yNum, 11, 31, 23, 59, 59, 999);
        whereClause.date = { gte: start, lte: end };
      } else if (month) {
        const [year, m] = month.split('-').map(Number);
        const start = new Date(year, m - 1, 1);
        const end = new Date(year, m, 0, 23, 59, 59, 999);
        whereClause.date = { gte: start, lte: end };
      }

      const expenses = await (prisma as any).expense.findMany({

        where: whereClause,
        orderBy: { date: 'desc' }
      });

      res.json(expenses);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch expenses: ' + err.message });
    }
  });

  // 4. POST Create Expense
  router.post('/expenses', async (req: Request, res: Response) => {
    try {
      const { title, category, amount, date, paymentMethod, vendor, notes } = req.body;
      if (!title || !amount) {
        return res.status(400).json({ error: 'Title and amount are required' });
      }

      const expense = await (prisma as any).expense.create({
        data: {
          title: String(title).trim(),
          category: category || 'Miscellaneous',
          amount: Number(amount),
          date: date ? new Date(date) : new Date(),
          paymentMethod: paymentMethod || 'Cash',
          vendor: vendor ? String(vendor).trim() : null,
          notes: notes ? String(notes).trim() : null
        }
      });

      invalidateCache();
      res.json(expense);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to create expense: ' + err.message });
    }
  });

  // 5. POST Bulk Expenses (Spreadsheet Mode)
  router.post('/expenses/bulk', async (req: Request, res: Response) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Items array is required' });
      }

      const validItems = items
        .filter((item: any) => item.title && Number(item.amount) > 0)
        .map((item: any) => ({
          title: String(item.title).trim(),
          category: item.category || 'Miscellaneous',
          amount: Number(item.amount),
          date: item.date ? new Date(item.date) : new Date(),
          paymentMethod: item.paymentMethod || 'Cash',
          vendor: item.vendor ? String(item.vendor).trim() : null,
          notes: item.notes ? String(item.notes).trim() : null
        }));

      if (validItems.length === 0) {
        return res.status(400).json({ error: 'No valid expense items provided' });
      }

      const created = await (prisma as any).expense.createMany({
        data: validItems
      });

      invalidateCache();
      res.json({ success: true, count: created.count });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to add bulk expenses: ' + err.message });
    }
  });

  // 6. PUT Update Expense
  router.put('/expenses/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { title, category, amount, date, paymentMethod, vendor, notes } = req.body;

      const updated = await (prisma as any).expense.update({
        where: { id },
        data: {
          title: title ? String(title).trim() : undefined,
          category,
          amount: amount !== undefined ? Number(amount) : undefined,
          date: date ? new Date(date) : undefined,
          paymentMethod,
          vendor: vendor !== undefined ? (vendor ? String(vendor).trim() : null) : undefined,
          notes: notes !== undefined ? (notes ? String(notes).trim() : null) : undefined
        }
      });

      invalidateCache();
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update expense: ' + err.message });
    }
  });

  // 7. DELETE Expense
  router.delete('/expenses/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await (prisma as any).expense.delete({ where: { id } });
      invalidateCache();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to delete expense: ' + err.message });
    }
  });

  // 8. GET Finance / MIS Summary
  router.get('/summary', async (req: Request, res: Response) => {
    try {
      const { month, date, year: queryYear } = req.query as { month?: string; date?: string; year?: string };
      let m = month || currentMonth();
      if (date) m = date.substring(0, 7);

      const cacheKey = `${m}_${date || ''}_${queryYear || ''}`;
      const cached = summaryCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
        return res.json(cached.data);
      }

      const [year, mNum] = m.split('-').map(Number);
      let startDate: Date;
      let endDate: Date;
      let dateLabel: string;

      if (queryYear && !month) {
        const yNum = Number(queryYear);
        startDate = new Date(yNum, 0, 1);
        endDate = new Date(yNum, 11, 31, 23, 59, 59, 999);
        dateLabel = `Full Year ${yNum}`;
      } else if (date) {
        startDate = new Date(`${date}T00:00:00.000Z`);
        endDate = new Date(`${date}T23:59:59.999Z`);
        const dObj = new Date(date);
        dateLabel = isNaN(dObj.getTime()) ? date : dObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      } else {
        startDate = new Date(year, mNum - 1, 1);
        endDate = new Date(year, mNum, 0, 23, 59, 59, 999);
        dateLabel = monthLabel(m);
      }

      // Revenue: Total completed fees for the month / period
      const feeWhere: any = { status: 'Completed' };
      if (queryYear && !month) {
        feeWhere.month = { startsWith: `${queryYear}-` };
      } else {
        feeWhere.month = m;
        if (date) {
          feeWhere.date = { gte: startDate, lte: endDate };
        }
      }
      const feeRevenueAgg = await prisma.fee.aggregate({
        where: feeWhere,
        _sum: { amount: true }
      });
      let totalRevenue = feeRevenueAgg._sum.amount || 0;
      if (date && totalRevenue === 0) {
        const monthlyRevAgg = await prisma.fee.aggregate({
          where: { month: m, status: 'Completed' },
          _sum: { amount: true }
        });
        totalRevenue = monthlyRevAgg._sum.amount || 0;
      }

      // Expenses: Total expenses in the date range
      const expenseAgg = await (prisma as any).expense.aggregate({
        where: { date: { gte: startDate, lte: endDate } },
        _sum: { amount: true },
        _count: { id: true }
      });

      const totalExpense = expenseAgg._sum.amount || 0;
      const expenseCount = expenseAgg._count.id || 0;

      // Profit & Loss
      const netProfit = totalRevenue - totalExpense;
      const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0';

      // Category Breakdown
      const categoryGroups = await (prisma as any).expense.groupBy({
        by: ['category'],
        where: { date: { gte: startDate, lte: endDate } },
        _sum: { amount: true },
        _count: { id: true }
      });

      const categoryBreakdown = categoryGroups.map((group: any) => {
        const amt = group._sum.amount || 0;
        return {
          category: group.category,
          amount: amt,
          count: group._count.id || 0,
          percentage: totalExpense > 0 ? Math.round((amt / totalExpense) * 100) : 0
        };
      }).sort((a: any, b: any) => b.amount - a.amount);

      // Monthly Trend (Last 6 months executed concurrently via Promise.all)
      const trendPromises = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(year, mNum - 1 - i, 1);
        const yStr = d.getFullYear();
        const mStr = String(d.getMonth() + 1).padStart(2, '0');
        const monthKey = `${yStr}-${mStr}`;
        const monthStart = new Date(yStr, d.getMonth(), 1);
        const monthEnd = new Date(yStr, d.getMonth() + 1, 0, 23, 59, 59, 999);

        trendPromises.push(
          Promise.all([
            prisma.fee.aggregate({
              where: { month: monthKey, status: 'Completed' },
              _sum: { amount: true }
            }),
            (prisma as any).expense.aggregate({
              where: { date: { gte: monthStart, lte: monthEnd } },
              _sum: { amount: true }
            })
          ]).then(([revRes, expRes]) => ({
            month: monthKey,
            label: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
            revenue: revRes._sum.amount || 0,
            expense: expRes._sum.amount || 0,
            profit: (revRes._sum.amount || 0) - (expRes._sum.amount || 0)
          }))
        );
      }

      const monthlyTrends = await Promise.all(trendPromises);

      const responsePayload = {
        month: m,
        monthLabel: monthLabel(m),
        totalRevenue,
        totalExpense,
        netProfit,
        profitMargin: Number(profitMargin),
        expenseCount,
        categoryBreakdown,
        monthlyTrends
      };

      summaryCache.set(cacheKey, { data: responsePayload, timestamp: Date.now() });
      res.json(responsePayload);

    } catch (err: any) {
      res.status(500).json({ error: 'Failed to generate finance summary: ' + err.message });
    }
  });

  return router;
}
