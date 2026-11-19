const { Category, SubCategory } = require('../models');
const { uploadToImageKit } = require('../utils/imageKitHelper');
const { autoCreateCategorySeo } = require('../services/seoSyncEngine');

// Categories
const getCategories = async (req, res) => {
    try {
        const categories = await Category.findAll({ include: SubCategory });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createCategory = async (req, res) => {
    try {
        const { name } = req.body;
        console.log(`📁 [createCategory] Category Name: "${name}", File attached:`, req.file ? req.file.originalname : 'NO FILE');
        let image = null;
        if (req.file) {
            const result = await uploadToImageKit(req.file.buffer, req.file.originalname);
            image = result.url;
            console.log(`✅ [createCategory] Category Image Uploaded:`, image);
        }
        const category = await Category.create({ name, image });

        // ── Auto-generate SEO for the new category (fire-and-forget) ──────────
        autoCreateCategorySeo(category, req.user?.email || 'system').catch(e =>
            console.warn('[SEO Auto] Category SEO creation failed:', e.message)
        );

        res.status(201).json(category);
    } catch (error) {
        console.error(`❌ [createCategory] Error:`, error);
        res.status(500).json({ message: error.message });
    }
};

const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        console.log(`📁 [updateCategory] Category ID: ${id}, File attached:`, req.file ? req.file.originalname : 'NO FILE');
        const category = await Category.findByPk(id);
        if (!category) return res.status(404).json({ message: 'Category not found' });

        category.name = name || category.name;
        if (req.file) {
            const result = await uploadToImageKit(req.file.buffer, req.file.originalname);
            category.image = result.url;
            console.log(`✅ [updateCategory] Category Image Uploaded:`, category.image);
        }

        await category.save();
        res.json(category);
    } catch (error) {
        console.error(`❌ [updateCategory] Error:`, error);
        res.status(500).json({ message: error.message });
    }
};

const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await Category.findByPk(id);
        if (!category) return res.status(404).json({ message: 'Category not found' });
        await category.destroy();
        res.json({ message: 'Category deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// SubCategories
const createSubCategory = async (req, res) => {
    try {
        const { name, categoryId } = req.body;
        let image = null;
        if (req.file) {
            const result = await uploadToImageKit(req.file.buffer, req.file.originalname);
            image = result.url;
        }
        const subCategory = await SubCategory.create({ name, categoryId, image });
        res.status(201).json(subCategory);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateSubCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, categoryId } = req.body;
        const subCategory = await SubCategory.findByPk(id);
        if (!subCategory) return res.status(404).json({ message: 'Sub-category not found' });
        subCategory.name = name || subCategory.name;
        if (categoryId) subCategory.categoryId = categoryId;
        
        if (req.file) {
            const result = await uploadToImageKit(req.file.buffer, req.file.originalname);
            subCategory.image = result.url;
        }

        await subCategory.save();
        res.json(subCategory);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteSubCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const subCategory = await SubCategory.findByPk(id);
        if (!subCategory) return res.status(404).json({ message: 'Sub-category not found' });
        await subCategory.destroy();
        res.json({ message: 'Sub-category deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── Bulk Import & Export CSV ─────────────────────────────────────────────────
const {
    generateCategoryCsvTemplate,
    parseCategoryCsv,
    exportAllCategoriesCsv
} = require('../services/csvImportService');

const downloadCategoryTemplate = async (req, res) => {
    try {
        const csvContent = generateCategoryCsvTemplate();
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="Categories_Import_Template.csv"');
        res.setHeader('Cache-Control', 'no-cache');
        return res.status(200).send(csvContent);
    } catch (error) {
        console.error('[downloadCategoryTemplate] Error:', error);
        return res.status(500).json({ message: 'Failed to generate category CSV template: ' + error.message });
    }
};

const bulkImportCategories = async (req, res) => {
    try {
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({ message: 'Please select a CSV file (.csv) to upload.' });
        }

        const results = await parseCategoryCsv(req.file.buffer);
        return res.status(200).json({
            message: 'Categories bulk import processed successfully',
            data: results
        });
    } catch (error) {
        console.error('[bulkImportCategories] Error:', error);
        return res.status(400).json({ message: error.message || 'Failed to process bulk import.' });
    }
};

const exportCategoriesCSV = async (req, res) => {
    try {
        const csv = await exportAllCategoriesCsv();
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="categories_export.csv"');
        return res.status(200).send(csv);
    } catch (error) {
        console.error('[exportCategoriesCSV] Error:', error);
        return res.status(500).json({ message: 'Failed to export categories: ' + error.message });
    }
};

module.exports = {
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    createSubCategory,
    updateSubCategory,
    deleteSubCategory,
    downloadCategoryTemplate,
    bulkImportCategories,
    exportCategoriesCSV,
};
