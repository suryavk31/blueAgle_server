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
        const range = req.query.range || '30d';
        let days = 30;
        if (range === '7d') days = 7;
        else if (range === '90d') days = 90;
        else if (range === '1y') days = 365;

        const startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        startDate.setDate(startDate.getDate() - (days - 1));

        // 1. Fetch sales grouped by date
        const salesData = await Order.findAll({
            attributes: [
                [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
                [sequelize.fn('SUM', sequelize.col('totalAmount')), 'revenue'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'orders']
            ],
            where: {
                createdAt: { [Op.gte]: startDate },
                status: { [Op.ne]: 'Cancelled' }
            },
            group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
            order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']],
            raw: true
        });

        // 2. Map date string -> { revenue, orders }
        const salesMap = {};
        salesData.forEach(r => {
            const dateStr = typeof r.date === 'string'
                ? r.date.split('T')[0]
                : new Date(r.date).toISOString().split('T')[0];
            salesMap[dateStr] = {
                revenue: Number(r.revenue) || 0,
                orders: Number(r.orders) || 0
            };
        });

        // 3. Fill every calendar date so the chart is never empty or jagged
        const continuousData = [];
        const curr = new Date(startDate);
        const today = new Date();
        today.setHours(23, 59, 59, 999);

        while (curr <= today) {
            const dateStr = curr.toISOString().split('T')[0];
            const dataPoint = salesMap[dateStr] || { revenue: 0, orders: 0 };
            continuousData.push({
                date: dateStr,
                revenue: dataPoint.revenue,
                orders: dataPoint.orders
            });
            curr.setDate(curr.getDate() + 1);
        }

        res.json(continuousData);
    } catch (error) {
        console.error('Error fetching sales chart:', error);
        res.status(500).json({ message: 'Error fetching chart data' });
    }
};

const getTopProducts = async (req, res) => {
    try {
        // This requires joining OrderItems and grouping by Product
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
        const { Category, SubCategory, Product, OrderItem } = require('../models');

        // 1. Fetch all categories
        const categories = await Category.findAll({
            attributes: ['id', 'name'],
            raw: true
        });

        // 2. Fetch product count per category
        const prodCounts = await Product.findAll({
            attributes: [
                [sequelize.col('SubCategory.categoryId'), 'categoryId'],
                [sequelize.fn('COUNT', sequelize.col('Product.id')), 'productCount']
            ],
            include: [{ model: SubCategory, attributes: [] }],
            group: ['SubCategory.categoryId'],
            raw: true
        });
        const prodCountMap = {};
        prodCounts.forEach(p => {
            if (p.categoryId) prodCountMap[p.categoryId] = Number(p.productCount) || 0;
        });

        // 3. Fetch sales revenue & units sold per category from order items
        const salesCounts = await OrderItem.findAll({
            attributes: [
                [sequelize.col('Product.SubCategory.categoryId'), 'categoryId'],
                [sequelize.fn('SUM', sequelize.col('OrderItem.quantity')), 'unitsSold'],
                [sequelize.fn('SUM', sequelize.literal('OrderItem.price * OrderItem.quantity')), 'revenue']
            ],
            include: [{
                model: Product,
                attributes: [],
                include: [{ model: SubCategory, attributes: [] }]
            }],
            group: ['Product.SubCategory.categoryId'],
            raw: true
        });
        const salesMap = {};
        salesCounts.forEach(s => {
            if (s.categoryId) {
                salesMap[s.categoryId] = {
                    unitsSold: Number(s.unitsSold) || 0,
                    revenue: Number(s.revenue) || 0
                };
            }
        });

        // 4. Combine into unified distribution objects
        const distribution = categories.map(cat => ({
            categoryId: cat.id,
            categoryName: cat.name || 'Uncategorized',
            productCount: prodCountMap[cat.id] || 0,
            revenue: salesMap[cat.id]?.revenue || 0,
            unitsSold: salesMap[cat.id]?.unitsSold || 0
        })).sort((a, b) => (b.revenue - a.revenue) || (b.productCount - a.productCount));

        res.json(distribution);
    } catch (error) {
        console.error('Error fetching category distribution:', error);
        res.status(500).json({ message: 'Error fetching category distribution' });
    }
};

module.exports = {
    getDashboardStats,
    getSalesChart,
    getTopProducts,
    getCategoryDistribution
};
