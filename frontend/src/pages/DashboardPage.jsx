import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI } from '../services/api';
import StatCard from '../components/common/StatCard';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const fmt = (n) => {
  if (!n) return '$0.00';
  return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(2)}`;
};

const statusBadge = {
  completed: 'badge-success',
  pending: 'badge-warning',
  refunded: 'badge-danger',
  partially_refunded: 'badge-warning'
};
const pmIcon = { cash: '💵', card: '💳', digital_wallet: '📱' };

const tooltipStyle = {
  contentStyle: { background: '#1c1e2a', border: '1px solid #2a2d3e', borderRadius: 8, fontSize: 12 },
  labelStyle: { color: '#9ca3af' },
  itemStyle: { color: '#e2e4f0' }
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardAPI.getStats(),
    refetchInterval: 30000
  });
  const stats = data?.data;

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* KPI Cards — 2 cols on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Today's Revenue"
          value={fmt(stats?.today?.revenue)}
          icon="◈" color="brand"
          trend={stats?.today?.growthRate}
          subtitle={`${stats?.today?.transactions || 0} transactions`}
        />
        <StatCard
          title="Monthly Revenue"
          value={fmt(stats?.month?.revenue)}
          icon="◳" color="emerald"
          subtitle={`${stats?.month?.transactions || 0} orders`}
        />
        <StatCard
          title="Customers"
          value={stats?.totalCustomers?.toLocaleString() || '—'}
          icon="◉" color="purple"
        />
        <StatCard
          title="Low Stock"
          value={stats?.lowStockCount || 0}
          icon="⚠"
          color={stats?.lowStockCount > 0 ? 'amber' : 'emerald'}
          subtitle="Products need reorder"
        />
      </div>

      {/* Charts — stacked on tablet, side by side on xl */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="text-white font-semibold text-sm mb-4">Revenue — Last 7 Days</h3>
          {stats?.salesTrend?.length ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={stats.salesTrend}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f5eff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4f5eff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" />
                <XAxis dataKey="_id" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={v => v?.slice(5)} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={v => `$${v}`} width={50} />
                <Tooltip {...tooltipStyle} formatter={v => [`$${Number(v).toFixed(2)}`, 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#4f5eff" strokeWidth={2} fill="url(#grad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-gray-600 text-sm">No data yet</div>
          )}
        </div>

        <div className="card">
          <h3 className="text-white font-semibold text-sm mb-4">Transactions — Last 7 Days</h3>
          {stats?.salesTrend?.length ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.salesTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" />
                <XAxis dataKey="_id" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={v => v?.slice(5)} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} allowDecimals={false} width={30} />
                <Tooltip {...tooltipStyle} formatter={v => [v, 'Transactions']} />
                <Bar dataKey="count" fill="#4f5eff" radius={[4, 4, 0, 0]} name="Transactions" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-gray-600 text-sm">No data yet</div>
          )}
        </div>
      </div>

      {/* Recent Sales */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold text-sm">Recent Sales</h3>
          <button onClick={() => navigate('/sales')} className="text-brand-400 hover:text-brand-300 text-xs transition-colors">
            View all →
          </button>
        </div>

        {isLoading ? (
          <div className="h-40 flex items-center justify-center text-gray-600 text-sm animate-pulse">Loading...</div>
        ) : stats?.recentSales?.length ? (
          <div>
            {stats.recentSales.map(sale => (
              <div
                key={sale._id}
                onClick={() => navigate(`/sales/${sale._id}`)}
                className="flex items-center justify-between py-3 border-b border-surface-border last:border-0 hover:bg-surface-2/30 -mx-5 px-5 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-lg shrink-0">{pmIcon[sale.paymentMethod] || '◈'}</span>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium font-mono">{sale.receiptNumber}</p>
                    <p className="text-gray-500 text-xs truncate">
                      {sale.customer
                        ? `${sale.customer.firstName} ${sale.customer.lastName}`
                        : sale.customerSnapshot?.name || 'Walk-in'}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-white font-semibold text-sm">${sale.total?.toFixed(2)}</p>
                  <span className={statusBadge[sale.status] || 'badge-info'}>{sale.status}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600 text-sm text-center py-8">No sales yet — <button onClick={() => navigate('/sales/new')} className="text-brand-400 hover:underline">make your first sale</button></p>
        )}
      </div>
    </div>
  );
}
