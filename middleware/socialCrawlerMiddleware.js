/**
 * Social Crawler Pre-Rendering Middleware — BlueAgle
 * Detects social media crawlers (WhatsApp, Facebook, Twitter, LinkedIn, etc.)
 * and serves pre-rendered HTML containing OpenGraph, Twitter, and JSON-LD meta tags.
 * Normal browser traffic bypasses this middleware completely.
 */

const { SeoSetting, SeoGlobalSetting, Product, Category, SubCategory, Policy, Blog } = require('../models');
const { getSiteUrl, getCanonicalUrl, getAbsoluteUrl } = require('../utils/seoUrlHelper');

const SOCIAL_BOT_USER_AGENTS = [
    'facebookexternalhit',
    'whatsapp',
    'twitterbot',
    'linkedinbot',
    'slackbot',
    'discordbot',
    'telegrambot',
    'skypeuripreview',
    'bingpreview',
    'pinterest',
];

const isSocialCrawler = (userAgent = '') => {
    const ua = userAgent.toLowerCase();
    return SOCIAL_BOT_USER_AGENTS.some(bot => ua.includes(bot));
};

const socialCrawlerMiddleware = async (req, res, next) => {
    // Only intercept GET requests from social crawlers
    if (req.method !== 'GET') return next();
    
    const userAgent = req.headers['user-agent'] || '';
    if (!isSocialCrawler(userAgent)) return next();

    // Skip API, admin, uploads, and static asset files
    const path = req.path;
    if (path.startsWith('/api') || path.startsWith('/uploads') || path.includes('.')) {
        return next();
    }

    try {
        const fullRoute = req.originalUrl || req.url;
        const siteUrl = getSiteUrl();

        // Load global settings for fallbacks
        let globalSettings = await SeoGlobalSetting.findOne();
        if (!globalSettings) {
            globalSettings = {
                siteName: 'BlueAgle - Organic & Wood Pressed Essentials',
                defaultTitle: 'BlueAgle | Organic & Wood-Pressed Grocery Essentials',
                defaultDescription: 'Shop pure wood pressed oils, organic A2 desi ghee, honey, nuts, and authentic grocery staples.',
                defaultOgImage: '/logo.png',
                defaultTwitterImage: '/logo.png',
            };
        }

        // Try resolving SEO setting record from DB
        let seoRecord = await SeoSetting.findOne({
            where: { route: fullRoute, isActive: true }
        });

        let title = seoRecord?.title;
        let description = seoRecord?.metaDescription;
        let image = seoRecord?.ogImage;
        let canonicalUrl = seoRecord?.canonicalUrl || getCanonicalUrl(fullRoute);
        let ogType = seoRecord?.ogType || 'website';
        let structuredData = seoRecord?.structuredData;

        // Dynamic fallback logic if no exact DB record match
        if (!title && path.startsWith('/product/')) {
            const id = path.split('/product/')[1];
            if (id && !isNaN(id)) {
                const product = await Product.findByPk(id);
                if (product) {
                    title = product.metaTitle || `${product.name} - Pure & Natural | BlueAgle`;
                    description = product.metaDescription || product.shortDescription || (product.description ? product.description.slice(0, 160) : `Buy ${product.name} online at BlueAgle.`);
                    image = product.images?.[0] || globalSettings.defaultOgImage;
                    ogType = 'product';
                    canonicalUrl = getCanonicalUrl(`/product/${id}`);
                }
            }
        }

        if (!title && path.startsWith('/policy/')) {
            const type = path.split('/policy/')[1];
            if (type) {
                const policy = await Policy.findOne({ where: { type, status: 'active' } });
                if (policy) {
                    title = policy.seoTitle || `${policy.title} | BlueAgle Legal`;
                    description = policy.seoDescription || `Read official ${policy.title} of BlueAgle.`;
                }
            }
        }

        if (!title && path.startsWith('/blog/')) {
            const slug = path.split('/blog/')[1];
            if (slug) {
                const blog = await Blog.findOne({ where: { slug, status: 'Published' } });
                if (blog) {
                    title = blog.metaTitle || `${blog.title} | BlueAgle Guides`;
                    description = blog.metaDescription || blog.excerpt || blog.content.slice(0, 160);
                    image = blog.image || globalSettings.defaultOgImage;
                    ogType = 'article';
                    canonicalUrl = blog.canonicalUrl || getCanonicalUrl(`/blog/${slug}`);
                }
            }
        }

        // Final Fallbacks
        title = title || globalSettings.defaultTitle;
        description = description || globalSettings.defaultDescription;
        image = getAbsoluteUrl(image || globalSettings.defaultOgImage);

        // LocalBusiness Schema for bots
        const localBusinessSchema = {
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            "name": globalSettings.businessName || "BlueAgle Organic Oil Mill",
            "image": image,
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

        let jsonLdHtml = `<script type="application/ld+json">${JSON.stringify(localBusinessSchema)}</script>`;
        if (structuredData) {
            const dataStr = typeof structuredData === 'string' ? structuredData : JSON.stringify(structuredData);
            jsonLdHtml += `\n    <script type="application/ld+json">${dataStr}</script>`;
        }

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
    <meta property="og:site_name" content="BlueAgle">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${escapeHtml(image)}">
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
    <meta property="og:type" content="${escapeHtml(ogType)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${escapeHtml(image)}">
    ${jsonLdHtml}
</head>
<body>
    <div id="root">
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(description)}</p>
    </div>
</body>
</html>`;

        res.header('Content-Type', 'text/html; charset=utf-8');
        return res.send(html);

    } catch (err) {
        console.error('Social crawler middleware error:', err);
        return next();
    }
};

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

module.exports = socialCrawlerMiddleware;
