import { useQuery } from '@tanstack/react-query';
import { inventoryAPI } from '../services/api';
import StatCard from '../components/common/StatCard';
import Table from '../components/common/Table';

const typeColors = { sale: 'badge-danger', purchase: 'badge-success', return: 'badge-info', adjustment: 'badge-warning', damage: 'badge-danger', initial: 'badge-info' };

export default function InventoryPage() {
  const { data: overview } = useQuery({ queryKey: ['inventory-overview'], queryFn: () => inventoryAPI.getOverview() });
  const { data: lowStock } = useQuery({ queryKey: ['low-stock'], queryFn: () => inventoryAPI.getLowStock() });
  const { data: movements, isLoading } = useQuery({ queryKey: ['movements'], queryFn: () => inventoryAPI.getMovements({ limit: 50 }) });

  const stats = overview?.data;
  const lowStockItems = lowStock?.data || [];
  const movs = movements?.data || [];

  const movColumns = [
    { key: 'product', label: 'Product', render: v => <span className="text-white text-sm">{v?.name}</span> },
    { key: 'type', label: 'Type', render: v => <span className={typeColors[v] || 'badge-info'}>{v}</span> },
    { key: 'quantity', label: 'Change', render: v => <span className={`font-mono font-bold ${v > 0 ? 'text-emerald-400' : 'text-red-400'}`}>{v > 0 ? `+${v}` : v}</span> },
    { key: 'stockBefore', label: 'Before', render: v => <span className="text-gray-400 font-mono text-xs">{v}</span> },
    { key: 'stockAfter', label: 'After', render: v => <span className="text-gray-400 font-mono text-xs">{v}</span> },
    { key: 'performedBy', label: 'By', render: v => <span className="text-gray-500 text-xs">{v?.name}</span> },
    { key: 'createdAt', label: 'Date', render: v => <span className="text-gray-500 text-xs">{new Date(v).toLocaleString()}</span> }
  ];

  const movMobileCard = (row) => (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-white text-sm font-medium">{row.product?.name}</p>
        <span className={typeColors[row.type] || 'badge-info'}>{row.type}</span>
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          {row.stockBefore} → <span className="text-white font-medium">{row.stockAfter}</span>
        </span>
        <span className={`font-mono font-bold ${row.quantity > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {row.quantity > 0 ? `+${row.quantity}` : row.quantity}
        </span>
        <span>{new Date(row.createdAt).toLocaleDateString()}</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats — 2 cols mobile, 4 desktop */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <StatCard title="Total Products" value={stats?.total || 0} icon="⬡" color="brand" />
        <StatCard title="Low Stock" value={stats?.lowStock || 0} icon="⚠" color={stats?.lowStock > 0 ? 'amber' : 'emerald'} />
        <StatCard title="Out of Stock" value={stats?.outOfStock || 0} icon="✕" color="red" />
        <StatCard title="Inventory Value" value={`$${((stats?.totalCostValue || 0) / 1000).toFixed(1)}k`} icon="◈" color="purple" subtitle={`Retail: $${((stats?.totalRetailValue || 0) / 1000).toFixed(1)}k`} />
      </div>

      {/* Low stock alert */}
      {lowStockItems.length > 0 && (
        <div className="card">
          <h3 className="text-amber-400 font-semibold text-sm mb-3">
            ⚠ Needs Reorder ({lowStockItems.length} products)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {lowStockItems.map(p => (
              <div key={p._id} className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3">
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate">{p.name}</p>
                  <p className="text-gray-500 text-xs">{p.category} · reorder at {p.reorderLevel}</p>
                  {p.supplier?.name && <p className="text-gray-600 text-xs">{p.supplier.name}</p>}
                </div>
                <div className="text-right ml-3 shrink-0">
                  <p className="text-amber-400 font-bold text-lg">{p.stock}</p>
                  <p className="text-gray-600 text-xs">left</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Movements table */}
      <div className="card p-0">
        <div className="p-5 border-b border-surface-border">
          <h3 className="text-white font-semibold text-sm">Recent Inventory Movements</h3>
        </div>
        <Table columns={movColumns} data={movs} loading={isLoading} emptyMessage="No movements recorded" mobileCard={movMobileCard} />
      </div>
    </div>
  );
}
