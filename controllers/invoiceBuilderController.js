const {
    InvoiceTemplate,
    InvoiceTemplateCategory,
    InvoiceVariable,
    InvoiceSetting,
    InvoiceTemplateVersion,
    Order,
    OrderItem,
    Product,
    User,
} = require('../models');
const { logActivity } = require('../utils/activityLogger');
const { Op } = require('sequelize');

function slugify(text) {
    return text.toString().toLowerCase().trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
}

// ─── Templates Controller ──────────────────────────────────────────────────────

exports.listTemplates = async (req, res) => {
    try {
        const { documentType, categoryId, search, page = 1, limit = 20 } = req.query;
        const where = {};

        if (documentType) where.documentType = documentType;
        if (categoryId) where.categoryId = categoryId;
        if (search) {
            where[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { description: { [Op.like]: `%${search}%` } },
            ];
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const { count, rows } = await InvoiceTemplate.findAndCountAll({
            where,
            include: [{ model: InvoiceTemplateCategory, as: 'category', attributes: ['id', 'name'] }],
            order: [['isDefault', 'DESC'], ['updatedAt', 'DESC']],
            limit: parseInt(limit),
            offset,
        });

        return res.json({
            data: rows,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(count / parseInt(limit)),
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error listing templates' });
    }
};

exports.getTemplateById = async (req, res) => {
    try {
        const { id } = req.params;
        const template = await InvoiceTemplate.findByPk(id, {
            include: [
                { model: InvoiceTemplateCategory, as: 'category' },
                {
                    model: InvoiceTemplateVersion,
                    as: 'versions',
                    attributes: ['id', 'version', 'name', 'changeSummary', 'createdBy', 'createdAt'],
                    order: [['version', 'DESC']],
                },
            ],
        });

        if (!template) return res.status(404).json({ message: 'Invoice template not found' });
        return res.json(template);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error loading template' });
    }
};

exports.createTemplate = async (req, res) => {
    try {
        const {
            name,
            description,
            documentType = 'Invoice',
            paperSize = 'A4',
            orientation = 'Portrait',
            canvasJson,
            categoryId,
            isDefault = false,
        } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Template name is required' });
        }

        const baseSlug = slugify(name);
        const slug = `${baseSlug}-${Date.now()}`;

        // Default Canvas Grid if empty
        const defaultCanvas = canvasJson || {
            paperSize,
            orientation,
            margins: { top: 15, right: 15, bottom: 15, left: 15 },
            elements: [
                { id: 'hdr-1', type: 'header', x: 20, y: 20, w: 500, h: 60, text: '{{company.name}}', fontSize: 24, fontWeight: 'bold', color: '#1a1a4e' },
                { id: 'lbl-1', type: 'text', x: 20, y: 90, w: 200, h: 20, text: 'INVOICE #: {{invoice.number}}', fontSize: 12, fontWeight: 'bold', color: '#475569' },
                { id: 'dt-1', type: 'text', x: 350, y: 90, w: 200, h: 20, text: 'DATE: {{invoice.date}}', fontSize: 12, color: '#475569' },
                { id: 'cust-1', type: 'text', x: 20, y: 130, w: 250, h: 60, text: 'BILL TO:\n{{customer.name}}\n{{customer.address}}', fontSize: 11, color: '#334155' },
                { id: 'tbl-1', type: 'dynamic_table', x: 20, y: 210, w: 550, h: 200, columns: ['Product', 'Qty', 'Unit Price', 'Amount'] },
                { id: 'tot-1', type: 'text', x: 350, y: 430, w: 220, h: 30, text: 'TOTAL AMOUNT: {{invoice.total}}', fontSize: 14, fontWeight: 'bold', color: '#16a34a' },
                { id: 'ftr-1', type: 'footer', x: 20, y: 750, w: 550, h: 30, text: '{{invoice.footerNotes}}', fontSize: 10, color: '#94a3b8', textAlign: 'center' },
            ],
        };

        if (isDefault) {
            await InvoiceTemplate.update({ isDefault: false }, { where: { documentType } });
        }

        const template = await InvoiceTemplate.create({
            name,
            slug,
            description,
            documentType,
            paperSize,
            orientation,
            canvasJson: defaultCanvas,
            categoryId: categoryId || null,
            isDefault,
            version: 1,
            createdBy: req.adminUser?.id || null,
        });

        // Record initial version
        await InvoiceTemplateVersion.create({
            templateId: template.id,
            version: 1,
            name: template.name,
            canvasJson: defaultCanvas,
            changeSummary: 'Initial template creation',
            createdBy: req.adminUser?.id || null,
        });

        await logActivity({
            adminUserId: req.adminUser?.id,
            module: 'InvoiceBuilder',
            action: 'Create',
            description: `Created invoice template: ${template.name} (${documentType})`,
            targetId: template.id,
            req,
        });

        return res.json(template);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error creating template' });
    }
};

exports.updateTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            description,
            documentType,
            paperSize,
            orientation,
            margins,
            canvasJson,
            categoryId,
            isDefault,
            isActive,
            changeSummary,
        } = req.body;

        const template = await InvoiceTemplate.findByPk(id);
        if (!template) return res.status(404).json({ message: 'Template not found' });

        const docType = documentType || template.documentType;

        if (isDefault && !template.isDefault) {
            await InvoiceTemplate.update({ isDefault: false }, { where: { documentType: docType } });
        }

        const newVersionNumber = template.version + 1;
        const updatedCanvas = canvasJson || template.canvasJson;

        await template.update({
            name: name || template.name,
            description: description !== undefined ? description : template.description,
            documentType: docType,
            paperSize: paperSize || template.paperSize,
            orientation: orientation || template.orientation,
            margins: margins || template.margins,
            canvasJson: updatedCanvas,
            categoryId: categoryId !== undefined ? categoryId : template.categoryId,
            isDefault: isDefault !== undefined ? isDefault : template.isDefault,
            isActive: isActive !== undefined ? isActive : template.isActive,
            version: newVersionNumber,
            updatedBy: req.adminUser?.id || null,
        });

        // Version Snapshot
        await InvoiceTemplateVersion.create({
            templateId: template.id,
            version: newVersionNumber,
            name: template.name,
            canvasJson: updatedCanvas,
            changeSummary: changeSummary || `Updated template configuration v${newVersionNumber}`,
            createdBy: req.adminUser?.id || null,
        });

        await logActivity({
            adminUserId: req.adminUser?.id,
            module: 'InvoiceBuilder',
            action: 'Update',
            description: `Updated invoice template: ${template.name} (v${newVersionNumber})`,
            targetId: template.id,
            req,
        });

        return res.json(template);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error updating template' });
    }
};

exports.deleteTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const template = await InvoiceTemplate.findByPk(id);
        if (!template) return res.status(404).json({ message: 'Template not found' });

        if (template.isDefault) {
            return res.status(400).json({ message: 'Cannot delete the default template. Assign another template as default first.' });
        }

        await template.destroy();

        await logActivity({
            adminUserId: req.adminUser?.id,
            module: 'InvoiceBuilder',
            action: 'Delete',
            description: `Deleted invoice template: ${template.name}`,
            targetId: template.id,
            req,
        });

        return res.json({ message: 'Template deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error deleting template' });
    }
};

exports.setDefaultTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const template = await InvoiceTemplate.findByPk(id);
        if (!template) return res.status(404).json({ message: 'Template not found' });

        await InvoiceTemplate.update(
            { isDefault: false },
            { where: { documentType: template.documentType } }
        );

        await template.update({ isDefault: true, isActive: true });

        await logActivity({
            adminUserId: req.adminUser?.id,
            module: 'InvoiceBuilder',
            action: 'Update',
            description: `Set template '${template.name}' as default for ${template.documentType}`,
            targetId: template.id,
            req,
        });

        return res.json({ message: `Template set as default for ${template.documentType}`, template });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error setting default template' });
    }
};

exports.duplicateTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const source = await InvoiceTemplate.findByPk(id);
        if (!source) return res.status(404).json({ message: 'Source template not found' });

        const name = `${source.name} (Copy)`;
        const slug = `${slugify(name)}-${Date.now()}`;

        const dup = await InvoiceTemplate.create({
            name,
            slug,
            description: source.description,
            documentType: source.documentType,
            paperSize: source.paperSize,
            orientation: source.orientation,
            margins: source.margins,
            canvasJson: JSON.parse(JSON.stringify(source.canvasJson)),
            categoryId: source.categoryId,
            isDefault: false,
            isActive: true,
            version: 1,
            createdBy: req.adminUser?.id || null,
        });

        return res.json(dup);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error duplicating template' });
    }
};

exports.restoreTemplateVersion = async (req, res) => {
    try {
        const { id, versionId } = req.params;
        const template = await InvoiceTemplate.findByPk(id);
        if (!template) return res.status(404).json({ message: 'Template not found' });

        const targetVer = await InvoiceTemplateVersion.findOne({
            where: { id: versionId, templateId: template.id },
        });

        if (!targetVer) return res.status(404).json({ message: 'Target version not found' });

        const newVersionNumber = template.version + 1;

        await template.update({
            canvasJson: targetVer.canvasJson,
            version: newVersionNumber,
        });

        await InvoiceTemplateVersion.create({
            templateId: template.id,
            version: newVersionNumber,
            name: template.name,
            canvasJson: targetVer.canvasJson,
            changeSummary: `Restored from version v${targetVer.version}`,
            createdBy: req.adminUser?.id || null,
        });

        return res.json({ message: `Restored template to v${targetVer.version}`, template });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error restoring version' });
    }
};

// ─── Categories & Variables Controller ────────────────────────────────────────

exports.listCategories = async (req, res) => {
    try {
        const categories = await InvoiceTemplateCategory.findAll({
            order: [['sortOrder', 'ASC'], ['name', 'ASC']],
        });
        return res.json(categories);
    } catch (err) {
        res.status(500).json({ message: 'Server error loading categories' });
    }
};

exports.createCategory = async (req, res) => {
    try {
        const { name, description, sortOrder = 0 } = req.body;
        if (!name) return res.status(400).json({ message: 'Name is required' });
        const cat = await InvoiceTemplateCategory.create({ name, description, sortOrder });
        return res.json(cat);
    } catch (err) {
        res.status(500).json({ message: 'Server error creating category' });
    }
};

exports.listVariables = async (req, res) => {
    try {
        const variables = await InvoiceVariable.findAll({
            order: [['category', 'ASC'], ['variableName', 'ASC']],
        });
        return res.json(variables);
    } catch (err) {
        res.status(500).json({ message: 'Server error loading variables' });
    }
};

// ─── Settings Controller ──────────────────────────────────────────────────────

exports.getInvoiceSettings = async (req, res) => {
    try {
        let settings = await InvoiceSetting.findOne();
        if (!settings) {
            settings = await InvoiceSetting.create({});
        }
        return res.json(settings);
    } catch (err) {
        res.status(500).json({ message: 'Server error loading settings' });
    }
};

exports.updateInvoiceSettings = async (req, res) => {
    try {
        let settings = await InvoiceSetting.findOne();
        if (!settings) {
            settings = await InvoiceSetting.create(req.body);
        } else {
            await settings.update(req.body);
        }
        return res.json(settings);
    } catch (err) {
        res.status(500).json({ message: 'Server error updating settings' });
    }
};

// ─── Order Render & Variable Compiler Engine ───────────────────────────────────

const compileInvoiceData = async (orderId, requestedBy = 'System') => {
    const { Invoice } = require('../models');

    const order = await Order.findByPk(orderId, {
        include: [
            { model: OrderItem, include: [Product] },
            { model: User, attributes: ['id', 'name', 'phone', 'email'] },
        ],
    });

    if (!order) return null;

    // Load company settings
    let settings = await InvoiceSetting.findOne();
    if (!settings) {
        settings = {
            companyName: 'BlueAgle Commerce Pvt Ltd',
            gstNumber: '29ABCDE1234F1ZH',
            address: '4th Floor, Tech Park Tower, Koramangala, Bengaluru 560095',
            phone: '+91 1800-123-4567',
            email: 'billing@blueeagle.com',
            website: 'https://blueeagle.com',
            currencySymbol: '₹',
            footerNotes: 'Thank you for shopping with BlueAgle!',
        };
    }

    // Load template priority: 1. Order assigned 2. Default Active 3. Any Active
    let template = null;
    if (order.invoiceTemplateId) {
        template = await InvoiceTemplate.findOne({ where: { id: order.invoiceTemplateId, isActive: true } });
    }
    if (!template) {
        template = await InvoiceTemplate.findOne({ where: { documentType: 'Invoice', isDefault: true, isActive: true } });
    }
    if (!template) {
        template = await InvoiceTemplate.findOne({ where: { isDefault: true, isActive: true } });
    }
    if (!template) {
        template = await InvoiceTemplate.findOne({ where: { isActive: true } });
    }

    if (!template) {
        return { error: 'No published invoice template is configured. Please publish a template from the Invoice Template Generator.', statusCode: 400 };
    }

    const currency = settings.currencySymbol || '₹';

    // Find or create immutable Invoice record
    let invoiceRecord = await Invoice.findOne({ where: { orderId } });
    const orderDeliveryCharge = order.deliveryCharge !== undefined && order.deliveryCharge !== null ? parseFloat(order.deliveryCharge) : 0.00;
    const orderDiscount = order.discountAmount !== undefined && order.discountAmount !== null ? parseFloat(order.discountAmount) : 0.00;

    if (!invoiceRecord) {
        const invNum = `INV-${new Date().getFullYear()}-${orderId.toString().padStart(6, '0')}`;
        const subtotalVal = order.subtotal ? parseFloat(order.subtotal) : (order.OrderItems || []).reduce((sum, it) => sum + parseFloat(it.price) * it.quantity, 0);

        invoiceRecord = await Invoice.create({
            orderId,
            invoiceNumber: invNum,
            templateId: template.id,
            templateVersion: template.version || 1,
            status: 'Generated',
            invoiceDate: order.createdAt || new Date(),
            dueDate: new Date(new Date(order.createdAt || Date.now()).getTime() + 7 * 86400000),
            subtotal: subtotalVal,
            discountAmount: orderDiscount,
            taxAmount: 0.00,
            shippingAmount: orderDeliveryCharge,
            totalAmount: parseFloat(order.totalAmount),
            currencySymbol: currency,
            generatedBy: requestedBy,
        });
    }

    // Customer Name & Contact
    const custName = order.address?.contactName || order.address?.name || order.User?.name || 'Valued Customer';
    const custPhone = order.address?.contactPhone || order.User?.phone || 'N/A';
    const custEmail = order.User?.email || (typeof order.address === 'object' ? order.address?.email : null) || 'N/A';

    let custAddress = 'N/A';
    if (typeof order.address === 'object' && order.address) {
        const parts = [
            order.address.label ? `[${order.address.label}]` : null,
            order.address.flatNo,
            order.address.floor,
            order.address.area,
            order.address.landmark,
            order.address.city,
            order.address.pincode
        ].filter(Boolean);
        custAddress = parts.join(', ');
    } else if (typeof order.address === 'string') {
        custAddress = order.address;
    }

    const items = (order.OrderItems || []).map(item => {
        const pPrice = parseFloat(item.price);
        const pQty = item.quantity;
        return {
            productName: item.Product?.name || `Product #${item.productId || 'Item'}`,
            sku: item.Product?.sku || (item.productId ? `SKU-${item.productId}` : 'SKU-N/A'),
            brand: item.Product?.brand || 'BlueAgle',
            weight: item.Product?.weight || '',
            description: item.Product?.description || '',
            quantity: pQty,
            price: `${currency}${pPrice.toFixed(2)}`,
            amount: `${currency}${(pPrice * pQty).toFixed(2)}`,
            rawPrice: pPrice,
            rawAmount: pPrice * pQty,
            currency,
        };
    });

    const subtotalCalc = items.reduce((acc, i) => acc + i.rawAmount, 0);
    const formattedShipping = orderDeliveryCharge > 0 ? `${currency}${orderDeliveryCharge.toFixed(2)}` : 'FREE';

    const variablePayload = {
        'company.name': settings.companyName || 'BlueAgle Commerce Pvt Ltd',
        'company.logo': settings.companyLogo || '',
        'company.gstNumber': settings.gstNumber || 'N/A',
        'company.vatNumber': settings.vatNumber || 'N/A',
        'company.address': settings.address || '',
        'company.phone': settings.phone || '',
        'company.email': settings.email || '',
        'company.website': settings.website || '',
        'company.signature': settings.digitalSignature || '',
        'company.stamp': settings.companyStamp || '',
        'customer.name': custName,
        'customer.phone': custPhone,
        'customer.email': custEmail,
        'customer.address': custAddress,
        'invoice.number': invoiceRecord.invoiceNumber,
        'invoice.date': new Date(invoiceRecord.invoiceDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        'invoice.dueDate': invoiceRecord.dueDate ? new Date(invoiceRecord.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A',
        'invoice.subtotal': `${currency}${subtotalCalc.toFixed(2)}`,
        'invoice.discount': `${currency}${orderDiscount.toFixed(2)}`,
        'invoice.shipping': formattedShipping,
        'invoice.deliveryCharge': formattedShipping,
        'invoice.tax': `${currency}0.00`,
        'invoice.total': `${currency}${parseFloat(order.totalAmount).toFixed(2)}`,
        'invoice.paymentMethod': order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Online Payment',
        'invoice.status': order.paymentStatus || 'Paid',
        'invoice.footerNotes': settings.footerNotes || 'Thank you for shopping with BlueAgle!',
        'order.id': `#${order.id.toString().padStart(5, '0')}`,
        'order.number': `#${order.id.toString().padStart(5, '0')}`,
        'order.date': new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        'order.status': order.status || 'Processing',
        'order.shipping': formattedShipping,
        'order.deliveryCharge': formattedShipping,
        'order.items': items,
    };

    return {
        invoiceRecord,
        order,
        items,
        settings,
        template: template ? template.toJSON() : null,
        variables: variablePayload,
        custName,
        custPhone,
        custEmail,
        custAddress,
        currency,
        subtotalCalc,
    };
};

function replaceVariablesInText(text, payload) {
    if (!text) return '';
    return text.replace(/\{\{([^}]+)\}\}/g, (match, varKey) => {
        const key = varKey.trim();
        if (payload[key] !== undefined && payload[key] !== null) {
            return payload[key];
        }
        return '';
    });
}

function renderCanvasTemplateToHtml(data) {
    const { template, variables, items, order, invoiceRecord } = data;
    const canvasJson = template?.canvasJson || {};
    const elements = canvasJson.elements || [];
    const paperSize = canvasJson.paperSize || template?.paperSize || 'A4';
    const orientation = canvasJson.orientation || template?.orientation || 'Portrait';

    const canvasWidth = orientation === 'Landscape' ? 1123 : 794;
    const canvasHeight = orientation === 'Landscape' ? 794 : 1123;

    const renderedElementsHtml = elements.map(el => {
        if (el.hidden) return '';

        const x = el.x || 0;
        const y = el.y || 0;
        const w = el.w || 100;
        const h = el.h || 30;
        const fontSize = el.fontSize || 12;
        const fontWeight = el.fontWeight || 'normal';
        const color = el.color || '#1e293b';
        const backgroundColor = el.backgroundColor || 'transparent';
        const borderColor = el.borderColor || 'transparent';
        const borderWidth = el.borderWidth ? `${el.borderWidth}px` : '0px';
        const borderStyle = el.borderWidth ? 'solid' : 'none';
        const borderRadius = el.borderRadius ? `${el.borderRadius}px` : '0px';
        const textAlign = el.textAlign || 'left';

        const styleStr = [
            `position: absolute;`,
            `left: ${x}px;`,
            `top: ${y}px;`,
            `width: ${w}px;`,
            `min-height: ${h}px;`,
            `font-size: ${fontSize}px;`,
            `font-weight: ${fontWeight};`,
            `color: ${color};`,
            `background-color: ${backgroundColor};`,
            `border-color: ${borderColor};`,
            `border-width: ${borderWidth};`,
            `border-style: ${borderStyle};`,
            `border-radius: ${borderRadius};`,
            `text-align: ${textAlign};`,
            `white-space: pre-wrap;`,
            `word-break: break-word;`,
            `box-sizing: border-box;`,
            `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;`,
            `overflow: hidden;`
        ].join(' ');

        if (el.type === 'box') {
            return `<div style="${styleStr}; height: ${h}px;"></div>`;
        }

        if (el.type === 'divider') {
            const divH = el.h || 2;
            const divColor = el.color || '#e2e8f0';
            return `<div style="position: absolute; left: ${x}px; top: ${y}px; width: ${w}px; height: ${divH}px; background-color: ${divColor};"></div>`;
        }

        if (el.type === 'image' || el.type === 'logo') {
            const imgUrl = el.url || variables['company.logo'] || '';
            if (imgUrl) {
                return `<div style="${styleStr}; height: ${h}px; padding: 2px;">
                    <img src="${imgUrl}" style="width: 100%; height: 100%; object-fit: contain;" alt="Logo" />
                </div>`;
            }
            const fallbackText = replaceVariablesInText(el.text || '{{company.name}}', variables);
            return `<div style="${styleStr}; font-weight: bold; font-size: 18px; color: #3c006b;">${fallbackText}</div>`;
        }

        if (el.type === 'signature') {
            const labelText = replaceVariablesInText(el.label || el.text || 'Authorized Signatory', variables);
            return `<div style="${styleStr}; text-align: center; border-top: 1px solid #cbd5e1; padding-top: 6px;">
                ${el.url ? `<img src="${el.url}" style="max-height: 40px; margin-bottom: 4px; object-fit: contain;" alt="Signature" /><br/>` : ''}
                <span style="font-size: 11px; font-weight: 600; color: #475569;">${labelText}</span>
            </div>`;
        }

        if (el.type === 'dynamic_table') {
            const cols = el.columns || ['Product', 'SKU', 'Qty', 'Unit Price', 'Amount'];

            const thHtml = cols.map(c => `
                <th style="padding: 8px 10px; background: #f1f5f9; color: #334155; font-size: 10px; font-weight: 800; text-transform: uppercase; border: 1px solid #cbd5e1;">${c}</th>
            `).join('');

            const rowsHtml = items.map((it, idx) => {
                const tds = cols.map(c => {
                    const cLower = c.toLowerCase();
                    let val = '';
                    let align = 'left';

                    if (cLower.includes('sl') || cLower === '#' || cLower.includes('no')) {
                        val = idx + 1;
                        align = 'center';
                    } else if (cLower.includes('product') || cLower.includes('description') || cLower.includes('item')) {
                        val = `<strong>${it.productName}</strong>${it.weight ? ` <span style="color:#64748b; font-weight:normal;">(${it.weight})</span>` : ''}`;
                        align = 'left';
                    } else if (cLower.includes('sku')) {
                        val = `<span style="font-family: monospace;">${it.sku}</span>`;
                        align = 'left';
                    } else if (cLower.includes('qty') || cLower.includes('quantity')) {
                        val = it.quantity;
                        align = 'center';
                    } else if (cLower.includes('unit price') || cLower.includes('rate') || cLower.includes('price')) {
                        val = it.price;
                        align = 'right';
                    } else if (cLower.includes('net') || cLower.includes('tax amount')) {
                        const taxVal = (it.rawPrice * it.quantity * 0.18).toFixed(2);
                        val = `${it.currency || '₹'}${taxVal}`;
                        align = 'right';
                    } else if (cLower.includes('amount') || cLower.includes('total')) {
                        val = it.amount;
                        align = 'right';
                    } else {
                        val = it[c] || '-';
                    }

                    return `<td style="padding: 8px 10px; border: 1px solid #e2e8f0; font-size: 11px; text-align: ${align};">${val}</td>`;
                }).join('');

                return `<tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">${tds}</tr>`;
            }).join('');

            return `<div style="${styleStr}; height: auto; min-height: ${h}px;">
                <table style="width: 100%; border-collapse: collapse; margin: 0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <thead><tr>${thHtml}</tr></thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            </div>`;
        }

        // Default text / header / footer
        const renderedText = replaceVariablesInText(el.text || '', variables);
        return `<div style="${styleStr}">${renderedText}</div>`;
    }).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tax Invoice - ${variables['invoice.number'] || invoiceRecord?.invoiceNumber || order?.id || 'Doc'}</title>
    <style>
        @page { size: A4 ${orientation.toLowerCase()}; margin: 0; }
        * { box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 24px; background: #0f172a; color: #1e293b; display: flex; flex-direction: column; align-items: center; }
        .action-bar { width: ${canvasWidth}px; margin: 0 auto 16px auto; display: flex; justify-content: space-between; align-items: center; color: #f8fafc; font-size: 13px; font-weight: 600; }
        .btn-print { background: #6366f1; color: #ffffff; border: none; padding: 10px 22px; border-radius: 10px; font-weight: 800; font-size: 13px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3); }
        .btn-print:hover { background: #4f46e5; }
        .canvas-container { width: ${canvasWidth}px; min-height: ${canvasHeight}px; position: relative; background: #ffffff; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); overflow: hidden; border-radius: 4px; }
        @media print {
            body { background: #ffffff; padding: 0; display: block; }
            .action-bar { display: none !important; }
            .canvas-container { box-shadow: none; border-radius: 0; width: 100% !important; min-height: 100% !important; }
        }
    </style>
</head>
<body>
    <div class="action-bar">
        <div>📄 Template: <strong>${template.name}</strong> (v${template.version || 1}.0)</div>
        <button onclick="window.print()" class="btn-print">🖨️ Print / Download PDF</button>
    </div>

    <div class="canvas-container">
        ${renderedElementsHtml}
    </div>
</body>
</html>`;
}

exports.renderOrderInvoice = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { format } = req.query;

        const data = await compileInvoiceData(orderId, 'Admin/Customer');
        if (data && data.error) {
            return res.status(data.statusCode || 400).json({ message: data.error });
        }
        if (!data) return res.status(404).json({ message: 'Order not found' });

        if (format === 'html' || req.headers.accept?.includes('text/html')) {
            const htmlContent = renderCanvasTemplateToHtml(data);
            res.setHeader('Content-Type', 'text/html');
            return res.send(htmlContent);
        }

        return res.json({
            invoiceNumber: data.invoiceRecord.invoiceNumber,
            status: data.invoiceRecord.status,
            template: data.template,
            variables: data.variables,
            settings: data.settings,
            order: data.order,
        });
    } catch (err) {
        console.error('Error rendering invoice:', err);
        res.status(500).json({ message: 'Server error rendering order invoice' });
    }
};

exports.generateOrderInvoice = async (req, res) => {
    try {
        const { orderId } = req.params;
        const requestedBy = req.adminUser ? `Admin:${req.adminUser.id}` : 'Customer';

        const data = await compileInvoiceData(orderId, requestedBy);
        if (data && data.error) {
            return res.status(data.statusCode || 400).json({ message: data.error });
        }
        if (!data) return res.status(404).json({ message: 'Order not found' });

        return res.json({
            message: 'Invoice generated successfully',
            invoiceNumber: data.invoiceRecord.invoiceNumber,
            invoiceId: data.invoiceRecord.id,
            templateId: data.template.id,
            templateName: data.template.name,
            templateVersion: data.template.version,
            status: data.invoiceRecord.status,
            invoiceDate: data.invoiceRecord.invoiceDate,
            totalAmount: data.invoiceRecord.totalAmount,
            downloadUrl: `/api/invoice/order/${orderId}/download`,
            previewUrl: `/api/invoice/order/${orderId}/render?format=html`,
        });
    } catch (err) {
        console.error('Error generating invoice:', err);
        res.status(500).json({ message: 'Failed to generate invoice' });
    }
};

exports.downloadOrderInvoiceHtml = async (req, res) => {
    try {
        const { orderId } = req.params;

        const data = await compileInvoiceData(orderId, 'Download');
        if (data && data.error) {
            return res.status(data.statusCode || 400).json({ message: data.error });
        }
        if (!data) return res.status(404).json({ message: 'Order not found' });

        const htmlContent = renderCanvasTemplateToHtml(data);
        const fileName = `Invoice-${data.invoiceRecord.invoiceNumber}.html`;

        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
        return res.send(htmlContent);
    } catch (err) {
        console.error('Error downloading invoice:', err);
        res.status(500).json({ message: 'Failed to download invoice' });
    }
};
