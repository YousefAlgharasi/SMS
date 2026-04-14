import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SalesPage from './pages/SalesPage';
import NewSalePage from './pages/NewSalePage';
import SaleDetailPage from './pages/SaleDetailPage';
import CustomersPage from './pages/CustomersPage';
import CustomerDetailPage from './pages/CustomerDetailPage';
import ProductsPage from './pages/ProductsPage';
import CategoriesPage from './pages/CategoriesPage';
import InventoryPage from './pages/InventoryPage';
import SuppliersPage from './pages/SuppliersPage';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage';
import ReturnsPage from './pages/ReturnsPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';
import AuditPage from './pages/AuditPage';

const ProtectedRoute = ({ children, roles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="sales" element={<SalesPage />} />
        <Route path="sales/new" element={<NewSalePage />} />
        <Route path="sales/:id" element={<SaleDetailPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="customers/:id" element={<CustomerDetailPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="suppliers" element={<ProtectedRoute roles={['admin','supervisor','inventory_manager']}><SuppliersPage /></ProtectedRoute>} />
        <Route path="purchase-orders" element={<ProtectedRoute roles={['admin','supervisor','inventory_manager']}><PurchaseOrdersPage /></ProtectedRoute>} />
        <Route path="returns" element={<ReturnsPage />} />
        <Route path="reports" element={<ProtectedRoute roles={['admin','supervisor']}><ReportsPage /></ProtectedRoute>} />
        <Route path="users" element={<ProtectedRoute roles={['admin']}><UsersPage /></ProtectedRoute>} />
        <Route path="audit" element={<ProtectedRoute roles={['admin']}><AuditPage /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
