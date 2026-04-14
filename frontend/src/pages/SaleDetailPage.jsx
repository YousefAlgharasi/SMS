import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { salesAPI } from '../services/api';

const statusBadge = { completed: 'badge-success', pending: 'badge-warning', refunded: 'badge-danger', partially_refunded: 'badge-warning' };

export default function SaleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ['sale', id], queryFn: () => salesAPI.getById(id) });
  const sale = data?.data;

  if (isLoading) return <div className="flex items-center justify-center h-64 text-gray-600 animate-pulse">Loading...</div>;
  if (!sale) return <div className="text-center text-gray-500 mt-20">Sale not found</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => navigate('/sales')} className="text-gray-500 hover:text-white text-sm transition-colors">← Sales</button>
        <span className="text-gray-600">/</span>
        <span className="font-mono text-brand-400 text-sm">{sale.receiptNumber}</span>
        <span className={statusBadge[sale.status] || 'badge-info'}>{sale.status}</span>
      </div>

      <div className="card">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div><span className="label">Receipt #</span><p className="font-mono text-brand-400 text-xs break-all">{sale.receiptNumber}</p></div>
          <div><span className="label">Date</span><p className="text-white text-xs">{new Date(sale.createdAt).toLocaleString()}</p></div>
          <div><span className="label">Customer</span><p className="text-white text-xs">{sale.customer ? `${sale.customer.firstName} ${sale.customer.lastName}` : sale.customerSnapshot?.name || 'Walk-in'}</p></div>
          <div><span className="label">Staff</span><p className="text-white text-xs">{sale.processedBy?.name}</p></div>
          <div><span className="label">Payment</span><p className="text-white text-xs capitalize">{sale.paymentMethod?.replace('_', ' ')}</p></div>
          <div><span className="label">Loyalty Points</span><p className="text-white text-xs">+{sale.loyaltyPointsEarned}</p></div>
        </div>
      </div>

      <div className="card">
        <p className="label mb-3">Items ({sale.items?.length})</p>
        <div>
          {sale.items?.map((item, i) => (
            <div key={i} className="flex items-start justify-between py-3 border-b border-surface-border last:border-0 gap-3">
              <div className="min-w-0">
                <p className="text-white text-sm font-medium">{item.productName}</p>
                <p className="text-gray-500 text-xs mt-0.5">
                  {item.quantity} × ${item.unitPrice?.toFixed(2)}
                  {item.discount > 0 && ` · ${item.discount}% off`}
                  {item.taxRate > 0 && ` · ${item.taxRate}% tax`}
                </p>
              </div>
              <p className="text-white font-semibold text-sm shrink-0">${item.subtotal?.toFixed(2)}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-2 text-sm border-t border-surface-border pt-4">
          <div className="flex justify-between text-gray-400"><span>Subtotal</span><span>${sale.subtotal?.toFixed(2)}</span></div>
          <div className="flex justify-between text-gray-400"><span>Tax</span><span>${sale.taxAmount?.toFixed(2)}</span></div>
          {sale.discountAmount > 0 && (
            <div className="flex justify-between text-emerald-400"><span>Discount</span><span>-${sale.discountAmount?.toFixed(2)}</span></div>
          )}
          <div className="flex justify-between text-white font-bold text-base pt-2 border-t border-surface-border">
            <span>Total</span><span>${sale.total?.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {sale.status === 'completed' && (
        <button onClick={() => navigate('/returns')} className="btn-secondary text-sm w-full sm:w-auto justify-center">
          ↩ Process Return for this Sale
        </button>
      )}
    </div>
  );
}
