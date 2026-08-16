const { Blog, SeoSetting } = require('../models');
const { Op } = require('sequelize');
const { getSiteUrl, getCanonicalUrl, getAbsoluteUrl } = require('../utils/seoUrlHelper');

// Helper to sync Blog SEO to SeoSetting table
const syncBlogToSeoSetting = async (blog) => {
    try {
        const blogRoute = `/blog/${blog.slug}`;
        const canonicalUrl = blog.canonicalUrl || getCanonicalUrl(blogRoute);
        const title = blog.metaTitle || `${blog.title} | BlueAgle Guides`;
        const metaDescription = blog.metaDescription || blog.excerpt || blog.content.slice(0, 160);
        const metaKeywords = blog.metaKeywords || `cold pressed oil guide, ${blog.category}, blueagle blog`;
        const ogImage = blog.image ? getAbsoluteUrl(blog.image) : getAbsoluteUrl('/logo.png');

        const articleSchema = {
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": blog.title,
            "description": metaDescription,
            "image": [ogImage],
            "datePublished": blog.publishedAt || blog.createdAt,
            "dateModified": blog.updatedAt,
            "author": {
                "@type": "Person",
                "name": blog.author || "BlueAgle Editorial Team"
            },
            "publisher": {
                "@type": "Organization",
                "name": "BlueAgle",
                "logo": {
                    "@type": "ImageObject",
                    "url": getAbsoluteUrl('/logo.png')
                }
            },
            "mainEntityOfPage": canonicalUrl
        };

        const breadcrumbSchema = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                { "@type": "ListItem", "position": 1, "name": "Home", "item": getSiteUrl() },
                { "@type": "ListItem", "position": 2, "name": "Blog & Guides", "item": getCanonicalUrl('/blog') },
                { "@type": "ListItem", "position": 3, "name": blog.title, "item": canonicalUrl }
            ]
        };

        const pageKey = `blog_${blog.id}`;
        let seoRecord = await SeoSetting.findOne({ where: { pageKey } });

        const seoPayload = {
            pageKey,
            pageName: `Blog: ${blog.title}`,
            pageType: 'blog',
            route: blogRoute,
            title,
            metaDescription,
            metaKeywords,
            canonicalUrl,
            ogTitle: blog.title,
            ogDescription: metaDescription,
            ogImage,
            ogUrl: canonicalUrl,
            ogType: 'article',
            twitterCard: 'summary_large_image',
            twitterTitle: blog.title,
            twitterDescription: metaDescription,
            twitterImage: ogImage,
            structuredData: [articleSchema, breadcrumbSchema],
            isIndexed: blog.isIndexed !== undefined ? blog.isIndexed : true,
            isActive: blog.status === 'Published',
            createdBy: blog.author || 'admin'
        };

        if (seoRecord) {
            await seoRecord.update(seoPayload);
        } else {
            await SeoSetting.create(seoPayload);
        }
    } catch (err) {
        console.error('Error syncing Blog SEO to SeoSetting:', err);
    }
};

// ─── Public Customer Endpoints ───────────────────────────────────────────────
const getPublicBlogs = async (req, res) => {
    try {
        const { category, search, page = 1, limit = 12 } = req.query;
        const where = { status: 'Published' };

        if (category && category !== 'All') {
            where.category = category;
        }

        if (search) {
            where[Op.or] = [
                { title: { [Op.like]: `%${search}%` } },
                { excerpt: { [Op.like]: `%${search}%` } },
                { category: { [Op.like]: `%${search}%` } }
            ];
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const { count, rows } = await Blog.findAndCountAll({
            where,
            order: [['publishedAt', 'DESC']],
            limit: parseInt(limit),
            offset
        });

        // Get distinct categories for filter buttons
        const allCategories = await Blog.findAll({
            where: { status: 'Published' },
            attributes: ['category'],
            group: ['category']
        });

        const categories = allCategories.map(c => c.category).filter(Boolean);

        res.json({
            blogs: rows,
            total: count,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page),
            categories: ['All', ...categories]
        });
    } catch (error) {
        console.error('Error fetching public blogs:', error);
        res.status(500).json({ message: 'Error fetching articles' });
    }
};

const getPublicBlogBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const blog = await Blog.findOne({
            where: { slug, status: 'Published' }
        });

        if (!blog) {
            return res.status(404).json({ message: 'Article not found' });
        }

        // Increment views count asynchronously
        blog.increment('views').catch(() => {});

        // Fetch related articles in same category
        const related = await Blog.findAll({
            where: {
                status: 'Published',
                category: blog.category,
                id: { [Op.ne]: blog.id }
            },
            limit: 3,
            order: [['publishedAt', 'DESC']]
        });

        res.json({ blog, related });
    } catch (error) {
        console.error('Error fetching blog detail:', error);
        res.status(500).json({ message: 'Error loading article' });
    }
};

// ─── Admin Endpoints ────────────────────────────────────────────────────────
const getAllBlogsAdmin = async (req, res) => {
    try {
        const { search, status, category, page = 1, limit = 50 } = req.query;
        const where = {};

        if (status) where.status = status;
        if (category) where.category = category;
        if (search) {
            where[Op.or] = [
                { title: { [Op.like]: `%${search}%` } },
                { slug: { [Op.like]: `%${search}%` } }
            ];
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const { count, rows } = await Blog.findAndCountAll({
            where,
            order: [['updatedAt', 'DESC']],
            limit: parseInt(limit),
            offset
        });

        res.json({
            blogs: rows,
            total: count,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page)
        });
    } catch (error) {
        console.error('Error fetching admin blog list:', error);
        res.status(500).json({ message: 'Error loading articles' });
    }
};

const getBlogByIdAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const blog = await Blog.findByPk(id);
        if (!blog) {
            return res.status(404).json({ message: 'Article not found' });
        }
        res.json(blog);
    } catch (error) {
        res.status(500).json({ message: 'Error loading article' });
    }
};

const createBlogAdmin = async (req, res) => {
    try {
        const data = req.body;
        
        // Auto slug generation if missing
        if (!data.slug && data.title) {
            data.slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        }

        const existing = await Blog.findOne({ where: { slug: data.slug } });
        if (existing) {
            return res.status(400).json({ message: `Slug "${data.slug}" already exists. Use a unique slug.` });
        }

        const newBlog = await Blog.create({
            ...data,
            author: data.author || req.user?.email || 'BlueAgle Team'
        });

        // Sync to SeoSetting table
        await syncBlogToSeoSetting(newBlog);

        res.status(201).json({ message: 'Article created successfully', blog: newBlog });
    } catch (error) {
        console.error('Error creating blog:', error);
        res.status(500).json({ message: error.message || 'Error creating article' });
    }
};

const updateBlogAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const blog = await Blog.findByPk(id);
        if (!blog) {
            return res.status(404).json({ message: 'Article not found' });
        }

        await blog.update(data);

        // Sync updated Blog to SeoSetting
        await syncBlogToSeoSetting(blog);

        res.json({ message: 'Article updated successfully', blog });
    } catch (error) {
        console.error('Error updating blog:', error);
        res.status(500).json({ message: 'Error updating article' });
    }
};

const deleteBlogAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const blog = await Blog.findByPk(id);
        if (!blog) {
            return res.status(404).json({ message: 'Article not found' });
        }

        const pageKey = `blog_${blog.id}`;
        await blog.destroy();

        // Remove from SeoSetting table
        await SeoSetting.destroy({ where: { pageKey } }).catch(() => {});

        res.json({ message: 'Article deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting article' });
    }
};

module.exports = {
    getPublicBlogs,
    getPublicBlogBySlug,
    getAllBlogsAdmin,
    getBlogByIdAdmin,
    createBlogAdmin,
    updateBlogAdmin,
    deleteBlogAdmin
};
