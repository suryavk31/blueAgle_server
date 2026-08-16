/**
 * Seed test orders for a user with phone 5566778899
 * Run: node seeds/seedTestOrders.js
 */
const { sequelize, User, Product, Order, OrderItem } = require('../models');

const seedTestOrders = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ DB connected');

        // Find user by phone
        const user = await User.findOne({ where: { phone: '+915566778899' } });
        if (!user) {
            // Try without country code
            const user2 = await User.findOne({ where: { phone: '5566778899' } });
            if (!user2) {
                console.log('❌ User with phone 5566778899 not found. Creating one...');
                const newUser = await User.create({
                    name: 'Test User',
                    phone: '+915566778899',
                    firebaseUid: 'test_uid_5566778899',
                    role: 'customer'
                });
                console.log(`✅ Created user: ${newUser.id}`);
                await createOrders(newUser.id);
            } else {
                await createOrders(user2.id);
            }
        } else {
            await createOrders(user.id);
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Seed failed:', err);
        process.exit(1);
    }
};

const createOrders = async (userId) => {
    // Get some products
    const products = await Product.findAll({ limit: 6 });
    if (products.length === 0) {
        console.log('❌ No products found. Please seed products first.');
        return;
    }

    console.log(`📦 Found ${products.length} products. Creating test orders...`);

    // Order 1: Delivered
    const order1 = await Order.create({
        userId,
        totalAmount: 899.00,
        status: 'Delivered',
        paymentStatus: 'Paid',
        paymentId: 'pay_test_delivered_001',
        address: {
            label: 'Home',
            flatNo: '42-B, Sunrise Apartments',
            floor: '3rd Floor',
            area: 'MG Road, Koramangala',
            landmark: 'Near Forum Mall',
            contactName: 'Test User',
            contactPhone: '5566778899'
        }
    });
    // Add items to order 1
    const items1 = products.slice(0, 3);
    for (const prod of items1) {
        await OrderItem.create({
            orderId: order1.id,
            productId: prod.id,
            price: prod.price,
            quantity: 2
        });
    }
    console.log(`✅ Order #${order1.id} created (Delivered)`);

    // Order 2: Processing
    const order2 = await Order.create({
        userId,
        totalAmount: 1249.50,
        status: 'Processing',
        paymentStatus: 'Paid',
        paymentId: 'pay_test_processing_002',
        address: {
            label: 'Work',
            flatNo: 'Office 305, TechPark',
            floor: '3rd Floor',
            area: 'Whitefield, Bangalore',
            landmark: 'Opposite ITPL',
            contactName: 'Test User',
            contactPhone: '5566778899'
        }
    });
    const items2 = products.slice(2, 5);
    for (const prod of items2) {
        await OrderItem.create({
            orderId: order2.id,
            productId: prod.id,
            price: prod.price,
            quantity: 1
        });
    }
    console.log(`✅ Order #${order2.id} created (Processing)`);

    // Order 3: Shipped
    const order3 = await Order.create({
        userId,
        totalAmount: 549.00,
        status: 'Shipped',
        paymentStatus: 'Paid',
        paymentId: 'pay_test_shipped_003',
        address: {
            label: 'Home',
            flatNo: '42-B, Sunrise Apartments',
            floor: '3rd Floor',
            area: 'MG Road, Koramangala',
            landmark: 'Near Forum Mall',
            contactName: 'Test User',
            contactPhone: '5566778899'
        }
    });
    const items3 = products.slice(0, 2);
    for (const prod of items3) {
        await OrderItem.create({
            orderId: order3.id,
            productId: prod.id,
            price: prod.price,
            quantity: 3
        });
    }
    console.log(`✅ Order #${order3.id} created (Shipped)`);

    // Order 4: Pending (older order)
    const order4 = await Order.create({
        userId,
        totalAmount: 399.00,
        status: 'Pending',
        paymentStatus: 'Pending',
        paymentId: null,
        address: {
            label: 'Home',
            flatNo: '42-B, Sunrise Apartments',
            floor: '3rd Floor',
            area: 'MG Road, Koramangala',
            landmark: 'Near Forum Mall',
            contactName: 'Test User',
            contactPhone: '5566778899'
        }
    });
    if (products.length > 0) {
        await OrderItem.create({
            orderId: order4.id,
            productId: products[0].id,
            price: products[0].price,
            quantity: 1
        });
    }
    console.log(`✅ Order #${order4.id} created (Pending)`);

    console.log('\n🎉 All test orders seeded successfully!');
};

seedTestOrders();
