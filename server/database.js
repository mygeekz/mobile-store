import sqlite3 from 'sqlite3';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import moment from 'jalali-moment'; 
import bcrypt from 'bcryptjs'; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const DB_PATH = join(__dirname, 'kourosh_inventory.db');
const MOBILE_PHONE_CATEGORY_NAME = "گوشی‌های موبایل";
const DEFAULT_CATEGORIES = ["لوازم جانبی", "قطعات"];
const DEFAULT_SUPPLIER_NAME = "تامین‌کننده نمونه";
const DEFAULT_ADMIN_USERNAME = 'admin';
const DEFAULT_ADMIN_PASSWORD = 'password123'; 

let db;

const runAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error("Database not initialized."));
    db.run(sql, params, function(err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
};

export const getAsync = (sql, params = []) => { 
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error("Database not initialized."));
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
};

const allAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error("Database not initialized."));
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows); // Returns [] if no rows found, which is good.
    });
  });
};

const execAsync = (sql) => {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error("Database not initialized."));
    db.exec(sql, function(err) {
      if (err) return reject(err);
      resolve();
    });
  });
};

const getOrCreateMobilePhoneCategory = async () => {
  let category = await getAsync("SELECT * FROM categories WHERE name = ?", [MOBILE_PHONE_CATEGORY_NAME]);
  if (!category) {
    const result = await runAsync("INSERT INTO categories (name) VALUES (?)", [MOBILE_PHONE_CATEGORY_NAME]);
    category = { id: result.lastID, name: MOBILE_PHONE_CATEGORY_NAME };
    console.log(`Category "${MOBILE_PHONE_CATEGORY_NAME}" created with ID: ${category.id}`);
  }
  return category;
};

const seedDefaultCategories = async () => {
  for (const catName of DEFAULT_CATEGORIES) {
    const existing = await getAsync("SELECT id FROM categories WHERE name = ?", [catName]);
    if (!existing) {
      await runAsync("INSERT INTO categories (name) VALUES (?)", [catName]);
      console.log(`Default category "${catName}" created.`);
    }
  }
};

const seedDefaultSupplier = async () => {
  const existing = await getAsync("SELECT id FROM partners WHERE partnerName = ? AND partnerType = 'Supplier'", [DEFAULT_SUPPLIER_NAME]);
  if (!existing) {
    await runAsync(
      "INSERT INTO partners (partnerName, partnerType, phoneNumber) VALUES (?, 'Supplier', ?)", 
      [DEFAULT_SUPPLIER_NAME, `09000000000${Math.floor(Math.random()*100)}`] // Dummy phone
    );
    console.log(`Default supplier "${DEFAULT_SUPPLIER_NAME}" created.`);
  }
};

const initializeDatabaseInternal = async () => {
  // Drop tables in reverse order of dependency or where dependencies allow
  const tablesToDrop = [
    'sales_transactions', 'customer_ledger', 'partner_ledger', 
    'mobile_phone_details', 'phones', 'products', 
    'users', 'roles', 'settings', 'customers', 'partners', 'categories'
  ];
  for (const tableName of tablesToDrop) {
    try {
      await runAsync(`DROP TABLE IF EXISTS ${tableName};`);
      console.log(`Table ${tableName} dropped if existed.`);
    } catch (err) {
      console.error(`Error dropping table ${tableName}:`, err);
      throw new Error(`Failed to drop table ${tableName}: ${err.message}`);
    }
  }
  console.log("All existing tables dropped for rebuild.");

  try {
    await runAsync("PRAGMA foreign_keys = ON;");
    console.log("Foreign key support enabled.");
  } catch (err) {
    console.error("Error enabling foreign keys:", err); 
    throw new Error(`Failed to enable foreign keys: ${err.message}`);
  }

  // Create Tables (order matters for foreign keys if not using IF NOT EXISTS with deferred checks)
  try {
    await runAsync(`
      CREATE TABLE categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
      );
    `);
    console.log("Categories table created successfully.");

    await runAsync(`
      CREATE TABLE partners (
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
    console.log("Partners table created successfully.");

    await runAsync(`
      CREATE TABLE partner_ledger (
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
    console.log("Partner_ledger table created successfully.");

    await runAsync(`
      CREATE TABLE products (
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
    console.log("Products table created successfully.");
  
    await runAsync(`
      CREATE TABLE mobile_phone_details (
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
    console.log("Mobile_phone_details table (old structure) created successfully.");
  
    await runAsync(`
      CREATE TABLE phones (
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
        purchaseDate TEXT, 
        saleDate TEXT,     
        registerDate TEXT NOT NULL, 
        status TEXT NOT NULL,
        notes TEXT,
        supplierId INTEGER,
        FOREIGN KEY (supplierId) REFERENCES partners(id) ON DELETE SET NULL
      );
    `);
    console.log("Phones table (new standalone) created successfully.");

    await runAsync(`
      CREATE TABLE customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fullName TEXT NOT NULL,
        phoneNumber TEXT UNIQUE,
        address TEXT,
        notes TEXT,
        dateAdded TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'))
      );
    `);
    console.log("Customers table created successfully.");

    await runAsync(`
      CREATE TABLE customer_ledger (
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
    console.log("Customer_ledger table created successfully.");

    await runAsync(`
      CREATE TABLE sales_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transactionDate TEXT NOT NULL, 
        itemType TEXT NOT NULL CHECK(itemType IN ('phone', 'inventory')),
        itemId INTEGER NOT NULL,
        itemName TEXT NOT NULL, 
        quantity INTEGER NOT NULL,
        pricePerItem REAL NOT NULL,
        totalPrice REAL NOT NULL,
        notes TEXT,
        customerId INTEGER,
        discount REAL DEFAULT 0,
        FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE SET NULL
      );
    `);
    console.log("Sales_transactions table created successfully.");
  
    await runAsync(`
      CREATE TABLE settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT
      );
    `);
    console.log("Settings table created successfully.");

    await runAsync(`
      CREATE TABLE roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
      );
    `);
    console.log("Roles table created successfully.");

    await runAsync(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        passwordHash TEXT NOT NULL,
        roleId INTEGER NOT NULL,
        dateAdded TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
        FOREIGN KEY (roleId) REFERENCES roles(id) ON DELETE CASCADE
      );
    `);
    console.log("Users table created successfully.");

  } catch(err) {
    console.error("Error during table creation phase:", err);
    throw new Error(`Failed during table creation: ${err.message}`);
  }
  
  // Seed initial data
  try {
    await getOrCreateMobilePhoneCategory(); // Creates "گوشی‌های موبایل"
    await seedDefaultCategories();        // Creates "لوازم جانبی", "قطعات"
    await seedDefaultSupplier();          // Creates a dummy supplier
    await seedInitialRolesAndAdmin();
    await ensureDefaultBusinessSettings();
    console.log("Initial data seeding completed.");
  } catch (err) {
    console.error("Error seeding initial data:", err);
  }
};

let dbInstance = null;
let dbInitializationPromise = null;

export const getDbInstance = (forceNew = false) => {
  if (dbInstance && !forceNew) return Promise.resolve(dbInstance);
  if (dbInitializationPromise && !forceNew) return dbInitializationPromise;

  dbInitializationPromise = new Promise((resolveConnection, rejectConnection) => {
    if (db && forceNew) { 
        db.close((closeErr) => {
            if (closeErr) {
                console.error('Error closing existing DB for re-initialization:', closeErr);
            }
            db = null; 
            dbInstance = null;
            console.log('Existing DB connection closed (or attempted to close) for re-initialization.');
            createNewConnection(resolveConnection, rejectConnection);
        });
    } else {
        createNewConnection(resolveConnection, rejectConnection);
    }
  });
  return dbInitializationPromise;
};

const createNewConnection = (resolve, reject) => {
    const newDb = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, async (err) => { 
    if (err) {
      console.error('Error opening database connection:', err);
      return reject(new Error(`Failed to open DB: ${err.message}`));
    }
    console.log('Connected to the SQLite database: kourosh_inventory.db');
    db = newDb; 
    try {
      await initializeDatabaseInternal(); 
      dbInstance = newDb;
      resolve(dbInstance);
    } catch (initErr) {
      console.error("Database initialization process failed:", initErr);
      reject(new Error(`DB init failed: ${initErr.message}`));
    }
  });
};

export const closeDbConnection = () => {
    return new Promise((resolve, reject) => {
        if (db) {
            db.close((err) => {
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

const addPartnerLedgerEntryInternal = async (partnerId, description, debit, credit, transactionDateISO) => {
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

export const addCategoryToDb = async (name) => {
  await getDbInstance();
  try {
    const result = await runAsync(`INSERT INTO categories (name) VALUES (?)`, [name]);
    return await getAsync("SELECT * FROM categories WHERE id = ?", [result.lastID]);
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      throw new Error('نام دسته‌بندی تکراری است.');
    }
    console.error('DB Error (addCategoryToDb):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const getAllCategoriesFromDb = async () => {
  await getDbInstance();
  try {
    return await allAsync(`SELECT * FROM categories ORDER BY name ASC`);
  } catch (err) {
    console.error('DB Error (getAllCategoriesFromDb):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const addProductToDb = async (product) => {
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
  } catch (err) {
    await execAsync("ROLLBACK;");
    console.error('DB Error (addProductToDb):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const getAllProductsFromDb = async (supplierIdFilter = null) => {
  await getDbInstance();
  let sql = `
    SELECT p.id, p.name, p.purchasePrice, p.sellingPrice, p.stock_quantity, p.saleCount, p.date_added, 
           p.categoryId, c.name as categoryName,
           p.supplierId, pa.partnerName as supplierName
    FROM products p
    LEFT JOIN categories c ON p.categoryId = c.id
    LEFT JOIN partners pa ON p.supplierId = pa.id
  `;
  const params = [];
  if (supplierIdFilter) {
    sql += " WHERE p.supplierId = ?";
    params.push(supplierIdFilter);
  }
  sql += " ORDER BY p.date_added DESC";
  try {
    return await allAsync(sql, params);
  } catch (err) {
    console.error('DB Error (getAllProductsFromDb):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const addPhoneEntryToDb = async (phoneData) => {
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
  } catch (err) {
    await execAsync("ROLLBACK;").catch(rbErr => console.error("Rollback failed in addPhoneEntryToDb:", rbErr));
    console.error('DB Error (addPhoneEntryToDb):', err);
    if (err.message.includes('UNIQUE constraint failed: phones.imei') || err.message.includes('شماره IMEI تکراری است')) {
      throw new Error('شماره IMEI تکراری است.');
    }
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const getAllPhoneEntriesFromDb = async (supplierIdFilter = null) => {
  await getDbInstance();
  let sql = `
    SELECT ph.*, pa.partnerName as supplierName 
    FROM phones ph
    LEFT JOIN partners pa ON ph.supplierId = pa.id
  `;
  const params = [];
  if (supplierIdFilter) {
    sql += " WHERE ph.supplierId = ?";
    params.push(supplierIdFilter);
  }
  sql += " ORDER BY ph.registerDate DESC";
  try {
    return await allAsync(sql, params);
  } catch (err) {
    console.error('DB Error (getAllPhoneEntriesFromDb):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const getSellableItemsFromDb = async () => {
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
  } catch (err) {
    console.error('DB Error (getSellableItemsFromDb):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const getAllSalesTransactionsFromDb = async (customerIdFilter = null) => {
  await getDbInstance();
  let sql = `
    SELECT st.*, c.fullName as customerFullName 
    FROM sales_transactions st
    LEFT JOIN customers c ON st.customerId = c.id
  `;
  const params = [];
  if (customerIdFilter) {
    sql += " WHERE st.customerId = ?";
    params.push(customerIdFilter);
  }
  sql += " ORDER BY st.id DESC";
  
  try {
    return await allAsync(sql, params);
  } catch (err) {
    console.error('DB Error (getAllSalesTransactionsFromDb):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

const addCustomerLedgerEntryInternal = async (customerId, description, debit, credit, transactionDateISO) => {
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

export const recordSaleTransactionInDb = async (saleData) => {
  await getDbInstance();
  const { itemType, itemId, quantity, transactionDate, customerId, notes, discount = 0 } = saleData;

  try {
    await execAsync("BEGIN TRANSACTION;");
    let itemName;
    let pricePerItem;
    
    if (itemType === 'phone') {
      if (quantity !== 1) throw new Error('تعداد برای فروش گوشی باید ۱ باشد.');
      const phone = await getAsync("SELECT model, imei, salePrice, status FROM phones WHERE id = ?", [itemId]);
      if (!phone) throw new Error('گوشی مورد نظر برای فروش یافت نشد.');
      if (phone.status !== 'موجود در انبار') throw new Error(`گوشی "${phone.model} (IMEI: ${phone.imei})" در وضعیت "${phone.status}" قرار دارد و قابل فروش نیست.`);
      if (phone.salePrice === null || typeof phone.salePrice !== 'number' || phone.salePrice <= 0) throw new Error(`قیمت فروش برای گوشی "${phone.model} (IMEI: ${phone.imei})" مشخص نشده یا نامعتبر است.`);
      
      itemName = `${phone.model} (IMEI: ${phone.imei})`;
      pricePerItem = phone.salePrice;
      await runAsync("UPDATE phones SET status = 'فروخته شده', saleDate = ? WHERE id = ?", [transactionDate, itemId]);
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
      `INSERT INTO sales_transactions (transactionDate, itemType, itemId, itemName, quantity, pricePerItem, discount, totalPrice, customerId, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [transactionDate, itemType, itemId, itemName, quantity, pricePerItem, discount, totalPrice, customerId, notes]
    );
    
    if (customerId && totalPrice > 0) {
      const saleDateISO = moment(transactionDate, 'jYYYY/jMM/jDD').toISOString();
      await addCustomerLedgerEntryInternal(customerId, `خرید کالا: ${itemName}`, totalPrice, 0, saleDateISO);
    }
    
    await execAsync("COMMIT;");
    return await getAsync("SELECT * FROM sales_transactions WHERE id = ?", [saleResult.lastID]);
  } catch (err) {
    await execAsync("ROLLBACK;").catch(rbErr => console.error("Rollback failed in recordSaleTransactionInDb:", rbErr));
    console.error('DB Error (recordSaleTransactionInDb):', err);
    throw err; 
  }
};

export const addCustomerToDb = async (customerData) => {
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
  } catch (err) {
    console.error('DB Error (addCustomerToDb):', err);
    if (err.message.includes('UNIQUE constraint failed: customers.phoneNumber') || err.message.includes('شماره تماس قبلا ثبت شده است')) {
      throw new Error('شماره تماس ارائه شده تکراری است.');
    }
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const getAllCustomersWithBalanceFromDb = async () => {
  await getDbInstance();
  try {
    return await allAsync(`
      SELECT 
        c.id, c.fullName, c.phoneNumber, c.address, c.notes, c.dateAdded,
        COALESCE((SELECT cl.balance FROM customer_ledger cl WHERE cl.customerId = c.id ORDER BY cl.id DESC LIMIT 1), 0) as currentBalance
      FROM customers c
      ORDER BY c.fullName ASC
    `);
  } catch (err) {
    console.error('DB Error (getAllCustomersWithBalanceFromDb):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const getCustomerByIdFromDb = async (customerId) => {
  await getDbInstance();
  try {
    const profile = await getAsync(
      `SELECT *, COALESCE((SELECT cl.balance FROM customer_ledger cl WHERE cl.customerId = c.id ORDER BY cl.id DESC LIMIT 1), 0) as currentBalance 
       FROM customers c WHERE id = ?`, [customerId]
    );
    if (!profile) throw new Error("مشتری با این شناسه یافت نشد.");
    return profile;
  } catch (err) {
    console.error('DB Error (getCustomerByIdFromDb):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const updateCustomerInDb = async (customerId, customerData) => {
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
  } catch (err) {
    console.error('DB Error (updateCustomerInDb):', err);
     if (err.message.includes('UNIQUE constraint failed: customers.phoneNumber') || err.message.includes('شماره تماس قبلا برای مشتری دیگری ثبت شده است')) {
      throw new Error('شماره تماس ارائه شده تکراری است.');
    }
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const deleteCustomerFromDb = async (customerId) => {
  await getDbInstance();
  try {
    const result = await runAsync(`DELETE FROM customers WHERE id = ?`, [customerId]);
    return result.changes > 0; 
  } catch (err) {
    console.error('DB Error (deleteCustomerFromDb):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const addCustomerLedgerEntryToDb = async (customerId, entryData) => {
    await getDbInstance();
    const { description, debit, credit, transactionDate: transactionDateISO } = entryData; 
    try {
        const customerExists = await getAsync("SELECT id FROM customers WHERE id = ?", [customerId]);
        if (!customerExists) throw new Error("مشتری برای ثبت تراکنش یافت نشد.");

        await execAsync("BEGIN TRANSACTION;");
        const newEntry = await addCustomerLedgerEntryInternal(customerId, description, debit, credit, transactionDateISO);
        await execAsync("COMMIT;");
        return newEntry;
    } catch (err) {
        await execAsync("ROLLBACK;").catch(rbErr => console.error("Rollback failed in addCustomerLedgerEntryToDb:", rbErr));
        console.error('DB Error (addCustomerLedgerEntryToDb):', err);
        throw new Error(`خطای پایگاه داده: ${err.message}`);
    }
};

export const getLedgerForCustomerFromDb = async (customerId) => {
  await getDbInstance();
  try {
    return await allAsync(`SELECT * FROM customer_ledger WHERE customerId = ? ORDER BY id ASC`, [customerId]);
  } catch (err) {
    console.error('DB Error (getLedgerForCustomerFromDb):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const addPartnerToDb = async (partnerData) => {
  await getDbInstance();
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
  } catch (err) {
    console.error('DB Error (addPartnerToDb):', err);
    if (err.message.includes('UNIQUE constraint failed: partners.phoneNumber') || err.message.includes('شماره تماس قبلا برای همکار دیگری ثبت شده است')) {
      throw new Error('شماره تماس ارائه شده برای همکار تکراری است.');
    }
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const getAllPartnersWithBalanceFromDb = async () => {
  await getDbInstance();
  try {
    return await allAsync(`
      SELECT 
        p.id, p.partnerName, p.partnerType, p.contactPerson, p.phoneNumber, p.email, p.address, p.notes, p.dateAdded,
        COALESCE((SELECT pl.balance FROM partner_ledger pl WHERE pl.partnerId = p.id ORDER BY pl.id DESC LIMIT 1), 0) as currentBalance
      FROM partners p
      ORDER BY p.partnerName ASC
    `);
  } catch (err) {
    console.error('DB Error (getAllPartnersWithBalanceFromDb):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const getPartnerByIdFromDb = async (partnerId) => {
  await getDbInstance();
  try {
    const profile = await getAsync(
      `SELECT *, COALESCE((SELECT pl.balance FROM partner_ledger pl WHERE pl.partnerId = p.id ORDER BY pl.id DESC LIMIT 1), 0) as currentBalance 
       FROM partners p WHERE id = ?`, [partnerId]
    );
    if (!profile) throw new Error("همکار با این شناسه یافت نشد.");
    return profile;
  } catch (err) {
    console.error('DB Error (getPartnerByIdFromDb):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const updatePartnerInDb = async (partnerId, partnerData) => {
  await getDbInstance();
  const { partnerName, partnerType, contactPerson, phoneNumber, email, address, notes } = partnerData;
  try {
    const existing = await getAsync("SELECT id FROM partners WHERE id = ?", [partnerId]);
    if (!existing) throw new Error("همکار برای بروزرسانی یافت نشد.");

    if (phoneNumber) {
      const existingPartnerWithPhone = await getAsync("SELECT id FROM partners WHERE phoneNumber = ? AND id != ?", [phoneNumber, partnerId]);
      if (existingPartnerWithPhone) {
        throw new Error('شماره تماس قبلا برای همکار دیگری ثبت شده است.');
      }
    }
    await runAsync(
      `UPDATE partners SET partnerName = ?, partnerType = ?, contactPerson = ?, phoneNumber = ?, email = ?, address = ?, notes = ? 
       WHERE id = ?`,
      [partnerName, partnerType, contactPerson || null, phoneNumber || null, email || null, address || null, notes || null, partnerId]
    );
    return await getAsync("SELECT * FROM partners WHERE id = ?", [partnerId]);
  } catch (err) {
    console.error('DB Error (updatePartnerInDb):', err);
    if (err.message.includes('UNIQUE constraint failed: partners.phoneNumber') || err.message.includes('شماره تماس قبلا برای همکار دیگری ثبت شده است')) {
      throw new Error('شماره تماس ارائه شده برای همکار تکراری است.');
    }
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const deletePartnerFromDb = async (partnerId) => {
  await getDbInstance();
  try {
    const result = await runAsync(`DELETE FROM partners WHERE id = ?`, [partnerId]);
    return result.changes > 0; 
  } catch (err) {
    console.error('DB Error (deletePartnerFromDb):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const addPartnerLedgerEntryToDb = async (partnerId, entryData) => {
    await getDbInstance();
    const { description, debit, credit, transactionDate: transactionDateISO } = entryData;
    try {
        const partnerExists = await getAsync("SELECT id FROM partners WHERE id = ?", [partnerId]);
        if (!partnerExists) throw new Error("همکار برای ثبت تراکنش یافت نشد.");

        await execAsync("BEGIN TRANSACTION;");
        const newEntry = await addPartnerLedgerEntryInternal(partnerId, description, debit, credit, transactionDateISO);
        await execAsync("COMMIT;");
        return newEntry;
    } catch (err) {
        await execAsync("ROLLBACK;").catch(rbErr => console.error("Rollback failed in addPartnerLedgerEntryToDb:", rbErr));
        console.error('DB Error (addPartnerLedgerEntryToDb):', err);
        throw new Error(`خطای پایگاه داده: ${err.message}`);
    }
};

export const getLedgerForPartnerFromDb = async (partnerId) => {
  await getDbInstance();
  try {
    return await allAsync(`SELECT * FROM partner_ledger WHERE partnerId = ? ORDER BY id ASC`, [partnerId]);
  } catch (err) {
    console.error('DB Error (getLedgerForPartnerFromDb):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const getPurchasedItemsFromPartnerDb = async (partnerId) => {
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
  } catch (err) {
    console.error('DB Error (getPurchasedItemsFromPartnerDb):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const getSalesSummaryAndProfit = async (fromDateShamsi, toDateShamsi) => {
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
    const dailySalesMap = new Map();
    const itemSalesMap = new Map();

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
      .map(([date, totalSales]) => ({ date, totalSales }))
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
  } catch (err) {
    console.error('DB Error (getSalesSummaryAndProfit):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const getDebtorsList = async () => {
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
  } catch (err) {
    console.error('DB Error (getDebtorsList):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const getCreditorsList = async () => {
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
  } catch (err) {
    console.error('DB Error (getCreditorsList):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const getTopCustomersBySales = async (fromDateShamsi, toDateShamsi) => {
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
  } catch (err) {
    console.error('DB Error (getTopCustomersBySales):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const getTopSuppliersByPurchaseValue = async (fromDateISO, toDateISO) => {
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
  } catch (err) {
    console.error('DB Error (getTopSuppliersByPurchaseValue):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const getSetting = async (key) => {
  await getDbInstance();
  const row = await getAsync("SELECT value FROM settings WHERE key = ?", [key]);
  return row ? row.value : null;
};

export const getAllSettingsAsObject = async () => {
  await getDbInstance();
  const rows = await allAsync("SELECT key, value FROM settings");
  const settingsObj = {};
  rows.forEach(row => {
    settingsObj[row.key] = row.value;
  });
  return settingsObj;
};

export const updateSetting = async (key, value) => {
  await getDbInstance();
  return runAsync("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [key, value]);
};

export const updateMultipleSettings = async (settingsArray) => {
  await getDbInstance();
  await execAsync("BEGIN TRANSACTION;");
  try {
    for (const setting of settingsArray) {
      await runAsync("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [setting.key, setting.value]);
    }
    await execAsync("COMMIT;");
    return true;
  } catch (err) {
    await execAsync("ROLLBACK;").catch(rbErr => console.error("Rollback failed in updateMultipleSettings:", rbErr));
    console.error("Error updating multiple settings:", err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const ensureDefaultBusinessSettings = async () => {
  await getDbInstance();
  const defaults = {
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
  } catch (err) {
    console.error("Error ensuring default business settings:", err);
  }
};

export const getInvoiceDataById = async (saleId) => {
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
      logoUrl: settings.store_logo_path ? `/uploads/${settings.store_logo_path}` : '' 
    };

    const lineItems = [{
      id: sale.id, 
      description: sale.itemName,
      quantity: sale.quantity,
      unitPrice: sale.pricePerItem,
      totalPrice: sale.pricePerItem * sale.quantity, 
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
        transactionDate: sale.transactionDate, 
      },
      lineItems,
      financialSummary,
      notes: sale.notes
    };
  } catch (err) {
    console.error(`DB Error (getInvoiceDataById for saleId ${saleId}):`, err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const addRole = async (name) => {
  await getDbInstance();
  try {
    const result = await runAsync("INSERT INTO roles (name) VALUES (?)", [name]);
    return { id: result.lastID, name };
  } catch (err) {
    if (err.message.includes("UNIQUE constraint failed")) {
      console.warn(`Role "${name}" already exists.`);
      return await getAsync("SELECT * FROM roles WHERE name = ?", [name]);
    }
    console.error("DB Error adding role:", err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const getAllRoles = async () => {
  await getDbInstance();
  try {
    return await allAsync("SELECT * FROM roles ORDER BY name");
  } catch (err) {
    console.error("DB Error getting roles:", err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const addUserToDb = async (username, password, roleId) => {
  await getDbInstance();
  const saltRounds = 10;
  let passwordHash;
  try {
    passwordHash = await bcrypt.hash(password, saltRounds);
  } catch (hashError) {
    console.error("Error hashing password:", hashError);
    throw new Error(`خطای داخلی سرور هنگام رمزنگاری کلمه عبور: ${hashError.message}`);
  }
  
  try {
    const result = await runAsync(
      "INSERT INTO users (username, passwordHash, roleId) VALUES (?, ?, ?)",
      [username, passwordHash, roleId]
    );
    return { id: result.lastID, username, roleId };
  } catch (err) {
    if (err.message.includes("UNIQUE constraint failed")) {
      throw new Error("نام کاربری قبلا استفاده شده است.");
    }
    console.error("Error adding user:", err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const getAllUsersWithRoles = async () => {
  await getDbInstance();
  try {
    return await allAsync(`
      SELECT u.id, u.username, u.roleId, u.dateAdded, r.name as roleName 
      FROM users u
      JOIN roles r ON u.roleId = r.id
      ORDER BY u.username
    `);
  } catch (err) {
    console.error("DB Error getting users with roles:", err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const seedInitialRolesAndAdmin = async () => {
  await getDbInstance();
  try {
    const adminRole = await addRole('Admin');
    await addRole('Salesperson');

    const adminUser = await getAsync("SELECT * FROM users WHERE username = ?", [DEFAULT_ADMIN_USERNAME]);
    if (!adminUser && adminRole) {
      await addUserToDb(DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_PASSWORD, adminRole.id);
      console.log(`Default admin user "${DEFAULT_ADMIN_USERNAME}" created.`);
    }
  } catch (err) {
    console.error("Error seeding roles and admin user:", err);
  }
};

// --- Dashboard DB Functions ---
export const getDashboardKPIs = async () => {
  await getDbInstance();
  try {
    const currentShamsiMonthStart = moment().locale('fa').startOf('jMonth').format('YYYY/MM/DD');
    const currentShamsiMonthEnd = moment().locale('fa').endOf('jMonth').format('YYYY/MM/DD');

    const salesCurrentMonth = await allAsync(`
      SELECT 
        st.totalPrice, st.quantity,
        CASE
          WHEN st.itemType = 'inventory' THEN COALESCE(p.purchasePrice, 0)
          WHEN st.itemType = 'phone' THEN COALESCE(ph.purchasePrice, 0)
          ELSE 0
        END as costPricePerUnit
      FROM sales_transactions st
      LEFT JOIN products p ON st.itemType = 'inventory' AND st.itemId = p.id
      LEFT JOIN phones ph ON st.itemType = 'phone' AND st.itemId = ph.id
      WHERE st.transactionDate >= ? AND st.transactionDate <= ?
    `, [currentShamsiMonthStart, currentShamsiMonthEnd]);

    let totalRevenueCurrentMonth = 0;
    let grossProfitCurrentMonth = 0;
    salesCurrentMonth.forEach(sale => {
      totalRevenueCurrentMonth += sale.totalPrice;
      grossProfitCurrentMonth += (sale.totalPrice - (sale.costPricePerUnit * sale.quantity));
    });
    
    const receivablesResult = await getAsync(`
      SELECT SUM(balance) as totalReceivables
      FROM (
        SELECT cl.balance
        FROM customer_ledger cl
        INNER JOIN (SELECT customerId, MAX(id) as max_id FROM customer_ledger GROUP BY customerId) last_cl
        ON cl.customerId = last_cl.customerId AND cl.id = last_cl.max_id
        WHERE cl.balance > 0
      )
    `);
    const totalReceivables = receivablesResult?.totalReceivables || 0;

    const payablesResult = await getAsync(`
      SELECT SUM(balance) as totalPayables
      FROM (
        SELECT pl.balance
        FROM partner_ledger pl
        INNER JOIN (SELECT partnerId, MAX(id) as max_id FROM partner_ledger GROUP BY partnerId) last_pl
        ON pl.partnerId = last_pl.partnerId AND pl.id = last_pl.max_id
        WHERE pl.balance > 0
      )
    `);
    const totalPayables = payablesResult?.totalPayables || 0;

    return {
      totalRevenueCurrentMonth,
      grossProfitCurrentMonth,
      totalReceivables,
      totalPayables
    };
  } catch (err) {
    console.error("DB Error (getDashboardKPIs):", err);
    throw new Error(`خطای پایگاه داده در محاسبه KPIها: ${err.message}`);
  }
};

export const getDashboardSalesChartData = async (period = 'monthly') => {
  await getDbInstance();
  const salesDataPoints = [];
  let startDate, endDate, groupByFormat, pointNameFormat, momentUnit;

  const today = moment().locale('fa');

  switch (period) {
    case 'weekly': 
      startDate = today.clone().subtract(6, 'days');
      endDate = today;
      groupByFormat = 'YYYY/MM/DD'; 
      pointNameFormat = 'dddd'; 
      momentUnit = 'days';
      break;
    case 'yearly': 
      startDate = today.clone().startOf('jYear');
      endDate = today.clone().endOf('jYear');
      groupByFormat = 'jYYYY/jMM'; 
      pointNameFormat = 'jMMMM'; 
      momentUnit = 'jMonths';
      break;
    case 'monthly': 
    default:
      startDate = today.clone().startOf('jMonth');
      endDate = today.clone().endOf('jMonth');
      groupByFormat = 'YYYY/MM/DD'; 
      pointNameFormat = 'jD'; 
      momentUnit = 'days';
      break;
  }
  
  try {
    const sales = await allAsync(`
      SELECT transactionDate, SUM(totalPrice) as dailySales
      FROM sales_transactions
      WHERE transactionDate >= ? AND transactionDate <= ?
      GROUP BY transactionDate
      ORDER BY transactionDate ASC
    `, [startDate.format('YYYY/MM/DD'), endDate.format('YYYY/MM/DD')]);

    const salesMap = new Map(sales.map(s => [s.transactionDate, s.dailySales]));
    
    let currentLoopDate = startDate.clone();
    while (currentLoopDate.isSameOrBefore(endDate, momentUnit === 'jMonths' ? 'month' : 'day')) {
        const dateKey = currentLoopDate.format(groupByFormat);
        let totalSalesForPoint = 0;

        if (period === 'yearly') { 
            const monthSales = sales.filter(s => moment(s.transactionDate, 'YYYY/MM/DD').format('jYYYY/jMM') === dateKey);
            totalSalesForPoint = monthSales.reduce((sum, s) => sum + s.dailySales, 0);
        } else { 
            totalSalesForPoint = salesMap.get(currentLoopDate.format('YYYY/MM/DD')) || 0;
        }
        
        salesDataPoints.push({
            name: currentLoopDate.format(pointNameFormat),
            sales: totalSalesForPoint,
        });
        
        if (momentUnit === 'jMonths') {
            currentLoopDate.add(1, 'jMonth');
        } else {
            currentLoopDate.add(1, 'day');
        }
    }
    return salesDataPoints;
  } catch (err) {
     console.error("DB Error (getDashboardSalesChartData):", err);
     throw new Error(`خطای پایگاه داده در تهیه داده‌های نمودار فروش: ${err.message}`);
  }
};


export const getDashboardRecentActivities = async (limit = 7) => {
  await getDbInstance();
  try {
    const activities = [];

    const sales = await allAsync(`
      SELECT st.id, st.transactionDate, st.itemName, st.totalPrice, c.fullName as customerName, c.id as customerId
      FROM sales_transactions st
      LEFT JOIN customers c ON st.customerId = c.id
      ORDER BY st.id DESC LIMIT ?
    `, [limit]);
    sales.forEach(s => activities.push({
      id: `sale-${s.id}`,
      typeDescription: 'فروش جدید',
      details: `${s.itemName} به ${s.customerName || 'مشتری مهمان'} به مبلغ ${s.totalPrice.toLocaleString('fa-IR')} تومان`,
      timestamp: moment(s.transactionDate, 'YYYY/MM/DD').toISOString(), 
      icon: 'fa-solid fa-cart-plus',
      color: 'text-green-500',
      link: `/invoices/${s.id}`
    }));

    const customerPayments = await allAsync(`
      SELECT cl.id, cl.transactionDate, cl.credit, cl.description, c.fullName as customerName, c.id as customerId
      FROM customer_ledger cl
      JOIN customers c ON cl.customerId = c.id
      WHERE cl.credit > 0 AND (cl.description LIKE '%پرداخت%' OR cl.description LIKE '%واریز%') 
      ORDER BY cl.id DESC LIMIT ?
    `, [limit]);
     customerPayments.forEach(cp => activities.push({
      id: `custpay-${cp.id}`,
      typeDescription: 'دریافت از مشتری',
      details: `دریافت مبلغ ${cp.credit.toLocaleString('fa-IR')} تومان از ${cp.customerName} (${cp.description})`,
      timestamp: cp.transactionDate, 
      icon: 'fa-solid fa-hand-holding-dollar',
      color: 'text-blue-500',
      link: `/customers/${cp.customerId}` 
    }));

    const partnerPayments = await allAsync(`
      SELECT pl.id, pl.transactionDate, pl.debit, pl.description, p.partnerName, p.id as partnerId
      FROM partner_ledger pl
      JOIN partners p ON pl.partnerId = p.id
      WHERE pl.debit > 0 AND (pl.description LIKE '%پرداخت%' OR pl.description LIKE '%تسویه%')
      ORDER BY pl.id DESC LIMIT ?
    `, [limit]);
    partnerPayments.forEach(pp => activities.push({
      id: `partpay-${pp.id}`,
      typeDescription: 'پرداخت به همکار',
      details: `پرداخت مبلغ ${pp.debit.toLocaleString('fa-IR')} تومان به ${pp.partnerName} (${pp.description})`,
      timestamp: pp.transactionDate, 
      icon: 'fa-solid fa-money-bill-transfer',
      color: 'text-orange-500',
      link: `/partners/${pp.partnerId}` 
    }));

    const newProducts = await allAsync(`SELECT id, name, date_added FROM products ORDER BY id DESC LIMIT ?`, [limit]);
    newProducts.forEach(p => activities.push({
      id: `product-${p.id}`,
      typeDescription: 'محصول جدید',
      details: `محصول "${p.name}" اضافه شد.`,
      timestamp: p.date_added, 
      icon: 'fa-solid fa-box',
      color: 'text-purple-500',
      link: `/products`
    }));
    
    const newPhones = await allAsync(`SELECT id, model, imei, registerDate FROM phones ORDER BY id DESC LIMIT ?`, [limit]);
    newPhones.forEach(ph => activities.push({
      id: `phone-${ph.id}`,
      typeDescription: 'گوشی جدید',
      details: `گوشی ${ph.model} (IMEI: ${ph.imei}) ثبت شد.`,
      timestamp: ph.registerDate, 
      icon: 'fa-solid fa-mobile-screen-button',
      color: 'text-teal-500',
      link: `/mobile-phones`
    }));

    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return activities.slice(0, limit);

  } catch (err) {
    console.error("DB Error (getDashboardRecentActivities):", err);
    throw new Error(`خطای پایگاه داده در دریافت فعالیت‌های اخیر: ${err.message}`);
  }
};
// Old mobile_phone_details related functions are preserved for potential data migration if needed.
export const getAllMobilePhonesFromDb = async () => { 
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
  } catch (err) {
    console.error('DB Error (getAllMobilePhonesFromDb - old):', err);
    throw new Error(`خطای پایگاه داده: ${err.message}`);
  }
};

export const addMobilePhoneToDbTransaction = async (mobilePhoneData) => { 
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

    } catch (err) {
        await execAsync("ROLLBACK;").catch(rbErr => console.error("Rollback failed in addMobilePhoneToDbTransaction:", rbErr));
        console.error('DB Error (addMobilePhoneToDbTransaction - old):', err);
        if (err.message.includes('UNIQUE constraint failed: mobile_phone_details.imei') || err.message.includes('UNIQUE constraint failed: products.name')) {
             throw new Error('IMEI یا نام محصول تکراری است (ساختار قدیم).');
        }
        throw new Error(`خطای پایگاه داده: ${err.message}`);
    }
};
// Helper function to convert Shamsi YYYY/MM/DD to ISO for DB storage
const fromShamsiStringToISO = (shamsiDateString?: string | null): string | undefined => {
    if (!shamsiDateString) return undefined;
    try {
        const m = moment(shamsiDateString, 'jYYYY/jMM/jDD');
        return m.isValid() ? m.toISOString() : undefined;
    } catch (e) {
        console.warn("Error converting Shamsi to ISO:", shamsiDateString, e);
        return undefined;
    }
};
