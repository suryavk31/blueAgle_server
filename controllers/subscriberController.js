const { Subscriber } = require('../models');

// Public: Subscribe email from Coming Soon popup
const addSubscriber = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email || !email.includes('@')) {
            return res.status(400).json({ message: 'A valid email address is required.' });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Check if already subscribed
        const existing = await Subscriber.findOne({ where: { email: normalizedEmail } });
        if (existing) {
            return res.status(200).json({
                message: 'You are already on our VIP launch list! We will notify you the moment we open.',
                subscriber: existing
            });
        }

        const subscriber = await Subscriber.create({ email: normalizedEmail });
        return res.status(201).json({
            message: 'Thank you for subscribing! We will notify you at grand launch with exclusive launch offers.',
            subscriber
        });
    } catch (error) {
        console.error('Error adding subscriber:', error);
        return res.status(500).json({ message: error.message || 'Unable to save subscription.' });
    }
};

// Admin: Get all subscribers
const getAllSubscribers = async (req, res) => {
    try {
        const subscribers = await Subscriber.findAll({
            order: [['createdAt', 'DESC']]
        });
        return res.status(200).json({
            count: subscribers.length,
            subscribers
        });
    } catch (error) {
        console.error('Error fetching subscribers:', error);
        return res.status(500).json({ message: error.message || 'Error retrieving subscriber list.' });
    }
};

// Admin: Delete a subscriber
const deleteSubscriber = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Subscriber.destroy({ where: { id } });
        if (!deleted) {
            return res.status(404).json({ message: 'Subscriber not found.' });
        }
        return res.status(200).json({ message: 'Subscriber removed successfully.' });
    } catch (error) {
        console.error('Error deleting subscriber:', error);
        return res.status(500).json({ message: error.message || 'Error deleting subscriber.' });
    }
};

module.exports = {
    addSubscriber,
    getAllSubscribers,
    deleteSubscriber
};
