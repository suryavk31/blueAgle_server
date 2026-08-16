const { sequelize, User, Category, SubCategory, Product, Ad, Policy } = require('./models');
const bcrypt = require('bcryptjs');

const seedDatabase = async () => {
    try {
        await sequelize.sync({ force: true });
        console.log('Database synced!');

        // 1. Create Admin User
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);

        await User.create({
            username: 'Admin User',
            email: 'admin@blueeagle.com',
            password: hashedPassword,
            phone: '9999999999',
            role: 'admin'
        });
        console.log('Admin user created: admin@blueeagle.com / admin123');

        // 2. Create Categories
        const coldPressed = await Category.create({ name: 'Cold Pressed Oils', image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcdbf41?auto=format&fit=crop&w=500&q=60' });
        const ghee = await Category.create({ name: 'A2 Ghee & Fats', image: 'https://images.unsplash.com/photo-1631451095765-2c91616fc9e6?auto=format&fit=crop&w=500&q=60' });
        const honey = await Category.create({ name: 'Honey & Sweeteners', image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=500&q=60' });
        const nuts = await Category.create({ name: 'Nuts & Seeds', image: 'https://images.unsplash.com/photo-1596450516757-12c8502395f7?auto=format&fit=crop&w=500&q=60' });

        // 3. Create SubCategories
        const groundnut = await SubCategory.create({ name: 'Groundnut Oil', categoryId: coldPressed.id });
        const coconut = await SubCategory.create({ name: 'Coconut Oil', categoryId: coldPressed.id });
        const sesame = await SubCategory.create({ name: 'Sesame Oil', categoryId: coldPressed.id });
        const mustard = await SubCategory.create({ name: 'Mustard Oil', categoryId: coldPressed.id });

        const cowGhee = await SubCategory.create({ name: 'Cow Ghee', categoryId: ghee.id });
        const rawHoney = await SubCategory.create({ name: 'Raw Honey', categoryId: honey.id });

        // 4. Create Products
        const products = [
            {
                name: 'Wood Pressed Groundnut Oil (1L)',
                description: '100% Pure, crushed in wooden Chekku. Rich in aroma and nutrients.',
                price: 360,
                stock: 100,
                subCategoryId: groundnut.id,
                images: ['https://images.unsplash.com/photo-1474979266404-7eaacbcdbf41?auto=format&fit=crop&w=500&q=60']
            },
            {
                name: 'Wood Pressed Groundnut Oil (5L)',
                description: 'Bulk pack of pure wood pressed groundnut oil. Best value.',
                price: 1750,
                stock: 50,
                subCategoryId: groundnut.id,
                images: ['https://images.unsplash.com/photo-1474979266404-7eaacbcdbf41?auto=format&fit=crop&w=500&q=60']
            },
            {
                name: 'Cold Pressed Coconut Oil (500ml)',
                description: 'Made from premium sulpher-free copra. Great for cooking and hair.',
                price: 220,
                stock: 80,
                subCategoryId: coconut.id,
                images: ['https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=500&q=60']
            },
            {
                name: 'Virgin Coconut Oil (200ml)',
                description: 'Extracted from fresh coconut milk. Ideal for baby massage.',
                price: 350,
                stock: 40,
                subCategoryId: coconut.id,
                images: ['https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=500&q=60']
            },
            {
                name: 'Black Sesame Oil (1L)',
                description: 'Traditional Gingelly oil, made from black sesame seeds.',
                price: 480,
                stock: 60,
                subCategoryId: sesame.id,
                images: ['https://images.unsplash.com/photo-1627883201469-6f564e9a8f9e?auto=format&fit=crop&w=500&q=60']
            },
            {
                name: 'Yellow Mustard Oil (1L)',
                description: 'Kachi Ghani Mustard Oil. Pungent and authentic flavor.',
                price: 290,
                stock: 70,
                subCategoryId: mustard.id,
                images: ['https://images.unsplash.com/photo-1474979266404-7eaacbcdbf41?auto=format&fit=crop&w=500&q=60']
            },
            {
                name: 'Pure A2 Desi Cow Ghee (500ml)',
                description: 'Bilona method ghee from free-grazing indigenous cows.',
                price: 1100,
                stock: 30,
                subCategoryId: cowGhee.id,
                images: ['https://images.unsplash.com/photo-1631451095765-2c91616fc9e6?auto=format&fit=crop&w=500&q=60']
            },
            {
                name: 'Buffalo Ghee (1L)',
                description: 'Rich and granular buffalo ghee. Perfect for sweets.',
                price: 850,
                stock: 45,
                subCategoryId: cowGhee.id,
                images: ['https://images.unsplash.com/photo-1631451095765-2c91616fc9e6?auto=format&fit=crop&w=500&q=60']
            },
            {
                name: 'Wild Forest Honey (500g)',
                description: 'Unprocessed, raw honey collected from deep forests.',
                price: 450,
                stock: 90,
                subCategoryId: rawHoney.id,
                images: ['https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=500&q=60']
            }
        ];

        for (const p of products) {
            await Product.create(p);
        }
        console.log('Sample products created');

        // 5. Create Ads (Banners)
        await Ad.create({
            title: 'Purity You Can Trust',
            type: 'banner',
            mediaType: 'image',
            mediaUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcdbf41?auto=format&fit=crop&w=1200&q=80',
            location: 'home-top',
            isActive: true,
            redirectUrl: '/products'
        });

        await Ad.create({
            title: 'Traditionally Wood Pressed',
            type: 'banner',
            mediaType: 'image',
            mediaUrl: 'https://images.unsplash.com/photo-1615485925822-7529419100f6?auto=format&fit=crop&w=1200&q=80',
            location: 'home-middle',
            isActive: true,
            redirectUrl: '/products?category=' + coldPressed.id
        });

        console.log('Sample ads created');

        // 6. Create Policies (From JSON)
        try {
            const policies = require('./data/policies.json');
            for (const policy of policies) {
                await Policy.create({
                    type: policy.type,
                    content: policy.content
                });
            }
            console.log('Policies created');
        } catch (e) {
            console.warn("Policy data not found, skipping.");
        }


        process.exit();
    } catch (error) {
        console.error('Seeding error:', error);
        process.exit(1);
    }
};

seedDatabase();
