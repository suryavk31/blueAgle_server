const {
    Product, SubCategory, Category,
    ProductHighlight, ProductSpecification, ProductBadge,
    ProductCertification, ProductNutrition, ProductAttributeValue, ProductAttribute
} = require('../models');
const { Op } = require('sequelize');
const { uploadToImageKit } = require('../utils/imageKitHelper');
const { autoCreateProductSeo } = require('../services/seoSyncEngine');

// Helper to safely parse JSON strings or return arrays
const parseJsonField = (val) => {
    if (!val) return [];
    if (typeof val === 'object') return val;
    try { return JSON.parse(val); } catch { return []; }
};

// ─── Include associations helper ─────────────────────────────────────────────
const defaultProductIncludes = [
    { model: SubCategory, include: [Category] },
    { model: ProductHighlight, as: 'highlights' },
    { model: ProductSpecification, as: 'specifications' },
    { model: ProductBadge, as: 'badges' },
    { model: ProductCertification, as: 'certifications' },
    { model: ProductNutrition, as: 'nutrition' },
    { model: ProductAttributeValue, as: 'attributeValues', include: [{ model: ProductAttribute, as: 'attribute' }] },
];

// ─── Helper to sync sub-records ──────────────────────────────────────────────
const syncProductSubRecords = async (productId, body) => {
    // 1. Highlights
    if (body.highlights !== undefined) {
        await ProductHighlight.destroy({ where: { productId } });
        const list = parseJsonField(body.highlights);
        if (Array.isArray(list) && list.length > 0) {
            await ProductHighlight.bulkCreate(list.map((h, idx) => ({
                productId,
                icon: h.icon || 'FaLeaf',
                title: h.title,
                description: h.description,
                sortOrder: h.sortOrder !== undefined ? h.sortOrder : idx,
            })));
        }
    }

    // 2. Specifications
    if (body.specifications !== undefined) {
        await ProductSpecification.destroy({ where: { productId } });
        const list = parseJsonField(body.specifications);
        if (Array.isArray(list) && list.length > 0) {
            await ProductSpecification.bulkCreate(list.map((s, idx) => ({
                productId,
                groupName: s.groupName || 'General Specifications',
                specKey: s.specKey || s.key,
                specValue: s.specValue || s.value,
                sortOrder: s.sortOrder !== undefined ? s.sortOrder : idx,
            })));
        }
    }

    // 3. Badges
    if (body.badges !== undefined) {
        await ProductBadge.destroy({ where: { productId } });
        const list = parseJsonField(body.badges);
        if (Array.isArray(list) && list.length > 0) {
            await ProductBadge.bulkCreate(list.map((b, idx) => ({
                productId,
                badgeText: b.badgeText || b.text,
                color: b.color || '#10b981',
                icon: b.icon,
                sortOrder: b.sortOrder !== undefined ? b.sortOrder : idx,
            })));
        }
    }

    // 4. Certifications
    if (body.certifications !== undefined) {
        await ProductCertification.destroy({ where: { productId } });
        const list = parseJsonField(body.certifications);
        if (Array.isArray(list) && list.length > 0) {
            await ProductCertification.bulkCreate(list.map((c) => ({
                productId,
                title: c.title,
                certificateNumber: c.certificateNumber,
                iconUrl: c.iconUrl,
                validUntil: c.validUntil || null,
            })));
        }
    }

    // 5. Nutrition
    if (body.nutrition !== undefined) {
        await ProductNutrition.destroy({ where: { productId } });
        const list = parseJsonField(body.nutrition);
        if (Array.isArray(list) && list.length > 0) {
            await ProductNutrition.bulkCreate(list.map((n, idx) => ({
                productId,
                nutrient: n.nutrient,
                amount: n.amount,
                dailyValue: n.dailyValue,
                sortOrder: n.sortOrder !== undefined ? n.sortOrder : idx,
            })));
        }
    }
};

const createProduct = async (req, res) => {
    try {
        const body = req.body;
        console.log(`📦 [createProduct] Received request to create product "${body.name}". Files attached: ${req.files ? req.files.length : 0}`);

        if (req.files && req.files.length > 0) {
            console.log(`📷 [createProduct] Processing ${req.files.length} uploaded files...`);
            const uploadPromises = req.files.map(file => uploadToImageKit(file.buffer, file.originalname));
            const results = await Promise.all(uploadPromises);
            images = [...images, ...results.map(r => r.url)];
            console.log(`✅ [createProduct] All files uploaded. Final image URLs:`, images);
        }

        const product = await Product.create({
            name: body.name,
            slug: body.slug || body.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            shortName: body.shortName,
            sku: body.sku,
            barcode: body.barcode,
            brand: body.brand,
            shortDescription: body.shortDescription,
            description: body.description,
            price: body.price,
            mrp: body.mrp || null,
            costPrice: body.costPrice || null,
            offerPercentage: body.offerPercentage || null,
            gstPercentage: body.gstPercentage || 0,
            taxStatus: body.taxStatus || 'Taxable',
            weight: body.weight,
            stock: body.stock || 0,
            lowStockAlert: body.lowStockAlert || 5,
            minOrderQuantity: body.minOrderQuantity || 1,
            maxOrderQuantity: body.maxOrderQuantity || 10,
            trackInventory: body.trackInventory !== 'false' && body.trackInventory !== false,
            stockStatus: body.stockStatus || 'In Stock',
            warehouseLocation: body.warehouseLocation,
            subCategoryId: body.subCategoryId || null,
            images,
            videoUrl: body.videoUrl,
            isFeatured: body.isFeatured === 'true' || body.isFeatured === true,
            isNewArrival: body.isNewArrival === 'true' || body.isNewArrival === true,
            isBestSeller: body.isBestSeller === 'true' || body.isBestSeller === true,
            isRecommended: body.isRecommended === 'true' || body.isRecommended === true,
            isTrending: body.isTrending === 'true' || body.isTrending === true,
            status: body.status || 'Published',
            visibility: body.visibility || 'Public',
            deliveryTime: body.deliveryTime,
            shippingMethod: body.shippingMethod,
            codAvailable: body.codAvailable !== 'false' && body.codAvailable !== false,
            expressDelivery: body.expressDelivery === 'true' || body.expressDelivery === true,
            returnEligible: body.returnEligible !== 'false' && body.returnEligible !== false,
            replacementEligible: body.replacementEligible !== 'false' && body.replacementEligible !== false,
            tags: parseJsonField(body.tags),
            ingredients: parseJsonField(body.ingredients),
            benefits: parseJsonField(body.benefits),
            usageInstructions: parseJsonField(body.usageInstructions),
            metaTitle: body.metaTitle,
            metaDescription: body.metaDescription,
            metaKeywords: body.metaKeywords,
            customAttributes: parseJsonField(body.customAttributes),
        });

        await syncProductSubRecords(product.id, body);

        const fullProduct = await Product.findByPk(product.id, { include: defaultProductIncludes });

        // ── Auto-generate SEO for the new product (fire-and-forget) ──────────
        autoCreateProductSeo(fullProduct, 'system').catch(e => console.warn('[SEO Auto] Product SEO creation failed:', e.message));

        res.status(201).json(fullProduct);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// ─── Get All Products ─────────────────────────────────────────────────────────
const getProducts = async (req, res) => {
    try {
        const { categoryId, subCategoryId, search, minPrice, maxPrice, sortBy, categoryIds, flag } = req.query;
        let where = {};

        let subCategoryInclude = { model: SubCategory, include: [Category] };

        if (subCategoryId) where.subCategoryId = subCategoryId;
        if (flag === 'featured') where.isFeatured = true;
        if (flag === 'best_seller') where.isBestSeller = true;
        if (flag === 'new_arrival') where.isNewArrival = true;

        if (search) {
            where[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { description: { [Op.like]: `%${search}%` } },
                { brand: { [Op.like]: `%${search}%` } },
                { sku: { [Op.like]: `%${search}%` } },
            ];
        }

        if (minPrice || maxPrice) {
            where.price = {};
            if (minPrice) where.price[Op.gte] = parseFloat(minPrice);
            if (maxPrice) where.price[Op.lte] = parseFloat(maxPrice);
        }

        if (categoryIds) {
            const catArray = Array.isArray(categoryIds) ? categoryIds : categoryIds.split(',');
            subCategoryInclude.where = { categoryId: { [Op.in]: catArray } };
            subCategoryInclude.required = true;
        } else if (categoryId) {
            subCategoryInclude.where = { categoryId };
            subCategoryInclude.required = true;
        }

        const include = [
            subCategoryInclude,
            { model: ProductHighlight, as: 'highlights' },
            { model: ProductSpecification, as: 'specifications' },
            { model: ProductBadge, as: 'badges' },
            { model: ProductCertification, as: 'certifications' },
            { model: ProductNutrition, as: 'nutrition' },
            { model: ProductAttributeValue, as: 'attributeValues', include: [{ model: ProductAttribute, as: 'attribute' }] },
        ];

        let order = [['createdAt', 'DESC']];
        if (sortBy === 'price_asc') order = [['price', 'ASC']];
        if (sortBy === 'price_desc') order = [['price', 'DESC']];
        if (sortBy === 'newest') order = [['createdAt', 'DESC']];
        if (sortBy === 'oldest') order = [['createdAt', 'ASC']];

        const products = await Product.findAll({ where, include, order });
        console.log(`📦 [getProducts] Found ${products.length} products (Query params: categoryId=${categoryId || 'ALL'}, search=${search || 'NONE'})`);
        res.json(products);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// ─── Get Product By ID ────────────────────────────────────────────────────────
const getProductById = async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.id, { include: defaultProductIncludes });
        if (!product) return res.status(404).json({ message: 'Product not found' });
        
        // Increment view count asynchronously
        product.increment('viewCount').catch(() => {});

        res.json(product);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── Update Product ───────────────────────────────────────────────────────────
const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findByPk(id);
        if (!product) return res.status(404).json({ message: 'Product not found' });

        const body = req.body;
        console.log(`✏️ [updateProduct] Received request to update product ID ${id}. Files attached: ${req.files ? req.files.length : 0}`);
        let images = parseJsonField(body.existingImages || product.images);

        if (req.files && req.files.length > 0) {
            console.log(`📷 [updateProduct] Processing ${req.files.length} uploaded files...`);
            const uploadPromises = req.files.map(file => uploadToImageKit(file.buffer, file.originalname));
            const results = await Promise.all(uploadPromises);
            images = [...images, ...results.map(r => r.url)];
            console.log(`✅ [updateProduct] All files uploaded. Final image URLs:`, images);
        }

        Object.keys(body).forEach(key => {
            if (['highlights', 'specifications', 'badges', 'certifications', 'nutrition', 'existingImages'].includes(key)) return;
            if (['tags', 'ingredients', 'benefits', 'usageInstructions', 'customAttributes'].includes(key)) {
                product[key] = parseJsonField(body[key]);
            } else if (['isFeatured', 'isNewArrival', 'isBestSeller', 'isRecommended', 'isTrending', 'trackInventory', 'codAvailable', 'expressDelivery', 'returnEligible', 'replacementEligible'].includes(key)) {
                product[key] = body[key] === 'true' || body[key] === true;
            } else if (body[key] !== undefined) {
                product[key] = body[key];
            }
        });
        product.images = images;

        await product.save();
        await syncProductSubRecords(product.id, body);

        const updated = await Product.findByPk(id, { include: defaultProductIncludes });
        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// ─── Delete Product ───────────────────────────────────────────────────────────
const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.id);
        if (!product) return res.status(404).json({ message: 'Product not found' });
        await product.destroy();
        res.json({ message: 'Product deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── Export Products CSV ──────────────────────────────────────────────────────
const exportProductsCSV = async (req, res) => {
    try {
        const products = await Product.findAll({ include: defaultProductIncludes });
        const headers = 'ID,Name,SKU,Brand,Price,MRP,Stock,Status,Category,SubCategory\n';
        const rows = products.map(p => 
            `"${p.id}","${p.name.replace(/"/g, '""')}","${p.sku || ''}","${p.brand || ''}","${p.price}","${p.mrp || ''}","${p.stock}","${p.status}","${p.SubCategory?.Category?.name || ''}","${p.SubCategory?.name || ''}"`
        ).join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="products_export.csv"');
        res.status(200).send(headers + rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createProduct,
    getProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    exportProductsCSV,
};
