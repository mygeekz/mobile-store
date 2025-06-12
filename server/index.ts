
import express, { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import moment from 'jalali-moment';
import multer, { MulterError } from 'multer';
import fs from 'fs';
import path, { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { ParsedQs } from 'qs'; // For req.query typing
import core from 'express-serve-static-core';


import {
  addProductToDb,
  getAllProductsFromDb,
  addCategoryToDb,
  getAllCategoriesFromDb,
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
  ProductPayload,
  PhoneEntryPayload,
  SaleDataPayload,
  CustomerPayload,
  LedgerEntryPayload,
  PartnerPayload,
  SettingItem,
  fromShamsiStringToISO
} from './database';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3001;
app.use('/api', router);

app.use(express.json());

const uploadsDir = join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Multer setup for logo
const logoStorage = multer.diskStorage({
  destination: function (req: Request, file: Express.Multer.File, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req: Request, file: Express.Multer.File, cb) {
    cb(null, `logo-${Date.now()}${path.extname(file.originalname)}`);
  }
});
const imageFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) {
    return cb(new Error('فقط فایل‌های تصویری مجاز هستند!') as any, false);
  }
  cb(null, true);
};
const uploadLogo = multer({ storage: logoStorage, fileFilter: imageFileFilter, limits: { fileSize: 2 * 1024 * 1024 } });

// Multer setup for DB restore
const dbRestoreStorage = multer.memoryStorage();
const dbFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (path.extname(file.originalname).toLowerCase() !== '.db') {
    return cb(new Error('فایل پشتیبان باید با فرمت .db باشد.') as any, false);
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
app.get('/api/categories', async (req: Request, res: Response) => {
  try {
    const categories = await getAllCategoriesFromDb();
    res.json({ success: true, data: categories });
  } catch (error: any) {
    console.error('Failed to fetch categories:', error);
    res.status(500).json({ success: false, message: error.message || 'خطای سرور: مشکل در دریافت دسته‌بندی‌ها.' });
  }
});

app.get('/api/categories', async (req: Request<{}, any, { name: string }>, res: Response) => {
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

// General Products API
app.get('/api/products', async (req: Request<{}, any, any, { supplierId?: string }>, res: Response) => {
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

app.get('/api/products', async (req: Request<{}, any, ProductPayload>, res: Response) => {
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
app.get('/api/phones', async (req: Request<{}, any, any, { supplierId?: string }>, res: Response) => {
  try {
    const supplierIdQuery = req.query.supplierId;
    const supplierId = supplierIdQuery ? Number(supplierIdQuery) : null;
     if (supplierIdQuery && isNaN(supplierId as number)) {
        return res.status(400).json({ success: false, message: 'شناسه تامین‌کننده نامعتبر است.' });
    }
    const phones = await getAllPhoneEntriesFromDb(supplierId);
    res.json({ success: true, data: phones });
  } catch (error: any) {
    console.error('Failed to fetch phone entries:', error);
    res.status(500).json({ success: false, message: error.message || 'خطای سرور: مشکل در دریافت لیست گوشی‌ها.' });
  }
});

app.get('/api/phones', async (req: Request<{}, any, PhoneEntryPayload>, res: Response) => {
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
app.get('/api/sellable-items', async (req: Request, res: Response) => {
  try {
    const items = await getSellableItemsFromDb();
    res.json({ success: true, data: items });
  } catch (error: any) {
    console.error('Failed to fetch sellable items:', error);
    res.status(500).json({ success: false, message: error.message || 'خطای سرور: مشکل در دریافت کالاهای قابل فروش.' });
  }
});

app.get('/api/sales', async (req: Request<{}, any, any, { customerId?: string }>, res: Response) => {
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

app.get('/api/sales', async (req: Request<{}, any, SaleDataPayload>, res: Response) => {
  try {
    const { itemType, itemId, quantity, transactionDate, customerId, notes, discount } = req.body;
    const parsedDiscount = discount !== undefined && discount !== null ? parseFloat(String(discount)) : 0;

    if (!itemType || !['phone', 'inventory'].includes(String(itemType))) {
      return res.status(400).json({ success: false, message: 'نوع کالا نامعتبر است.' });
    }
    if (!transactionDate || typeof transactionDate !== 'string' || !/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(String(transactionDate).trim())) {
      return res.status(400).json({ success: false, message: 'فرمت تاریخ فروش نامعتبر است (مثال: ۱۴۰۳/۰۵/۲۳).' });
    }

    const saleData: SaleDataPayload = {
      itemType: itemType as 'phone' | 'inventory',
      itemId: Number(itemId),
      quantity: Number(quantity),
      transactionDate: String(transactionDate).trim(),
      customerId: customerId ? Number(customerId) : null,
      notes: notes ? String(notes).trim() : null,
      discount: parsedDiscount
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
app.get('/api/customers', async (req: Request, res: Response) => {
  try {
    const customers = await getAllCustomersWithBalanceFromDb();
    res.json({ success: true, data: customers });
  } catch (error: any) {
    console.error('Failed to fetch customers:', error);
    res.status(500).json({ success: false, message: error.message || 'خطای سرور: مشکل در دریافت لیست مشتریان.' });
  }
});

app.get('/api/customers', async (req: Request<{}, any, CustomerPayload>, res: Response) => {
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

app.get('/api/customers/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const customerId = parseInt(req.params.id, 10);
    if (isNaN(customerId)) return res.status(400).json({ success: false, message: 'شناسه مشتری نامعتبر است.' });

    const profile = await getCustomerByIdFromDb(customerId);
    if (!profile) return res.status(404).json({ success: false, message: 'مشتری یافت نشد.' });

    const ledger = await getLedgerForCustomerFromDb(customerId);
    const purchaseHistory = await getAllSalesTransactionsFromDb(customerId);

    res.json({ success: true, data: { profile, ledger, purchaseHistory } });
  } catch (error: any) {
    console.error(`Failed to get customer ${req.params.id}:`, error);
    res.status(500).json({ success: false, message: error.message || 'خطای سرور: مشکل در دریافت اطلاعات مشتری.' });
  }
});

app.put('/customers/:id', async (req: Request<{ id: string }, any, CustomerPayload>, res: Response) => {
  try {
    const customerId = parseInt(req.params.id, 10);
    if (isNaN(customerId)) return res.status(400).json({ success: false, message: 'شناسه مشتری نامعتبر است.' });

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
    if (!updatedCustomer) return res.status(404).json({ success: false, message: 'مشتری برای به‌روزرسانی یافت نشد.'});

    res.json({ success: true, data: updatedCustomer });
  } catch (error: any) {
    console.error(`Failed to update customer ${req.params.id}:`, error);
     if (error.message.includes('تکراری') || error.message.toLowerCase().includes('unique constraint')) return res.status(409).json({ success: false, message: error.message });
    res.status(500).json({ success: false, message: error.message || 'خطای سرور: مشکل در به‌روزرسانی مشتری.' });
  }
});

app.delete('/customers/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const customerId = parseInt(req.params.id, 10);
    if (isNaN(customerId)) return res.status(400).json({ success: false, message: 'شناسه مشتری نامعتبر است.' });

    const success = await deleteCustomerFromDb(customerId);
    if (!success) return res.status(404).json({ success: false, message: 'مشتری برای حذف یافت نشد.' });

    res.json({ success: true, message: 'مشتری با موفقیت حذف شد.' });
  } catch (error: any) {
    console.error(`Failed to delete customer ${req.params.id}:`, error);
    res.status(500).json({ success: false, message: error.message || 'خطای سرور: مشکل در حذف مشتری.' });
  }
});

app.get('/api/customers/:id/ledger', async (req: Request<{ id: string }, any, LedgerEntryPayload>, res: Response) => {
  try {
    const customerId = parseInt(req.params.id, 10);
    if (isNaN(customerId)) return res.status(400).json({ success: false, message: 'شناسه مشتری نامعتبر است.' });

    const { description, debit, credit, transactionDate } = req.body; // transactionDate is ISO from frontend
    if (!description?.trim()) return res.status(400).json({ success: false, message: 'شرح تراکنش الزامی است.' });

    const parsedDebit = debit !== undefined ? parseFloat(String(debit)) : 0;
    const parsedCredit = credit !== undefined ? parseFloat(String(credit)) : 0;
    if ( (isNaN(parsedDebit) || parsedDebit < 0) || (isNaN(parsedCredit) || parsedCredit < 0) ) {
        return res.status(400).json({ success: false, message: 'مبالغ بدهکار/بستانکار باید اعداد غیرمنفی باشند.' });
    }
    if (parsedDebit === 0 && parsedCredit === 0) {
        return res.status(400).json({ success: false, message: 'تراکنش باید حداقل یک مقدار بدهکار یا بستانکار داشته باشد.' });
    }
    
    let transactionDateISO = transactionDate ? String(transactionDate).trim() : new Date().toISOString();
    if (transactionDate && moment(transactionDateISO, "YYYY-MM-DD", true).isValid()) {
        transactionDateISO = moment(transactionDateISO, "YYYY-MM-DD").toISOString();
    } else if (transactionDate && !moment(transactionDateISO, moment.ISO_8601, true).isValid()){
        return res.status(400).json({ success: false, message: 'فرمت تاریخ تراکنش نامعتبر است (باید YYYY-MM-DD یا ISO 8601 باشد).' });
    }


    const ledgerData: LedgerEntryPayload = {
        description: String(description).trim(),
        debit: parsedDebit,
        credit: parsedCredit,
        transactionDate: transactionDateISO
    };
    const newEntry = await addCustomerLedgerEntryToDb(customerId, ledgerData);
    res.status(201).json({ success: true, data: newEntry });
  } catch (error: any) {
    console.error(`Failed to add ledger for customer ${req.params.id}:`, error);
    res.status(500).json({ success: false, message: error.message || 'خطای سرور: مشکل در افزودن به دفتر مشتری.' });
  }
});


// --- Partners API Endpoints ---
app.get('/api/partners', async (req: Request, res: Response) => {
  try {
    const partners = await getAllPartnersWithBalanceFromDb();
    res.json({ success: true, data: partners });
  } catch (error: any) {
    console.error('Failed to fetch partners:', error);
    res.status(500).json({ success: false, message: error.message || 'خطای سرور: مشکل در دریافت لیست همکاران.' });
  }
});

app.get('/api/partners', async (req: Request<{}, any, PartnerPayload>, res: Response) => {
  try {
    const { partnerName, partnerType, contactPerson, phoneNumber, email, address, notes } = req.body;
    if (!partnerName || typeof partnerName !== 'string' || String(partnerName).trim() === '') {
      return res.status(400).json({ success: false, message: 'نام همکار الزامی است.' });
    }
    if (!partnerType || typeof partnerType !== 'string' || String(partnerType).trim() === '') {
      return res.status(400).json({ success: false, message: 'نوع همکار الزامی است (مثلا: Supplier).' });
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

app.get('/api/partners/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const partnerId = parseInt(req.params.id, 10);
    if (isNaN(partnerId)) {
      return res.status(400).json({ success: false, message: 'شناسه همکار نامعتبر است.' });
    }
    const profile = await getPartnerByIdFromDb(partnerId);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'همکار یافت نشد.' });
    }
    const ledger = await getLedgerForPartnerFromDb(partnerId);
    const purchaseHistory = await getPurchasedItemsFromPartnerDb(partnerId);

    res.json({ success: true, data: { profile, ledger, purchaseHistory } });
  } catch (error: any) {
    console.error(`Failed to fetch partner details for ID ${req.params.id}:`, error);
    res.status(500).json({ success: false, message: error.message || 'خطای سرور: مشکل در دریافت اطلاعات همکار.' });
  }
});

app.put('/partners/:id', async (req: Request<{ id: string }, any, PartnerPayload>, res: Response) => {
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
    if (!updatedPartner) {
        return res.status(404).json({ success: false, message: 'همکار برای به‌روزرسانی یافت نشد.'});
    }
    res.json({ success: true, data: updatedPartner });
  } catch (error: any) {
    console.error(`Failed to update partner ID ${req.params.id}:`, error);
     if (error.message.includes('تکراری') || error.message.toLowerCase().includes('unique constraint')) {
        return res.status(409).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message || 'خطای سرور: مشکل در به‌روزرسانی همکار.' });
  }
});

app.delete('/partners/:id', async (req: Request<{ id: string }>, res: Response) => {
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
    console.error(`Failed to delete partner ID ${req.params.id}:`, error);
    res.status(500).json({ success: false, message: error.message || 'خطای سرور: مشکل در حذف همکار.' });
  }
});

app.get('/api/partners/:id/ledger', async (req: Request<{ id: string }, any, LedgerEntryPayload>, res: Response) => {
  try {
    const partnerId = parseInt(req.params.id, 10);
    if (isNaN(partnerId)) {
      return res.status(400).json({ success: false, message: 'شناسه همکار نامعتبر است.' });
    }
    const { description, debit, credit, transactionDate } = req.body; // transactionDate is ISO from frontend

    if (!description || typeof description !== 'string' || String(description).trim() === '') {
      return res.status(400).json({ success: false, message: 'شرح تراکنش الزامی است.' });
    }
    const parsedDebit = debit !== undefined ? parseFloat(String(debit)) : 0;
    const parsedCredit = credit !== undefined ? parseFloat(String(credit)) : 0;

    if (isNaN(parsedDebit) || isNaN(parsedCredit)) {
        return res.status(400).json({ success: false, message: 'مقادیر بدهکار/بستانکار باید عددی باشند.' });
    }
    if (parsedDebit < 0 || parsedCredit < 0) {
        return res.status(400).json({ success: false, message: 'مقادیر بدهکار/بستانکار نمی‌توانند منفی باشند.' });
    }
    if (parsedDebit > 0 && parsedCredit > 0) {
        return res.status(400).json({ success: false, message: 'تراکنش نمی‌تواند همزمان هم بدهکار و هم بستانکار باشد برای ثبت دستی.' });
    }
    if (parsedDebit === 0 && parsedCredit === 0) {
        return res.status(400).json({ success: false, message: 'تراکنش باید حداقل یک مقدار بدهکار یا بستانکار داشته باشد.' });
    }
    
    let transactionDateISO = transactionDate ? String(transactionDate).trim() : new Date().toISOString();
    if (transactionDate && moment(transactionDateISO, "YYYY-MM-DD", true).isValid()) {
       transactionDateISO = moment(transactionDateISO, "YYYY-MM-DD").toISOString();
   } else if (transactionDate && !moment(transactionDateISO, moment.ISO_8601, true).isValid()){
       return res.status(400).json({ success: false, message: 'فرمت تاریخ تراکنش نامعتبر است (باید YYYY-MM-DD یا ISO 8601 باشد).' });
   }

    const ledgerData: LedgerEntryPayload = {
        description: String(description).trim(),
        debit: parsedDebit,
        credit: parsedCredit,
        transactionDate: transactionDateISO
    };
    const newEntry = await addPartnerLedgerEntryToDb(partnerId, ledgerData);
    res.status(201).json({ success: true, data: newEntry });
  } catch (error: any) {
    console.error(`Failed to add ledger entry for partner ID ${req.params.id}:`, error);
    res.status(500).json({ success: false, message: error.message || 'خطای سرور: مشکل در افزودن به دفتر همکار.' });
  }
});


// --- Reporting API Endpoints ---
app.get('/api/reports/sales-summary', async (req: Request<{}, any, any, { fromDate?: string, toDate?: string }>, res: Response) => {
  try {
    const { fromDate, toDate } = req.query;
    if (!fromDate || !toDate || !/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(fromDate) || !/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(toDate)) {
      return res.status(400).json({ success: false, message: 'فرمت تاریخ شروع و پایان (شمسی YYYY/MM/DD) الزامی است.' });
    }
    const summary = await getSalesSummaryAndProfit(fromDate, toDate);
    res.json({ success: true, data: summary });
  } catch (error: any) {
    console.error('API Error (sales-summary):', error);
    res.status(500).json({ success: false, message: error.message || 'خطای سرور: مشکل در تهیه گزارش فروش و سود.' });
  }
});

app.get('/api/reports/debtors', async (req: Request, res: Response) => {
  try {
    const debtors = await getDebtorsList();
    res.json({ success: true, data: debtors });
  } catch (error: any) {
    console.error('API Error (debtors):', error);
    res.status(500).json({ success: false, message: error.message || 'خطای سرور: مشکل در تهیه گزارش بدهکاران.' });
  }
});

app.get('/api/reports/creditors', async (req: Request, res: Response) => {
  try {
    const creditors = await getCreditorsList();
    res.json({ success: true, data: creditors });
  } catch (error: any) {
    console.error('API Error (creditors):', error);
    res.status(500).json({ success: false, message: error.message || 'خطای سرور: مشکل در تهیه گزارش بستانکاران.' });
  }
});

app.get('/api/reports/top-customers', async (req: Request<{}, any, any, { fromDate?: string, toDate?: string }>, res: Response) => {
  try {
    const { fromDate, toDate } = req.query;
    if (!fromDate || !toDate || !/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(fromDate) || !/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(toDate)) {
      return res.status(400).json({ success: false, message: 'فرمت تاریخ شروع و پایان (شمسی YYYY/MM/DD) الزامی است.' });
    }
    const topCustomers = await getTopCustomersBySales(fromDate, toDate);
    res.json({ success: true, data: topCustomers });
  } catch (error: any) {
    console.error('API Error (top-customers):', error);
    res.status(500).json({ success: false, message: error.message || 'خطای سرور: مشکل در تهیه گزارش مشتریان برتر.' });
  }
});

app.get('/api/reports/top-suppliers', async (req: Request<{}, any, any, { fromDate?: string, toDate?: string }>, res: Response) => {
  try {
    const { fromDate, toDate } = req.query;
     if (!fromDate || !toDate || !/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(fromDate) || !/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(toDate)) {
      return res.status(400).json({ success: false, message: 'فرمت تاریخ شروع و پایان (شمسی YYYY/MM/DD) الزامی است.' });
    }
    const fromDateISO = shamsiToISOForAPI(String(fromDate), false);
    const toDateISO = shamsiToISOForAPI(String(toDate), true);

    if (!fromDateISO || !toDateISO) {
      return res.status(400).json({ success: false, message: 'تاریخ ارائه شده نامعتبر است.' });
    }

    const topSuppliers = await getTopSuppliersByPurchaseValue(fromDateISO, toDateISO);
    res.json({ success: true, data: topSuppliers });
  } catch (error: any) {
    console.error('API Error (top-suppliers):', error);
    res.status(500).json({ success: false, message: error.message || 'خطای سرور: مشکل در تهیه گزارش تامین‌کنندگان برتر.' });
  }
});

// --- Invoice API Endpoint ---
app.get('/api/invoice-data/:saleId', async (req: Request<{ saleId: string }>, res: Response) => {
  try {
    const saleId = parseInt(req.params.saleId, 10);
    if (isNaN(saleId)) {
      return res.status(400).json({ success: false, message: 'شناسه فروش نامعتبر است.' });
    }
    const invoiceData = await getInvoiceDataById(saleId);
    res.json({ success: true, data: invoiceData });
  } catch (error: any) {
    console.error(`API Error (invoice-data for saleId ${req.params.saleId}):`, error);
    if (error.message.includes('یافت نشد')) {
      return res.status(404).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message || 'خطای سرور: مشکل در دریافت اطلاعات فاکتور.' });
  }
});

// --- Settings API Endpoints ---
app.get('/api/settings', async (req: Request, res: Response) => {
  try {
    const settings = await getAllSettingsAsObject();
    res.json({ success: true, data: settings });
  } catch (error: any) {
    console.error("API Error (get settings):", error);
    res.status(500).json({ success: false, message: error.message || "خطای سرور: مشکل در دریافت تنظیمات."});
  }
});

app.get('/api/settings', async (req: Request<{}, any, Record<string, any>>, res: Response) => {
  try {
    const settingsToUpdate = req.body;
    if (typeof settingsToUpdate !== 'object' || settingsToUpdate === null) {
      return res.status(400).json({ success: false, message: "فرمت داده‌های ارسالی نامعتبر است." });
    }
    const settingsArray: SettingItem[] = Object.entries(settingsToUpdate).map(([key, value]) => ({ key, value: String(value) }));

    await updateMultipleSettings(settingsArray);
    res.json({ success: true, message: "تنظیمات با موفقیت به‌روزرسانی شد." });
  } catch (error: any) {
    console.error("API Error (update settings):", error);
    res.status(500).json({ success: false, message: error.message || "خطای سرور: مشکل در به‌روزرسانی تنظیمات." });
  }
});

const logoUploadErrorHandler: ErrorRequestHandler = (err, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ success: false, message: 'حجم فایل لوگو بیش از حد مجاز (2MB) است.' });
        }
        return res.status(400).json({ success: false, message: `خطای آپلود لوگو: ${err.message}` });
    } else if (err) {
        return res.status(400).json({ success: false, message: err.message });
    }
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'خطای ناشناخته در پردازش آپلود لوگو.' });
    }
};

app.get('/api/settings/upload-logo', uploadLogo.single('logo'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'هیچ فایلی برای لوگو انتخاب نشده است.' });
    }
    const currentSettings = await getAllSettingsAsObject();
    const oldLogoPath = currentSettings.store_logo_path;
    if (oldLogoPath && oldLogoPath !== req.file.filename) {
        const fullOldPath = join(uploadsDir, oldLogoPath);
        if (fs.existsSync(fullOldPath)) {
            try {
              fs.unlinkSync(fullOldPath);
              console.log("Old logo deleted:", fullOldPath);
            } catch (unlinkErr: any) {
              console.error("Error deleting old logo:", unlinkErr);
            }
        }
    }
    await updateSetting('store_logo_path', req.file.filename);
    res.json({ success: true, message: 'لوگو با موفقیت آپلود شد.', data: { filePath: `/uploads/${req.file.filename}` } });
  } catch (error: any) {
    console.error("API Error (upload logo):", error);
    if (req.file && req.file.path) { 
        fs.unlink(req.file.path, (errFS) => { // Changed err to errFS to avoid conflict
            if (errFS) console.error("Error deleting orphaned uploaded logo during error handling:", errFS);
        });
    }
   next(error); 
  }
}, logoUploadErrorHandler);


app.get('/api/settings/backup', async (req: Request, res: Response) => {
  try {
    res.download(DB_PATH, `kourosh_inventory_backup_${Date.now()}.db`, (err) => {
      if (err) {
        console.error("Error sending DB backup:", err);
        if (!res.headersSent) {
          res.status(500).json({ success: false, message: "خطای سرور: مشکل در ایجاد فایل پشتیبان." });
        }
      }
    });
  } catch (error: any) {
    console.error("API Error (backup DB):", error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "خطای سرور: مشکل در پشتیبان‌گیری." });
    }
  }
});

app.get('/api/settings/restore', uploadDb.single('dbfile'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'هیچ فایل پشتیبانی انتخاب نشده است.' });
    }
    console.log("Attempting to close current DB connection for restore...");
    await closeDbConnection();
    console.log("DB connection closed. Replacing file...");
    fs.writeFileSync(DB_PATH, req.file.buffer);
    console.log("Database file replaced. Attempting to re-initialize...");
    await getDbInstance(true); 
    console.log("Database restored and re-initialized successfully.");
    res.json({ success: true, message: 'پایگاه داده با موفقیت از فایل پشتیبان بازیابی شد.' });
  } catch (error: any) {
    console.error("API Error (restore DB):", error);
    try {
      console.warn("Restore failed, attempting to re-initialize current DB state (could be old or new file depending on failure point)...");
      await getDbInstance(true); 
    } catch (reinitError: any) {
      console.error("CRITICAL: Failed to re-initialize DB after restore error:", reinitError);
    }
    res.status(500).json({ success: false, message: `خطای سرور: ${error.message}. ممکن است نیاز به راه‌اندازی مجدد سرور باشد.` });
  }
});

// --- User Management API Endpoints ---
app.get('/api/roles', async (req: Request, res: Response) => {
  try {
    const roles = await getAllRoles();
    res.json({ success: true, data: roles });
  } catch (error: any) {
    console.error("API Error (get roles):", error);
    res.status(500).json({ success: false, message: error.message || 'خطای سرور: مشکل در دریافت نقش‌ها.' });
  }
});

app.get('/api/users', async (req: Request, res: Response) => {
  try {
    const users = await getAllUsersWithRoles();
    res.json({ success: true, data: users });
  } catch (error: any) {
    console.error("API Error (get users):", error);
    res.status(500).json({ success: false, message: error.message || 'خطای سرور: مشکل در دریافت کاربران.' });
  }
});

app.get('/api/users', async (req: Request<{}, any, { username?: string, password?: string, roleId?: string | number }>, res: Response) => {
  try {
    const { username, password, roleId } = req.body;
    if (!username || !password || !roleId) {
      return res.status(400).json({ success: false, message: 'نام کاربری، کلمه عبور و نقش الزامی هستند.' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ success: false, message: 'کلمه عبور باید حداقل ۶ کاراکتر باشد.' });
    }

    const newUser = await addUserToDb(String(username), String(password), parseInt(String(roleId), 10));
    const role = await getAsync("SELECT name FROM roles WHERE id = ?", [newUser.roleId]);
    const userResponse = {
        id: newUser.id,
        username: newUser.username,
        roleId: newUser.roleId,
        roleName: role ? role.name : 'نامشخص',
        dateAdded: new Date().toISOString()
    };
    res.status(201).json({ success: true, data: userResponse });
  } catch (error: any) {
    console.error("API Error (add user):", error);
    if (error.message.includes("نام کاربری قبلا استفاده شده است") || error.message.toLowerCase().includes('unique constraint')) {
        return res.status(409).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message || 'خطای سرور: مشکل در افزودن کاربر.' });
  }
});

// --- Dashboard API Endpoint ---
app.get('/api/dashboard/summary', async (req: Request<{}, any, any, {period?: string}>, res: Response) => {
  try {
    const period = req.query.period;

    const kpis = await getDashboardKPIs();
    const salesChartData = await getDashboardSalesChartData(period || 'monthly');
    const recentActivities = await getDashboardRecentActivities();

    res.json({
      success: true,
      data: {
        kpis,
        salesChartData,
        recentActivities
      }
    });
  } catch (error: any) {
    console.error("API Error (dashboard summary):", error);
    res.status(500).json({ success: false, message: error.message || "خطای سرور: مشکل در دریافت اطلاعات داشبورد." });
  }
});


const startServer = async () => {
  try {
    await getDbInstance();
    console.log("Database initialization successful. Server can now start.");
    app.listen(3001, () => {
      console.log(`Backend server listening at http://localhost:${port}`);
    });
  } catch (error: any) {
    console.error("Server failed to start due to database initialization error:", error);
    process.exit(1);
  }
};

startServer();

// Default error handler - Must be the last app.use() call
const defaultErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  console.error("Unhandled error in Express pipeline:", err);
  if (!res.headersSent) {
    res.status(500).json({ success: false, message: "خطای داخلی سرور" });
  }
};
app.use(defaultErrorHandler);
