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
    'image/heif',
]);

// 기기에서 넘어온 원본 확장자 매핑 (그대로 저장)
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
        parts: 2, // boundary 조작 DoS 억제
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
 * response: { url, thumbUrl, width, height, bytes, mime, ext }
 *
 * 변경점:
 * - 메인 이미지는 "원본 그대로" 저장 (형식 변환 없음, EXIF 포함 그대로 유지)
 * - 썸네일만 별도로 생성 (JPEG)
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

        const ext = EXT_BY_MIME[mimetype] || 'bin'; // fallback
        const folder = todayFolder();
        const dir = path.join(ROOT_UPLOAD, folder);
        ensureDir(dir);

        const id = uid();
        const mainName = `${id}.${ext}`;
        const thumbName = `${id}.thumb.jpg`; // 썸네일은 웹호환성 높은 JPEG로
        const mainPath = path.join(dir, mainName);
        const thumbPath = path.join(dir, thumbName);

        // 1) 메타데이터(크기)만 읽고, 메인 파일은 "원본 그대로" 저장
        //    (EXIF 위치정보 등 유지)
        let width = undefined;
        let height = undefined;
        try {
            const meta = await sharp(buffer, { failOn: 'none' }).metadata();
            width = meta.width;
            height = meta.height;
        } catch {
            // 메타데이터 읽기 실패해도 업로드는 진행
        }

        // 원본 그대로 저장
        await fs.promises.writeFile(mainPath, buffer);

        // 2) 썸네일 생성 (회전 적용, EXIF는 제거)
        let thumbCreated = false;
        try {
            await sharp(buffer, { failOn: 'none' })
                .rotate()
                .resize({ width: 300, height: 300, fit: 'cover' })
                .jpeg({ quality: 80 })
                .toFile(thumbPath);
            thumbCreated = true;
        } catch {
            // 환경에서 HEIC/HEIF 디코딩이 불가한 경우가 있을 수 있음 -> 썸네일 생략
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
