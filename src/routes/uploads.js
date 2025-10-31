// src/routes/uploads.js
import { Router } from 'express';
import multer, { MulterError } from 'multer';
import sharp from 'sharp';
import crypto from 'crypto';
// 🔴 fs, path, fileURLToPath 는 제거합니다. (원래 제거되어 있었음)

// 🟢 GCS 서비스 파일에서 'generateSignedReadUrl' 함수를 추가로 가져옵니다.
import { uploadBuffer, generateSignedReadUrl } from '../services/gcs.service.js';


const router = Router();

// 🔴 로컬 파일 경로 관련 상수/함수 제거 (원래 제거되어 있었음)

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
// 🔴 로컬 디스크 관련 함수 제거 (원래 제거되어 있었음)

function uid() {
    return crypto.randomBytes(16).toString('hex');
}
function todayFolder() {
    const d = new Date();
    const y = d.getUTCFullYear();
    // 🟢🟢🟢 [오타 수정] 🟢🟢🟢
    // getUTCFullth() -> getUTCMonth()
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    // 🟢🟢🟢 🟢🟢🟢 🟢🟢🟢
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
        // 400 에러의 원인이었던 'LIMIT_UNEXPECTED_FILE'도 여기서 처리됩니다.
        return { status: 400, message: `Upload error: ${err.code}` };
    }
    // 🟢 d.getUTCFullth() 같은 서버 코드가 터지면 500 에러를 반환합니다.
    const message = err?.message || 'Upload failed';
    console.error('Upload Error:', err); // 서버 로그에 에러 기록
    return { status: 500, message: `Server error: ${message}` };
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
        const folder = todayFolder(); // 🟢 여기서 오타가 났었습니다.

        const id = uid();
        const mainName = `${id}.${ext}`;
        const thumbName = `${id}.thumb.jpg`;

        let width;
        let height;
        try {
            const meta = await sharp(buffer, { failOn: 'none' }).metadata();
            width = meta.width;
            height = meta.height;
        } catch {
            // 메타데이터 실패해도 저장은 계속
        }

        // 🟢 [GCS 업로드] 원본 저장 (key를 반환받음)
        const mainGcsKey = `${folder}/${mainName}`;
        // 🔽 반환값이 { key, bytes }가 됩니다.
        const { key, bytes: uploadedSize } = await uploadBuffer(mainGcsKey, buffer, mimetype);

        // 🟢 [GCS 서명] 즉시 보기를 위한 임시 URL 생성
        const url = await generateSignedReadUrl(key);


        // 🟢 [GCS 업로드] 썸네일 생성 및 저장 (key/url 반환)
        let thumbUrl = null;
        let thumbKey = null; // 👈 썸네일 key도 저장

        try {
            const thumbnailBuffer = await sharp(buffer, { failOn: 'none' })
                .rotate()
                .resize({ width: 300, height: 300, fit: 'cover' })
                .jpeg({ quality: 80 })
                .toBuffer(); // 버퍼로 출력

            const thumbGcsKey = `${folder}/${thumbName}`;
            // 🔽 썸네일의 key(tKey)를 받습니다.
            const { key: tKey } = await uploadBuffer(thumbGcsKey, thumbnailBuffer, 'image/jpeg');

            thumbKey = tKey; // 👈 key 저장
            thumbUrl = await generateSignedReadUrl(thumbKey); // 👈 임시 URL 생성
        } catch {
            // 썸네일 생성 실패
        }

        // 🟢 DB 저장용 key와 즉시 보기용 url을 모두 반환합니다.
        return res.status(201).json({
            key,      // 👈 (A) DB 저장용: "2025-10-31/uuid.jpg"
            url,      // 👈 (B) 즉시 보기용: "https://...SignedUrl..."
            thumbKey, // 👈 (A) DB 저장용 (썸네일)
            thumbUrl, // 👈 (B) 즉시 보기용 (썸네일)
            width,
            height,
            bytes: uploadedSize,
            mime: mimetype,
            ext,
        });
    } catch (err) {
        // 🟢 여기서 "d.getUTCFullth is not a function" 에러가 잡힙니다.
        const { status, message } = toHttpError(err);
        return res.status(status).json({ error: message });
    }
});

export default router;