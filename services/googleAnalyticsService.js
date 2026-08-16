const { BetaAnalyticsDataClient } = require('@google-analytics/data');
const { GaSetting } = require('../models');

/**
 * GoogleAnalyticsService
 * Centralized service to handle GA4 Data API authentication, reporting, and connection validation.
 */
class GoogleAnalyticsService {
    /**
     * Resolves credentials and initializes BetaAnalyticsDataClient
     * Checks: 1) Passed options 2) GaSetting database record 3) Environment variables
     */
    async getClientAndProperty(overrideConfig = null) {
        let propertyId = overrideConfig?.propertyId;
        let measurementId = overrideConfig?.measurementId;
        let serviceAccountEmail = overrideConfig?.serviceAccountEmail;
        let privateKey = overrideConfig?.privateKey;

        // Fetch from database if not overridden
        if (!propertyId || !serviceAccountEmail || !privateKey) {
            const dbSetting = await GaSetting.findOne();
            if (dbSetting) {
                propertyId = propertyId || dbSetting.propertyId;
                measurementId = measurementId || dbSetting.measurementId;
                serviceAccountEmail = serviceAccountEmail || dbSetting.serviceAccountEmail;
                privateKey = privateKey || dbSetting.privateKey;
            }
        }

        // Fallback to process.env
        propertyId = propertyId || process.env.GOOGLE_ANALYTICS_PROPERTY_ID;
        measurementId = measurementId || process.env.GOOGLE_ANALYTICS_MEASUREMENT_ID;
        serviceAccountEmail = serviceAccountEmail || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
        privateKey = privateKey || process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

        if (!propertyId) {
            throw new Error('GA4 Property ID is not configured. Please configure it in Settings -> Google Analytics.');
        }

        if (!serviceAccountEmail || !privateKey) {
            throw new Error('Google Service Account credentials (email/privateKey) are missing or incomplete.');
        }

        // Format multiline private key safely
        const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

        const analyticsDataClient = new BetaAnalyticsDataClient({
            credentials: {
                client_email: serviceAccountEmail,
                private_key: formattedPrivateKey,
            },
        });

        return {
            client: analyticsDataClient,
            propertyId: propertyId.trim(),
            measurementId: measurementId ? measurementId.trim() : '',
            serviceAccountEmail,
        };
    }

    /**
     * Test connection to GA4 property
     */
    async testConnection(configOverride = null) {
        try {
            const { client, propertyId, serviceAccountEmail } = await this.getClientAndProperty(configOverride);

            const [response] = await client.runReport({
                property: `properties/${propertyId}`,
                dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
                metrics: [{ name: 'activeUsers' }],
            });

            return {
                success: true,
                propertyId,
                serviceAccountEmail,
                status: 'Connected',
                message: 'Successfully authenticated & retrieved test data from GA4 Property.',
                rowCount: response.rows ? response.rows.length : 0,
            };
        } catch (error) {
            console.error('GA4 Connection Test Failed:', error.message);

            let diagnosticError = 'Failed to connect to Google Analytics 4.';
            if (error.message.includes('PERMISSIONS') || error.message.includes('403') || error.message.includes('permission')) {
                diagnosticError = 'Permission denied: Please grant "Viewer" or "Analyst" access to the Service Account email in GA4 Property Settings.';
            } else if (error.message.includes('NOT_FOUND') || error.message.includes('404')) {
                diagnosticError = 'GA4 Property ID not found. Verify the numeric Property ID (e.g. 123456789).';
            } else if (error.message.includes('invalid_grant') || error.message.includes('private_key')) {
                diagnosticError = 'Invalid Service Account private key or authentication signature failed.';
            } else if (error.message) {
                diagnosticError = error.message;
            }

            return {
                success: false,
                status: 'Error',
                message: diagnosticError,
            };
        }
    }

    /**
     * Fetch Overview KPI Metrics
     */
    async getOverview(startDate = '30daysAgo', endDate = 'today') {
        const { client, propertyId } = await this.getClientAndProperty();

        const [response] = await client.runReport({
            property: `properties/${propertyId}`,
            dateRanges: [{ startDate, endDate }],
            metrics: [
                { name: 'activeUsers' },
                { name: 'newUsers' },
                { name: 'sessions' },
                { name: 'engagementRate' },
                { name: 'userEngagementDuration' },
                { name: 'screenPageViews' },
                { name: 'eventCount' },
                { name: 'conversions' },
                { name: 'totalRevenue' },
            ],
        });

        const row = response.rows && response.rows[0] ? response.rows[0].metricValues : [];
        const getValue = (idx) => (row[idx] ? parseFloat(row[idx].value) || 0 : 0);

        const activeUsers = getValue(0);
        const newUsers = getValue(1);
        const sessions = getValue(2);
        const engagementRate = (getValue(3) * 100).toFixed(1);
        const totalDurationSec = getValue(4);
        const avgEngagementTime = activeUsers > 0 ? (totalDurationSec / activeUsers).toFixed(0) : 0;
        const pageViews = getValue(5);
        const eventCount = getValue(6);
        const conversions = getValue(7);
        const totalRevenue = getValue(8);

        return {
            activeUsers,
            newUsers,
            sessions,
            engagementRate: `${engagementRate}%`,
            avgEngagementTime: `${avgEngagementTime}s`,
            pageViews,
            eventCount,
            conversions,
            totalRevenue,
        };
    }

    /**
     * Fetch Daily Traffic Overview
     */
    async getTrafficOverview(startDate = '30daysAgo', endDate = 'today') {
        const { client, propertyId } = await this.getClientAndProperty();

        const [response] = await client.runReport({
            property: `properties/${propertyId}`,
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: 'date' }],
            metrics: [
                { name: 'activeUsers' },
                { name: 'sessions' },
                { name: 'screenPageViews' },
            ],
            orderBys: [{ dimension: { dimensionName: 'date' } }],
        });

        const rows = (response.rows || []).map(r => ({
            date: r.dimensionValues[0].value,
            users: parseInt(r.metricValues[0].value, 10) || 0,
            sessions: parseInt(r.metricValues[1].value, 10) || 0,
            views: parseInt(r.metricValues[2].value, 10) || 0,
        }));

        return rows;
    }

    /**
     * Fetch Traffic Sources
     */
    async getTrafficSources(startDate = '30daysAgo', endDate = 'today') {
        const { client, propertyId } = await this.getClientAndProperty();

        const [response] = await client.runReport({
            property: `properties/${propertyId}`,
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: 'sessionDefaultChannelGroup' }],
            metrics: [
                { name: 'activeUsers' },
                { name: 'sessions' },
                { name: 'conversions' },
            ],
            limit: 10,
        });

        const rows = (response.rows || []).map(r => ({
            channel: r.dimensionValues[0].value || 'Unassigned',
            users: parseInt(r.metricValues[0].value, 10) || 0,
            sessions: parseInt(r.metricValues[1].value, 10) || 0,
            conversions: parseInt(r.metricValues[2].value, 10) || 0,
        }));

        return rows;
    }

    /**
     * Fetch Top Landing Pages
     */
    async getTopLandingPages(startDate = '30daysAgo', endDate = 'today') {
        const { client, propertyId } = await this.getClientAndProperty();

        const [response] = await client.runReport({
            property: `properties/${propertyId}`,
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: 'landingPagePlusQueryString' }],
            metrics: [
                { name: 'activeUsers' },
                { name: 'sessions' },
                { name: 'screenPageViews' },
                { name: 'engagementRate' },
                { name: 'conversions' },
            ],
            limit: 15,
        });

        const rows = (response.rows || []).map(r => ({
            page: r.dimensionValues[0].value || '/',
            users: parseInt(r.metricValues[0].value, 10) || 0,
            sessions: parseInt(r.metricValues[1].value, 10) || 0,
            views: parseInt(r.metricValues[2].value, 10) || 0,
            engagementRate: `${(parseFloat(r.metricValues[3].value || 0) * 100).toFixed(1)}%`,
            conversions: parseInt(r.metricValues[4].value, 10) || 0,
        }));

        return rows;
    }

    /**
     * Fetch Top E-Commerce Products
     */
    async getTopProducts(startDate = '30daysAgo', endDate = 'today') {
        const { client, propertyId } = await this.getClientAndProperty();

        try {
            const [response] = await client.runReport({
                property: `properties/${propertyId}`,
                dateRanges: [{ startDate, endDate }],
                dimensions: [{ name: 'itemName' }],
                metrics: [
                    { name: 'itemsViewed' },
                    { name: 'itemsAddedToCart' },
                    { name: 'itemsPurchased' },
                    { name: 'itemRevenue' },
                ],
                limit: 15,
            });

            const rows = (response.rows || []).map(r => ({
                productName: r.dimensionValues[0].value || 'Unknown Product',
                views: parseInt(r.metricValues[0].value, 10) || 0,
                addToCarts: parseInt(r.metricValues[1].value, 10) || 0,
                purchases: parseInt(r.metricValues[2].value, 10) || 0,
                revenue: parseFloat(r.metricValues[3].value || 0),
            }));

            return rows;
        } catch (err) {
            console.warn('GA4 Product Ecommerce Report Note:', err.message);
            return [];
        }
    }

    /**
     * Fetch Device Category Breakdown
     */
    async getDeviceData(startDate = '30daysAgo', endDate = 'today') {
        const { client, propertyId } = await this.getClientAndProperty();

        const [response] = await client.runReport({
            property: `properties/${propertyId}`,
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: 'deviceCategory' }],
            metrics: [
                { name: 'activeUsers' },
                { name: 'sessions' },
                { name: 'engagementRate' },
            ],
        });

        const rows = (response.rows || []).map(r => ({
            device: r.dimensionValues[0].value || 'desktop',
            users: parseInt(r.metricValues[0].value, 10) || 0,
            sessions: parseInt(r.metricValues[1].value, 10) || 0,
            engagementRate: `${(parseFloat(r.metricValues[2].value || 0) * 100).toFixed(1)}%`,
        }));

        return rows;
    }

    /**
     * Fetch Geographic Data
     */
    async getGeographicData(startDate = '30daysAgo', endDate = 'today') {
        const { client, propertyId } = await this.getClientAndProperty();

        const [response] = await client.runReport({
            property: `properties/${propertyId}`,
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: 'country' }, { name: 'city' }],
            metrics: [
                { name: 'activeUsers' },
                { name: 'sessions' },
            ],
            limit: 10,
        });

        const rows = (response.rows || []).map(r => ({
            country: r.dimensionValues[0].value || 'India',
            city: r.dimensionValues[1].value || 'Unknown',
            users: parseInt(r.metricValues[0].value, 10) || 0,
            sessions: parseInt(r.metricValues[1].value, 10) || 0,
        }));

        return rows;
    }

    /**
     * Fetch Real-Time Active Users (last 30 minutes)
     */
    async getRealtimeUsers() {
        try {
            const { client, propertyId } = await this.getClientAndProperty();

            const [response] = await client.runRealtimeReport({
                property: `properties/${propertyId}`,
                metrics: [{ name: 'activeUsers' }],
            });

            const activeUsers = response.rows && response.rows[0] && response.rows[0].metricValues[0]
                ? parseInt(response.rows[0].metricValues[0].value, 10) || 0
                : 0;

            return activeUsers;
        } catch (err) {
            console.warn('Realtime GA4 API Error:', err.message);
            return 0;
        }
    }
}

module.exports = new GoogleAnalyticsService();
