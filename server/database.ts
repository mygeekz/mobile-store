
import sqlite3 from 'sqlite3';
import path, { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import moment from 'jalali-moment';
import bcryptjs from 'bcryptjs';

// import type { InstallmentSalePayload, InstallmentCheckInfo, CheckStatus } from '../../types'; // Import frontend types for payload
// Moved these specific types to be exported from this file if they are defined here or re-exported
// For now, assuming they are similar to what's needed by frontend or defined in ../../types.ts

// Shared types (could be imported from a shared types file if frontend and backend share one)
export interface ProductPayload {
  name: string;
  purchasePrice: number;
  sellingPrice: number;
  stock_quantity: number;
  categoryId: number | null;
  supplierId: number | null;
}
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
  purchaseDate?: string | null; // ISO Date string YYYY-MM-DD
  saleDate?: string | null;     // ISO Date string YYYY-MM-DD
  registerDate?: string; // ISO DateTime string
  status?: string; // e.g., "موجود در انبار", "فروخته شده"
  notes?: string | null;
  supplierId?: number | null;
}
export interface SaleDataPayload {
  itemType: 'phone' | 'inventory';
  itemId: number;
  quantity: number;
  transactionDate: string; // Shamsi date YYYY/MM/DD
  customerId?: number | null;
  notes?: string | null;
  discount?: number;
  paymentMethod: 'cash' | 'credit'; // Added
}
export interface CustomerPayload {
  fullName: string;
  phoneNumber?: string | null;
  address?: string | null;
  notes?: string | null;
}
export interface LedgerEntryPayload {
    description: string;
    debit?: number;
    credit?: number;
    transactionDate: string; // ISO DateTime string
}
export interface PartnerPayload {
  partnerName: string;
  partnerType: string;
  contactPerson?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
}
export interface SettingItem {
    key: string;
    value: string;
}
export interface OldMobilePhonePayload { // For the deprecated mobile phone structure
    purchasePrice: number;
    sellingPrice: number;
    brand: string;
    model: string;
    color?: string;
    storage?: number;
    ram?: number;
    imei: string;
}

// Types for Installment Sales - Ensure these are exported if used by server/index.ts
export type CheckStatus = "در جریان وصول" | "وصول شده" | "برگشت خورده" | "نزد مشتری" | "باطل شده";

export interface InstallmentCheckInfo {
  id?: number; 
  checkNumber: string;
  bankName: string;
  dueDate: string; 
  amount: number;
  status: CheckStatus;
}

export interface InstallmentSalePayload { 
  customerId: number;
  phoneId: number;
  actualSalePrice: number;
  downPayment: number;
  numberOfInstallments: number;
  installmentAmount: number;
  installmentsStartDate: string; 
  checks: InstallmentCheckInfo[]; 
  notes?: string;
}


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const DB_PATH = join(__dirname, 'kourosh_inventory.db');
const MOBILE_PHONE_CATEGORY_NAME = "گوشی‌های موبایل";
const DEFAULT_CATEGORIES = ["لوازم جانبی", "قطعات"];
// const DEFAULT_SUPPLIER_NAME = "تامین‌کننده نمونه"; // This is now removed
const DEFAULT_ADMIN_USERNAME = 'admin';
const DEFAULT_ADMIN_PASSWORD = 'password123';

let db: sqlite3.Database | null = null;

// Promisified DB operations
const runAsync = (sql: string, params: any[] = []): Promise<sqlite3.RunResult> => {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error("Database not initialized. Call getDbInstance first."));
    db.run(sql, params, function(this: sqlite3.RunResult, err: Error | null) {
      if (err) return reject(err);
      resolve(this);
    });
  });
};

export const getAsync = (sql: string, params: any[] = []): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error("Database not initialized. Call getDbInstance first."));
    db.get(sql, params, (err: Error | null, row: any) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
};

const allAsync = (sql: string, params: any[] = []): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error("Database not initialized. Call getDbInstance first."));
    db.all(sql, params, (err: Error | null, rows: any[]) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

const execAsync = (sql: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error("Database not initialized. Call getDbInstance first."));
    db.exec(sql, function(this: sqlite3.Statement, err: Error | null) {
      if (err) return reject(err);
      resolve();
    });
  });
};


const getOrCreateMobilePhoneCategory = async (): Promise<{ id: number; name: string }> => {
  let category = await getAsync("SELECT id, name FROM categories WHERE name = ?", [MOBILE_PHONE_CATEGORY_NAME]);
  if (!category) {
    const result = await runAsync("INSERT INTO categories (name) VALUES (?)", [MOBILE_PHONE_CATEGORY_NAME]);
    category = { id: result.lastID, name: MOBILE_PHONE_CATEGORY_NAME };
    console.log(`Category "${MOBILE_PHONE_CATEGORY_NAME}" created with ID: ${category.id}`);
  }
  return category;
};

const seedDefaultCategories = async (): Promise<void> => {
  for (const catName of DEFAULT_CATEGORIES) {
    const existing = await getAsync("SELECT id FROM categories WHERE name = ?", [catName]);
    if (!existing) {
      await runAsync("INSERT INTO categories (name) VALUES (?)", [catName]);
      console.log(`Default category "${catName}" created.`);
    }
  }
};

// This function is no longer needed and its logic is removed.
const seedDefaultSupplier = async (): Promise<void> => {
    // Logic for seeding default supplier is removed.
};

const initializeDatabaseInternal = async (): Promise<void> => {
  // Non-destructive: Use CREATE TABLE IF NOT EXISTS
  try {
    await runAsync("PRAGMA foreign_keys = ON;");
    console.log("Foreign key support enabled.");

    await runAsync(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
      );
    `);
    console.log("Categories table ensured.");

    await runAsync(`
      CREATE TABLE IF NOT EXISTS partners (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        partnerName TEXT NOT NULL,
        partnerType TEXT NOT NULL DEFAULT 'Supplier',
        contactPerson TEXT,
        phoneNumber TEXT UNIQUE,
        email TEXT,
        address TEXT,
        notes TEXT,
        dateAdded TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'))
      );
    `);
    console.log("Partners table ensured.");

    await runAsync(`
      CREATE TABLE IF NOT EXISTS partner_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        partnerId INTEGER NOT NULL,
        transactionDate TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
        description TEXT NOT NULL,
        debit REAL DEFAULT 0,
        credit REAL DEFAULT 0,
        balance REAL NOT NULL,
        FOREIGN KEY (partnerId) REFERENCES partners(id) ON DELETE CASCADE
      );
    `);
    console.log("Partner_ledger table ensured.");

    await runAsync(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        purchasePrice REAL NOT NULL DEFAULT 0,
        sellingPrice REAL NOT NULL DEFAULT 0,
        stock_quantity INTEGER NOT NULL DEFAULT 0,
        saleCount INTEGER NOT NULL DEFAULT 0,
        categoryId INTEGER,
        date_added TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
        supplierId INTEGER,
        FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE SET NULL,
        FOREIGN KEY (supplierId) REFERENCES partners(id) ON DELETE SET NULL
      );
    `);
    console.log("Products table ensured.");

    await runAsync(`
      CREATE TABLE IF NOT EXISTS mobile_phone_details ( /* Old structure */
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        productId INTEGER NOT NULL UNIQUE,
        brand TEXT NOT NULL,
        model TEXT NOT NULL,
        color TEXT,
        storage INTEGER,
        ram INTEGER,
        imei TEXT NOT NULL UNIQUE,
        FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
      );
    `);
    console.log("Mobile_phone_details table (old structure) ensured.");

    await runAsync(`
      CREATE TABLE IF NOT EXISTS phones ( /* New standalone */
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        model TEXT NOT NULL,
        color TEXT,
        storage TEXT,
        ram TEXT,
        imei TEXT NOT NULL UNIQUE,
        batteryHealth INTEGER,
        condition TEXT,
        purchasePrice REAL NOT NULL,
        salePrice REAL,
        sellerName TEXT,
        buyerName TEXT,
        purchaseDate TEXT, /* ISO Date YYYY-MM-DD */
        saleDate TEXT,     /* ISO Date YYYY-MM-DD */
        registerDate TEXT NOT NULL, /* ISO DateTime string */
        status TEXT NOT NULL, /* e.g., "موجود در انبار", "فروخته شده", "فروخته شده (قسطی)" */
        notes TEXT,
        supplierId INTEGER,
        FOREIGN KEY (supplierId) REFERENCES partners(id) ON DELETE SET NULL
      );
    `);
    console.log("Phones table (new standalone) ensured.");

    await runAsync(`
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fullName TEXT NOT NULL,
        phoneNumber TEXT UNIQUE,
        address TEXT,
        notes TEXT,
        dateAdded TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'))
      );
    `);
    console.log("Customers table ensured.");

    await runAsync(`
      CREATE TABLE IF NOT EXISTS customer_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customerId INTEGER NOT NULL,
        transactionDate TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
        description TEXT NOT NULL,
        debit REAL DEFAULT 0,
        credit REAL DEFAULT 0,
        balance REAL NOT NULL,
        FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE
      );
    `);
    console.log("Customer_ledger table ensured.");

    await runAsync(`
      CREATE TABLE IF NOT EXISTS sales_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transactionDate TEXT NOT NULL, /* Shamsi date string e.g., "YYYY/MM/DD" */
        itemType TEXT NOT NULL CHECK(itemType IN ('phone', 'inventory')),
        itemId INTEGER NOT NULL,
        itemName TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        pricePerItem REAL NOT NULL,
        totalPrice REAL NOT NULL, /* This is after discount */
        notes TEXT,
        customerId INTEGER,
        discount REAL DEFAULT 0,
        paymentMethod TEXT DEFAULT 'cash', /* Added paymentMethod with default 'cash' */
        FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE SET NULL
      );
    `);
    console.log("Sales_transactions table ensured.");

    await runAsync(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT
      );
    `);
    console.log("Settings table ensured.");

    await runAsync(`
      CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
      );
    `);
    console.log("Roles table ensured.");

    await runAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        passwordHash TEXT NOT NULL,
        roleId INTEGER NOT NULL,
        dateAdded TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
        FOREIGN KEY (roleId) REFERENCES roles(id) ON DELETE CASCADE
      );
    `);
    console.log("Users table ensured.");

    // New Installment Sales Tables
    await runAsync(`
      CREATE TABLE IF NOT EXISTS installment_sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customerId INTEGER NOT NULL,
        phoneId INTEGER NOT NULL,
        actualSalePrice REAL NOT NULL,
        downPayment REAL NOT NULL,
        numberOfInstallments INTEGER NOT NULL,
        installmentAmount REAL NOT NULL,
        installmentsStartDate TEXT NOT NULL, -- Shamsi Date: YYYY/MM/DD
        notes TEXT,
        dateCreated TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
        FOREIGN KEY (customerId) REFERENCES customers(id),
        FOREIGN KEY (phoneId) REFERENCES phones(id)
      );
    `);
    console.log("Installment_sales table ensured.");

    await runAsync(`
      CREATE TABLE IF NOT EXISTS installment_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        saleId INTEGER NOT NULL,
        installmentNumber INTEGER NOT NULL,
        dueDate TEXT NOT NULL, -- Shamsi Date: YYYY/MM/DD
        amountDue REAL NOT NULL,
        paymentDate TEXT, -- Shamsi Date: YYYY/MM/DD
        status TEXT NOT NULL DEFAULT 'پرداخت نشده', -- ('پرداخت نشده', 'پرداخت شده')
        FOREIGN KEY (saleId) REFERENCES installment_sales(id) ON DELETE CASCADE
      );
    `);
    console.log("Installment_payments table ensured.");

    await runAsync(`
      CREATE TABLE IF NOT EXISTS installment_checks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        saleId INTEGER NOT NULL,
        checkNumber TEXT NOT NULL,
        bankName TEXT NOT NULL,
        dueDate TEXT NOT NULL, -- Shamsi Date: YYYY/MM/DD
        amount REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'نزد مشتری', 
        FOREIGN KEY (saleId) REFERENCES installment_sales(id) ON DELETE CASCADE
      );
    `);
    console.log("Installment_checks table ensured.");


  } catch(err: any) {
    console.error("Error during table creation phase:", err);
    throw new Error(`Failed during table creation: ${err.message}`);
  }

  // Seed initial data (idempotently)
  try {
    await getOrCreateMobilePhoneCategory();
    await seedDefaultCategories();
    // The call to seedDefaultSupplier() is removed from here.
    await seedInitialRolesAndAdmin();
    await ensureDefaultBusinessSettings();
    console.log("Initial data seeding completed/verified.");
  } catch (err: any) {
    console.error("Error seeding initial data:", err);
  }
};

let dbInstance: sqlite3.Database | null = null;
let dbInitializationPromise: Promise<sqlite3.Database | null> | null = null;

export const getDbInstance = (forceNew: boolean = false): Promise<sqlite3.Database | null> => {
  if (dbInstance && !forceNew) return Promise.resolve(dbInstance);
  if (dbInitializationPromise && !forceNew) return dbInitializationPromise;

  dbInitializationPromise = new Promise<sqlite3.Database | null>((resolveConnection, rejectConnection) => {
    const connect = () => {
        const newDb = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, async (err: Error | null) => {
            if (err) {
                console.error('Error opening database connection:', err);
                dbInitializationPromise = null; // Reset promise on failure
                return rejectConnection(new Error(`Failed to open DB: ${err.message}`));
            }
            console.log('Connected to the SQLite database: kourosh_inventory.db');
            db = newDb; // Crucial: assign to the module-scoped db variable
            try {
                await initializeDatabaseInternal();
                dbInstance = newDb;
                resolveConnection(dbInstance);
            } catch (initErr: any) {
                console.error("Database initialization process failed:", initErr);
                dbInitializationPromise = null; // Reset promise on failure
                if (db) {
                    db.close(); // Attempt to close the problematic connection
                    db = null;
                }
                rejectConnection(new Error(`DB init failed: ${initErr.message}`));
            }
        });
    };

    if (db && forceNew) {
        db.close((closeErr: Error | null) => {
            if (closeErr) {
                console.error('Error closing existing DB for re-initialization:', closeErr);
                // Proceed with creating new connection anyway, but log the error
            }
            db = null;
            dbInstance = null;
            console.log('Existing DB connection closed (or attempted to close) for re-initialization.');
            connect();
        });
    } else {
        connect();
    }
  });
  return dbInitializationPromise;
};

export const closeDbConnection = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (db) {
            db.close((err: Error | null) => {
                if (err) {
                    console.error('Error closing the database connection:', err);
                    return reject(new Error(`Failed to close DB: ${err.message}`));
                }
                console.log('Database connection closed.');
                db = null;
                dbInstance = null;
                dbInitializationPromise = null;
                resolve();
            });
        } else {
            resolve();
        }
    });
};


// Internal helper function for adding partner ledger entries
const addPartnerLedgerEntryInternal = async (
  partnerId: number,
  description: string,
  debit: number | undefined,
  credit: number | undefined,
  transactionDateISO?: string
): Promise<any> => {
  const dateToStore = transactionDateISO || new Date().toISOString();
  const prevBalanceRow = await getAsync(
    `SELECT balance FROM partner_ledger WHERE partnerId = ? ORDER BY id DESC LIMIT 1`,
    [partnerId]
  );
  const prevBalance = prevBalanceRow ? prevBalanceRow.balance : 0;
  const currentDebit = debit || 0;
  const currentCredit = credit || 0;
  const newBalance = prevBalance + currentCredit - currentDebit;

  const result = await runAsync(
    `INSERT INTO partner_ledger (partnerId, transactionDate, description, debit, credit, balance) VALUES (?, ?, ?, ?, ?, ?)`,
    [partnerId, dateToStore, description, currentDebit, currentCredit, newBalance]
  );
  return await getAsync("SELECT * FROM partner_ledger WHERE id = ?", [result.lastID]);
};

// --- Categories ---
export const addCategoryToDb = async (name: string): Promise<any> => {
  await getDbInstance(); // Ensure DB is initialized before any operation
  try {
    const result = await runAsync(`INSERT INTO categories (name) VALUES (?)`, [name]);
    return await getAsync("SELECT * FROM categories WHERE id = ?", [result.lastID]);
  } catch (err: any) {
    if (err.message.includes('UNIQUE constraint failed')) {
      throw new Error('نام دسته‌بندی تکراری است.');
    }
    console.error('DB Error (addCategoryToDb):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const getAllCategoriesFromDb = async (): Promise<any[]> => {
  await getDbInstance();
  try {
    return await allAsync(`SELECT * FROM categories ORDER BY name ASC`);
  } catch (err: any) {
    console.error('DB Error (getAllCategoriesFromDb):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const updateCategoryInDb = async (id: number, name: string): Promise<any> => {
  await getDbInstance();
  try {
    const existing = await getAsync("SELECT id FROM categories WHERE id = ?", [id]);
    if (!existing) {
      throw new Error("دسته‌بندی برای بروزرسانی یافت نشد.");
    }
    await runAsync(`UPDATE categories SET name = ? WHERE id = ?`, [name, id]);
    return await getAsync("SELECT * FROM categories WHERE id = ?", [id]);
  } catch (err: any) {
    if (err.message.includes('UNIQUE constraint failed')) {
      throw new Error('این نام دسته‌بندی قبلا ثبت شده است.');
    }
    console.error('DB Error (updateCategoryInDb):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const deleteCategoryFromDb = async (id: number): Promise<boolean> => {
  await getDbInstance();
  try {
    const result = await runAsync(`DELETE FROM categories WHERE id = ?`, [id]);
    if (result.changes === 0) {
        // This check is a bit redundant if the calling function already checks for 404,
        // but good for direct DB function calls.
        throw new Error("دسته‌بندی برای حذف یافت نشد یا قبلا حذف شده است.");
    }
    return result.changes > 0;
  } catch (err: any) {
    console.error('DB Error (deleteCategoryFromDb):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};


// --- Products (Inventory) ---
export const addProductToDb = async (product: ProductPayload): Promise<any> => {
  await getDbInstance();
  const { name, purchasePrice, sellingPrice, stock_quantity, categoryId, supplierId } = product;

  try {
    await execAsync("BEGIN TRANSACTION;");
    const result = await runAsync(
      `INSERT INTO products (name, purchasePrice, sellingPrice, stock_quantity, categoryId, supplierId, saleCount)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [name, purchasePrice, sellingPrice, stock_quantity, categoryId, supplierId]
    );
    const newProductId = result.lastID;

    if (supplierId && purchasePrice > 0 && stock_quantity > 0) {
      const creditAmount = purchasePrice * stock_quantity;
      const description = `دریافت کالا: ${stock_quantity} عدد ${name} (شناسه محصول: ${newProductId}) به ارزش واحد ${purchasePrice.toLocaleString('fa-IR')}`;
      await addPartnerLedgerEntryInternal(supplierId, description, 0, creditAmount, new Date().toISOString());
    }

    await execAsync("COMMIT;");
    return await getAsync(
      `SELECT p.*, c.name as categoryName, pa.partnerName as supplierName
       FROM products p
       LEFT JOIN categories c ON p.categoryId = c.id
       LEFT JOIN partners pa ON p.supplierId = pa.id
       WHERE p.id = ?`,
      [newProductId]
    );
  } catch (err: any) {
    await execAsync("ROLLBACK;");
    console.error('DB Error (addProductToDb):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const getAllProductsFromDb = async (supplierIdFilter: number | null = null): Promise<any[]> => {
  await getDbInstance();
  let sql = `
    SELECT p.id, p.name, p.purchasePrice, p.sellingPrice, p.stock_quantity, p.saleCount, p.date_added,
           p.categoryId, c.name as categoryName,
           p.supplierId, pa.partnerName as supplierName
    FROM products p
    LEFT JOIN categories c ON p.categoryId = c.id
    LEFT JOIN partners pa ON p.supplierId = pa.id
  `;
  const params: any[] = [];
  if (supplierIdFilter) {
    sql += " WHERE p.supplierId = ?";
    params.push(supplierIdFilter);
  }
  sql += " ORDER BY p.date_added DESC";
  try {
    return await allAsync(sql, params);
  } catch (err: any) {
    console.error('DB Error (getAllProductsFromDb):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

// --- Standalone Phones ---
export const addPhoneEntryToDb = async (phoneData: PhoneEntryPayload): Promise<any> => {
  await getDbInstance();
  const {
    model, color, storage, ram, imei, batteryHealth, condition,
    purchasePrice, salePrice, sellerName, purchaseDate,
    saleDate, supplierId
  } = phoneData;

  const registerDate = phoneData.registerDate || new Date().toISOString();
  const status = phoneData.status || "موجود در انبار";

  try {
    const existingPhone = await getAsync("SELECT id FROM phones WHERE imei = ?", [imei]);
    if (existingPhone) {
      throw new Error('شماره IMEI تکراری است.');
    }
    await execAsync("BEGIN TRANSACTION;");
    const result = await runAsync(
      `INSERT INTO phones (model, color, storage, ram, imei, batteryHealth, condition, purchasePrice, salePrice, sellerName, purchaseDate, saleDate, registerDate, status, notes, supplierId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        model, color, storage, ram, imei, batteryHealth, condition,
        purchasePrice, salePrice, sellerName, purchaseDate,
        saleDate, registerDate, status, phoneData.notes, supplierId
      ]
    );
    const newPhoneId = result.lastID;

    if (supplierId && purchasePrice > 0) {
      const description = `دریافت گوشی: ${model} (IMEI: ${imei}, شناسه گوشی: ${newPhoneId}) به ارزش ${Number(purchasePrice).toLocaleString('fa-IR')}`;
      await addPartnerLedgerEntryInternal(supplierId, description, 0, purchasePrice, purchaseDate || new Date().toISOString());
    }

    await execAsync("COMMIT;");
    return await getAsync(
      `SELECT ph.*, pa.partnerName as supplierName
       FROM phones ph
       LEFT JOIN partners pa ON ph.supplierId = pa.id
       WHERE ph.id = ?`, [newPhoneId]);
  } catch (err: any) {
    await execAsync("ROLLBACK;").catch(rbErr => console.error("Rollback failed in addPhoneEntryToDb:", rbErr));
    console.error('DB Error (addPhoneEntryToDb):', err);
    if (err.message.includes('UNIQUE constraint failed: phones.imei') || err.message.includes('شماره IMEI تکراری است')) {
      throw new Error('شماره IMEI تکراری است.');
    }
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const getAllPhoneEntriesFromDb = async (supplierIdFilter: number | null = null, statusFilter?: string): Promise<any[]> => {
  await getDbInstance();
  let sql = `
    SELECT ph.*, pa.partnerName as supplierName
    FROM phones ph
    LEFT JOIN partners pa ON ph.supplierId = pa.id
  `;
  const params: any[] = [];
  const conditions: string[] = [];

  if (supplierIdFilter) {
    conditions.push("ph.supplierId = ?");
    params.push(supplierIdFilter);
  }
  if (statusFilter) {
    conditions.push("ph.status = ?");
    params.push(statusFilter);
  }

  if (conditions.length > 0) {
    sql += " WHERE " + conditions.join(" AND ");
  }
  
  sql += " ORDER BY ph.registerDate DESC";
  try {
    return await allAsync(sql, params);
  } catch (err: any) {
    console.error('DB Error (getAllPhoneEntriesFromDb):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};


// --- Sales ---
export const getSellableItemsFromDb = async (): Promise<{ phones: any[], inventory: any[] }> => {
  await getDbInstance();
  try {
    const phones = await allAsync(`
      SELECT id, model, imei, salePrice as price, 1 as stock
      FROM phones
      WHERE status = 'موجود در انبار' AND salePrice IS NOT NULL AND salePrice > 0
    `);

    const inventory = await allAsync(`
      SELECT id, name, sellingPrice as price, stock_quantity as stock
      FROM products
      WHERE stock_quantity > 0 AND sellingPrice IS NOT NULL AND sellingPrice > 0
    `);

    return {
      phones: phones.map(p => ({
        ...p,
        type: 'phone',
        name: `${p.model} (IMEI: ${p.imei})`
      })),
      inventory: inventory.map(i => ({
        ...i,
        type: 'inventory'
      }))
    };
  } catch (err: any) {
    console.error('DB Error (getSellableItemsFromDb):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const getAllSalesTransactionsFromDb = async (customerIdFilter: number | null = null): Promise<any[]> => {
  await getDbInstance();
  let sql = `
    SELECT st.*, c.fullName as customerFullName
    FROM sales_transactions st
    LEFT JOIN customers c ON st.customerId = c.id
  `;
  const params: any[] = [];
  if (customerIdFilter) {
    sql += " WHERE st.customerId = ?";
    params.push(customerIdFilter);
  }
  sql += " ORDER BY st.id DESC";

  try {
    return await allAsync(sql, params);
  } catch (err: any) {
    console.error('DB Error (getAllSalesTransactionsFromDb):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

const addCustomerLedgerEntryInternal = async (
  customerId: number,
  description: string,
  debit: number | undefined,
  credit: number | undefined,
  transactionDateISO?: string
): Promise<any> => {
  const dateToStore = transactionDateISO || new Date().toISOString();
  const prevBalanceRow = await getAsync(
    `SELECT balance FROM customer_ledger WHERE customerId = ? ORDER BY id DESC LIMIT 1`,
    [customerId]
  );
  const prevBalance = prevBalanceRow ? prevBalanceRow.balance : 0;
  const currentDebit = debit || 0;
  const currentCredit = credit || 0;
  const newBalance = prevBalance + currentDebit - currentCredit;

  const result = await runAsync(
    `INSERT INTO customer_ledger (customerId, transactionDate, description, debit, credit, balance) VALUES (?, ?, ?, ?, ?, ?)`,
    [customerId, dateToStore, description, currentDebit, currentCredit, newBalance]
  );
  return await getAsync("SELECT * FROM customer_ledger WHERE id = ?", [result.lastID]);
};

export const recordSaleTransactionInDb = async (saleData: SaleDataPayload): Promise<any> => {
  await getDbInstance();
  const { itemType, itemId, quantity, transactionDate, customerId, notes, discount = 0, paymentMethod } = saleData; // Added paymentMethod

  try {
    await execAsync("BEGIN TRANSACTION;");
    let itemName: string;
    let pricePerItem: number;

    if (itemType === 'phone') {
      if (quantity !== 1) throw new Error('تعداد برای فروش گوشی باید ۱ باشد.');
      const phone = await getAsync("SELECT model, imei, salePrice, status FROM phones WHERE id = ?", [itemId]);
      if (!phone) throw new Error('گوشی مورد نظر برای فروش یافت نشد.');
      if (phone.status !== 'موجود در انبار') throw new Error(`گوشی "${phone.model} (IMEI: ${phone.imei})" در وضعیت "${phone.status}" قرار دارد و قابل فروش نیست.`);
      if (phone.salePrice === null || typeof phone.salePrice !== 'number' || phone.salePrice <= 0) throw new Error(`قیمت فروش برای گوشی "${phone.model} (IMEI: ${phone.imei})" مشخص نشده یا نامعتبر است.`);

      itemName = `${phone.model} (IMEI: ${phone.imei})`;
      pricePerItem = phone.salePrice;
      await runAsync("UPDATE phones SET status = 'فروخته شده', saleDate = ? WHERE id = ?", [fromShamsiStringToISO(transactionDate), itemId]);
    } else if (itemType === 'inventory') {
      const product = await getAsync("SELECT name, sellingPrice, stock_quantity FROM products WHERE id = ?", [itemId]);
      if (!product) throw new Error('کالای مورد نظر در انبار یافت نشد.');
      if (product.stock_quantity < quantity) throw new Error(`موجودی کالا (${product.name}: ${product.stock_quantity} عدد) برای فروش کافی نیست (درخواست: ${quantity} عدد).`);
      if (product.sellingPrice === null || typeof product.sellingPrice !== 'number' || product.sellingPrice <= 0) throw new Error(`قیمت فروش برای کالا "${product.name}" مشخص نشده یا نامعتبر است.`);

      itemName = product.name;
      pricePerItem = product.sellingPrice;
      await runAsync("UPDATE products SET stock_quantity = stock_quantity - ?, saleCount = saleCount + ? WHERE id = ?", [quantity, quantity, itemId]);
    } else {
      throw new Error('نوع کالای نامعتبر برای فروش.');
    }

    const subTotal = quantity * pricePerItem;
    if (discount > subTotal) throw new Error('مبلغ تخفیف نمی‌تواند بیشتر از قیمت کل کالا باشد.');
    const totalPrice = subTotal - discount;
    if (totalPrice < 0) throw new Error('قیمت نهایی پس از تخفیف نمی‌تواند منفی باشد.');

    const saleResult = await runAsync(
      `INSERT INTO sales_transactions (transactionDate, itemType, itemId, itemName, quantity, pricePerItem, discount, totalPrice, customerId, notes, paymentMethod)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, // Added paymentMethod
      [transactionDate, itemType, itemId, itemName, quantity, pricePerItem, discount, totalPrice, customerId, notes, paymentMethod] // Added paymentMethod
    );

    // Conditionally add to customer ledger only if paymentMethod is 'credit' and there's a customer
    if (customerId && totalPrice > 0 && paymentMethod === 'credit') {
      const saleDateISO = moment(transactionDate, 'jYYYY/jMM/jDD').toISOString();
      await addCustomerLedgerEntryInternal(customerId, `خرید کالا: ${itemName} (روش پرداخت: اعتباری)`, totalPrice, 0, saleDateISO);
    }

    await execAsync("COMMIT;");
    return await getAsync("SELECT * FROM sales_transactions WHERE id = ?", [saleResult.lastID]);
  } catch (err: any) {
    await execAsync("ROLLBACK;").catch(rbErr => console.error("Rollback failed in recordSaleTransactionInDb:", rbErr));
    console.error('DB Error (recordSaleTransactionInDb):', err);
    throw err;
  }
};

// --- Customers ---
export const addCustomerToDb = async (customerData: CustomerPayload): Promise<any> => {
  await getDbInstance();
  const { fullName, phoneNumber, address, notes } = customerData;
  try {
    if (phoneNumber) {
        const existingCustomer = await getAsync("SELECT id FROM customers WHERE phoneNumber = ?", [phoneNumber]);
        if (existingCustomer) {
            throw new Error('شماره تماس قبلا ثبت شده است.');
        }
    }
    const result = await runAsync(
      `INSERT INTO customers (fullName, phoneNumber, address, notes) VALUES (?, ?, ?, ?)`,
      [fullName, phoneNumber || null, address || null, notes || null]
    );
    return await getAsync("SELECT * FROM customers WHERE id = ?", [result.lastID]);
  } catch (err: any) {
    console.error('DB Error (addCustomerToDb):', err);
    if (err.message.includes('UNIQUE constraint failed: customers.phoneNumber') || err.message.includes('شماره تماس قبلا ثبت شده است')) {
      throw new Error('شماره تماس ارائه شده تکراری است.');
    }
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const getAllCustomersWithBalanceFromDb = async (): Promise<any[]> => {
  await getDbInstance();
  try {
    return await allAsync(`
      SELECT
        c.id, c.fullName, c.phoneNumber, c.address, c.notes, c.dateAdded,
        COALESCE((SELECT cl.balance FROM customer_ledger cl WHERE cl.customerId = c.id ORDER BY cl.id DESC LIMIT 1), 0) as currentBalance
      FROM customers c
      ORDER BY c.fullName ASC
    `);
  } catch (err: any) {
    console.error('DB Error (getAllCustomersWithBalanceFromDb):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const getCustomerByIdFromDb = async (customerId: number): Promise<any> => {
  await getDbInstance();
  try {
    const profile = await getAsync(
      `SELECT *, COALESCE((SELECT cl.balance FROM customer_ledger cl WHERE cl.customerId = c.id ORDER BY cl.id DESC LIMIT 1), 0) as currentBalance
       FROM customers c WHERE id = ?`, [customerId]
    );
    if (!profile) throw new Error("مشتری با این شناسه یافت نشد.");
    return profile;
  } catch (err: any) {
    console.error('DB Error (getCustomerByIdFromDb):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const updateCustomerInDb = async (customerId: number, customerData: CustomerPayload): Promise<any> => {
  await getDbInstance();
  const { fullName, phoneNumber, address, notes } = customerData;
  try {
    const existing = await getAsync("SELECT id FROM customers WHERE id = ?", [customerId]);
    if (!existing) throw new Error("مشتری برای بروزرسانی یافت نشد.");

    if (phoneNumber) {
        const existingCustomerWithPhone = await getAsync("SELECT id FROM customers WHERE phoneNumber = ? AND id != ?", [phoneNumber, customerId]);
        if (existingCustomerWithPhone) {
            throw new Error('شماره تماس قبلا برای مشتری دیگری ثبت شده است.');
        }
    }
    await runAsync(
      `UPDATE customers SET fullName = ?, phoneNumber = ?, address = ?, notes = ? WHERE id = ?`,
      [fullName, phoneNumber || null, address || null, notes || null, customerId]
    );
    return await getAsync("SELECT * FROM customers WHERE id = ?", [customerId]);
  } catch (err: any) {
    console.error('DB Error (updateCustomerInDb):', err);
     if (err.message.includes('تکراری') || err.message.toLowerCase().includes('unique constraint')) {
      throw new Error('شماره تماس ارائه شده تکراری است.');
    }
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const deleteCustomerFromDb = async (customerId: number): Promise<boolean> => {
  await getDbInstance();
  try {
    const result = await runAsync(`DELETE FROM customers WHERE id = ?`, [customerId]);
    return result.changes > 0;
  } catch (err: any) {
    console.error('DB Error (deleteCustomerFromDb):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const addCustomerLedgerEntryToDb = async (customerId: number, entryData: LedgerEntryPayload): Promise<any> => {
    await getDbInstance();
    const { description, debit, credit, transactionDate: transactionDateISO } = entryData;
    try {
        const customerExists = await getAsync("SELECT id FROM customers WHERE id = ?", [customerId]);
        if (!customerExists) throw new Error("مشتری برای ثبت تراکنش یافت نشد.");

        await execAsync("BEGIN TRANSACTION;");
        const newEntry = await addCustomerLedgerEntryInternal(customerId, description, debit, credit, transactionDateISO);
        await execAsync("COMMIT;");
        return newEntry;
    } catch (err: any) {
        await execAsync("ROLLBACK;").catch(rbErr => console.error("Rollback failed in addCustomerLedgerEntryToDb:", rbErr));
        console.error('DB Error (addCustomerLedgerEntryToDb):', err);
        throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const getLedgerForCustomerFromDb = async (customerId: number): Promise<any[]> => {
  await getDbInstance();
  try {
    return await allAsync(`SELECT * FROM customer_ledger WHERE customerId = ? ORDER BY id ASC`, [customerId]);
  } catch (err: any) {
    console.error('DB Error (getLedgerForCustomerFromDb):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

// --- Partners ---
export const addPartnerToDb = async (partnerData: PartnerPayload): Promise<any> => {
  await getDbInstance(); // Ensure DB is initialized
  const { partnerName, partnerType, contactPerson, phoneNumber, email, address, notes } = partnerData;
  try {
    if (phoneNumber) {
      const existingPartner = await getAsync("SELECT id FROM partners WHERE phoneNumber = ?", [phoneNumber]);
      if (existingPartner) {
        throw new Error('شماره تماس قبلا برای همکار دیگری ثبت شده است.');
      }
    }
    const result = await runAsync(
      `INSERT INTO partners (partnerName, partnerType, contactPerson, phoneNumber, email, address, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [partnerName, partnerType, contactPerson || null, phoneNumber || null, email || null, address || null, notes || null]
    );
    return await getAsync("SELECT * FROM partners WHERE id = ?", [result.lastID]);
  } catch (err: any) {
    console.error('DB Error (addPartnerToDb):', err);
    if (err.message.includes('UNIQUE constraint failed: partners.phoneNumber') || err.message.includes('شماره تماس قبلا برای همکار دیگری ثبت شده است')) {
      throw new Error('شماره تماس ارائه شده برای همکار تکراری است.');
    }
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const getAllPartnersWithBalanceFromDb = async (): Promise<any[]> => {
  await getDbInstance();
  try {
    return await allAsync(`
      SELECT
        p.id, p.partnerName, p.partnerType, p.contactPerson, p.phoneNumber, p.email, p.address, p.notes, p.dateAdded,
        COALESCE((SELECT pl.balance FROM partner_ledger pl WHERE pl.partnerId = p.id ORDER BY pl.id DESC LIMIT 1), 0) as currentBalance
      FROM partners p
      ORDER BY p.partnerName ASC
    `);
  } catch (err: any) {
    console.error('DB Error (getAllPartnersWithBalanceFromDb):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const getPartnerByIdFromDb = async (partnerId: number): Promise<any> => {
  await getDbInstance();
  try {
    const profile = await getAsync(
      `SELECT *, COALESCE((SELECT pl.balance FROM partner_ledger pl WHERE pl.partnerId = p.id ORDER BY pl.id DESC LIMIT 1), 0) as currentBalance
       FROM partners p WHERE id = ?`, [partnerId]
    );
    if (!profile) throw new Error("همکار با این شناسه یافت نشد.");
    return profile;
  } catch (err: any) {
    console.error('DB Error (getPartnerByIdFromDb):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const updatePartnerInDb = async (partnerId: number, partnerData: PartnerPayload): Promise<any> => {
  await getDbInstance();
  const { partnerName, partnerType, contactPerson, phoneNumber, email, address, notes } = partnerData;
  try {
    const existing = await getAsync("SELECT * FROM partners WHERE id = ?", [partnerId]);
    if (!existing) throw new Error("همکار برای بروزرسانی یافت نشد.");

    // Prepare updated data, using existing values if new ones are not provided (for a PATCH-like behavior if needed)
    const dataToUpdate = {
        partnerName: partnerName !== undefined ? partnerName : existing.partnerName,
        partnerType: partnerType !== undefined ? partnerType : existing.partnerType,
        contactPerson: contactPerson !== undefined ? (contactPerson || null) : existing.contactPerson,
        phoneNumber: phoneNumber !== undefined ? (phoneNumber || null) : existing.phoneNumber,
        email: email !== undefined ? (email || null) : existing.email,
        address: address !== undefined ? (address || null) : existing.address,
        notes: notes !== undefined ? (notes || null) : existing.notes,
    };
    
    if (dataToUpdate.phoneNumber) { // Check for uniqueness only if phone number is being set/changed
      const existingPartnerWithPhone = await getAsync("SELECT id FROM partners WHERE phoneNumber = ? AND id != ?", [dataToUpdate.phoneNumber, partnerId]);
      if (existingPartnerWithPhone) {
        throw new Error('شماره تماس قبلا برای همکار دیگری ثبت شده است.');
      }
    }

    await runAsync(
      `UPDATE partners SET partnerName = ?, partnerType = ?, contactPerson = ?, phoneNumber = ?, email = ?, address = ?, notes = ?
       WHERE id = ?`,
      [
        dataToUpdate.partnerName, dataToUpdate.partnerType, dataToUpdate.contactPerson, dataToUpdate.phoneNumber,
        dataToUpdate.email, dataToUpdate.address, dataToUpdate.notes, partnerId
      ]
    );
    return await getAsync("SELECT * FROM partners WHERE id = ?", [partnerId]);
  } catch (err: any) {
    console.error('DB Error (updatePartnerInDb):', err);
    if (err.message.includes('UNIQUE constraint failed: partners.phoneNumber') || err.message.includes('شماره تماس قبلا برای همکار دیگری ثبت شده است')) {
      throw new Error('شماره تماس ارائه شده برای همکار تکراری است.');
    }
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const deletePartnerFromDb = async (partnerId: number): Promise<boolean> => {
  await getDbInstance();
  try {
    const result = await runAsync(`DELETE FROM partners WHERE id = ?`, [partnerId]);
    if (result.changes === 0) {
      throw new Error("همکار برای حذف یافت نشد یا قبلا حذف شده است.");
    }
    return result.changes > 0;
  } catch (err: any) {
    console.error('DB Error (deletePartnerFromDb):', err);
    // Check for foreign key constraint error if partner is in use and cannot be deleted
    if (err.message.includes('FOREIGN KEY constraint failed')) {
        throw new Error('امکان حذف این همکار وجود ندارد زیرا در سوابق فروش، محصولات یا دفتر حساب استفاده شده است.');
    }
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const addPartnerLedgerEntryToDb = async (partnerId: number, entryData: LedgerEntryPayload): Promise<any> => {
    await getDbInstance();
    const { description, debit, credit, transactionDate: transactionDateISO } = entryData;
    try {
        const partnerExists = await getAsync("SELECT id FROM partners WHERE id = ?", [partnerId]);
        if (!partnerExists) throw new Error("همکار برای ثبت تراکنش یافت نشد.");

        await execAsync("BEGIN TRANSACTION;");
        const newEntry = await addPartnerLedgerEntryInternal(partnerId, description, debit, credit, transactionDateISO);
        await execAsync("COMMIT;");
        return newEntry;
    } catch (err: any) {
        await execAsync("ROLLBACK;").catch(rbErr => console.error("Rollback failed in addPartnerLedgerEntryToDb:", rbErr));
        console.error('DB Error (addPartnerLedgerEntryToDb):', err);
        throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const getLedgerForPartnerFromDb = async (partnerId: number): Promise<any[]> => {
  await getDbInstance();
  try {
    return await allAsync(`SELECT * FROM partner_ledger WHERE partnerId = ? ORDER BY id ASC`, [partnerId]);
  } catch (err: any) {
    console.error('DB Error (getLedgerForPartnerFromDb):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const getPurchasedItemsFromPartnerDb = async (partnerId: number): Promise<any[]> => {
  await getDbInstance();
  try {
    const products = await allAsync(`
      SELECT id, name, purchasePrice, date_added as purchaseDate, stock_quantity as quantityPurchased
      FROM products
      WHERE supplierId = ?
      ORDER BY date_added DESC
    `, [partnerId]);

    const phones = await allAsync(`
      SELECT id, model as name, imei as identifier, purchasePrice, COALESCE(purchaseDate, registerDate) as purchaseDate
      FROM phones
      WHERE supplierId = ?
      ORDER BY COALESCE(purchaseDate, registerDate) DESC
    `, [partnerId]);

    return [
      ...products.map(p => ({ ...p, type: 'product' })),
      ...phones.map(ph => ({ ...ph, type: 'phone' }))
    ];
  } catch (err: any) {
    console.error('DB Error (getPurchasedItemsFromPartnerDb):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

// --- Reports ---
export const getSalesSummaryAndProfit = async (fromDateShamsi: string, toDateShamsi: string): Promise<any> => {
  await getDbInstance();
  try {
    const sales = await allAsync(`
      SELECT
        st.id, st.transactionDate, st.itemType, st.itemId, st.itemName, st.quantity, st.pricePerItem, st.discount, st.totalPrice,
        CASE
          WHEN st.itemType = 'inventory' THEN COALESCE(p.purchasePrice, 0)
          WHEN st.itemType = 'phone' THEN COALESCE(ph.purchasePrice, 0)
          ELSE 0
        END as costPricePerUnit
      FROM sales_transactions st
      LEFT JOIN products p ON st.itemType = 'inventory' AND st.itemId = p.id
      LEFT JOIN phones ph ON st.itemType = 'phone' AND st.itemId = ph.id
      WHERE st.transactionDate >= ? AND st.transactionDate <= ?
    `, [fromDateShamsi, toDateShamsi]);

    let totalRevenue = 0;
    let grossProfit = 0;
    const totalTransactions = sales.length;
    const dailySalesMap = new Map<string, number>();
    const itemSalesMap = new Map<string, { id: number; itemType: string; itemName: string; totalRevenue: number; quantitySold: number }>();

    sales.forEach(sale => {
      totalRevenue += sale.totalPrice;
      const costOfGoodsSold = sale.costPricePerUnit * sale.quantity;
      grossProfit += (sale.totalPrice - costOfGoodsSold);

      const daySales = dailySalesMap.get(sale.transactionDate) || 0;
      dailySalesMap.set(sale.transactionDate, daySales + sale.totalPrice);

      const itemKey = `${sale.itemType}-${sale.itemId}`;
      const currentItemSales = itemSalesMap.get(itemKey) || { id: sale.itemId, itemType: sale.itemType, itemName: sale.itemName, totalRevenue: 0, quantitySold: 0 };
      currentItemSales.totalRevenue += sale.totalPrice;
      currentItemSales.quantitySold += sale.quantity;
      itemSalesMap.set(itemKey, currentItemSales);
    });

    const averageSaleValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    const dailySales = Array.from(dailySalesMap.entries())
      .map(([date, totalSalesValue]) => ({ date, totalSales: totalSalesValue }))
      .sort((a,b) => moment(a.date, 'jYYYY/jMM/jDD').valueOf() - moment(b.date, 'jYYYY/jMM/jDD').valueOf());

    const topSellingItems = Array.from(itemSalesMap.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    return {
      totalRevenue,
      grossProfit,
      totalTransactions,
      averageSaleValue,
      dailySales,
      topSellingItems
    };
  } catch (err: any) {
    console.error('DB Error (getSalesSummaryAndProfit):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const getDebtorsList = async (): Promise<any[]> => {
  await getDbInstance();
  try {
    return await allAsync(`
      SELECT c.id, c.fullName, c.phoneNumber, cl.balance
      FROM customers c
      JOIN (
          SELECT customerId, balance, ROW_NUMBER() OVER(PARTITION BY customerId ORDER BY id DESC) as rn
          FROM customer_ledger
      ) cl ON c.id = cl.customerId AND cl.rn = 1
      WHERE cl.balance > 0
      ORDER BY cl.balance DESC;
    `);
  } catch (err: any) {
    console.error('DB Error (getDebtorsList):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const getCreditorsList = async (): Promise<any[]> => {
  await getDbInstance();
  try {
    return await allAsync(`
      SELECT p.id, p.partnerName, p.partnerType, pl.balance
      FROM partners p
      JOIN (
          SELECT partnerId, balance, ROW_NUMBER() OVER(PARTITION BY partnerId ORDER BY id DESC) as rn
          FROM partner_ledger
      ) pl ON p.id = pl.partnerId AND pl.rn = 1
      WHERE pl.balance > 0
      ORDER BY pl.balance DESC;
    `);
  } catch (err: any) {
    console.error('DB Error (getCreditorsList):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const getTopCustomersBySales = async (fromDateShamsi: string, toDateShamsi: string): Promise<any[]> => {
  await getDbInstance();
  try {
    return await allAsync(`
      SELECT
        c.id as customerId,
        c.fullName,
        SUM(st.totalPrice) as totalSpent,
        COUNT(st.id) as transactionCount
      FROM sales_transactions st
      JOIN customers c ON st.customerId = c.id
      WHERE st.transactionDate >= ? AND st.transactionDate <= ? AND st.customerId IS NOT NULL
      GROUP BY st.customerId, c.fullName
      ORDER BY totalSpent DESC
      LIMIT 10;
    `, [fromDateShamsi, toDateShamsi]);
  } catch (err: any) {
    console.error('DB Error (getTopCustomersBySales):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const getTopSuppliersByPurchaseValue = async (fromDateISO: string, toDateISO: string): Promise<any[]> => {
  await getDbInstance();
  try {
    return await allAsync(`
      SELECT
        p.id as partnerId,
        p.partnerName,
        SUM(pl.credit) as totalPurchaseValue,
        COUNT(pl.id) as transactionCount
      FROM partner_ledger pl
      JOIN partners p ON pl.partnerId = p.id
      WHERE pl.transactionDate >= ? AND pl.transactionDate <= ?
        AND (pl.description LIKE 'دریافت کالا:%' OR pl.description LIKE 'دریافت گوشی:%')
        AND pl.credit > 0
      GROUP BY pl.partnerId, p.partnerName
      ORDER BY totalPurchaseValue DESC
      LIMIT 10;
    `, [fromDateISO, toDateISO]);
  } catch (err: any) {
    console.error('DB Error (getTopSuppliersByPurchaseValue):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

// --- Settings ---
export const getSetting = async (key: string): Promise<string | null> => {
//  await getDbInstance();
  const row = await getAsync("SELECT value FROM settings WHERE key = ?", [key]);
  return row ? row.value : null;
};

export const getAllSettingsAsObject = async (): Promise<Record<string, string>> => {
  await getDbInstance();
  const rows = await allAsync("SELECT key, value FROM settings");
  const settingsObj: Record<string, string> = {};
  rows.forEach(row => {
    settingsObj[row.key] = row.value;
  });
  return settingsObj;
};

export const updateSetting = async (key: string, value: string): Promise<sqlite3.RunResult> => {
 // await getDbInstance();
  return runAsync("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [key, value]);
};

export const updateMultipleSettings = async (settingsArray: SettingItem[]): Promise<boolean> => {
  await getDbInstance();
  await execAsync("BEGIN TRANSACTION;");
  try {
    for (const setting of settingsArray) {
      await runAsync("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [setting.key, setting.value]);
    }
    await execAsync("COMMIT;");
    return true;
  } catch (err: any) {
    await execAsync("ROLLBACK;").catch(rbErr => console.error("Rollback failed in updateMultipleSettings:", rbErr));
    console.error("Error updating multiple settings:", err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const ensureDefaultBusinessSettings = async (): Promise<void> => {
  //await getDbInstance();
  const defaults: Record<string, string> = {
    store_name: 'فروشگاه کوروش',
    store_address_line1: 'خیابان اصلی، پلاک ۱۲۳',
    store_address_line2: '',
    store_city_state_zip: 'تهران، ایران',
    store_phone: '۰۲۱-۱۲۳۴۵۶۷۸',
    store_email: 'info@kourosh.example.com',
    store_logo_path: ''
  };
  try {
    for (const [key, value] of Object.entries(defaults)) {
      const existing = await getSetting(key);
      if (existing === null) {
        await updateSetting(key, value);
        console.log(`Default setting created: ${key} = ${value}`);
      }
    }
  } catch (err: any) {
    console.error("Error ensuring default business settings:", err);
  }
};

// --- Invoices ---
export const getInvoiceDataById = async (saleId: number): Promise<any> => {
  await getDbInstance();
  try {
    const sale = await getAsync(
      `SELECT * FROM sales_transactions WHERE id = ?`,
      [saleId]
    );
    if (!sale) throw new Error('فروش با شناسه مورد نظر یافت نشد.');

    let customerDetails = null;
    if (sale.customerId) {
      customerDetails = await getAsync(
        `SELECT id, fullName, phoneNumber, address FROM customers WHERE id = ?`,
        [sale.customerId]
      );
    }

    const settings = await getAllSettingsAsObject();
    const businessDetails = {
      name: settings.store_name || 'نام فروشگاه شما',
      addressLine1: settings.store_address_line1 || 'آدرس شما، خط ۱',
      addressLine2: settings.store_address_line2 || '',
      cityStateZip: settings.store_city_state_zip || 'شهر، استان، کدپستی',
      phone: settings.store_phone || 'تلفن شما',
      email: settings.store_email || 'ایمیل شما',
      logoUrl: settings.store_logo_path ? `/uploads/${settings.store_logo_path.replace(/\\/g, '/')}` : undefined
    };
    

    const lineItems = [{
      id: sale.id,
      description: sale.itemName,
      quantity: sale.quantity,
      unitPrice: sale.pricePerItem,
      totalPrice: sale.pricePerItem * sale.quantity, // This is subtotal for the line item, discount is applied later
    }];

    const financialSummary = {
      subtotal: sale.pricePerItem * sale.quantity,
      discountAmount: sale.discount || 0,
      grandTotal: sale.totalPrice,
    };

    return {
      businessDetails,
      customerDetails,
      invoiceMetadata: {
        invoiceNumber: String(sale.id),
        transactionDate: sale.transactionDate, // Shamsi date
      },
      lineItems,
      financialSummary,
      notes: sale.notes
    };
  } catch (err: any) {
    console.error(`DB Error (getInvoiceDataById for saleId ${saleId}):`, err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

// --- Users & Roles ---
export const addRole = async (name: string): Promise<{ id: number; name: string }> => {
 // await getDbInstance();
  try {
    const existingRole = await getAsync("SELECT id, name FROM roles WHERE name = ?", [name]);
    if (existingRole) {
      console.warn(`Role "${name}" already exists with ID: ${existingRole.id}.`);
      return existingRole;
    }
    const result = await runAsync("INSERT INTO roles (name) VALUES (?)", [name]);
    return { id: result.lastID, name };
  } catch (err: any) {
    if (err.message.includes("UNIQUE constraint failed")) {
      console.warn(`Role "${name}" already exists (caught by constraint).`);
      const existingRoleAfterAttempt = await getAsync("SELECT id, name FROM roles WHERE name = ?", [name]);
      if (existingRoleAfterAttempt) return existingRoleAfterAttempt;
      throw err; // Re-throw if still not found, indicates other issue
    }
    console.error("DB Error adding role:", err);
    throw new Error(`خطای پایگاه داده هنگام افزودن نقش: ${err.message}`);
  }
};

export const getAllRoles = async (): Promise<any[]> => {
  await getDbInstance();
  try {
    return await allAsync("SELECT * FROM roles ORDER BY name");
  } catch (err: any) {
    console.error("DB Error getting roles:", err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const addUserToDb = async (username: string, password: string, roleId: number): Promise<{ id: number; username: string; roleId: number }> => {
//  await getDbInstance();
  const saltRounds = 10;
  let passwordHash: string;
  try {
    passwordHash = await bcryptjs.hash(password, saltRounds);
  } catch (hashError: any) {
    console.error("Error hashing password:", hashError);
    throw new Error(`خطای داخلی سرور هنگام رمزنگاری کلمه عبور: ${hashError.message}`);
  }

  try {
    const result = await runAsync(
      "INSERT INTO users (username, passwordHash, roleId) VALUES (?, ?, ?)",
      [username, passwordHash, roleId]
    );
    return { id: result.lastID, username, roleId };
  } catch (err: any) {
    if (err.message.includes("UNIQUE constraint failed")) {
      throw new Error("نام کاربری قبلا استفاده شده است.");
    }
    console.error("Error adding user:", err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const getAllUsersWithRoles = async (): Promise<any[]> => {
  await getDbInstance();
  try {
    return await allAsync(`
      SELECT u.id, u.username, u.roleId, u.dateAdded, r.name as roleName
      FROM users u
      JOIN roles r ON u.roleId = r.id
      ORDER BY u.username
    `);
  } catch (err: any) {
    console.error("DB Error getting users with roles:", err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const seedInitialRolesAndAdmin = async (): Promise<void> => {
 // await getDbInstance();
  try {
    const adminRole = await addRole('Admin');
    await addRole('Salesperson');

    const adminUser = await getAsync("SELECT * FROM users WHERE username = ?", [DEFAULT_ADMIN_USERNAME]);
    if (!adminUser && adminRole && adminRole.id) { // Ensure adminRole.id is valid
      await addUserToDb(DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_PASSWORD, adminRole.id);
      console.log(`Default admin user "${DEFAULT_ADMIN_USERNAME}" created.`);
    } else if(adminUser) {
        console.log(`Default admin user "${DEFAULT_ADMIN_USERNAME}" already exists.`);
    } else if (!adminRole || !adminRole.id) {
        console.error("Admin role could not be created or retrieved, cannot seed admin user.");
    }
  } catch (err: any) {
    console.error("Error seeding roles and admin user:", err);
  }
};

// --- Dashboard DB Functions ---
export const getDashboardKPIs = async (): Promise<any> => {
  await getDbInstance();
  try {
    const currentShamsiMonthStart = moment().locale('fa').startOf('jMonth').format('YYYY/MM/DD');
    const currentShamsiMonthEnd = moment().locale('fa').endOf('jMonth').format('YYYY/MM/DD');
    const todayShamsi = moment().locale('fa').format('YYYY/MM/DD');

    const salesCurrentMonthResult = await getAsync(`
      SELECT SUM(totalPrice) as totalSalesMonth
      FROM sales_transactions
      WHERE transactionDate >= ? AND transactionDate <= ?
    `, [currentShamsiMonthStart, currentShamsiMonthEnd]);
    const totalSalesMonth = salesCurrentMonthResult?.totalSalesMonth || 0;

    const revenueTodayResult = await getAsync(`
      SELECT SUM(totalPrice) as revenueToday
      FROM sales_transactions
      WHERE transactionDate = ?
    `, [todayShamsi]);
    const revenueToday = revenueTodayResult?.revenueToday || 0;
    
    const activeProductsCountResult = await getAsync(`SELECT COUNT(id) as count FROM products WHERE stock_quantity > 0`);
    const activePhonesCountResult = await getAsync(`SELECT COUNT(id) as count FROM phones WHERE status = 'موجود در انبار'`);
    const activeProductsCount = (activeProductsCountResult?.count || 0) + (activePhonesCountResult?.count || 0);

    const totalCustomersCountResult = await getAsync(`SELECT COUNT(id) as count FROM customers`);
    const totalCustomersCount = totalCustomersCountResult?.count || 0;


    return {
      totalSalesMonth,
      revenueToday,
      activeProductsCount,
      totalCustomersCount,
    };
  } catch (err: any) {
    console.error("DB Error (getDashboardKPIs):", err);
    throw new Error(`خطای پایگاه داده در محاسبه KPIها: ${err.message}`);
  }
};

export const getDashboardSalesChartData = async (period: string = 'monthly'): Promise<any[]> => {
  await getDbInstance();
  const salesDataPoints: {name: string; sales: number}[] = [];
  let startDateMoment: moment.Moment, endDateMoment: moment.Moment;
  let pointNameFormat: string, groupByFormat: string;
  let isSameOrBeforeUnit: moment.unitOfTime.StartOf;
  let addUnit: moment.unitOfTime.DurationConstructor;


  const today = moment().locale('fa');

  switch (period) {
    case 'weekly': // Last 7 days, including today
      endDateMoment = today.clone();
      startDateMoment = today.clone().subtract(6, 'days');
      pointNameFormat = 'dddd'; // e.g., شنبه
      groupByFormat = 'YYYY/MM/DD';
      isSameOrBeforeUnit = 'day';
      addUnit = 'days';
      break;
    case 'yearly': // Current Shamsi year, by month
      startDateMoment = today.clone().startOf('jYear');
      endDateMoment = today.clone().endOf('jYear'); 
      pointNameFormat = 'jMMMM'; // e.g., فروردین
      groupByFormat = 'jYYYY/jMM'; // Group by Shamsi year/month
      isSameOrBeforeUnit = 'jMonth'; 
      addUnit = 'months'; 
      break;
    case 'monthly': // Current Shamsi month, by day
    default:
      startDateMoment = today.clone().startOf('jMonth');
      endDateMoment = today.clone().endOf('jMonth'); 
      pointNameFormat = 'jD'; // e.g., ۱, ۲, ۳
      groupByFormat = 'YYYY/MM/DD';
      isSameOrBeforeUnit = 'day';
      addUnit = 'days';
      break;
  }
  
  try {
    // Fetch all sales within the broader range to avoid multiple queries in loop
    const salesInRange = await allAsync(`
      SELECT transactionDate, SUM(totalPrice) as dailyTotal
      FROM sales_transactions
      WHERE transactionDate >= ? AND transactionDate <= ?
      GROUP BY transactionDate
      ORDER BY transactionDate ASC
    `, [startDateMoment.format('YYYY/MM/DD'), endDateMoment.format('YYYY/MM/DD')]);

    const salesMap = new Map<string, number>();
    salesInRange.forEach(s => {
      // For yearly, aggregate by month
      if (period === 'yearly') {
        const monthKey = moment(s.transactionDate, 'YYYY/MM/DD').format(groupByFormat);
        salesMap.set(monthKey, (salesMap.get(monthKey) || 0) + s.dailyTotal);
      } else {
        salesMap.set(s.transactionDate, s.dailyTotal);
      }
    });

    let currentLoopDate = startDateMoment.clone();
    while(currentLoopDate.isSameOrBefore(endDateMoment, isSameOrBeforeUnit)) {
      let dateKeyForMap: string;
      if (period === 'yearly') {
        dateKeyForMap = currentLoopDate.format(groupByFormat);
      } else {
        dateKeyForMap = currentLoopDate.format('YYYY/MM/DD');
      }
      
      salesDataPoints.push({
        name: currentLoopDate.format(pointNameFormat),
        sales: salesMap.get(dateKeyForMap) || 0,
      });
      currentLoopDate.add(1, addUnit); 
    }
    
    return salesDataPoints;

  } catch (err: any) {
     console.error("DB Error (getDashboardSalesChartData):", err);
     throw new Error(`خطای پایگاه داده در تهیه داده‌های نمودار فروش: ${err.message}`);
  }
};


export const getDashboardRecentActivities = async (limit: number = 7): Promise<any[]> => {
  await getDbInstance();
  try {
    const activities: any[] = [];

    const sales = await allAsync(`
      SELECT st.id, st.transactionDate, st.itemName, st.totalPrice, c.fullName as customerName
      FROM sales_transactions st
      LEFT JOIN customers c ON st.customerId = c.id
      ORDER BY st.id DESC LIMIT ?
    `, [Math.floor(limit / 2) +1]); // Fetch a bit more to ensure variety
    sales.forEach(s => activities.push({
      id: `sale-${s.id}`,
      typeDescription: 'فروش جدید',
      details: `${s.itemName} به ${s.customerName || 'مشتری مهمان'} (مبلغ: ${s.totalPrice.toLocaleString('fa-IR')} تومان)`,
      timestamp: moment(s.transactionDate, 'YYYY/MM/DD').toISOString(), // Convert Shamsi to ISO for sorting
      icon: 'fa-solid fa-cart-plus',
      color: 'bg-green-500', // Use background color for consistency
      link: `/invoices/${s.id}`
    }));

    const newProducts = await allAsync(`SELECT id, name, date_added FROM products ORDER BY id DESC LIMIT ?`, [Math.floor(limit / 3) +1]);
    newProducts.forEach(p => activities.push({
      id: `product-${p.id}`,
      typeDescription: 'محصول جدید (انبار)',
      details: `محصول "${p.name}" به انبار اضافه شد.`,
      timestamp: p.date_added, // Already ISO
      icon: 'fa-solid fa-box',
      color: 'bg-blue-500',
      link: `/products` // Or a detail page if exists
    }));

    const newPhones = await allAsync(`SELECT id, model, imei, registerDate FROM phones ORDER BY id DESC LIMIT ?`, [Math.floor(limit / 3) +1]);
    newPhones.forEach(ph => activities.push({
      id: `phone-${ph.id}`,
      typeDescription: 'گوشی موبایل جدید',
      details: `گوشی ${ph.model} (IMEI: ${ph.imei}) به لیست گوشی‌ها اضافه شد.`,
      timestamp: ph.registerDate, // Already ISO
      icon: 'fa-solid fa-mobile-screen-button',
      color: 'bg-purple-500',
      link: `/mobile-phones` // Or a detail page if exists
    }));
    
    // Add new customer registrations
    const newCustomers = await allAsync(`SELECT id, fullName, dateAdded FROM customers ORDER BY id DESC LIMIT ?`, [Math.floor(limit/4)+1]);
    newCustomers.forEach(c => activities.push({
        id: `customer-${c.id}`,
        typeDescription: 'مشتری جدید',
        details: `مشتری "${c.fullName}" ثبت نام کرد.`,
        timestamp: c.dateAdded, // Already ISO
        icon: 'fa-solid fa-user-plus',
        color: 'bg-teal-500',
        link: `/customers/${c.id}`
    }));


    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return activities.slice(0, limit);

  } catch (err: any) {
    console.error("DB Error (getDashboardRecentActivities):", err);
    throw new Error(`خطای پایگاه داده در دریافت فعالیت‌های اخیر: ${err.message}`);
  }
};

// --- Installment Sales ---
export const addInstallmentSaleToDb = async (saleData: InstallmentSalePayload): Promise<any> => {
  await getDbInstance();
  const {
    customerId, phoneId, actualSalePrice, downPayment,
    numberOfInstallments, installmentAmount, installmentsStartDate, // Shamsi YYYY/MM/DD
    checks, notes
  } = saleData;

  await execAsync("BEGIN TRANSACTION;");
  try {
    // 1. Insert into installment_sales
    const saleResult = await runAsync(
      `INSERT INTO installment_sales (customerId, phoneId, actualSalePrice, downPayment, numberOfInstallments, installmentAmount, installmentsStartDate, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [customerId, phoneId, actualSalePrice, downPayment, numberOfInstallments, installmentAmount, installmentsStartDate, notes]
    );
    const saleId = saleResult.lastID;

    // 2. Update phone status and saleDate
    const phoneSaleDateISO = moment(installmentsStartDate, 'jYYYY/jMM/jDD').toISOString();
    await runAsync("UPDATE phones SET status = 'فروخته شده (قسطی)', saleDate = ? WHERE id = ?", [phoneSaleDateISO, phoneId]);
    
    // 3. Create installment_payments records
    for (let i = 0; i < numberOfInstallments; i++) {
      const dueDate = moment(installmentsStartDate, 'jYYYY/jMM/jDD').add(i, 'months').format('YYYY/MM/DD');
      await runAsync(
        `INSERT INTO installment_payments (saleId, installmentNumber, dueDate, amountDue, status)
         VALUES (?, ?, ?, ?, ?)`,
        [saleId, i + 1, dueDate, installmentAmount, 'پرداخت نشده']
      );
    }

    // 4. Store checks
    for (const check of checks) {
      await runAsync(
        `INSERT INTO installment_checks (saleId, checkNumber, bankName, dueDate, amount, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [saleId, check.checkNumber, check.bankName, check.dueDate, check.amount, check.status || 'نزد مشتری']
      );
    }

    // 5. Add to customer ledger
    const phoneDetails = await getAsync("SELECT model, imei FROM phones WHERE id = ?", [phoneId]);
    const ledgerDescription = `فروش اقساطی موبایل: ${phoneDetails?.model || 'گوشی'} (IMEI: ${phoneDetails?.imei || 'N/A'}) - شناسه فروش: ${saleId}`;
    const saleDateForLedgerISO = moment(installmentsStartDate, 'jYYYY/jMM/jDD').toISOString();
    await addCustomerLedgerEntryInternal(customerId, ledgerDescription, actualSalePrice, 0, saleDateForLedgerISO);

    await execAsync("COMMIT;");
    return await getAsync("SELECT * FROM installment_sales WHERE id = ?", [saleId]);

  } catch (error: any) {
    await execAsync("ROLLBACK;");
    console.error("DB Error (addInstallmentSaleToDb):", error);
    throw new Error(`خطای پایگاه داده هنگام ثبت فروش اقساطی: ${error.message}`);
  }
};

export const getAllInstallmentSalesFromDb = async (): Promise<any[]> => {
  await getDbInstance();
  const sales = await allAsync(`
    SELECT 
      isale.*, 
      c.fullName as customerFullName, 
      p.model as phoneModel, p.imei as phoneImei
    FROM installment_sales isale
    JOIN customers c ON isale.customerId = c.id
    JOIN phones p ON isale.phoneId = p.id
    ORDER BY isale.dateCreated DESC
  `);

  const results = [];
  for (const sale of sales) {
    const payments = await allAsync("SELECT * FROM installment_payments WHERE saleId = ? ORDER BY installmentNumber ASC", [sale.id]);
    
    const totalPaidAmount = payments
      .filter(p => p.status === 'پرداخت شده')
      .reduce((sum, p) => sum + p.amountDue, 0);

    const remainingAmount = sale.actualSalePrice - sale.downPayment - totalPaidAmount;
    
    let overallStatus: string = 'در حال پرداخت';
    if (remainingAmount <= 0) {
      overallStatus = 'تکمیل شده';
    } else {
      const overduePayment = payments.find(p => p.status === 'پرداخت نشده' && moment(p.dueDate, 'YYYY/MM/DD').isBefore(moment(), 'day'));
      if (overduePayment) {
        overallStatus = 'معوق';
      }
    }
    
    const nextUnpaidPayment = payments.find(p => p.status === 'پرداخت نشده');
    const nextDueDate = nextUnpaidPayment ? nextUnpaidPayment.dueDate : null;

    results.push({
      ...sale,
      totalInstallmentPrice: (sale.numberOfInstallments * sale.installmentAmount) + sale.downPayment,
      remainingAmount,
      overallStatus,
      nextDueDate,
      // payments are not included in the list view for brevity, but fetched for calculation
    });
  }
  return results;
};

export const getInstallmentSaleByIdFromDb = async (id: number): Promise<any | null> => {
  await getDbInstance();
  const sale = await getAsync(`
    SELECT 
      isale.*, 
      c.fullName as customerFullName, 
      p.model as phoneModel, p.imei as phoneImei
    FROM installment_sales isale
    JOIN customers c ON isale.customerId = c.id
    JOIN phones p ON isale.phoneId = p.id
    WHERE isale.id = ?
  `, [id]);

  if (!sale) return null;

  const payments = await allAsync("SELECT * FROM installment_payments WHERE saleId = ? ORDER BY installmentNumber ASC", [id]);
  const checks = await allAsync("SELECT * FROM installment_checks WHERE saleId = ? ORDER BY dueDate ASC", [id]);

  const totalPaidAmount = payments
    .filter(p => p.status === 'پرداخت شده')
    .reduce((sum, p) => sum + p.amountDue, 0);
  
  const remainingAmount = sale.actualSalePrice - sale.downPayment - totalPaidAmount;

  let overallStatus: string = 'در حال پرداخت';
  if (remainingAmount <= 0 && payments.every(p => p.status === 'پرداخت شده')) {
    overallStatus = 'تکمیل شده';
  } else {
    const overduePayment = payments.find(p => p.status === 'پرداخت نشده' && moment(p.dueDate, 'YYYY/MM/DD').isBefore(moment(), 'day'));
    if (overduePayment) {
      overallStatus = 'معوق';
    }
  }

  const nextUnpaidPayment = payments.find(p => p.status === 'پرداخت نشده');
  const nextDueDate = nextUnpaidPayment ? nextUnpaidPayment.dueDate : null;

  return {
    ...sale,
    payments,
    checks,
    totalInstallmentPrice: (sale.numberOfInstallments * sale.installmentAmount) + sale.downPayment,
    remainingAmount,
    overallStatus,
    nextDueDate,
  };
};

export const updateInstallmentPaymentStatusInDb = async (paymentId: number, isPaid: boolean, paymentDateShamsi?: string): Promise<boolean> => {
  await getDbInstance();
  const status = isPaid ? 'پرداخت شده' : 'پرداخت نشده';
  const dateToSet = isPaid ? (paymentDateShamsi || moment().locale('fa').format('YYYY/MM/DD')) : null;
  
  const result = await runAsync(
    "UPDATE installment_payments SET status = ?, paymentDate = ? WHERE id = ?",
    [status, dateToSet, paymentId]
  );
  return result.changes > 0;
};

export const updateCheckStatusInDb = async (checkId: number, newStatus: CheckStatus): Promise<boolean> => {
  await getDbInstance();
  const result = await runAsync(
    "UPDATE installment_checks SET status = ? WHERE id = ?",
    [newStatus, checkId]
  );
  return result.changes > 0;
};


// Old mobile_phone_details related functions (kept for potential data migration)
export const getAllMobilePhonesFromDb = async (): Promise<any[]> => {
  await getDbInstance();
  try {
    return await allAsync(`
      SELECT
        p.id as productId, p.name as productName, p.purchasePrice, p.sellingPrice, p.stock_quantity, p.date_added,
        c.name as categoryName,
        md.id as mobileDetailId, md.brand, md.model, md.color, md.storage, md.ram, md.imei
      FROM products p
      JOIN mobile_phone_details md ON p.id = md.productId
      LEFT JOIN categories c ON p.categoryId = c.id
      ORDER BY p.date_added DESC
    `);
  } catch (err: any) {
    console.error('DB Error (getAllMobilePhonesFromDb - old):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};


export const addMobilePhoneToDbTransaction = async (mobilePhoneData: OldMobilePhonePayload): Promise<any> => {
    await getDbInstance();
    const { purchasePrice, sellingPrice, brand, model, color, storage, ram, imei } = mobilePhoneData;
    const productName = `${brand} ${model} - ${storage || '?'}GB - ${color || '?'}`;

    try {
        await execAsync("BEGIN TRANSACTION;");
        const mobileCategory = await getOrCreateMobilePhoneCategory();
        if (!mobileCategory || !mobileCategory.id) {
            throw new Error("دسته بندی گوشی موبایل یافت نشد یا ایجاد نشد.");
        }

        const productResult = await runAsync(
            `INSERT INTO products (name, purchasePrice, sellingPrice, stock_quantity, categoryId, saleCount) VALUES (?, ?, ?, ?, ?, 0)`,
            [productName, purchasePrice, sellingPrice, 1, mobileCategory.id]
        );
        const newProductId = productResult.lastID;

        const detailResult = await runAsync(
            `INSERT INTO mobile_phone_details (productId, brand, model, color, storage, ram, imei) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [newProductId, brand, model, color, storage, ram, imei]
        );

        await execAsync("COMMIT;");

        return {
            productId: newProductId,
            productName,
            purchasePrice, sellingPrice, stock_quantity: 1, date_added: new Date().toISOString(),
            categoryName: mobileCategory.name,
            mobileDetailId: detailResult.lastID,
            brand, model, color, storage, ram, imei
        };

    } catch (err: any) {
        await execAsync("ROLLBACK;").catch(rbErr => console.error("Rollback failed in addMobilePhoneToDbTransaction:", rbErr));
        console.error('DB Error (addMobilePhoneToDbTransaction - old):', err);
        if (err.message.includes('UNIQUE constraint failed: mobile_phone_details.imei') || err.message.includes('UNIQUE constraint failed: products.name')) {
             throw new Error('IMEI یا نام محصول تکراری است (ساختار قدیم).');
        }
        throw new Error(`خطای پایگاه داده: ${err.message}`);
    }
};

// Helper to convert Shamsi YYYY/MM/DD to ISO YYYY-MM-DD for DB storage if needed for specific columns
// This is not actively used by ledger functions currently as they expect ISO directly
export const fromShamsiStringToISO = (shamsiDateString?: string | null): string | undefined => {
    if (!shamsiDateString) return undefined;
    try {
        const m = moment(shamsiDateString, 'jYYYY/jMM/jDD');
        return m.isValid() ? m.format('YYYY-MM-DD') : undefined;
    } catch (e) {
        console.warn("Error converting Shamsi to ISO YYYY-MM-DD:", shamsiDateString, e);
        return undefined;
    }
};
