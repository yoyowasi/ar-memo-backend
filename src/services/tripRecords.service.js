// src/services/tripRecords.service.js
import { TripRecord } from '../models/TripRecord.js';

// --- location 객체 생성 헬퍼 (추가) ---
function createLocation(data) {
    if (data.latitude != null && data.longitude != null) {
        return {
            type: 'Point',
            coordinates: [data.longitude, data.latitude] // GeoJSON: [lng, lat] 순서
        };
    }
    return null;
}
// ---------------------------------

export async function createTripRecord(userId, data) {
    return TripRecord.create({
        userId,
        groupId: data.groupId ?? null,
        title: data.title,
        content: data.content ?? '',
        date: data.date,
        photoUrls: data.photoUrls ?? [],
        location: createLocation(data) // <-- location 추가
    });
}

export async function getMyTripRecordById(userId, id) {
    // groupId를 이용해 그룹의 name, color 필드를 함께 가져옵니다.
    // .lean()을 추가하여 순수 JavaScript 객체를 반환하도록 수정
    return TripRecord.findOne({ _id: id, userId })
        .populate({ path: 'groupId', select: 'name color' })
        .lean();
}

export async function updateMyTripRecord(userId, id, body) {
    // --- location 필드 업데이트 처리 (추가) ---
    if (body.latitude != null && body.longitude != null) {
        body.location = createLocation(body);
    }
    // controller에서 받은 위경도 필드 제거
    delete body.latitude;
    delete body.longitude;
    // ---------------------------------

    return TripRecord.findOneAndUpdate(
        { _id: id, userId },
        body, // body에 location 객체가 포함됨
        { new: true, runValidators: true }
    );
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
    return { items, total };
}