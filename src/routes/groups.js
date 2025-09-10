import { Router } from 'express';
import { z } from 'zod';
import { Group } from '../models/Group.js';
import { Memory } from '../models/Memory.js';

const router = Router();
console.log('[groups.js] router loaded');


// create group
router.post('/', async (req, res, next) => {
    try {
        const body = z.object({
            name: z.string().min(1),
            color: z.string().optional().default('#FF8040'),
            ownerId: z.string().min(1)
        }).parse(req.body);

        const doc = await Group.create({
            name: body.name,
            color: body.color,
            ownerId: body.ownerId,
            members: []
        });
        res.status(201).json(doc);
    } catch (e) { next(e); }
});

// list my groups (owner or member)
router.get('/', async (req, res, next) => {
    try {
        const q = z.object({
            ownerId: z.string().optional(),
            memberId: z.string().optional()
        }).parse(req.query);

        const filter = {};
        if (q.ownerId) filter.ownerId = q.ownerId;
        if (q.memberId) filter.$or = [{ ownerId: q.memberId }, { members: q.memberId }];

        const items = await Group.find(filter).sort({ createdAt: -1 });
        res.json(items);
    } catch (e) { next(e); }
});

// detail
router.get('/:id', async (req, res, next) => {
    try {
        const doc = await Group.findById(req.params.id);
        if (!doc) return res.sendStatus(404);
        res.json(doc);
    } catch (e) { next(e); }
});

// update (name/color)
router.put('/:id', async (req, res, next) => {
    try {
        const body = z.object({
            name: z.string().optional(),
            color: z.string().optional()
        }).parse(req.body);

        const updated = await Group.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
        if (!updated) return res.sendStatus(404);
        res.json(updated);
    } catch (e) { next(e); }
});

// delete
router.delete('/:id', async (req, res, next) => {
    try {
        const deleted = await Group.findByIdAndDelete(req.params.id);
        if (!deleted) return res.sendStatus(404);
        // 해당 그룹에 연결된 메모리의 groupId 해제(소프트)
        await Memory.updateMany({ groupId: deleted._id }, { $set: { groupId: null } });
        res.json({ ok: true });
    } catch (e) { next(e); }
});

router.post('/:id/members', async (req, res, next) => {
    try {
        const body = z.object({ userId: z.string().min(1) }).parse(req.body);
        const updated = await Group.findByIdAndUpdate(
            req.params.id,
            { $addToSet: { members: body.userId } }, // 중복 방지
            { new: true }
        );
        if (!updated) return res.sendStatus(404);
        res.json(updated);
    } catch (e) {
        next(e);
    }
});

// ✅ Remove member
router.delete('/:id/members/:userId', async (req, res, next) => {
    try {
        const updated = await Group.findByIdAndUpdate(
            req.params.id,
            { $pull: { members: req.params.userId } },
            { new: true }
        );
        if (!updated) return res.sendStatus(404);
        res.json(updated);
    } catch (e) {
        next(e);
    }
});

// list group's memories
router.get('/:id/memories', async (req, res, next) => {
    try {
        const q = z.object({
            page: z.preprocess(Number, z.number().int().min(1)).default(1),
            limit: z.preprocess(Number, z.number().int().min(1).max(100)).default(20)
        }).parse(req.query);

        const [items, total] = await Promise.all([
            Memory.find({ groupId: req.params.id })
                .sort({ createdAt: -1 })
                .skip((q.page - 1) * q.limit)
                .limit(q.limit),
            Memory.countDocuments({ groupId: req.params.id })
        ]);

        res.json({ page: q.page, limit: q.limit, total, items });
    } catch (e) { next(e); }
});

export default router;
