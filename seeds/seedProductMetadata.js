const {
    sequelize, Product, ProductHighlight, ProductSpecification,
    ProductBadge, ProductCertification, ProductNutrition
} = require('../models');

async function seedProductMetadata() {
    try {
        await sequelize.sync();
        console.log('✅ Database connected');

        const coconutOil = await Product.findOne({ where: { name: { [require('sequelize').Op.like]: '%Coconut Oil%' } } });
        if (!coconutOil) {
            console.log('⚠️ Coconut Oil product not found, skipping specific seed');
            return;
        }

        console.log(`Found product: ${coconutOil.name} (ID: ${coconutOil.id})`);

        // Update core product fields
        await coconutOil.update({
            brand: 'BlueAgle Organic',
            shortDescription: '100% Pure Extra Virgin Cold Pressed Unrefined Coconut Oil',
            deliveryTime: '10 Min Delivery',
            shippingMethod: 'Express Local Delivery',
            codAvailable: true,
            expressDelivery: true,
            returnEligible: true,
            replacementEligible: true,
            isBestSeller: true,
            isFeatured: true,
            rating: 4.8,
            reviewCount: 120,
            ingredients: ['100% Pure Cold Pressed Coconut Extract'],
            benefits: [
                'Extracted using traditional wooden chekku method',
                'Zero chemical processing, hexane-free & unbleached',
                'Rich in Lauric Acid and Medium Chain Triglycerides (MCTs)',
                'Ideal for healthy cooking, hair care, and skin moisturizing'
            ],
            usageInstructions: [
                'For Cooking: Use for sautéing, baking, or deep frying',
                'For Hair Care: Apply directly to hair & scalp 30 mins before washing',
                'For Skin: Massage gently onto damp skin for natural hydration'
            ]
        });

        // 1. Highlights
        await ProductHighlight.destroy({ where: { productId: coconutOil.id } });
        await ProductHighlight.bulkCreate([
            { productId: coconutOil.id, icon: 'FaLeaf', title: '100% Organic & Natural', description: 'Cold pressed without heat', sortOrder: 1 },
            { productId: coconutOil.id, icon: 'FaShieldAlt', title: 'Chemical Free Processing', description: 'Zero added preservatives', sortOrder: 2 },
            { productId: coconutOil.id, icon: 'FaCheckCircle', title: 'Lab Tested for Purity', description: 'Certified pure & unadulterated', sortOrder: 3 },
            { productId: coconutOil.id, icon: 'FaTruck', title: '10 Min Delivery', description: 'Instant doorstep fulfillment', sortOrder: 4 },
        ]);

        // 2. Specifications
        await ProductSpecification.destroy({ where: { productId: coconutOil.id } });
        await ProductSpecification.bulkCreate([
            { productId: coconutOil.id, groupName: 'Product Info', specKey: 'Extraction Method', specValue: 'Traditional Cold Pressed (Wooden Chekku)', sortOrder: 1 },
            { productId: coconutOil.id, groupName: 'Product Info', specKey: 'Shelf Life', specValue: '12 Months', sortOrder: 2 },
            { productId: coconutOil.id, groupName: 'Product Info', specKey: 'Country of Origin', specValue: 'India (Tamil Nadu)', sortOrder: 3 },
            { productId: coconutOil.id, groupName: 'Product Info', specKey: 'Storage Instructions', specValue: 'Store in a cool, dry place away from direct sunlight', sortOrder: 4 },
        ]);

        // 3. Certifications
        await ProductCertification.destroy({ where: { productId: coconutOil.id } });
        await ProductCertification.bulkCreate([
            { productId: coconutOil.id, title: 'FSSAI License', certificateNumber: '12421008000456' },
            { productId: coconutOil.id, title: 'Organic India Certified', certificateNumber: 'ORG-IND-2026-88' },
        ]);

        // 4. Badges
        await ProductBadge.destroy({ where: { productId: coconutOil.id } });
        await ProductBadge.bulkCreate([
            { productId: coconutOil.id, badgeText: 'Organic', color: '#10b981' },
            { productId: coconutOil.id, badgeText: 'Best Seller', color: '#f59e0b' },
        ]);

        // 5. Nutrition Facts
        await ProductNutrition.destroy({ where: { productId: coconutOil.id } });
        await ProductNutrition.bulkCreate([
            { productId: coconutOil.id, nutrient: 'Energy', amount: '899 kcal', dailyValue: '45%' },
            { productId: coconutOil.id, nutrient: 'Total Fat', amount: '99.8g', dailyValue: '128%' },
            { productId: coconutOil.id, nutrient: 'Saturated Fat', amount: '86.5g', dailyValue: '432%' },
            { productId: coconutOil.id, nutrient: 'Lauric Acid', amount: '48.2g', dailyValue: '—' },
        ]);

        console.log('🎉 Successfully seeded dynamic metadata for Coconut Oil!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    }
}

seedProductMetadata();
