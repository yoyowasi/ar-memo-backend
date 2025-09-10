// src/routes/memories.js
import { Router } from 'express';
import * as memoriesController from '../controllers/memories.controller.js';

const router = Router();

// --- Memories CRUD ---
router.post('/', memoriesController.createMemory);
router.get('/', memoriesController.listMemories);
router.get('/:id', memoriesController.getMemoryById);
router.put('/:id', memoriesController.updateMemory);
router.delete('/:id', memoriesController.deleteMemory);

// --- Geospatial Queries ---
router.get('/near/search', memoriesController.findMemoriesNear);
router.get('/in/view', memoriesController.findMemoriesInView);

// --- Stats ---
router.get('/stats/summary', memoriesController.getStatsSummary);

// --- Presigned URL for Upload ---
// (이 라우트는 memories 리소스와 직접 관련은 없지만, 메모 생성을 위한 파일 업로드에 쓰이므로 여기에 둘 수 있습니다.)
// (별도 /uploads 라우터가 있지만, 이는 GCS용 Presigned URL 생성 라우트입니다)
router.post('/presigned-url', memoriesController.createPresignedUrl);


export default router;