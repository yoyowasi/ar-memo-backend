// src/services/groups.service.js
import { Group } from '../models/Group.js';
import { Memory } from '../models/Memory.js';

export async function createGroup(data) {
    return await Group.create({
        name: data.name,
        color: data.color,
        ownerId: data.ownerId,
        members: []
    });
}

export async function listGroups(query) {
    const filter = {};
    if (query.ownerId) filter.ownerId = query.ownerId;
    if (query.memberId) filter.$or = [{ ownerId: query.memberId }, { members: query.memberId }];
    return await Group.find(filter).sort({ createdAt: -1 });
}

export async function getGroupById(id) {
    return await Group.findById(id);
}

export async function updateGroup(id, data) {
    return await Group.findByIdAndUpdate(id, data, { new: true, runValidators: true });
}

export async function deleteGroup(id) {
    const deleted = await Group.findByIdAndDelete(id);
    if (deleted) {
        // 해당 그룹에 연결된 메모리의 groupId 해제
        await Memory.updateMany({ groupId: deleted._id }, { $set: { groupId: null } });
    }
    return deleted;
}

export async function addMember(groupId, userId) {
    return await Group.findByIdAndUpdate(
        groupId,
        { $addToSet: { members: userId } }, // 중복 방지
        { new: true }
    );
}

export async function removeMember(groupId, userId) {
    return await Group.findByIdAndUpdate(
        groupId,
        { $pull: { members: userId } },
        { new: true }
    );
}

export async function listGroupMemories(groupId, { page, limit }) {
    const [items, total] = await Promise.all([
        Memory.find({ groupId })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit),
        Memory.countDocuments({ groupId })
    ]);
    return { page, limit, total, items };
}