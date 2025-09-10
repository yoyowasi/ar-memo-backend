// src/routes/groups.js
import { Router } from 'express';
import * as groupsController from '../controllers/groups.controller.js';

const router = Router();

// group
router.post('/', groupsController.createGroup);
router.get('/', groupsController.listGroups);
router.get('/:id', groupsController.getGroupById);
router.put('/:id', groupsController.updateGroup);
router.delete('/:id', groupsController.deleteGroup);

// members
router.post('/:id/members', groupsController.addMember);
router.delete('/:id/members/:userId', groupsController.removeMember);

// memories
router.get('/:id/memories', groupsController.listGroupMemories);

export default router;