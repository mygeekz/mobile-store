
import express, { NextFunction, ErrorRequestHandler } from 'express'; // Removed Request, Response from here
import moment from 'jalali-moment';
import multer from 'multer';
import fs from 'fs';
import path, { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import type { ParsedQs } from 'qs';


import {
  addProductToDb,
  getAllProductsFromDb,
  addCategoryToDb,
  getAllCategoriesFromDb,
  updateCategoryInDb,
  deleteCategoryFromDb,
  addPhoneEntryToDb,
  getAllPhoneEntriesFromDb,
  getSellableItemsFromDb,
  getAllSalesTransactionsFromDb,
  recordSaleTransactionInDb,
  getDbInstance,
  DB_PATH,
  closeDbConnection,
  addCustomerToDb,
  getAllCustomersWithBalanceFromDb,
  getCustomerByIdFromDb,
  updateCustomerInDb,
  deleteCustomerFromDb,
  addCustomerLedgerEntryToDb,
  getLedgerForCustomerFromDb,
  addPartnerToDb,
  getAllPartnersWithBalanceFromDb,
  getPartnerByIdFromDb,
  updatePartnerInDb,
  deletePartnerFromDb,
  addPartnerLedgerEntryToDb,
  getLedgerForPartnerFromDb,
  getPurchasedItemsFromPartnerDb,
  getSalesSummaryAndProfit,
  getDebtorsList,
  getCreditorsList,
  getTopCustomersBySales,
  getTopSuppliersByPurchaseValue,
  getInvoiceDataById,
  getAllSettingsAsObject,
  updateMultipleSettings,
  updateSetting,
  getAllRoles,
  addUserToDb,
  getAllUsersWithRoles,
  getAsync,
  getDashboardKPIs,
  getDashboardSalesChartData,
  getDashboardRecentActivities,
  addInstallmentSaleToDb,      
  getAllInstallmentSalesFromDb,
  getInstallmentSaleByIdFromDb,
  updateInstallmentPaymentStatusInDb,
  updateCheckStatusInDb,       
  ProductPayload,
  PhoneEntryPayload,
  SaleDataPayload,
  CustomerPayload,
  LedgerEntryPayload,
  PartnerPayload,
  SettingItem,
  // fromShamsiStringToISO, // Already in database.ts
  InstallmentSalePayload,   
  CheckStatus,              
} from './database';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3001;

app.use(express.json());

const uploadsDir = join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Multer setup for logo
const logoStorage = multer.diskStorage({
  destination: function (req: express.Request, file: Express.Multer.File, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req: express.Request, file: Express.Multer.File, cb) {
    cb(null, `logo-${Date.now()}${path.extname(file.originalname)}`);
  }
});
const imageFileFilter = (req: express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) {
    return cb(new Error('فقط فایل‌های تصویری مجاز هستند!') as Error); // Use Error type directly
  }
  cb(null, true);
};
const uploadLogo = multer({ storage: logoStorage, fileFilter: imageFileFilter, limits: { fileSize: 2 * 1024 * 1024 } });

// Multer setup for DB restore
const dbRestoreStorage = multer.memoryStorage();
const dbFileFilter = (req: express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (path.extname(file.originalname).toLowerCase() !== '.db') {
    return cb(new Error('فایل پشتیبان باید با فرمت .db باشد.') as Error); // Use Error type directly
  }
  cb(null, true);
};
const uploadDb = multer({ storage: dbRestoreStorage, fileFilter: dbFileFilter, limits: { fileSize: 100 * 1024 * 1024 } });


const shamsiToISOForAPI = (shamsiDateString?: string, endOfDay: boolean = false): string | undefined => {
  if (!shamsiDateString || typeof shamsiDateString !== 'string') return undefined;
  try {
    let m = moment(shamsiDateString.trim(), 'jYYYY/jMM/jDD');
    if (!m.isValid()) {
        console.warn(`Invalid Shamsi date for ISO conversion: ${shamsiDateString}`);
        return undefined;
    }
    if (endOfDay) {
      return m.endOf('day').toISOString();
    }
    return m.startOf('day').toISOString();
  } catch (e) {
    console.warn(`Error converting Shamsi date to ISO: ${shamsiDateString}`, e);
    return undefined;
  }
};

// --- API Endpoints with TypeScript types and robust error handling ---

// Categories API
app.get('/categories', async (req: express.Request, res: express.Response) => {
  try {
    const categories = await getAllCategoriesFromDb();
    res.json({ success: true, data: categories });
  } catch (error: any) {
    console.error('Failed to fetch categories:', error);
    res.status(500).json({ success: false, message: error.message || 'خطای سرور: مشکل در دریافت دسته‌بندی‌ها.' });
  }
});

app.post('/categories', async (req: express.Request<{}, any, { name: string }>, res: express.Response) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'نام دسته‌بندی الزامی است.' });
    }
    const newCategory = await addCategoryToDb(name.trim());
    res.status(201).json({ success: true, data: newCategory });
  } catch (error: any) {
    console.error('Failed to add category:', error);
    if (error.message.includes('تکراری') || error.message.toLowerCase().includes('unique constraint')) {
        return res.status(409).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message || 'خطای سرور: مشکل در افزودن دسته‌بندی.' });
  }
});

app.put('/categories/:id', async (req: express.Request<{ id: string }, any, { name: string }>, res: express.Response) => {
  try {
    const categoryId = parseInt(req.params.id, 10);
    if (isNaN(categoryId)) {
      return res.status(400).json({ success: false, message: 'شناسه دسته‌بندی نامعتبر است.' });
    }
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'نام دسته‌بندی الزامی است.' });
    }
    const updatedCategory = await updateCategoryInDb(categoryId, name.trim());
    res.json({ success: true, data: updatedCategory });
  } catch (error: any) {
    console.error('Failed to update category:', error);
    if (error.message.includes('تکراری') || error.message.toLowerCase().includes('unique constraint')) {
        return res.status(409).json({ success: false, message: error.message });
    }
    if (error.message.includes('یافت نشد')) {
        return res.status(404).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message || 'خطای سرور: مشکل در به‌روزرسانی دسته‌بندی.' });
  }
});

app.delete('/categories/:id', async (req: express.Request<{ id: string }>, res: express.Response) => {
  try {
    const categoryId = parseInt(req.params.id, 10);
    if (isNaN(categoryId)) {
      return res.status(400).json({ success: false, message: 'شناسه دسته‌بندی نامعتبر است.' });
    }
    const success = await deleteCategoryFromDb(categoryId);
    if (!success) { 
      return res.status(404).json({ success: false, message: 'دسته‌بندی برای حذف یافت نشد.' });
    }
    res.json({ success: true, message: 'دسته‌بندی با موفقیت حذف شد.' });
  } catch (error: any) {
    console.error('Failed to delete category:', error);
     if (error.message.includes('یافت نشد')) {
        return res.status(404).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message || 'خطای سرور: مشکل در حذف دسته‌بندی.' });
  }
});


// General Products API
app.get('/products', async (req: express.Request<{}, any, any, { supplierId?: string }>, res: express.Response) => {
  try {
    const supplierIdQuery = req.query.supplierId;
    const supplierId = supplierIdQuery ? Number(supplierIdQuery) : null;
    if (supplierIdQuery && isNaN(supplierId as number)) {
        return res.status(400).json({ success: false, message: 'شناسه تامین‌کننده نامعتبر است.' });
    }
    const products = await getAllProductsFromDb(supplierId);
    res.json({ success: true, data: products });
  } catch (error: any) {
    console.error('Failed to fetch products:', error);
    res.status(500).json({ success: false, message: error.message || 'خطای سرور: مشکل در دریافت محصولات.' });
  }
});

app.post('/products', async (req: express.Request<{}, any, ProductPayload>, res: express.Response) => {
  try {
    const { name, purchasePrice, sellingPrice, stock_quantity, categoryId, supplierId } = req.body;
    if (!name || typeof name !== 'string' || String(name).trim() === '') {
      return res.status(400).json({ success: false, message: 'نام محصول الزامی است و نمی‌تواند خالی باشد.' });
    }
    if (purchasePrice === undefined || typeof purchasePrice !== 'number' || purchasePrice < 0) {
      return res.status(400).json({ success: false, message: 'قیمت خرید محصول باید عددی غیرمنفی باشد.' });
    }
    if (sellingPrice === undefined || typeof sellingPrice !== 'number' || sellingPrice <= 0) {
      return res.status(400).json({ success: false, message: 'قیمت فروش محصول باید عددی بزرگتر از صفر باشد.' });
    }
    if (stock_quantity === undefined || typeof stock_quantity !== 'number' || stock_quantity < 0 || !Number.isInteger(stock_quantity)) {
      return res.status(400).json({ success: false, message: 'تعداد موجودی باید یک عدد صحیح و غیرمنفی باشد.' });
    }
    let parsedCategoryId: number | null = null;
    if (categoryId !== undefined && categoryId !== null && String(categoryId).trim() !== '') {
      parsedCategoryId = Number(categoryId);
      if (isNaN(parsedCategoryId)) {
          return res.status(400).json({ success: false, message: 'شناسه دسته‌بندی نامعتبر است.' });
      }
    }
    let parsedSupplierId: number | null = null;
    if (supplierId !== undefined && supplierId !== null && String(supplierId).trim() !== '') {
      parsedSupplierId = Number(supplierId);
      if (isNaN(parsedSupplierId)) {
          return res.status(400).json({ success: false, message: 'شناسه تامین‌کننده نامعتبر است.' });
      }
    }

    const productData: ProductPayload = {
      name: String(name).trim(),
      purchasePrice,
      sellingPrice,
      stock_quantity,
      categoryId: parsedCategoryId,
      supplierId: parsedSupplierId
    };
    const newProduct = await addProductToDb(productData);
    res.status(201).json({ success: true, data: newProduct });
  } catch (error: any) {
    console.error('Failed to add product:', error);
    res.status(500).json({ success: false, message: error.message || 'خطای سرور: مشکل در افزودن محصول.' });
  }
});

// Standalone 'phones' table API
app.get('/phones', async (req: express.Request<{}, any, any, { supplierId?: string, status?: string }>, res: express.Response) => {
  try {
    const supplierIdQuery = req.query.supplierId;
    const supplierId = supplierIdQuery ? Number(supplierIdQuery) : null;
     if (supplierIdQuery && isNaN(supplierId as number)) {
        return res.status(400).json({ success: false, message: 'شناسه تامین‌کننده نامعتبر است.' });
    }
    const status = req.query.status;
    const phones = await getAllPhoneEntriesFromDb(supplierId, status);
    res.json({ success: true, data: phones });
  } catch (error: any) {
    console.error('Failed to fetch phone entries:', error);
    res.status(500).json({ success: false, message: error.message || 'خطای سرور: مشکل در دریافت لیست گوشی‌ها.' });
  }
});

app.post('/phones', async (req: express.Request<{}, any, PhoneEntryPayload>, res: express.Response) => {
  try {
    const {
      model, color, storage, ram, imei, batteryHealth, condition,
      purchasePrice, salePrice, sellerName, purchaseDate,
      saleDate, status, notes, supplierId
    } = req.body;

    if (!model || typeof model !== 'string' || String(model).trim() === '') {
      return res.status(400).json({ success: false, message: 'مدل گوشی الزامی است.' });
    }
    if (!imei || typeof imei !== 'string' || !/^\d{15,16}$/.test(String(imei).trim())) {
       return res.status(400).json({ success: false, message: 'شماره IMEI باید ۱۵ یا ۱۶ رقم باشد.' });
     }
    const numPurchasePrice = Number(purchasePrice);
    if (purchasePrice === undefined || purchasePrice === null || String(purchasePrice).trim() === '' || isNaN(numPurchasePrice) || numPurchasePrice < 0) {
      return res.status(400).json({ success: false, message: 'قیمت خرید باید عددی غیرمنفی باشد.' });
    }

    let parsedSupplierId: number | null = null;
    if (supplierId !== undefined && supplierId !== null && String(supplierId).trim() !== '') {
      parsedSupplierId = Number(supplierId);
      if (isNaN(parsedSupplierId)) {
          return res.status(400).json({ success: false, message: 'شناسه تامین‌کننده نامعتبر است.' });
      }
    }

    const phoneData: PhoneEntryPayload = {
      model: String(model).trim(),
      color: color ? String(color).trim() : null,
      storage: storage ? String(storage).trim() : null,
      ram: ram ? String(ram).trim() : null,
      imei: String(imei).trim(),
      batteryHealth: batteryHealth !== undefined && batteryHealth !== null && String(batteryHealth).trim() !== '' ? parseInt(String(batteryHealth), 10) : null,
      condition: condition ? String(condition).trim() : null,
      purchasePrice: numPurchasePrice,
      salePrice: (salePrice !== undefined && salePrice !== null && String(salePrice).trim() !== '') ? parseFloat(String(salePrice)) : undefined,
      sellerName: sellerName ? String(sellerName).trim() : null,
      purchaseDate: purchaseDate ? String(purchaseDate).trim() : undefined,
      saleDate: saleDate ? String(saleDate).trim() : undefined,
      registerDate: new Date().toISOString(),
      status: status ? String(status).trim() : "موجود در انبار",
      notes: notes ? String(notes).trim() : null,
      supplierId: parsedSupplierId
    };

    const newPhone = await addPhoneEntryToDb(phoneData);
    res.status(201).json({ success: true, data: newPhone });
  } catch (error: any) {
    console.error('Failed to add phone entry:', error);
    if (error.message.includes('IMEI تکراری است') || error.message.toLowerCase().includes('unique constraint')) {
        return res.status(409).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message || 'خطای سرور: مشکل در افزودن گوشی.' });
  }
});

// --- Sales Section API Endpoints ---
app.get('/sellable-items', async (req: express.Request, res: express.Response) => {
  try {
    const items = await getSellableItemsFromDb();
    res.json({ success: true, data: items });
  } catch (error: any) {
    console.error('Failed to fetch sellable items:', error);
    res.status(500).json({ success: false, message: error.message || 'خطای سرور: مشکل در دریافت کالاهای قابل فروش.' });
  }
});

app.get('/sales', async (req: express.Request<{}, any, any, { customerId?: string }>, res: express.Response) => {
  try {
    const customerIdQuery = req.query.customerId;
    const customerId = customerIdQuery ? Number(customerIdQuery) : null;
    if (customerIdQuery && isNaN(customerId as number)) {
      return res.status(400).json({ success: false, message: 'شناسه مشتری نامعتبر است.' });
    }
    const transactions = await getAllSalesTransactionsFromDb(customerId);
    res.json({ success: true, data: transactions });
  } catch (error: any) {
    console.error('Failed to fetch sales transactions:', error);
    res.status(500).json({ success: false, message: error.message || 'خطای سرور: مشکل در دریافت تاریخچه فروش.' });
  }
});

app.post('/sales', async (req: express.Request<{}, any, SaleDataPayload>, res: express.Response) => {
  try {
    const { itemType, itemId, quantity, transactionDate, customerId, notes, discount, paymentMethod } = req.body;
    const parsedDiscount = discount !== undefined && discount !== null ? parseFloat(String(discount)) : 0;

    if (!itemType || !['phone', 'inventory'].includes(String(itemType))) {
      return res.status(400).json({ success: false, message: 'نوع کالا نامعتبر است.' });
    }
    if (!transactionDate || typeof transactionDate !== 'string' || !/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(String(transactionDate).trim())) {
      return res.status(400).json({ success: false, message: 'فرمت تاریخ فروش نامعتبر است (مثال: ۱۴۰۳/۰۵/۲۳).' });
    }
    if (paymentMethod && !['cash', 'credit'].includes(String(paymentMethod))) {
      return res.status(400).json({ success: false, message: 'نحوه پرداخت نامعتبر است. فقط "cash" یا "credit" مجاز است.' });
    }

    const saleData: SaleDataPayload = {
      itemType: itemType as 'phone' | 'inventory',
      itemId: Number(itemId),
      quantity: Number(quantity),
      transactionDate: String(transactionDate).trim(),
      customerId: customerId ? Number(customerId) : null,
      notes: notes ? String(notes).trim() : null,
      discount: parsedDiscount,
      paymentMethod: (paymentMethod || 'cash') as 'cash' | 'credit',
    };

    const newTransaction = await recordSaleTransactionInDb(saleData);
    res.status(201).json({ success: true, data: newTransaction });
  } catch (error: any) {
    console.error('Failed to record sale:', error);
    if (error.message.includes('کافی نیست') || error.message.includes('قابل فروش نیست') || error.message.includes('باید ۱ باشد') || error.message.includes('یافت نشد') || error.message.includes('مشخص نشده یا نامعتبر است') || error.message.includes('بیشتر از قیمت کل کالا باشد') || error.message.includes('نمی‌تواند منفی باشد')) {
        return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message || 'خطای سرور هنگام ثبت فروش.' });
  }
});

// --- Customers API Endpoints ---
app.get('/customers', async (req: express.Request, res: express.Response) => {
  try {
    const customers = await getAllCustomersWithBalanceFromDb();
    res.json({ success: true, data: customers });
  } catch (error: any) {
    console.error('Failed to fetch customers:', error);
    res.status(500).json({ success: false, message: error.message || 'خطای سرور: مشکل در دریافت لیست مشتریان.' });
  }
});

app.post('/customers', async (req: express.Request<{}, any, CustomerPayload>, res: express.Response) => {
  try {
    const { fullName, phoneNumber, address, notes } = req.body;
    if (!fullName || typeof fullName !== 'string' || String(fullName).trim() === '') {
      return res.status(400).json({ success: false, message: 'نام کامل مشتری الزامی است.' });
    }
    const customerData: CustomerPayload = {
      fullName: String(fullName).trim(),
      phoneNumber: phoneNumber ? String(phoneNumber).trim() : undefined,
      address: address ? String(address).trim() : undefined,
      notes: notes ? String(notes).trim() : undefined
    };
    const newCustomer = await addCustomerToDb(customerData);
    res.status(201).json({ success: true, data: newCustomer });
  } catch (error: any) {
    console.error('Failed to add customer:', error);
    if (error.message.includes('تکراری') || error.message.toLowerCase().includes('unique constraint')) {
        return res.status(409).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message || 'خطای سرور: مشکل در افزودن مشتری.' });
  }
});

app.get('/customers/:id', async (req: express.Request<{ id: string }>, res: express.Response) => {
  try {
    const customerId = parseInt(req.params.id, 10);
    if (isNaN(customerId)) {
      return res.status(400).json({ success: false, message: 'شناسه مشتری نامعتبر است.' });
    }
    const profile = await getCustomerByIdFromDb(customerId);
    const ledger = await getLedgerForCustomerFromDb(customerId);
    const purchaseHistory = await getAllSalesTransactionsFromDb(customerId); // Filter sales by customerId
    res.json({ success: true, data: { profile, ledger, purchaseHistory } });
  } catch (error: any) {
    console.error('Failed to fetch customer details:', error);
    if (error.message.includes('یافت نشد')) {
        return res.status(404).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message || 'خطای سرور: مشکل در دریافت جزئیات مشتری.' });
  }
});

app.put('/customers/:id', async (req: express.Request<{ id: string }, any, CustomerPayload>, res: express.Response) => {
  try {
    const customerId = parseInt(req.params.id, 10);
    if (isNaN(customerId)) {
      return res.status(400).json({ success: false, message: 'شناسه مشتری نامعتبر است.' });
    }
    const { fullName, phoneNumber, address, notes } = req.body;
     if (!fullName || typeof fullName !== 'string' || String(fullName).trim() === '') {
      return res.status(400).json({ success: false, message: 'نام کامل مشتری الزامی است.' });
    }
    const customerData: CustomerPayload = {
      fullName: String(fullName).trim(),
      phoneNumber: phoneNumber ? String(phoneNumber).trim() : undefined,
      address: address ? String(address).trim() : undefined,
      notes: notes ? String(notes).trim() : undefined
    };
    const updatedCustomer = await updateCustomerInDb(customerId, customerData);
    res.json({ success: true, data: updatedCustomer });
  } catch (error: any) {
    console.error('Failed to update customer:', error);
    if (error.message.includes('یافت نشد')) {
        return res.status(404).json({ success: false, message: error.message });
    }
    if (error.message.includes('تکراری') || error.message.toLowerCase().includes('unique constraint')) {
        return res.status(409).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message || 'خطای سرور: مشکل در به‌روزرسانی مشتری.' });
  }
});

app.delete('/customers/:id', async (req: express.Request<{ id: string }>, res: express.Response) => {
  try {
    const customerId = parseInt(req.params.id, 10);
    if (isNaN(customerId)) {
      return res.status(400).json({ success: false, message: 'شناسه مشتری نامعتبر است.' });
    }
    const success = await deleteCustomerFromDb(customerId);
    if (!success) {
      return res.status(404).json({ success: false, message: 'مشتری برای حذف یافت نشد.' });
    }
    res.json({ success: true, message: 'مشتری با موفقیت حذف شد.' });
  } catch (error: any)
   {
    console.error('Failed to delete customer:', error);
    res.status(500).json({ success: false, message: error.message || 'خطای سرور: مشکل در حذف مشتری.' });
  }
});

app.post('/customers/:id/ledger', async (req: express.Request<{ id: string }, any, LedgerEntryPayload>, res: express.Response) => {
  try {
    const customerId = parseInt(req.params.id, 10);
    if (isNaN(customerId)) {
      return res.status(400).json({ success: false, message: 'شناسه مشتری نامعتبر است.' });
    }
    const { description, debit, credit, transactionDate } = req.body;
    if (!description || typeof description !== 'string' || String(description).trim() === '') {
      return res.status(400).json({ success: false, message: 'شرح تراکنش الزامی است.' });
    }
    if ((debit === undefined || debit === null || Number(debit) === 0) && (credit === undefined || credit === null || Number(credit) === 0)) {
        return res.status(400).json({ success: false, message: 'حداقل یکی از مقادیر بدهکار یا بستانکار باید وارد شود و مخالف صفر باشد.' });
    }
    if (debit && credit && Number(debit) > 0 && Number(credit) > 0) {
        return res.status(400).json({ success: false, message: 'فقط یکی از مقادیر بدهکار یا بستانکار می‌تواند مقدار داشته باشد.' });
    }

    const ledgerData: LedgerEntryPayload = {
      description: String(description).trim(),
      debit: debit ? Number(debit) : 0,
      credit: credit ? Number(credit) : 0,
      transactionDate: transactionDate ? String(transactionDate) : new Date().toISOString()
    };
    const newEntry = await addCustomerLedgerEntryToDb(customerId, ledgerData);
    res.status(201).json({ success: true, data: newEntry });
  } catch (error: any) {
    console.error('Failed to add ledger entry:', error);
    if (error.message.includes('یافت نشد')) {
        return res.status(404).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message || 'خطای سرور هنگام ثبت تراکنش در دفتر حساب.' });
  }
});


// --- Partners API Endpoints ---
app.get('/partners', async (req: express.Request<{}, any, any, { partnerType?: string }>, res: express.Response) => {
  try {
    const partners = await getAllPartnersWithBalanceFromDb();
    const partnerTypeFilter = req.query.partnerType;
    if (partnerTypeFilter && typeof partnerTypeFilter === 'string') {
        const filtered = partners.filter(p => p.partnerType === partnerTypeFilter);
        return res.json({ success: true, data: filtered });
    }
    res.json({ success: true, data: partners });
  } catch (error: any) {
    console.error('Failed to fetch partners:', error);
    res.status(500).json({ success: false, message: error.message || 'خطای سرور: مشکل در دریافت لیست همکاران.' });
  }
});

app.post('/partners', async (req: express.Request<{}, any, PartnerPayload>, res: express.Response) => {
  try {
    const { partnerName, partnerType, contactPerson, phoneNumber, email, address, notes } = req.body;
    if (!partnerName || typeof partnerName !== 'string' || String(partnerName).trim() === '') {
      return res.status(400).json({ success: false, message: 'نام همکار الزامی است.' });
    }
     if (!partnerType || typeof partnerType !== 'string' || String(partnerType).trim() === '') {
      return res.status(400).json({ success: false, message: 'نوع همکار الزامی است.' });
    }
    const partnerData: PartnerPayload = {
      partnerName: String(partnerName).trim(),
      partnerType: String(partnerType).trim(),
      contactPerson: contactPerson ? String(contactPerson).trim() : undefined,
      phoneNumber: phoneNumber ? String(phoneNumber).trim() : undefined,
      email: email ? String(email).trim() : undefined,
      address: address ? String(address).trim() : undefined,
      notes: notes ? String(notes).trim() : undefined
    };
    const newPartner = await addPartnerToDb(partnerData);
    res.status(201).json({ success: true, data: newPartner });
  } catch (error: any) {
    console.error('Failed to add partner:', error);
    if (error.message.includes('تکراری') || error.message.toLowerCase().includes('unique constraint')) {
        return res.status(409).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message || 'خطای سرور: مشکل در افزودن همکار.' });
  }
});

app.get('/partners/:id', async (req: express.Request<{ id: string }>, res: express.Response) => {
  try {
    const partnerId = parseInt(req.params.id, 10);
    if (isNaN(partnerId)) {
      return res.status(400).json({ success: false, message: 'شناسه همکار نامعتبر است.' });
    }
    const profile = await getPartnerByIdFromDb(partnerId);
    const ledger = await getLedgerForPartnerFromDb(partnerId);
    const purchaseHistory = await getPurchasedItemsFromPartnerDb(partnerId);
    res.json({ success: true, data: { profile, ledger, purchaseHistory } });
  } catch (error: any) {
    console.error('Failed to fetch partner details:', error);
    if (error.message.includes('یافت نشد')) {
        return res.status(404).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message || 'خطای سرور: مشکل در دریافت جزئیات همکار.' });
  }
});

app.put('/partners/:id', async (req: express.Request<{ id: string }, any, PartnerPayload>, res: express.Response) => {
  try {
    const partnerId = parseInt(req.params.id, 10);
    if (isNaN(partnerId)) {
      return res.status(400).json({ success: false, message: 'شناسه همکار نامعتبر است.' });
    }
    const { partnerName, partnerType, contactPerson, phoneNumber, email, address, notes } = req.body;
    if (!partnerName || typeof partnerName !== 'string' || String(partnerName).trim() === '') {
      return res.status(400).json({ success: false, message: 'نام همکار الزامی است.' });
    }
    if (!partnerType || typeof partnerType !== 'string' || String(partnerType).trim() === '') {
      return res.status(400).json({ success: false, message: 'نوع همکار الزامی است.' });
    }
    const partnerData: PartnerPayload = {
      partnerName: String(partnerName).trim(),
      partnerType: String(partnerType).trim(),
      contactPerson: contactPerson ? String(contactPerson).trim() : undefined,
      phoneNumber: phoneNumber ? String(phoneNumber).trim() : undefined,
      email: email ? String(email).trim() : undefined,
      address: address ? String(address).trim() : undefined,
      notes: notes ? String(notes).trim() : undefined
    };
    const updatedPartner = await updatePartnerInDb(partnerId, partnerData);
    res.json({ success: true, data: updatedPartner });
  } catch (error: any) {
    console.error('Failed to update partner:', error);
    if (error.message.includes('یافت نشد')) {
        return res.status(404).json({ success: false, message: error.message });
    }
    if (error.message.includes('تکراری') || error.message.toLowerCase().includes('unique constraint')) {
        return res.status(409).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message || 'خطای سرور: مشکل در به‌روزرسانی همکار.' });
  }
});

app.delete('/partners/:id', async (req: express.Request<{ id: string }>, res: express.Response) => {
  try {
    const partnerId = parseInt(req.params.id, 10);
    if (isNaN(partnerId)) {
      return res.status(400).json({ success: false, message: 'شناسه همکار نامعتبر است.' });
    }
    const success = await deletePartnerFromDb(partnerId);
    if (!success) {
      return res.status(404).json({ success: false, message: 'همکار برای حذف یافت نشد.' });
    }
    res.json({ success: true, message: 'همکار با موفقیت حذف شد.' });
  } catch (error: any) {
    console.error('Failed to delete partner:', error);
     if (error.message.includes('یافت نشد') || error.message.includes('FOREIGN KEY constraint failed')) { // More specific error handling
        return res.status(error.message.includes('یافت نشد') ? 404 : 409).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message || 'خطای سرور: مشکل در حذف همکار.' });
  }
});

app.post('/partners/:id/ledger', async (req: express.Request<{ id: string }, any, LedgerEntryPayload>, res: express.Response) => {
  try {
    const partnerId = parseInt(req.params.id, 10);
    if (isNaN(partnerId)) {
      return res.status(400).json({ success: false, message: 'شناسه همکار نامعتبر است.' });
    }
    const { description, debit, credit, transactionDate } = req.body;
    if (!description || typeof description !== 'string' || String(description).trim() === '') {
      return res.status(400).json({ success: false, message: 'شرح تراکنش الزامی است.' });
    }
     if ((debit === undefined || debit === null || Number(debit) === 0) && (credit === undefined || credit === null || Number(credit) === 0)) {
        return res.status(400).json({ success: false, message: 'حداقل یکی از مقادیر بدهکار یا بستانکار باید وارد شود و مخالف صفر باشد.' });
    }
     if (debit && credit && Number(debit) > 0 && Number(credit) > 0) {
        return res.status(400).json({ success: false, message: 'فقط یکی از مقادیر بدهکار یا بستانکار می‌تواند مقدار داشته باشد.' });
    }
    
    const ledgerData: LedgerEntryPayload = {
      description: String(description).trim(),
      debit: debit ? Number(debit) : 0,
      credit: credit ? Number(credit) : 0,
      transactionDate: transactionDate ? String(transactionDate) : new Date().toISOString()
    };
    const newEntry = await addPartnerLedgerEntryToDb(partnerId, ledgerData);
    res.status(201).json({ success: true, data: newEntry });
  } catch (error: any) {
    console.error('Failed to add partner ledger entry:', error);
    if (error.message.includes('یافت نشد')) {
        return res.status(404).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message || 'خطای سرور هنگام ثبت تراکنش در دفتر حساب همکار.' });
  }
});

// --- Settings API Endpoints ---
app.get('/settings', async (req: express.Request, res: express.Response) => {
  try {
    const settings = await getAllSettingsAsObject();
    res.json({ success: true, data: settings });
  } catch (error: any) {
    console.error('Failed to fetch settings:', error);
    res.status(500).json({ success: false, message: error.message || 'خطای سرور: مشکل در دریافت تنظیمات.' });
  }
});

app.post('/settings', async (req: express.Request<{}, any, Record<string, string>>, res: express.Response) => {
  try {
    const settingsToUpdate: SettingItem[] = Object.entries(req.body).map(([key, value]) => ({ key, value: String(value) }));
    await updateMultipleSettings(settingsToUpdate);
    res.json({ success: true, message: 'تنظیمات با موفقیت ذخیره شد.' });
  } catch (error: any) {
    console.error('Failed to update settings:', error);
    res.status(500).json({ success: false, message: error.message || 'خطای سرور: مشکل در ذخیره تنظیمات.' });
  }
});

app.post('/settings/upload-logo', uploadLogo.single('logo'), async (req: express.Request, res: express.Response) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'هیچ فایلی برای لوگو آپلود نشد.' });
    }
    try {
        const filePath = req.file.path; // Path where multer saved the file
        const relativePath = path.relative(uploadsDir, filePath); // Get path relative to uploadsDir
        
        await updateSetting('store_logo_path', relativePath);
        // Important: Refresh sidebar on client if logo changes!
        res.json({ success: true, message: 'لوگو با موفقیت آپلود شد.', data: { filePath: `/uploads/${relativePath.replace(/\\/g, '/')}` } });
    } catch (error: any) {
        console.error("Error saving logo path or processing file:", error);
        res.status(500).json({ success: false, message: error.message || 'خطا در پردازش فایل لوگو.' });
    }
});

app.get('/settings/backup', async (req: express.Request, res: express.Response) => {
    try {
        await getDbInstance(); // Ensure DB is open
        const dbFilePath = DB_PATH;
        if (fs.existsSync(dbFilePath)) {
            res.setHeader('Content-Disposition', `attachment; filename="kourosh_dashboard_backup_${new Date().toISOString().split('T')[0]}.db"`);
            res.setHeader('Content-Type', 'application/octet-stream');
            const fileStream = fs.createReadStream(dbFilePath);
            fileStream.pipe(res);
        } else {
            res.status(404).json({ success: false, message: 'فایل پایگاه داده یافت نشد.' });
        }
    } catch (error: any) {
        console.error('Backup error:', error);
        res.status(500).json({ success: false, message: error.message || 'خطا در ایجاد فایل پشتیبان.' });
    }
});

app.post('/settings/restore', uploadDb.single('dbfile'), async (req: express.Request, res: express.Response) => {
    if (!req.file || !req.file.buffer) {
        return res.status(400).json({ success: false, message: 'فایل پشتیبان برای بازیابی ارائه نشده است.' });
    }
    try {
        await closeDbConnection(); // Close current connection
        fs.writeFileSync(DB_PATH, req.file.buffer); // Overwrite DB file
        await getDbInstance(true); // Re-initialize (force new connection and schema setup)
        res.json({ success: true, message: 'پایگاه داده با موفقیت از فایل پشتیبان بازیابی شد.' });
    } catch (error: any) {
        console.error('Restore error:', error);
        // Attempt to re-establish a connection to the (potentially corrupted or old) DB if restore failed midway
        getDbInstance(true).catch(reconnectErr => console.error("Failed to reconnect to DB after restore error:", reconnectErr));
        res.status(500).json({ success: false, message: error.message || 'خطا در بازیابی پایگاه داده.' });
    }
});

// --- Invoice Data API Endpoint ---
app.get('/invoice-data/:saleId', async (req: express.Request<{saleId: string}>, res: express.Response) => {
  try {
    const saleIdNum = parseInt(req.params.saleId, 10);
    if (isNaN(saleIdNum)) {
      return res.status(400).json({ success: false, message: 'شناسه فروش نامعتبر است.' });
    }
    const invoiceData = await getInvoiceDataById(saleIdNum);
    res.json({ success: true, data: invoiceData });
  } catch (error: any) {
    console.error(`Failed to fetch invoice data for sale ID ${req.params.saleId}:`, error);
    if (error.message.includes('یافت نشد')) {
        return res.status(404).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message || 'خطای سرور: مشکل در دریافت اطلاعات فاکتور.' });
  }
});


// --- User & Role Management APIs ---
app.get('/roles', async (req: express.Request, res: express.Response) => {
  try {
    const roles = await getAllRoles();
    res.json({ success: true, data: roles });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/users', async (req: express.Request<{}, any, { username: string, password?: string, roleId: number | string }>, res: express.Response) => {
  try {
    const { username, password, roleId } = req.body;
    if (!username || !password || !roleId) {
      return res.status(400).json({ success: false, message: 'نام کاربری، کلمه عبور و نقش الزامی هستند.' });
    }
    if (String(password).length < 6) {
        return res.status(400).json({ success: false, message: 'کلمه عبور باید حداقل ۶ کاراکتر باشد.' });
    }
    const parsedRoleId = Number(roleId);
    if (isNaN(parsedRoleId)) {
        return res.status(400).json({ success: false, message: 'شناسه نقش نامعتبر است.' });
    }
    // Check if role exists
    const roleExists = await getAsync("SELECT id FROM roles WHERE id = ?", [parsedRoleId]);
    if (!roleExists) {
      return res.status(400).json({ success: false, message: 'نقش انتخاب شده معتبر نیست.' });
    }

    const newUser = await addUserToDb(String(username).trim(), String(password), parsedRoleId);
    res.status(201).json({ success: true, data: newUser });
  } catch (error: any) {
    if (error.message.includes('نام کاربری قبلا استفاده شده است')) {
      return res.status(409).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/users', async (req: express.Request, res: express.Response) => {
  try {
    const users = await getAllUsersWithRoles();
    res.json({ success: true, data: users });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- Reports API ---
app.get('/reports/sales-summary', async (req: express.Request<{}, any, any, { fromDate?: string, toDate?: string }>, res: express.Response) => {
  try {
    const { fromDate, toDate } = req.query;
    if (!fromDate || !toDate || typeof fromDate !== 'string' || typeof toDate !== 'string') {
      return res.status(400).json({ success: false, message: 'تاریخ شروع و پایان (شمسی YYYY/MM/DD) برای گزارش الزامی است.' });
    }
    const reportData = await getSalesSummaryAndProfit(fromDate, toDate);
    res.json({ success: true, data: reportData });
  } catch (error: any) {
    console.error('Failed to generate sales summary report:', error);
    res.status(500).json({ success: false, message: error.message || 'خطای سرور: مشکل در تهیه گزارش فروش.' });
  }
});

app.get('/reports/debtors', async (req: express.Request, res: express.Response) => {
  try {
    const debtors = await getDebtorsList();
    res.json({ success: true, data: debtors });
  } catch (error: any) {
    console.error('Failed to generate debtors report:', error);
    res.status(500).json({ success: false, message: error.message || 'خطای سرور: مشکل در تهیه گزارش بدهکاران.' });
  }
});

app.get('/reports/creditors', async (req: express.Request, res: express.Response) => {
  try {
    const creditors = await getCreditorsList();
    res.json({ success: true, data: creditors });
  } catch (error: any) {
    console.error('Failed to generate creditors report:', error);
    res.status(500).json({ success: false, message: error.message || 'خطای سرور: مشکل در تهیه گزارش بستانکاران.' });
  }
});

app.get('/reports/top-customers', async (req: express.Request<{}, any, any, { fromDate?: string, toDate?: string }>, res: express.Response) => {
  try {
    const { fromDate, toDate } = req.query;
    if (!fromDate || !toDate || typeof fromDate !== 'string' || typeof toDate !== 'string') {
      return res.status(400).json({ success: false, message: 'تاریخ شروع و پایان (شمسی YYYY/MM/DD) برای گزارش الزامی است.' });
    }
    const topCustomers = await getTopCustomersBySales(fromDate, toDate);
    res.json({ success: true, data: topCustomers });
  } catch (error: any) {
    console.error('Failed to generate top customers report:', error);
    res.status(500).json({ success: false, message: error.message || 'خطای سرور: مشکل در تهیه گزارش مشتریان برتر.' });
  }
});

app.get('/reports/top-suppliers', async (req: express.Request<{}, any, any, { fromDate?: string, toDate?: string }>, res: express.Response) => {
  try {
    const fromDateShamsi = req.query.fromDate;
    const toDateShamsi = req.query.toDate;
    if (!fromDateShamsi || !toDateShamsi || typeof fromDateShamsi !== 'string' || typeof toDateShamsi !== 'string') {
      return res.status(400).json({ success: false, message: 'تاریخ شروع و پایان (شمسی YYYY/MM/DD) برای گزارش الزامی است.' });
    }
    const fromDateISO = shamsiToISOForAPI(fromDateShamsi) || '';
    const toDateISO = shamsiToISOForAPI(toDateShamsi, true) || ''; // Use end of day for toDate

    if(!fromDateISO || !toDateISO) {
        return res.status(400).json({ success: false, message: 'فرمت تاریخ نامعتبر است.' });
    }
    
    const topSuppliers = await getTopSuppliersByPurchaseValue(fromDateISO, toDateISO);
    res.json({ success: true, data: topSuppliers });
  } catch (error: any) {
    console.error('Failed to generate top suppliers report:', error);
    res.status(500).json({ success: false, message: error.message || 'خطای سرور: مشکل در تهیه گزارش تامین‌کنندگان برتر.' });
  }
});

// --- Dashboard API Endpoints ---
app.get('/dashboard/summary', async (req: express.Request<{}, any, any, { period?: string }>, res: express.Response) => {
  try {
    const period = req.query.period || 'monthly';
    const kpis = await getDashboardKPIs();
    const salesChartData = await getDashboardSalesChartData(String(period));
    const recentActivities = await getDashboardRecentActivities();
    res.json({ success: true, data: { kpis, salesChartData, recentActivities } });
  } catch (error: any) {
    console.error('Failed to fetch dashboard summary:', error);
    res.status(500).json({ success: false, message: error.message || 'خطای سرور در دریافت خلاصه داشبورد.' });
  }
});

// --- Installment Sales API Endpoints ---
app.post('/installment-sales', async (req: express.Request<{}, any, InstallmentSalePayload>, res: express.Response) => {
  try {
    // Basic validation, more can be added
    const { customerId, phoneId, actualSalePrice, downPayment, numberOfInstallments, installmentAmount, installmentsStartDate, checks } = req.body;
    if (!customerId || !phoneId || actualSalePrice <=0 || downPayment < 0 || numberOfInstallments <=0 || installmentAmount <=0 || !installmentsStartDate) {
      return res.status(400).json({ success: false, message: "اطلاعات فروش اقساطی ناقص یا نامعتبر است." });
    }
    const newSale = await addInstallmentSaleToDb(req.body);
    res.status(201).json({ success: true, data: newSale });
  } catch (error: any) {
    console.error('Error adding installment sale:', error);
    res.status(500).json({ success: false, message: error.message || 'خطای سرور هنگام ثبت فروش اقساطی.' });
  }
});

app.get('/installment-sales', async (req: express.Request, res: express.Response) => {
  try {
    const sales = await getAllInstallmentSalesFromDb();
    res.json({ success: true, data: sales });
  } catch (error: any) {
    console.error('Error fetching installment sales:', error);
    res.status(500).json({ success: false, message: error.message || 'خطای سرور هنگام دریافت لیست فروش‌های اقساطی.' });
  }
});

app.get('/installment-sales/:id', async (req: express.Request<{ id: string }>, res: express.Response) => {
  try {
    const saleId = parseInt(req.params.id, 10);
    if (isNaN(saleId)) return res.status(400).json({ success: false, message: 'شناسه فروش نامعتبر است.' });
    
    const saleDetail = await getInstallmentSaleByIdFromDb(saleId);
    if (!saleDetail) return res.status(404).json({ success: false, message: 'فروش اقساطی یافت نشد.' });
    
    res.json({ success: true, data: saleDetail });
  } catch (error: any) {
    console.error('Error fetching installment sale detail:', error);
    res.status(500).json({ success: false, message: error.message || 'خطای سرور هنگام دریافت جزئیات فروش اقساطی.' });
  }
});

app.put('/installment-sales/payment/:paymentId', async (req: express.Request<{ paymentId: string }, any, { paid: boolean, paymentDate?: string }>, res: express.Response) => {
  try {
    const paymentId = parseInt(req.params.paymentId, 10);
    if (isNaN(paymentId)) return res.status(400).json({ success: false, message: 'شناسه قسط نامعتبر است.' });
    
    const { paid, paymentDate } = req.body; // paymentDate is Shamsi YYYY/MM/DD
    if (typeof paid !== 'boolean') return res.status(400).json({ success: false, message: 'وضعیت پرداخت نامعتبر است.'});
    
    const success = await updateInstallmentPaymentStatusInDb(paymentId, paid, paymentDate);
    if (!success) return res.status(404).json({ success: false, message: 'قسط مورد نظر یافت نشد.'});
    
    res.json({ success: true, message: 'وضعیت قسط به‌روز شد.' });
  } catch (error: any) {
    console.error('Error updating installment payment status:', error);
    res.status(500).json({ success: false, message: error.message || 'خطای سرور هنگام به‌روزرسانی وضعیت قسط.'});
  }
});

app.put('/installment-sales/check/:checkId', async (req: express.Request<{ checkId: string }, any, { status: CheckStatus }>, res: express.Response) => {
  try {
    const checkId = parseInt(req.params.checkId, 10);
    if (isNaN(checkId)) return res.status(400).json({ success: false, message: 'شناسه چک نامعتبر است.' });

    const { status } = req.body;
    if (!status || !["در جریان وصول", "وصول شده", "برگشت خورده", "نزد مشتری", "باطل شده"].includes(status)) {
       return res.status(400).json({ success: false, message: 'وضعیت چک نامعتبر است.'});
    }

    const success = await updateCheckStatusInDb(checkId, status);
    if (!success) return res.status(404).json({ success: false, message: 'چک مورد نظر یافت نشد.'});

    res.json({ success: true, message: 'وضعیت چک به‌روز شد.' });
  } catch (error: any) {
    console.error('Error updating check status:', error);
    res.status(500).json({ success: false, message: error.message || 'خطای سرور هنگام به‌روزرسانی وضعیت چک.'});
  }
});


// Generic Error Handler - Placed at the end
const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  console.error("Unhandled error:", err);
  if (err instanceof multer.MulterError) {
    // A Multer error occurred when uploading.
    return res.status(400).json({ success: false, message: `خطای آپلود فایل: ${err.message}` });
  } else if (err) {
    // An unknown error occurred when uploading.
    return res.status(500).json({ success: false, message: `خطای سرور ناشناخته: ${err.message}` });
  }
  // If no error, but also no response sent, pass to Express default 404 handler
  if (!res.headersSent) {
    next();
  }
};
app.use(errorHandler);


getDbInstance().then(() => {
  app.listen(port, () => {
    console.log(`Backend server running at http://localhost:${port}`);
  });
}).catch(err => {
  console.error("Failed to initialize database and start server:", err);
  process.exit(1);
});
