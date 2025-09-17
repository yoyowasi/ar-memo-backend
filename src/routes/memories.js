import { Router } from 'express';
import { authRequired, asyncHandler } from '../middlewares/auth.js';
import { MemoriesController as C } from '../controllers/memories.controller.js';

const router = Router();

router.post('/', authRequired, asyncHandler(C.create));
router.get('/:id', authRequired, asyncHandler(C.detail));
router.put('/:id', authRequired, asyncHandler(C.update));
router.delete('/:id', authRequired, asyncHandler(C.remove));
router.get('/', authRequired, asyncHandler(C.list));
router.get('/near/search', authRequired, asyncHandler(C.nearby));
router.get('/in/view', authRequired, asyncHandler(C.inView));
router.get('/stats/summary', authRequired, asyncHandler(C.stats));

export default router;
