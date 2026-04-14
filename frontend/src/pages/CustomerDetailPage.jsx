import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { customersAPI } from '../services/api';

const statusBadge = { completed: 'badge-success', pending: 'badge-warning', refunded: 'badge-danger', partially_refunded: 'badge-warning' };

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ['customer', id], queryFn: () => customersAPI.getById(id) });
  const { data: historyData } = useQuery({ queryKey: ['customer-history', id], queryFn: () => customersAPI.getHistory(id) });
  const customer = data?.data;
  const history = historyData?.data || [];

  if (isLoading) return <div className="flex items-center justify-center h-64 text-gray-600 animate-pulse">Loading...</div>;
  if (!customer) return <div className="text-center text-gray-500 mt-20">Customer not found</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <button onClick={() => navigate('/customers')} className="text-gray-500 hover:text-white text-sm transition-colors">
        ← Customers
      </button>

      {/* Profile card */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-600/20 border border-brand-600/30 flex items-center justify-center text-brand-300 font-bold text-xl shrink-0">
              {customer.firstName?.[0]}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{customer.firstName} {customer.lastName}</h2>
              <p className="text-gray-500 text-sm font-mono">{customer.customerId}</p>
            </div>
          </div>
          <span className={`sm:ml-auto self-start ${customer.isActive ? 'badge-success' : 'badge-danger'}`}>
            {customer.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-5">
          <div className="text-center p-3 bg-surface-2 rounded-xl">
            <p className="text-xl sm:text-2xl font-bold text-white">{customer.totalPurchases}</p>
            <p className="text-xs text-gray-500 mt-1">Orders</p>
          </div>
          <div className="text-center p-3 bg-surface-2 rounded-xl">
            <p className="text-xl sm:text-2xl font-bold text-emerald-400">${customer.totalSpent?.toFixed(0)}</p>
            <p className="text-xs text-gray-500 mt-1">Spent</p>
          </div>
          <div className="text-center p-3 bg-surface-2 rounded-xl">
            <p className="text-xl sm:text-2xl font-bold text-brand-400">{customer.loyaltyPoints}</p>
            <p className="text-xs text-gray-500 mt-1">Points</p>
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div><span className="label">Email</span><p className="text-white break-all">{customer.email || '—'}</p></div>
          <div><span className="label">Phone</span><p className="text-white">{customer.phone || '—'}</p></div>
          <div><span className="label">Member Since</span><p className="text-white">{new Date(customer.createdAt).toLocaleDateString()}</p></div>
        </div>
      </div>

      {/* Purchase history */}
      <div className="card">
        <h3 className="text-white font-semibold text-sm mb-4">Purchase History ({history.length})</h3>
        {history.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-8">No purchases yet</p>
        ) : (
          <div>
            {history.map(sale => (
              <div
                key={sale._id}
                onClick={() => navigate(`/sales/${sale._id}`)}
                className="flex items-center justify-between py-3 border-b border-surface-border last:border-0 hover:bg-surface-2/30 -mx-5 px-5 cursor-pointer transition-colors"
              >
                <div>
                  <p className="font-mono text-brand-400 text-xs">{sale.receiptNumber}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{new Date(sale.createdAt).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-semibold">${sale.total?.toFixed(2)}</p>
                  <span className={statusBadge[sale.status] || 'badge-info'}>{sale.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
