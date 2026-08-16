const { sequelize, Order, OrderItem, Product, User, PaymentSetting } = require('../models');
const { calculateOrderPricingInternal } = require('../controllers/orderController');
const { getOrInitPaymentSettings } = require('../controllers/paymentSettingController');

async function runFinancialTestSuite() {
    console.log("=================================================");
    console.log("🚀 EXECUTING FINANCIAL ACCOUNTING SYSTEM TEST SUITE");
    console.log("=================================================\n");

    let passCount = 0;
    let failCount = 0;

    const assertEqual = (actual, expected, testName) => {
        const actualStr = parseFloat(actual).toFixed(2);
        const expectedStr = parseFloat(expected).toFixed(2);
        if (actualStr === expectedStr) {
            console.log(`✅ [PASS] ${testName}: expected ${expectedStr}, got ${actualStr}`);
            passCount++;
        } else {
            console.error(`❌ [FAIL] ${testName}: expected ${expectedStr}, got ${actualStr}`);
            failCount++;
        }
    };

    try {
        await sequelize.authenticate();
        console.log("Database connection authenticated successfully.");

        // Reset Payment Settings to defaults for tests
        let paymentSettings = await getOrInitPaymentSettings();
        await paymentSettings.update({
            paymentGatewayFeePercentage: 2.00,
            paymentGatewayFeeGstPercentage: 18.00,
            tdsPercentage: 1.00,
        });

        // Create or find a test product
        const [testProduct] = await Product.findOrCreate({
            where: { name: 'Financial Test Groundnut Oil' },
            defaults: {
                price: 1000.00,
                costPrice: 600.00,
                stock: 100,
                slug: 'financial-test-groundnut-oil',
                description: 'Test product for financial suite'
            }
        });

        // -----------------------------------------------------------------
        // TEST 1 — ONLINE PAYMENT FORMULA
        // -----------------------------------------------------------------
        console.log("\n--- TEST 1: ONLINE PAYMENT FORMULA ---");
        const onlineCart = [{ Product: testProduct, quantity: 1 }];
        const onlinePricing = await calculateOrderPricingInternal(onlineCart, null, 'Standard', 'Online');

        assertEqual(onlinePricing.totalAmount, 1000.00, "Online Customer Total Amount");
        assertEqual(onlinePricing.productCogs, 600.00, "Online Product COGS");
        assertEqual(onlinePricing.paymentGatewayFeeRate, 2.00, "Online Gateway Fee Rate %");
        assertEqual(onlinePricing.paymentGatewayFee, 20.00, "Online Gateway Fee (₹1000 * 2%)");
        assertEqual(onlinePricing.paymentGatewayGstRate, 18.00, "Online Gateway GST Rate %");
        assertEqual(onlinePricing.paymentGatewayGst, 3.60, "Online Gateway Fee GST (₹20 * 18%)");
        assertEqual(onlinePricing.tdsRate, 1.00, "Online TDS Rate %");
        assertEqual(onlinePricing.tdsAmount, 10.00, "Online TDS (₹1000 * 1%)");
        assertEqual(onlinePricing.totalBusinessDeductions, 33.60, "Online Total Deductions (20 + 3.60 + 10)");
        assertEqual(onlinePricing.netProfit, 366.40, "Online Net Profit (1000 - 600 - 33.60)");

        // -----------------------------------------------------------------
        // TEST 2 — COD ORDER FORMULA
        // -----------------------------------------------------------------
        console.log("\n--- TEST 2: COD ORDER FORMULA ---");
        const codPricing = await calculateOrderPricingInternal(onlineCart, null, 'Standard', 'COD');

        assertEqual(codPricing.totalAmount, 1000.00, "COD Customer Total Amount");
        assertEqual(codPricing.productCogs, 600.00, "COD Product COGS");
        assertEqual(codPricing.paymentGatewayFeeRate, 0.00, "COD Gateway Fee Rate %");
        assertEqual(codPricing.paymentGatewayFee, 0.00, "COD Gateway Fee");
        assertEqual(codPricing.paymentGatewayGstRate, 0.00, "COD Gateway GST Rate %");
        assertEqual(codPricing.paymentGatewayGst, 0.00, "COD Gateway Fee GST");
        assertEqual(codPricing.tdsRate, 1.00, "COD TDS Rate %");
        assertEqual(codPricing.tdsAmount, 10.00, "COD TDS (₹1000 * 1%)");
        assertEqual(codPricing.totalBusinessDeductions, 10.00, "COD Total Deductions");
        assertEqual(codPricing.netProfit, 390.00, "COD Net Profit (1000 - 600 - 10)");

        // -----------------------------------------------------------------
        // TEST 3 — RATE SNAPSHOT
        // -----------------------------------------------------------------
        console.log("\n--- TEST 3: GATEWAY FEE RATE SNAPSHOT ---");
        const orderA_Pricing = await calculateOrderPricingInternal(onlineCart, null, 'Standard', 'Online');
        assertEqual(orderA_Pricing.paymentGatewayFeeRate, 2.00, "Order A Initial Fee Rate");

        // Admin updates rate to 2.50%
        await paymentSettings.update({ paymentGatewayFeePercentage: 2.50 });
        const orderB_Pricing = await calculateOrderPricingInternal(onlineCart, null, 'Standard', 'Online');

        assertEqual(orderA_Pricing.paymentGatewayFeeRate, 2.00, "Order A Preserved Rate (2.00%)");
        assertEqual(orderB_Pricing.paymentGatewayFeeRate, 2.50, "Order B Updated Rate (2.50%)");

        // -----------------------------------------------------------------
        // TEST 4 — GST RATE SNAPSHOT
        // -----------------------------------------------------------------
        console.log("\n--- TEST 4: GST RATE SNAPSHOT ---");
        await paymentSettings.update({ paymentGatewayFeeGstPercentage: 20.00 });
        const orderC_Pricing = await calculateOrderPricingInternal(onlineCart, null, 'Standard', 'Online');
        assertEqual(orderB_Pricing.paymentGatewayGstRate, 18.00, "Previous Order Preserved GST Rate (18%)");
        assertEqual(orderC_Pricing.paymentGatewayGstRate, 20.00, "New Order Updated GST Rate (20%)");

        // -----------------------------------------------------------------
        // TEST 5 — TDS SNAPSHOT
        // -----------------------------------------------------------------
        console.log("\n--- TEST 5: TDS SNAPSHOT ---");
        await paymentSettings.update({ tdsPercentage: 0.50 });
        const orderD_Pricing = await calculateOrderPricingInternal(onlineCart, null, 'Standard', 'Online');
        assertEqual(orderC_Pricing.tdsRate, 1.00, "Previous Order Preserved TDS Rate (1.00%)");
        assertEqual(orderD_Pricing.tdsRate, 0.50, "New Order Updated TDS Rate (0.50%)");

        // Reset settings back to standard defaults (2%, 18%, 1%)
        await paymentSettings.update({
            paymentGatewayFeePercentage: 2.00,
            paymentGatewayFeeGstPercentage: 18.00,
            tdsPercentage: 1.00,
        });

        // -----------------------------------------------------------------
        // TEST 6 — COST PRICE SNAPSHOT
        // -----------------------------------------------------------------
        console.log("\n--- TEST 6: COST PRICE SNAPSHOT ---");
        await testProduct.update({ costPrice: 250.00 });
        const snapshotItems = [{ Product: testProduct, quantity: 2 }];
        const cogsOrderInitial = await calculateOrderPricingInternal(snapshotItems, null, 'Standard', 'Online');
        assertEqual(cogsOrderInitial.productCogs, 500.00, "Initial COGS for 2 units @ ₹250");

        // Admin updates Product costPrice to ₹300.00
        await testProduct.update({ costPrice: 300.00 });

        assertEqual(cogsOrderInitial.processedItems[0].costPriceSnapshot, 250.00, "Snapshotted costPrice (₹250)");
        assertEqual(cogsOrderInitial.productCogs, 500.00, "Preserved Historical Order COGS (₹500)");

        // Reset Product costPrice
        await testProduct.update({ costPrice: 600.00 });

        // -----------------------------------------------------------------
        // TEST 7 — DECIMAL PRECISION
        // -----------------------------------------------------------------
        console.log("\n--- TEST 7: DECIMAL PRECISION & MONETARY ROUNDING ---");
        const precisionProduct = await Product.create({
            name: 'Precision Test Product',
            price: 199.99,
            costPrice: 120.50,
            stock: 50,
            slug: 'precision-test-product'
        });

        const precisionPricing = await calculateOrderPricingInternal([{ Product: precisionProduct, quantity: 1 }], null, 'Standard', 'Online');
        
        // Product Price = 199.99, Standard Delivery = 49.00 -> totalAmount = 248.99
        // 2% Gateway Fee: 248.99 * 2% = 4.9798 -> Round = 4.98
        // 18% Gateway GST: 4.98 * 18% = 0.8964 -> Round = 0.90
        // 1% TDS: 248.99 * 1% = 2.4899 -> Round = 2.49
        // Deductions = 4.98 + 0.90 + 2.49 = 8.37
        // Net Profit = 248.99 - 120.50 - 8.37 = 120.12
        assertEqual(precisionPricing.totalAmount, 248.99, "Precision Total Amount (Subtotal 199.99 + Delivery 49.00)");
        assertEqual(precisionPricing.paymentGatewayFee, 4.98, "Precision Gateway Fee (₹4.98)");
        assertEqual(precisionPricing.paymentGatewayGst, 0.90, "Precision Gateway GST (₹0.90)");
        assertEqual(precisionPricing.tdsAmount, 2.49, "Precision TDS (₹2.49)");
        assertEqual(precisionPricing.totalBusinessDeductions, 8.37, "Precision Deductions (₹8.37)");
        assertEqual(precisionPricing.netProfit, 120.12, "Precision Net Profit (₹120.12)");

        await precisionProduct.destroy();

        // -----------------------------------------------------------------
        // TEST 8 — CUSTOMER TOTAL UNCHANGED
        // -----------------------------------------------------------------
        console.log("\n--- TEST 8: CUSTOMER CHECKOUT TOTAL INTEGRITY ---");
        assertEqual(onlinePricing.totalAmount, 1000.00, "Customer Total equals Net Subtotal + Delivery");
        const containsInternalFees = (onlinePricing.totalAmount > 1000.00);
        if (!containsInternalFees) {
            console.log("✅ [PASS] Customer checkout total is NOT bloated by internal accounting fees.");
            passCount++;
        } else {
            console.error("❌ [FAIL] Customer checkout total erroneously includes internal fees.");
            failCount++;
        }

        // Clean up test product
        await testProduct.destroy();

        console.log("\n=================================================");
        console.log(`📊 TEST SUITE COMPLETE: ${passCount} PASSED, ${failCount} FAILED`);
        console.log("=================================================\n");

        if (failCount > 0) {
            process.exit(1);
        } else {
            process.exit(0);
        }

    } catch (err) {
        console.error("❌ CRITICAL ERROR IN TEST SUITE:", err);
        process.exit(1);
    }
}

runFinancialTestSuite();
