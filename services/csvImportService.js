const crypto = require('crypto');
const { Product, Category, SubCategory } = require('../models');
const { autoCreateProductSeo } = require('./seoSyncEngine');

// ─── Security Constants ───────────────────────────────────────────────────────
const CSV_MAGIC_HEADER = 'BLUEAGLE_CSV_TEMPLATE_v1';
const TEMPLATE_TYPES = {
    CATEGORY: 'CATEGORIES',
    PRODUCT: 'PRODUCTS',
};

const getSecuritySecret = () => {
    return process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'blueagle-secure-csv-template-salt-2026';
};

const computeColumnsHash = (columns) => {
    return crypto.createHash('sha256').update(columns.map(c => c.trim().toLowerCase()).join('||')).digest('hex');
};

const generateSecuritySignature = (templateType, columnsHash) => {
    const secret = getSecuritySecret();
    const payload = `${CSV_MAGIC_HEADER}::${templateType}::${columnsHash}`;
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
};

const verifySecuritySignature = (templateType, columnsHash, token) => {
    if (!token || typeof token !== 'string') return false;
    const expected = generateSecuritySignature(templateType, columnsHash);
    if (expected.length !== token.length) return false;
    try {
        return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
    } catch {
        return false;
    }
};

// ─── CSV Column Definitions ───────────────────────────────────────────────────
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

// ─── CSV Utility Helpers ──────────────────────────────────────────────────────
const escapeCsv = (val) => {
    if (val === null || val === undefined) return '';
    let str = typeof val === 'object' ? JSON.stringify(val) : String(val);
    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};

// Robust RFC 4180 CSV parser supporting multiline fields and escaped quotes
const parseCsvString = (text) => {
    const rows = [];
    let row = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    // Normalize newlines
    const len = text.length;
    while (i < len) {
        const char = text[i];
        if (char === '"') {
            if (inQuotes && text[i + 1] === '"') {
                current += '"';
                i += 2;
                continue;
            } else {
                inQuotes = !inQuotes;
                i++;
                continue;
            }
        } else if (char === ',' && !inQuotes) {
            row.push(current.trim());
            current = '';
            i++;
            continue;
        } else if ((char === '\r' || char === '\n') && !inQuotes) {
            if (char === '\r' && text[i + 1] === '\n') {
                i++;
            }
            row.push(current.trim());
            if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
                rows.push(row);
            }
            row = [];
            current = '';
            i++;
            continue;
        } else {
            current += char;
            i++;
        }
    }

    if (current || row.length > 0) {
        row.push(current.trim());
        if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
            rows.push(row);
        }
    }

    return rows;
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

// ─── Verify CSV Security Header ───────────────────────────────────────────────
const extractAndVerifySecurity = (rawContent, expectedType, expectedColumns) => {
    const lines = rawContent.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) {
        throw new Error('Empty CSV file.');
    }

    // First line MUST be the security metadata header
    const firstLine = lines[0];
    const match = firstLine.match(/^#\s*BLUEAGLE_CSV_TEMPLATE_v1\s*\|\s*TYPE:([A-Z]+)\s*\|\s*SIGNATURE:([a-f0-9]+)/i);

    if (!match) {
        throw new Error('Security Verification Failed: This file is not an official CSV template. Please download the sample template from the admin panel.');
    }

    const type = match[1].toUpperCase();
    const signature = match[2];

    if (type !== expectedType) {
        throw new Error(`Invalid Template: Uploaded CSV is for ${type}, but expected ${expectedType}.`);
    }

    const columnsHash = computeColumnsHash(expectedColumns);
    const isValid = verifySecuritySignature(type, columnsHash, signature);
    if (!isValid) {
        throw new Error('Security Verification Failed: Invalid or forged security signature. Only authentic templates downloaded from this system are accepted.');
    }

    return true;
};

// ─── 1. Category CSV Template & Parser ────────────────────────────────────────

const generateCategoryCsvTemplate = () => {
    const columnsHash = computeColumnsHash(CATEGORY_COLUMNS);
    const signature = generateSecuritySignature(TEMPLATE_TYPES.CATEGORY, columnsHash);

    const lines = [
        `# ${CSV_MAGIC_HEADER} | TYPE:${TEMPLATE_TYPES.CATEGORY} | SIGNATURE:${signature}`,
        '# =========================================================================================',
        '# BLUEAGLE STORE - CATEGORIES & SUBCATEGORIES BULK IMPORT INSTRUCTIONS',
        '# -----------------------------------------------------------------------------------------',
        '# 1. MANDATORY: "Category Name" is required for every row.',
        '# 2. OPTIONAL: "SubCategory Name" is optional. If left blank, only the parent category is created.',
        '# 3. MULTIPLE SUBCATEGORIES: To add multiple subcategories, use multiple rows with the same Category Name.',
        '# 4. IMAGES: Images are not included in CSV. You can upload category cover images directly in the Admin Panel.',
        '# 5. SECURITY: Do NOT remove or modify the first line (# BLUEAGLE_CSV_TEMPLATE_v1...) or import will be rejected.',
        '# =========================================================================================',
        CATEGORY_COLUMNS.map(escapeCsv).join(','),
        ['Cold Pressed Oils', 'Groundnut Oil'].map(escapeCsv).join(','),
        ['Cold Pressed Oils', 'Sesame Oil'].map(escapeCsv).join(','),
        ['Cold Pressed Oils', 'Coconut Oil'].map(escapeCsv).join(','),
        ['Organic Spices', 'Turmeric Powder'].map(escapeCsv).join(','),
        ['Organic Spices', 'Black Pepper'].map(escapeCsv).join(','),
        ['Natural Sweeteners', 'Palm Jaggery'].map(escapeCsv).join(','),
        ['Healthy Snacks', ''].map(escapeCsv).join(','),
    ];

    return lines.join('\n');
};

const parseCategoryCsv = async (csvInput) => {
    const rawContent = Buffer.isBuffer(csvInput) ? csvInput.toString('utf8') : String(csvInput);

    // 1. Verify Security
    extractAndVerifySecurity(rawContent, TEMPLATE_TYPES.CATEGORY, CATEGORY_COLUMNS);

    // 2. Strip comment lines
    const dataLinesOnly = rawContent
        .split(/\r?\n/)
        .filter(line => !line.trim().startsWith('#'))
        .join('\n');

    // 3. Parse CSV rows
    const rows = parseCsvString(dataLinesOnly);
    if (rows.length < 1) {
        throw new Error('CSV file has no header row or data.');
    }

    const headerRow = rows[0];
    if (headerRow[0]?.toLowerCase() !== 'category name') {
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

    const categoryCache = new Map();
    const existingCategories = await Category.findAll({ include: [{ model: SubCategory }] });
    for (const cat of existingCategories) {
        categoryCache.set(cat.name.toLowerCase().trim(), cat);
    }

    for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        const catName = row[0]?.trim();
        const subCatName = row[1]?.trim();

        if (!catName && !subCatName) continue;

        results.totalRows++;

        if (!catName) {
            results.errors.push(`Row ${r + 1}: Missing Category Name.`);
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
            results.errors.push(`Row ${r + 1} (${catName}): ${err.message}`);
        }
    }

    return results;
};

// ─── 2. Product CSV Template & Parser ─────────────────────────────────────────

const generateProductCsvTemplate = async () => {
    const columnsHash = computeColumnsHash(PRODUCT_COLUMNS);
    const signature = generateSecuritySignature(TEMPLATE_TYPES.PRODUCT, columnsHash);

    // Fetch existing categories to display as helpful comments
    let catReferenceComments = [];
    try {
        const cats = await Category.findAll({ include: [{ model: SubCategory }], order: [['name', 'ASC']] });
        if (cats.length > 0) {
            catReferenceComments.push('# LIVE CATEGORIES REFERENCE IN YOUR STORE:');
            cats.forEach(c => {
                const subs = (c.SubCategories || []).map(s => s.name).join(', ');
                catReferenceComments.push(`#   - ${c.name} (Subcategories: ${subs || 'None'})`);
            });
        }
    } catch (_) {}

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
        'cold pressed, groundnut oil, peanut oil',
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

    const lines = [
        `# ${CSV_MAGIC_HEADER} | TYPE:${TEMPLATE_TYPES.PRODUCT} | SIGNATURE:${signature}`,
        '# =========================================================================================',
        '# BLUEAGLE STORE - PRODUCTS BULK IMPORT INSTRUCTIONS',
        '# -----------------------------------------------------------------------------------------',
        '# 1. MANDATORY FIELDS: "Product Name", "Category", "Price".',
        '# 2. ENUM VALUES:',
        '#    - Tax Status: Taxable | Exempt | Zero-Rated (Default: Taxable)',
        '#    - Status: Published | Draft | Archived (Default: Published)',
        '#    - Visibility: Public | Hidden (Default: Public)',
        '#    - Stock Status: In Stock | Out of Stock | Pre-Order | Backorder (Default: In Stock)',
        '# 3. BOOLEAN FIELDS: Enter TRUE or FALSE (or Yes/No) for Track Inventory, Is Featured, COD Available, etc.',
        '# 4. MULTI-VALUE FIELDS: Enclose multiple items in quotes separated by commas e.g. "tag1, tag2".',
        '# 5. IMAGES: Do not enter images in CSV; upload images directly in Admin Panel.',
        '# 6. SECURITY: Do NOT remove or modify the first line (# BLUEAGLE_CSV_TEMPLATE_v1...) or import will fail.',
        '# =========================================================================================',
        ...catReferenceComments,
        PRODUCT_COLUMNS.map(escapeCsv).join(','),
        sampleProduct1.map(escapeCsv).join(','),
        sampleProduct2.map(escapeCsv).join(','),
    ];

    return lines.join('\n');
};

const parseProductCsv = async (csvInput) => {
    const rawContent = Buffer.isBuffer(csvInput) ? csvInput.toString('utf8') : String(csvInput);

    // 1. Verify Security
    extractAndVerifySecurity(rawContent, TEMPLATE_TYPES.PRODUCT, PRODUCT_COLUMNS);

    // 2. Strip comment lines
    const dataLinesOnly = rawContent
        .split(/\r?\n/)
        .filter(line => !line.trim().startsWith('#'))
        .join('\n');

    // 3. Parse CSV rows
    const rows = parseCsvString(dataLinesOnly);
    if (rows.length < 1) {
        throw new Error('CSV file has no header row or data.');
    }

    const headerRow = rows[0];
    const colMap = new Map();
    headerRow.forEach((col, idx) => {
        colMap.set(col.toLowerCase().trim(), idx);
    });

    if (!colMap.has('product name') || !colMap.has('category') || !colMap.has('price')) {
        throw new Error('Header mismatch: "Product Name", "Category", and "Price" columns are required.');
    }

    const getVal = (row, colName) => {
        const idx = colMap.get(colName.toLowerCase());
        return idx !== undefined && row[idx] !== undefined ? row[idx].trim() : '';
    };

    // Cache categories
    const categoryCache = new Map();
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

    for (let r = 1; r < rows.length; r++) {
        const row = rows[r];

        const name = getVal(row, 'Product Name');
        const categoryName = getVal(row, 'Category');
        const subCategoryName = getVal(row, 'SubCategory');
        const priceStr = getVal(row, 'Price');

        if (!name && !categoryName && !priceStr) continue;

        results.totalRows++;

        if (!name) {
            results.errors.push(`Row ${r + 1}: "Product Name" is required.`);
            results.skippedCount++;
            continue;
        }

        const price = parseNumber(priceStr);
        if (price === null || price < 0) {
            results.errors.push(`Row ${r + 1} (${name}): Valid positive "Price" is required.`);
            results.skippedCount++;
            continue;
        }

        if (!categoryName) {
            results.errors.push(`Row ${r + 1} (${name}): "Category" is required.`);
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
                images: [],
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

            try {
                if (typeof autoCreateProductSeo === 'function') {
                    await autoCreateProductSeo(product);
                }
            } catch (seoErr) {
                console.warn('[BulkImportCsv] SEO sync notice for product', product.id, seoErr.message);
            }

            results.createdCount++;
        } catch (rowErr) {
            results.errors.push(`Row ${r + 1} (${name}): ${rowErr.message}`);
            results.skippedCount++;
        }
    }

    return results;
};

// ─── 3. Full Data Export Functions ────────────────────────────────────────────

const exportAllCategoriesCsv = async () => {
    const categories = await Category.findAll({
        include: [{ model: SubCategory }],
        order: [['name', 'ASC'], [{ model: SubCategory }, 'name', 'ASC']],
    });

    const headers = [
        'Category ID',
        'Category Name',
        'Category Image',
        'SubCategory ID',
        'SubCategory Name',
        'SubCategory Image',
        'Created At',
        'Updated At'
    ];

    const rows = [headers.map(escapeCsv).join(',')];

    for (const cat of categories) {
        if (cat.SubCategories && cat.SubCategories.length > 0) {
            for (const sub of cat.SubCategories) {
                rows.push([
                    cat.id,
                    cat.name,
                    cat.image || '',
                    sub.id,
                    sub.name,
                    sub.image || '',
                    cat.createdAt ? new Date(cat.createdAt).toISOString() : '',
                    cat.updatedAt ? new Date(cat.updatedAt).toISOString() : ''
                ].map(escapeCsv).join(','));
            }
        } else {
            rows.push([
                cat.id,
                cat.name,
                cat.image || '',
                '',
                '',
                '',
                cat.createdAt ? new Date(cat.createdAt).toISOString() : '',
                cat.updatedAt ? new Date(cat.updatedAt).toISOString() : ''
            ].map(escapeCsv).join(','));
        }
    }

    return rows.join('\n');
};

const exportAllProductsCsv = async () => {
    const products = await Product.findAll({
        include: [
            { model: SubCategory, include: [Category] }
        ],
        order: [['id', 'ASC']]
    });

    const headers = [
        'ID',
        'Product Name',
        'Slug',
        'Short Name',
        'SKU',
        'Barcode',
        'Brand',
        'Category',
        'SubCategory',
        'Price',
        'MRP',
        'Cost Price',
        'Offer Percentage',
        'GST Percentage',
        'Tax Status',
        'Weight',
        'Stock',
        'Low Stock Alert',
        'Min Order Quantity',
        'Max Order Quantity',
        'Track Inventory',
        'Stock Status',
        'Warehouse Location',
        'Images',
        'Video URL',
        'Is Featured',
        'Is New Arrival',
        'Is Best Seller',
        'Is Recommended',
        'Is Trending',
        'Status',
        'Visibility',
        'Rating',
        'Review Count',
        'View Count',
        'Short Description',
        'Full Description',
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
        'Meta Title',
        'Meta Description',
        'Meta Keywords',
        'Created At',
        'Updated At'
    ];

    const rows = [headers.map(escapeCsv).join(',')];

    for (const p of products) {
        const imagesStr = Array.isArray(p.images) ? p.images.join(' ; ') : '';
        const tagsStr = Array.isArray(p.tags) ? p.tags.join(', ') : '';
        const ingredientsStr = Array.isArray(p.ingredients) ? p.ingredients.join(', ') : '';
        const benefitsStr = Array.isArray(p.benefits) ? p.benefits.join(', ') : '';
        const usageStr = Array.isArray(p.usageInstructions) ? p.usageInstructions.join(', ') : '';

        rows.push([
            p.id,
            p.name || '',
            p.slug || '',
            p.shortName || '',
            p.sku || '',
            p.barcode || '',
            p.brand || '',
            p.SubCategory?.Category?.name || '',
            p.SubCategory?.name || '',
            p.price || 0,
            p.mrp !== null && p.mrp !== undefined ? p.mrp : '',
            p.costPrice !== null && p.costPrice !== undefined ? p.costPrice : '',
            p.offerPercentage !== null && p.offerPercentage !== undefined ? p.offerPercentage : '',
            p.gstPercentage || 0,
            p.taxStatus || 'Taxable',
            p.weight || '',
            p.stock || 0,
            p.lowStockAlert || 5,
            p.minOrderQuantity || 1,
            p.maxOrderQuantity || 10,
            p.trackInventory ? 'TRUE' : 'FALSE',
            p.stockStatus || 'In Stock',
            p.warehouseLocation || '',
            imagesStr,
            p.videoUrl || '',
            p.isFeatured ? 'TRUE' : 'FALSE',
            p.isNewArrival ? 'TRUE' : 'FALSE',
            p.isBestSeller ? 'TRUE' : 'FALSE',
            p.isRecommended ? 'TRUE' : 'FALSE',
            p.isTrending ? 'TRUE' : 'FALSE',
            p.status || 'Published',
            p.visibility || 'Public',
            p.rating || 0,
            p.reviewCount || 0,
            p.viewCount || 0,
            p.shortDescription || '',
            p.description || '',
            p.deliveryTime || '',
            p.shippingMethod || '',
            p.codAvailable ? 'TRUE' : 'FALSE',
            p.expressDelivery ? 'TRUE' : 'FALSE',
            p.returnEligible ? 'TRUE' : 'FALSE',
            p.replacementEligible ? 'TRUE' : 'FALSE',
            tagsStr,
            ingredientsStr,
            benefitsStr,
            usageStr,
            p.metaTitle || '',
            p.metaDescription || '',
            p.metaKeywords || '',
            p.createdAt ? new Date(p.createdAt).toISOString() : '',
            p.updatedAt ? new Date(p.updatedAt).toISOString() : ''
        ].map(escapeCsv).join(','));
    }

    return rows.join('\n');
};

module.exports = {
    generateCategoryCsvTemplate,
    parseCategoryCsv,
    generateProductCsvTemplate,
    parseProductCsv,
    exportAllCategoriesCsv,
    exportAllProductsCsv,
};

