require('dotenv').config();
const { Blog, sequelize } = require('../models');
const { runSeoSync } = require('../services/seoSyncEngine');

async function seedPhase6() {
    await sequelize.sync();

    const articles = [
        {
            title: 'How Wooden Marachekku Extraction Preserves Natural Viscosity & Aroma',
            slug: 'how-marachekku-wood-pressing-retains-aroma',
            category: 'Extraction & Quality',
            author: 'BlueAgle Editorial Team',
            readTime: '6 min read',
            excerpt: 'Explore how cold pressing oilseeds using wooden Chekku crushers prevents frictional heat buildup, keeping natural aromas intact.',
            content: '<h3>The Mechanical Advantage of Wooden Chekku Crushers</h3><p>Traditional Marachekku mills use dense Vagai (East Indian Walnut) or neem wood rotators. Because wood is a natural thermal insulator, friction between the pestle and oilseed generates minimal heat, keeping extraction temperatures consistently below 45°C.</p><h3>Why High Heat Degradation Occurs in Expeller Oils</h3><p>Modern high-speed steel expellers operate under extreme pressure and heat exceeding 120°C. This high friction strips volatile aroma compounds and alters natural viscosity. Wooden cold pressing avoids heat denaturation completely.</p><h3>How to Identify Genuine Marachekku Oil</h3><ul><li><strong>Color & Viscosity:</strong> Deep natural golden hue with natural sedimentation at the bottom.</li><li><strong>Aroma:</strong> Distinct, unbleached nutty fragrance characteristic of raw seeds.</li><li><strong>Texture:</strong> Slightly rich and viscous, coating the palate cleanly.</li></ul>',
            image: 'https://ik.imagekit.io/mbioov6us/project_one/Cold_Pressed_Groundnut_Oil_-_500ml_i9aZOmd2Z.jpg',
            status: 'Published',
            metaTitle: 'How Wooden Marachekku Extraction Preserves Aroma & Quality | BlueAgle',
            metaDescription: 'Discover why traditional wooden Marachekku cold pressing retains rich aroma and natural viscosity without high heat or chemical bleaching.',
            metaKeywords: 'marachekku oil extraction, wood pressed oil benefits, traditional oil mill, cold pressed groundnut oil aroma',
            isIndexed: true
        },
        {
            title: 'The Ultimate Culinary Guide to Wood Pressed Groundnut Oil in Indian Cooking',
            slug: 'wood-pressed-groundnut-oil-culinary-guide',
            category: 'Culinary & Cooking',
            author: 'BlueAgle Editorial Team',
            readTime: '5 min read',
            excerpt: 'Learn how the high smoke point and deep nutty flavor of wood pressed groundnut oil elevate deep frying, pakoras, and daily tempering.',
            content: '<h3>Why Wood Pressed Groundnut Oil is a South Indian Kitchen Staple</h3><p>Groundnut oil has been the backbone of traditional Indian cooking for generations. When unrefined and cold-pressed, it brings a rich peanut aroma and high thermal stability that makes it ideal for deep frying and high-heat cooking.</p><h3>Cooking Smoke Point (~225°C)</h3><p>With a natural smoke point around 225°C, wood pressed groundnut oil handles deep frying (samosas, pakoras, vada) without smoking or breaking down easily.</p><h3>Best Culinary Applications</h3><ul><li><strong>Deep Frying:</strong> Yields crispy, non-greasy fried items with authentic taste.</li><li><strong>Tadka / Tempering:</strong> Enhances mustard seeds, curry leaves, and dried red chillies in dal and sambar.</li><li><strong>Dosa & Paratha Coating:</strong> Provides a rich golden crispiness when brushed onto tawa dishes.</li></ul>',
            image: 'https://ik.imagekit.io/mbioov6us/project_one/Cold_Pressed_Groundnut_Oil_-_500ml_i9aZOmd2Z.jpg',
            status: 'Published',
            metaTitle: 'Culinary Uses of Wood Pressed Groundnut Oil | BlueAgle Guide',
            metaDescription: 'Learn how to cook, deep fry, and temper dishes using traditional wood pressed groundnut oil. Smoke point guide and Indian recipe pairing tips.',
            metaKeywords: 'wood pressed groundnut oil cooking, deep frying oil Indian recipes, peanut oil smoke point, marachekku groundnut oil',
            isIndexed: true
        },
        {
            title: 'Why Palm Jaggery is Used in Traditional Sesame (Gingelly) Oil Extraction',
            slug: 'why-palm-jaggery-is-used-in-sesame-oil',
            category: 'Heritage & Ingredients',
            author: 'BlueAgle Editorial Team',
            readTime: '4 min read',
            excerpt: 'Discover the century-old South Indian technique of adding pure palm jaggery during sesame seed crushing to balance natural bitterness.',
            content: '<h3>The Heritage of Nalla Ennai (Traditional Gingelly Oil)</h3><p>In South Indian oil milling heritage, cold pressed sesame oil extracted with palm jaggery is known as Nalla Ennai (meaning "Good Oil"). Adding a small proportion of authentic unrefined palm jaggery during crushing is a vital craft step.</p><h3>Dual Purpose of Palm Jaggery in the Chekku</h3><ul><li><strong>Neutralizing Bitterness:</strong> Raw black sesame seeds contain natural tannins in their hull. Palm jaggery rounds off sharp pungency while enhancing pleasant nuttiness.</li><li><strong>Binding the Seed Mass:</strong> Jaggery helps bind crushed sesame seeds inside the wooden Chekku basin, allowing smoother oil release.</li></ul><h3>Culinary & Cultural Importance</h3><p>Jaggery-extracted sesame oil is prized for spicy South Indian gravies like Vatha Kuzhambu, Kara Kuzhambu, and traditional idli podi dip.</p>',
            image: 'https://ik.imagekit.io/mbioov6us/project_one/Cold_Pressed_Groundnut_Oil_-_500ml_i9aZOmd2Z.jpg',
            status: 'Published',
            metaTitle: 'Why Palm Jaggery is Added to Cold Pressed Sesame Oil | BlueAgle',
            metaDescription: 'Learn why traditional Marachekku sesame (gingelly) oil uses palm jaggery during extraction. Heritage process, taste balance, and culinary uses.',
            metaKeywords: 'palm jaggery sesame oil, traditional gingelly oil, nalla ennai, marachekku sesame oil process',
            isIndexed: true
        },
        {
            title: 'How to Properly Store Cold Pressed Oils to Maintain Freshness & Shelf Life',
            slug: 'how-to-store-cold-pressed-oils-shelf-life-guide',
            category: 'Storage & Care',
            author: 'BlueAgle Editorial Team',
            readTime: '4 min read',
            excerpt: 'Essential tips for storing unrefined cold pressed oils in dark glass or stainless steel containers away from direct sunlight and heat.',
            content: '<h3>Understanding Unrefined Oil Stability</h3><p>Because cold pressed oils contain zero chemical preservatives, anti-foaming agents, or synthetic antioxidants, proper storage is essential to maintain their natural freshness over 6 to 9 months.</p><h3>Best Storage Practices</h3><ul><li><strong>Keep Away from Direct Sunlight:</strong> UV light accelerates oxidation. Store oil bottles inside a cool, dark kitchen pantry.</li><li><strong>Use Stainless Steel or Glass:</strong> Metal oil dispensers (stainless steel) or dark amber glass bottles prevent light exposure and reactive degradation.</li><li><strong>Seal Caps Tightly:</strong> Oxygen exposure leads to gradual loss of aroma. Ensure bottle caps are closed firmly after every use.</li><li><strong>Temperature Control:</strong> Store at ambient room temperature (20°C–30°C). Avoid keeping oil containers directly beside hot gas stoves.</li></ul>',
            image: 'https://ik.imagekit.io/mbioov6us/project_one/Cold_Pressed_Groundnut_Oil_-_500ml_i9aZOmd2Z.jpg',
            status: 'Published',
            metaTitle: 'How to Store Cold Pressed Oils & Extend Shelf Life | BlueAgle',
            metaDescription: 'Comprehensive guide to storing unrefined cold pressed groundnut, sesame, and coconut oils. Prevent oxidation and preserve natural freshness.',
            metaKeywords: 'how to store cold pressed oil, shelf life of unrefined oil, storing marachekku coconut oil, preserving natural oil',
            isIndexed: true
        },
        {
            title: 'A2 Desi Cow Ghee vs Regular Commercial Ghee: Texture, Aroma & Culinary Uses',
            slug: 'a2-desi-cow-ghee-vs-regular-ghee-guide',
            category: 'Dairy & Ghee Guides',
            author: 'BlueAgle Editorial Team',
            readTime: '6 min read',
            excerpt: 'Understand how traditional bilona curd-churned A2 desi cow ghee differs from commercial cream-separated ghee in granular texture and nutty aroma.',
            content: '<h3>What Makes A2 Desi Cow Ghee Unique?</h3><p>Authentic A2 Desi Ghee is prepared exclusively from the milk of indigenous Indian cow breeds (Gir, Sahiwal, Kankrej) containing the A2 beta-casein protein. The traditional Bilona method involves boiling fresh milk, setting curd, hand-churning butter (makhan), and slow-clarifying it over low heat.</p><h3>Bilona Method vs Industrial Separator Method</h3><ul><li><strong>Bilona Method:</strong> Curd-churned butter is gently melted into aromatic golden ghee with rich granular (danedar) texture.</li><li><strong>Industrial Method:</strong> Heavy centrifuges separate raw cream from milk, which is heated directly at high temperature without curd fermentation.</li></ul><h3>Culinary Application</h3><p>Add a spoon of A2 Bilona Ghee to hot steamed rice, dal tadka, rotis, and traditional Indian sweets for unmatchable aroma and rich flavor.</p>',
            image: 'https://ik.imagekit.io/mbioov6us/project_one/Cold_Pressed_Groundnut_Oil_-_500ml_i9aZOmd2Z.jpg',
            status: 'Published',
            metaTitle: 'A2 Desi Cow Ghee vs Regular Ghee: Differences & Uses | BlueAgle',
            metaDescription: 'Discover the differences between traditional Bilona A2 Desi Cow Ghee and commercial cream-separated ghee. Learn production methods, texture, and aroma.',
            metaKeywords: 'a2 desi cow ghee vs regular ghee, bilona ghee process, traditional Indian ghee, authentic desi ghee aroma',
            isIndexed: true
        }
    ];

    let createdCount = 0;
    for (const art of articles) {
        const [b, created] = await Blog.findOrCreate({
            where: { slug: art.slug },
            defaults: art
        });
        if (created) createdCount++;
    }

    console.log(`Phase 6 Seeding: ${createdCount} new articles created.`);

    console.log('Running SEO Sync Engine...');
    const res = await runSeoSync({ triggeredBy: 'phase_6_seed' });
    console.log('SEO Sync Result:', res);
}

seedPhase6().catch(err => console.error(err));
