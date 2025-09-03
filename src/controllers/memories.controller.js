import { z } from 'zod';
import * as memoriesService from '../services/memories.service.js';

// Zod 스키마 정의 (유효성 검증 로직)
const createBodySchema = z.object({
    userId: z.string().min(1),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    anchor: z.any(),
    text: z.string().optional(),
    photoUrl: z.string().url().optional(),
    audioUrl: z.string().url().optional()
});

const nearQuerySchema = z.object({
    lat: z.preprocess(Number, z.number().min(-90).max(90)),
    lng: z.preprocess(Number, z.number().min(-180).max(180)),
    radius: z.preprocess(Number, z.number().positive()).default(100)
});

const presignBodySchema = z.object({
    key: z.string().min(1),
    contentType: z.string().min(1)
});

// --- 컨트롤러 함수들 ---

export async function createMemory(req, res, next) {
    try {
        const validatedData = createBodySchema.parse(req.body);
        const newMemory = await memoriesService.createMemory(validatedData);
        res.status(201).json(newMemory);
    } catch (e) {
        next(e);
    }
}

export async function getMemoryById(req, res, next) {
    try {
        const memory = await memoriesService.getMemoryById(req.params.id);
        if (!memory) return res.sendStatus(404);
        res.json(memory);
    } catch (e) {
        next(e);
    }
}

export async function findMemoriesNear(req, res, next) {
    try {
        const { lat, lng, radius } = nearQuerySchema.parse(req.query);
        const items = await memoriesService.findMemoriesNear({ lat, lng, radius });
        res.json({ count: items.length, items });
    } catch (e) {
        next(e);
    }
}

export async function updateMemory(req, res, next) {
    try {
        const updatedMemory = await memoriesService.updateMemory(req.params.id, req.body);
        if (!updatedMemory) return res.sendStatus(404);
        res.json(updatedMemory);
    } catch (e) {
        next(e);
    }
}

export async function deleteMemory(req, res, next) {
    try {
        const deletedMemory = await memoriesService.deleteMemory(req.params.id);
        if (!deletedMemory) return res.sendStatus(404);
        res.json({ ok: true });
    } catch (e) {
        next(e);
    }
}

export async function createPresignedUrl(req, res, next) {
    try {
        const { key, contentType } = presignBodySchema.parse(req.body);
        const urls = await memoriesService.createPresignedUrl(key, contentType);
        res.json(urls);
    } catch (e) {
        next(e);
    }
}
