// src/env.js
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

    // 👇 S3 설정을 GCS 설정으로 변경
    gcs: {
        bucket: req('GCS_BUCKET'), // .env 파일에 GCS 버킷 이름 추가
        keyFilePath: process.env.GOOGLE_APPLICATION_CREDENTIALS // .env 파일에 키 파일 경로 추가
    }
};