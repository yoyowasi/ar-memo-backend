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
/**
 * 🔴 핵심: 저장 디렉터리를 src/uploads 로 고정 (app.js 의 정적 서빙과 동일)
 *  - 여기와 app.js 의 UPLOAD_DIR 이 항상 같은 절대경로여야 404 가 나지 않음.
 */
const ROOT_UPLOAD = path.resolve(__dirname, '../uploads'); // routes 기준 ../uploads == src/uploads

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
]);

// 원본 확장자 유지
const EXT_BY_MIME = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/heic': 'heic',
    'image/heif': 'heif',
};

// memoryStorage + strict limits
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1,
        fields: 0,
        parts: 2,
        fieldNameSize: 100,
    },
    fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME.has(file.mimetype)) {
            return cb(new Error('Unsupported image type'));
        }
        cb(null, true);
    },
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
function runMulterSingle(req, res, field) {
    return new Promise((resolve, reject) => {
        upload.single(field)(req, res, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}
function toHttpError(err) {
    if (err instanceof MulterError) {
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
 * response: { url, thumbUrl, width, height, bytes, mime, ext }
 *
 * - 메인 이미지는 원본 그대로 저장(EXIF 유지)
 * - 썸네일만 JPEG로 생성
 */
router.post('/photo', async (req, res) => {
    try {
        await runMulterSingle(req, res, 'file');

        if (!req.file) {
            return res.status(400).json({ error: 'No file' });
        }
        const { mimetype, buffer, size } = req.file;
        if (!ALLOWED_MIME.has(mimetype)) {
            return res.status(400).json({ error: 'Unsupported image type' });
        }

        const ext = EXT_BY_MIME[mimetype] || 'bin';
        const folder = todayFolder();
        const dir = path.join(ROOT_UPLOAD, folder);
        ensureDir(dir);

        const id = uid();
        const mainName = `${id}.${ext}`;
        const thumbName = `${id}.thumb.jpg`;
        const mainPath = path.join(dir, mainName);
        const thumbPath = path.join(dir, thumbName);

        let width;
        let height;
        try {
            const meta = await sharp(buffer, { failOn: 'none' }).metadata();
            width = meta.width;
            height = meta.height;
        } catch {
            // 메타데이터 실패해도 저장은 계속
        }

        // 원본 저장 (EXIF 포함)
        await fs.promises.writeFile(mainPath, buffer);

        // 썸네일 저장 (회전 적용)
        let thumbCreated = false;
        try {
            await sharp(buffer, { failOn: 'none' })
                .rotate()
                .resize({ width: 300, height: 300, fit: 'cover' })
                .jpeg({ quality: 80 })
                .toFile(thumbPath);
            thumbCreated = true;
        } catch {
            thumbCreated = false;
        }

        const url = `/uploads/${folder}/${mainName}`;
        const thumbUrl = thumbCreated ? `/uploads/${folder}/${thumbName}` : null;

        return res.status(201).json({
            url,
            thumbUrl,
            width,
            height,
            bytes: size,
            mime: mimetype,
            ext,
        });
    } catch (err) {
        const { status, message } = toHttpError(err);
        return res.status(status).json({ error: message });
    }
});

export default router;
