require('./config/env');
const { Product, sequelize } = require('./models');

async function verifyAll() {
    console.log('================================================================');
    console.log('VERIFICATION SUITE: Product Model JSON Serialization/Deserialization');
    console.log('================================================================\n');

    let allPassed = true;
    function assert(condition, message) {
        if (condition) {
            console.log(`  ✅ PASS: ${message}`);
        } else {
            console.error(`  ❌ FAIL: ${message}`);
            allPassed = false;
        }
    }

    // ─── 1. Existing Product from Database ────────────────────────────────────
    console.log('[Test 1] Inspecting existing product from database...');
    const existingProduct = await Product.findOne();
    if (existingProduct) {
        assert(Array.isArray(existingProduct.images), `images is Array: ${JSON.stringify(existingProduct.images)}`);
        assert(Array.isArray(existingProduct.tags), `tags is Array: ${JSON.stringify(existingProduct.tags)}`);
        assert(Array.isArray(existingProduct.ingredients), `ingredients is Array: ${JSON.stringify(existingProduct.ingredients)}`);
        assert(Array.isArray(existingProduct.benefits), `benefits is Array: ${JSON.stringify(existingProduct.benefits)}`);
        assert(Array.isArray(existingProduct.usageInstructions), `usageInstructions is Array: ${JSON.stringify(existingProduct.usageInstructions)}`);
        assert(
            typeof existingProduct.customAttributes === 'object' && !Array.isArray(existingProduct.customAttributes) && existingProduct.customAttributes !== null,
            `customAttributes is Object: ${JSON.stringify(existingProduct.customAttributes)}`
        );

        const json = existingProduct.toJSON();
        assert(Array.isArray(json.images), 'existingProduct.toJSON().images is Array');
        assert(Array.isArray(json.tags), 'existingProduct.toJSON().tags is Array');
        assert(typeof json.customAttributes === 'object' && !Array.isArray(json.customAttributes), 'existingProduct.toJSON().customAttributes is Object');

        // Verify array .map() works (as React frontend does)
        const mappedUrls = existingProduct.images.map(img => img.toUpperCase());
        assert(Array.isArray(mappedUrls), `existingProduct.images.map() works without error (${mappedUrls.length} items)`);
    } else {
        console.log('  ⚠️ No existing products found in database to inspect.');
    }

    // ─── 2. In-Memory Edge Cases on Product Model ────────────────────────────
    console.log('\n[Test 2] Testing edge cases (null, empty, malformed, primitives, double-str)...');
    
    // Null & empty
    const nullProd = Product.build({ images: null, tags: '', customAttributes: null });
    assert(Array.isArray(nullProd.images) && nullProd.images.length === 0, 'null images becomes []');
    assert(Array.isArray(nullProd.tags) && nullProd.tags.length === 0, 'empty string tags becomes []');
    assert(typeof nullProd.customAttributes === 'object' && Object.keys(nullProd.customAttributes).length === 0, 'null customAttributes becomes {}');

    // Malformed JSON
    const malformedProd = Product.build({ images: '[invalid json', customAttributes: '{bad json' });
    assert(Array.isArray(malformedProd.images) && malformedProd.images.length === 0, 'malformed JSON images safely becomes []');
    assert(typeof malformedProd.customAttributes === 'object' && Object.keys(malformedProd.customAttributes).length === 0, 'malformed JSON customAttributes safely becomes {}');

    // Unexpected primitives
    const primitiveProd = Product.build({ images: 12345, tags: true, customAttributes: 'just a string' });
    assert(Array.isArray(primitiveProd.images) && primitiveProd.images.length === 0, 'numeric images safely becomes []');
    assert(Array.isArray(primitiveProd.tags) && primitiveProd.tags.length === 0, 'boolean tags safely becomes []');
    assert(typeof primitiveProd.customAttributes === 'object' && Object.keys(primitiveProd.customAttributes).length === 0, 'primitive string customAttributes safely becomes {}');

    // Already parsed types
    const parsedProd = Product.build({ images: ['https://img.com/1.jpg'], customAttributes: { country: 'IN' } });
    assert(Array.isArray(parsedProd.images) && parsedProd.images[0] === 'https://img.com/1.jpg', 'already parsed array preserved');
    assert(parsedProd.customAttributes.country === 'IN', 'already parsed object preserved');

    // Double-stringified JSON
    const doubleStrProd = Product.build({
        images: JSON.stringify(JSON.stringify(['https://img.com/double.jpg'])),
        customAttributes: JSON.stringify(JSON.stringify({ nested: 'yes' }))
    });
    assert(Array.isArray(doubleStrProd.images) && doubleStrProd.images[0] === 'https://img.com/double.jpg', 'double-stringified array unwrapped correctly');
    assert(doubleStrProd.customAttributes.nested === 'yes', 'double-stringified object unwrapped correctly');

    // ─── 3. Database Transaction: Create, FindByPk, Update, Save ─────────────
    console.log('\n[Test 3] Testing database operations in transaction (create, findByPk, update, save)...');
    const t = await sequelize.transaction();
    try {
        const testPayload = {
            name: '__Automated Test Product__',
            price: 250.00,
            images: ['https://example.com/test1.jpg', 'https://example.com/test2.jpg'],
            tags: ['Cold Pressed', 'Automated Test'],
            ingredients: ['Pure Oil Seed'],
            benefits: ['Good Health', 'Pure'],
            usageInstructions: ['Consume with meals'],
            customAttributes: { packaging: 'Glass Bottle', purityGrade: 'A+' },
        };

        const created = await Product.create(testPayload, { transaction: t });
        assert(created.id > 0, `Product.create succeeded with id ${created.id}`);
        assert(Array.isArray(created.images), 'created.images is Array');
        assert(Array.isArray(created.tags), 'created.tags is Array');
        assert(typeof created.customAttributes === 'object', 'created.customAttributes is Object');

        // Check raw database storage to ensure valid JSON string (NO double-stringifying)
        const [rawDbRows] = await sequelize.query(
            'SELECT images, tags, ingredients, benefits, usageInstructions, customAttributes FROM products WHERE id = ?',
            { replacements: [created.id], transaction: t }
        );
        const rawRow = rawDbRows[0];
        assert(rawRow.images !== null, 'raw DB images is not null');
        // If rawRow.images is string or json, it must parse cleanly to the original array
        const parsedDbImages = typeof rawRow.images === 'string' ? JSON.parse(rawRow.images) : rawRow.images;
        assert(Array.isArray(parsedDbImages) && parsedDbImages.length === 2, `DB stored valid JSON array: ${JSON.stringify(rawRow.images)}`);
        assert(parsedDbImages[0] === 'https://example.com/test1.jpg', 'DB stored accurate array contents');

        // Test Product.findByPk()
        const fetched = await Product.findByPk(created.id, { transaction: t });
        assert(Array.isArray(fetched.images), 'Product.findByPk() returned images as Array');
        assert(Array.isArray(fetched.tags), 'Product.findByPk() returned tags as Array');
        assert(Array.isArray(fetched.ingredients), 'Product.findByPk() returned ingredients as Array');
        assert(Array.isArray(fetched.benefits), 'Product.findByPk() returned benefits as Array');
        assert(Array.isArray(fetched.usageInstructions), 'Product.findByPk() returned usageInstructions as Array');
        assert(typeof fetched.customAttributes === 'object', 'Product.findByPk() returned customAttributes as Object');
        assert(fetched.customAttributes.packaging === 'Glass Bottle', 'Product.findByPk() customAttributes content correct');

        // Test Product.toJSON()
        const jsonOutput = fetched.toJSON();
        assert(Array.isArray(jsonOutput.images), 'fetched.toJSON().images is Array');
        assert(typeof jsonOutput.customAttributes === 'object' && !Array.isArray(jsonOutput.customAttributes), 'fetched.toJSON().customAttributes is Object');

        // Test Product.update()
        await Product.update({
            images: ['https://example.com/updated1.jpg'],
            customAttributes: { packaging: 'PET Bottle', updated: true }
        }, { where: { id: created.id }, transaction: t });

        const reloaded = await Product.findByPk(created.id, { transaction: t });
        assert(Array.isArray(reloaded.images) && reloaded.images[0] === 'https://example.com/updated1.jpg', 'Product.update() updated images as Array');
        assert(reloaded.customAttributes.packaging === 'PET Bottle', 'Product.update() updated customAttributes as Object');

        // Test product.save()
        reloaded.images = ['https://example.com/saved_instance.jpg'];
        await reloaded.save({ transaction: t });
        const savedReload = await Product.findByPk(created.id, { transaction: t });
        assert(savedReload.images[0] === 'https://example.com/saved_instance.jpg', 'product.save() persisted and returned Array');

        await t.rollback();
        console.log('  ✅ Database transaction rolled back cleanly. No residual test data.');
    } catch (err) {
        await t.rollback();
        console.error('  ❌ Transaction test failed with error:', err);
        allPassed = false;
    }

    // ─── 4. MariaDB Simulation: Direct String Insertion ───────────────────────
    console.log('\n[Test 4] MariaDB Simulation: Raw JSON string directly inserted into LONGTEXT...');
    const t2 = await sequelize.transaction();
    try {
        const rawJsonString = '["https://ik.imagekit.io/mbioov6us/project_one/Cold_Pressed_Coconut_Oil_-_1L_15Wr1sLJD.jpg"]';
        const [insertRes] = await sequelize.query(
            `INSERT INTO products (name, price, images, tags, ingredients, benefits, usageInstructions, customAttributes, createdAt, updatedAt)
             VALUES ('__MariaDB Sim Product__', 199.00,
             '${rawJsonString}',
             '["Healthy Oil","Coconut Oil"]',
             '["1L Cold Pressed Coconut Oil"]',
             '["Benefit 1","Benefit 2"]',
             '["Use for cooking"]',
             '{"origin":"India","packaging":"Bottle"}',
             NOW(), NOW())`,
            { transaction: t2 }
        );
        const simId = insertRes;

        const simProd = await Product.findByPk(simId, { transaction: t2 });
        assert(Array.isArray(simProd.images), `simProd.images is Array: ${JSON.stringify(simProd.images)}`);
        assert(simProd.images[0] === 'https://ik.imagekit.io/mbioov6us/project_one/Cold_Pressed_Coconut_Oil_-_1L_15Wr1sLJD.jpg', 'Exact user report URL matches');
        assert(Array.isArray(simProd.tags), `simProd.tags is Array: ${JSON.stringify(simProd.tags)}`);
        assert(Array.isArray(simProd.ingredients), `simProd.ingredients is Array: ${JSON.stringify(simProd.ingredients)}`);
        assert(Array.isArray(simProd.benefits), `simProd.benefits is Array: ${JSON.stringify(simProd.benefits)}`);
        assert(Array.isArray(simProd.usageInstructions), `simProd.usageInstructions is Array: ${JSON.stringify(simProd.usageInstructions)}`);
        assert(typeof simProd.customAttributes === 'object' && !Array.isArray(simProd.customAttributes), `simProd.customAttributes is Object: ${JSON.stringify(simProd.customAttributes)}`);

        // Test s.images.map (the frontend line that crashed previously)
        const mapped = simProd.images.map(img => `Formatted: ${img}`);
        assert(mapped.length === 1, `s.images.map worked perfectly: ${mapped[0]}`);

        await t2.rollback();
        console.log('  ✅ MariaDB simulation transaction rolled back cleanly.');
    } catch (err) {
        await t2.rollback();
        console.error('  ❌ MariaDB simulation failed with error:', err);
        allPassed = false;
    }

    console.log('\n================================================================');
    if (allPassed) {
        console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!');
    } else {
        console.error('❌ SOME TESTS FAILED.');
    }
    console.log('================================================================');

    process.exit(allPassed ? 0 : 1);
}

verifyAll().catch(e => {
    console.error('Fatal test error:', e);
    process.exit(1);
});
