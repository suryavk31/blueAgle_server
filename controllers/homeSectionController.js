const { HomeSection, Product, SubCategory, Category } = require('../models');
const { Op } = require('sequelize');

// Standard product includes for storefront display
const productIncludes = [
    { model: SubCategory, include: [Category] }
];

/**
 * Default fallback sections if none exist in the database yet.
 */
const DEFAULT_INITIAL_SECTIONS = [
    {
        title: 'Fresh Arrivals',
        subtitle: 'Handpicked organic & wood pressed essentials',
        filterType: 'all',
        sortOrder: 1,
        limit: 10,
        colorClass: 'text-gray-900',
        seeAllLink: '/products',
        isActive: true,
    },
    {
        title: 'Your Daily Needs',
        subtitle: 'Pure & natural kitchen staples',
        filterType: 'all',
        sortOrder: 2,
        limit: 10,
        colorClass: 'text-[#3c006b]',
        seeAllLink: '/products',
        isActive: true,
    },
    {
        title: 'Explore New',
        subtitle: 'Recently added premium items',
        filterType: 'new_arrival',
        sortOrder: 3,
        limit: 10,
        colorClass: 'text-gray-900',
        seeAllLink: '/products',
        isActive: true,
    },
];

/**
 * Fetch products for a specific section based on its filterType and parameters.
 */
const fetchProductsForSection = async (section) => {
    const limit = section.limit || 10;
    const baseWhere = { status: 'Published' };

    try {
        if (section.filterType === 'category' && section.categoryId) {
            return await Product.findAll({
                where: baseWhere,
                include: [{
                    model: SubCategory,
                    where: { categoryId: section.categoryId },
                    required: true,
                    include: [Category]
                }],
                order: [['createdAt', 'DESC']],
                limit,
            });
        }

        if (section.filterType === 'custom' && Array.isArray(section.productIds) && section.productIds.length > 0) {
            const products = await Product.findAll({
                where: {
                    ...baseWhere,
                    id: { [Op.in]: section.productIds }
                },
                include: productIncludes,
            });
            // Preserve user-specified selection order
            const productMap = new Map(products.map(p => [p.id, p]));
            return section.productIds
                .map(id => productMap.get(Number(id)))
                .filter(Boolean)
                .slice(0, limit);
        }

        if (section.filterType === 'discount') {
            return await Product.findAll({
                where: {
                    ...baseWhere,
                    offerPercentage: { [Op.gt]: 0 }
                },
                include: productIncludes,
                order: [['offerPercentage', 'DESC']],
                limit,
            });
        }

        if (section.filterType === 'new_arrival') {
            const newArrivals = await Product.findAll({
                where: {
                    ...baseWhere,
                    isNewArrival: true
                },
                include: productIncludes,
                order: [['createdAt', 'DESC']],
                limit,
            });
            if (newArrivals.length > 0) return newArrivals;
            // Fallback to latest products if flag not populated
            return await Product.findAll({
                where: baseWhere,
                include: productIncludes,
                order: [['createdAt', 'DESC']],
                limit,
            });
        }

        if (section.filterType === 'best_seller') {
            const bestSellers = await Product.findAll({
                where: {
                    ...baseWhere,
                    isBestSeller: true
                },
                include: productIncludes,
                order: [['createdAt', 'DESC']],
                limit,
            });
            if (bestSellers.length > 0) return bestSellers;
            return await Product.findAll({
                where: baseWhere,
                include: productIncludes,
                order: [['createdAt', 'DESC']],
                limit,
            });
        }

        if (section.filterType === 'featured') {
            return await Product.findAll({
                where: {
                    ...baseWhere,
                    isFeatured: true
                },
                include: productIncludes,
                order: [['createdAt', 'DESC']],
                limit,
            });
        }

        // Default 'all'
        return await Product.findAll({
            where: baseWhere,
            include: productIncludes,
            order: [['createdAt', 'DESC']],
            limit,
        });
    } catch (err) {
        console.error(`[HomeSection] Error querying products for section "${section.title}":`, err.message);
        return [];
    }
};

/**
 * Public: Get active home sections with their populated products.
 */
const getPublicHomeSections = async (req, res) => {
    try {
        let sections = await HomeSection.findAll({
            where: { isActive: true },
            include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
            order: [['sortOrder', 'ASC'], ['id', 'ASC']],
        });

        // Auto-seed default sections on first run if database is empty
        if (!sections || sections.length === 0) {
            try {
                await HomeSection.bulkCreate(DEFAULT_INITIAL_SECTIONS);
                sections = await HomeSection.findAll({
                    where: { isActive: true },
                    include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
                    order: [['sortOrder', 'ASC'], ['id', 'ASC']],
                });
            } catch (seedErr) {
                console.warn('[HomeSection] Could not auto-seed default sections:', seedErr.message);
            }
        }

        // Fetch products for each active section in parallel
        const sectionsWithProducts = await Promise.all(
            sections.map(async (sec) => {
                const plainSec = sec.toJSON ? sec.toJSON() : sec;
                const products = await fetchProductsForSection(plainSec);

                // Compute smart seeAllLink fallback
                let seeAllLink = plainSec.seeAllLink;
                if (!seeAllLink) {
                    if (plainSec.filterType === 'category' && plainSec.categoryId) {
                        seeAllLink = `/products?category=${plainSec.categoryId}`;
                    } else {
                        seeAllLink = '/products';
                    }
                }

                return {
                    ...plainSec,
                    seeAllLink,
                    products,
                };
            })
        );

        // Filter out empty sections so the storefront stays clean
        const validSections = sectionsWithProducts.filter(s => s.products && s.products.length > 0);

        res.json(validSections);
    } catch (error) {
        console.error('[HomeSection] getPublicHomeSections error:', error);
        res.status(500).json({ message: 'Error retrieving home sections', error: error.message });
    }
};

/**
 * Admin: Get all sections (including inactive ones) with category info.
 */
const getAllSectionsAdmin = async (req, res) => {
    try {
        const sections = await HomeSection.findAll({
            include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
            order: [['sortOrder', 'ASC'], ['id', 'ASC']],
        });
        res.json(sections);
    } catch (error) {
        console.error('[HomeSection] getAllSectionsAdmin error:', error);
        res.status(500).json({ message: 'Error fetching admin home sections', error: error.message });
    }
};

/**
 * Admin: Create a new home section.
 */
const createSection = async (req, res) => {
    try {
        const {
            title, subtitle, filterType, categoryId, productIds,
            limit, sortOrder, colorClass, seeAllLink, isActive
        } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ message: 'Section title is required.' });
        }

        let order = sortOrder;
        if (order === undefined || order === null) {
            const maxOrder = await HomeSection.max('sortOrder');
            order = (maxOrder || 0) + 1;
        }

        const newSection = await HomeSection.create({
            title: title.trim(),
            subtitle: subtitle ? subtitle.trim() : null,
            filterType: filterType || 'all',
            categoryId: categoryId ? Number(categoryId) : null,
            productIds: Array.isArray(productIds) ? productIds : [],
            limit: limit ? Number(limit) : 10,
            sortOrder: Number(order),
            colorClass: colorClass || 'text-gray-900',
            seeAllLink: seeAllLink ? seeAllLink.trim() : null,
            isActive: isActive !== undefined ? Boolean(isActive) : true,
        });

        const created = await HomeSection.findByPk(newSection.id, {
            include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }]
        });

        res.status(201).json(created);
    } catch (error) {
        console.error('[HomeSection] createSection error:', error);
        res.status(500).json({ message: 'Error creating home section', error: error.message });
    }
};

/**
 * Admin: Update an existing home section.
 */
const updateSection = async (req, res) => {
    try {
        const { id } = req.params;
        const section = await HomeSection.findByPk(id);
        if (!section) {
            return res.status(404).json({ message: 'Home section not found.' });
        }

        const {
            title, subtitle, filterType, categoryId, productIds,
            limit, sortOrder, colorClass, seeAllLink, isActive
        } = req.body;

        if (title !== undefined) section.title = title.trim();
        if (subtitle !== undefined) section.subtitle = subtitle ? subtitle.trim() : null;
        if (filterType !== undefined) section.filterType = filterType;
        if (categoryId !== undefined) section.categoryId = categoryId ? Number(categoryId) : null;
        if (productIds !== undefined) section.productIds = Array.isArray(productIds) ? productIds : [];
        if (limit !== undefined) section.limit = Number(limit);
        if (sortOrder !== undefined) section.sortOrder = Number(sortOrder);
        if (colorClass !== undefined) section.colorClass = colorClass;
        if (seeAllLink !== undefined) section.seeAllLink = seeAllLink ? seeAllLink.trim() : null;
        if (isActive !== undefined) section.isActive = Boolean(isActive);

        await section.save();

        const updated = await HomeSection.findByPk(id, {
            include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }]
        });

        res.json(updated);
    } catch (error) {
        console.error('[HomeSection] updateSection error:', error);
        res.status(500).json({ message: 'Error updating home section', error: error.message });
    }
};

/**
 * Admin: Quick toggle active status.
 */
const toggleSectionStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const section = await HomeSection.findByPk(id);
        if (!section) {
            return res.status(404).json({ message: 'Home section not found.' });
        }

        section.isActive = !section.isActive;
        await section.save();

        res.json({ success: true, isActive: section.isActive });
    } catch (error) {
        console.error('[HomeSection] toggleSectionStatus error:', error);
        res.status(500).json({ message: 'Error toggling section status', error: error.message });
    }
};

/**
 * Admin: Reorder sections in batch.
 */
const reorderSections = async (req, res) => {
    try {
        const { items } = req.body; // Array of { id, sortOrder }
        if (!Array.isArray(items)) {
            return res.status(400).json({ message: 'items array is required.' });
        }

        await Promise.all(
            items.map(item =>
                HomeSection.update(
                    { sortOrder: item.sortOrder },
                    { where: { id: item.id } }
                )
            )
        );

        res.json({ success: true, message: 'Sections reordered successfully.' });
    } catch (error) {
        console.error('[HomeSection] reorderSections error:', error);
        res.status(500).json({ message: 'Error reordering sections', error: error.message });
    }
};

/**
 * Admin: Delete a home section.
 */
const deleteSection = async (req, res) => {
    try {
        const { id } = req.params;
        const count = await HomeSection.destroy({ where: { id } });
        if (!count) {
            return res.status(404).json({ message: 'Home section not found.' });
        }
        res.json({ success: true, message: 'Section deleted successfully.' });
    } catch (error) {
        console.error('[HomeSection] deleteSection error:', error);
        res.status(500).json({ message: 'Error deleting home section', error: error.message });
    }
};

module.exports = {
    getPublicHomeSections,
    getAllSectionsAdmin,
    createSection,
    updateSection,
    toggleSectionStatus,
    reorderSections,
    deleteSection,
};
