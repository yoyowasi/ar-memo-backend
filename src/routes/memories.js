import { Router } from 'express';
import * as memoriesController from '../controllers/memories.controller.js';

const router = Router();

// GCS Presigned URL 생성
router.post('/presign', memoriesController.createPresignedUrl);

// 메모 생성
router.post('/', memoriesController.createMemory);

// 주변 메모 검색
router.get('/near/search', memoriesController.findMemoriesNear);

// 특정 메모 조회
router.get('/:id', memoriesController.getMemoryById);

// 특정 메모 수정
router.put('/:id', memoriesController.updateMemory);

// 특정 메모 삭제
router.delete('/:id', memoriesController.deleteMemory);

export default router;
