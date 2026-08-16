const { Order, User, Product, OrderItem, Category, Ad, sequelize } = require('../models');
const { Op } = require('sequelize');

const getDashboardStats = async (req, res) => {
    try {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

        // Define helper for percentage change
        const getGrowth = (current, previous) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return ((current - previous) / previous) * 100;
        };

        // 1. Total Revenue (Lifetime & Monthly)
        // Note: In real app, check paymentStatus = 'paid'
        const totalRevenue = await Order.sum('totalAmount', { where: { status: { [Op.ne]: 'Cancelled' } } }) || 0;
        const currentMonthRevenue = await Order.sum('totalAmount', {
            where: {
                status: { [Op.ne]: 'Cancelled' },
                createdAt: { [Op.gte]: startOfMonth }
            }
        }) || 0;
        const lastMonthRevenue = await Order.sum('totalAmount', {
            where: {
                status: { [Op.ne]: 'Cancelled' },
                createdAt: { [Op.between]: [startOfLastMonth, endOfLastMonth] }
            }
        }) || 0;

        // 2. Orders
        const totalOrders = await Order.count();
        const currentMonthOrders = await Order.count({ where: { createdAt: { [Op.gte]: startOfMonth } } });
        const lastMonthOrders = await Order.count({ where: { createdAt: { [Op.between]: [startOfLastMonth, endOfLastMonth] } } });

        // 3. Users
        const totalUsers = await User.count({ where: { role: 'user' } });
        const currentMonthUsers = await User.count({ where: { role: 'user', createdAt: { [Op.gte]: startOfMonth } } });

        // 4. Products
        const totalProducts = await Product.count();
        const lowStockProducts = await Product.count({ where: { stock: { [Op.lt]: 5 } } });

        res.json({
            revenue: {
                total: totalRevenue,
                currentMonth: currentMonthRevenue,
                growth: getGrowth(currentMonthRevenue, lastMonthRevenue)
            },
            orders: {
                total: totalOrders,
                currentMonth: currentMonthOrders,
                growth: getGrowth(currentMonthOrders, lastMonthOrders)
            },
            users: {
                total: totalUsers,
                newThisMonth: currentMonthUsers
            },
            products: {
                total: totalProducts,
                lowStock: lowStockProducts
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching dashboard stats' });
    }
};

const getSalesChart = async (req, res) => {
    try {
        // Daily Sales for last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const salesData = await Order.findAll({
            attributes: [
                [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
                [sequelize.fn('SUM', sequelize.col('totalAmount')), 'revenue'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'orders']
            ],
            where: {
                createdAt: { [Op.gte]: thirtyDaysAgo },
                status: { [Op.ne]: 'Cancelled' }
            },
            group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
            order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']],
            raw: true
        });

        res.json(salesData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching chart data' });
    }
};

const getTopProducts = async (req, res) => {
    try {
        // This requires joining OrderItems and grouping by Product
        // Sequelize complex query
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
            order: [[sequelize.literal('totalSold'), 'DESC']],
            limit: 5
        });

        res.json(topProducts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching top products' });
    }
};

const getCategoryDistribution = async (req, res) => {
    try {
        const distribution = await Product.findAll({
            attributes: [
                [sequelize.col('SubCategory.Category.name'), 'categoryName'],
                [sequelize.fn('COUNT', sequelize.col('Product.id')), 'productCount']
            ],
            include: [{
                model: require('../models').SubCategory,
                attributes: [], // We only need joined col
                include: [{
                    model: require('../models').Category,
                    attributes: []
                }]
            }],
            group: ['SubCategory.Category.id', 'SubCategory.Category.name'],
            raw: true
        });
        res.json(distribution);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching category distribution' });
    }
};

module.exports = {
    getDashboardStats,
    getSalesChart,
    getTopProducts,
    getCategoryDistribution
};
