import jwt from 'jsonwebtoken';
import { env } from '../env.js';

export function signToken(payload) {
    return jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.expires });
}

export function authRequired(req, res, next) {
    const hdr = req.headers.authorization || '';
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        req.user = jwt.verify(token, env.jwt.secret); // { id, email }
        next();
    } catch {
        return res.status(401).json({ error: 'Unauthorized' });
    }
}

// 공용 에러 핸들링용 래퍼
export const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
