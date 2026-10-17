import React, { useState, useMemo } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { formatINR } from '../../services/gstEngine';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Table as TableIcon,
  Building2,
  Percent,
  Sparkles,
  Info,
} from 'lucide-react';

export type TrendMetricMode = 'rev_profit' | 'all' | 'revenue_only' | 'profit_only';
export type TrendViewMode = 'chart' | 'table';

interface MonthData {
  key: string;
  label: string;
  fullName: string;
  year: number;
  monthIdx: number;
  isCurrent: boolean;
  isPastOrCurrent: boolean;
  revenue: number;
  taxableRevenue: number;
  purchasesCost: number;
  operatingExpenses: number;
  totalCosts: number;
  profit: number;
  margin: number;
  invoiceCount: number;
  purchaseCount: number;
  expenseCount: number;
}

// Generate smooth cubic bezier curve through points
function getSmoothCurvePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  return path;
}

// Format short rupee values for Y-axis (e.g., ₹50K, ₹1.5L, ₹1Cr)
function formatShortINR(val: number): string {
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';

  if (abs >= 10000000) {
    return `${sign}₹${(abs / 10000000).toFixed(1)}Cr`;
  }
  if (abs >= 100000) {
    const lakh = abs / 100000;
    return `${sign}₹${lakh % 1 === 0 ? lakh.toFixed(0) : lakh.toFixed(1)}L`;
  }
  if (abs >= 1000) {
    const k = abs / 1000;
    return `${sign}₹${k % 1 === 0 ? k.toFixed(0) : k.toFixed(0)}k`;
  }
  return `${sign}₹${abs}`;
}

export const FinancialTrendsSection: React.FC = () => {
  const { business, businesses, invoices, purchases, expenses } = useBusiness();

  // Local Controls
  const [selectedFY, setSelectedFY] = useState<'2026-27' | '2025-26'>('2026-27');
  const [metricMode, setMetricMode] = useState<TrendMetricMode>('rev_profit');
  const [viewMode, setViewMode] = useState<TrendViewMode>('chart');
  const [companyScope, setCompanyScope] = useState<string>('ACTIVE'); // 'ACTIVE' or 'ALL' or specific bizId
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(6); // Default highlight October

  // Current system date for ongoing month indicator
  const today = new Date();
  const currentYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  // Build the 12 months definition for the selected financial year
  const fyMonthsDefinition = useMemo(() => {
    const startYear = selectedFY === '2026-27' ? 2026 : 2025;
    const endYear = startYear + 1;

    return [
      { key: `${startYear}-04`, label: 'Apr', fullName: `April ${startYear}`, year: startYear, monthIdx: 3 },
      { key: `${startYear}-05`, label: 'May', fullName: `May ${startYear}`, year: startYear, monthIdx: 4 },
      { key: `${startYear}-06`, label: 'Jun', fullName: `June ${startYear}`, year: startYear, monthIdx: 5 },
      { key: `${startYear}-07`, label: 'Jul', fullName: `July ${startYear}`, year: startYear, monthIdx: 6 },
      { key: `${startYear}-08`, label: 'Aug', fullName: `August ${startYear}`, year: startYear, monthIdx: 7 },
      { key: `${startYear}-09`, label: 'Sep', fullName: `September ${startYear}`, year: startYear, monthIdx: 8 },
      { key: `${startYear}-10`, label: 'Oct', fullName: `October ${startYear}`, year: startYear, monthIdx: 9 },
      { key: `${startYear}-11`, label: 'Nov', fullName: `November ${startYear}`, year: startYear, monthIdx: 10 },
      { key: `${startYear}-12`, label: 'Dec', fullName: `December ${startYear}`, year: startYear, monthIdx: 11 },
      { key: `${endYear}-01`, label: 'Jan', fullName: `January ${endYear}`, year: endYear, monthIdx: 0 },
      { key: `${endYear}-02`, label: 'Feb', fullName: `February ${endYear}`, year: endYear, monthIdx: 1 },
      { key: `${endYear}-03`, label: 'Mar', fullName: `March ${endYear}`, year: endYear, monthIdx: 2 },
    ];
  }, [selectedFY]);

  // Aggregate monthly data
  const monthlyData: MonthData[] = useMemo(() => {
    return fyMonthsDefinition.map((m) => {
      const isCurrent = m.key === currentYearMonth;
      const isPastOrCurrent = m.key <= currentYearMonth;

      // Invoices in this month
      const mInvoices = invoices.filter((i) => {
        if (i.status === 'CANCELLED') return false;
        if (companyScope === 'ACTIVE' && (i.businessId || business.id) !== business.id) return false;
        if (companyScope !== 'ACTIVE' && companyScope !== 'ALL' && (i.businessId || business.id) !== companyScope) return false;
        return (i.date || '').startsWith(m.key);
      });

      const revenue = mInvoices.reduce((acc, i) => acc + (i.grandTotal || 0), 0);
      const taxableRevenue = mInvoices.reduce((acc, i) => acc + (i.totalTaxable || 0), 0);

      // Purchases in this month
      const mPurchases = purchases.filter((p) => {
        if (companyScope === 'ACTIVE' && (p.businessId || business.id) !== business.id) return false;
        if (companyScope !== 'ACTIVE' && companyScope !== 'ALL' && (p.businessId || business.id) !== companyScope) return false;
        return (p.date || '').startsWith(m.key);
      });
      const purchasesCost = mPurchases.reduce((acc, p) => acc + (p.grandTotal || 0), 0);

      // Expenses in this month
      const mExpenses = expenses.filter((e) => {
        if (companyScope === 'ACTIVE' && (e.businessId || business.id) !== business.id) return false;
        if (companyScope !== 'ACTIVE' && companyScope !== 'ALL' && (e.businessId || business.id) !== companyScope) return false;
        return (e.date || '').startsWith(m.key);
      });
      const operatingExpenses = mExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);

      const totalCosts = purchasesCost + operatingExpenses;
      const profit = revenue - totalCosts;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

      return {
        ...m,
        isCurrent,
        isPastOrCurrent,
        revenue,
        taxableRevenue,
        purchasesCost,
        operatingExpenses,
        totalCosts,
        profit,
        margin,
        invoiceCount: mInvoices.length,
        purchaseCount: mPurchases.length,
        expenseCount: mExpenses.length,
      };
    });
  }, [fyMonthsDefinition, currentYearMonth, invoices, purchases, expenses, companyScope, business.id]);

  // Overall Financial Year Summary Aggregates
  const fySummary = useMemo(() => {
    const totalRevenue = monthlyData.reduce((acc, m) => acc + m.revenue, 0);
    const totalPurchases = monthlyData.reduce((acc, m) => acc + m.purchasesCost, 0);
    const totalExpenses = monthlyData.reduce((acc, m) => acc + m.operatingExpenses, 0);
    const totalCosts = totalPurchases + totalExpenses;
    const netProfit = totalRevenue - totalCosts;
    const overallMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Months with recorded sales so far
    const activeMonths = monthlyData.filter((m) => m.revenue > 0 || m.totalCosts > 0);
    const activeMonthsCount = Math.max(1, activeMonths.length);
    const avgMonthlyRevenue = totalRevenue / activeMonthsCount;
    const avgMonthlyProfit = netProfit / activeMonthsCount;

    // Best revenue month
    const bestMonth = [...monthlyData].sort((a, b) => b.revenue - a.revenue)[0];
    // Best profit month
    const bestProfitMonth = [...monthlyData].sort((a, b) => b.profit - a.profit)[0];

    return {
      totalRevenue,
      totalPurchases,
      totalExpenses,
      totalCosts,
      netProfit,
      overallMargin,
      avgMonthlyRevenue,
      avgMonthlyProfit,
      bestMonth,
      bestProfitMonth,
      activeMonthsCount,
    };
  }, [monthlyData]);

  // SVG Chart Dimensions & Coordinate Mapping
  const chartWidth = 960;
  const chartHeight = 310;
  const padding = { top: 30, right: 35, bottom: 45, left: 75 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;

  // Calculate Value Range for Y-axis
  const { minVal, maxVal, yTicks, zeroY } = useMemo(() => {
    const allRevenues = monthlyData.map((m) => m.revenue);
    const allProfits = monthlyData.map((m) => m.profit);
    const allCosts = monthlyData.map((m) => m.totalCosts);

    let highest = Math.max(...allRevenues, ...allProfits, ...allCosts, 50000);
    let lowest = Math.min(0, ...allProfits);

    // Add 15% headroom on top
    highest = highest * 1.15;
    if (lowest < 0) {
      lowest = lowest * 1.15;
    }

    const range = highest - lowest;
    const tickCount = 5;
    const tickStep = range / (tickCount - 1);

    const ticks: number[] = [];
    for (let i = 0; i < tickCount; i++) {
      ticks.push(lowest + i * tickStep);
    }

    // Coordinate function
    const getY = (val: number) => {
      const normalized = (val - lowest) / (range || 1);
      return padding.top + plotHeight - normalized * plotHeight;
    };

    return {
      minVal: lowest,
      maxVal: highest,
      yTicks: ticks,
      zeroY: getY(0),
    };
  }, [monthlyData, padding.top, plotHeight]);

  const getYCoord = (val: number) => {
    const range = maxVal - minVal;
    const normalized = (val - minVal) / (range || 1);
    return padding.top + plotHeight - normalized * plotHeight;
  };

  const getXCoord = (index: number) => {
    const step = plotWidth / (monthlyData.length - 1);
    return padding.left + index * step;
  };

  // Generate Point Sets
  const revenuePoints = useMemo(() => {
    return monthlyData.map((m, idx) => ({
      x: getXCoord(idx),
      y: getYCoord(m.revenue),
      val: m.revenue,
    }));
  }, [monthlyData, maxVal, minVal]);

  const profitPoints = useMemo(() => {
    return monthlyData.map((m, idx) => ({
      x: getXCoord(idx),
      y: getYCoord(m.profit),
      val: m.profit,
    }));
  }, [monthlyData, maxVal, minVal]);

  const costsPoints = useMemo(() => {
    return monthlyData.map((m, idx) => ({
      x: getXCoord(idx),
      y: getYCoord(m.totalCosts),
      val: m.totalCosts,
    }));
  }, [monthlyData, maxVal, minVal]);

  // Curve paths
  const revenueCurve = useMemo(() => getSmoothCurvePath(revenuePoints), [revenuePoints]);
  const profitCurve = useMemo(() => getSmoothCurvePath(profitPoints), [profitPoints]);
  const costsCurve = useMemo(() => getSmoothCurvePath(costsPoints), [costsPoints]);

  // Area paths
  const revenueArea = useMemo(() => {
    if (revenuePoints.length === 0) return '';
    const firstX = revenuePoints[0].x;
    const lastX = revenuePoints[revenuePoints.length - 1].x;
    return `${revenueCurve} L ${lastX.toFixed(1)} ${zeroY.toFixed(1)} L ${firstX.toFixed(1)} ${zeroY.toFixed(1)} Z`;
  }, [revenueCurve, revenuePoints, zeroY]);

  const profitArea = useMemo(() => {
    if (profitPoints.length === 0) return '';
    const firstX = profitPoints[0].x;
    const lastX = profitPoints[profitPoints.length - 1].x;
    return `${profitCurve} L ${lastX.toFixed(1)} ${zeroY.toFixed(1)} L ${firstX.toFixed(1)} ${zeroY.toFixed(1)} Z`;
  }, [profitCurve, profitPoints, zeroY]);

  // Current Hovered Month Data
  const activeHoveredMonth = hoveredIndex !== null ? monthlyData[hoveredIndex] : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 md:p-6 space-y-6">
      {/* 1. Header & Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" />
              Financial Year Performance
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-xs font-semibold text-slate-700">FY {selectedFY}</span>
            <span className="text-slate-300">·</span>
            <span className="text-[11px] text-slate-500">April 1 to March 31</span>
          </div>
          <h3 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight">
            Monthly Profit & Revenue Trajectory
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Visualize recurring sales inflows, operating overhead, and net margin growth across 12 fiscal months.
          </p>
        </div>

        {/* Action & Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Company Scope Selector (if multiple entities exist) */}
          {businesses.length > 1 && (
            <div className="flex items-center gap-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={companyScope}
                onChange={(e) => setCompanyScope(e.target.value)}
                className="bg-transparent text-slate-700 font-medium focus:outline-none cursor-pointer text-xs"
              >
                <option value="ACTIVE">{business.name} (Active)</option>
                <option value="ALL">All Companies Combined</option>
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Metric Filter Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setMetricMode('rev_profit')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                metricMode === 'rev_profit'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Revenue & Profit
            </button>
            <button
              onClick={() => setMetricMode('revenue_only')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                metricMode === 'revenue_only'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Revenue Only
            </button>
            <button
              onClick={() => setMetricMode('profit_only')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                metricMode === 'profit_only'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Profit Only
            </button>
            <button
              onClick={() => setMetricMode('all')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                metricMode === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All (Rev + Cost + Profit)
            </button>
          </div>

          {/* View Mode Toggle (Chart vs Table) */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setViewMode('chart')}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === 'chart'
                  ? 'bg-white text-indigo-600 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Line Chart View"
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-indigo-600 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Monthly Breakdown Table"
            >
              <TableIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top Fiscal KPI Metric Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Revenue */}
        <div className="bg-slate-50/80 p-3.5 sm:p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">FY Total Revenue</span>
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900">
            {formatINR(fySummary.totalRevenue)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Avg: {formatINR(fySummary.avgMonthlyRevenue)}/mo</span>
            <span className="text-indigo-600 font-semibold">{invoices.length} Invoices</span>
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-emerald-50/50 p-3.5 sm:p-4 rounded-xl border border-emerald-200/80">
          <div className="flex items-center justify-between text-emerald-800 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">FY Net Profit</span>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <div
            className={`text-xl sm:text-2xl font-bold ${
              fySummary.netProfit >= 0 ? 'text-emerald-950' : 'text-rose-700'
            }`}
          >
            {formatINR(fySummary.netProfit)}
          </div>
          <div className="text-[11px] mt-1 flex items-center justify-between">
            <span className="text-emerald-700 font-semibold">
              Margin: {fySummary.overallMargin.toFixed(1)}%
            </span>
            <span className="text-emerald-700">
              Avg: {formatINR(fySummary.avgMonthlyProfit)}/mo
            </span>
          </div>
        </div>

        {/* Total Outflows & COGS */}
        <div className="bg-slate-50/80 p-3.5 sm:p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Purchases & Expenses</span>
            <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900">
            {formatINR(fySummary.totalCosts)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Purchases: {formatINR(fySummary.totalPurchases)}</span>
            <span>OpEx: {formatINR(fySummary.totalExpenses)}</span>
          </div>
        </div>

        {/* Peak Sales Month */}
        <div className="bg-slate-50/80 p-3.5 sm:p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Peak Sales Month</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="text-base sm:text-lg font-bold text-slate-900 truncate">
            {fySummary.bestMonth?.revenue > 0 ? fySummary.bestMonth.fullName : 'No data yet'}
          </div>
          <div className="text-[11px] text-indigo-700 font-semibold mt-1">
            {fySummary.bestMonth?.revenue > 0
              ? `${formatINR(fySummary.bestMonth.revenue)} sales`
              : 'Add invoices to rank'}
          </div>
        </div>
      </div>

      {/* 3. Main Visualization Area */}
      {viewMode === 'chart' ? (
        <div className="space-y-3">
          {/* Legend and Active Month Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 text-xs">
            {/* Chart Legend */}
            <div className="flex items-center gap-4 text-xs font-medium">
              {(metricMode === 'rev_profit' || metricMode === 'revenue_only' || metricMode === 'all') && (
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1 rounded-full bg-indigo-600" />
                  <span className="text-slate-700 font-semibold">Revenue</span>
                  <span className="text-slate-400 font-mono text-[11px]">({formatINR(fySummary.totalRevenue)})</span>
                </div>
              )}

              {(metricMode === 'rev_profit' || metricMode === 'profit_only' || metricMode === 'all') && (
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1 rounded-full bg-emerald-500" />
                  <span className="text-slate-700 font-semibold">Net Profit</span>
                  <span className="text-emerald-700 font-mono text-[11px]">({formatINR(fySummary.netProfit)})</span>
                </div>
              )}

              {metricMode === 'all' && (
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1 rounded-full bg-rose-400" />
                  <span className="text-slate-700 font-semibold">Purchases & OpEx</span>
                  <span className="text-slate-400 font-mono text-[11px]">({formatINR(fySummary.totalCosts)})</span>
                </div>
              )}
            </div>

            {/* Hover details pill */}
            {activeHoveredMonth && (
              <div className="text-xs text-slate-600 flex items-center gap-2">
                <span className="font-bold text-slate-900">{activeHoveredMonth.fullName}</span>
                {activeHoveredMonth.isCurrent && (
                  <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-1.5 py-0.2 rounded">
                    Current
                  </span>
                )}
                <span>· Rev: <strong className="text-indigo-600">{formatINR(activeHoveredMonth.revenue)}</strong></span>
                <span>· Profit: <strong className={activeHoveredMonth.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{formatINR(activeHoveredMonth.profit)}</strong></span>
              </div>
            )}
          </div>

          {/* SVG Line Chart Canvas */}
          <div className="relative w-full overflow-hidden bg-gradient-to-b from-slate-50/50 to-white rounded-xl border border-slate-200/90 p-2 sm:p-4">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-64 sm:h-72 md:h-80 select-none overflow-visible"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                {/* Revenue Gradient */}
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.22" />
                  <stop offset="85%" stopColor="#4f46e5" stopOpacity="0.02" />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
                </linearGradient>

                {/* Profit Gradient */}
                <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="85%" stopColor="#10b981" stopOpacity="0.03" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>

                {/* Drop shadow for active nodes */}
                <filter id="nodeShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.25" />
                </filter>
              </defs>

              {/* Horizontal Grid Lines & Y-Axis Labels */}
              {yTicks.map((tickVal, i) => {
                const y = getYCoord(tickVal);
                const isZero = Math.abs(tickVal) < 1;
                return (
                  <g key={`ytick-${i}`}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={chartWidth - padding.right}
                      y2={y}
                      stroke={isZero ? '#94a3b8' : '#e2e8f0'}
                      strokeWidth={isZero ? 1.2 : 0.8}
                      strokeDasharray={isZero ? '4 3' : undefined}
                    />
                    <text
                      x={padding.left - 10}
                      y={y + 3.5}
                      textAnchor="end"
                      fill={isZero ? '#475569' : '#94a3b8'}
                      fontSize="10"
                      fontWeight={isZero ? '600' : '400'}
                      fontFamily="monospace"
                    >
                      {formatShortINR(tickVal)}
                    </text>
                  </g>
                );
              })}

              {/* Vertical Month Guide Lines */}
              {monthlyData.map((m, idx) => {
                const x = getXCoord(idx);
                const isHovered = hoveredIndex === idx;
                return (
                  <g key={`xgrid-${idx}`}>
                    <line
                      x1={x}
                      y1={padding.top}
                      x2={x}
                      y2={chartHeight - padding.bottom}
                      stroke={isHovered ? '#6366f1' : '#f1f5f9'}
                      strokeWidth={isHovered ? 1.5 : 0.8}
                      strokeDasharray={isHovered ? '3 3' : undefined}
                    />

                    {/* X-axis Month Label */}
                    <text
                      x={x}
                      y={chartHeight - padding.bottom + 18}
                      textAnchor="middle"
                      fill={isHovered ? '#1e1b4b' : m.isCurrent ? '#4f46e5' : '#64748b'}
                      fontSize={m.isCurrent ? '11.5' : '10.5'}
                      fontWeight={isHovered || m.isCurrent ? '700' : '500'}
                    >
                      {m.label}
                    </text>

                    {/* Current Month Under-Indicator Dot */}
                    {m.isCurrent && (
                      <circle
                        cx={x}
                        cy={chartHeight - padding.bottom + 27}
                        r="2.5"
                        fill="#4f46e5"
                      />
                    )}
                  </g>
                );
              })}

              {/* 1. Revenue Area Fill */}
              {(metricMode === 'rev_profit' || metricMode === 'revenue_only' || metricMode === 'all') && (
                <path d={revenueArea} fill="url(#revenueGradient)" />
              )}

              {/* 2. Profit Area Fill */}
              {(metricMode === 'rev_profit' || metricMode === 'profit_only' || metricMode === 'all') && (
                <path d={profitArea} fill="url(#profitGradient)" />
              )}

              {/* 3. Costs Line (if All metricMode selected) */}
              {metricMode === 'all' && (
                <path
                  d={costsCurve}
                  fill="none"
                  stroke="#fb7185"
                  strokeWidth="2"
                  strokeDasharray="4 3"
                />
              )}

              {/* 4. Revenue Stroke Line */}
              {(metricMode === 'rev_profit' || metricMode === 'revenue_only' || metricMode === 'all') && (
                <path
                  d={revenueCurve}
                  fill="none"
                  stroke="#4f46e5"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* 5. Profit Stroke Line */}
              {(metricMode === 'rev_profit' || metricMode === 'profit_only' || metricMode === 'all') && (
                <path
                  d={profitCurve}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* 6. Interactive Data Nodes for Points */}
              {monthlyData.map((m, idx) => {
                const x = getXCoord(idx);
                const isHovered = hoveredIndex === idx;

                const revY = getYCoord(m.revenue);
                const profY = getYCoord(m.profit);
                const costY = getYCoord(m.totalCosts);

                return (
                  <g key={`nodes-${idx}`} className="transition-all">
                    {/* Revenue node */}
                    {(metricMode === 'rev_profit' || metricMode === 'revenue_only' || metricMode === 'all') && (
                      <circle
                        cx={x}
                        cy={revY}
                        r={isHovered ? 5.5 : 3.5}
                        fill="#ffffff"
                        stroke="#4f46e5"
                        strokeWidth={isHovered ? 2.5 : 1.8}
                        filter={isHovered ? 'url(#nodeShadow)' : undefined}
                      />
                    )}

                    {/* Profit node */}
                    {(metricMode === 'rev_profit' || metricMode === 'profit_only' || metricMode === 'all') && (
                      <circle
                        cx={x}
                        cy={profY}
                        r={isHovered ? 5.5 : 3.5}
                        fill="#ffffff"
                        stroke={m.profit >= 0 ? '#10b981' : '#f43f5e'}
                        strokeWidth={isHovered ? 2.5 : 1.8}
                        filter={isHovered ? 'url(#nodeShadow)' : undefined}
                      />
                    )}

                    {/* Cost node */}
                    {metricMode === 'all' && (
                      <circle
                        cx={x}
                        cy={costY}
                        r={isHovered ? 4.5 : 2.5}
                        fill="#ffffff"
                        stroke="#f43f5e"
                        strokeWidth="1.5"
                      />
                    )}

                    {/* Wide Invisible Click / Hover Target Column */}
                    <rect
                      x={x - plotWidth / (monthlyData.length - 1) / 2}
                      y={padding.top}
                      width={plotWidth / (monthlyData.length - 1)}
                      height={plotHeight}
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onClick={() => setHoveredIndex(idx)}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip Box */}
            {activeHoveredMonth && (
              <div
                className="hidden sm:block absolute top-4 right-4 bg-slate-900/95 backdrop-blur-md text-white rounded-xl p-3.5 shadow-xl border border-slate-700/80 text-xs w-64 pointer-events-none transition-all z-10"
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                  <div className="font-bold flex items-center gap-1.5 text-slate-100">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{activeHoveredMonth.fullName}</span>
                  </div>
                  {activeHoveredMonth.isCurrent && (
                    <span className="text-[10px] font-bold bg-indigo-500 text-white px-1.5 py-0.2 rounded">
                      Ongoing
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 font-mono text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5 font-sans">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      Gross Revenue:
                    </span>
                    <span className="font-bold text-white">{formatINR(activeHoveredMonth.revenue)}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5 font-sans">
                      <span className="w-2 h-2 rounded-full bg-rose-400" />
                      Purchases & OpEx:
                    </span>
                    <span className="text-slate-300">{formatINR(activeHoveredMonth.totalCosts)}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-xs">
                    <span className="text-slate-200 flex items-center gap-1.5 font-sans font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      Net Profit:
                    </span>
                    <span
                      className={`font-bold ${
                        activeHoveredMonth.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {formatINR(activeHoveredMonth.profit)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                    <span className="font-sans">Profit Margin:</span>
                    <span
                      className={`font-bold ${
                        activeHoveredMonth.margin >= 0 ? 'text-emerald-300' : 'text-rose-300'
                      }`}
                    >
                      {activeHoveredMonth.revenue > 0 ? `${activeHoveredMonth.margin.toFixed(1)}%` : '0.0%'}
                    </span>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between font-sans">
                  <span>{activeHoveredMonth.invoiceCount} invoices issued</span>
                  <span>{activeHoveredMonth.purchaseCount} purchase bills</span>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* 4. Detailed Financial Statement Table View */
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-2.5 px-3">Fiscal Month</th>
                <th className="py-2.5 px-3 text-right">Invoices</th>
                <th className="py-2.5 px-3 text-right">Gross Sales (₹)</th>
                <th className="py-2.5 px-3 text-right">Taxable Sales (₹)</th>
                <th className="py-2.5 px-3 text-right">Purchases (₹)</th>
                <th className="py-2.5 px-3 text-right">OpEx (₹)</th>
                <th className="py-2.5 px-3 text-right">Net Profit (₹)</th>
                <th className="py-2.5 px-3 text-right">Profit Margin</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {monthlyData.map((m) => (
                <tr
                  key={m.key}
                  className={`hover:bg-slate-50 transition-colors ${
                    m.isCurrent ? 'bg-indigo-50/40 font-medium' : ''
                  }`}
                >
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{m.fullName}</span>
                      {m.isCurrent && (
                        <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-1.5 py-0.2 rounded">
                          Current
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-600">{m.invoiceCount}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                    {formatINR(m.revenue)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                    {formatINR(m.taxableRevenue)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                    {formatINR(m.purchasesCost)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                    {formatINR(m.operatingExpenses)}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right font-mono font-bold ${
                      m.profit > 0 ? 'text-emerald-700' : m.profit < 0 ? 'text-rose-700' : 'text-slate-400'
                    }`}
                  >
                    {formatINR(m.profit)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold">
                    <span
                      className={
                        m.margin > 0 ? 'text-emerald-700' : m.margin < 0 ? 'text-rose-700' : 'text-slate-400'
                      }
                    >
                      {m.revenue > 0 ? `${m.margin.toFixed(1)}%` : '-'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {m.profit > 0 ? (
                      <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        Profitable
                      </span>
                    ) : m.profit < 0 ? (
                      <span className="text-[10px] font-semibold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                        Deficit
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-500">
                        {m.isPastOrCurrent ? 'Break-even' : 'Upcoming'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
                <td className="py-3 px-3">FY {selectedFY} Total</td>
                <td className="py-3 px-3 text-right font-mono">{invoices.length}</td>
                <td className="py-3 px-3 text-right font-mono text-indigo-700">{formatINR(fySummary.totalRevenue)}</td>
                <td className="py-3 px-3 text-right font-mono">
                  {formatINR(monthlyData.reduce((acc, m) => acc + m.taxableRevenue, 0))}
                </td>
                <td className="py-3 px-3 text-right font-mono">{formatINR(fySummary.totalPurchases)}</td>
                <td className="py-3 px-3 text-right font-mono">{formatINR(fySummary.totalExpenses)}</td>
                <td
                  className={`py-3 px-3 text-right font-mono ${
                    fySummary.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {formatINR(fySummary.netProfit)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-emerald-700">
                  {fySummary.overallMargin.toFixed(1)}%
                </td>
                <td className="py-3 px-3 text-center font-semibold text-slate-700">12 Months</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* 5. Helpful Insight Footer */}
      <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-slate-400 shrink-0" />
          <span>
            Profit formula: <strong>Gross Sales Invoiced</strong> minus <strong>Purchases (COGS)</strong> and <strong>Operating Expenses</strong>.
          </span>
        </div>
        <div className="font-mono text-slate-600 text-[11px]">
          Current Month: <strong>{activeHoveredMonth?.fullName || 'October 2026'}</strong>
        </div>
      </div>
    </div>
  );
};
