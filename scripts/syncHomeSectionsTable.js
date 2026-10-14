require('../config/env');
const { sequelize, HomeSection } = require('../models');

const DEFAULT_INITIAL_SECTIONS = [
    {
        title: 'Fresh Arrivals',
        subtitle: 'Handpicked organic & wood pressed essentials',
        filterType: 'all',
        sortOrder: 1,
        limit: 10,
        colorClass: 'text-gray-900',
        seeAllLink: '/products',
        isActive: true,
    },
    {
        title: 'Your Daily Needs',
        subtitle: 'Pure & natural kitchen staples',
        filterType: 'all',
        sortOrder: 2,
        limit: 10,
        colorClass: 'text-[#3c006b]',
        seeAllLink: '/products',
        isActive: true,
    },
    {
        title: 'Explore New',
        subtitle: 'Recently added premium items',
        filterType: 'new_arrival',
        sortOrder: 3,
        limit: 10,
        colorClass: 'text-gray-900',
        seeAllLink: '/products',
        isActive: true,
    },
];

async function syncHomeSectionsTable() {
    try {
        await sequelize.authenticate();
        console.log('Database connected successfully.');

        await HomeSection.sync({ alter: true });
        console.log('Table `home_sections` is synced and ready.');

        const count = await HomeSection.count();
        if (count === 0) {
            await HomeSection.bulkCreate(DEFAULT_INITIAL_SECTIONS);
            console.log('Seeded 3 initial default home sections.');
        } else {
            console.log(`Table currently contains ${count} section(s).`);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error syncing `home_sections` table:', error);
        process.exit(1);
    }
}

syncHomeSectionsTable();
