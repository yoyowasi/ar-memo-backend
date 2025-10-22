// src/app.js
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

import memoriesRouter from './routes/memories.js';
import groupsRouter from './routes/groups.js';
import tripRecordsRouter from './routes/tripRecords.js';
import uploadsRouter from './routes/uploads.js';
import authRouter from './routes/auth.js';
import { env } from './env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// 🔴 핵심: 정적 서빙 디렉터리를 src/uploads 로 고정
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

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRouter);
app.use('/api/memories', memoriesRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/trip-records', tripRecordsRouter);
app.use('/api/uploads', uploadsRouter);

// 개선된 전역 에러 핸들러
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
    console.error(err);

    if (err instanceof z.ZodError) {
        return res.status(400).json({
            error: 'Invalid input provided',
            details: err.flatten().fieldErrors,
        });
    }

    const statusCode = err.statusCode || 500;

    if (env.nodeEnv === 'production') {
        return res.status(statusCode).json({
            error: 'An unexpected error occurred',
        });
    }

    res.status(statusCode).json({
        error: String(err?.message ?? err),
        stack: err.stack,
    });
});

export default app;
