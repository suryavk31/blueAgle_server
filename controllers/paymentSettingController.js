const { PaymentSetting, ActivityLog } = require('../models');

// Helper to load or initialize default Payment & Tax settings
const getOrInitPaymentSettings = async (transaction = null) => {
    const options = transaction ? { transaction } : {};
    let settings = await PaymentSetting.findOne({
        where: { isActive: true },
        ...options
    });

    if (!settings) {
        settings = await PaymentSetting.create({
            paymentGatewayFeePercentage: 2.00,
            paymentGatewayFeeGstPercentage: 18.00,
            tdsPercentage: 1.00,
            isActive: true,
        }, options);
    }

    return settings;
};

// GET /api/admin/payment-settings
const getPaymentSettings = async (req, res) => {
    try {
        const settings = await getOrInitPaymentSettings();
        return res.json({
            paymentGatewayFeePercentage: parseFloat(settings.paymentGatewayFeePercentage),
            paymentGatewayFeeGstPercentage: parseFloat(settings.paymentGatewayFeeGstPercentage),
            tdsPercentage: parseFloat(settings.tdsPercentage),
            updatedAt: settings.updatedAt,
        });
    } catch (error) {
        console.error('Error fetching payment settings:', error);
        return res.status(500).json({ message: 'Failed to load Payment & Tax settings' });
    }
};

// PUT /api/admin/payment-settings
const updatePaymentSettings = async (req, res) => {
    try {
        const {
            paymentGatewayFeePercentage,
            paymentGatewayFeeGstPercentage,
            tdsPercentage,
        } = req.body;

        // Strict numeric validation
        const validateRate = (val, fieldName) => {
            if (val === undefined || val === null || val === '') {
                throw new Error(`${fieldName} cannot be empty`);
            }
            const num = Number(val);
            if (isNaN(num) || !isFinite(num)) {
                throw new Error(`${fieldName} must be a valid number`);
            }
            if (num < 0 || num > 100) {
                throw new Error(`${fieldName} must be between 0.00% and 100.00%`);
            }
            return Math.round((num + Number.EPSILON) * 100) / 100;
        };

        const parsedGatewayFee = validateRate(paymentGatewayFeePercentage, 'Payment Gateway Fee');
        const parsedGstFee = validateRate(paymentGatewayFeeGstPercentage, 'GST on Gateway Fee');
        const parsedTds = validateRate(tdsPercentage, 'TDS');

        let settings = await getOrInitPaymentSettings();
        const prevValues = {
            fee: parseFloat(settings.paymentGatewayFeePercentage),
            gst: parseFloat(settings.paymentGatewayFeeGstPercentage),
            tds: parseFloat(settings.tdsPercentage),
        };

        await settings.update({
            paymentGatewayFeePercentage: parsedGatewayFee,
            paymentGatewayFeeGstPercentage: parsedGstFee,
            tdsPercentage: parsedTds,
        });

        // Audit Logging if ActivityLog exists
        if (ActivityLog && req.adminUser) {
            try {
                await ActivityLog.create({
                    adminUserId: req.adminUser.id,
                    action: 'UPDATE_PAYMENT_SETTINGS',
                    module: 'Settings',
                    details: JSON.stringify({
                        previous: prevValues,
                        updated: {
                            paymentGatewayFeePercentage: parsedGatewayFee,
                            paymentGatewayFeeGstPercentage: parsedGstFee,
                            tdsPercentage: parsedTds,
                        },
                    }),
                    ipAddress: req.ip || req.connection?.remoteAddress,
                });
            } catch (auditErr) {
                console.warn('ActivityLog record skipped:', auditErr.message);
            }
        }

        return res.json({
            message: 'Payment & Tax settings updated successfully',
            settings: {
                paymentGatewayFeePercentage: parsedGatewayFee,
                paymentGatewayFeeGstPercentage: parsedGstFee,
                tdsPercentage: parsedTds,
                updatedAt: settings.updatedAt,
            },
        });
    } catch (error) {
        console.error('Error updating payment settings:', error.message);
        return res.status(400).json({ message: error.message || 'Failed to update Payment & Tax settings' });
    }
};

module.exports = {
    getOrInitPaymentSettings,
    getPaymentSettings,
    updatePaymentSettings,
};
