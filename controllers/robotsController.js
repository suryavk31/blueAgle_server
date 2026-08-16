const { SeoGlobalSetting } = require('../models');
const { getSiteUrl } = require('../utils/seoUrlHelper');

const generateRobotsTxt = async (req, res) => {
    try {
        const settings = await SeoGlobalSetting.findOne();
        let content = settings?.robotsTxtCustomRules || `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /checkout\nDisallow: /cart\nDisallow: /profile`;

        // Replace any lingering localhost sitemap URLs with active SITE_URL
        if (content.includes('http://localhost')) {
            content = content.replace(/http:\/\/localhost:\d+\/sitemap\.xml/g, `${getSiteUrl()}/sitemap.xml`);
        }

        // Ensure Sitemap directive is present at end
        if (!content.includes('Sitemap:')) {
            content += `\n\nSitemap: ${getSiteUrl()}/sitemap.xml`;
        }

        if (typeof res.type === 'function') {
            res.type('text/plain');
        } else if (typeof res.setHeader === 'function') {
            res.setHeader('Content-Type', 'text/plain');
        }
        res.send(content);
    } catch (error) {
        console.error('robots.txt generation error:', error);
        res.status(500).send('Error generating robots.txt');
    }
};

module.exports = { generateRobotsTxt };

