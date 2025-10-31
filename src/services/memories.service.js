// src/services/memories.service.js
import { Memory } from '../models/Memory.js';
// 🟢 1. gcs.service에서 올바른 이름의 함수 import
import { generateSignedReadUrl } from './gcs.service.js';

/**
 * 🟢 2. GCS Key를 Signed URL로 변환하는 헬퍼 함수
 * @param {string} key - 단일 GCS key
 * @returns {Promise<string | null>} 서명된 URL
 */
async function mapKeyToSignedUrl(key) {
    if (!key) return null;
    return generateSignedReadUrl(key);
}

/**
 * 🟢 3. Mongoose 문서(lean)의 URL 필드를 변환하는 헬퍼 함수
 * @param {object} doc - .lean()으로 변환된 Mongoose 문서
 */
async function hydrateDocUrls(doc) {
    if (!doc) return doc;
    // 병렬로 처리
    [doc.photoUrl, doc.audioUrl, doc.thumbUrl] = await Promise.all([
        mapKeyToSignedUrl(doc.photoUrl), // photoUrl key -> signed url
        mapKeyToSignedUrl(doc.audioUrl), // audioUrl key -> signed url
        mapKeyToSignedUrl(doc.thumbUrl)  // thumbUrl key -> signed url
    ]);
    return doc;
}

/**
 * 🟢 4. Mongoose 문서 목록(lean)의 URL 필드를 변환하는 헬퍼 함수
 * @param {object[]} docs - .lean()으로 변환된 Mongoose 문서 배열
 */
async function hydrateDocsUrls(docs) {
    if (!docs || docs.length === 0) return docs;
    // 모든 문서를 병렬로 처리
    return Promise.all(docs.map(doc => hydrateDocUrls(doc)));
}


// === 서비스 함수들 수정 ===

export async function createMemory(userId, d) {
    // 🟢 create 에서는 client가 보낸 key를 그대로 저장
    const doc = await Memory.create({
        userId,
        location: { type: 'Point', coordinates: [d.longitude, d.latitude] },
        anchor: d.anchor ?? null,
        text: d.text,
        photoUrl: d.photoUrl ?? undefined, // (key가 저장됨)
        audioUrl: d.audioUrl ?? undefined, // (key가 저장됨)
        thumbUrl: d.thumbUrl ?? undefined, // (key가 저장됨)
        tags: d.tags ?? [],
        favorite: d.favorite ?? false,
        visibility: d.visibility ?? 'private',
        groupId: d.groupId ?? null
    });
    // 🟢 반환 전 URL 변환 (toObject()로 순수 객체로 만듦)
    return hydrateDocUrls(doc.toObject());
}

export async function getMyMemoryById(userId, id) {
    // .lean()을 추가하여 순수 JS 객체로 반환
    const doc = await Memory.findOne({ _id: id, userId }).lean();
    // 🟢 반환 전 URL 변환
    return hydrateDocUrls(doc);
}

export async function updateMyMemory(userId, id, body) {
    // 🟢 update 에서는 client가 보낸 key를 그대로 저장
    const updatedDoc = await Memory.findOneAndUpdate(
        { _id: id, userId },
        body, // (body에 photoUrl: key, thumbUrl: key 등이 포함됨)
        { new: true, runValidators: true }
    ).lean();

    // 🟢 반환 전 URL 변환
    return hydrateDocUrls(updatedDoc);
}

export async function deleteMyMemory(userId, id) {
    // 삭제 결과(삭제된 문서 또는 null)를 반환합니다.
    return Memory.findOneAndDelete({ _id: id, userId });
}

export async function listMyMemories(userId, filter, page, limit) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
        // .lean() 추가
        Memory.find({ userId, ...filter })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Memory.countDocuments({ userId, ...filter })
    ]);

    // 🟢 반환 전 URL 변환
    const hydratedItems = await hydrateDocsUrls(items);
    return { items: hydratedItems, total };
}

export async function findMyNearby(userId, lng, lat, radius) {
    // .lean() 추가.
    const items = await Memory.find({
        userId,
        location: {
            $near: {
                $geometry: { type: 'Point', coordinates: [lng, lat] },
                $maxDistance: radius // 미터 단위
            }
        }
    }).limit(500).lean();

    // 🟢 반환 전 URL 변환
    return hydrateDocsUrls(items);
}

export async function findMyInView(userId, bbox, center, limit = 200) {
    // 주어진 경계 상자(bounding box) 내 메모리 검색
    const polygon = {
        type: 'Polygon',
        coordinates: [[
            [bbox.swLng, bbox.swLat], [bbox.neLng, bbox.swLat], // 남서 -> 남동
            [bbox.neLng, bbox.neLat], [bbox.swLng, bbox.neLat], // 남동 -> 북동 -> 북서
            [bbox.swLng, bbox.swLat]  // 북서 -> 남서 (닫기)
        ]]
    };

    // Aggregation pipeline 사용: 지리 공간 쿼리 + 거리 기준 정렬 + 제한
    const pipeline = [
        {
            $geoNear: {
                near: { type: 'Point', coordinates: [center.lng, center.lat] }, // 중심점 기준
                distanceField: 'distCalculated', // 계산된 거리 필드 이름
                spherical: true, // 구면 거리 계산 사용
                query: { userId, location: { $geoWithin: { $geometry: polygon } } } // 경계 내 + 사용자 ID 필터
            }
        },
        // $geoNear는 자동으로 거리순 정렬하므로 별도 $sort 불필요
        { $limit: limit } // 결과 수 제한
    ];
    const items = await Memory.aggregate(pipeline); // aggregate 결과는 기본적으로 plain JS object

    // 🟢 반환 전 URL 변환
    return hydrateDocsUrls(items);
}