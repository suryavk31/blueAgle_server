const { SeoSetting, Product, Category, SubCategory, Blog } = require('../models');
const { getSiteUrl, getCanonicalUrl } = require('../utils/seoUrlHelper');

const generateSitemap = async (req, res) => {
    try {
        const addedUrls = new Set();

        // 1. Fetch static SEO settings that are indexed and active
        const seoRecords = await SeoSetting.findAll({
            where: { isIndexed: true, isActive: true },
            attributes: ['route', 'priority', 'changeFrequency', 'updatedAt']
        });

        // 2. Fetch active published products only
        const products = await Product.findAll({
            where: { status: 'Published', visibility: 'Public' },
            attributes: ['id', 'updatedAt']
        });

        // 3. Fetch categories
        const categories = await Category.findAll({
            attributes: ['id', 'updatedAt']
        });

        // 4. Fetch subcategories
        const subCategories = await SubCategory.findAll({
            include: [Category],
            attributes: ['id', 'categoryId', 'updatedAt']
        });

        // 5. Fetch published blogs
        const blogs = await Blog.findAll({
            where: { status: 'Published', isIndexed: true },
            attributes: ['slug', 'updatedAt']
        });

        // Build XML entries
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

        // Helper to append URL element safely if not duplicated
        const appendUrl = (route, priority = '0.8', changefreq = 'weekly', updatedAt = null) => {
            // Exclude private routes
            if (route.startsWith('/admin') || route.startsWith('/checkout') || route.startsWith('/cart') || route.startsWith('/profile') || route.startsWith('/account/delete')) {
                return;
            }
            const fullUrl = getCanonicalUrl(route);
            if (addedUrls.has(fullUrl)) return;
            addedUrls.add(fullUrl);

            xml += `  <url>\n`;
            xml += `    <loc>${fullUrl}</loc>\n`;
            if (updatedAt) {
                xml += `    <lastmod>${new Date(updatedAt).toISOString()}</lastmod>\n`;
            }
            xml += `    <changefreq>${changefreq}</changefreq>\n`;
            xml += `    <priority>${priority}</priority>\n`;
            xml += `  </url>\n`;
        };

        // Home
        appendUrl('/', '1.0', 'daily');

        // DB SEO pages
        seoRecords.forEach(r => {
            if (r.route !== '/') {
                appendUrl(r.route, r.priority || '0.8', r.changeFrequency || 'weekly', r.updatedAt);
            }
        });

        // Published Products
        products.forEach(p => {
            appendUrl(`/product/${p.id}`, '0.9', 'weekly', p.updatedAt);
        });

        // Categories
        categories.forEach(c => {
            appendUrl(`/products?category=${c.id}`, '0.8', 'weekly', c.updatedAt);
        });

        // Subcategories
        subCategories.forEach(s => {
            const catId = s.Category?.id || s.categoryId || '';
            const subRoute = catId ? `/products?category=${catId}&subcategory=${s.id}` : `/products?subcategory=${s.id}`;
            appendUrl(subRoute, '0.7', 'weekly', s.updatedAt);
        });

        // Blog Hub & Published Articles
        appendUrl('/blog', '0.8', 'daily');
        blogs.forEach(b => {
            appendUrl(`/blog/${b.slug}`, '0.8', 'weekly', b.updatedAt);
        });

        xml += `</urlset>`;

        res.header('Content-Type', 'application/xml');
        res.send(xml);
    } catch (error) {
        console.error('Sitemap Error:', error);
        res.status(500).send('Error generating sitemap.xml');
    }
};

module.exports = { generateSitemap };

