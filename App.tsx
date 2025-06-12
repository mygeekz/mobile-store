
import React from 'react';
import { Routes, Route, Outlet, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import MobilePhones from './pages/MobilePhones';
import Sales from './pages/Sales';
import Customers from './pages/Customers';
import CustomerDetailPage from './pages/CustomerDetail'; 
import Partners from './pages/Partners';
import PartnerDetail from './pages/PartnerDetail';
import Reports from './pages/Reports'; // Main Hub
import SalesReport from './pages/reports/SalesReport'; // Individual Report
import DebtorsReport from './pages/reports/DebtorsReport'; // Individual Report
import CreditorsReport from './pages/reports/CreditorsReport'; // Individual Report
import TopCustomersReport from './pages/reports/TopCustomersReport'; // Individual Report
import TopSuppliersReport from './pages/reports/TopSuppliersReport'; // Individual Report
import Invoices from './pages/Invoices';
import InvoiceDetail from './pages/InvoiceDetail'; // New
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import { SIDEBAR_ITEMS } from './constants';

const App: React.FC = () => {
  const location = useLocation();
  
  const getCurrentPageTitle = () => {
    const customerDetailMatch = location.pathname.match(/^\/customers\/(\d+)$/);
    if (customerDetailMatch) {
      return 'جزئیات مشتری'; 
    }
    const partnerDetailMatch = location.pathname.match(/^\/partners\/(\d+)$/);
    if (partnerDetailMatch) {
      return 'جزئیات همکار'; 
    }
    const invoiceDetailMatch = location.pathname.match(/^\/invoices\/(\d+)$/);
    if (invoiceDetailMatch && invoiceDetailMatch[1]) {
      return `فاکتور فروش شماره ${Number(invoiceDetailMatch[1]).toLocaleString('fa-IR')}`;
    }
    
    // Specific titles for report sub-pages
    if (location.pathname === '/reports/sales-summary') return 'گزارش فروش و سود';
    if (location.pathname === '/reports/debtors') return 'گزارش بدهکاران';
    if (location.pathname === '/reports/creditors') return 'گزارش بستانکاران';
    if (location.pathname === '/reports/top-customers') return 'مشتریان برتر';
    if (location.pathname === '/reports/top-suppliers') return 'تامین کنندگان برتر';
    
    if (location.pathname === '/') return SIDEBAR_ITEMS.find(item => item.id === 'dashboard')?.name || 'داشبورد';
    
    // For main navigation items, including /reports hub
    const currentNavItem = SIDEBAR_ITEMS.find(item => item.path !== '/' && location.pathname.startsWith(item.path));
    if (currentNavItem) {
      return currentNavItem.name; 
    }

    // Fallback for any other unhandled paths (should ideally not be hit with NotFound route)
    const pathParts = location.pathname.substring(1).split('/');
    const title = pathParts.map(part => part.charAt(0).toUpperCase() + part.slice(1).replace('-', ' ')).join(' - ');
    return title || 'داشبورد کوروش'; 
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 mr-72 flex flex-col transition-all duration-300 ease-in-out">
        <Header pageTitle={getCurrentPageTitle()} />
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50 print:p-0 print:bg-white">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/mobile-phones" element={<MobilePhones />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/customers/:id" element={<CustomerDetailPage />} />
            <Route path="/partners" element={<Partners />} />
            <Route path="/partners/:id" element={<PartnerDetail />} />
            
            {/* Reports Section Routes */}
            <Route path="/reports" element={<Reports />} /> {/* Hub Page */}
            <Route path="/reports/sales-summary" element={<SalesReport />} />
            <Route path="/reports/debtors" element={<DebtorsReport />} />
            <Route path="/reports/creditors" element={<CreditorsReport />} />
            <Route path="/reports/top-customers" element={<TopCustomersReport />} />
            <Route path="/reports/top-suppliers" element={<TopSuppliersReport />} />

            {/* Invoices Section Routes */}
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/invoices/:saleId" element={<InvoiceDetail />} />


            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Outlet /> 
        </main>
      </div>
    </div>
  );
};

export default App;
