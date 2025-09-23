// src/app.js

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod'; // Zod 에러 처리를 위해 import

import memoriesRouter from './routes/memories.js';
import groupsRouter from './routes/groups.js';
import tripRecordsRouter from './routes/tripRecords.js'; // 새로 추가된 라우터 import
import uploadsRouter from './routes/uploads.js';
import authRouter from './routes/auth.js';
import { env } from './env.js'; // 환경 변수를 사용하기 위해 import

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

app.use(
    '/uploads',
    express.static(path.join(__dirname, '../uploads'), {
        maxAge: '365d',
        etag: true,
        immutable: true
    })
);

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRouter);
app.use('/api/memories', memoriesRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/trip-records', tripRecordsRouter); // 새로 추가된 라우터 등록
app.use('/api/uploads', uploadsRouter);

// 개선된 전역 에러 핸들러
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
    console.error(err);

    // Zod 유효성 검사 에러인 경우, 상세한 필드 오류를 클라이언트에 전달
    if (err instanceof z.ZodError) {
        return res.status(400).json({
            error: 'Invalid input provided',
            details: err.flatten().fieldErrors,
        });
    }

    const statusCode = err.statusCode || 500;

    // 프로덕션 환경에서는 보안을 위해 일반적인 에러 메시지를 전송
    if (env.nodeEnv === 'production') {
        return res.status(statusCode).json({
            error: 'An unexpected error occurred',
        });
    }

    // 개발 환경에서는 디버깅을 위해 상세한 에러 정보와 스택 트레이스를 전송
    res.status(statusCode).json({
        error: String(err?.message ?? err),
        stack: err.stack,
    });
});


export default app;