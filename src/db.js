import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDB() {
    await mongoose.connect(env.mongoUri, {
        autoIndex: true
    });
    console.log('[MongoDB] connected');
}
