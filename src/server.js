// src/server.js
import app from './app.js';
import { env } from './env.js';
import { connectDB } from './db.js';

const boot = async () => {
    await connectDB();
    app.listen(env.port, () => {
        console.log(`AR Memo backend (MongoDB) listening on :${env.port}`);
    });
};

boot().catch((e) => {
    console.error('Boot error:', e);
    process.exit(1);
});
