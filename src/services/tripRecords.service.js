// src/services/tripRecords.service.js
import { TripRecord } from '../models/TripRecord.js';
// 🟢 gcs.service에서 URL 생성 함수 import
import { generateSignedReadUrl } from './gcs.service.js';

/**
 * 🟢 GCS Key 배열을 Signed URL 배열로 변환하는 헬퍼 함수
 * @param {string[]} keys - GCS key 배열
 * @returns {Promise<string[]>} 서명된 URL 배열
 */
async function mapKeysToSignedUrls(keys) {
    if (!keys || keys.length === 0) return [];
    // 모든 key에 대해 병렬로 Signed URL 생성을 요청
    const urls = await Promise.all(
        keys.map(key => key ? generateSignedReadUrl(key) : null)
    );
    return urls.filter(Boolean); // null 값과 실패한(null 반환) URL 제거
}

// ✅ 수정: photoUrls에는 이제 GCS 'key' 배열이 저장됩니다.
export async function createTripRecord(userId, data) {
    const doc = await TripRecord.create({
        userId,
        groupId: data.groupId ?? null,
        title: data.title,
        content: data.content ?? '',
        date: data.date,
        photoUrls: data.photoUrls ?? [], // GCS key 배열

        // ✅ 추가
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
    });
    // .toObject()는 Mongoose 문서를 순수 객체로 변환합니다.
    // (populate된 결과와 일관성을 맞추기 위해 추가)
    const populatedDoc = await getMyTripRecordById(userId, doc._id);
    return populatedDoc;
}

export async function getMyTripRecordById(userId, id) {
    // groupId를 이용해 그룹의 name, color 필드를 함께 가져옵니다.
    // .lean()을 추가하여 순수 JavaScript 객체를 반환하도록 수정
    const doc = await TripRecord.findOne({ _id: id, userId })
        .populate({ path: 'groupId', select: 'name color' })
        .lean();

    // 🟢 조회 시 key 배열을 임시 URL 배열로 교체
    if (doc && doc.photoUrls) {
        doc.photoUrls = await mapKeysToSignedUrls(doc.photoUrls);
    }
    return doc;
}

// ✅ 수정: photoUrls에는 GCS 'key' 배열이 저장됩니다.
export async function updateMyTripRecord(userId, id, data) {
    const doc = await TripRecord.findOne({ _id: id, userId });
    if (!doc) return null;

    // 요청 DTO(data)에 포함된 필드만 선택적으로 업데이트
    if (data.title !== undefined) doc.title = data.title;
    if (data.date !== undefined) doc.date = data.date;
    if (data.groupId !== undefined) doc.groupId = data.groupId ?? null;
    if (data.content !== undefined) doc.content = data.content ?? '';
    // 🟢 GCS key 배열로 업데이트
    if (data.photoUrls !== undefined) doc.photoUrls = data.photoUrls ?? [];

    // ✅ 추가: 좌표 필드 업데이트
    if (data.latitude !== undefined) doc.latitude = data.latitude ?? null;
    if (data.longitude !== undefined) doc.longitude = data.longitude ?? null;

    await doc.save();

    // 저장 후 populate된 결과를 반환
    const populatedDoc = await getMyTripRecordById(userId, doc._id);
    return populatedDoc;
}

export async function deleteMyTripRecord(userId, id) {
    return TripRecord.findOneAndDelete({ _id: id, userId });
}

export async function listMyTripRecords(userId, filter, page, limit) {
    const [items, total] = await Promise.all([
        // .populate()를 추가하여 각 기록의 그룹 정보를 함께 가져옵니다.
        // .lean()을 추가하여 순수 JavaScript 객체를 반환하도록 수정
        TripRecord.find({ userId, ...filter })
            .populate({ path: 'groupId', select: 'name color' }) // groupId로 Group의 name, color를 찾습니다.
            .sort({ date: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        TripRecord.countDocuments({ userId, ...filter })
    ]);

    // 🟢 목록의 모든 item에 대해 URL 변환 적용
    for (const item of items) {
        if (item.photoUrls) {
            item.photoUrls = await mapKeysToSignedUrls(item.photoUrls);
        }
    }

    return { items, total };
}