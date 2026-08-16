const multer = require('multer');
const path = require('path');

// Use Memory Storage for ImageKit upload
const storage = multer.memoryStorage();

const imageFileFilter = (req, file, cb) => {
    const allowedExtensions = /jpeg|jpg|png|gif|webp|svg|avif|bmp|heic/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const isExtAllowed = allowedExtensions.test(ext);
    const isMimeAllowed = file.mimetype.startsWith('image/');

    if (isExtAllowed && isMimeAllowed) {
        return cb(null, true);
    }
    cb(new Error(`Only image files are allowed. Received: ${file.mimetype}`), false);
};

const mediaFileFilter = (req, file, cb) => {
    const allowedExtensions = /jpeg|jpg|png|gif|webp|svg|avif|bmp|heic|mp4|webm|mov|mkv/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const isExtAllowed = allowedExtensions.test(ext);
    const isMimeAllowed = file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/');

    if (isExtAllowed && isMimeAllowed) {
        return cb(null, true);
    }
    cb(new Error(`Only image and video files are allowed. Received: ${file.mimetype}`), false);
};

// Image-only upload (10MB) — for product images, category images, etc.
const uploadImage = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: imageFileFilter,
});

// Media upload (50MB) — for ad media that may include videos
const uploadMedia = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: mediaFileFilter,
});

// Default export kept for backwards compatibility — uses image config
module.exports = uploadImage;
module.exports.uploadImage = uploadImage;
module.exports.uploadMedia = uploadMedia;
