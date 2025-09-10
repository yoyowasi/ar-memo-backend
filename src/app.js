import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

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

// 정적 호스팅 (이미지 캐시 강하게)
app.use(
    '/uploads',
    express.static(path.join(__dirname, '../uploads'), {
        maxAge: '365d',
        etag: true,
        immutable: true,
    })
);

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/memories', memoriesRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/uploads', uploadsRouter);

// (선택) 라우트 디버그
// app.get('/__routes', (req, res) => {
//   const routes = [];
//   app._router.stack.forEach((m) => {
//     if (m.name === 'router' && m.handle?.stack) {
//       m.handle.stack.forEach((h) => {
//         const r = h.route;
//         if (r) {
//           const methods = Object.keys(r.methods).join(',').toUpperCase();
//           routes.push(`${methods} ${r.path}`);
//         }
//       });
//     }
//   });
//   res.json(routes);
// });

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(400).json({ error: String(err?.message ?? err) });
});

export default app;
