/**
 * SEO Sync Engine — BlueAgle
 * ─────────────────────────────────────────────────────────────────────────────
 * Discovers every page in the application, generates high-quality default SEO
 * content using real business data, and safely upserts records into the
 * seo_settings table.
 *
 * Safety rules:
 *   - NEVER overwrites records where isManuallyEdited = true (unless forceOverwrite=true)
 *   - NEVER creates duplicate pageKeys
 *   - Wraps batch insertions in DB transactions
 *   - Idempotent — safe to run multiple times
 */

const { SeoSetting, SeoGlobalSetting, SeoAuditLog, Product, Category, SubCategory, Policy, Blog } = require('../models');
const { sequelize } = require('../models');
const { Op } = require('sequelize');

const { getSiteUrl, getCanonicalUrl, getAbsoluteUrl } = require('../utils/seoUrlHelper');

const SITE_NAME = 'BlueAgle';
const SITE_TAGLINE = 'Organic & Wood-Pressed Essentials';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const truncate = (str, max) => {
    if (!str) return '';
    return str.length <= max ? str : str.slice(0, max - 3) + '...';
};

const safeTitle = (str) => truncate(str, 60);
const safeDesc = (str) => truncate(str, 160);

const slugify = (str) =>
    str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// ─── Static Page Manifest ─────────────────────────────────────────────────────
// Covers every route in App.jsx (non-dynamic). Priority = sitemap priority.

const STATIC_PAGES = [
    {
        pageKey: 'home',
        pageName: 'Home',
        pageType: 'static',
        route: '/',
        priority: 1.0,
        changeFrequency: 'daily',
        isIndexed: true,
        generate: (g) => ({
            title: safeTitle(`${SITE_NAME} | ${SITE_TAGLINE}`),
            metaDescription: safeDesc(`Shop pure wood pressed oils, organic A2 desi ghee, honey, nuts, and authentic grocery staples. Free delivery across India.`),
            metaKeywords: 'wood pressed oil, organic grocery, cold pressed coconut oil, pure ghee, a2 desi ghee, blueagle, organic store',
            ogType: 'website',
            canonicalUrl: getCanonicalUrl('/'),
            structuredData: {
                "@context": "https://schema.org",
                "@type": "WebSite",
                "name": `${SITE_NAME} - ${SITE_TAGLINE}`,
                "url": getSiteUrl(),
                "potentialAction": {
                    "@type": "SearchAction",
                    "target": `${getSiteUrl()}/products?search={search_term_string}`,
                    "query-input": "required name=search_term_string"
                }
            }
        })
    },
    {
        pageKey: 'products_listing',
        pageName: 'All Products',
        pageType: 'static',
        route: '/products',
        priority: 0.9,
        changeFrequency: 'daily',
        isIndexed: true,
        generate: (g) => ({
            title: safeTitle(`Shop Organic Products | ${SITE_NAME}`),
            metaDescription: safeDesc(`Browse our complete range of organic, wood-pressed, and natural grocery products. Filter by category, price, and more.`),
            metaKeywords: 'organic products, wood pressed oils, organic grocery store, buy organic online, blueagle products',
            ogType: 'website',
            canonicalUrl: getCanonicalUrl('/products'),
        })
    },
    {
        pageKey: 'login',
        pageName: 'Login',
        pageType: 'auth',
        route: '/login',
        priority: 0.3,
        changeFrequency: 'yearly',
        isIndexed: false,
        robots: 'noindex, nofollow',
        generate: () => ({
            title: safeTitle(`Login to Your Account | ${SITE_NAME}`),
            metaDescription: safeDesc(`Sign in to your ${SITE_NAME} account to track orders, manage your wishlist, and enjoy fast checkout.`),
            metaKeywords: 'login, sign in, blueagle account',
            robots: 'noindex, nofollow',
            canonicalUrl: getCanonicalUrl('/login'),
        })
    },
    {
        pageKey: 'profile',
        pageName: 'My Profile',
        pageType: 'account',
        route: '/profile',
        priority: 0.2,
        changeFrequency: 'yearly',
        isIndexed: false,
        generate: () => ({
            title: safeTitle(`My Account | ${SITE_NAME}`),
            metaDescription: safeDesc(`Manage your ${SITE_NAME} profile, view order history, and update your personal information.`),
            metaKeywords: 'my account, profile, order history, blueagle',
            robots: 'noindex, nofollow',
            canonicalUrl: getCanonicalUrl('/profile'),
        })
    },
    {
        pageKey: 'checkout',
        pageName: 'Checkout',
        pageType: 'account',
        route: '/checkout',
        priority: 0.2,
        changeFrequency: 'yearly',
        isIndexed: false,
        generate: () => ({
            title: safeTitle(`Checkout | ${SITE_NAME}`),
            metaDescription: safeDesc(`Complete your purchase securely at ${SITE_NAME}. Fast delivery, easy payment options, and 100% satisfaction guaranteed.`),
            metaKeywords: 'checkout, buy online, secure payment, blueagle checkout',
            robots: 'noindex, nofollow',
            canonicalUrl: getCanonicalUrl('/checkout'),
        })
    },
    {
        pageKey: 'search',
        pageName: 'Search Results',
        pageType: 'static',
        route: '/products',
        priority: 0.6,
        changeFrequency: 'weekly',
        isIndexed: true,
        generate: () => ({
            title: safeTitle(`Search Organic Products | ${SITE_NAME}`),
            metaDescription: safeDesc(`Search through our curated collection of organic and wood-pressed grocery products. Find exactly what you need at ${SITE_NAME}.`),
            metaKeywords: 'search products, organic grocery search, find organic items, blueagle search',
            canonicalUrl: getCanonicalUrl('/products'),
        })
    },
    {
        pageKey: 'account_delete',
        pageName: 'Account Deletion',
        pageType: 'account',
        route: '/account/delete',
        priority: 0.1,
        changeFrequency: 'yearly',
        isIndexed: false,
        generate: () => ({
            title: safeTitle(`Delete Account | ${SITE_NAME}`),
            metaDescription: safeDesc(`Request deletion of your ${SITE_NAME} account and associated data. Your data will be removed within 30 days of your request.`),
            metaKeywords: 'delete account, account removal, data deletion, blueagle',
            robots: 'noindex, nofollow',
            canonicalUrl: getCanonicalUrl('/account/delete'),
        })
    },
    // ── Policy Pages ──────────────────────────────────────────────────────────
    {
        pageKey: 'policy_privacy',
        pageName: 'Privacy Policy',
        pageType: 'policy',
        route: '/policy/privacy-policy',
        priority: 0.4,
        changeFrequency: 'monthly',
        isIndexed: true,
        generate: () => ({
            title: safeTitle(`Privacy Policy | ${SITE_NAME}`),
            metaDescription: safeDesc(`Read our comprehensive Privacy Policy to understand how ${SITE_NAME} collects, uses, and protects your personal data.`),
            metaKeywords: 'privacy policy, data protection, blueagle privacy, personal data',
            canonicalUrl: getCanonicalUrl('/policy/privacy-policy'),
        })
    },
    {
        pageKey: 'policy_terms',
        pageName: 'Terms & Conditions',
        pageType: 'policy',
        route: '/policy/terms-and-conditions',
        priority: 0.4,
        changeFrequency: 'monthly',
        isIndexed: true,
        generate: () => ({
            title: safeTitle(`Terms & Conditions | ${SITE_NAME}`),
            metaDescription: safeDesc(`Read the Terms and Conditions governing your use of ${SITE_NAME} — our online organic grocery store.`),
            metaKeywords: 'terms and conditions, terms of service, blueagle terms, user agreement',
            canonicalUrl: getCanonicalUrl('/policy/terms-and-conditions'),
        })
    },
    {
        pageKey: 'policy_refund',
        pageName: 'Refund Policy',
        pageType: 'policy',
        route: '/policy/refund-policy',
        priority: 0.4,
        changeFrequency: 'monthly',
        isIndexed: true,
        generate: () => ({
            title: safeTitle(`Refund & Return Policy | ${SITE_NAME}`),
            metaDescription: safeDesc(`Learn about our hassle-free refund and return policy at ${SITE_NAME}. We guarantee your satisfaction with every order.`),
            metaKeywords: 'refund policy, return policy, blueagle refund, money back guarantee',
            canonicalUrl: getCanonicalUrl('/policy/refund-policy'),
        })
    },
    {
        pageKey: 'policy_shipping',
        pageName: 'Shipping Policy',
        pageType: 'policy',
        route: '/policy/shipping-policy',
        priority: 0.4,
        changeFrequency: 'monthly',
        isIndexed: true,
        generate: () => ({
            title: safeTitle(`Shipping Policy | ${SITE_NAME}`),
            metaDescription: safeDesc(`Understand our delivery timelines, shipping zones, and fees at ${SITE_NAME}. We offer fast, reliable delivery across India.`),
            metaKeywords: 'shipping policy, delivery policy, blueagle shipping, delivery time',
            canonicalUrl: getCanonicalUrl('/policy/shipping-policy'),
        })
    },
    {
        pageKey: 'policy_account_deletion',
        pageName: 'Account Deletion Policy',
        pageType: 'policy',
        route: '/policy/account-deletion-policy',
        priority: 0.3,
        changeFrequency: 'yearly',
        isIndexed: true,
        generate: () => ({
            title: safeTitle(`Account Deletion Policy | ${SITE_NAME}`),
            metaDescription: safeDesc(`Read how to permanently delete your ${SITE_NAME} account and what happens to your data after deletion.`),
            metaKeywords: 'account deletion policy, delete my data, blueagle account deletion, GDPR',
            canonicalUrl: getCanonicalUrl('/policy/account-deletion-policy'),
        })
    },
];

// ─── Dynamic Page Generators ──────────────────────────────────────────────────

const generateProductSeo = (product, globalSettings) => {
    const brand = product.brand || SITE_NAME;
    const catName = product.SubCategory?.Category?.name || 'Organic Products';
    const shortDesc = product.shortDescription || product.description?.slice(0, 120) || '';

    const title = safeTitle(`Buy ${product.name} Online | ${brand} | ${SITE_NAME}`);
    const desc = safeDesc(
        shortDesc
            ? `${shortDesc}. Shop ${product.name} at ₹${product.price} with fast delivery and best quality guarantee.`
            : `Buy authentic ${product.name} at the best price. Pure, natural quality from ${SITE_NAME}. Fast delivery, easy returns.`
    );
    const keywords = [
        product.name,
        `buy ${product.name}`,
        `organic ${product.name}`,
        `${product.name} online`,
        brand,
        catName,
        'blueagle organics',
        ...(product.tags || []),
    ].filter(Boolean).join(', ');

    const prodUrl = getCanonicalUrl(`/product/${product.id}`);
    const prodImg = (product.images && product.images[0]) ? getAbsoluteUrl(product.images[0]) : getAbsoluteUrl(globalSettings.defaultOgImage);

    // Build Schemas (Product + BreadcrumbList)
    const productSchema = {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": product.name,
        "description": product.description || shortDesc,
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
        { "@type": "ListItem", "position": 1, "name": "Home", "item": getSiteUrl() },
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

    return {
        pageKey: `product_${product.id}`,
        pageName: product.name,
        pageType: 'product',
        route: `/product/${product.id}`,
        priority: 0.8,
        changeFrequency: 'weekly',
        isIndexed: product.status === 'Published' && product.visibility === 'Public',
        title,
        metaDescription: desc,
        metaKeywords: keywords,
        canonicalUrl: prodUrl,
        ogTitle: safeTitle(`${product.name} | ${brand}`),
        ogDescription: desc,
        ogImage: prodImg,
        ogType: 'product',
        twitterTitle: safeTitle(`${product.name} | ${SITE_NAME}`),
        twitterDescription: desc,
        twitterImage: prodImg,
        author: brand,
        structuredData: [productSchema, breadcrumbSchema]
    };
};

const generateCategorySeo = (category, globalSettings) => {
    const title = safeTitle(`${category.name} Collection | Organic ${category.name} | ${SITE_NAME}`);
    const desc = safeDesc(
        `Shop our premium ${category.name} range — 100% organic, wood-pressed, and naturally processed. Discover the best ${category.name} products at ${SITE_NAME}.`
    );
    const keywords = `${category.name}, organic ${category.name}, buy ${category.name} online, ${category.name} products, ${SITE_NAME} ${category.name}`;
    const catRoute = `/products?category=${category.id}`;
    const catUrl = getCanonicalUrl(catRoute);

    return {
        pageKey: `category_${category.id}`,
        pageName: category.name,
        pageType: 'category',
        route: catRoute,
        priority: 0.75,
        changeFrequency: 'weekly',
        isIndexed: true,
        title,
        metaDescription: desc,
        metaKeywords: keywords,
        canonicalUrl: catUrl,
        ogTitle: title,
        ogDescription: desc,
        ogImage: category.image ? getAbsoluteUrl(category.image) : getAbsoluteUrl(globalSettings.defaultOgImage),
        ogType: 'website',
        twitterTitle: title,
        twitterDescription: desc,
        structuredData: [
            {
                "@context": "https://schema.org",
                "@type": "CollectionPage",
                "name": `${category.name} | ${SITE_NAME}`,
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
};

const generateSubCategorySeo = (sub, globalSettings) => {
    const catName = sub.Category?.name || 'Organic Products';
    const catId = sub.Category?.id || sub.categoryId || '';
    const title = safeTitle(`${sub.name} | ${catName} | ${SITE_NAME}`);
    const desc = safeDesc(
        `Explore our ${sub.name} collection under ${catName}. Naturally processed, chemical-free products delivered fresh to your doorstep.`
    );
    const keywords = `${sub.name}, organic ${sub.name}, ${catName}, buy ${sub.name} online, blueagle`;
    const subRoute = catId ? `/products?category=${catId}&subcategory=${sub.id}` : `/products?subcategory=${sub.id}`;
    const subUrl = getCanonicalUrl(subRoute);

    const breadcrumbs = [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": getSiteUrl() }
    ];
    if (catId && sub.Category) {
        breadcrumbs.push({ "@type": "ListItem", "position": 2, "name": sub.Category.name, "item": getCanonicalUrl(`/products?category=${catId}`) });
        breadcrumbs.push({ "@type": "ListItem", "position": 3, "name": sub.name, "item": subUrl });
    } else {
        breadcrumbs.push({ "@type": "ListItem", "position": 2, "name": sub.name, "item": subUrl });
    }

    return {
        pageKey: `subcategory_${sub.id}`,
        pageName: sub.name,
        pageType: 'subcategory',
        route: subRoute,
        priority: 0.7,
        changeFrequency: 'weekly',
        isIndexed: true,
        title,
        metaDescription: desc,
        metaKeywords: keywords,
        canonicalUrl: subUrl,
        ogTitle: title,
        ogDescription: desc,
        ogImage: getAbsoluteUrl(globalSettings.defaultOgImage),
        ogType: 'website',
        structuredData: [
            {
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                "itemListElement": breadcrumbs
            }
        ]
    };
};

const generatePolicySeo = (policy, globalSettings) => {
    const typeLabel = policy.type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const title = safeTitle(`${typeLabel} | ${SITE_NAME}`);
    const desc = safeDesc(
        policy.content?.blocks?.[0]?.text?.slice(0, 140) ||
        `Read the ${typeLabel} of ${SITE_NAME} — your trusted organic grocery store.`
    );
    const policyRoute = `/policy/${policy.type}`;
    return {
        pageKey: `policy_${slugify(policy.type)}`,
        pageName: typeLabel,
        pageType: 'policy',
        route: policyRoute,
        priority: 0.4,
        changeFrequency: 'monthly',
        isIndexed: true,
        title,
        metaDescription: desc,
        metaKeywords: `${typeLabel.toLowerCase()}, blueagle policy, ${typeLabel.toLowerCase()} blueagle`,
        canonicalUrl: getCanonicalUrl(policyRoute),
        ogTitle: title,
        ogDescription: desc,
        ogImage: getAbsoluteUrl(globalSettings.defaultOgImage),
    };
};

// ─── Core Sync Engine ─────────────────────────────────────────────────────────

/**
 * Main sync function.
 * @param {Object} options
 * @param {boolean} options.onlyMissing     - Only insert missing records (default: true)
 * @param {boolean} options.overwriteAuto   - Allow overwriting auto-generated records (default: false)
 * @param {boolean} options.skipManual      - Skip manually edited records (default: true)
 * @param {boolean} options.dryRun          - Preview only, no DB writes (default: false)
 * @param {string}  options.triggeredBy     - Who triggered the sync (email or 'system')
 * @returns {Object} Detailed sync report
 */
const runSeoSync = async ({
    onlyMissing = true,
    overwriteAuto = false,
    skipManual = true,
    dryRun = false,
    triggeredBy = 'system',
} = {}) => {
    const startTime = Date.now();
    const report = {
        scanned: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        skippedManual: 0,
        errors: 0,
        errorDetails: [],
        pages: [],
    };

    const globalSettings = await getOrCreateGlobalSettings();
    const now = new Date();

    // Collect all pages to process
    const allPages = [];

    // 1. Static pages
    for (const page of STATIC_PAGES) {
        const seoData = page.generate(globalSettings);
        allPages.push({
            pageKey: page.pageKey,
            pageName: page.pageName,
            pageType: page.pageType,
            route: page.route,
            priority: page.priority ?? 0.5,
            changeFrequency: page.changeFrequency ?? 'weekly',
            isIndexed: page.isIndexed ?? true,
            robots: page.robots || 'index, follow',
            ...seoData,
        });
    }

    // 2. Dynamic: Products
    const products = await Product.findAll({
        include: [{ model: SubCategory, include: [Category] }]
    });
    for (const product of products) {
        allPages.push(generateProductSeo(product, globalSettings));
    }

    // 3. Dynamic: Categories
    const categories = await Category.findAll();
    for (const cat of categories) {
        allPages.push(generateCategorySeo(cat, globalSettings));
    }

    // 4. Dynamic: SubCategories
    const subCategories = await SubCategory.findAll({ include: [Category] });
    for (const sub of subCategories) {
        allPages.push(generateSubCategorySeo(sub, globalSettings));
    }

    // 5. Dynamic: Policies (from DB)
    try {
        const policies = await Policy.findAll({ where: { status: 'active' } });
        const seenPolicyKeys = new Set(STATIC_PAGES.filter(p => p.pageType === 'policy').map(p => p.pageKey));
        for (const policy of policies) {
            const key = `policy_${slugify(policy.type)}`;
            if (!seenPolicyKeys.has(key)) {
                allPages.push(generatePolicySeo(policy, globalSettings));
                seenPolicyKeys.add(key);
            }
        }
    } catch (e) {
        // Policy model may not have all columns — safe fallback
    }

    // 6. Dynamic: Blogs (from DB)
    try {
        const blogs = await Blog.findAll({ where: { status: 'Published' } });
        for (const blog of blogs) {
            const blogRoute = `/blog/${blog.slug}`;
            const canonicalUrl = blog.canonicalUrl || getCanonicalUrl(blogRoute);
            const title = safeTitle(blog.metaTitle || `${blog.title} | BlueAgle Guides`);
            const metaDescription = safeDesc(blog.metaDescription || blog.excerpt || blog.content);
            const ogImg = blog.image ? getAbsoluteUrl(blog.image) : getAbsoluteUrl('/logo.png');

            const articleSchema = {
                "@context": "https://schema.org",
                "@type": "Article",
                "headline": blog.title,
                "description": metaDescription,
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

            allPages.push({
                pageKey: `blog_${blog.id}`,
                pageName: `Blog: ${blog.title}`,
                pageType: 'blog',
                route: blogRoute,
                priority: 0.8,
                changeFrequency: 'weekly',
                isIndexed: blog.isIndexed !== undefined ? blog.isIndexed : true,
                robots: 'index, follow',
                title,
                metaDescription,
                metaKeywords: blog.metaKeywords || `${blog.category.toLowerCase()}, cold pressed oil guide`,
                canonicalUrl,
                ogTitle: blog.title,
                ogDescription: metaDescription,
                ogImage: ogImg,
                ogUrl: canonicalUrl,
                ogType: 'article',
                twitterCard: 'summary_large_image',
                twitterTitle: blog.title,
                twitterDescription: metaDescription,
                twitterImage: ogImg,
                structuredData: [articleSchema, breadcrumbSchema],
                createdBy: 'seo_sync_engine'
            });
        }
    } catch (e) {
        // Blog query fallback
    }

    report.scanned = allPages.length;

    // Load all existing pageKeys for fast lookup
    const existingRecords = await SeoSetting.findAll({
        attributes: ['id', 'pageKey', 'isManuallyEdited', 'isAutoGenerated'],
    });
    const existingMap = new Map(existingRecords.map(r => [r.pageKey, r]));

    // Process each page
    const t = await sequelize.transaction();
    try {
        for (const page of allPages) {
            const existing = existingMap.get(page.pageKey);

            const pageReport = {
                pageKey: page.pageKey,
                pageName: page.pageName,
                route: page.route,
                action: 'SKIP',
                title: page.title,
                metaDescription: page.metaDescription,
                metaKeywords: page.metaKeywords,
                status: 'existing',
            };

            if (existing) {
                // Skip manually edited records unless explicitly overriding
                if (existing.isManuallyEdited && skipManual) {
                    pageReport.action = 'SKIP_MANUAL';
                    report.skippedManual++;
                    report.pages.push(pageReport);
                    continue;
                }

                // If onlyMissing mode and record exists, skip
                if (onlyMissing) {
                    pageReport.action = 'SKIP';
                    report.skipped++;
                    report.pages.push(pageReport);
                    continue;
                }

                // Skip auto-generated records unless overwriteAuto
                if (existing.isAutoGenerated && !overwriteAuto) {
                    pageReport.action = 'SKIP';
                    report.skipped++;
                    report.pages.push(pageReport);
                    continue;
                }

                // Update existing auto-generated record
                if (!dryRun) {
                    await SeoSetting.update({
                        ...page,
                        isAutoGenerated: true,
                        isManuallyEdited: false,
                        lastSyncedAt: now,
                        updatedBy: triggeredBy,
                    }, { where: { pageKey: page.pageKey }, transaction: t });

                    await SeoAuditLog.create({
                        pageKey: page.pageKey,
                        action: 'AUTO_SYNC_UPDATE',
                        performedBy: triggeredBy,
                        changes: { source: 'seo_sync_engine', title: page.title },
                    }, { transaction: t });
                }
                pageReport.action = 'UPDATE';
                pageReport.status = 'updated';
                report.updated++;

            } else {
                // New record — insert
                if (!dryRun) {
                    await SeoSetting.create({
                        ...page,
                        isAutoGenerated: true,
                        isManuallyEdited: false,
                        lastSyncedAt: now,
                        createdBy: triggeredBy,
                        updatedBy: triggeredBy,
                        author: page.author || globalSettings.defaultAuthor,
                        language: 'en',
                        viewport: 'width=device-width, initial-scale=1.0',
                        themeColor: globalSettings.defaultThemeColor,
                        twitterCard: 'summary_large_image',
                        ogUrl: page.canonicalUrl || `${SITE_BASE_URL}${page.route}`,
                        favicon: globalSettings.defaultFavicon,
                    }, { transaction: t });

                    await SeoAuditLog.create({
                        pageKey: page.pageKey,
                        action: 'AUTO_SYNC_CREATE',
                        performedBy: triggeredBy,
                        changes: { source: 'seo_sync_engine', title: page.title },
                    }, { transaction: t });
                }
                pageReport.action = 'CREATE';
                pageReport.status = 'created';
                report.created++;
            }

            report.pages.push(pageReport);
        }

        if (!dryRun) await t.commit();
        else await t.rollback();

    } catch (err) {
        await t.rollback();
        report.errors++;
        report.errorDetails.push(err.message);
        console.error('[SEO Sync Engine] Transaction failed:', err);
    }

    report.executionTimeMs = Date.now() - startTime;
    report.dryRun = dryRun;
    return report;
};

// ─── Helper: get or create global settings ────────────────────────────────────
const getOrCreateGlobalSettings = async () => {
    let g = await SeoGlobalSetting.findOne();
    if (!g) {
        g = await SeoGlobalSetting.create({
            siteName: `${SITE_NAME} - ${SITE_TAGLINE}`,
            defaultTitle: `${SITE_NAME} | ${SITE_TAGLINE}`,
            titleTemplate: `%s | ${SITE_NAME}`,
            defaultDescription: 'Shop pure wood pressed oils, organic A2 desi ghee, honey, nuts, and authentic grocery staples delivered to your doorstep.',
            defaultKeywords: 'wood pressed oil, organic grocery, cold pressed coconut oil, pure ghee, blueagle',
            defaultOgImage: '/logo.png',
            defaultTwitterImage: '/logo.png',
            defaultRobots: 'index, follow',
            defaultAuthor: `${SITE_NAME} Organics Team`,
            defaultLanguage: 'en',
            defaultThemeColor: '#3c006b',
            defaultFavicon: '/favicon.ico',
        });
    }
    return g;
};

// ─── Single-entity SEO auto-create helpers ────────────────────────────────────
// These are called by other controllers (product, category, policy) on creation.

const autoCreateProductSeo = async (product, triggeredBy = 'system') => {
    const globalSettings = await getOrCreateGlobalSettings();
    const seoData = generateProductSeo(product, globalSettings);
    const existing = await SeoSetting.findOne({ where: { pageKey: seoData.pageKey } });
    if (existing) return null; // Already exists

    return SeoSetting.create({
        ...seoData,
        isAutoGenerated: true,
        isManuallyEdited: false,
        lastSyncedAt: new Date(),
        createdBy: triggeredBy,
        updatedBy: triggeredBy,
        author: product.brand || globalSettings.defaultAuthor,
        language: 'en',
        viewport: 'width=device-width, initial-scale=1.0',
        themeColor: globalSettings.defaultThemeColor,
        twitterCard: 'summary_large_image',
        ogUrl: seoData.canonicalUrl,
        favicon: globalSettings.defaultFavicon,
    });
};

const autoCreateCategorySeo = async (category, triggeredBy = 'system') => {
    const globalSettings = await getOrCreateGlobalSettings();
    const seoData = generateCategorySeo(category, globalSettings);
    const existing = await SeoSetting.findOne({ where: { pageKey: seoData.pageKey } });
    if (existing) return null;

    return SeoSetting.create({
        ...seoData,
        isAutoGenerated: true,
        isManuallyEdited: false,
        lastSyncedAt: new Date(),
        createdBy: triggeredBy,
        updatedBy: triggeredBy,
        language: 'en',
        viewport: 'width=device-width, initial-scale=1.0',
        themeColor: globalSettings.defaultThemeColor,
        twitterCard: 'summary_large_image',
        ogUrl: seoData.canonicalUrl || `${SITE_BASE_URL}${seoData.route}`,
        favicon: globalSettings.defaultFavicon,
        author: globalSettings.defaultAuthor,
    });
};

const autoCreatePolicySeo = async (policy, triggeredBy = 'system') => {
    const globalSettings = await getOrCreateGlobalSettings();
    const seoData = generatePolicySeo(policy, globalSettings);
    const existing = await SeoSetting.findOne({ where: { pageKey: seoData.pageKey } });
    if (existing) return null;

    return SeoSetting.create({
        ...seoData,
        isAutoGenerated: true,
        isManuallyEdited: false,
        lastSyncedAt: new Date(),
        createdBy: triggeredBy,
        updatedBy: triggeredBy,
        language: 'en',
        viewport: 'width=device-width, initial-scale=1.0',
        themeColor: globalSettings.defaultThemeColor,
        twitterCard: 'summary_large_image',
        ogUrl: seoData.canonicalUrl || `${SITE_BASE_URL}${seoData.route}`,
        favicon: globalSettings.defaultFavicon,
        author: globalSettings.defaultAuthor,
    });
};

module.exports = {
    runSeoSync,
    autoCreateProductSeo,
    autoCreateCategorySeo,
    autoCreatePolicySeo,
    generateProductSeo,
    generateCategorySeo,
    STATIC_PAGES,
};
