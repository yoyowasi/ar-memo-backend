// src/app.js
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
// 🔴 path, fileURLToPath 는 삭제
// import path from 'path';
// import { fileURLToPath } from 'url';
import { z } from 'zod';

import memoriesRouter from './routes/memories.js';
import groupsRouter from './routes/groups.js';
import tripRecordsRouter from './routes/tripRecords.js';
import uploadsRouter from './routes/uploads.js';
import authRouter from './routes/auth.js';
import { env } from './env.js';

// 🔴 __filename, __dirname 관련 로직 제거
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

const app = express();

app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// 🔴 핵심: 정적 서빙 미들웨어 전체를 삭제합니다.
/*
const UPLOAD_DIR = path.resolve(__dirname, 'uploads');
app.use(
    '/uploads',
    express.static(UPLOAD_DIR, {
        maxAge: '365d',
        etag: true,
        immutable: true,
        index: false,
    })
);
console.log('Serving /uploads from:', UPLOAD_DIR);
*/

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRouter);
app.use('/api/memories', memoriesRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/trip-records', tripRecordsRouter);
app.use('/api/uploads', uploadsRouter);

// ... (에러 핸들러는 그대로 유지) ...

export default app;