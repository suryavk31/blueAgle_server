const { ProductAttribute } = require('../models');

exports.listAttributes = async (req, res) => {
    try {
        const attrs = await ProductAttribute.findAll({ order: [['sortOrder', 'ASC'], ['name', 'ASC']] });
        res.json(attrs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.createAttribute = async (req, res) => {
    try {
        const { name, slug, type, options, isRequired } = req.body;
        const attr = await ProductAttribute.create({
            name,
            slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            type: type || 'text',
            options: options || [],
            isRequired: !!isRequired
        });
        res.status(201).json(attr);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.updateAttribute = async (req, res) => {
    try {
        const attr = await ProductAttribute.findByPk(req.params.id);
        if (!attr) return res.status(404).json({ message: 'Attribute not found' });
        const { name, slug, type, options, isRequired } = req.body;
        attr.name = name || attr.name;
        attr.slug = slug || attr.slug;
        attr.type = type || attr.type;
        attr.options = options !== undefined ? options : attr.options;
        attr.isRequired = isRequired !== undefined ? isRequired : attr.isRequired;
        await attr.save();
        res.json(attr);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.deleteAttribute = async (req, res) => {
    try {
        const attr = await ProductAttribute.findByPk(req.params.id);
        if (!attr) return res.status(404).json({ message: 'Attribute not found' });
        await attr.destroy();
        res.json({ message: 'Attribute deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
