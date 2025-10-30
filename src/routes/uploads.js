// src/routes/uploads.js
import { Router } from 'express';
import multer, { MulterError } from 'multer';
import sharp from 'sharp';
import crypto from 'crypto';
// 🔴 fs, path, fileURLToPath 는 제거합니다.
// import fs from 'fs';
// import path from 'path';
// import { fileURLToPath } from 'url';

// 🟢 GCS 서비스 파일에서 함수를 가져옵니다.
import { uploadBuffer } from '../services/gcs.service.js';


const router = Router();

// 🔴 로컬 파일 경로 관련 상수/함수 제거 (ROOT_UPLOAD, __filename, __dirname)
// const __filename = fileURLToPath(import.meta.url); // 삭제
// const __dirname = path.dirname(__filename); // 삭제
// const ROOT_UPLOAD = path.resolve(__dirname, '../uploads'); // 삭제


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
// 🔴 로컬 디스크 관련 함수 제거
// function ensureDir(dir) { ... } // 삭제

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
        // 🔴 로컬 경로 및 저장 관련 로직 모두 제거
        // const dir = path.join(ROOT_UPLOAD, folder); // 삭제
        // ensureDir(dir); // 삭제

        const id = uid();
        const mainName = `${id}.${ext}`;
        const thumbName = `${id}.thumb.jpg`;
        // const mainPath = path.join(dir, mainName); // 삭제

        let width;
        let height;
        try {
            const meta = await sharp(buffer, { failOn: 'none' }).metadata();
            width = meta.width;
            height = meta.height;
        } catch {
            // 메타데이터 실패해도 저장은 계속
        }

        // 🔴 [GCS 업로드] 원본 저장 (로컬 파일 대신 GCS 사용)
        // await fs.promises.writeFile(mainPath, buffer); // ❌ 로컬 저장 삭제
        const mainGcsKey = `${folder}/${mainName}`;
        const { publicUrl: url, bytes: uploadedSize } = await uploadBuffer(mainGcsKey, buffer, mimetype);


        // 🔴 [GCS 업로드] 썸네일 생성 및 저장
        let thumbUrl = null;
        let thumbCreated = false;
        try {
            const thumbnailBuffer = await sharp(buffer, { failOn: 'none' })
                .rotate()
                .resize({ width: 300, height: 300, fit: 'cover' })
                .jpeg({ quality: 80 })
                .toBuffer(); // 버퍼로 출력

            const thumbGcsKey = `${folder}/${thumbName}`;
            const { publicUrl: thumbPublicUrl } = await uploadBuffer(thumbGcsKey, thumbnailBuffer, 'image/jpeg');

            thumbUrl = thumbPublicUrl;
            thumbCreated = true;
        } catch {
            thumbCreated = false;
        }

        // const url = `/uploads/${folder}/${mainName}`; // ❌ 로컬 URL 대신 GCS URL 사용
        // const thumbUrl = thumbCreated ? `/uploads/${folder}/${thumbName}` : null; // ❌ 로컬 URL 대신 GCS URL 사용

        return res.status(201).json({
            url, // GCS Public URL
            thumbUrl, // GCS Public URL
            width,
            height,
            bytes: uploadedSize,
            mime: mimetype,
            ext,
        });
    } catch (err) {
        const { status, message } = toHttpError(err);
        return res.status(status).json({ error: message });
    }
});

export default router;