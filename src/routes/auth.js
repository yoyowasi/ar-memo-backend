import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { signToken, authRequired, asyncHandler } from '../middlewares/auth.js';

const router = Router();

const emailSchema = z.string().email();
const passwordSchema = z.string().min(6).max(100);

router.post('/register', asyncHandler(async (req, res) => {
    const body = z.object({
        email: emailSchema,
        password: passwordSchema,
        name: z.string().min(1).max(50).optional()
    }).parse(req.body);

    const exists = await User.findOne({ email: body.email });
    if (exists) return res.status(409).json({ error: 'Email already in use' });

    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await User.create({
        email: body.email,
        passwordHash,
        name: body.name ?? ''
    });

    const token = signToken({ id: user._id.toString(), email: user.email });
    res.status(201).json({
        token,
        user: { id: user._id, email: user.email, name: user.name, avatarUrl: user.avatarUrl }
    });
}));

router.post('/login', asyncHandler(async (req, res) => {
    const body = z.object({ email: emailSchema, password: passwordSchema }).parse(req.body);

    const user = await User.findOne({ email: body.email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken({ id: user._id.toString(), email: user.email });
    res.json({
        token,
        user: { id: user._id, email: user.email, name: user.name, avatarUrl: user.avatarUrl }
    });
}));

router.get('/me', authRequired, asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).lean();
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json({ id: user._id, email: user.email, name: user.name, avatarUrl: user.avatarUrl });
}));

export default router;
