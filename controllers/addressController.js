const { Address, User } = require('../models');

const getAddresses = async (req, res) => {
    try {
        const user = await User.findOne({ where: { phone: req.user.phone_number } });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const addresses = await Address.findAll({
            where: { userId: user.id },
            order: [['isDefault', 'DESC'], ['createdAt', 'DESC']]
        });
        res.json(addresses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createAddress = async (req, res) => {
    try {
        const user = await User.findOne({ where: { phone: req.user.phone_number } });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const { label, flatNo, floor, area, landmark, contactName, contactPhone, isDefault } = req.body;

        // Validation
        if (!flatNo || flatNo.trim().length === 0) {
            return res.status(400).json({ message: 'Flat/House number is required' });
        }
        if (!area || area.trim().length === 0) {
            return res.status(400).json({ message: 'Area/Sector/Locality is required' });
        }
        if (!contactName || contactName.trim().length < 2) {
            return res.status(400).json({ message: 'Name must be at least 2 characters' });
        }

        // If this is set as default, unset all others
        if (isDefault) {
            await Address.update({ isDefault: false }, { where: { userId: user.id } });
        }

        // If first address, make it default
        const count = await Address.count({ where: { userId: user.id } });

        const address = await Address.create({
            label: label || 'Home',
            flatNo: flatNo.trim(),
            floor: floor ? floor.trim() : null,
            area: area.trim(),
            landmark: landmark ? landmark.trim() : null,
            contactName: contactName.trim(),
            contactPhone: contactPhone ? contactPhone.trim() : null,
            isDefault: count === 0 ? true : (isDefault || false),
            userId: user.id,
        });

        res.status(201).json(address);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateAddress = async (req, res) => {
    try {
        const user = await User.findOne({ where: { phone: req.user.phone_number } });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const address = await Address.findOne({ where: { id: req.params.id, userId: user.id } });
        if (!address) return res.status(404).json({ message: 'Address not found' });

        const { label, flatNo, floor, area, landmark, contactName, contactPhone, isDefault } = req.body;

        if (isDefault) {
            await Address.update({ isDefault: false }, { where: { userId: user.id } });
        }

        await address.update({
            label: label || address.label,
            flatNo: flatNo || address.flatNo,
            floor: floor !== undefined ? floor : address.floor,
            area: area || address.area,
            landmark: landmark !== undefined ? landmark : address.landmark,
            contactName: contactName || address.contactName,
            contactPhone: contactPhone !== undefined ? contactPhone : address.contactPhone,
            isDefault: isDefault !== undefined ? isDefault : address.isDefault,
        });

        res.json(address);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteAddress = async (req, res) => {
    try {
        const user = await User.findOne({ where: { phone: req.user.phone_number } });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const address = await Address.findOne({ where: { id: req.params.id, userId: user.id } });
        if (!address) return res.status(404).json({ message: 'Address not found' });

        await address.destroy();
        res.json({ message: 'Address deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getAddresses, createAddress, updateAddress, deleteAddress };
