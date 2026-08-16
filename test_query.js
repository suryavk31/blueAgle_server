const { OrderItem, Product, sequelize } = require('d:/Project_One/server/models');

async function test() {
    try {
        const topProducts = await OrderItem.findAll({
            attributes: [
                'productId',
                [sequelize.fn('SUM', sequelize.col('OrderItem.quantity')), 'totalSold'],
                [sequelize.fn('SUM', sequelize.literal('OrderItem.price * OrderItem.quantity')), 'totalRevenue']
            ],
            include: [{
                model: Product,
                attributes: ['name', 'price', 'images']
            }],
            group: ['productId', 'Product.id'],
            order: [[sequelize.literal('"totalSold"'), 'DESC']],
            limit: 5
        });
        console.log("Success:", topProducts);
    } catch(e) {
        console.error("Failed:", e.message);
    }
}
test();
