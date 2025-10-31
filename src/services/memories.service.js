// src/services/memories.service.js
import { Memory } from '../models/Memory.js';
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
        // GCS URL 형식이 아닌 경우 (예: 로컬 /uploads/...)
        return null;
    } catch (e) {
        return null;
    }
}

/**
 * Memory 객체의 photoUrl, thumbUrl을 Signed URL로 변환합니다.
 * @param {object} memory Mongoose Document 또는 lean() 객체
 * @returns {Promise<object>} URL이 변환된 객체
 */
async function signMemoryUrls(memory) {
    if (!memory) return null;
    // lean() 객체가 아닐 경우를 대비해 .toObject() 사용
    const doc = memory.toObject ? memory.toObject() : memory;

    const photoKey = getKeyFromUrl(doc.photoUrl);
    const thumbKey = getKeyFromUrl(doc.thumbUrl);

    // Promise.all로 병렬 처리
    const [signedPhotoUrl, signedThumbUrl] = await Promise.all([
        photoKey ? createPresignedReadUrl(photoKey) : Promise.resolve(doc.photoUrl), // 키가 있으면 서명, 없으면 원본 유지
        thumbKey ? createPresignedReadUrl(thumbKey) : Promise.resolve(doc.thumbUrl)  // 키가 있으면 서명, 없으면 원본 유지
    ]);

    return {
        ...doc,
        photoUrl: signedPhotoUrl,
        thumbUrl: signedThumbUrl,
    };
}
// ▲▲▲ [헬퍼 함수 추가] ▲▲▲


export async function createMemory(userId, d) {
    const doc = await Memory.create({ // 원본은 DB에 그대로 저장
        userId,
        location: { type: 'Point', coordinates: [d.longitude, d.latitude] },
        anchor: d.anchor ?? null,
        text: d.text,
        photoUrl: d.photoUrl ?? undefined,
        audioUrl: d.audioUrl ?? undefined,
        thumbUrl: d.thumbUrl ?? undefined,
        tags: d.tags ?? [],
        favorite: d.favorite ?? false,
        visibility: d.visibility ?? 'private',
        groupId: d.groupId ?? null
    });
    // ▼▼▼ [수정] ▼▼▼
    // 클라이언트에 반환하기 전에 URL을 서명합니다.
    return signMemoryUrls(doc);
}

export async function getMyMemoryById(userId, id) {
    const doc = await Memory.findOne({ _id: id, userId }).lean();
    // ▼▼▼ [수정] ▼▼▼
    return signMemoryUrls(doc); // 반환 전 서명
}

export async function updateMyMemory(userId, id, body) {
    const updated = await Memory.findOneAndUpdate(
        { _id: id, userId },
        body,
        { new: true, runValidators: true }
    ).lean();
    // ▼▼▼ [수정] ▼▼▼
    return signMemoryUrls(updated); // 반환 전 서명
}

export async function deleteMyMemory(userId, id) {
    return Memory.findOneAndDelete({ _id: id, userId });
}

export async function listMyMemories(userId, filter, page, limit) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
        Memory.find({ userId, ...filter })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Memory.countDocuments({ userId, ...filter })
    ]);

    // ▼▼▼ [수정] ▼▼▼
    // 목록의 모든 아이템에 대해 URL 서명
    const signedItems = await Promise.all(items.map(signMemoryUrls));
    return { items: signedItems, total };
}

export async function findMyNearby(userId, lng, lat, radius) {
    const items = await Memory.find({
        userId,
        location: {
            $near: {
                $geometry: { type: 'Point', coordinates: [lng, lat] },
                $maxDistance: radius
            }
        }
    }).limit(500).lean();

    // ▼▼▼ [수정] ▼▼▼
    const signedItems = await Promise.all(items.map(signMemoryUrls));
    return signedItems;
}

export async function findMyInView(userId, bbox, center, limit = 200) {
    const polygon = {
        type: 'Polygon',
        coordinates: [[
            [bbox.swLng, bbox.swLat], [bbox.neLng, bbox.swLat],
            [bbox.neLng, bbox.neLat], [bbox.swLng, bbox.neLat],
            [bbox.swLng, bbox.swLat]
        ]]
    };

    const pipeline = [
        {
            $geoNear: {
                near: { type: 'Point', coordinates: [center.lng, center.lat] },
                distanceField: 'distCalculated',
                spherical: true,
                query: { userId, location: { $geoWithin: { $geometry: polygon } } }
            }
        },
        { $limit: limit }
    ];
    const items = await Memory.aggregate(pipeline);

    // ▼▼▼ [수정] ▼▼▼
    const signedItems = await Promise.all(items.map(signMemoryUrls));
    return signedItems;
}