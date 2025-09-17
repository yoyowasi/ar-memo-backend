import { Group } from '../models/Group.js';
import { Memory } from '../models/Memory.js';

export function createGroup(ownerId, body) {
    return Group.create({ name: body.name, color: body.color ?? '#FF8040', ownerId, members: [] });
}

export function listMyGroups(userId) {
    return Group.find({ $or: [{ ownerId: userId }, { members: userId }] }).sort({ createdAt: -1 });
}

export function getMyGroup(userId, id) {
    return Group.findOne({ _id: id, $or: [{ ownerId: userId }, { members: userId }] });
}

export function updateGroupByOwner(id, body) {
    return Group.findByIdAndUpdate(id, body, { new: true, runValidators: true });
}

export async function deleteGroupByOwner(userId, id) {
    const deleted = await Group.findByIdAndDelete(id);
    if (!deleted) return null;
    await Memory.updateMany({ groupId: deleted._id, userId }, { $set: { groupId: null } });
    return deleted;
}

export function addMember(id, userId) {
    return Group.findByIdAndUpdate(id, { $addToSet: { members: userId } }, { new: true });
}

export function removeMember(id, userId) {
    return Group.findByIdAndUpdate(id, { $pull: { members: userId } }, { new: true });
}

export function listGroupMemories(userId, groupId, page, limit) {
    return Promise.all([
        Memory.find({ groupId, userId }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
        Memory.countDocuments({ groupId, userId })
    ]);
}
