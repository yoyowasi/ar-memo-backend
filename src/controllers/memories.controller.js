import { z } from 'zod';
import {
    createMemory, getMyMemoryById, updateMyMemory, deleteMyMemory,
    listMyMemories, findMyNearby, findMyInView
} from '../services/memories.service.js';

// 생성 시 입력 데이터 유효성 검사 스키마
const createBody = z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    // ▼▼▼ anchor 필드 유효성 검사 추가 ▼▼▼
    anchor: z.array(z.number()).length(16).optional().nullable(), // 16개 숫자 배열, 선택적, null 가능
    // ▲▲▲ anchor 필드 유효성 검사 추가 ▲▲▲
    text: z.string().optional(),
    photoUrl: z.string().min(1).nullable().optional(),
    audioUrl: z.string().min(1).nullable().optional(),
    thumbUrl: z.string().min(1).nullable().optional(),
    tags: z.array(z.string()).optional().default([]),
    favorite: z.boolean().optional().default(false),
    visibility: z.enum(['private', 'shared']).optional().default('private'),
    groupId: z.string().optional().nullable()
});

// 수정 시 입력 데이터 유효성 검사 스키마
const updateBody = z.object({
    text: z.string().optional(),
    photoUrl: z.string().min(1).nullable().optional(),
    audioUrl: z.string().min(1).nullable().optional(),
    thumbUrl: z.string().min(1).nullable().optional(),
    tags: z.array(z.string()).optional(),
    favorite: z.boolean().optional(),
    visibility: z.enum(['private', 'shared']).optional(),
    groupId: z.string().nullable().optional()
    // anchor는 보통 생성 시 고정되므로 update 스키마에서는 제외 (필요 시 추가)
});

// 페이징 및 필터링 쿼리 스키마
const pagingQuery = z.object({
    page: z.preprocess(Number, z.number().int().min(1)).default(1),
    limit: z.preprocess(Number, z.number().int().min(1).max(100)).default(20),
    q: z.string().optional(),
    tag: z.string().optional(),
    groupId: z.string().optional(),
    month: z.string().regex(/^\d{4}-\d{2}$/).optional() // YYYY-MM 형식
});

// 근처 검색 쿼리 스키마
const nearQuery = z.object({
    lat: z.preprocess(Number, z.number().min(-90).max(90)),
    lng: z.preprocess(Number, z.number().min(-180).max(180)),
    radius: z.preprocess(Number, z.number().positive()).default(100) // 미터 단위
});

export const MemoriesController = {
    create: async (req, res) => {
        const d = createBody.parse(req.body); // 수정된 스키마 사용
        const doc = await createMemory(req.user.id, d); // 서비스 함수 호출은 변경 없음
        res.status(201).json(doc);
    },

    detail: async (req, res) => {
        const doc = await getMyMemoryById(req.user.id, req.params.id);
        if (!doc) return res.sendStatus(404);
        res.json(doc);
    },

    update: async (req, res) => {
        const body = updateBody.parse(req.body);
        const updated = await updateMyMemory(req.user.id, req.params.id, body);
        if (!updated) return res.sendStatus(404);
        res.json(updated);
    },

    remove: async (req, res) => {
        const deleted = await deleteMyMemory(req.user.id, req.params.id);
        if (!deleted) return res.sendStatus(404);
        res.json({ ok: true });
    },

    list: async (req, res) => {
        const { page, limit, q, tag, groupId, month } = pagingQuery.parse(req.query);
        const filter = {};
        if (groupId) filter.groupId = groupId;
        if (tag) filter.tags = tag;
        if (q) filter.$or = [{ text: { $regex: q, $options: 'i' } }, { tags: { $in: [q] } }];
        if (month) {
            const [y, m] = month.split('-').map(Number);
            const start = new Date(Date.UTC(y, m - 1, 1));
            const end = new Date(Date.UTC(y, m, 1));
            // date 필드가 아닌 createdAt 필드 기준으로 월별 필터링 (스키마에 맞게)
            filter.createdAt = { $gte: start, $lt: end };
        }
        const { items, total } = await listMyMemories(req.user.id, filter, page, limit);
        res.json({ page, limit, total, items });
    },

    nearby: async (req, res) => {
        const { lat, lng, radius } = nearQuery.parse(req.query);
        const items = await findMyNearby(req.user.id, lng, lat, radius);
        res.json({ count: items.length, items });
    },

    inView: async (req, res) => {
        const q = z.object({
            swLat: z.preprocess(Number, z.number()),
            swLng: z.preprocess(Number, z.number()),
            neLat: z.preprocess(Number, z.number()),
            neLng: z.preprocess(Number, z.number()),
            centerLat: z.preprocess(Number, z.number()),
            centerLng: z.preprocess(Number, z.number()),
            limit: z.preprocess(v => v === undefined ? 200 : Number(v), z.number().int().min(1).max(1000)).optional()
        }).parse(req.query);

        const items = await findMyInView(
            req.user.id,
            { swLat: q.swLat, swLng: q.swLng, neLat: q.neLat, neLng: q.neLng },
            { lat: q.centerLat, lng: q.centerLng },
            q.limit
        );
        res.json({ count: items.length, items });
    },

    stats: async (req, res) => {
        const { lat, lng, radius } = z.object({
            lat: z.preprocess(v => (v === undefined ? undefined : Number(v)), z.number().min(-90).max(90).optional()),
            lng: z.preprocess(v => (v === undefined ? undefined : Number(v)), z.number().min(-180).max(180).optional()),
            radius: z.preprocess(v => (v === undefined ? 500 : Number(v)), z.number().positive().optional())
        }).parse(req.query);

        const now = new Date();
        const startMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        const endMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

        const base = { userId: req.user.id };
        const total = await Memory.countDocuments(base);

        let nearby = 0;
        if (lat !== undefined && lng !== undefined) {
            // MongoDB의 $centerSphere는 라디안 단위 사용 (지구반경 6378.137km 기준)
            const rad = (radius ?? 500) / 6378137;
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
    }
};