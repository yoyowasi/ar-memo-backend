import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import 'express-async-errors'; // ✨ 추가됨: async error-handling

import memoriesRouter from './routes/memories.js';
import groupsRouter from './routes/groups.js';
import uploadsRouter from './routes/uploads.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// 정적 호스팅
app.use(
    '/uploads',
    express.static(path.join(__dirname, '../uploads'), {
        maxAge: '365d',
        etag: true,
        immutable: true,
    })
);

app.get('/health', (_req, res) => res.json({ ok: true }));

// 라우터 연결
app.use('/api/memories', memoriesRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/uploads', uploadsRouter);

// 전역 에러 핸들러 (이제 async 함수 에러도 자동으로 받음)
app.use((err, _req, res, _next) => {
    console.error(err);
    // Zod 에러인 경우 좀 더 구체적인 메시지 제공
    if (err.issues) {
        return res.status(400).json({ error: 'Invalid input', details: err.issues });
    }
    res.status(400).json({ error: String(err?.message ?? err) });
});

export default app;