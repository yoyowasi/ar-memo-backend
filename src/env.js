// src/env.js
import 'dotenv/config';
// 🟢 Node.js 기본 모듈 import 추가 (임시 파일 생성을 위해 필요)
import fs from 'fs';
import path from 'path';
import os from 'os';

function req(name, fallback) {
    const v = process.env[name] ?? fallback;
    if (v === undefined) throw new Error(`Missing env: ${name}`);
    return v;
}

// GCS 키를 환경 변수에서 읽어 임시 파일로 저장하는 함수
function getGcsKeyFilePath() {
    // 1. 배포 환경: GOOGLE_APPLICATION_CREDENTIALS_JSON 환경 변수가 JSON 내용 전체를 가질 때
    const jsonKey = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

    // 2. 로컬 개발 환경: .env 파일에서 GOOGLE_APPLICATION_CREDENTIALS 경로를 가리킬 때
    const localKeyPath = process.env.GCS_KEY_FILE_PATH;

    if (jsonKey) {
        // 임시 파일 경로를 생성 (OS 종류에 관계없이)
        const tempFilePath = path.join(os.tmpdir(), 'gcs-keyfile.json');

        // JSON 내용을 임시 파일에 기록
        fs.writeFileSync(tempFilePath, jsonKey);

        return tempFilePath;
    }

    if (localKeyPath) {
        // 로컬 경로의 파일이 존재하는지 확인 (Node.js 18 이상에서는 fs.existsSync는 잘 동작함)
        if (fs.existsSync(localKeyPath)) {
            return localKeyPath;
        }
    }

    // GCS 버킷이 설정되었지만 키가 없는 경우 오류 발생
    if (process.env.GCS_BUCKET) {
        throw new Error('GCS_BUCKET is set, but GCS key configuration is missing.');
    }

    return undefined; // GCS를 사용하지 않는 경우 (에러 방지)
}


export const env = {
    port: parseInt(req('PORT', '4000'), 10),
    nodeEnv: req('NODE_ENV', 'development'),
    corsOrigin: req('CORS_ORIGIN', '*'),
    mongoUri: req('MONGODB_URI'),

    jwt: {
        secret: req('JWT_SECRET'),
        expires: req('JWT_EXPIRES', '7d')
    },

    gcs: {
        bucket: req('GCS_BUCKET', ''),
        keyFilePath: getGcsKeyFilePath()
    }
};