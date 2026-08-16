/**
 * SEO URL Helper — BlueAgle
 * Centralized utility for resolving site URLs, canonical links, and absolute asset URLs.
 */
require('dotenv').config();

const getSiteUrl = () => {
    const siteUrl = process.env.SITE_URL || process.env.CLIENT_URL;
    if (siteUrl) {
        return siteUrl.replace(/\/+$/, '');
    }
    if (process.env.NODE_ENV === 'production') {
        console.warn('[SEO Warning] SITE_URL or CLIENT_URL environment variable is missing in production! Falling back to https://blueagle.in');
        return 'https://blueagle.in';
    }
    return 'http://localhost:5173';
};

const getCanonicalUrl = (route = '/') => {
    const baseUrl = getSiteUrl();
    const cleanRoute = route.startsWith('/') ? route : `/${route}`;
    return `${baseUrl}${cleanRoute}`;
};

const getAbsoluteUrl = (pathOrUrl) => {
    if (!pathOrUrl) return getSiteUrl() + '/logo.png';
    if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
        return pathOrUrl;
    }
    const baseUrl = getSiteUrl();
    const cleanPath = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
    return `${baseUrl}${cleanPath}`;
};

module.exports = {
    getSiteUrl,
    getCanonicalUrl,
    getAbsoluteUrl,
};
