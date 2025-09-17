import { Memory } from '../models/Memory.js';

export async function createMemory(userId, d) {
    return Memory.create({
        userId,
        location: { type: 'Point', coordinates: [d.longitude, d.latitude] },
        anchor: d.anchor,
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
    return Memory.findOne({ _id: id, userId });
}

export async function updateMyMemory(userId, id, body) {
    return Memory.findOneAndUpdate(
        { _id: id, userId },
        body,
        { new: true, runValidators: true }
    );
}

export async function deleteMyMemory(userId, id) {
    return Memory.findOneAndDelete({ _id: id, userId });
}

export async function listMyMemories(userId, filter, page, limit) {
    const [items, total] = await Promise.all([
        Memory.find({ userId, ...filter }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
        Memory.countDocuments({ userId, ...filter })
    ]);
    return { items, total };
}

export async function findMyNearby(userId, lng, lat, radius) {
    return Memory.find({
        userId,
        location: {
            $near: {
                $geometry: { type: 'Point', coordinates: [lng, lat] },
                $maxDistance: radius
            }
        }
    }).sort({ createdAt: -1 }).limit(500);
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
                distanceField: 'dist',
                spherical: true,
                query: { userId, location: { $geoWithin: { $geometry: polygon } } }
            }
        },
        { $limit: limit }
    ];
    return Memory.aggregate(pipeline);
}
