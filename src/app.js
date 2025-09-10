import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';

import memoriesRouter from './routes/memories.js';
import groupsRouter from './routes/groups.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));
app.get('/', (_req, res) => res.send('AR Memo backend running. See /health and /api/*'));

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/memories', memoriesRouter);
app.use('/api/groups', groupsRouter);

// app.js 최하단 가까이 (에러핸들러 위)
app.get('/__routes', (req, res) => {
    const routes = [];
    app._router.stack.forEach((m) => {
        if (m.name === 'router' && m.handle?.stack) {
            m.handle.stack.forEach((h) => {
                const r = h.route;
                if (r) {
                    const methods = Object.keys(r.methods).join(',').toUpperCase();
                    routes.push(`${methods} /api/groups${r.path}`);
                }
            });
        }
    });
    res.json(routes);
});



// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(400).json({ error: String(err?.message ?? err) });
});

export default app;
