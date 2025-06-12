
import React from 'react';

export interface NavItem {
  id: string;
  name:string; // This will be Persian
  icon: string;
  path: string; // Paths usually remain in English
}

export interface StatCardData {
  title: string; // Persian
  value: string; // Persian
  icon: string;
  iconBgColor: string;
  iconTextColor: string;
  trendPercentage: number;
  trendDirection: 'up' | 'down';
  trendText: string; // Persian
}

export type TransactionStatus = 'تکمیل شده' | 'در حال پردازش' | 'در انتظار';

export interface Transaction {
  id: number;
  customer: string; // Persian - This might be deprecated or re-evaluated for dashboard
  product: string; // Persian
  amount: string; // Persian
  date: string;
  status: TransactionStatus; // Persian
}

export interface SalesDataPoint {
  name: string; // e.g., 'شنبه', 'هفته ۱', 'ژانویه' (Can be Persian)
  sales: number;
}

export interface ChartTimeframe {
  key: 'weekly' | 'monthly' | 'yearly'; // Keys remain English
  label: string; // Persian
}

export interface Category {
  id: number;
  name: string;
}

// Represents items from the 'products' table, used as "inventory"
export interface Product { 
  id: number;
  name: string; 
  purchasePrice: number;
  sellingPrice: number;      // This is the sale price for inventory items
  stock_quantity: number;
  saleCount?: number;         // Tracks number of times this product type was sold
  categoryId?: number | null;
  categoryName?: string | null; 
  date_added: string;
  supplierId?: number | null; 
  supplierName?: string | null; 
}

export interface NewProduct {
  name: string;
  purchasePrice: number;
  sellingPrice: number;
  stock_quantity: number;
  categoryId?: number | string | null;
  supplierId?: number | string | null; 
}

export interface NotificationMessage {
  type: 'success' | 'error' | 'warning' | 'info';
  text: string;
}

// --- Old Mobile Phone Specific Types (related to products table & mobile_phone_details) ---
export interface MobilePhoneDetails {
  mobileDetailId: number; 
  brand: string;
  model: string;
  color?: string | null;
  storage?: number | null; 
  ram?: number | null;    
  imei: string;
}

export interface MobilePhone extends Product, MobilePhoneDetails {
  productName: string; 
}

export interface NewMobilePhoneData { // Used for frontend form for old structure, if any
  purchasePrice: number;
  sellingPrice: number;
  brand: string;
  model: string;
  color?: string;
  storage?: number | string; 
  ram?: number | string;     
  imei: string;
}

// --- New Standalone Phone Entry Types for the 'phones' table ---
export type PhoneStatus = "موجود در انبار" | "فروخته شده" | "مرجوعی";

export interface PhoneEntry { // For frontend display from GET /api/phones
  id: number;
  model: string;
  color?: string | null;
  storage?: string | null; 
  ram?: string | null;     
  imei: string;
  batteryHealth?: number | null;
  condition?: string | null; 
  purchasePrice: number;
  salePrice?: number | null;    // This is the sale price for individual phones
  sellerName?: string | null; 
  buyerName?: string | null; 
  purchaseDate?: string | null; // ISO Date string YYYY-MM-DD from DB
  saleDate?: string | null;     // ISO Date string YYYY-MM-DD from DB
  registerDate: string;  // ISO DateTime string from DB
  status: PhoneStatus;
  notes?: string | null;
  supplierId?: number | null; 
  supplierName?: string | null; 
}

export interface NewPhoneEntryData { // For frontend form for new 'phones' table
  model: string;
  color?: string;
  storage?: string;
  ram?: string;
  imei: string;
  batteryHealth?: number | string; 
  condition?: string;
  purchasePrice: number | string; 
  salePrice?: number | string;   
  sellerName?: string; 
  buyerName?: string; 
  purchaseDate?: string; // Shamsi date string from DatePicker initially
  saleDate?: string;     // Shamsi date string from DatePicker initially
  status?: PhoneStatus; 
  notes?: string;
  supplierId?: number | string | null; 
}

// Payload for POSTing a new phone to backend
export interface PhoneEntryPayload {
  model: string;
  color?: string | null;
  storage?: string | null;
  ram?: string | null;
  imei: string;
  batteryHealth?: number | null;
  condition?: string | null;
  purchasePrice: number;
  salePrice?: number | null;
  sellerName?: string | null;
  purchaseDate?: string | null; // Expected as ISO Date string (YYYY-MM-DD) by backend
  saleDate?: string | null;     // Expected as ISO Date string (YYYY-MM-DD) by backend
  registerDate?: string; // ISO DateTime string (usually set by backend)
  status?: PhoneStatus | string; // Allow string for flexibility from form
  notes?: string | null;
  supplierId?: number | null;
}


// --- Types for Sales Section ---
export interface SellablePhoneItem {
  id: number;           // Phone ID from 'phones' table
  type: 'phone';
  name: string;         // e.g., "iPhone 13 Pro (IMEI: 123...)"
  price: number;        // salePrice from 'phones' table
  stock: 1;             // Always 1 for individual phones
  imei: string;         // To display and potentially use
}

export interface SellableInventoryItem { // "inventory" refers to items from the "products" table
  id: number;           // Product ID from 'products' table
  type: 'inventory';
  name: string;         // name from 'products' table
  price: number;        // sellingPrice from 'products' table
  stock: number;        // stock_quantity from 'products' table
}

export type SellableItem = SellablePhoneItem | SellableInventoryItem;

export interface SellableItemsResponse {
  phones: SellablePhoneItem[];
  inventory: SellableInventoryItem[];
}

export interface SalesTransactionEntry {
  id: number;
  transactionDate: string; // Shamsi date string as stored/returned by DB
  itemType: 'phone' | 'inventory';
  itemId: number;
  itemName: string;        // Name of the item at the time of sale
  quantity: number;
  pricePerItem: number;
  discount?: number;       // Discount amount applied
  totalPrice: number;      // Final price after discount
  notes?: string | null;
  customerId?: number | null; 
  customerFullName?: string | null; 
}

export interface NewSaleData { // For frontend form
  itemType: 'phone' | 'inventory';
  itemId: number;
  quantity: number;
  transactionDate: string; // Shamsi date string from form
  notes?: string;
  discount?: number | string; // Allow string for input       
  customerId?: number | string | null; // Allow string for form
}

// --- Types for Customer Management ---
export interface Customer {
  id: number;
  fullName: string;
  phoneNumber: string | null;
  address: string | null;
  notes: string | null;
  dateAdded: string; // ISO date string
  currentBalance?: number; 
}

export interface NewCustomerData { // For frontend form
  fullName: string;
  phoneNumber?: string;
  address?: string;
  notes?: string;
}

export interface CustomerLedgerEntry {
  id: number;
  customerId: number;
  transactionDate: string; // ISO date string from DB
  description: string;
  debit: number;  
  credit: number; 
  balance: number; 
}

export interface NewLedgerEntryData { // Used for both customer and partner manual ledger entries (frontend form)
  description: string;
  debit?: number | string;  // Allow string for input
  credit?: number | string; // Allow string for input
  transactionDate?: string; // Shamsi from DatePicker, converted to ISO before backend for ledgers.
}

export interface CustomerDetailsPageData {
  profile: Customer;
  ledger: CustomerLedgerEntry[];
  purchaseHistory: SalesTransactionEntry[];
}

// --- Types for Partner (Supplier) Management ---
export type PartnerType = "Supplier" | "Service Provider" | "Other"; // Example types

export interface Partner {
  id: number;
  partnerName: string;
  partnerType: PartnerType | string; // Allow string for flexibility, but define common types
  contactPerson?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  dateAdded: string; // ISO date string
  currentBalance?: number; // Calculated: positive means we owe them.
}

export interface NewPartnerData { // For frontend form
  partnerName: string;
  partnerType: PartnerType | string;
  contactPerson?: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export interface PartnerLedgerEntry {
  id: number;
  partnerId: number;
  transactionDate: string; // ISO date string from DB
  description: string;
  debit: number;  // We paid the partner (reduces what we owe)
  credit: number; // We received goods/services from partner (increases what we owe)
  balance: number; // Running balance: positive means we owe partner.
}

// Interface for items purchased from a partner, for display in partner detail
export interface PurchasedItemFromPartner {
  id: number; // product.id or phone.id
  type: 'product' | 'phone'; // Distinguish between general products and phones
  name: string; // product.name or phone.model
  identifier?: string; // e.g., phone.imei
  quantityPurchased?: number; // For products (batch stock_quantity at time of purchase)
  purchasePrice: number;
  purchaseDate: string; // date_added for products, purchaseDate for phones if available, or transactionDate from ledger
}

export interface PartnerDetailsPageData {
  profile: Partner;
  ledger: PartnerLedgerEntry[];
  purchaseHistory: PurchasedItemFromPartner[]; // List of products/phones bought from this partner
}


// --- Types for Reporting Section ---
export interface ReportCardItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  path: string;
}

export interface DailySalesPoint {
  date: string; // Shamsi date YYYY/MM/DD
  totalSales: number;
}

export interface TopSellingItem {
  id: number; // itemId
  itemType: 'phone' | 'inventory';
  itemName: string;
  totalRevenue: number;
  quantitySold: number;
}

export interface SalesSummaryData {
  totalRevenue: number;
  grossProfit: number;
  totalTransactions: number;
  averageSaleValue: number;
  dailySales: DailySalesPoint[];
  topSellingItems: TopSellingItem[];
}

export interface DebtorReportItem {
  id: number; // customerId
  fullName: string;
  phoneNumber: string | null;
  balance: number; // Positive value, amount customer owes
}

export interface CreditorReportItem {
  id: number; // partnerId
  partnerName: string;
  partnerType: string;
  balance: number; // Positive value, amount we owe partner
}

export interface TopCustomerReportItem {
  customerId: number;
  fullName: string;
  totalSpent: number;
  transactionCount: number;
}

export interface TopSupplierReportItem {
  partnerId: number;
  partnerName: string;
  totalPurchaseValue: number; // Total value of goods/services received from them
  transactionCount: number;
}

// --- Types for Invoice Generation ---
export interface BusinessDetails {
  name: string;
  addressLine1: string;
  addressLine2?: string;
  cityStateZip: string;
  phone?: string;
  email?: string;
  logoUrl?: string; 
}

export interface InvoiceLineItem {
  id: number; 
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number; 
}

export interface InvoiceFinancialSummary {
  subtotal: number;       
  discountAmount: number; 
  grandTotal: number;     
}

export interface InvoiceData {
  businessDetails: BusinessDetails; // Now dynamic
  customerDetails: Partial<Customer> | null; 
  invoiceMetadata: {
    invoiceNumber: string; 
    transactionDate: string; 
    dueDate?: string; 
  };
  lineItems: InvoiceLineItem[]; 
  financialSummary: InvoiceFinancialSummary;
  notes?: string | null; 
}

// --- Types for Settings ---
export interface SettingItem {
  key: string;
  value: string;
}

export interface BusinessInformationSettings {
  store_name?: string;
  store_address_line1?: string;
  store_address_line2?: string;
  store_city_state_zip?: string;
  store_phone?: string;
  store_email?: string;
  store_logo_path?: string; // Path to the logo image
}

export interface Role {
  id: number;
  name: string;
}

export interface UserForDisplay {
  id: number;
  username: string;
  roleId: number;
  roleName: string;
  dateAdded: string;
}

export interface NewUserFormData {
  username: string;
  password?: string; // Optional on edit, required on create
  roleId: number | string; // Allow string for form input, parse to number
}

// --- Backend specific Payloads ---
export interface ProductPayload { // For POST/PUT /api/products
  name: string;
  purchasePrice: number;
  sellingPrice: number;
  stock_quantity: number;
  categoryId: number | null;
  supplierId: number | null;
}

export interface SaleDataPayload { // For POST /api/sales
  itemType: 'phone' | 'inventory';
  itemId: number;
  quantity: number;
  transactionDate: string; // Shamsi date YYYY/MM/DD
  customerId?: number | null;
  notes?: string | null;
  discount?: number;
}

export interface CustomerPayload { // For POST/PUT /api/customers
  fullName: string;
  phoneNumber?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface LedgerEntryPayload { // For POST /api/customers/:id/ledger and /api/partners/:id/ledger
    description: string;
    debit?: number;
    credit?: number;
    transactionDate: string; // ISO DateTime string
}
export interface PartnerPayload { // For POST/PUT /api/partners
  partnerName: string;
  partnerType: string;
  contactPerson?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface OldMobilePhonePayload { // For old endpoint, if used
    purchasePrice: number;
    sellingPrice: number;
    brand: string;
    model: string;
    color?: string;
    storage?: number;
    ram?: number;
    imei: string;
}
