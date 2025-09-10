// src/routes/memories.js
import { Router } from 'express';
import { z } from 'zod';
import { Memory } from '../models/Memory.js';

const router = Router();

// ===== Schemas =====
const createBody = z.object({
    userId: z.string().min(1),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    anchor: z.any(),
    text: z.string().optional(),
    photoUrl: z.string().url().nullable().optional(),
    audioUrl: z.string().url().nullable().optional(),
    tags: z.array(z.string()).optional().default([]),
    favorite: z.boolean().optional().default(false),
    visibility: z.enum(['private', 'shared']).optional().default('private'),
    groupId: z.string().optional().nullable(),
    thumbUrl: z.string().url().nullable().optional(),
});

const updateBody = z.object({
    text: z.string().optional(),
    photoUrl: z.string().url().nullable().optional(),
    audioUrl: z.string().url().nullable().optional(),
    tags: z.array(z.string()).optional(),
    favorite: z.boolean().optional(),
    visibility: z.enum(['private', 'shared']).optional(),
    groupId: z.string().nullable().optional()
});

const pagingQuery = z.object({
    page: z.preprocess(Number, z.number().int().min(1)).default(1),
    limit: z.preprocess(Number, z.number().int().min(1).max(100)).default(20),
    q: z.string().optional(),
    tag: z.string().optional(),
    userId: z.string().optional(),
    groupId: z.string().optional(),
    month: z.string().regex(/^\d{4}-\d{2}$/).optional()
});

const nearQuery = z.object({
    lat: z.preprocess(Number, z.number().min(-90).max(90)),
    lng: z.preprocess(Number, z.number().min(-180).max(180)),
    radius: z.preprocess(Number, z.number().positive()).default(100)
});

// ===== Create =====
router.post('/', async (req, res, next) => {
    try {
        const d = createBody.parse(req.body);
        const doc = await Memory.create({
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
        res.status(201).json(doc);
    } catch (e) { next(e); }
});

// ===== Detail =====
router.get('/:id', async (req, res, next) => {
    try {
        const doc = await Memory.findById(req.params.id);
        if (!doc) return res.sendStatus(404);
        res.json(doc);
    } catch (e) { next(e); }
});

// ===== Update =====
router.put('/:id', async (req, res, next) => {
    try {
        const body = updateBody.parse(req.body);
        const updated = await Memory.findByIdAndUpdate(
            req.params.id,
            body,
            { new: true, runValidators: true }
        );
        if (!updated) return res.sendStatus(404);
        res.json(updated);
    } catch (e) { next(e); }
});

// ===== Delete =====
router.delete('/:id', async (req, res, next) => {
    try {
        const deleted = await Memory.findByIdAndDelete(req.params.id);
        if (!deleted) return res.sendStatus(404);
        res.json({ ok: true });
    } catch (e) { next(e); }
});

// ===== List (search/filter/paging) =====
router.get('/', async (req, res, next) => {
    try {
        const { page, limit, q, tag, userId, groupId, month } = pagingQuery.parse(req.query);
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

        res.json({ page, limit, total, items });
    } catch (e) { next(e); }
});

// ===== Nearby (radius from point) =====
router.get('/near/search', async (req, res, next) => {
    try {
        const { lat, lng, radius } = nearQuery.parse(req.query);
        const items = await Memory.find({
            location: {
                $near: {
                    $geometry: { type: 'Point', coordinates: [lng, lat] },
                    $maxDistance: radius
                }
            }
        }).sort({ createdAt: -1 }).limit(500);
        res.json({ count: items.length, items });
    } catch (e) { next(e); }
});

// ===== In current map view (viewport pins) =====
// GET /api/memories/in/view?swLat=&swLng=&neLat=&neLng=&centerLat=&centerLng=&limit=200&userId=u1
router.get('/in/view', async (req, res, next) => {
    try {
        const q = z.object({
            swLat: z.preprocess(Number, z.number()),
            swLng: z.preprocess(Number, z.number()),
            neLat: z.preprocess(Number, z.number()),
            neLng: z.preprocess(Number, z.number()),
            centerLat: z.preprocess(Number, z.number()),
            centerLng: z.preprocess(Number, z.number()),
            limit: z.preprocess(v => v === undefined ? 200 : Number(v), z.number().int().min(1).max(1000)).optional(),
            userId: z.string().optional()
        }).parse(req.query);

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

        const items = await Memory.aggregate(pipeline);
        res.json({ count: items.length, items });
    } catch (e) { next(e); }
});

// ===== Stats summary (total / nearby / thisMonth) =====
router.get('/stats/summary', async (req, res, next) => {
    try {
        const { userId, lat, lng, radius } = z.object({
            userId: z.string().optional(),
            lat: z.preprocess(v => (v === undefined ? undefined : Number(v)), z.number().min(-90).max(90).optional()),
            lng: z.preprocess(v => (v === undefined ? undefined : Number(v)), z.number().min(-180).max(180).optional()),
            radius: z.preprocess(v => (v === undefined ? 500 : Number(v)), z.number().positive().optional())
        }).parse(req.query);

        const now = new Date();
        const startMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        const endMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

        const base = {};
        if (userId) base.userId = userId;

        const total = await Memory.countDocuments(base);

        let nearby = 0;
        if (lat !== undefined && lng !== undefined) {
            const rad = (radius ?? 500) / 6378137; // meters -> radians
            nearby = await Memory.countDocuments({
                ...base,
                location: { $geoWithin: { $centerSphere: [[lng, lat], rad] } }
            });
        }

        const thisMonth = await Memory.countDocuments({
            ...base,
            createdAt: { $gte: startMonth, $lt: endMonth }
        });

        res.json({ total, nearby, thisMonth });
    } catch (e) { next(e); }
});


export default router;
