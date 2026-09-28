require('../config/env');
const { sequelize, User, Product, Order, Category, SubCategory } = require('../models');
const { notifyAdminNewOrder } = require('../services/notificationService');

async function testOrderPlacement() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // Find or create test customer user
        let user = await User.findOne({ where: { phone: '9876543210' } });
        if (!user) {
            user = await User.create({
                username: 'Order Tester',
                phone: '9876543210',
                email: 'testcustomer@example.com',
                role: 'user',
            });
        }

        // Find or create category & product
        let cat = await Category.findOne();
        if (!cat) {
            cat = await Category.create({ name: 'Cold Pressed Oils', slug: 'cold-pressed-oils' });
        }
        let subcat = await SubCategory.findOne({ where: { categoryId: cat.id } });
        if (!subcat) {
            subcat = await SubCategory.create({ name: 'Wood Pressed', categoryId: cat.id, slug: 'wood-pressed' });
        }

        let product = await Product.findOne();
        if (!product) {
            product = await Product.create({
                name: 'Organic Sesame Oil 1L',
                price: 450,
                stock: 100,
                subCategoryId: subcat.id,
                sku: 'SESAME-1L',
            });
        }

        // Place test COD order
        const order = await Order.create({
            userId: user.id,
            subtotal: 450,
            discountAmount: 0,
            deliveryCharge: 0,
            taxAmount: 0,
            totalAmount: 450,
            deliveryMethod: 'Standard',
            paymentStatus: 'Pending',
            paymentMethod: 'COD',
            status: 'Processing',
            address: {
                street: '123 Test Street',
                city: 'Chennai',
                state: 'Tamil Nadu',
                pincode: '600001',
            },
        });

        console.log(`✓ Test Order created successfully! Order ID: ${order.id}`);

        // Trigger notification
        await notifyAdminNewOrder({
            orderId: order.id,
            orderNumber: `#${String(order.id).padStart(6, '0')}`,
            customerName: user.username,
            totalAmount: order.totalAmount,
            paymentMethod: 'COD',
            createdAt: order.createdAt,
        });

        console.log('✓ notifyAdminNewOrder executed without breaking order creation.');

        // Clean up test order
        await Order.destroy({ where: { id: order.id } });
        console.log('✓ Cleaned up test order.');

        process.exit(0);
    } catch (err) {
        console.error('❌ Order placement test failed:', err);
        process.exit(1);
    }
}

testOrderPlacement();
