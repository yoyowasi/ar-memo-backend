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

    jwt: {
        secret: req('JWT_SECRET'),
        expires: req('JWT_EXPIRES', '7d')
    },

    gcs: {
        bucket: req('GCS_BUCKET', ''),
        keyFilePath: process.env.GOOGLE_APPLICATION_CREDENTIALS
    }
};
