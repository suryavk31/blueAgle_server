const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SeoGlobalSetting = sequelize.define('SeoGlobalSetting', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    siteName: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'BlueAgle - Organic & Wood Pressed Essentials',
    },
    defaultTitle: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'BlueAgle | Organic & Wood-Pressed Grocery Essentials',
    },
    titleTemplate: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: '%s | BlueAgle',
    },
    defaultDescription: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: 'Shop pure wood pressed oils, organic A2 desi ghee, honey, nuts, and authentic grocery staples delivered to your doorstep.',
    },
    defaultKeywords: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: 'wood pressed oil, organic grocery, cold pressed coconut oil, pure ghee, blueagle',
    },
    defaultOgImage: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: '/logo.png',
    },
    defaultTwitterImage: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: '/logo.png',
    },
    defaultRobots: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'index, follow',
    },
    defaultAuthor: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'BlueAgle Organics Team',
    },
    defaultLanguage: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'en',
    },
    defaultThemeColor: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: '#3c006b',
    },
    defaultFavicon: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: '/favicon.ico',
    },
    organizationSchema: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    websiteSchema: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    robotsTxtCustomRules: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /checkout\nDisallow: /cart\nDisallow: /profile`,
    },
    // Local Business & Store Schema Fields
    businessName: {
        type: DataTypes.STRING,
        defaultValue: 'BlueAgle Organic Oil Mill',
    },
    streetAddress: {
        type: DataTypes.STRING,
        defaultValue: '123 Mill Road, Main Market',
    },
    addressLocality: {
        type: DataTypes.STRING,
        defaultValue: 'Erode',
    },
    addressRegion: {
        type: DataTypes.STRING,
        defaultValue: 'Tamil Nadu',
    },
    postalCode: {
        type: DataTypes.STRING,
        defaultValue: '638001',
    },
    addressCountry: {
        type: DataTypes.STRING,
        defaultValue: 'IN',
    },
    telephone: {
        type: DataTypes.STRING,
        defaultValue: '+91 98765 43210',
    },
    priceRange: {
        type: DataTypes.STRING,
        defaultValue: '₹₹',
    },
    openingHours: {
        type: DataTypes.STRING,
        defaultValue: 'Mo-Sa 09:00-19:00',
    },
    latitude: {
        type: DataTypes.STRING,
        defaultValue: '11.3410',
    },
    longitude: {
        type: DataTypes.STRING,
        defaultValue: '77.7172',
    },
    googleBusinessProfileUrl: {
        type: DataTypes.STRING,
        allowNull: true,
    },
}, {
    timestamps: true,
    tableName: 'seo_global_settings'
});

module.exports = SeoGlobalSetting;
