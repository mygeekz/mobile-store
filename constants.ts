
import { NavItem, StatCardData, Transaction, SalesDataPoint, ChartTimeframe } from './types';

export const SIDEBAR_ITEMS: NavItem[] = [
  { name: 'داشبورد', icon: 'fa-solid fa-chart-line', id: 'dashboard', path: '/' },
  { name: 'محصولات', icon: 'fa-solid fa-cube', id: 'products', path: '/products' },
  { name: 'گوشی‌های موبایل', icon: 'fa-solid fa-mobile-screen', id: 'mobile-phones', path: '/mobile-phones' },
  { name: 'فروش‌ها', icon: 'fa-solid fa-cart-shopping', id: 'sales', path: '/sales' },
  { name: 'مشتریان', icon: 'fa-solid fa-users', id: 'customers', path: '/customers' },
  { name: 'همکاران', icon: 'fa-solid fa-building', id: 'partners', path: '/partners' },
  { name: 'گزارشات', icon: 'fa-solid fa-chart-pie', id: 'reports', path: '/reports' },
  { name: 'فاکتورها', icon: 'fa-solid fa-file-invoice', id: 'invoices', path: '/invoices' },
  { name: 'تنظیمات', icon: 'fa-solid fa-gear', id: 'settings', path: '/settings' },
];

export const DASHBOARD_STATS_DATA: StatCardData[] = [
  {
    title: 'مجموع فروش',
    value: '۲۴,۷۸۰ دلار',
    icon: 'fa-solid fa-dollar-sign',
    iconBgColor: 'bg-indigo-100',
    iconTextColor: 'text-indigo-600',
    trendPercentage: 12.5,
    trendDirection: 'up',
    trendText: 'نسبت به ماه گذشته',
  },
  {
    title: "درآمد امروز",
    value: '۱,۴۲۹ دلار',
    icon: 'fa-solid fa-sack-dollar',
    iconBgColor: 'bg-green-100',
    iconTextColor: 'text-green-600',
    trendPercentage: 8.2,
    trendDirection: 'up',
    trendText: 'نسبت به روز گذشته',
  },
  {
    title: 'محصولات فعال',
    value: '۱۴۲',
    icon: 'fa-solid fa-box',
    iconBgColor: 'bg-blue-100',
    iconTextColor: 'text-blue-600',
    trendPercentage: 4.3,
    trendDirection: 'up',
    trendText: 'محصول جدید',
  },
  {
    title: 'مجموع مشتریان',
    value: '۲,۸۵۴',
    icon: 'fa-solid fa-users',
    iconBgColor: 'bg-purple-100',
    iconTextColor: 'text-purple-600',
    trendPercentage: 6.8,
    trendDirection: 'up',
    trendText: 'نسبت به ماه گذشته',
  },
];

export const RECENT_TRANSACTIONS_DATA: Transaction[] = [
  { id: 1, customer: 'جان اسمیت', product: 'آیفون ۱۴ پرو', amount: '۱,۲۹۹.۰۰ دلار', date: '۲۰۲۵-۰۶-۰۹', status: 'تکمیل شده' },
  { id: 2, customer: 'سارا جانسون', product: 'مک‌بوک ایر ام۳', amount: '۱,۰۹۹.۰۰ دلار', date: '۲۰۲۵-۰۶-۰۸', status: 'تکمیل شده' },
  { id: 3, customer: 'مایکل براون', product: 'ایرپادز پرو', amount: '۲۴۹.۰۰ دلار', date: '۲۰۲۵-۰۶-۰۸', status: 'در حال پردازش' },
  { id: 4, customer: 'امیلی دیویس', product: 'سامسونگ گلکسی اس۲۵', amount: '۹۹۹.۰۰ دلار', date: '۲۰۲۵-۰۶-۰۷', status: 'تکمیل شده' },
  { id: 5, customer: 'دیوید ویلسون', product: 'آیپد ایر', amount: '۵۹۹.۰۰ دلار', date: '۲۰۲۵-۰۶-۰۷', status: 'در انتظار' },
];

export const SALES_CHART_DATA_WEEKLY: SalesDataPoint[] = [
  { name: 'شنبه', sales: 7200 }, // Assuming week starts from Saturday for Persian context
  { name: 'یکشنبه', sales: 6500 },
  { name: 'دوشنبه', sales: 3200 },
  { name: 'سه‌شنبه', sales: 4500 },
  { name: 'چهارشنبه', sales: 5800 },
  { name: 'پنجشنبه', sales: 3800 },
  { name: 'جمعه', sales: 6000 },
];

export const SALES_CHART_DATA_MONTHLY: SalesDataPoint[] = [
  { name: 'هفته ۱', sales: 15000 },
  { name: 'هفته ۲', sales: 17500 },
  { name: 'هفته ۳', sales: 16000 },
  { name: 'هفته ۴', sales: 19000 },
];

// Keeping month names in English for data simplicity, UI labels will be Persian
export const SALES_CHART_DATA_YEARLY: SalesDataPoint[] = [
  { name: 'ژانویه', sales: 180000 }, { name: 'فوریه', sales: 200000 }, { name: 'مارس', sales: 220000 },
  { name: 'آوریل', sales: 190000 }, { name: 'مه', sales: 230000 }, { name: 'ژوئن', sales: 250000 },
  { name: 'ژوئیه', sales: 240000 }, { name: 'اوت', sales: 260000 }, { name: 'سپتامبر', sales: 230000 },
  { name: 'اکتبر', sales: 270000 }, { name: 'نوامبر', sales: 280000 }, { name: 'دسامبر', sales: 300000 },
];

export const CHART_TIMEFRAMES: ChartTimeframe[] = [
  { key: 'weekly', label: 'هفتگی' },
  { key: 'monthly', label: 'ماهانه' },
  { key: 'yearly', label: 'سالانه' },
];

export const USER_PROFILE = {
  name: 'الکس جانسون', // Or a Persian name e.g. 'علی رضایی'
  role: 'مدیر فروشگاه',
};

export const PHONE_RAM_OPTIONS: string[] = ["1 GB", "2 GB", "4 GB", "6 GB", "8 GB", "12 GB", "16 GB"];
export const PHONE_STORAGE_OPTIONS: string[] = ["64 GB", "128 GB", "256 GB", "512 GB", "1 TB"];

// For TransactionStatus type in types.ts, if needed for strict typing with Persian strings:
// export type TransactionStatus = 'تکمیل شده' | 'در حال پردازش' | 'در انتظار';
// However, it's often better to keep enum-like keys in English and map to translations in UI.
// The current implementation maps based on English status in getStatusBadgeClasses, which is fine if RECENT_TRANSACTIONS_DATA status remains English.
// For full Persian, status in RECENT_TRANSACTIONS_DATA has been translated.