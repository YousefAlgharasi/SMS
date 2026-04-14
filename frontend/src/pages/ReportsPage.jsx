import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsAPI } from '../services/api';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const COLORS = ['#4f5eff', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const tooltipStyle = {
  contentStyle: { background: '#1c1e2a', border: '1px solid #2a2d3e', borderRadius: 8 },
  labelStyle: { color: '#9ca3af' },
  itemStyle: { color: '#e2e4f0' }
};

const EmptyChart = ({ message = 'No data for this period' }) => (
  <div className="h-48 flex flex-col items-center justify-center text-gray-600 gap-2">
    <span className="text-3xl opacity-40">◳</span>
    <p className="text-sm">{message}</p>
  </div>
);

// ── CSV / Excel export helpers ────────────────────────────────────────────────
function escapeCsv(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsv(rows) {
  return rows.map(row => row.map(escapeCsv).join(',')).join('\r\n');
}

function downloadCsv(filename, csvString) {
  // BOM so Excel opens UTF-8 correctly
  const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportSalesReport({ sales, startDate, endDate, groupBy }) {
  if (!sales) return;

  const sheets = [];

  // ── Sheet 1: Summary ──────────────────────────────────────────────────────
  sheets.push('SALES REPORT SUMMARY');
  sheets.push(`Period,${startDate} to ${endDate}`);
  sheets.push(`Group By,${groupBy}`);
  sheets.push('');
  sheets.push(buildCsv([
    ['Metric', 'Value'],
    ['Total Revenue',   `$${(sales.summary?.totalRevenue || 0).toFixed(2)}`],
    ['Total Transactions', sales.summary?.totalCount || 0],
    ['Avg Order Value', `$${(sales.summary?.avgOrderValue || 0).toFixed(2)}`],
  ]));
  sheets.push('');

  // ── Sheet 2: Revenue Over Time ────────────────────────────────────────────
  sheets.push('REVENUE OVER TIME');
  sheets.push(buildCsv([
    ['Date', 'Revenue ($)', 'Transactions', 'Tax ($)', 'Discounts ($)'],
    ...(sales.salesData || []).map(r => [
      r._id,
      (r.revenue || 0).toFixed(2),
      r.count || 0,
      (r.tax || 0).toFixed(2),
      (r.discounts || 0).toFixed(2),
    ])
  ]));
  sheets.push('');

  // ── Sheet 3: Payment Methods ──────────────────────────────────────────────
  sheets.push('PAYMENT METHODS');
  sheets.push(buildCsv([
    ['Method', 'Revenue ($)', 'Transactions'],
    ...(sales.paymentBreakdown || []).map(r => [
      (r._id || '').replace('_', ' '),
      (r.total || 0).toFixed(2),
      r.count || 0,
    ])
  ]));
  sheets.push('');

  // ── Sheet 4: Top Products ─────────────────────────────────────────────────
  sheets.push('TOP PRODUCTS');
  sheets.push(buildCsv([
    ['#', 'Product', 'Revenue ($)', 'Units Sold'],
    ...(sales.topProducts || []).map((p, i) => [
      i + 1,
      p.name || '',
      (p.revenue || 0).toFixed(2),
      p.quantity || 0,
    ])
  ]));

  const filename = `sales-report_${startDate}_to_${endDate}.csv`;
  downloadCsv(filename, sheets.join('\r\n'));
}

function exportInventoryReport(inv) {
  if (!inv) return;
  const rows = [
    ['INVENTORY REPORT'],
    [`Generated, ${new Date().toLocaleDateString()}`],
    [''],
    ['STOCK BY CATEGORY'],
    ['Category', 'Products', 'Total Stock', 'Value ($)'],
    ...(inv.byCategory || []).map(c => [
      c._id,
      c.productCount || '',
      c.totalStock || '',
      (c.value || 0).toFixed(2),
    ]),
    [''],
    ['LOW STOCK ITEMS'],
    ['Product', 'Category', 'Current Stock', 'Reorder Level'],
    ...(inv.lowStockItems || []).map(p => [
      p.name,
      p.category,
      p.stock,
      p.reorderLevel,
    ]),
  ];
  downloadCsv(`inventory-report_${new Date().toISOString().slice(0,10)}.csv`, buildCsv(rows));
}

function exportCustomerReport(cust) {
  if (!cust) return;
  const rows = [
    ['CUSTOMER REPORT'],
    [`Generated, ${new Date().toLocaleDateString()}`],
    [''],
    ['TOP CUSTOMERS'],
    ['#', 'Name', 'Total Spent ($)', 'Orders', 'Loyalty Points'],
    ...(cust.topCustomers || []).map((c, i) => [
      i + 1,
      `${c.firstName || ''} ${c.lastName || ''}`.trim(),
      (c.totalSpent || 0).toFixed(2),
      c.totalPurchases || 0,
      c.loyaltyPoints || 0,
    ]),
  ];
  downloadCsv(`customer-report_${new Date().toISOString().slice(0,10)}.csv`, buildCsv(rows));
}
// ─────────────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [groupBy, setGroupBy] = useState('day');

  const { data: salesData,     isLoading: salesLoading,     error: salesError }  = useQuery({
    queryKey: ['report-sales', startDate, endDate, groupBy],
    queryFn:  () => reportsAPI.getSales({ startDate, endDate, groupBy }),
    retry: 1,
  });
  const { data: inventoryData, isLoading: invLoading }   = useQuery({ queryKey: ['report-inventory'], queryFn: reportsAPI.getInventory,  retry: 1 });
  const { data: customerData,  isLoading: custLoading }  = useQuery({ queryKey: ['report-customers'], queryFn: reportsAPI.getCustomers,  retry: 1 });

  const sales = salesData?.data;
  const inv   = inventoryData?.data;
  const cust  = customerData?.data;

  if (salesError) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <span className="text-4xl">⚠</span>
      <p className="text-red-400 font-medium">Failed to load reports</p>
      <p className="text-gray-500 text-sm">{salesError?.message || 'Check that you have Supervisor or Admin access'}</p>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* ── Filters + Export ─────────────────────────────────────────────── */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 flex-wrap">

          {/* Date controls */}
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <div>
              <label className="label">Start Date</label>
              <input type="date" className="input w-full sm:w-40" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="label">End Date</label>
              <input type="date" className="input w-full sm:w-40" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Group By</label>
              <select className="input w-full sm:w-28" value={groupBy} onChange={e => setGroupBy(e.target.value)}>
                <option value="day">Daily</option>
                <option value="month">Monthly</option>
              </select>
            </div>
          </div>

          {/* Summary numbers */}
          {sales?.summary && (
            <div className="flex gap-4 sm:gap-6 text-sm flex-wrap">
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-bold text-white">
                  ${sales.summary.totalRevenue >= 1000
                    ? `${(sales.summary.totalRevenue / 1000).toFixed(1)}k`
                    : sales.summary.totalRevenue?.toFixed(2)}
                </p>
                <p className="text-gray-500 text-xs">Total Revenue</p>
              </div>
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-bold text-white">{sales.summary.totalCount}</p>
                <p className="text-gray-500 text-xs">Transactions</p>
              </div>
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-bold text-white">${sales.summary.avgOrderValue?.toFixed(2)}</p>
                <p className="text-gray-500 text-xs">Avg Order</p>
              </div>
            </div>
          )}

          {/* Export buttons */}
          <div className="flex gap-2 sm:ml-auto flex-wrap">
            <div className="relative group">
              <button className="btn-secondary text-sm flex items-center gap-2 whitespace-nowrap">
                <span>⬇</span> Export Excel
                <span className="text-gray-500">▾</span>
              </button>
              <div className="absolute right-0 top-full mt-1 bg-surface-1 border border-surface-border rounded-xl shadow-xl z-20 py-1 min-w-44 hidden group-hover:block group-focus-within:block">
                <button
                  onClick={() => exportSalesReport({ sales, startDate, endDate, groupBy })}
                  disabled={!sales}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-surface-2 hover:text-white transition-colors flex items-center gap-2"
                >
                  <span>📊</span> Sales Report
                </button>
                <button
                  onClick={() => exportInventoryReport(inv)}
                  disabled={!inv}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-surface-2 hover:text-white transition-colors flex items-center gap-2"
                >
                  <span>📦</span> Inventory Report
                </button>
                <button
                  onClick={() => exportCustomerReport(cust)}
                  disabled={!cust}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-surface-2 hover:text-white transition-colors flex items-center gap-2"
                >
                  <span>👥</span> Customer Report
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Revenue + Transactions charts ────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="text-white font-semibold text-sm mb-4">Revenue Over Time</h3>
          {salesLoading ? (
            <div className="h-48 flex items-center justify-center text-gray-600 text-sm animate-pulse">Loading...</div>
          ) : sales?.salesData?.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={sales.salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" />
                <XAxis dataKey="_id" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={v => groupBy === 'month' ? v : v?.slice(5)} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={v => `$${v}`} width={55} />
                <Tooltip {...tooltipStyle} formatter={(v, name) => [name === 'revenue' ? `$${Number(v).toFixed(2)}` : v, name === 'revenue' ? 'Revenue' : 'Orders']} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#4f5eff" strokeWidth={2} dot={false} name="revenue" />
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>

        <div className="card">
          <h3 className="text-white font-semibold text-sm mb-4">Transactions Over Time</h3>
          {salesLoading ? (
            <div className="h-48 flex items-center justify-center text-gray-600 text-sm animate-pulse">Loading...</div>
          ) : sales?.salesData?.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={sales.salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" />
                <XAxis dataKey="_id" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={v => groupBy === 'month' ? v : v?.slice(5)} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} allowDecimals={false} width={35} />
                <Tooltip {...tooltipStyle} formatter={v => [v, 'Transactions']} />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} name="Transactions" />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* Payment Methods */}
        <div className="card">
          <h3 className="text-white font-semibold text-sm mb-4">Revenue by Payment Method</h3>
          {salesLoading ? (
            <div className="h-48 flex items-center justify-center text-gray-600 text-sm animate-pulse">Loading...</div>
          ) : sales?.paymentBreakdown?.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={sales.paymentBreakdown}
                  dataKey="total" nameKey="_id"
                  cx="50%" cy="50%" outerRadius="65%"
                  label={({ _id, percent }) => `${(_id || '').replace('_', ' ')} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {sales.paymentBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip {...tooltipStyle} formatter={v => [`$${Number(v).toFixed(2)}`, 'Revenue']} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart message="No payment data yet" />}
        </div>

        {/* Top Products */}
        <div className="card">
          <h3 className="text-white font-semibold text-sm mb-4">Top Products by Revenue</h3>
          {salesLoading ? (
            <div className="h-48 flex items-center justify-center text-gray-600 text-sm animate-pulse">Loading...</div>
          ) : sales?.topProducts?.length ? (
            <div className="space-y-3 mt-2">
              {sales.topProducts.slice(0, 5).map((p, i) => (
                <div key={p._id || i} className="flex items-center gap-3">
                  <span className="text-gray-600 text-xs w-4 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-white truncate pr-2">{p.name || 'Unknown'}</span>
                      <span className="text-brand-400 shrink-0">${Number(p.revenue || 0).toFixed(0)}</span>
                    </div>
                    <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-600 rounded-full" style={{ width: `${(p.revenue / (sales.topProducts[0]?.revenue || 1)) * 100}%` }} />
                    </div>
                    <p className="text-gray-600 text-xs mt-0.5">{p.quantity} units sold</p>
                  </div>
                </div>
              ))}
            </div>
          ) : <EmptyChart message="No sales data yet" />}
        </div>

        {/* Inventory by Category */}
        <div className="card">
          <h3 className="text-white font-semibold text-sm mb-4">Inventory Value by Category</h3>
          {invLoading ? (
            <div className="h-48 flex items-center justify-center text-gray-600 text-sm animate-pulse">Loading...</div>
          ) : inv?.byCategory?.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={inv.byCategory} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={v => `$${v}`} />
                <YAxis type="category" dataKey="_id" tick={{ fill: '#9ca3af', fontSize: 11 }} width={90} />
                <Tooltip {...tooltipStyle} formatter={v => [`$${Number(v).toFixed(2)}`, 'Value']} />
                <Bar dataKey="value" fill="#4f5eff" radius={[0, 4, 4, 0]} name="Value ($)" />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart message="No inventory data" />}
        </div>

        {/* Top Customers */}
        <div className="card">
          <h3 className="text-white font-semibold text-sm mb-4">Top Customers by Spend</h3>
          {custLoading ? (
            <div className="h-48 flex items-center justify-center text-gray-600 text-sm animate-pulse">Loading...</div>
          ) : cust?.topCustomers?.length ? (
            <div className="space-y-0">
              {cust.topCustomers.slice(0, 5).map((c, i) => (
                <div key={c._id || i} className="flex items-center justify-between py-3 border-b border-surface-border last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-600 text-xs w-4 shrink-0">{i + 1}</span>
                    <div className="w-8 h-8 rounded-full bg-brand-600/20 flex items-center justify-center text-brand-400 text-xs font-bold shrink-0">
                      {c.firstName?.[0] || '?'}
                    </div>
                    <span className="text-white text-sm">{c.firstName} {c.lastName}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-400 text-sm font-semibold">${Number(c.totalSpent || 0).toFixed(0)}</p>
                    <p className="text-gray-600 text-xs">{c.totalPurchases} orders</p>
                  </div>
                </div>
              ))}
            </div>
          ) : <EmptyChart message="No customer data yet" />}
        </div>

      </div>
    </div>
  );
}
