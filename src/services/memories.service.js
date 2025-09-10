// src/services/memories.service.js
import { Memory } from '../models/Memory.js';

export async function createMemory(d) {
    return await Memory.create({
        userId: d.userId,
        location: { type: 'Point', coordinates: [d.longitude, d.latitude] },
        anchor: d.anchor,
        text: d.text,
        photoUrl: d.photoUrl ?? undefined,
        audioUrl: d.audioUrl ?? undefined,
        tags: d.tags,
        favorite: d.favorite,
        visibility: d.visibility,
        groupId: d.groupId ?? null,
        thumbUrl: d.thumbUrl ?? undefined,
    });
}

export async function listMemories({ page, limit, q, tag, userId, groupId, month }) {
    const filter = {};
    if (userId) filter.userId = userId;
    if (groupId) filter.groupId = groupId;
    if (tag) filter.tags = tag;
    if (q) filter.$or = [{ text: { $regex: q, $options: 'i' } }, { tags: { $in: [q] } }];
    if (month) {
        const [y, m] = month.split('-').map(Number);
        const start = new Date(Date.UTC(y, m - 1, 1));
        const end = new Date(Date.UTC(y, m, 1));
        filter.createdAt = { $gte: start, $lt: end };
    }

    const [items, total] = await Promise.all([
        Memory.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
        Memory.countDocuments(filter)
    ]);

    return { page, limit, total, items };
}

export async function getMemoryById(id) {
    return await Memory.findById(id);
}

export async function updateMemory(id, updateData) {
    return await Memory.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
}

export async function deleteMemory(id) {
    return await Memory.findByIdAndDelete(id);
}

export async function findMemoriesNear({ lat, lng, radius }) {
    return await Memory.find({
        location: {
            $near: {
                $geometry: { type: 'Point', coordinates: [lng, lat] },
                $maxDistance: radius
            }
        }
    }).sort({ createdAt: -1 }).limit(500);
}

export async function findMemoriesInView(q) {
    const polygon = {
        type: 'Polygon',
        coordinates: [[
            [q.swLng, q.swLat], [q.neLng, q.swLat],
            [q.neLng, q.neLat], [q.swLng, q.neLat],
            [q.swLng, q.swLat]
        ]]
    };
    const center = { type: 'Point', coordinates: [q.centerLng, q.centerLat] };

    const pipeline = [
        {
            $geoNear: {
                near: center,
                distanceField: 'dist',
                spherical: true,
                query: {
                    ...(q.userId ? { userId: q.userId } : {}),
                    location: { $geoWithin: { $geometry: polygon } }
                }
            }
        },
        { $limit: q.limit ?? 200 }
    ];

    return await Memory.aggregate(pipeline);
}

export async function getStatsSummary({ userId, lat, lng, radius }) {
    const now = new Date();
    const startMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const endMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

    const baseFilter = userId ? { userId } : {};

    const totalPromise = Memory.countDocuments(baseFilter);

    const nearbyPromise = (lat !== undefined && lng !== undefined)
        ? Memory.countDocuments({
            ...baseFilter,
            location: {
                $nearSphere: {
                    $geometry: { type: 'Point', coordinates: [lng, lat] },
                    $maxDistance: radius ?? 500
                }
            }
        })
        : Promise.resolve(0);

    const thisMonthPromise = Memory.countDocuments({
        ...baseFilter,
        createdAt: { $gte: startMonth, $lt: endMonth }
    });

    const [total, nearby, thisMonth] = await Promise.all([
        totalPromise,
        nearbyPromise,
        thisMonthPromise
    ]);

    return { total, nearby, thisMonth };
}