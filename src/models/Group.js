import mongoose from 'mongoose';

const GroupSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        color: { type: String, default: '#FF8040' },
        ownerId: { type: String, required: true },     // 생성자
        members: { type: [String], default: [] }       // 사용자 ID 배열
    },
    { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

GroupSchema.index({ ownerId: 1 });
GroupSchema.index({ members: 1 });

export const Group = mongoose.model('Group', GroupSchema);
