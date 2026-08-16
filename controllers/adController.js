const { Ad, AdAnalytics, sequelize } = require('../models');
const { uploadToImageKit } = require('../utils/imageKitHelper');

// CRUD
const createAd = async (req, res) => {
    try {
        const { title, type, mediaUrl, redirectUrl, location, isActive, mediaType } = req.body;

        let finalMediaUrl = mediaUrl;
        if (req.file) {
            const result = await uploadToImageKit(req.file.buffer, req.file.originalname);
            finalMediaUrl = result.url;
        }

        const ad = await Ad.create({
            title, type, mediaType: mediaType || 'image', mediaUrl: finalMediaUrl, redirectUrl, location, isActive
        });
        res.status(201).json(ad);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAds = async (req, res) => {
    try {
        const { location } = req.query;
        let where = { isActive: true };
        if (location) where.location = location;

        const ads = await Ad.findAll({ where });
        res.json(ads);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAllAdsAdmin = async (req, res) => {
    try {
        const ads = await Ad.findAll();
        res.json(ads);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

const updateAd = async (req, res) => {
    try {
        const { id } = req.params;
        const ad = await Ad.findByPk(id);
        if (!ad) return res.status(404).json({ message: 'Ad not found' });

        const { title, isActive, location, redirectUrl } = req.body;
        ad.title = title || ad.title;
        ad.isActive = isActive !== undefined ? isActive : ad.isActive;
        ad.location = location || ad.location;
        ad.redirectUrl = redirectUrl || ad.redirectUrl;

        if (req.file) {
            const result = await uploadToImageKit(req.file.buffer, req.file.originalname);
            ad.mediaUrl = result.url;
        }

        await ad.save();
        res.json(ad);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteAd = async (req, res) => {
    try {
        const { id } = req.params;
        await Ad.destroy({ where: { id } });
        res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Tracking
const trackEvent = async (req, res) => {
    const { adId, type } = req.body;
    if (!adId || !['impression', 'click'].includes(type)) {
        return res.status(400).json({ message: 'Invalid track data' });
    }

    const userId = req.user?.uid || req.user?.id || null;
    let retries = 3;

    while (retries > 0) {
        const t = await sequelize.transaction();
        try {
            // Fetch with UPDATE lock to prevent race conditions during read-modify-write
            const ad = await Ad.findByPk(adId, { 
                transaction: t,
                lock: t.LOCK.UPDATE
            });

            if (!ad) {
                await t.rollback();
                return res.status(404).json({ message: 'Ad not found' });
            }

            // Record the analytics event
            await AdAnalytics.create({ adId, type, userId }, { transaction: t });

            // Use atomic increment to avoid lost updates and reduce lock contention duration
            const updateField = type === 'impression' ? 'impressions' : 'clicks';
            await ad.increment(updateField, { by: 1, transaction: t });

            await t.commit();
            return res.json({ success: true });
        } catch (error) {
            try {
                await t.rollback();
            } catch (rbError) {
                // Ignore rollback errors if transaction already finished
            }

            // ER_LOCK_DEADLOCK (1213) is transient; retry the transaction
            if (error.name === 'SequelizeDatabaseError' && error.parent?.errno === 1213) {
                retries--;
                if (retries > 0) {
                    await new Promise(res => setTimeout(res, 100 * (3 - retries))); // Simple backoff
                    continue;
                }
            }

            console.error("Tracking Error", error);
            return res.status(500).json({ message: 'Tracking failed' });
        }
    }
    
    res.status(500).json({ message: 'Tracking failed due to high database contention' });
};

module.exports = {
    createAd,
    getAds,
    getAllAdsAdmin,
    updateAd,
    deleteAd,
    trackEvent
};
