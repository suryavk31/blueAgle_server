// ─── Load Environment Variables FIRST ───────────────────────────────────────
// config/env.js selects .env.local (development) or .env (production)
// based on NODE_ENV. Must be required before any other module reads process.env.
require('./config/env');

const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { sequelize } = require('./models');

// ─── Production startup validation ───────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
    process.env.PORT = process.env.PORT || '5000';
    process.env.FRONTEND_URL = process.env.FRONTEND_URL || process.env.SITE_URL || process.env.CLIENT_URL || 'https://blueeagle.in';

    const requiredEnvVars = [
        'DB_HOST',
        'DB_NAME',
        'DB_USER',
        'DB_PASS',
        'JWT_SECRET',
        'ADMIN_JWT_SECRET',
        'ALLOWED_ORIGINS',
        'SITE_URL',
    ];
    const missing = requiredEnvVars.filter((key) => !process.env[key]);
    if (missing.length > 0) {
        // Log each missing variable individually for clarity
        missing.forEach((key) => {
            console.error(`[STARTUP] Missing required production environment variable: ${key}`);
        });
        throw new Error(`Server cannot start in production mode with missing environment variables in Render/Cloud dashboard: ${missing.join(', ')}`);
    }
}

// ─── Development DB Safety Guard ──────────────────────────────────────────────
// Prevent development mode from accidentally connecting to a cloud/production DB.
if (process.env.NODE_ENV === 'development') {
    const dbHost = process.env.DB_HOST || '';
    const prodHostPattern = /\.(rds\.amazonaws\.com|planetscale\.com|supabase\.co|railway\.app|neon\.tech|digitalocean\.com|aiven\.io)/i;
    if (prodHostPattern.test(dbHost)) {
        console.error(`[SAFETY] Development mode cannot connect to a cloud/production DB host: ${dbHost}`);
        console.error('[SAFETY] If you intend to connect to production, set NODE_ENV=production and use npm start.');
        process.exit(1);
    }
}

const app = express();

// ─── Security Headers (Helmet) ────────────────────────────────────────────────
app.use(helmet({
    // Allow cross-origin images served from ImageKit CDN
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:5173'];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, server-to-server)
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        callback(new Error(`CORS: Origin '${origin}' not allowed.`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Compression ──────────────────────────────────────────────────────────────
app.use(compression());

// ─── Request Logging ──────────────────────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
// Strict limiter for authentication endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many login attempts. Please try again after 15 minutes.' },
});

// General API limiter
const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests. Please slow down.' },
});

app.use('/api/auth/login', authLimiter);
app.use('/api/admin/auth/login', authLimiter);
app.use('/api/admin/auth/forgot-password', authLimiter);
app.use('/api/', apiLimiter);

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files (uploaded images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Customer Routes ──────────────────────────────────────────────────────────
const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const couponRoutes = require('./routes/couponRoutes');
const orderRoutes = require('./routes/orderRoutes');
const policyRoutes = require('./routes/policyRoutes');
const userRoutes = require('./routes/userRoutes');
const adRoutes = require('./routes/adRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const addressRoutes = require('./routes/addressRoutes');
const seoRoutes = require('./routes/seoRoutes');
const blogRoutes = require('./routes/blogRoutes');
const productAttributeRoutes = require('./routes/productAttributeRoutes');
const { generateSitemap } = require('./controllers/sitemapController');
const { generateRobotsTxt } = require('./controllers/robotsController');

const accountDeletionRoutes = require('./routes/accountDeletionRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/account', accountDeletionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ads', adRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/seo', seoRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/product-attributes', productAttributeRoutes);

// ─── Admin RBAC Routes ────────────────────────────────────────────────────────
const adminAuthRoutes = require('./routes/adminAuthRoutes');
const adminUsersRoutes = require('./routes/adminUsersRoutes');
const rolesRoutes = require('./routes/rolesRoutes');
const modulesRoutes = require('./routes/modulesRoutes');
const permissionsRoutes = require('./routes/permissionsRoutes');
const invitationsRoutes = require('./routes/invitationsRoutes');
const activityLogsRoutes = require('./routes/activityLogsRoutes');
const invoiceBuilderRoutes = require('./routes/invoiceBuilderRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');
const paymentSettingRoutes = require('./routes/paymentSettingRoutes');

app.use('/api/delivery', deliveryRoutes);
app.use('/api/admin/delivery', deliveryRoutes);
app.use('/api/admin/payment-settings', paymentSettingRoutes);
app.use('/api/payment-settings', paymentSettingRoutes);
app.use('/api/invoice', invoiceBuilderRoutes);
app.use('/api/admin/invoice', invoiceBuilderRoutes);
app.use('/api/admin/invoice-builder', invoiceBuilderRoutes);

app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/users', adminUsersRoutes);
app.use('/api/admin/roles', rolesRoutes);
app.use('/api/admin/modules', modulesRoutes);
app.use('/api/admin/permissions', permissionsRoutes);
app.use('/api/admin/invitations', invitationsRoutes);
app.use('/api/admin/activity-logs', activityLogsRoutes);

// ─── Resource Routes (Admin Aliases for adminApi) ─────────────────────────────
app.use('/api/admin/analytics', analyticsRoutes);
app.use('/api/admin/products', productRoutes);
app.use('/api/admin/categories', categoryRoutes);
app.use('/api/admin/orders', orderRoutes);
app.use('/api/admin/coupons', couponRoutes);
app.use('/api/admin/ads', adRoutes);
app.use('/api/admin/policies', policyRoutes);
app.use('/api/admin/seo', seoRoutes);
app.use('/api/admin/blogs', blogRoutes);
app.use('/api/admin/customer-users', userRoutes);
app.use('/api/admin/product-attributes', productAttributeRoutes);

// ─── SEO & Sitemap ────────────────────────────────────────────────────────────
const socialCrawlerMiddleware = require('./middleware/socialCrawlerMiddleware');
app.use(socialCrawlerMiddleware);

app.get('/sitemap.xml', generateSitemap);
app.get('/robots.txt', generateRobotsTxt);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'BlueAgle API Service Operational' });
});

// ─── Centralized Error Handling ───────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err);
    res.status(err.status || 500).json({
        message: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ─── Database Connection and Server Start ────────────────────────────────────
const PORT = process.env.PORT || 5000;

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Production:   sequelize.authenticate() — verify connection only.
 *               Never auto-sync in production. Schema changes must be done
 *               via explicit migrations to avoid ER_FK_DUP_NAME and data loss.
 *
 * Development:  sequelize.sync() — auto-create/update tables for convenience.
 */
const dbStartup = isProduction
    ? sequelize.authenticate()
    : sequelize.sync();

dbStartup
    .then(() => {
        const mode = isProduction ? 'connected' : 'connected & synced';
        console.log(`Database ${mode} successfully.`);
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
        });
    })
    .catch((err) => {
        console.error('Database connection error:', err);
        process.exit(1);
    });
