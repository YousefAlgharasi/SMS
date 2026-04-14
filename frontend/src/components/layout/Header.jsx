import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { inventoryAPI } from '../../services/api';
import toast from 'react-hot-toast';

const pageTitles = {
  '/': 'Dashboard',
  '/sales': 'Sales',
  '/sales/new': 'New Sale',
  '/customers': 'Customers',
  '/products': 'Products',
  '/categories': 'Categories',
  '/inventory': 'Inventory',
  '/suppliers': 'Suppliers',
  '/purchase-orders': 'Purchase Orders',
  '/returns': 'Returns & Refunds',
  '/reports': 'Reports',
  '/users': 'User Management',
  '/audit': 'Audit Log'
};

export default function Header({ onMenuClick }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'SMS';

  const { data: inventoryOverview } = useQuery({
    queryKey: ['inventory-overview'],
    queryFn: () => inventoryAPI.getOverview(),
    refetchInterval: 60000
  });
  const lowStockCount = inventoryOverview?.data?.lowStock || 0;

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    navigate('/login');
  };

  return (
    <header className="h-16 bg-surface-1 border-b border-surface-border flex items-center justify-between px-4 sm:px-6 shrink-0 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger — only on mobile */}
        <button
          onClick={onMenuClick}
          className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-surface-2 transition-colors shrink-0"
          aria-label="Open menu"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
            <rect y="2" width="18" height="2" rx="1"/>
            <rect y="8" width="18" height="2" rx="1"/>
            <rect y="14" width="18" height="2" rx="1"/>
          </svg>
        </button>
        <h1 className="text-white font-semibold text-base sm:text-lg truncate">{title}</h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Low stock alert — hide text on very small screens */}
        {lowStockCount > 0 && (
          <button
            onClick={() => navigate('/inventory')}
            className="flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-amber-500/25 transition-colors"
          >
            <span>⚠</span>
            <span className="hidden sm:inline">{lowStockCount} low stock</span>
            <span className="sm:hidden">{lowStockCount}</span>
          </button>
        )}

        {/* New Sale button — icon only on small screens */}
        <button
          onClick={() => navigate('/sales/new')}
          className="btn-primary text-sm py-2 px-3 sm:px-4"
        >
          <span className="sm:hidden">+</span>
          <span className="hidden sm:inline">+ New Sale</span>
        </button>

        {/* Sign out — icon only on small screens */}
        <button
          onClick={handleLogout}
          className="text-gray-400 hover:text-white text-sm px-2 sm:px-3 py-2 rounded-lg hover:bg-surface-2 transition-colors"
          title="Sign out"
        >
          <span className="hidden sm:inline">Sign out</span>
          <span className="sm:hidden">⏻</span>
        </button>
      </div>
    </header>
  );
}
