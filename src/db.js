import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDB() {
    await mongoose.connect(env.mongoUri, { autoIndex: true });
    console.log('[MongoDB] connected');

    // ✅ 스키마와 실제 인덱스 동기화 (없는 건 만들고, 스키마에 없는 건 삭제)
    const { Memory } = await import('./models/Memory.js');
    await Memory.syncIndexes();
    console.log('[MongoDB] indexes synced');
}
