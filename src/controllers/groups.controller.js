import { z } from 'zod';
import {
    createGroup, listMyGroups, getMyGroup, updateGroupByOwner,
    deleteGroupByOwner, addMember, removeMember, listGroupMemories
} from '../services/groups.service.js';
import { Group } from '../models/Group.js';

async function ensureOwner(req, res, next) {
    const g = await Group.findById(req.params.id).lean();
    if (!g) return res.sendStatus(404);
    if (g.ownerId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    next();
}

export const GroupsController = {
    create: async (req, res) => {
        const body = z.object({ name: z.string().min(1), color: z.string().optional() }).parse(req.body);
        const doc = await createGroup(req.user.id, body);
        res.status(201).json(doc);
    },

    listMine: async (req, res) => {
        const items = await listMyGroups(req.user.id);
        res.json(items);
    },

    detail: async (req, res) => {
        const doc = await getMyGroup(req.user.id, req.params.id);
        if (!doc) return res.sendStatus(404);
        res.json(doc);
    },

    update: [ensureOwner, async (req, res) => {
        const body = z.object({ name: z.string().optional(), color: z.string().optional() }).parse(req.body);
        const updated = await updateGroupByOwner(req.params.id, body);
        if (!updated) return res.sendStatus(404);
        res.json(updated);
    }],

    remove: [ensureOwner, async (req, res) => {
        const deleted = await deleteGroupByOwner(req.user.id, req.params.id);
        if (!deleted) return res.sendStatus(404);
        res.json({ ok: true });
    }],

    addMember: [ensureOwner, async (req, res) => {
        const body = z.object({ userId: z.string().min(1) }).parse(req.body);
        const updated = await addMember(req.params.id, body.userId);
        if (!updated) return res.sendStatus(404);
        res.json(updated);
    }],

    removeMember: [ensureOwner, async (req, res) => {
        const updated = await removeMember(req.params.id, req.params.userId);
        if (!updated) return res.sendStatus(404);
        res.json(updated);
    }],

    listMemories: async (req, res) => {
        const g = await getMyGroup(req.user.id, req.params.id);
        if (!g) return res.sendStatus(404);
        const q = z.object({
            page: z.preprocess(Number, z.number().int().min(1)).default(1),
            limit: z.preprocess(Number, z.number().int().min(1).max(100)).default(20)
        }).parse(req.query);

        const [items, total] = await listGroupMemories(req.user.id, req.params.id, q.page, q.limit);
        res.json({ page: q.page, limit: q.limit, total, items });
    }
};
