import { Router } from 'express';
import { z } from 'zod';
import { Memory } from '../models/Memory.js';
import { env } from '../env.js';

const router = Router();

const createBody = z.object({
    userId: z.string().min(1),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    anchor: z.any(),
    text: z.string().optional(),
    photoUrl: z.string().url().optional(),
    audioUrl: z.string().url().optional()
});

const nearQuery = z.object({
    lat: z.preprocess(Number, z.number().min(-90).max(90)),
    lng: z.preprocess(Number, z.number().min(-180).max(180)),
    radius: z.preprocess(Number, z.number().positive()).default(100) // meters
});

// S3 presign (선택)
router.post('/presign', async (req, res, next) => {
    try {
        if (!env.s3.bucket || !env.s3.region) throw new Error('S3 not configured');
        const body = z.object({
            key: z.string().min(1),
            contentType: z.string().min(1)
        }).parse(req.body);

        const url = await getPresignedPutUrl(body.key, body.contentType);
        const publicUrl = `https://${env.s3.bucket}.s3.${env.s3.region}.amazonaws.com/${body.key}`;
        res.json({ url, publicUrl });
    } catch (e) {
        next(e);
    }
});

// 생성
router.post('/', async (req, res, next) => {
    try {
        const data = createBody.parse(req.body);
        const doc = await Memory.create({
            userId: data.userId,
            location: { type: 'Point', coordinates: [data.longitude, data.latitude] },
            anchor: data.anchor,
            text: data.text,
            photoUrl: data.photoUrl,
            audioUrl: data.audioUrl
        });
        res.status(201).json(doc);
    } catch (e) {
        next(e);
    }
});
// src/routes/memories.js

// 수정
router.put('/:id', async (req, res, next) => {
    try {
        const updated = await Memory.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });
        if (!updated) return res.sendStatus(404);
        res.json(updated);
    } catch (e) {
        next(e);
    }
});

// 삭제
router.delete('/:id', async (req, res, next) => {
    try {
        const deleted = await Memory.findByIdAndDelete(req.params.id);
        if (!deleted) return res.sendStatus(404);
        res.json({ ok: true });
    } catch (e) {
        next(e);
    }
});


// 단건 조회
router.get('/:id', async (req, res, next) => {
    try {
        const doc = await Memory.findById(req.params.id);
        if (!doc) return res.sendStatus(404);
        res.json(doc);
    } catch (e) {
        next(e);
    }
});

// 반경 검색 ($near, 2dsphere 인덱스 필요)
router.get('/near/search', async (req, res, next) => {
    try {
        const { lat, lng, radius } = nearQuery.parse(req.query);
        const items = await Memory.find({
            location: {
                $near: {
                    $geometry: { type: 'Point', coordinates: [lng, lat] },
                    $maxDistance: radius // 미터 단위
                }
            }
        })
            .sort({ createdAt: -1 })
            .limit(500);
        res.json({ count: items.length, items });
    } catch (e) {
        next(e);
    }
});

export default router;
