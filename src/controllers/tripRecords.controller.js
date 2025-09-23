// src/controllers/tripRecords.controller.js
import { z } from 'zod';
import {
    createTripRecord,
    getMyTripRecordById,
    updateMyTripRecord,
    deleteMyTripRecord,
    listMyTripRecords
} from '../services/tripRecords.service.js';

const createBody = z.object({
    title: z.string().min(1),
    date: z.string().datetime(),
    groupId: z.string().nullable().optional(),
    content: z.string().optional(),
    photoUrls: z.array(z.string()).optional()
});

const updateBody = z.object({
    title: z.string().min(1).optional(),
    date: z.string().datetime().optional(),
    groupId: z.string().nullable().optional(),
    content: z.string().optional(),
    photoUrls: z.array(z.string()).optional()
});

const pagingQuery = z.object({
    page: z.preprocess(Number, z.number().int().min(1)).default(1),
    limit: z.preprocess(Number, z.number().int().min(1).max(100)).default(20),
    groupId: z.string().optional(),
    month: z.string().regex(/^\d{4}-\d{2}$/).optional() // YYYY-MM
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
        const { page, limit, groupId, month } = pagingQuery.parse(req.query);
        const filter = {};
        if (groupId) filter.groupId = groupId;
        if (month) {
            const [y, m] = month.split('-').map(Number);
            const start = new Date(Date.UTC(y, m - 1, 1));
            const end = new Date(Date.UTC(y, m, 1));
            filter.date = { $gte: start, $lt: end };
        }

        const { items, total } = await listMyTripRecords(req.user.id, filter, page, limit);
        res.json({ page, limit, total, items });
    }
};