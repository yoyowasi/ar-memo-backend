// src/routes/tripRecords.js
import { Router } from 'express';
import { authRequired, asyncHandler } from '../middlewares/auth.js';
import { TripRecordsController as C } from '../controllers/tripRecords.controller.js';

const router = Router();

// 이 라우터의 모든 경로에 대해 기본적으로 사용자 인증을 요구합니다.
router.use(authRequired);

router.post('/', asyncHandler(C.create));
router.get('/', asyncHandler(C.list));
router.get('/:id', asyncHandler(C.detail));
router.put('/:id', asyncHandler(C.update));
router.delete('/:id', asyncHandler(C.remove));

export default router;