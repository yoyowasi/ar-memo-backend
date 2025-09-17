// src/routes/groups.js

import { Router } from 'express';
import { authRequired, asyncHandler } from '../middlewares/auth.js';
// 'ensureOwner' 미들웨어를 컨트롤러에서 직접 가져옵니다.
import { GroupsController as C, ensureOwner } from '../controllers/groups.controller.js';

const router = Router();

// 이 라우터의 모든 경로에 대해 기본적으로 사용자 인증을 요구합니다.
router.use(authRequired);

/* --- 소유자 권한이 필요 없는 라우트 --- */
router.post('/', asyncHandler(C.create));
router.get('/', asyncHandler(C.listMine));
router.get('/:id', asyncHandler(C.detail));
router.get('/:id/memories', asyncHandler(C.listMemories));


/* --- 소유자 권한(ensureOwner)이 반드시 필요한 라우트 --- */
// GET을 제외한 :id 경로에 대해 소유자 확인 미들웨어를 추가합니다.
router.put('/:id', asyncHandler(ensureOwner), asyncHandler(C.update));
router.delete('/:id', asyncHandler(C.remove));
router.post('/:id/members', asyncHandler(ensureOwner), asyncHandler(C.addMember));
router.delete('/:id/members/:userId', asyncHandler(ensureOwner), asyncHandler(C.removeMember));

export default router;