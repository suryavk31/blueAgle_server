const ExcelJS = require('exceljs');
const crypto = require('crypto');
const { Product, Category, SubCategory } = require('../models');
const { autoCreateProductSeo } = require('./seoSyncEngine');

// ─── Security Constants & Helpers ─────────────────────────────────────────────
const TEMPLATE_TYPES = {
    CATEGORY: 'BLUEAGLE_CATEGORY_IMPORT_V1',
    PRODUCT: 'BLUEAGLE_PRODUCT_IMPORT_V1',
};
const TEMPLATE_VERSION = '1.0';
const SECURITY_SHEET_NAME = '_SECURITY_META';

const getSecuritySecret = () => {
    return process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'blueagle-secure-template-salt-2026';
};

const computeColumnsHash = (columns) => {
    return crypto.createHash('sha256').update(columns.map(c => c.trim().toLowerCase()).join('||')).digest('hex');
};

const generateSecurityToken = (templateType, version, columnsHash) => {
    const secret = getSecuritySecret();
    const payload = `${templateType}::${version}::${columnsHash}`;
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
};

const verifySecurityToken = (templateType, version, columnsHash, token) => {
    if (!token || typeof token !== 'string') return false;
    const expected = generateSecurityToken(templateType, version, columnsHash);
    if (expected.length !== token.length) return false;
    try {
        return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
    } catch {
        return false;
    }
};

// ─── Header Definitions ───────────────────────────────────────────────────────
const CATEGORY_COLUMNS = [
    'Category Name',
    'SubCategory Name',
];

const PRODUCT_COLUMNS = [
    'Product Name',
    'Category',
    'SubCategory',
    'Price',
    'MRP',
    'Cost Price',
    'Offer Percentage',
    'GST Percentage',
    'Tax Status',
    'Stock',
    'Low Stock Alert',
    'Min Order Quantity',
    'Max Order Quantity',
    'Track Inventory',
    'Stock Status',
    'Warehouse Location',
    'Brand',
    'Short Name',
    'SKU',
    'Barcode',
    'Weight',
    'Short Description',
    'Full Description',
    'Status',
    'Visibility',
    'Is Featured',
    'Is New Arrival',
    'Is Best Seller',
    'Is Recommended',
    'Is Trending',
    'Delivery Time',
    'Shipping Method',
    'COD Available',
    'Express Delivery',
    'Return Eligible',
    'Replacement Eligible',
    'Tags',
    'Ingredients',
    'Benefits',
    'Usage Instructions',
    'Video URL',
    'Meta Title',
    'Meta Description',
    'Meta Keywords'
];

// Helper to extract clean cell value as string
const getCellString = (cell) => {
    if (!cell || cell.value === null || cell.value === undefined) return '';
    if (typeof cell.value === 'object') {
        if (cell.value.text) return String(cell.value.text).trim();
        if (cell.value.result) return String(cell.value.result).trim();
        return JSON.stringify(cell.value);
    }
    return String(cell.value).trim();
};

const parseBoolean = (val, defaultVal = false) => {
    if (val === null || val === undefined || val === '') return defaultVal;
    const str = String(val).toLowerCase().trim();
    if (['true', 'yes', '1', 'y'].includes(str)) return true;
    if (['false', 'no', '0', 'n'].includes(str)) return false;
    return defaultVal;
};

const parseNumber = (val, defaultVal = null) => {
    if (val === null || val === undefined || val === '') return defaultVal;
    const num = Number(val);
    return isNaN(num) ? defaultVal : num;
};

const parseCsvArray = (val) => {
    if (!val) return [];
    return String(val)
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);
};

// ─── Style Helpers ────────────────────────────────────────────────────────────
const applyInstructionStyles = (sheet, titleText, instructionsList) => {
    sheet.views = [{ showGridLines: true }];
    sheet.getColumn(1).width = 6;
    sheet.getColumn(2).width = 30;
    sheet.getColumn(3).width = 75;

    // Title banner
    sheet.mergeCells('B2:C2');
    const titleCell = sheet.getCell('B2');
    titleCell.value = titleText;
    titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A4E' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(2).height = 40;

    // Subtitle
    sheet.mergeCells('B3:C3');
    const subCell = sheet.getCell('B3');
    subCell.value = 'Important Guidelines: Read carefully before filling data in the next tab.';
    subCell.font = { name: 'Calibri', size: 11, italic: true, color: { argb: 'FF4F46E5' } };
    subCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(3).height = 24;

    let rowIndex = 5;
    instructionsList.forEach((item) => {
        const row = sheet.getRow(rowIndex);
        row.getCell(2).value = item.label;
        row.getCell(2).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF111827' } };
        row.getCell(2).alignment = { vertical: 'top', horizontal: 'left' };

        row.getCell(3).value = item.desc;
        row.getCell(3).font = { name: 'Calibri', size: 11, color: { argb: 'FF374151' } };
        row.getCell(3).alignment = { vertical: 'top', wrapText: true };
        sheet.getRow(rowIndex).height = item.height || 26;
        rowIndex++;
    });
};

const styleDataHeader = (sheet, columns) => {
    sheet.views = [{ showGridLines: true }];
    const headerRow = sheet.getRow(1);
    headerRow.values = columns;
    headerRow.height = 32;

    columns.forEach((col, idx) => {
        const cell = headerRow.getCell(idx + 1);
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A4E' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = {
            top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
            left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
            bottom: { style: 'medium', color: { argb: 'FF4F46E5' } },
            right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        };
    });

    sheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: columns.length }
    };
};

const addSecurityMetaSheet = (workbook, templateType, columns) => {
    const metaSheet = workbook.addWorksheet(SECURITY_SHEET_NAME);
    metaSheet.state = 'veryHidden';

    const columnsHash = computeColumnsHash(columns);
    const securityToken = generateSecurityToken(templateType, TEMPLATE_VERSION, columnsHash);

    metaSheet.getCell('A1').value = 'TEMPLATE_TYPE';
    metaSheet.getCell('B1').value = templateType;

    metaSheet.getCell('A2').value = 'VERSION';
    metaSheet.getCell('B2').value = TEMPLATE_VERSION;

    metaSheet.getCell('A3').value = 'COLUMNS_HASH';
    metaSheet.getCell('B3').value = columnsHash;

    metaSheet.getCell('A4').value = 'SECURITY_TOKEN';
    metaSheet.getCell('B4').value = securityToken;

    metaSheet.getCell('A5').value = 'GENERATED_AT';
    metaSheet.getCell('B5').value = new Date().toISOString();
};

const verifyWorkbookSecurity = (workbook, expectedTemplateType, expectedColumns) => {
    const metaSheet = workbook.getWorksheet(SECURITY_SHEET_NAME);
    if (!metaSheet) {
        throw new Error('Security Verification Failed: This file is not an official template. Please download the sample template from the admin panel.');
    }

    const templateType = getCellString(metaSheet.getCell('B1'));
    const version = getCellString(metaSheet.getCell('B2'));
    const columnsHash = getCellString(metaSheet.getCell('B3'));
    const securityToken = getCellString(metaSheet.getCell('B4'));

    if (templateType !== expectedTemplateType) {
        throw new Error(`Invalid Template: Uploaded sheet is for ${templateType || 'unknown'}, but expected ${expectedTemplateType}.`);
    }

    const currentExpectedHash = computeColumnsHash(expectedColumns);
    if (columnsHash !== currentExpectedHash) {
        throw new Error('Security Verification Failed: The template columns have been modified or tampered with. Please use the original downloaded template.');
    }

    const isValid = verifySecurityToken(templateType, version, columnsHash, securityToken);
    if (!isValid) {
        throw new Error('Security Verification Failed: Invalid or forged security signature. Only authentic templates downloaded from this system are accepted.');
    }

    return true;
};

// ─── 1. Category Template Generator & Parser ──────────────────────────────────

const generateCategoryTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'BlueAgle Store Management';
    workbook.created = new Date();

    // 1. Instructions Sheet
    const instSheet = workbook.addWorksheet('Instructions');
    applyInstructionStyles(instSheet, 'Categories & Subcategories Bulk Import Instructions', [
        { label: 'Category Name', desc: 'MANDATORY. Name of the main category (e.g. "Cold Pressed Oils"). If it does not exist, it will be created.' },
        { label: 'SubCategory Name', desc: 'OPTIONAL. Name of the subcategory under this category (e.g. "Groundnut Oil"). If left empty, only the parent category is created.' },
        { label: 'Multiple Subcategories', desc: 'To add multiple subcategories under the same category, enter multiple rows with the same Category Name and different SubCategory Names.' },
        { label: 'Images', desc: 'Images are NOT uploaded via Excel. You can upload banner/display images directly in the Admin Categories page.' },
        { label: 'Security Notice', desc: 'This workbook is digitally signed. Do NOT rename columns, delete sheets, or copy-paste into an unauthorized file, or import will be rejected.' },
    ]);

    // 2. Data Sheet
    const dataSheet = workbook.addWorksheet('Categories');
    styleDataHeader(dataSheet, CATEGORY_COLUMNS);
    dataSheet.getColumn(1).width = 35;
    dataSheet.getColumn(2).width = 35;

    // Sample data rows
    const sampleRows = [
        ['Cold Pressed Oils', 'Groundnut Oil'],
        ['Cold Pressed Oils', 'Sesame Oil'],
        ['Cold Pressed Oils', 'Coconut Oil'],
        ['Organic Spices', 'Turmeric Powder'],
        ['Organic Spices', 'Black Pepper'],
        ['Natural Sweeteners', 'Palm Jaggery'],
        ['Healthy Snacks', '']
    ];

    sampleRows.forEach(row => dataSheet.addRow(row));

    // 3. Security Meta Sheet
    addSecurityMetaSheet(workbook, TEMPLATE_TYPES.CATEGORY, CATEGORY_COLUMNS);

    return await workbook.xlsx.writeBuffer();
};

const parseCategoryExcel = async (buffer) => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    // Verify security
    verifyWorkbookSecurity(workbook, TEMPLATE_TYPES.CATEGORY, CATEGORY_COLUMNS);

    const dataSheet = workbook.getWorksheet('Categories') || workbook.worksheets[1];
    if (!dataSheet) {
        throw new Error('Missing "Categories" worksheet in the template.');
    }

    // Verify header row
    const firstRow = dataSheet.getRow(1);
    const col1 = getCellString(firstRow.getCell(1));
    const col2 = getCellString(firstRow.getCell(2));

    if (col1.toLowerCase() !== 'category name') {
        throw new Error('Header mismatch: Column 1 must be "Category Name".');
    }

    const results = {
        totalRows: 0,
        categoriesCreated: 0,
        categoriesExisting: 0,
        subCategoriesCreated: 0,
        subCategoriesExisting: 0,
        errors: [],
    };

    const categoryCache = new Map(); // name -> instance

    // Cache existing categories to avoid redundant queries
    const existingCategories = await Category.findAll({ include: [{ model: SubCategory }] });
    for (const cat of existingCategories) {
        categoryCache.set(cat.name.toLowerCase().trim(), cat);
    }

    const rowCount = dataSheet.rowCount;
    for (let r = 2; r <= rowCount; r++) {
        const row = dataSheet.getRow(r);
        const catName = getCellString(row.getCell(1));
        const subCatName = getCellString(row.getCell(2));

        if (!catName && !subCatName) continue; // skip blank row

        results.totalRows++;

        if (!catName) {
            results.errors.push(`Row ${r}: Missing Category Name.`);
            continue;
        }

        try {
            const catKey = catName.toLowerCase();
            let category = categoryCache.get(catKey);

            if (!category) {
                const [newCat, created] = await Category.findOrCreate({
                    where: { name: catName },
                    defaults: { name: catName }
                });
                category = newCat;
                category.SubCategories = category.SubCategories || [];
                categoryCache.set(catKey, category);
                if (created) results.categoriesCreated++;
                else results.categoriesExisting++;
            } else {
                results.categoriesExisting++;
            }

            // Handle subcategory if provided
            if (subCatName) {
                const subKey = subCatName.toLowerCase();
                const existingSub = (category.SubCategories || []).find(
                    s => s.name && s.name.toLowerCase().trim() === subKey
                );

                if (!existingSub) {
                    const [newSub, subCreated] = await SubCategory.findOrCreate({
                        where: { name: subCatName, categoryId: category.id },
                        defaults: { name: subCatName, categoryId: category.id }
                    });
                    if (subCreated) {
                        category.SubCategories.push(newSub);
                        results.subCategoriesCreated++;
                    } else {
                        results.subCategoriesExisting++;
                    }
                } else {
                    results.subCategoriesExisting++;
                }
            }
        } catch (err) {
            results.errors.push(`Row ${r} (${catName}): ${err.message}`);
        }
    }

    return results;
};

// ─── 2. Product Template Generator & Parser ───────────────────────────────────

const generateProductTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'BlueAgle Store Management';
    workbook.created = new Date();

    // 1. Instructions Sheet
    const instSheet = workbook.addWorksheet('Instructions');
    applyInstructionStyles(instSheet, 'Products Bulk Import Instructions & Format Guide', [
        { label: 'Product Name', desc: 'MANDATORY. Full display title of the product.' },
        { label: 'Category & SubCategory', desc: 'MANDATORY Category. Name of parent category (e.g. "Cold Pressed Oils"). SubCategory is optional. See the "Categories Reference" tab for exact spelling.' },
        { label: 'Pricing Fields', desc: 'Price is MANDATORY (Selling price). MRP and Cost Price are optional numbers. Offer Percentage and GST Percentage (e.g. 5, 12, 18) are numeric.' },
        { label: 'Tax Status', desc: 'Accepts: "Taxable", "Exempt", or "Zero-Rated". Defaults to "Taxable".' },
        { label: 'Stock & Inventory', desc: 'Stock, Low Stock Alert, Min/Max Order Quantity are integers. Track Inventory accepts TRUE or FALSE.' },
        { label: 'Stock Status', desc: 'Accepts: "In Stock", "Out of Stock", "Pre-Order", or "Backorder". Defaults to "In Stock".' },
        { label: 'Status & Visibility', desc: 'Status accepts: "Published", "Draft", "Archived". Visibility accepts: "Public" or "Hidden".' },
        { label: 'True/False Flags', desc: 'Fields like Is Featured, Is New Arrival, COD Available, Return Eligible accept: TRUE or FALSE (or Yes/No).' },
        { label: 'Multi-Item Lists', desc: 'Tags, Ingredients, Benefits, Usage Instructions: Enter multiple items separated by commas (e.g. "Organic, Cold Pressed, Wood Churned").' },
        { label: 'Images', desc: 'Images are NOT imported via Excel. You can upload high-resolution product images in the Admin Panel after import.' },
        { label: 'Security Warning', desc: 'This workbook contains a verified security signature. Do NOT alter header names, add/remove columns, or import from unauthorized spreadsheets.' },
    ]);

    // 2. Data Sheet
    const dataSheet = workbook.addWorksheet('Products');
    styleDataHeader(dataSheet, PRODUCT_COLUMNS);

    // Set practical column widths
    const colWidths = [
        30, 22, 22, 12, 12, 12, 14, 14, 14, // Name, Cat, SubCat, Price, MRP, Cost, Offer, GST, Tax
        10, 14, 16, 16, 15, 14, 20,         // Stock, LowStock, MinQty, MaxQty, Track, StockStatus, Warehouse
        18, 18, 16, 16, 14,                 // Brand, ShortName, SKU, Barcode, Weight
        35, 45, 14, 14,                     // ShortDesc, FullDesc, Status, Visibility
        12, 14, 14, 14, 14,                 // Featured, NewArrival, BestSeller, Recommended, Trending
        18, 18, 14, 16, 14, 18,             // DeliveryTime, ShippingMethod, COD, Express, Return, Replace
        30, 35, 35, 35,                     // Tags, Ingredients, Benefits, Usage
        28, 30, 40, 30                      // VideoURL, MetaTitle, MetaDesc, MetaKeywords
    ];
    colWidths.forEach((w, idx) => {
        dataSheet.getColumn(idx + 1).width = w;
    });

    // Sample data rows
    const sampleProduct1 = [
        'Pure Cold Pressed Groundnut Oil 1L', 'Cold Pressed Oils', 'Groundnut Oil',
        280.00, 320.00, 220.00, 12.5, 5, 'Taxable',
        50, 5, 1, 10, 'TRUE', 'In Stock', 'Warehouse A',
        'BlueAgle', 'Groundnut Oil 1L', 'OIL-GN-1L', '8901234567890', '1 Litre',
        'Traditional wood pressed peanut oil, 100% natural and unrefined.',
        'Extracted from premium quality sun-dried peanuts using traditional wooden ghani. Rich in Vitamin E and antioxidants.',
        'Published', 'Public',
        'TRUE', 'FALSE', 'TRUE', 'TRUE', 'FALSE',
        '2-3 Business Days', 'Standard Courier', 'TRUE', 'FALSE', 'TRUE', 'TRUE',
        'cold pressed, groundnut oil, peanut oil, cooking oil',
        '100% Pure Raw Peanuts',
        'Heart healthy, Rich in antioxidants, High smoke point',
        'Ideal for deep frying, sautéing, and daily cooking',
        'https://youtube.com/watch?v=sample1',
        'Buy Pure Cold Pressed Groundnut Oil 1L Online | BlueAgle',
        'Order 100% pure cold pressed wood churned peanut oil directly from farmers.',
        'groundnut oil, peanut oil, wood pressed oil'
    ];

    const sampleProduct2 = [
        'Organic Wood Pressed Sesame Oil 500ml', 'Cold Pressed Oils', 'Sesame Oil',
        195.00, 230.00, 150.00, 15.0, 5, 'Taxable',
        30, 5, 1, 5, 'TRUE', 'In Stock', 'Warehouse A',
        'BlueAgle', 'Sesame Oil 500ml', 'OIL-SS-500M', '8901234567891', '500 ml',
        'Aromatic wood pressed gingelly / sesame oil made with organic palm jaggery.',
        'Traditional cold extraction method ensures authentic taste and maximum nutritional retention.',
        'Published', 'Public',
        'FALSE', 'TRUE', 'FALSE', 'FALSE', 'TRUE',
        '1-2 Business Days', 'Express Courier', 'TRUE', 'TRUE', 'TRUE', 'TRUE',
        'sesame oil, gingelly oil, organic oil',
        '100% Organic Sesame Seeds, Palm Jaggery',
        'Excellent for oil pulling, Bone health, Skin nourishing',
        'Use for cooking, tempering, or ayurvedic massage',
        '',
        'Organic Wood Pressed Sesame Oil 500ml | BlueAgle',
        'Authentic gingelly oil prepared traditionally. Best price and fast delivery.',
        'sesame oil, gingelly oil, wood pressed'
    ];

    dataSheet.addRow(sampleProduct1);
    dataSheet.addRow(sampleProduct2);

    // 3. Categories Reference Sheet (Dynamic from DB)
    const refSheet = workbook.addWorksheet('Categories Reference');
    styleDataHeader(refSheet, ['Category Name', 'SubCategory Name']);
    refSheet.getColumn(1).width = 30;
    refSheet.getColumn(2).width = 30;

    try {
        const dbCategories = await Category.findAll({
            include: [{ model: SubCategory }],
            order: [['name', 'ASC']]
        });
        if (dbCategories.length > 0) {
            dbCategories.forEach(cat => {
                if (cat.SubCategories && cat.SubCategories.length > 0) {
                    cat.SubCategories.forEach(sub => {
                        refSheet.addRow([cat.name, sub.name]);
                    });
                } else {
                    refSheet.addRow([cat.name, '(No subcategories yet)']);
                }
            });
        } else {
            refSheet.addRow(['No categories found in database yet. Add categories first.', '']);
        }
    } catch (e) {
        refSheet.addRow(['(Unable to load live categories)', '']);
    }

    // 4. Security Meta Sheet
    addSecurityMetaSheet(workbook, TEMPLATE_TYPES.PRODUCT, PRODUCT_COLUMNS);

    return await workbook.xlsx.writeBuffer();
};

const parseProductExcel = async (buffer) => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    // Verify security
    verifyWorkbookSecurity(workbook, TEMPLATE_TYPES.PRODUCT, PRODUCT_COLUMNS);

    const dataSheet = workbook.getWorksheet('Products') || workbook.worksheets[1];
    if (!dataSheet) {
        throw new Error('Missing "Products" worksheet in the template.');
    }

    // Verify header row
    const firstRow = dataSheet.getRow(1);
    const col1 = getCellString(firstRow.getCell(1));
    const col2 = getCellString(firstRow.getCell(2));
    if (col1.toLowerCase() !== 'product name' || col2.toLowerCase() !== 'category') {
        throw new Error('Header mismatch: Column 1 must be "Product Name" and Column 2 must be "Category".');
    }

    // Map column names to 1-based index
    const colMap = new Map();
    for (let c = 1; c <= PRODUCT_COLUMNS.length; c++) {
        const headerName = getCellString(firstRow.getCell(c));
        if (headerName) colMap.set(headerName.toLowerCase(), c);
    }

    const getVal = (row, colName) => {
        const idx = colMap.get(colName.toLowerCase());
        return idx ? getCellString(row.getCell(idx)) : '';
    };

    // Pre-cache categories and subcategories
    const categoryCache = new Map(); // catName.toLowerCase() -> { id, subs: Map(subName.toLowerCase() -> id) }
    const allCategories = await Category.findAll({ include: [{ model: SubCategory }] });
    for (const cat of allCategories) {
        const subsMap = new Map();
        (cat.SubCategories || []).forEach(s => subsMap.set(s.name.toLowerCase().trim(), s.id));
        categoryCache.set(cat.name.toLowerCase().trim(), { id: cat.id, name: cat.name, subs: subsMap });
    }

    const results = {
        totalRows: 0,
        createdCount: 0,
        skippedCount: 0,
        errors: [],
    };

    const rowCount = dataSheet.rowCount;
    for (let r = 2; r <= rowCount; r++) {
        const row = dataSheet.getRow(r);

        const name = getVal(row, 'Product Name');
        const categoryName = getVal(row, 'Category');
        const subCategoryName = getVal(row, 'SubCategory');
        const priceStr = getVal(row, 'Price');

        // Check for blank row
        if (!name && !categoryName && !priceStr) continue;

        results.totalRows++;

        if (!name) {
            results.errors.push(`Row ${r}: "Product Name" is required.`);
            results.skippedCount++;
            continue;
        }

        const price = parseNumber(priceStr);
        if (price === null || price < 0) {
            results.errors.push(`Row ${r} (${name}): Valid positive "Price" is required.`);
            results.skippedCount++;
            continue;
        }

        if (!categoryName) {
            results.errors.push(`Row ${r} (${name}): "Category" is required.`);
            results.skippedCount++;
            continue;
        }

        try {
            // Resolve Category
            const catKey = categoryName.toLowerCase().trim();
            let catEntry = categoryCache.get(catKey);

            if (!catEntry) {
                const [newCat] = await Category.findOrCreate({
                    where: { name: categoryName.trim() },
                    defaults: { name: categoryName.trim() }
                });
                catEntry = { id: newCat.id, name: newCat.name, subs: new Map() };
                categoryCache.set(catKey, catEntry);
            }

            // Resolve SubCategory
            let subCategoryId = null;
            if (subCategoryName) {
                const subKey = subCategoryName.toLowerCase().trim();
                if (catEntry.subs.has(subKey)) {
                    subCategoryId = catEntry.subs.get(subKey);
                } else {
                    const [newSub] = await SubCategory.findOrCreate({
                        where: { name: subCategoryName.trim(), categoryId: catEntry.id },
                        defaults: { name: subCategoryName.trim(), categoryId: catEntry.id }
                    });
                    subCategoryId = newSub.id;
                    catEntry.subs.set(subKey, newSub.id);
                }
            }

            // Build product payload
            const mrp = parseNumber(getVal(row, 'MRP'));
            const costPrice = parseNumber(getVal(row, 'Cost Price'));
            const offerPercentage = parseNumber(getVal(row, 'Offer Percentage'));
            const gstPercentage = parseNumber(getVal(row, 'GST Percentage'), 0);

            const taxStatusVal = getVal(row, 'Tax Status');
            const taxStatus = ['Taxable', 'Exempt', 'Zero-Rated'].includes(taxStatusVal) ? taxStatusVal : 'Taxable';

            const stock = parseNumber(getVal(row, 'Stock'), 0);
            const lowStockAlert = parseNumber(getVal(row, 'Low Stock Alert'), 5);
            const minOrderQuantity = parseNumber(getVal(row, 'Min Order Quantity'), 1);
            const maxOrderQuantity = parseNumber(getVal(row, 'Max Order Quantity'), 10);
            const trackInventory = parseBoolean(getVal(row, 'Track Inventory'), true);

            const stockStatusVal = getVal(row, 'Stock Status');
            const stockStatus = ['In Stock', 'Out of Stock', 'Pre-Order', 'Backorder'].includes(stockStatusVal) ? stockStatusVal : 'In Stock';

            const statusVal = getVal(row, 'Status');
            const status = ['Published', 'Draft', 'Archived'].includes(statusVal) ? statusVal : 'Published';

            const visibilityVal = getVal(row, 'Visibility');
            const visibility = ['Public', 'Hidden'].includes(visibilityVal) ? visibilityVal : 'Public';

            const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

            const product = await Product.create({
                name,
                slug,
                shortName: getVal(row, 'Short Name') || null,
                sku: getVal(row, 'SKU') || null,
                barcode: getVal(row, 'Barcode') || null,
                brand: getVal(row, 'Brand') || null,
                shortDescription: getVal(row, 'Short Description') || null,
                description: getVal(row, 'Full Description') || null,
                price,
                mrp,
                costPrice,
                offerPercentage,
                gstPercentage,
                taxStatus,
                weight: getVal(row, 'Weight') || null,
                stock,
                lowStockAlert,
                minOrderQuantity,
                maxOrderQuantity,
                trackInventory,
                stockStatus,
                warehouseLocation: getVal(row, 'Warehouse Location') || null,
                subCategoryId,
                images: [], // Images are managed via Admin panel
                videoUrl: getVal(row, 'Video URL') || null,
                isFeatured: parseBoolean(getVal(row, 'Is Featured'), false),
                isNewArrival: parseBoolean(getVal(row, 'Is New Arrival'), false),
                isBestSeller: parseBoolean(getVal(row, 'Is Best Seller'), false),
                isRecommended: parseBoolean(getVal(row, 'Is Recommended'), false),
                isTrending: parseBoolean(getVal(row, 'Is Trending'), false),
                status,
                visibility,
                deliveryTime: getVal(row, 'Delivery Time') || null,
                shippingMethod: getVal(row, 'Shipping Method') || null,
                codAvailable: parseBoolean(getVal(row, 'COD Available'), true),
                expressDelivery: parseBoolean(getVal(row, 'Express Delivery'), false),
                returnEligible: parseBoolean(getVal(row, 'Return Eligible'), true),
                replacementEligible: parseBoolean(getVal(row, 'Replacement Eligible'), true),
                tags: parseCsvArray(getVal(row, 'Tags')),
                ingredients: parseCsvArray(getVal(row, 'Ingredients')),
                benefits: parseCsvArray(getVal(row, 'Benefits')),
                usageInstructions: parseCsvArray(getVal(row, 'Usage Instructions')),
                metaTitle: getVal(row, 'Meta Title') || null,
                metaDescription: getVal(row, 'Meta Description') || null,
                metaKeywords: getVal(row, 'Meta Keywords') || null,
            });

            // Trigger SEO sync if applicable
            try {
                if (typeof autoCreateProductSeo === 'function') {
                    await autoCreateProductSeo(product);
                }
            } catch (seoErr) {
                console.warn('[BulkImport] SEO sync notice for product', product.id, seoErr.message);
            }

            results.createdCount++;
        } catch (rowErr) {
            results.errors.push(`Row ${r} (${name}): ${rowErr.message}`);
            results.skippedCount++;
        }
    }

    return results;
};

module.exports = {
    generateCategoryTemplate,
    parseCategoryExcel,
    generateProductTemplate,
    parseProductExcel,
};

