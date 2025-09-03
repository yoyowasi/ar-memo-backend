// src/services/memories.service.js
import { env } from '../env.js';
import { Storage } from '@google-cloud/storage'; // ⬅️ GCS 라이브러리 import

// GCS 클라이언트 초기화
const storage = new Storage({
    keyFilename: env.gcs.keyFilePath
});
const bucket = storage.bucket(env.gcs.bucket);


// ... createMemory, getMemoryById 등 다른 서비스 함수들은 그대로 ...
export async function createMemory(memoryData) { /* 이전과 동일 */ }
export async function getMemoryById(id) { /* 이전과 동일 */ }
export async function findMemoriesNear({ lat, lng, radius }) { /* 이전과 동일 */ }
export async function updateMemory(id, updateData) { /* 이전과 동일 */ }
export async function deleteMemory(id) { /* 이전과 동일 */ }


/**
 * GCS V4 Signed URL을 생성합니다. (업로드용)
 * @param {string} key - GCS에 저장될 파일 이름 (객체 키)
 * @param {string} contentType - 파일의 Content-Type
 * @returns {Promise<{url: string, publicUrl: string}>} Signed URL과 최종 접근 URL
 */
export async function createPresignedUrl(key, contentType) {
    const options = {
        version: 'v4',
        action: 'write', // 'write'는 업로드를 의미
        expires: Date.now() + 15 * 60 * 1000, // 15분 후 만료
        contentType: contentType,
    };

    // GCS 파일 객체에 대한 Signed URL 생성
    const [url] = await bucket.file(key).getSignedUrl(options);

    const publicUrl = `https://storage.googleapis.com/${env.gcs.bucket}/${key}`;

    return { url, publicUrl };
}