import 'dotenv/config';

function req(name, fallback) {
    const v = process.env[name] ?? fallback;
    if (v === undefined) throw new Error(`Missing env: ${name}`);
    return v;
}

export const env = {
    port: parseInt(req('PORT', '3000'), 10),
    nodeEnv: req('NODE_ENV', 'development'),
    corsOrigin: req('CORS_ORIGIN', '*'),
    mongoUri: req('MONGODB_URI'),
    s3: {
        region: process.env.S3_REGION,
        bucket: process.env.S3_BUCKET,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        presignExpires: parseInt(process.env.S3_PRESIGN_EXPIRES ?? '300', 10)
    }
};
