import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

import memoriesRouter from './routes/memories.js';
import groupsRouter from './routes/groups.js';
import uploadsRouter from './routes/uploads.js';
import authRouter from './routes/auth.js';

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
app.use('/api/uploads', uploadsRouter);

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(400).json({ error: String(err?.message ?? err) });
});

export default app;
