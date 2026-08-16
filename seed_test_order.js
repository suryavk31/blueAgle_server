const { Order, OrderItem, Product, User, Address } = require('./models');

const seedOrder = async () => {
    try {
        const admin = await User.findOne({ where: { email: 'admin@blueeagle.com' } });
        const product = await Product.findOne();
        
        // Create an address first
        const [address] = await Address.findOrCreate({
            where: { userId: admin.id },
            defaults: {
                flatNo: 'Admin HQ',
                area: 'Tech Park',
                contactName: 'Admin',
                contactPhone: '9999999999',
                isDefault: true
            }
        });

        const order = await Order.create({
            userId: admin.id,
            totalAmount: product.price,
            paymentStatus: 'Paid',
            status: 'Processing',
            address: {
                flatNo: 'Admin HQ',
                area: 'Tech Park',
                contactName: 'Admin',
                contactPhone: '9999999999'
            }
        });

        await OrderItem.create({
            orderId: order.id,
            productId: product.id,
            quantity: 1,
            price: product.price
        });

        console.log(`Test order ${order.id} created for admin`);
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

seedOrder();
