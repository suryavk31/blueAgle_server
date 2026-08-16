const { GaSetting } = require('../models');
const googleAnalyticsService = require('../services/googleAnalyticsService');
const analyticsCache = require('../utils/analyticsCache');

/**
 * gaAnalyticsController
 * Handles API endpoints for GA4 setup, connection testing, and real-time dashboard data.
 */

// ─── 1. Get GA4 Setup Config ──────────────────────────────────────────────────
const getGaConfig = async (req, res) => {
    try {
        let dbSetting = await GaSetting.findOne();
        if (!dbSetting) {
            dbSetting = {
                propertyId: process.env.GOOGLE_ANALYTICS_PROPERTY_ID || '',
                measurementId: process.env.GOOGLE_ANALYTICS_MEASUREMENT_ID || '',
                serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
                privateKey: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ? '••••••••' : '',
                isEnabled: true,
                connectionStatus: 'Disconnected',
                lastTestedAt: null,
                lastError: null,
            };
        }

        return res.json({
            propertyId: dbSetting.propertyId || process.env.GOOGLE_ANALYTICS_PROPERTY_ID || '',
            measurementId: dbSetting.measurementId || process.env.GOOGLE_ANALYTICS_MEASUREMENT_ID || '',
            serviceAccountEmail: dbSetting.serviceAccountEmail || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
            hasPrivateKey: !!(dbSetting.privateKey || process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY),
            isEnabled: dbSetting.isEnabled,
            connectionStatus: dbSetting.connectionStatus,
            lastTestedAt: dbSetting.lastTestedAt,
            lastError: dbSetting.lastError,
        });
    } catch (error) {
        console.error('Error fetching GA4 config:', error);
        return res.status(500).json({ message: 'Error loading Google Analytics configuration' });
    }
};

// ─── 2. Update GA4 Config ─────────────────────────────────────────────────────
const updateGaConfig = async (req, res) => {
    try {
        const { propertyId, measurementId, serviceAccountEmail, privateKey, isEnabled } = req.body;

        let [setting] = await GaSetting.findOrCreate({
            where: { id: 1 },
            defaults: {
                propertyId: propertyId ? String(propertyId).trim() : '',
                measurementId: measurementId ? String(measurementId).trim() : '',
                serviceAccountEmail: serviceAccountEmail ? String(serviceAccountEmail).trim() : '',
                privateKey: privateKey ? String(privateKey).trim() : '',
                isEnabled: isEnabled !== undefined ? isEnabled : true,
                connectionStatus: 'Disconnected',
            },
        });

        const updateData = {
            propertyId: propertyId ? String(propertyId).trim() : setting.propertyId,
            measurementId: measurementId ? String(measurementId).trim() : setting.measurementId,
            serviceAccountEmail: serviceAccountEmail ? String(serviceAccountEmail).trim() : setting.serviceAccountEmail,
            isEnabled: isEnabled !== undefined ? isEnabled : setting.isEnabled,
        };

        if (privateKey && privateKey !== '••••••••') {
            updateData.privateKey = String(privateKey).trim();
        }

        await setting.update(updateData);
        analyticsCache.invalidateAll();

        return res.json({
            message: 'Google Analytics settings updated successfully',
            setting: {
                propertyId: setting.propertyId,
                measurementId: setting.measurementId,
                serviceAccountEmail: setting.serviceAccountEmail,
                hasPrivateKey: !!setting.privateKey,
                connectionStatus: setting.connectionStatus,
            },
        });
    } catch (error) {
        console.error('Error updating GA4 config:', error);
        return res.status(500).json({ message: 'Error saving Google Analytics settings' });
    }
};

// ─── 3. Test GA4 Connection ───────────────────────────────────────────────────
const testGaConnection = async (req, res) => {
    try {
        const { propertyId, measurementId, serviceAccountEmail, privateKey } = req.body || {};

        const configOverride = {};
        if (propertyId) configOverride.propertyId = String(propertyId).trim();
        if (measurementId) configOverride.measurementId = String(measurementId).trim();
        if (serviceAccountEmail) configOverride.serviceAccountEmail = String(serviceAccountEmail).trim();
        if (privateKey && privateKey !== '••••••••') configOverride.privateKey = String(privateKey).trim();

        const testResult = await googleAnalyticsService.testConnection(
            Object.keys(configOverride).length > 0 ? configOverride : null
        );

        // Update DB status if setting exists
        const dbSetting = await GaSetting.findOne();
        if (dbSetting) {
            await dbSetting.update({
                connectionStatus: testResult.success ? 'Connected' : 'Error',
                lastTestedAt: new Date(),
                lastError: testResult.success ? null : testResult.message,
            });
        }

        analyticsCache.invalidateAll();

        return res.json(testResult);
    } catch (error) {
        console.error('Error testing GA4 connection:', error);
        return res.status(500).json({
            success: false,
            status: 'Error',
            message: error.message || 'Error testing Google Analytics connection',
        });
    }
};

// ─── 4. Get Full GA4 Dashboard Data ───────────────────────────────────────────
const getGaDashboardData = async (req, res) => {
    try {
        const { startDate = '30daysAgo', endDate = 'today', forceRefresh = 'false' } = req.query;
        const cacheKey = `ga4_dashboard_${startDate}_${endDate}`;

        if (forceRefresh === 'true') {
            analyticsCache.invalidateAll();
        } else {
            const cachedData = analyticsCache.get(cacheKey);
            if (cachedData) {
                return res.json({ ...cachedData, isCached: true });
            }
        }

        // Check if GA4 connection is configured
        const dbSetting = await GaSetting.findOne();
        const hasProperty = dbSetting?.propertyId || process.env.GOOGLE_ANALYTICS_PROPERTY_ID;

        if (!hasProperty) {
            return res.json({
                isConfigured: true,
                isDemoData: true,
                status: 'Demo Mode',
                message: 'Displaying demonstration analytics data. Connect your GA4 Property ID in Settings -> Google Analytics for live data.',
                updatedAt: new Date().toISOString(),
                realtimeUsers: 18,
                overview: {
                    activeUsers: 14850,
                    newUsers: 9420,
                    sessions: 18230,
                    engagementRate: '71.2%',
                    avgEngagementTime: '2m 35s',
                    pageViews: 41200,
                    eventCount: 82400,
                    conversions: 1120,
                    totalRevenue: 184500,
                },
                trafficOverview: [
                    { date: 'Aug 04', users: 420, sessions: 510, views: 1120 },
                    { date: 'Aug 05', users: 480, sessions: 590, views: 1280 },
                    { date: 'Aug 06', users: 450, sessions: 540, views: 1190 },
                    { date: 'Aug 07', users: 510, sessions: 620, views: 1410 },
                    { date: 'Aug 08', users: 590, sessions: 710, views: 1650 },
                    { date: 'Aug 09', users: 540, sessions: 660, views: 1490 },
                    { date: 'Aug 10', users: 670, sessions: 790, views: 1820 },
                    { date: 'Aug 11', users: 720, sessions: 850, views: 1940 },
                ],
                trafficSources: [
                    { channel: 'Organic Search', users: 6420, sessions: 7890, conversions: 480 },
                    { channel: 'Direct', users: 4120, sessions: 4980, conversions: 310 },
                    { channel: 'Organic Social', users: 2310, sessions: 2840, conversions: 180 },
                    { channel: 'Referral', users: 1280, sessions: 1540, conversions: 95 },
                    { channel: 'Paid Search', users: 720, sessions: 980, conversions: 55 },
                ],
                topPages: [
                    { page: '/products', users: 5120, sessions: 6240, views: 14200, engagementRate: '76.4%', conversions: 420 },
                    { page: '/product/wood-pressed-groundnut-oil-1l', users: 3410, sessions: 4120, views: 8940, engagementRate: '82.1%', conversions: 290 },
                    { page: '/blog/wood-pressed-groundnut-oil-culinary-guide', users: 2340, sessions: 2780, views: 4210, engagementRate: '71.5%', conversions: 110 },
                    { page: '/product/pure-cold-pressed-sesame-oil', users: 1980, sessions: 2350, views: 4890, engagementRate: '79.2%', conversions: 185 },
                    { page: '/blog/how-marachekku-wood-pressing-retains-aroma', users: 1420, sessions: 1650, views: 2540, engagementRate: '68.4%', conversions: 65 },
                ],
                topProducts: [
                    { productName: 'Wood Pressed Groundnut Oil (1 Litre)', views: 5840, addToCarts: 1480, purchases: 512, revenue: 66560 },
                    { productName: 'Pure Cold Pressed Sesame (Gingelly) Oil (1 Litre)', views: 4120, addToCarts: 1050, purchases: 342, revenue: 51300 },
                    { productName: 'Traditional Wood Pressed Coconut Oil (1 Litre)', views: 3240, addToCarts: 780, purchases: 245, revenue: 29400 },
                    { productName: 'A2 Desi Cow Ghee (500ml)', views: 2150, addToCarts: 520, purchases: 185, revenue: 12950 },
                ],
                devices: [
                    { device: 'mobile', users: 9840, sessions: 12100, engagementRate: '69.4%' },
                    { device: 'desktop', users: 4410, sessions: 5540, engagementRate: '74.8%' },
                    { device: 'tablet', users: 600, sessions: 590, engagementRate: '63.2%' },
                ],
                geo: [
                    { country: 'India', city: 'Chennai', users: 5120, sessions: 6280 },
                    { country: 'India', city: 'Bengaluru', users: 3410, sessions: 4190 },
                    { country: 'India', city: 'Coimbatore', users: 2340, sessions: 2880 },
                    { country: 'India', city: 'Hyderabad', users: 1720, sessions: 2110 },
                    { country: 'India', city: 'Mumbai', users: 1250, sessions: 1540 },
                ],
            });
        }

        // Run report calls concurrently
        const [
            overview,
            trafficOverview,
            trafficSources,
            topPages,
            topProducts,
            devices,
            geo,
            realtimeUsers
        ] = await Promise.all([
            googleAnalyticsService.getOverview(startDate, endDate),
            googleAnalyticsService.getTrafficOverview(startDate, endDate),
            googleAnalyticsService.getTrafficSources(startDate, endDate),
            googleAnalyticsService.getTopLandingPages(startDate, endDate),
            googleAnalyticsService.getTopProducts(startDate, endDate),
            googleAnalyticsService.getDeviceData(startDate, endDate),
            googleAnalyticsService.getGeographicData(startDate, endDate),
            googleAnalyticsService.getRealtimeUsers(),
        ]);

        const dashboardResult = {
            isConfigured: true,
            status: 'Connected',
            updatedAt: new Date().toISOString(),
            realtimeUsers,
            overview,
            trafficOverview,
            trafficSources,
            topPages,
            topProducts,
            devices,
            geo,
        };

        // Cache historical reports for 5 minutes
        analyticsCache.set(cacheKey, dashboardResult, 300);

        return res.json({ ...dashboardResult, isCached: false });
    } catch (error) {
        console.error('Error fetching GA4 Dashboard data (Falling back to demo mode):', error.message);
        return res.json({
            isConfigured: true,
            isDemoData: true,
            status: 'Demo Mode',
            message: `API Error: ${error.message}. Showing demonstration analytics data.`,
            updatedAt: new Date().toISOString(),
            realtimeUsers: 14,
            overview: {
                activeUsers: 12450,
                newUsers: 8920,
                sessions: 15320,
                engagementRate: '68.4%',
                avgEngagementTime: '2m 14s',
                pageViews: 32840,
                eventCount: 64200,
                conversions: 842,
                totalRevenue: 124500,
            },
            trafficOverview: [
                { date: 'Aug 04', users: 380, sessions: 450, views: 920 },
                { date: 'Aug 05', users: 410, sessions: 490, views: 1050 },
                { date: 'Aug 06', users: 390, sessions: 470, views: 980 },
                { date: 'Aug 07', users: 460, sessions: 540, views: 1210 },
                { date: 'Aug 08', users: 520, sessions: 610, views: 1420 },
                { date: 'Aug 09', users: 480, sessions: 580, views: 1300 },
                { date: 'Aug 10', users: 590, sessions: 690, views: 1580 },
                { date: 'Aug 11', users: 630, sessions: 740, views: 1690 },
            ],
            trafficSources: [
                { channel: 'Organic Search', users: 5230, sessions: 6420, conversions: 380 },
                { channel: 'Direct', users: 3480, sessions: 4100, conversions: 260 },
                { channel: 'Organic Social', users: 1890, sessions: 2240, conversions: 110 },
                { channel: 'Referral', users: 1120, sessions: 1390, conversions: 62 },
                { channel: 'Paid Search', users: 730, sessions: 890, conversions: 30 },
            ],
            topPages: [
                { page: '/products', users: 4210, sessions: 5120, views: 11400, engagementRate: '74.2%', conversions: 320 },
                { page: '/product/wood-pressed-groundnut-oil-1l', users: 2840, sessions: 3290, views: 6810, engagementRate: '81.5%', conversions: 210 },
                { page: '/blog/wood-pressed-groundnut-oil-culinary-guide', users: 1950, sessions: 2180, views: 3420, engagementRate: '69.0%', conversions: 85 },
                { page: '/product/pure-cold-pressed-sesame-oil', users: 1620, sessions: 1890, views: 3910, engagementRate: '78.4%', conversions: 140 },
                { page: '/blog/how-marachekku-wood-pressing-retains-aroma', users: 1210, sessions: 1350, views: 2100, engagementRate: '66.2%', conversions: 42 },
            ],
            topProducts: [
                { productName: 'Wood Pressed Groundnut Oil (1 Litre)', views: 4820, addToCarts: 1240, purchases: 412, revenue: 53560 },
                { productName: 'Pure Cold Pressed Sesame (Gingelly) Oil (1 Litre)', views: 3410, addToCarts: 890, purchases: 284, revenue: 42600 },
                { productName: 'Traditional Wood Pressed Coconut Oil (1 Litre)', views: 2890, addToCarts: 670, purchases: 198, revenue: 23760 },
                { productName: 'A2 Desi Cow Ghee (500ml)', views: 1840, addToCarts: 430, purchases: 148, revenue: 10360 },
            ],
            devices: [
                { device: 'mobile', users: 8470, sessions: 10420, engagementRate: '67.2%' },
                { device: 'desktop', users: 3580, sessions: 4410, engagementRate: '72.8%' },
                { device: 'tablet', users: 400, sessions: 490, engagementRate: '61.0%' },
            ],
            geo: [
                { country: 'India', city: 'Chennai', users: 4210, sessions: 5180 },
                { country: 'India', city: 'Bengaluru', users: 2840, sessions: 3490 },
                { country: 'India', city: 'Coimbatore', users: 1950, sessions: 2380 },
                { country: 'India', city: 'Hyderabad', users: 1420, sessions: 1720 },
                { country: 'India', city: 'Mumbai', users: 980, sessions: 1190 },
            ],
        });
    }
};

module.exports = {
    getGaConfig,
    updateGaConfig,
    testGaConnection,
    getGaDashboardData,
};
