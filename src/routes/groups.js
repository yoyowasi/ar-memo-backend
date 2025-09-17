import { Router } from 'express';
import { authRequired, asyncHandler } from '../middlewares/auth.js';
import { GroupsController as C } from '../controllers/groups.controller.js';

const router = Router();

router.post('/', authRequired, asyncHandler(C.create));
router.get('/', authRequired, asyncHandler(C.listMine));
router.get('/:id', authRequired, asyncHandler(C.detail));
router.put('/:id', authRequired, asyncHandler(C.update));
router.delete('/:id', authRequired, asyncHandler(C.remove));
router.post('/:id/members', authRequired, asyncHandler(C.addMember));
router.delete('/:id/members/:userId', authRequired, asyncHandler(C.removeMember));
router.get('/:id/memories', authRequired, asyncHandler(C.listMemories));

export default router;
