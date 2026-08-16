/**
 * Invoice Builder Seeder
 * Initializes default company settings, dynamic variable registry, template categories,
 * and pre-built default document templates.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const {
    sequelize,
    InvoiceSetting,
    InvoiceVariable,
    InvoiceTemplateCategory,
    InvoiceTemplate,
    InvoiceTemplateVersion,
} = require('../models');

const DEFAULT_VARIABLES = [
    // Company
    { variableName: 'company.name', placeholder: '{{company.name}}', description: 'Company legal name', category: 'Company' },
    { variableName: 'company.logo', placeholder: '{{company.logo}}', description: 'Company logo image URL', category: 'Company' },
    { variableName: 'company.gstNumber', placeholder: '{{company.gstNumber}}', description: 'GSTIN tax registration number', category: 'Company' },
    { variableName: 'company.vatNumber', placeholder: '{{company.vatNumber}}', description: 'VAT registration number', category: 'Company' },
    { variableName: 'company.address', placeholder: '{{company.address}}', description: 'Company registered address', category: 'Company' },
    { variableName: 'company.phone', placeholder: '{{company.phone}}', description: 'Company contact phone', category: 'Company' },
    { variableName: 'company.email', placeholder: '{{company.email}}', description: 'Company billing email', category: 'Company' },
    { variableName: 'company.website', placeholder: '{{company.website}}', description: 'Company website URL', category: 'Company' },
    { variableName: 'company.signature', placeholder: '{{company.signature}}', description: 'Authorized digital signature', category: 'Company' },
    { variableName: 'company.stamp', placeholder: '{{company.stamp}}', description: 'Official company seal/stamp', category: 'Company' },

    // Customer
    { variableName: 'customer.name', placeholder: '{{customer.name}}', description: 'Customer full name', category: 'Customer' },
    { variableName: 'customer.phone', placeholder: '{{customer.phone}}', description: 'Customer phone number', category: 'Customer' },
    { variableName: 'customer.email', placeholder: '{{customer.email}}', description: 'Customer email address', category: 'Customer' },
    { variableName: 'customer.address', placeholder: '{{customer.address}}', description: 'Customer shipping/billing address', category: 'Customer' },

    // Invoice
    { variableName: 'invoice.number', placeholder: '{{invoice.number}}', description: 'Generated invoice reference number', category: 'Invoice' },
    { variableName: 'invoice.date', placeholder: '{{invoice.date}}', description: 'Invoice issuance date', category: 'Invoice' },
    { variableName: 'invoice.dueDate', placeholder: '{{invoice.dueDate}}', description: 'Invoice payment due date', category: 'Invoice' },
    { variableName: 'invoice.subtotal', placeholder: '{{invoice.subtotal}}', description: 'Invoice subtotal before taxes/discounts', category: 'Invoice' },
    { variableName: 'invoice.tax', placeholder: '{{invoice.tax}}', description: 'Calculated tax amount', category: 'Invoice' },
    { variableName: 'invoice.discount', placeholder: '{{invoice.discount}}', description: 'Applied discount amount', category: 'Invoice' },
    { variableName: 'invoice.shipping', placeholder: '{{invoice.shipping}}', description: 'Shipping & handling charge', category: 'Invoice' },
    { variableName: 'invoice.total', placeholder: '{{invoice.total}}', description: 'Final payable invoice total', category: 'Invoice' },
    { variableName: 'invoice.paymentMethod', placeholder: '{{invoice.paymentMethod}}', description: 'Payment method (COD / Online / Razorpay)', category: 'Invoice' },
    { variableName: 'invoice.status', placeholder: '{{invoice.status}}', description: 'Payment status (Paid / Pending)', category: 'Invoice' },
    { variableName: 'invoice.footerNotes', placeholder: '{{invoice.footerNotes}}', description: 'Custom invoice footer notice', category: 'Invoice' },

    // Order
    { variableName: 'order.id', placeholder: '{{order.id}}', description: 'E-commerce order ID', category: 'Order' },
    { variableName: 'order.items', placeholder: '{{order.items}}', description: 'Dynamic order line items table array', category: 'Order' },
];

const DEFAULT_CATEGORIES = [
    { name: 'E-Commerce Invoices', description: 'Standard consumer retail tax invoices', sortOrder: 1 },
    { name: 'B2B Billing', description: 'Tax invoices with GSTIN & corporate billing fields', sortOrder: 2 },
    { name: 'Logistics & Delivery', description: 'Delivery challans, packing slips & shipping receipts', sortOrder: 3 },
    { name: 'Quotations & Estimates', description: 'Pre-sales quotes, estimates & proforma invoices', sortOrder: 4 },
];

async function seed() {
    try {
        await sequelize.sync();
        console.log('✅ Database synced for Invoice Builder Seeder');

        // 1. Company Settings
        const [settings] = await InvoiceSetting.findOrCreate({
            where: { id: 1 },
            defaults: {
                companyName: 'BlueAgle Commerce Pvt Ltd',
                gstNumber: '29ABCDE1234F1ZH',
                businessRegistration: 'U72900KA2026PTC123456',
                address: '4th Floor, Tech Park Tower, Koramangala, Bengaluru, Karnataka 560095',
                phone: '+91 1800-123-4567',
                email: 'billing@blueeagle.com',
                website: 'https://blueeagle.com',
                defaultCurrency: 'INR',
                currencySymbol: '₹',
                decimalPrecision: 2,
                footerNotes: 'Thank you for shopping with BlueAgle! For queries, contact billing@blueeagle.com.',
            },
        });
        console.log(`✅ Company Settings initialized (ID: ${settings.id})`);

        // 2. Variables Registry
        let varCount = 0;
        for (const v of DEFAULT_VARIABLES) {
            const [varObj, created] = await InvoiceVariable.findOrCreate({
                where: { variableName: v.variableName },
                defaults: v,
            });
            if (created) varCount++;
        }
        console.log(`✅ Variables Registry initialized (${varCount} new variables created)`);

        // 3. Categories
        let catCount = 0;
        for (const c of DEFAULT_CATEGORIES) {
            const [catObj, created] = await InvoiceTemplateCategory.findOrCreate({
                where: { name: c.name },
                defaults: c,
            });
            if (created) catCount++;
        }
        console.log(`✅ Template Categories initialized (${catCount} new categories created)`);

        // 4. Default Standard Invoice Template (Colorful with Logo & Banners)
        const defaultCanvas = {
            paperSize: 'A4',
            orientation: 'Portrait',
            margins: { top: 15, right: 15, bottom: 15, left: 15 },
            elements: [
                // Top Header Banner Box (Indigo)
                { id: 'top-banner', type: 'box', x: 0, y: 0, w: 794, h: 100, backgroundColor: '#312e81', borderWidth: 0 },
                // Company Logo / Graphic
                { id: 'logo-img', type: 'image', x: 30, y: 20, w: 140, h: 60, url: '/logo.png' },
                { id: 'hdr-1', type: 'header', x: 190, y: 30, w: 320, h: 40, text: '{{company.name}}', fontSize: 20, fontWeight: 'bold', color: '#ffffff' },
                { id: 'tax-lbl', type: 'text', x: 540, y: 30, w: 220, h: 40, text: 'TAX INVOICE', fontSize: 22, fontWeight: 'black', color: '#818cf8', textAlign: 'right' },

                // Company Sub-details
                { id: 'gst-1', type: 'text', x: 30, y: 115, w: 340, h: 18, text: 'GSTIN: {{company.gstNumber}} | CIN: {{company.businessRegistration}}', fontSize: 9, fontWeight: 'bold', color: '#475569' },
                { id: 'addr-1', type: 'text', x: 30, y: 135, w: 340, h: 35, text: '{{company.address}}', fontSize: 9, color: '#64748b' },

                // Invoice Summary Box
                { id: 'box-inv', type: 'box', x: 500, y: 115, w: 260, h: 75, backgroundColor: '#f1f5f9', borderColor: '#cbd5e1', borderWidth: 1, borderRadius: 10 },
                { id: 'inv-no', type: 'text', x: 515, y: 125, w: 230, h: 18, text: 'Invoice #: {{invoice.number}}', fontSize: 11, fontWeight: 'bold', color: '#1e293b' },
                { id: 'inv-dt', type: 'text', x: 515, y: 143, w: 230, h: 18, text: 'Date: {{invoice.date}}', fontSize: 10, color: '#475569' },
                { id: 'inv-pay', type: 'text', x: 515, y: 161, w: 230, h: 18, text: 'Status: {{invoice.status}} ({{invoice.paymentMethod}})', fontSize: 10, fontWeight: 'bold', color: '#059669' },

                { id: 'div-1', type: 'divider', x: 30, y: 200, w: 730, h: 2, color: '#e2e8f0' },

                // Customer Details Card (Light Purple Box)
                { id: 'cust-box', type: 'box', x: 30, y: 215, w: 360, h: 75, backgroundColor: '#faf5ff', borderColor: '#e9d5ff', borderWidth: 1, borderRadius: 10 },
                { id: 'cust-hdr', type: 'text', x: 45, y: 225, w: 330, h: 16, text: 'BILLED TO (CUSTOMER):', fontSize: 10, fontWeight: 'black', color: '#7e22ce' },
                { id: 'cust-body', type: 'text', x: 45, y: 243, w: 330, h: 40, text: '{{customer.name}}\n{{customer.address}}\nPhone: {{customer.phone}}', fontSize: 10, color: '#334155' },

                // Dynamic Line Items Table
                { id: 'tbl-1', type: 'dynamic_table', x: 30, y: 310, w: 734, h: 300, columns: ['Product', 'SKU', 'Qty', 'Unit Price', 'Amount'] },

                // Grand Total Payable Card (Green Badge Box)
                { id: 'tot-box', type: 'box', x: 480, y: 640, w: 284, h: 60, backgroundColor: '#059669', borderRadius: 12 },
                { id: 'tot-txt', type: 'text', x: 490, y: 655, w: 264, h: 30, text: 'TOTAL PAYABLE: {{invoice.total}}', fontSize: 15, fontWeight: 'black', color: '#ffffff', textAlign: 'center' },

                // Authorized Signature Block
                { id: 'sign-1', type: 'signature', x: 550, y: 730, w: 180, h: 60, label: 'Authorized Signatory' },

                // Footer Notice
                { id: 'ftr-1', type: 'footer', x: 30, y: 820, w: 734, h: 30, text: '{{invoice.footerNotes}}', fontSize: 9, color: '#94a3b8', textAlign: 'center' },
            ],
        };

        const [stdTemplate, createdStd] = await InvoiceTemplate.findOrCreate({
            where: { slug: 'standard-retail-tax-invoice' },
            defaults: {
                name: 'Standard Retail Tax Invoice',
                slug: 'standard-retail-tax-invoice',
                description: 'Official tax invoice template for consumer order transactions',
                documentType: 'Invoice',
                paperSize: 'A4',
                orientation: 'Portrait',
                canvasJson: defaultCanvas,
                isDefault: true,
                isActive: true,
                version: 1,
            },
        });

        if (createdStd) {
            await InvoiceTemplateVersion.create({
                templateId: stdTemplate.id,
                version: 1,
                name: stdTemplate.name,
                canvasJson: defaultCanvas,
                changeSummary: 'Initial default template creation',
            });
            console.log(`✅ Default Standard Tax Invoice template created`);
        }

        // 5. Amazon Official Tax Invoice Template
        const amazonCanvas = {
            paperSize: 'A4',
            orientation: 'Portrait',
            margins: { top: 15, right: 15, bottom: 15, left: 15 },
            elements: [
                // Top Amazon Brand Logo & Header Right Title
                { id: 'amz-logo', type: 'image', x: 30, y: 20, w: 180, h: 50, url: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg' },
                { id: 'amz-title', type: 'text', x: 420, y: 20, w: 345, h: 35, text: 'Tax Invoice/Bill of Supply/Cash Memo\n(Original for Recipient)', fontSize: 13, fontWeight: 'bold', textAlign: 'right', color: '#0f172a' },

                { id: 'amz-div-top', type: 'divider', x: 30, y: 80, w: 734, h: 1, color: '#e2e8f0' },

                // Sold By (Top Left)
                { id: 'sold-lbl', type: 'text', x: 30, y: 95, w: 320, h: 16, text: 'Sold By :', fontSize: 11, fontWeight: 'bold', color: '#0f172a' },
                { id: 'sold-val', type: 'text', x: 30, y: 113, w: 340, h: 60, text: '{{company.name}}\n{{company.address}}', fontSize: 10, color: '#334155' },
                { id: 'sold-gst', type: 'text', x: 30, y: 175, w: 340, h: 30, text: 'PAN No: AACFV3325K\nGST Registration No: {{company.gstNumber}}', fontSize: 10, fontWeight: 'bold', color: '#0f172a' },

                // Billing Address (Top Right)
                { id: 'bill-lbl', type: 'text', x: 450, y: 95, w: 310, h: 16, text: 'Billing Address :', fontSize: 11, fontWeight: 'bold', textAlign: 'right', color: '#0f172a' },
                { id: 'bill-val', type: 'text', x: 450, y: 113, w: 310, h: 60, text: '{{customer.name}}\n{{customer.address}}\nState/UT Code: 29', fontSize: 10, textAlign: 'right', color: '#334155' },

                // Shipping Address (Middle Right)
                { id: 'ship-lbl', type: 'text', x: 450, y: 185, w: 310, h: 16, text: 'Shipping Address :', fontSize: 11, fontWeight: 'bold', textAlign: 'right', color: '#0f172a' },
                { id: 'ship-val', type: 'text', x: 450, y: 203, w: 310, h: 70, text: '{{customer.name}}\n{{customer.address}}\nState/UT Code: 29\nPlace of supply: KARNATAKA\nPlace of delivery: KARNATAKA', fontSize: 10, textAlign: 'right', color: '#334155' },

                // Order & Invoice Numbers Bar
                { id: 'ord-info', type: 'text', x: 30, y: 285, w: 340, h: 35, text: 'Order Number: {{order.id}}\nOrder Date: {{invoice.date}}', fontSize: 11, fontWeight: 'bold', color: '#0f172a' },
                { id: 'inv-info', type: 'text', x: 450, y: 285, w: 310, h: 45, text: 'Invoice Number : {{invoice.number}}\nInvoice Details : KA-310565025-1920\nInvoice Date : {{invoice.date}}', fontSize: 11, fontWeight: 'bold', textAlign: 'right', color: '#0f172a' },

                // Line Items Dynamic Table
                { id: 'tbl-amz', type: 'dynamic_table', x: 30, y: 340, w: 734, h: 320, columns: ['Sl. No', 'Description', 'Unit Price', 'Qty', 'Net Amount', 'Tax Amount', 'Total Amount'] },

                // Total Payable Card & Words
                { id: 'tot-bg', type: 'box', x: 30, y: 675, w: 734, h: 60, backgroundColor: '#f8fafc', borderColor: '#cbd5e1', borderWidth: 1 },
                { id: 'tot-amz', type: 'text', x: 40, y: 683, w: 714, h: 22, text: 'TOTAL PAYABLE: {{invoice.total}}', fontSize: 13, fontWeight: 'black', color: '#0f172a', textAlign: 'right' },
                { id: 'words-txt', type: 'text', x: 40, y: 705, w: 714, h: 22, text: 'Amount in Words: One Thousand One Hundred And Ninety-five only', fontSize: 10, fontWeight: 'bold', color: '#334155' },

                // Authorized Signatory Block
                { id: 'sign-amz', type: 'signature', x: 520, y: 750, w: 240, h: 70, label: 'Authorized Signatory for {{company.name}}' },

                // Reverse Charge & Legal Disclaimer
                { id: 'rev-txt', type: 'text', x: 30, y: 830, w: 734, h: 18, text: 'Whether tax is payable under reverse charge - No', fontSize: 10, color: '#334155' },
                { id: 'legal-disclaimer', type: 'footer', x: 30, y: 860, w: 734, h: 30, text: 'ASSPL-Amazon Seller Services Pvt. Ltd. | Customers desirous of availing input GST credit are requested to create a Business account on Amazon.in.', fontSize: 8, color: '#94a3b8', textAlign: 'center' },
            ],
        };

        const [amzTemplate, createdAmz] = await InvoiceTemplate.findOrCreate({
            where: { slug: 'amazon-official-tax-invoice' },
            defaults: {
                name: 'Amazon Official Tax Invoice Format',
                slug: 'amazon-official-tax-invoice',
                description: 'Official Amazon India GST Tax Invoice format with Sold By, Shipping/Billing address, and tax breakdown',
                documentType: 'Invoice',
                paperSize: 'A4',
                orientation: 'Portrait',
                canvasJson: amazonCanvas,
                isDefault: false,
                isActive: true,
                version: 1,
            },
        });

        if (createdAmz) {
            await InvoiceTemplateVersion.create({
                templateId: amzTemplate.id,
                version: 1,
                name: amzTemplate.name,
                canvasJson: amazonCanvas,
                changeSummary: 'Initial Amazon Tax Invoice template creation',
            });
            console.log(`✅ Amazon Official Tax Invoice template created`);
        }

        console.log('🎉 Invoice Builder Seeder Completed Successfully!');
    } catch (err) {
        console.error('❌ Seeder failed:', err);
    }
}

if (require.main === module) {
    seed().then(() => process.exit(0));
}

module.exports = seed;
