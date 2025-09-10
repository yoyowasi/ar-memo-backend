// src/controllers/memories.controller.js
import { z } from 'zod';
import * as memoriesService from '../services/memories.service.js';
import * as gcsService from '../services/gcs.service.js'; // GCS 서비스 사용

// --- Zod 스키마 정의 ---
const createBodySchema = z.object({
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

const updateBodySchema = z.object({
    text: z.string().optional(),
    photoUrl: z.string().url().nullable().optional(),
    audioUrl: z.string().url().nullable().optional(),
    tags: z.array(z.string()).optional(),
    favorite: z.boolean().optional(),
    visibility: z.enum(['private', 'shared']).optional(),
    groupId: z.string().nullable().optional()
});

const pagingQuerySchema = z.object({
    page: z.preprocess(Number, z.number().int().min(1)).default(1),
    limit: z.preprocess(Number, z.number().int().min(1).max(100)).default(20),
    q: z.string().optional(),
    tag: z.string().optional(),
    userId: z.string().optional(),
    groupId: z.string().optional(),
    month: z.string().regex(/^\d{4}-\d{2}$/).optional()
});

const nearQuerySchema = z.object({
    lat: z.preprocess(Number, z.number().min(-90).max(90)),
    lng: z.preprocess(Number, z.number().min(-180).max(180)),
    radius: z.preprocess(Number, z.number().positive()).default(100)
});

const inViewQuerySchema = z.object({
    swLat: z.preprocess(Number, z.number()),
    swLng: z.preprocess(Number, z.number()),
    neLat: z.preprocess(Number, z.number()),
    neLng: z.preprocess(Number, z.number()),
    centerLat: z.preprocess(Number, z.number()),
    centerLng: z.preprocess(Number, z.number()),
    limit: z.preprocess(v => v === undefined ? 200 : Number(v), z.number().int().min(1).max(1000)).optional(),
    userId: z.string().optional()
});

const statsQuerySchema = z.object({
    userId: z.string().optional(),
    lat: z.preprocess(v => (v === undefined ? undefined : Number(v)), z.number().min(-90).max(90).optional()),
    lng: z.preprocess(v => (v === undefined ? undefined : Number(v)), z.number().min(-180).max(180).optional()),
    radius: z.preprocess(v => (v === undefined ? 500 : Number(v)), z.number().positive().optional())
});

const presignBodySchema = z.object({
    key: z.string().min(1),
    contentType: z.string().min(1)
});

// --- 컨트롤러 함수들 (try-catch 제거) ---

export async function createMemory(req, res) {
    const validatedData = createBodySchema.parse(req.body);
    const newMemory = await memoriesService.createMemory(validatedData);
    res.status(201).json(newMemory);
}

export async function listMemories(req, res) {
    const query = pagingQuerySchema.parse(req.query);
    const result = await memoriesService.listMemories(query);
    res.json(result);
}

export async function getMemoryById(req, res) {
    const memory = await memoriesService.getMemoryById(req.params.id);
    if (!memory) return res.sendStatus(404);
    res.json(memory);
}

export async function updateMemory(req, res) {
    const body = updateBodySchema.parse(req.body);
    const updatedMemory = await memoriesService.updateMemory(req.params.id, body);
    if (!updatedMemory) return res.sendStatus(404);
    res.json(updatedMemory);
}

export async function deleteMemory(req, res) {
    const deletedMemory = await memoriesService.deleteMemory(req.params.id);
    if (!deletedMemory) return res.sendStatus(404);
    res.json({ ok: true });
}

export async function findMemoriesNear(req, res) {
    const { lat, lng, radius } = nearQuerySchema.parse(req.query);
    const items = await memoriesService.findMemoriesNear({ lat, lng, radius });
    res.json({ count: items.length, items });
}

export async function findMemoriesInView(req, res) {
    const query = inViewQuerySchema.parse(req.query);
    const items = await memoriesService.findMemoriesInView(query);
    res.json({ count: items.length, items });
}

export async function getStatsSummary(req, res) {
    const query = statsQuerySchema.parse(req.query);
    const stats = await memoriesService.getStatsSummary(query);
    res.json(stats);
}

export async function createPresignedUrl(req, res) {
    const { key, contentType } = presignBodySchema.parse(req.body);
    // GCS 서비스 호출로 변경
    const urls = await gcsService.createPresignedUrl(key, contentType);
    res.json(urls);
}