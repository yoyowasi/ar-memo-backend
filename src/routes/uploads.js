// src/routes/uploads.js
import { Router } from 'express';
import multer, { MulterError } from 'multer';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// ---------- config ----------
const ROOT_UPLOAD = path.join(__dirname, '../uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
]);

// memoryStorage + strict limits
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1,
        fields: 0,
        parts: 2,            // boundary 조작 DoS 억제
        fieldNameSize: 100
    },
    fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME.has(file.mimetype)) {
            return cb(new Error('Unsupported image type'));
        }
        cb(null, true);
    }
});

// ---------- helpers ----------
function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
function uid() {
    return crypto.randomBytes(16).toString('hex');
}
function todayFolder() {
    const d = new Date();
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
// multer -> promise 래핑 (에러 안전)
function runMulterSingle(req, res, field) {
    return new Promise((resolve, reject) => {
        upload.single(field)(req, res, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}
// Multer/기타 에러 정규화
function toHttpError(err) {
    if (err instanceof MulterError) {
        // 제한 초과 등
        if (err.code === 'LIMIT_FILE_SIZE') {
            return { status: 413, message: 'File too large' };
        }
        return { status: 400, message: `Upload error: ${err.code}` };
    }
    return { status: 400, message: err?.message || 'Upload failed' };
}

// ---------- routes ----------
/**
 * POST /api/uploads/photo
 * form-data: file (File)
 * response: { url, thumbUrl, width, height, bytes }
 */
router.post('/photo', async (req, res, next) => {
    try {
        // 안전한 실행 (malformed 요청으로 인한 crash 방지)
        await runMulterSingle(req, res, 'file');

        if (!req.file) {
            return res.status(400).json({ error: 'No file' });
        }
        if (!ALLOWED_MIME.has(req.file.mimetype)) {
            return res.status(400).json({ error: 'Unsupported image type' });
        }

        const folder = todayFolder();
        const dir = path.join(ROOT_UPLOAD, folder);
        ensureDir(dir);

        const id = uid();
        const mainName = `${id}.webp`;
        const thumbName = `${id}.thumb.webp`;
        const mainPath = path.join(dir, mainName);
        const thumbPath = path.join(dir, thumbName);

        // 메인(긴변 1600), 썸네일(300x300), EXIF 제거
        const mainPipeline = sharp(req.file.buffer, { failOn: 'none' })
            .rotate()
            .withMetadata({ exif: undefined, icc: undefined })
            .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 75 });

        const thumbPipeline = sharp(req.file.buffer, { failOn: 'none' })
            .rotate()
            .withMetadata({ exif: undefined, icc: undefined })
            .resize({ width: 300, height: 300, fit: 'cover' })
            .webp({ quality: 70 });

        const [{ width, height, size: bytes }] = await Promise.all([
            mainPipeline.toFile(mainPath),
            thumbPipeline.toFile(thumbPath)
        ]);

        const url = `/uploads/${folder}/${mainName}`;
        const thumbUrl = `/uploads/${folder}/${thumbName}`;

        return res.status(201).json({ url, thumbUrl, width, height, bytes });
    } catch (err) {
        const { status, message } = toHttpError(err);
        // 전역 에러핸들러로 넘기지 않고 여기서 응답 (업로드 라우트는 즉시 응답)
        return res.status(status).json({ error: message });
    }
});

export default router;
