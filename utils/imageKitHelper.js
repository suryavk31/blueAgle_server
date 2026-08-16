const imagekit = require('../config/imagekit');
const fs = require('fs');
const path = require('path');

const uploadToImageKit = async (fileBuffer, fileName) => {
    console.log(`🚀 [uploadToImageKit] Initiating upload for file: "${fileName}" (Buffer size: ${fileBuffer ? fileBuffer.length : 0} bytes)`);

    // 1. If ImageKit is initialized, attempt upload
    if (imagekit) {
        try {
            console.log(`📡 [uploadToImageKit] Sending API upload request to ImageKit...`);
            const result = await new Promise((resolve, reject) => {
                imagekit.upload({
                    file: fileBuffer,
                    fileName: fileName,
                    folder: '/project_one'
                }, function (error, result) {
                    if (error) {
                        console.error(`❌ [uploadToImageKit] ImageKit API returned error:`, error);
                        reject(error);
                    } else {
                        console.log(`✅ [uploadToImageKit] ImageKit API returned success:`, result?.url);
                        resolve(result);
                    }
                });
            });

            if (result && result.url) {
                return result;
            }
        } catch (error) {
            console.warn(`⚠️ [uploadToImageKit] ImageKit upload failed (${error.message}). Falling back to local disk storage...`);
        }
    } else {
        console.log(`ℹ️ [uploadToImageKit] ImageKit SDK instance is null. Using local storage fallback.`);
    }

    // 2. Local fallback storage
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    const ext = path.extname(fileName) || '.jpg';
    const uniqueFileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
    const filePath = path.join(uploadDir, uniqueFileName);

    console.log(`💾 [uploadToImageKit] Writing file locally to: ${filePath}`);
    await fs.promises.writeFile(filePath, fileBuffer);

    const localResult = {
        url: `/uploads/${uniqueFileName}`,
        fileId: uniqueFileName,
        name: fileName
    };
    console.log(`✅ [uploadToImageKit] Local file saved successfully:`, localResult.url);
    return localResult;
};

module.exports = { uploadToImageKit };
