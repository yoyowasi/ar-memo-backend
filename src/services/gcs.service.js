// src/services/gcs.service.js
import { env } from '../env.js';
import { Storage } from '@google-cloud/storage';

const storage = new Storage({
    keyFilename: env.gcs.keyFilePath
});
const bucket = storage.bucket(env.gcs.bucket);

/**
 * GCS V4 Signed URL을 생성합니다. (업로드용 - 현재 미사용)
 * @param {string} key - GCS에 저장될 파일 이름 (객체 키)
 * @param {string} contentType - 파일의 Content-Type
 * @returns {Promise<{url: string, publicUrl: string}>} Signed URL과 최종 접근 URL
 */
export async function createPresignedUrl(key, contentType) {
    const options = {
        version: 'v4',
        action: 'write',
        expires: Date.now() + 15 * 60 * 1000, // 15분 후 만료
        contentType: contentType,
    };

    const [url] = await bucket.file(key).getSignedUrl(options);
    const publicUrl = `https://storage.googleapis.com/${env.gcs.bucket}/${key}`;

    return { url, publicUrl };
}

/**
 * 🟢 수정: 메모리 버퍼를 GCS에 '비공개'로 직접 업로드하고 'key'를 반환합니다.
 * @param {string} key - GCS에 저장될 파일 이름 (객체 키: 예: 2024-01-01/uuid.jpg)
 * @param {Buffer} buffer - 파일 내용 (Multer의 buffer)
 * @param {string} contentType - 파일의 Content-Type
 * @returns {Promise<{key: string, bytes: number}>} 업로드된 파일의 key와 용량
 */
export async function uploadBuffer(key, buffer, contentType) {
    const file = bucket.file(key);
    await file.save(buffer, {
        // ⛔ public: true 옵션이 없어야 비공개로 업로드됩니다.
        metadata: {
            contentType: contentType,
            // 캐시 최적화: 1년 캐시 유지
            cacheControl: 'public, max-age=31536000, immutable'
        }
    });

    // publicUrl 대신 key를 반환합니다.
    return {
        key: key,
        bytes: buffer.length
    };
}

/**
 * 🟢 추가: 비공개 파일의 임시 읽기 URL (Signed URL)을 생성합니다.
 * @param {string} key - GCS 객체 키
 * @returns {Promise<string | null>} 15분간 유효한 서명된 URL (실패 시 null)
 */
export async function generateSignedReadUrl(key) {
    if (!key) return null; // key가 없는 경우 null 반환

    const options = {
        version: 'v4',
        action: 'read',
        expires: Date.now() + 15 * 60 * 1000, // 15분 후 만료
    };

    try {
        const [url] = await bucket.file(key).getSignedUrl(options);
        return url;
    } catch (e) {
        console.error('Failed to generate signed URL for key:', key, e);
        return null;
    }
}