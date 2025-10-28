// src/controllers/tripRecords.controller.js
import { z } from 'zod';
import {
    createTripRecord,
    getMyTripRecordById,
    updateMyTripRecord,
    deleteMyTripRecord,
    listMyTripRecords
} from '../services/tripRecords.service.js';

// ✅ 수정: Zod 스키마 변경
const createBody = z.object({
    title: z.string().min(1),
    date: z.coerce.date(), // datetime() -> coerce.date()
    groupId: z.string().optional().nullable(), // nullable() 추가
    content: z.string().optional().nullable(), // nullable() 추가
    photoUrls: z.array(z.string()).optional().default([]), // default([]) 추가

    // ✅ 추가
    latitude: z.number().optional().nullable(),
    longitude: z.number().optional().nullable(),
});

// ✅ 수정: Zod 스키마 변경
const updateBody = z.object({
    title: z.string().min(1).optional(),
    date: z.coerce.date().optional(), // datetime() -> coerce.date()
    groupId: z.string().optional().nullable(), // nullable() 추가
    content: z.string().optional().nullable(), // nullable() 추가
    photoUrls: z.array(z.string()).optional(),

    // ✅ 추가
    latitude: z.number().optional().nullable(),
    longitude: z.number().optional().nullable(),
});

// 'q' (검색어) 파라미터를 추가했습니다.
const pagingQuery = z.object({
    page: z.preprocess(Number, z.number().int().min(1)).default(1),
    limit: z.preprocess(Number, z.number().int().min(1).max(100)).default(20),
    groupId: z.string().optional(),
    month: z.string().regex(/^\d{4}-\d{2}$/).optional(), // YYYY-MM
    q: z.string().optional() // 제목 검색을 위한 쿼리 파라미터
});

export const TripRecordsController = {
    create: async (req, res) => {
        const data = createBody.parse(req.body);
        const doc = await createTripRecord(req.user.id, data);
        res.status(201).json(doc);
    },

    detail: async (req, res) => {
        const doc = await getMyTripRecordById(req.user.id, req.params.id);
        if (!doc) return res.sendStatus(404);
        res.json(doc);
    },

    update: async (req, res) => {
        const body = updateBody.parse(req.body);
        const updated = await updateMyTripRecord(req.user.id, req.params.id, body);
        if (!updated) return res.sendStatus(404);
        res.json(updated);
    },

    remove: async (req, res) => {
        const deleted = await deleteMyTripRecord(req.user.id, req.params.id);
        if (!deleted) return res.sendStatus(404);
        res.json({ ok: true });
    },

    list: async (req, res) => {
        // 쿼리에서 'q'를 파싱합니다.
        const { page, limit, groupId, month, q } = pagingQuery.parse(req.query);
        const filter = {};
        if (groupId) filter.groupId = groupId;
        if (month) {
            const [y, m] = month.split('-').map(Number);
            const start = new Date(Date.UTC(y, m - 1, 1));
            const end = new Date(Date.UTC(y, m, 1));
            filter.date = { $gte: start, $lt: end };
        }
        // 'q'가 존재하면 title 필드에 대한 정규식 검색 조건을 추가합니다. (대소문자 구분 없음)
        if (q) {
            filter.title = { $regex: q, $options: 'i' };
        }

        const { items, total } = await listMyTripRecords(req.user.id, filter, page, limit);
        res.json({ page, limit, total, items });
    }
};