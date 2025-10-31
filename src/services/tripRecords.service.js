// src/services/tripRecords.service.js
import { TripRecord } from '../models/TripRecord.js';
// ▼▼▼ [추가] ▼▼▼
import { createPresignedReadUrl } from './gcs.service.js';
import { env } from '../env.js';

// ▼▼▼ [헬퍼 함수 추가] ▼▼▼
/**
 * DB에 저장된 GCS publicUrl에서 파일 키(key)를 추출합니다.
 * @param {string} url (예: https://storage.googleapis.com/BUCKET_NAME/KEY)
 * @returns {string} (예: KEY)
 */
function getKeyFromUrl(url) {
    if (!url) return null;
    try {
        const prefix = `https://storage.googleapis.com/${env.gcs.bucket}/`;
        if (url.startsWith(prefix)) {
            return url.substring(prefix.length);
        }
        return null;
    } catch (e) {
        return null;
    }
}

/**
 * TripRecord 객체의 photoUrls 배열을 Signed URL로 변환합니다.
 * @param {object} record Mongoose Document 또는 lean() 객체
 * @returns {Promise<object>} URL이 변환된 객체
 */
async function signTripRecordUrls(record) {
    if (!record) return null;
    // lean() 객체가 아닐 경우를 대비해 .toObject() 사용
    const doc = record.toObject ? record.toObject() : record;

    if (doc.photoUrls && doc.photoUrls.length > 0) {
        const signedUrls = await Promise.all(
            doc.photoUrls.map(url => {
                const key = getKeyFromUrl(url);
                return key ? createPresignedReadUrl(key) : Promise.resolve(url);
            })
        );
        doc.photoUrls = signedUrls;
    }

    return doc;
}
// ▲▲▲ [헬퍼 함수 추가] ▲▲▲

export async function createTripRecord(userId, data) {
    const doc = await TripRecord.create({
        userId,
        groupId: data.groupId ?? null,
        title: data.title,
        content: data.content ?? '',
        date: data.date,
        photoUrls: data.photoUrls ?? [],
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
    });

    // populate된 결과를 가져오는 함수로 변경 (기존 로직 유지)
    const populatedDoc = await getMyTripRecordById(userId, doc._id);

    // ▼▼▼ [수정] ▼▼▼
    // populatedDoc은 이미 signTripRecordUrls를 호출하므로 별도 호출 필요 없음
    return populatedDoc;
}

export async function getMyTripRecordById(userId, id) {
    const doc = await TripRecord.findOne({ _id: id, userId })
        .populate({ path: 'groupId', select: 'name color' })
        .lean();

    // ▼▼▼ [수정] ▼▼▼
    return signTripRecordUrls(doc); // 반환 전 서명
}

export async function updateMyTripRecord(userId, id, data) {
    const doc = await TripRecord.findOne({ _id: id, userId });
    if (!doc) return null;

    if (data.title !== undefined) doc.title = data.title;
    if (data.date !== undefined) doc.date = data.date;
    if (data.groupId !== undefined) doc.groupId = data.groupId ?? null;
    if (data.content !== undefined) doc.content = data.content ?? '';
    if (data.photoUrls !== undefined) doc.photoUrls = data.photoUrls ?? [];
    if (data.latitude !== undefined) doc.latitude = data.latitude ?? null;
    if (data.longitude !== undefined) doc.longitude = data.longitude ?? null;

    await doc.save();

    // 저장 후 populate된 결과를 반환 (기존 로직 유지)
    const populatedDoc = await getMyTripRecordById(userId, doc._id);

    // ▼▼▼ [수정] ▼▼▼
    // populatedDoc은 이미 signTripRecordUrls를 호출하므로 별도 호출 필요 없음
    return populatedDoc;
}

export async function deleteMyTripRecord(userId, id) {
    return TripRecord.findOneAndDelete({ _id: id, userId });
}

export async function listMyTripRecords(userId, filter, page, limit) {
    const [items, total] = await Promise.all([
        TripRecord.find({ userId, ...filter })
            .populate({ path: 'groupId', select: 'name color' })
            .sort({ date: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        TripRecord.countDocuments({ userId, ...filter })
    ]);

    // ▼▼▼ [수정] ▼▼▼
    // 목록의 모든 아이템에 대해 URL 서명
    const signedItems = await Promise.all(items.map(signTripRecordUrls));
    return { items: signedItems, total };
}