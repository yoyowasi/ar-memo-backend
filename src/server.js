import app from './app.js';
import { env } from './env.js';
import { connectDB } from './db.js';

const boot = async () => {
    await connectDB();                 // MongoDB 연결
    app.listen(env.port, '127.0.0.1', () => {
        console.log(`AR Memo backend listening on http://127.0.0.1:${env.port}`);
    });
};

boot().catch((e) => {
    console.error('Boot error:', e);
    process.exit(1);
});
