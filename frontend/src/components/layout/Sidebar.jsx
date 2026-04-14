import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '▦', exact: true },
  { path: '/sales', label: 'Sales', icon: '◈' },
  { path: '/customers', label: 'Customers', icon: '◉' },
  { path: '/products', label: 'Products', icon: '⬡' },
  { path: '/categories', label: 'Categories', icon: '◧' },
  { path: '/inventory', label: 'Inventory', icon: '▤', roles: ['admin','supervisor','inventory_manager'] },
  { path: '/suppliers', label: 'Suppliers', icon: '◎', roles: ['admin','supervisor','inventory_manager'] },
  { path: '/purchase-orders', label: 'Purchase Orders', icon: '◫', roles: ['admin','supervisor','inventory_manager'] },
  { path: '/returns', label: 'Returns', icon: '↩' },
  { path: '/reports', label: 'Reports', icon: '◳', roles: ['admin','supervisor'] },
  { path: '/users', label: 'Users', icon: '◐', roles: ['admin'] },
  { path: '/audit', label: 'Audit Log', icon: '◑', roles: ['admin'] },
];

const roleColors = {
  admin: 'text-brand-400',
  supervisor: 'text-purple-400',
  inventory_manager: 'text-emerald-400',
  cashier: 'text-amber-400'
};
const roleLabels = {
  admin: 'Admin',
  supervisor: 'Supervisor',
  inventory_manager: 'Inv. Manager',
  cashier: 'Cashier'
};

export default function Sidebar({ onClose }) {
  const { user } = useAuth();
  const location = useLocation();
  const visible = navItems.filter(item => !item.roles || item.roles.includes(user?.role));

  return (
    <aside className="w-60 h-full bg-surface-1 border-r border-surface-border flex flex-col">
      {/* Logo + mobile close button */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-surface-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-glow">S</div>
          <div>
            <div className="text-white font-semibold text-sm leading-none">SMS</div>
            <div className="text-gray-500 text-xs mt-0.5">Sales Management</div>
          </div>
        </div>
        {/* Close button — only visible on mobile */}
        <button
          onClick={onClose}
          className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-surface-2 transition-colors text-xl leading-none"
        >
          ×
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
        {visible.map(item => {
          const isActive = item.exact
            ? location.pathname === item.path
            : location.pathname.startsWith(item.path) && item.path !== '/';
          const rootActive = item.path === '/' && location.pathname === '/';
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive || rootActive
                  ? 'bg-brand-600/20 text-brand-300 border border-brand-600/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-surface-2'
              }`}
            >
              <span className="text-base w-5 text-center shrink-0">{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User info */}
      <div className="p-3 border-t border-surface-border shrink-0">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-brand-600/30 border border-brand-600/50 flex items-center justify-center text-brand-300 font-semibold text-sm shrink-0">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.name}</p>
            <p className={`text-xs font-medium ${roleColors[user?.role] || 'text-gray-400'}`}>
              {roleLabels[user?.role] || user?.role}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
