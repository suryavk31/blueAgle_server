const ImageKit = require('imagekit');
const dotenv = require('dotenv');
dotenv.config();

let imagekit;
try {
    const pub = process.env.IMAGEKIT_PUBLIC_KEY;
    const priv = process.env.IMAGEKIT_PRIVATE_KEY;
    const url = process.env.IMAGEKIT_URL_ENDPOINT;

    console.log("📸 [ImageKit Config Check]");
    console.log("  - Public Key:", pub ? `Found (${pub.substring(0, 10)}...)` : "MISSING");
    console.log("  - Private Key:", priv ? `Found (${priv.substring(0, 10)}...)` : "MISSING");
    console.log("  - URL Endpoint:", url || "MISSING");

    if (pub && priv && url) {
        imagekit = new ImageKit({
            publicKey: pub,
            privateKey: priv,
            urlEndpoint: url
        });
        console.log("✅ [ImageKit SDK] Successfully initialized ImageKit instance.");
    } else {
        console.warn("⚠️ [ImageKit SDK] Keys missing in process.env. Will fallback to local disk storage.");
        imagekit = null;
    }
} catch (error) {
    console.error("❌ [ImageKit SDK] Initialization error:", error.message);
    imagekit = null;
}

module.exports = imagekit;
