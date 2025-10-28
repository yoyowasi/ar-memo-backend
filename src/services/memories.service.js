import { Memory } from '../models/Memory.js';

export async function createMemory(userId, d) {
    return Memory.create({
        userId,
        location: { type: 'Point', coordinates: [d.longitude, d.latitude] },
        // ▼▼▼ anchor 데이터 저장 로직 추가 ▼▼▼
        anchor: d.anchor ?? null, // 입력받은 anchor 데이터 사용, 없으면 null
        // ▲▲▲ anchor 데이터 저장 로직 추가 ▲▲▲
        text: d.text,
        photoUrl: d.photoUrl ?? undefined,
        audioUrl: d.audioUrl ?? undefined,
        thumbUrl: d.thumbUrl ?? undefined,
        tags: d.tags ?? [],
        favorite: d.favorite ?? false,
        visibility: d.visibility ?? 'private',
        groupId: d.groupId ?? null
    });
}

export async function getMyMemoryById(userId, id) {
    // .lean()을 추가하여 순수 JS 객체로 반환 (populate와 일관성 유지 및 성능 향상)
    return Memory.findOne({ _id: id, userId }).lean();
}

export async function updateMyMemory(userId, id, body) {
    // findOneAndUpdate는 기본적으로 업데이트 전 문서를 반환하므로,
    // { new: true } 옵션을 사용하여 업데이트 후 문서를 반환하도록 합니다.
    // .lean()을 추가하여 순수 JS 객체로 반환합니다.
    return Memory.findOneAndUpdate(
        { _id: id, userId },
        body, // $set 없이 body 객체 전체를 전달하면 명시된 필드만 업데이트
        { new: true, runValidators: true }
    ).lean();
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
    return { items, total };
}

export async function findMyNearby(userId, lng, lat, radius) {
    // $near는 거리가 가까운 순서대로 정렬하므로 별도 sort 불필요. .lean() 추가.
    return Memory.find({
        userId,
        location: {
            $near: {
                $geometry: { type: 'Point', coordinates: [lng, lat] },
                $maxDistance: radius // 미터 단위
            }
        }
    }).limit(500).lean(); // 결과가 너무 많아지는 것을 방지하기 위해 limit 추가
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
    return Memory.aggregate(pipeline); // aggregate 결과는 기본적으로 plain JS object
}