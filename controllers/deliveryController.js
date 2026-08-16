const { DeliverySetting, Product, Coupon, Cart, CartItem, User } = require('../models');

// Helper to load or initialize default delivery settings
const getOrInitDeliverySettings = async () => {
    let settings = await DeliverySetting.findOne({ where: { isActive: true } });
    if (!settings) {
        settings = await DeliverySetting.create({
            standardDeliveryCharge: 49.00,
            expressDeliveryCharge: 99.00,
            freeDeliveryThreshold: 999.00,
            freeDeliveryEnabled: true,
            expressDeliveryEnabled: false,
            standardDeliveryEnabled: true,
            currencySymbol: '₹',
            isActive: true,
        });
    }
    return settings;
};

// ─── GET /api/delivery/settings ──────────────────────────────────────────────
exports.getDeliverySettings = async (req, res) => {
    try {
        const settings = await getOrInitDeliverySettings();
        return res.json(settings);
    } catch (err) {
        console.error('Error fetching delivery settings:', err);
        return res.status(500).json({ message: 'Failed to load delivery settings' });
    }
};

// ─── PUT /api/admin/delivery/settings ─────────────────────────────────────────
exports.updateDeliverySettings = async (req, res) => {
    try {
        const {
            standardDeliveryCharge,
            expressDeliveryCharge,
            freeDeliveryThreshold,
            freeDeliveryEnabled,
            expressDeliveryEnabled,
            standardDeliveryEnabled,
            currencySymbol
        } = req.body;

        // Validation
        if (standardDeliveryCharge !== undefined && parseFloat(standardDeliveryCharge) < 0) {
            return res.status(400).json({ message: 'Standard delivery charge cannot be negative' });
        }
        if (expressDeliveryCharge !== undefined && parseFloat(expressDeliveryCharge) < 0) {
            return res.status(400).json({ message: 'Express delivery charge cannot be negative' });
        }
        if (freeDeliveryThreshold !== undefined && parseFloat(freeDeliveryThreshold) < 0) {
            return res.status(400).json({ message: 'Free delivery threshold cannot be negative' });
        }

        let settings = await getOrInitDeliverySettings();
        await settings.update({
            standardDeliveryCharge: standardDeliveryCharge !== undefined ? parseFloat(standardDeliveryCharge) : settings.standardDeliveryCharge,
            expressDeliveryCharge: expressDeliveryCharge !== undefined ? parseFloat(expressDeliveryCharge) : settings.expressDeliveryCharge,
            freeDeliveryThreshold: freeDeliveryThreshold !== undefined ? parseFloat(freeDeliveryThreshold) : settings.freeDeliveryThreshold,
            freeDeliveryEnabled: freeDeliveryEnabled !== undefined ? Boolean(freeDeliveryEnabled) : settings.freeDeliveryEnabled,
            expressDeliveryEnabled: expressDeliveryEnabled !== undefined ? Boolean(expressDeliveryEnabled) : settings.expressDeliveryEnabled,
            standardDeliveryEnabled: standardDeliveryEnabled !== undefined ? Boolean(standardDeliveryEnabled) : settings.standardDeliveryEnabled,
            currencySymbol: currencySymbol || settings.currencySymbol || '₹',
        });

        return res.json({ message: 'Delivery settings updated successfully', settings });
    } catch (err) {
        console.error('Error updating delivery settings:', err);
        return res.status(500).json({ message: 'Failed to update delivery settings' });
    }
};

// ─── POST /api/delivery/calculate ───────────────────────────────────────────
exports.calculateCheckoutPricing = async (req, res) => {
    try {
        const { items, couponCode, deliveryMethod = 'Standard' } = req.body;

        let cartItems = [];
        if (items && items.length > 0) {
            cartItems = items;
        } else if (req.user) {
            const user = await User.findOne({
                where: { phone: req.user.phone_number || req.user.phone || '' }
            });
            if (user) {
                const cart = await Cart.findOne({
                    where: { userId: user.id },
                    include: [{ model: CartItem, include: [Product] }]
                });
                if (cart) cartItems = cart.CartItems;
            }
        }

        let subtotal = 0;
        const processedItems = [];

        for (const item of cartItems) {
            const prodId = item.Product ? item.Product.id : (item.productId || item.id);
            const product = await Product.findByPk(prodId);
            if (product) {
                const price = parseFloat(product.price);
                const qty = item.quantity || 1;
                subtotal += price * qty;
                processedItems.push({
                    productId: product.id,
                    name: product.name,
                    price,
                    quantity: qty,
                    itemTotal: price * qty
                });
            }
        }

        // Calculate Coupon Discount
        let discountAmount = 0;
        let appliedCoupon = null;
        if (couponCode && subtotal > 0) {
            const coupon = await Coupon.findOne({ where: { code: couponCode, isActive: true } });
            if (coupon && new Date(coupon.expiryDate) >= new Date()) {
                appliedCoupon = coupon.code;
                if (coupon.discountType === 'percentage') {
                    discountAmount = (subtotal * parseFloat(coupon.value)) / 100;
                } else {
                    discountAmount = parseFloat(coupon.value);
                }
                if (discountAmount > subtotal) discountAmount = subtotal;
            }
        }

        const discountedSubtotal = Math.max(0, subtotal - discountAmount);

        // Fetch Delivery Rules
        const deliveryRules = await getOrInitDeliverySettings();
        let deliveryCharge = 0;
        let isFreeDelivery = false;
        let amountForFreeDelivery = 0;

        const stdCharge = parseFloat(deliveryRules.standardDeliveryCharge);
        const expCharge = parseFloat(deliveryRules.expressDeliveryCharge);
        const freeThreshold = parseFloat(deliveryRules.freeDeliveryThreshold);

        if (subtotal === 0) {
            deliveryCharge = 0;
            isFreeDelivery = false;
            amountForFreeDelivery = freeThreshold;
        } else if (deliveryRules.freeDeliveryEnabled && subtotal >= freeThreshold) {
            deliveryCharge = 0;
            isFreeDelivery = true;
            amountForFreeDelivery = 0;
        } else if (deliveryMethod === 'Express' && deliveryRules.expressDeliveryEnabled) {
            deliveryCharge = expCharge;
            isFreeDelivery = false;
            amountForFreeDelivery = Math.max(0, freeThreshold - subtotal);
        } else {
            deliveryCharge = stdCharge;
            isFreeDelivery = false;
            amountForFreeDelivery = Math.max(0, freeThreshold - subtotal);
        }

        const taxAmount = 0.00; // Tax included or separate
        const totalAmount = Math.max(0, discountedSubtotal + taxAmount + deliveryCharge);

        return res.json({
            subtotal,
            discountAmount,
            appliedCoupon,
            deliveryCharge,
            taxAmount,
            totalAmount,
            deliveryMethod: deliveryMethod === 'Express' && deliveryRules.expressDeliveryEnabled ? 'Express' : 'Standard',
            isFreeDelivery,
            amountForFreeDelivery,
            freeDeliveryThreshold: freeThreshold,
            freeDeliveryEnabled: deliveryRules.freeDeliveryEnabled,
            expressDeliveryEnabled: deliveryRules.expressDeliveryEnabled,
            currencySymbol: deliveryRules.currencySymbol || '₹',
            items: processedItems
        });
    } catch (err) {
        console.error('Error calculating delivery & pricing:', err);
        return res.status(500).json({ message: 'Server error calculating order pricing' });
    }
};

exports.getOrInitDeliverySettings = getOrInitDeliverySettings;
