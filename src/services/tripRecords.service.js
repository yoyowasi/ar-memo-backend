// src/services/tripRecords.service.js
import { TripRecord } from '../models/TripRecord.js';
// 🟢 gcs.service에서 URL 생성 함수 import
import { generateSignedReadUrl } from './gcs.service.js';

/**
 * GCS key 배열을 Signed URL 배열로 변환
 * @param {string[]} keys
 * @returns {Promise<string[]>}
 */
async function mapKeysToSignedUrls(keys) {
    if (!keys || keys.length === 0) return [];
    const urls = await Promise.all(
        keys.map(key => (key ? generateSignedReadUrl(key) : null))
    );
    return urls.filter(Boolean);
}

// ✅ 공통: 위도/경도 안전하게 만드는 함수
function normalizeLatLng(data) {
    const hasPhotos = Array.isArray(data.photoUrls) && data.photoUrls.length > 0;

    // number 이고 NaN 아니면 그대로
    const isNum = (v) => typeof v === 'number' && !Number.isNaN(v);

    if (hasPhotos) {
        // ✅ 사진이 있는데 위치가 없으면 무조건 null
        return {
            latitude: isNum(data.latitude) ? data.latitude : null,
            longitude: isNum(data.longitude) ? data.longitude : null,
        };
    }

    // ✅ 사진이 없으면 프론트가 보낸 값만 허용 (undefined면 그대로 undefined)
    return {
        latitude: isNum(data.latitude) ? data.latitude : data.latitude ?? null,
        longitude: isNum(data.longitude) ? data.longitude : data.longitude ?? null,
    };
}

// ✅ 생성: photoUrls에는 GCS 'key' 배열이 들어온다.
export async function createTripRecord(userId, data) {
    const { latitude, longitude } = normalizeLatLng(data);

    const doc = await TripRecord.create({
        userId,
        groupId: data.groupId ?? null,
        title: data.title,
        content: data.content ?? '',
        date: data.date,
        photoUrls: data.photoUrls ?? [],

        // ✅ 여기서 확정된 값만 쓴다
        latitude,
        longitude,
    });

    // 저장 후 populate해서 반환
    const populatedDoc = await getMyTripRecordById(userId, doc._id);
    return populatedDoc;
}

export async function getMyTripRecordById(userId, id) {
    const doc = await TripRecord.findOne({ _id: id, userId })
        .populate({ path: 'groupId', select: 'name color' })
        .lean();

    if (doc && doc.photoUrls) {
        doc.photoKeys = [...doc.photoUrls];
        doc.photoUrls = await mapKeysToSignedUrls(doc.photoUrls);
    }
    return doc;
}

// ✅ 수정: photoUrls에는 GCS 'key' 배열이 저장된다.
export async function updateMyTripRecord(userId, id, data) {
    const doc = await TripRecord.findOne({ _id: id, userId });
    if (!doc) return null;

    if (data.title !== undefined) doc.title = data.title;
    if (data.date !== undefined) doc.date = data.date;
    if (data.groupId !== undefined) doc.groupId = data.groupId ?? null;
    if (data.content !== undefined) doc.content = data.content ?? '';

    // 사진 key 배열 업데이트
    if (data.photoUrls !== undefined) {
        doc.photoUrls = data.photoUrls ?? [];
    }

    // ✅ 위치 처리: “사진이 있는데 위치가 없으면 null” 강제
    if (
        data.latitude !== undefined ||
        data.longitude !== undefined ||
        data.photoUrls !== undefined
    ) {
        // data 안에 들어있는 최신 값을 기반으로 다시 한 번 정규화
        const merged = {
            // 현재 DB 값
            photoUrls: data.photoUrls !== undefined ? data.photoUrls : doc.photoUrls,
            latitude: data.latitude !== undefined ? data.latitude : doc.latitude,
            longitude: data.longitude !== undefined ? data.longitude : doc.longitude,
        };
        const { latitude, longitude } = normalizeLatLng(merged);
        doc.latitude = latitude;
        doc.longitude = longitude;
    }

    await doc.save();

    const populatedDoc = await getMyTripRecordById(userId, doc._id);
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
        TripRecord.countDocuments({ userId, ...filter }),
    ]);

    for (const item of items) {
        if (item.photoUrls) {
            item.photoKeys = [...item.photoUrls];
            item.photoUrls = await mapKeysToSignedUrls(item.photoUrls);
        }
    }

    return { items, total };
}
