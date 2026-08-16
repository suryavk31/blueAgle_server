const { SeoSetting, SeoGlobalSetting, SeoAuditLog, Product, Category, SubCategory, Policy, Blog } = require('../models');
const { Op } = require('sequelize');
const { getSiteUrl, getCanonicalUrl, getAbsoluteUrl } = require('../utils/seoUrlHelper');

// Helper to ensure Global SEO settings record exists
const getOrCreateGlobalSettings = async () => {
    let globalSetting = await SeoGlobalSetting.findOne();
    if (!globalSetting) {
        globalSetting = await SeoGlobalSetting.create({
            siteName: 'BlueAgle - Organic & Wood Pressed Essentials',
            defaultTitle: 'BlueAgle | Organic & Wood-Pressed Grocery Essentials',
            titleTemplate: '%s | BlueAgle',
            defaultDescription: 'Shop pure wood pressed oils, organic A2 desi ghee, honey, nuts, and authentic grocery staples delivered to your doorstep.',
            defaultKeywords: 'wood pressed oil, organic grocery, cold pressed coconut oil, pure ghee, blueagle',
            defaultOgImage: '/logo.png',
            defaultTwitterImage: '/logo.png',
            defaultRobots: 'index, follow',
            defaultAuthor: 'BlueAgle Organics Team',
            defaultLanguage: 'en',
            defaultThemeColor: '#3c006b',
            defaultFavicon: '/favicon.ico',
        });
    }
    return globalSetting;
};

// 1. Resolve SEO Record for a given Route or PageKey with Global Fallback
const resolveSeoByRoute = async (req, res) => {
    try {
        const { route, pageKey } = req.query;
        const globalSettings = await getOrCreateGlobalSettings();

        let record = null;

        // A. Match by pageKey if provided
        if (pageKey) {
            record = await SeoSetting.findOne({
                where: { pageKey, isActive: true }
            });
        }

        // B. Match by exact route
        if (!record && route) {
            record = await SeoSetting.findOne({
                where: { route, isActive: true }
            });
        }

        // C. Match by route pattern / dynamic routes if no exact Admin record match
        if (!record && route) {
            // C1. Check for product details page e.g. /product/12
            if (route.startsWith('/product/')) {
                const id = route.split('/product/')[1];
                if (id && !isNaN(id)) {
                    const product = await Product.findByPk(id, {
                        include: [{ model: SubCategory, include: [Category] }]
                    });
                    if (product) {
                        const brand = product.brand || 'BlueAgle';
                        const title = product.metaTitle || `${product.name} - Pure & Natural | ${brand}`;
                        const desc = product.metaDescription || product.shortDescription || (product.description ? product.description.slice(0, 160) : `Buy authentic ${product.name} online at BlueAgle.`);
                        const keywords = product.metaKeywords || `${product.name}, organic ${product.name}, buy ${product.name} online`;
                        const prodUrl = getCanonicalUrl(`/product/${id}`);
                        const prodImg = product.images?.[0] ? getAbsoluteUrl(product.images[0]) : getAbsoluteUrl(globalSettings.defaultOgImage);

                        const productSchema = {
                            "@context": "https://schema.org/",
                            "@type": "Product",
                            "name": product.name,
                            "description": product.description || desc,
                            "brand": { "@type": "Brand", "name": brand },
                            "image": product.images ? product.images.map(img => getAbsoluteUrl(img)) : [prodImg],
                            "sku": product.sku || `PROD-${product.id}`,
                            "offers": {
                                "@type": "Offer",
                                "priceCurrency": "INR",
                                "price": String(product.price),
                                "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                                "url": prodUrl
                            }
                        };

                        const breadcrumbItems = [
                            { "@type": "ListItem", "position": 1, "name": "Home", "item": getSiteUrl() }
                        ];
                        let pos = 2;
                        if (product.SubCategory?.Category) {
                            breadcrumbItems.push({
                                "@type": "ListItem",
                                "position": pos++,
                                "name": product.SubCategory.Category.name,
                                "item": getCanonicalUrl(`/products?category=${product.SubCategory.Category.id}`)
                            });
                        }
                        if (product.SubCategory) {
                            breadcrumbItems.push({
                                "@type": "ListItem",
                                "position": pos++,
                                "name": product.SubCategory.name,
                                "item": getCanonicalUrl(`/products?category=${product.SubCategory.Category?.id || ''}&subcategory=${product.SubCategory.id}`)
                            });
                        }
                        breadcrumbItems.push({
                            "@type": "ListItem",
                            "position": pos,
                            "name": product.name,
                            "item": prodUrl
                        });

                        const breadcrumbSchema = {
                            "@context": "https://schema.org",
                            "@type": "BreadcrumbList",
                            "itemListElement": breadcrumbItems
                        };

                        record = {
                            pageKey: `product_${id}`,
                            pageName: product.name,
                            pageType: 'product',
                            route: `/product/${id}`,
                            title,
                            metaDescription: desc,
                            metaKeywords: keywords,
                            canonicalUrl: prodUrl,
                            ogTitle: product.name,
                            ogDescription: desc,
                            ogImage: prodImg,
                            ogUrl: prodUrl,
                            ogType: 'og:product',
                            twitterTitle: product.name,
                            twitterDescription: desc,
                            twitterImage: prodImg,
                            structuredData: [productSchema, breadcrumbSchema]
                        };
                    }
                }
            }

            // C2. Check for Subcategory page (e.g. /products?category=1&subcategory=2 or /products?subcategory=2 or subCategoryId=2)
            if (!record && (route.includes('subcategory=') || route.includes('subCategoryId='))) {
                const urlParams = new URLSearchParams(route.includes('?') ? route.split('?')[1] : route);
                const subId = urlParams.get('subcategory') || urlParams.get('subCategoryId');
                if (subId) {
                    const subCategory = await SubCategory.findByPk(subId, { include: [Category] });
                    if (subCategory) {
                        const catName = subCategory.Category?.name || 'Organic Grocery';
                        const catId = subCategory.Category?.id || '';
                        const title = `${subCategory.name} | ${catName} | BlueAgle`;
                        const desc = `Explore our collection of ${subCategory.name} under ${catName}. 100% organic and wood-pressed staples.`;
                        const subRoute = catId ? `/products?category=${catId}&subcategory=${subCategory.id}` : `/products?subcategory=${subCategory.id}`;
                        const subUrl = getCanonicalUrl(subRoute);

                        const breadcrumbs = [
                            { "@type": "ListItem", "position": 1, "name": "Home", "item": getSiteUrl() }
                        ];
                        if (subCategory.Category) {
                            breadcrumbs.push({ "@type": "ListItem", "position": 2, "name": subCategory.Category.name, "item": getCanonicalUrl(`/products?category=${subCategory.Category.id}`) });
                            breadcrumbs.push({ "@type": "ListItem", "position": 3, "name": subCategory.name, "item": subUrl });
                        } else {
                            breadcrumbs.push({ "@type": "ListItem", "position": 2, "name": subCategory.name, "item": subUrl });
                        }

                        record = {
                            pageKey: `subcategory_${subId}`,
                            pageName: subCategory.name,
                            pageType: 'subcategory',
                            route: subRoute,
                            title,
                            metaDescription: desc,
                            metaKeywords: `${subCategory.name}, organic ${subCategory.name}, ${catName}, blueagle`,
                            canonicalUrl: subUrl,
                            ogTitle: title,
                            ogDescription: desc,
                            ogImage: getAbsoluteUrl(globalSettings.defaultOgImage),
                            ogUrl: subUrl,
                            structuredData: [
                                {
                                    "@context": "https://schema.org",
                                    "@type": "BreadcrumbList",
                                    "itemListElement": breadcrumbs
                                }
                            ]
                        };
                    }
                }
            }

            // C3. Check for Category page e.g. /products?category=2 or categoryId=2
            if (!record && (route.includes('category=') || route.includes('categoryId='))) {
                const urlParams = new URLSearchParams(route.includes('?') ? route.split('?')[1] : route);
                const catId = urlParams.get('category') || urlParams.get('categoryId');
                if (catId) {
                    const category = await Category.findByPk(catId);
                    if (category) {
                        const catRoute = `/products?category=${catId}`;
                        const catUrl = getCanonicalUrl(catRoute);
                        const title = `${category.name} Products | BlueAgle Store`;
                        const desc = `Explore our collection of organic ${category.name} items. Direct from farm to kitchen.`;

                        record = {
                            pageKey: `category_${catId}`,
                            pageName: category.name,
                            pageType: 'category',
                            route: catRoute,
                            title,
                            metaDescription: desc,
                            metaKeywords: `${category.name}, organic ${category.name}, blueagle categories`,
                            canonicalUrl: catUrl,
                            ogTitle: `${category.name} - BlueAgle`,
                            ogDescription: desc,
                            ogImage: category.image ? getAbsoluteUrl(category.image) : getAbsoluteUrl(globalSettings.defaultOgImage),
                            ogUrl: catUrl,
                            structuredData: [
                                {
                                    "@context": "https://schema.org",
                                    "@type": "CollectionPage",
                                    "name": `${category.name} | BlueAgle`,
                                    "description": desc,
                                    "url": catUrl
                                },
                                {
                                    "@context": "https://schema.org",
                                    "@type": "BreadcrumbList",
                                    "itemListElement": [
                                        { "@type": "ListItem", "position": 1, "name": "Home", "item": getSiteUrl() },
                                        { "@type": "ListItem", "position": 2, "name": category.name, "item": catUrl }
                                    ]
                                }
                            ]
                        };
                    }
                }
            }

            // C4. Check for Search Results query e.g. /products?search=oil
            if (!record && route.includes('search=')) {
                const urlParams = new URLSearchParams(route.includes('?') ? route.split('?')[1] : route);
                const searchQuery = urlParams.get('search');
                if (searchQuery) {
                    record = {
                        pageKey: `search_query`,
                        pageName: `Search: ${searchQuery}`,
                        pageType: 'static',
                        route: route,
                        title: `Search Results for "${searchQuery}" | BlueAgle`,
                        metaDescription: `Browse organic products matching "${searchQuery}" at BlueAgle. Quality organic staples delivered fast.`,
                        metaKeywords: `${searchQuery}, search organic grocery, blueagle products`,
                        canonicalUrl: getCanonicalUrl('/products'),
                        ogTitle: `Search Results for "${searchQuery}" | BlueAgle`,
                        ogDescription: `Browse organic products matching "${searchQuery}" at BlueAgle.`
                    };
                }
            }

            // C5. Check for Policy page e.g. /policy/privacy-policy
            if (!record && route.startsWith('/policy/')) {
                const policyType = route.split('/policy/')[1];
                if (policyType) {
                    try {
                        const policy = await Policy.findOne({ where: { type: policyType, status: 'active' } });
                        if (policy) {
                            const typeLabel = policy.type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                            const title = policy.seoTitle || `${typeLabel} | BlueAgle Legal`;
                            const desc = policy.seoDescription || `Read BlueAgle official ${typeLabel}.`;
                            record = {
                                pageKey: `policy_${policyType}`,
                                pageName: typeLabel,
                                pageType: 'policy',
                                route: `/policy/${policyType}`,
                                title,
                                metaDescription: desc,
                                metaKeywords: policy.seoKeywords || `${typeLabel.toLowerCase()}, blueagle policy`,
                                canonicalUrl: getCanonicalUrl(`/policy/${policyType}`),
                                ogTitle: title,
                                ogDescription: desc,
                                ogType: 'article'
                            };
                        }
                    } catch (e) {
                        // Policy query fallback
                    }
                }
            }

            // C6. Check for Blog Listing page /blog
            if (!record && (route === '/blog' || route === '/blog/')) {
                record = {
                    pageKey: 'blog_list',
                    pageName: 'Blog & Educational Guides',
                    pageType: 'blog',
                    route: '/blog',
                    title: 'Organic Oil Guides & Educational Articles | BlueAgle',
                    metaDescription: 'Discover expert guides on cold pressed oils, wood pressed extraction methods, smoke points, and culinary pairings from BlueAgle.',
                    metaKeywords: 'cold pressed oil blog, wood pressed oil guides, cooking oil comparison, blueagle articles',
                    canonicalUrl: getCanonicalUrl('/blog'),
                    ogTitle: 'Organic Oil Guides & Educational Articles | BlueAgle',
                    ogDescription: 'Discover expert guides on cold pressed oils, wood pressed extraction methods, smoke points, and culinary pairings.',
                    ogType: 'website'
                };
            }

            // C7. Check for Blog Single Article page e.g. /blog/cold-pressed-vs-refined-oils
            if (!record && route.startsWith('/blog/')) {
                const slug = route.split('/blog/')[1];
                if (slug) {
                    try {
                        const blog = await Blog.findOne({ where: { slug, status: 'Published' } });
                        if (blog) {
                            const canonicalUrl = blog.canonicalUrl || getCanonicalUrl(`/blog/${blog.slug}`);
                            const title = blog.metaTitle || `${blog.title} | BlueAgle Guides`;
                            const desc = blog.metaDescription || blog.excerpt || blog.content.slice(0, 160);
                            const ogImg = blog.image ? getAbsoluteUrl(blog.image) : getAbsoluteUrl('/logo.png');

                            const articleSchema = {
                                "@context": "https://schema.org",
                                "@type": "Article",
                                "headline": blog.title,
                                "description": desc,
                                "image": [ogImg],
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

                            record = {
                                pageKey: `blog_${blog.id}`,
                                pageName: blog.title,
                                pageType: 'blog',
                                route: `/blog/${blog.slug}`,
                                title,
                                metaDescription: desc,
                                metaKeywords: blog.metaKeywords || `${blog.category.toLowerCase()}, cold pressed oil guide`,
                                canonicalUrl,
                                ogTitle: blog.title,
                                ogDescription: desc,
                                ogImage: ogImg,
                                ogType: 'article',
                                twitterCard: 'summary_large_image',
                                structuredData: [articleSchema, breadcrumbSchema]
                            };
                        }
                    } catch (e) {
                        // Blog query fallback
                    }
                }
            }
        }

        // Clean up canonical & image URLs
        const requestCanonical = route ? getCanonicalUrl(route) : getSiteUrl();
        const finalCanonical = record?.canonicalUrl ? getAbsoluteUrl(record.canonicalUrl) : requestCanonical;
        const finalOgUrl = record?.ogUrl ? getAbsoluteUrl(record.ogUrl) : requestCanonical;
        const finalOgImage = record?.ogImage ? getAbsoluteUrl(record.ogImage) : getAbsoluteUrl(globalSettings.defaultOgImage);
        const finalTwitterImage = record?.twitterImage ? getAbsoluteUrl(record.twitterImage) : getAbsoluteUrl(globalSettings.defaultTwitterImage);

        // Build LocalBusiness / Store JSON-LD schema for local SEO authority
        const localBusinessSchema = {
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            "name": globalSettings.businessName || "BlueAgle Organic Oil Mill",
            "image": finalOgImage,
            "telephone": globalSettings.telephone || "+91 98765 43210",
            "priceRange": globalSettings.priceRange || "₹₹",
            "address": {
                "@type": "PostalAddress",
                "streetAddress": globalSettings.streetAddress || "123 Mill Road, Main Market",
                "addressLocality": globalSettings.addressLocality || "Erode",
                "addressRegion": globalSettings.addressRegion || "Tamil Nadu",
                "postalCode": globalSettings.postalCode || "638001",
                "addressCountry": globalSettings.addressCountry || "IN"
            },
            "geo": {
                "@type": "GeoCoordinates",
                "latitude": globalSettings.latitude || "11.3410",
                "longitude": globalSettings.longitude || "77.7172"
            },
            "openingHours": globalSettings.openingHours || "Mo-Sa 09:00-19:00",
            "url": getSiteUrl()
        };

        // Combine page-specific structured data with LocalBusiness schema
        let combinedSchemas = [];
        if (record?.structuredData) {
            combinedSchemas = Array.isArray(record.structuredData) ? [...record.structuredData] : [record.structuredData];
        } else if (globalSettings.websiteSchema) {
            combinedSchemas = Array.isArray(globalSettings.websiteSchema) ? [...globalSettings.websiteSchema] : [globalSettings.websiteSchema];
        }
        combinedSchemas.push(localBusinessSchema);

        // Response payload merging record with global fallbacks
        const resolvedSeo = {
            title: record?.title || globalSettings.defaultTitle,
            metaDescription: record?.metaDescription || globalSettings.defaultDescription,
            metaKeywords: record?.metaKeywords || globalSettings.defaultKeywords,
            canonicalUrl: finalCanonical,
            robots: record?.robots || globalSettings.defaultRobots,
            author: record?.author || globalSettings.defaultAuthor,
            language: record?.language || globalSettings.defaultLanguage,
            viewport: record?.viewport || 'width=device-width, initial-scale=1.0',
            themeColor: record?.themeColor || globalSettings.defaultThemeColor,
            favicon: record?.favicon || globalSettings.defaultFavicon,
            ogTitle: record?.ogTitle || record?.title || globalSettings.defaultTitle,
            ogDescription: record?.ogDescription || record?.metaDescription || globalSettings.defaultDescription,
            ogImage: finalOgImage,
            ogUrl: finalOgUrl,
            ogType: record?.ogType || 'website',
            twitterCard: record?.twitterCard || 'summary_large_image',
            twitterTitle: record?.twitterTitle || record?.title || globalSettings.defaultTitle,
            twitterDescription: record?.twitterDescription || record?.metaDescription || globalSettings.defaultDescription,
            twitterImage: finalTwitterImage,
            structuredData: combinedSchemas,
            alternateLanguages: record?.alternateLanguages || null,
            customHeadTags: record?.customHeadTags || null,
            customMetaTags: record?.customMetaTags || null,
            pageKey: record?.pageKey || pageKey || 'default',
            pageType: record?.pageType || 'static'
        };

        res.json({
            seo: resolvedSeo,
            globalSettings
        });
    } catch (error) {
        console.error('Error resolving SEO:', error);
        res.status(500).json({ message: 'Error resolving SEO configuration' });
    }
};

// 2. Get All SEO Settings (Admin List with Search and Filter)
const getAllSeo = async (req, res) => {
    try {
        const { search, pageType, isActive, page = 1, limit = 50 } = req.query;
        const where = {};

        if (search) {
            where[Op.or] = [
                { pageKey: { [Op.like]: `%${search}%` } },
                { pageName: { [Op.like]: `%${search}%` } },
                { title: { [Op.like]: `%${search}%` } },
                { route: { [Op.like]: `%${search}%` } }
            ];
        }

        if (pageType) {
            where.pageType = pageType;
        }

        if (isActive !== undefined && isActive !== '') {
            where.isActive = isActive === 'true' || isActive === true;
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const { count, rows } = await SeoSetting.findAndCountAll({
            where,
            order: [['updatedAt', 'DESC']],
            limit: parseInt(limit),
            offset
        });

        res.json({
            seoRecords: rows,
            totalRecords: count,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page)
        });
    } catch (error) {
        console.error('Error fetching SEO list:', error);
        res.status(500).json({ message: 'Error loading SEO records' });
    }
};

// 3. Get Single SEO Setting by ID
const getSeoById = async (req, res) => {
    try {
        const { id } = req.params;
        const record = await SeoSetting.findByPk(id);
        if (!record) {
            return res.status(404).json({ message: 'SEO record not found' });
        }

        const auditLogs = await SeoAuditLog.findAll({
            where: { pageKey: record.pageKey },
            order: [['createdAt', 'DESC']],
            limit: 10
        });

        res.json({ record, auditLogs });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching SEO record' });
    }
};

// 4. Create SEO Setting
const createSeo = async (req, res) => {
    try {
        const data = req.body;
        const existing = await SeoSetting.findOne({ where: { pageKey: data.pageKey } });
        if (existing) {
            return res.status(400).json({ message: `Page Key "${data.pageKey}" already exists.` });
        }

        const newRecord = await SeoSetting.create({
            ...data,
            createdBy: req.user?.email || 'admin'
        });

        await SeoAuditLog.create({
            pageKey: newRecord.pageKey,
            action: 'CREATE',
            performedBy: req.user?.email || 'admin',
            changes: newRecord.toJSON()
        });

        res.status(201).json({ message: 'SEO record created successfully', record: newRecord });
    } catch (error) {
        console.error('Error creating SEO:', error);
        res.status(500).json({ message: error.message || 'Error creating SEO record' });
    }
};

// 5. Update SEO Setting
const updateSeo = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const record = await SeoSetting.findByPk(id);
        if (!record) {
            return res.status(404).json({ message: 'SEO record not found' });
        }

        const oldValues = record.toJSON();
        await record.update({
            ...data,
            isManuallyEdited: true,   // Prevent auto-sync from overwriting this
            updatedBy: req.user?.email || 'admin'
        });

        await SeoAuditLog.create({
            pageKey: record.pageKey,
            action: 'UPDATE',
            performedBy: req.user?.email || 'admin',
            changes: { before: oldValues, after: record.toJSON() }
        });

        res.json({ message: 'SEO record updated successfully', record });
    } catch (error) {
        console.error('Error updating SEO:', error);
        res.status(500).json({ message: 'Error updating SEO record' });
    }
};

// 6. Delete SEO Setting
const deleteSeo = async (req, res) => {
    try {
        const { id } = req.params;
        const record = await SeoSetting.findByPk(id);
        if (!record) {
            return res.status(404).json({ message: 'SEO record not found' });
        }

        const pageKey = record.pageKey;
        await record.destroy();

        await SeoAuditLog.create({
            pageKey,
            action: 'DELETE',
            performedBy: req.user?.email || 'admin',
            changes: { deleted: record.toJSON() }
        });

        res.json({ message: 'SEO record deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting SEO record' });
    }
};

// 7. Bulk Delete & Bulk Update
const bulkActions = async (req, res) => {
    try {
        const { action, ids, updateData } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'No records selected' });
        }

        if (action === 'DELETE') {
            await SeoSetting.destroy({ where: { id: ids } });
            res.json({ message: `Successfully deleted ${ids.length} SEO records.` });
        } else if (action === 'TOGGLE_ACTIVE') {
            await SeoSetting.update({ isActive: updateData.isActive }, { where: { id: ids } });
            res.json({ message: `Successfully updated status for ${ids.length} records.` });
        } else {
            res.status(400).json({ message: 'Invalid bulk action' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error performing bulk action' });
    }
};

// 8. Import / Export SEO
const exportSeo = async (req, res) => {
    try {
        const records = await SeoSetting.findAll({ order: [['pageName', 'ASC']] });
        res.json(records);
    } catch (error) {
        res.status(500).json({ message: 'Export failed' });
    }
};

const importSeo = async (req, res) => {
    try {
        const { records } = req.body;
        if (!Array.isArray(records)) {
            return res.status(400).json({ message: 'Invalid import format. Expected array.' });
        }

        let createdCount = 0;
        let updatedCount = 0;

        for (const item of records) {
            if (!item.pageKey || !item.pageName || !item.route) continue;
            const [seo, created] = await SeoSetting.upsert({
                ...item,
                updatedBy: req.user?.email || 'import_admin'
            });
            if (created) createdCount++;
            else updatedCount++;
        }

        res.json({ message: `Import completed. ${createdCount} created, ${updatedCount} updated.` });
    } catch (error) {
        console.error('Import Error:', error);
        res.status(500).json({ message: 'Import failed: ' + error.message });
    }
};

// 9. Global SEO Settings Handlers
const getGlobalSeo = async (req, res) => {
    try {
        const settings = await getOrCreateGlobalSettings();
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching global settings' });
    }
};

const updateGlobalSeo = async (req, res) => {
    try {
        const settings = await getOrCreateGlobalSettings();
        await settings.update(req.body);
        res.json({ message: 'Global SEO settings updated successfully', settings });
    } catch (error) {
        res.status(500).json({ message: 'Error updating global settings' });
    }
};

// 10. Real-time SEO Validation
const validateSeo = async (req, res) => {
    const { title, metaDescription, pageKey, canonicalUrl, structuredData } = req.body;
    const warnings = [];

    if (!title || title.trim().length === 0) warnings.push({ field: 'title', message: 'Page Title is missing.' });
    else if (title.length < 30) warnings.push({ field: 'title', message: 'Page Title is short (< 30 chars). Recommended 50-60 chars.' });
    else if (title.length > 60) warnings.push({ field: 'title', message: 'Page Title exceeds 60 chars. May get truncated in Google Search.' });

    if (!metaDescription || metaDescription.trim().length === 0) warnings.push({ field: 'metaDescription', message: 'Meta Description is missing.' });
    else if (metaDescription.length < 70) warnings.push({ field: 'metaDescription', message: 'Meta Description is short (< 70 chars).' });
    else if (metaDescription.length > 160) warnings.push({ field: 'metaDescription', message: 'Meta Description exceeds 160 chars. May get truncated.' });

    if (!canonicalUrl) warnings.push({ field: 'canonicalUrl', message: 'Canonical URL is not specified.' });

    if (structuredData) {
        try {
            if (typeof structuredData === 'string') JSON.parse(structuredData);
        } catch (e) {
            warnings.push({ field: 'structuredData', message: 'Invalid JSON-LD schema syntax.' });
        }
    }

    res.json({ valid: warnings.length === 0, warnings });
};

module.exports = {
    resolveSeoByRoute,
    getAllSeo,
    getSeoById,
    createSeo,
    updateSeo,
    deleteSeo,
    bulkActions,
    exportSeo,
    importSeo,
    getGlobalSeo,
    updateGlobalSeo,
    validateSeo
};
