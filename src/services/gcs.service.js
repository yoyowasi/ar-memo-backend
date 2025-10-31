// src/services/gcs.service.js
import { env } from '../env.js';
import { Storage } from '@google-cloud/storage';

const storage = new Storage({
    keyFilename: env.gcs.keyFilePath
});
const bucket = storage.bucket(env.gcs.bucket);

/**
 * GCS V4 Signed URL을 생성합니다. (업로드용)
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
 * 🟢 추가: 메모리 버퍼를 GCS에 직접 업로드합니다.
 * @param {string} key - GCS에 저장될 파일 이름 (객체 키: 예: 2024-01-01/uuid.jpg)
 * @param {Buffer} buffer - 파일 내용 (Multer의 buffer)
 * @param {string} contentType - 파일의 Content-Type
 * @returns {Promise<{publicUrl: string, bytes: number}>} 업로드된 파일의 최종 접근 URL
 */
export async function uploadBuffer(key, buffer, contentType) {
    const file = bucket.file(key);
    await file.save(buffer, {
        metadata: {
            contentType: contentType,
            // 캐시 최적화: 1년 캐시 유지
            cacheControl: 'public, max-age=31536000, immutable'
        },
        // 🚨 public: true 옵션이 없어야 비공개로 저장됩니다.
    });

    const publicUrl = `https://storage.googleapis.com/${env.gcs.bucket}/${key}`;

    return {
        publicUrl,
        bytes: buffer.length
    };
}

// ▼▼▼▼▼ [새 함수 추가] ▼▼▼▼▼
/**
 * GCS V4 Signed URL을 생성합니다. (읽기용)
 * @param {string} key - GCS에 저장된 파일 이름 (객체 키)
 * @returns {Promise<string>} 1분 동안 유효한 읽기 전용 Signed URL
 */
export async function createPresignedReadUrl(key) {
    // URL에서 쿼리스트링 (예: ?alt=media)이 붙어있는 경우 제거
    const cleanKey = key.split('?')[0];

    const options = {
        version: 'v4',
        action: 'read',
        expires: Date.now() + 1 * 60 * 1000, // 1분 후 만료
    };

    try {
        const [url] = await bucket.file(cleanKey).getSignedUrl(options);
        return url;
    } catch (e) {
        console.error(`[GCS Read URL] Failed to sign key: ${cleanKey}`, e);
        return null; // 서명 실패 시 null 반환
    }
}
// ▲▲▲▲▲ [새 함수 추가] ▲▲▲▲▲