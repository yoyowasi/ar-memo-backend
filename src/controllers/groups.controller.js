// src/controllers/groups.controller.js
import { z } from 'zod';
import * as groupsService from '../services/groups.service.js';

// --- Zod 스키마 정의 ---
const createGroupSchema = z.object({
    name: z.string().min(1),
    color: z.string().optional().default('#FF8040'),
    ownerId: z.string().min(1)
});

const listGroupsSchema = z.object({
    ownerId: z.string().optional(),
    memberId: z.string().optional()
});

const updateGroupSchema = z.object({
    name: z.string().optional(),
    color: z.string().optional()
});

const memberSchema = z.object({
    userId: z.string().min(1)
});

const pagingSchema = z.object({
    page: z.preprocess(Number, z.number().int().min(1)).default(1),
    limit: z.preprocess(Number, z.number().int().min(1).max(100)).default(20)
});


// --- 컨트롤러 함수 ---

export async function createGroup(req, res) {
    const body = createGroupSchema.parse(req.body);
    const doc = await groupsService.createGroup(body);
    res.status(201).json(doc);
}

export async function listGroups(req, res) {
    const query = listGroupsSchema.parse(req.query);
    const items = await groupsService.listGroups(query);
    res.json(items);
}

export async function getGroupById(req, res) {
    const doc = await groupsService.getGroupById(req.params.id);
    if (!doc) return res.sendStatus(404);
    res.json(doc);
}

export async function updateGroup(req, res) {
    const body = updateGroupSchema.parse(req.body);
    const updated = await groupsService.updateGroup(req.params.id, body);
    if (!updated) return res.sendStatus(404);
    res.json(updated);
}

export async function deleteGroup(req, res) {
    const deleted = await groupsService.deleteGroup(req.params.id);
    if (!deleted) return res.sendStatus(404);
    res.json({ ok: true });
}

export async function addMember(req, res) {
    const body = memberSchema.parse(req.body);
    const updated = await groupsService.addMember(req.params.id, body.userId);
    if (!updated) return res.sendStatus(404);
    res.json(updated);
}

export async function removeMember(req, res) {
    const updated = await groupsService.removeMember(req.params.id, req.params.userId);
    if (!updated) return res.sendStatus(404);
    res.json(updated);
}

export async function listGroupMemories(req, res) {
    const query = pagingSchema.parse(req.query);
    const result = await groupsService.listGroupMemories(req.params.id, query);
    res.json(result);
}