"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resultUpload = exports.orderUpload = void 0;
exports.publicUploadPath = publicUploadPath;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const multer_1 = __importDefault(require("multer"));
const root = path_1.default.join(process.cwd(), 'uploads', 'lab');
['orders', 'results'].forEach((d) => {
    const p = path_1.default.join(root, d);
    if (!fs_1.default.existsSync(p))
        fs_1.default.mkdirSync(p, { recursive: true });
});
function safeName(original) {
    return `${Date.now()}_${original.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
}
exports.orderUpload = (0, multer_1.default)({
    storage: multer_1.default.diskStorage({
        destination: (_req, _file, cb) => cb(null, path_1.default.join(root, 'orders')),
        filename: (_req, file, cb) => cb(null, safeName(file.originalname)),
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const ok = /\.(pdf|jpg|jpeg|png)$/i.test(file.originalname);
        if (!ok)
            return cb(new Error('Solo PDF o imagen (jpg, png)'));
        cb(null, true);
    },
});
exports.resultUpload = (0, multer_1.default)({
    storage: multer_1.default.diskStorage({
        destination: (_req, _file, cb) => cb(null, path_1.default.join(root, 'results')),
        filename: (_req, file, cb) => cb(null, safeName(file.originalname)),
    }),
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const ok = /\.(pdf|jpg|jpeg|png)$/i.test(file.originalname);
        if (!ok)
            return cb(new Error('Solo PDF o imagen'));
        cb(null, true);
    },
});
function publicUploadPath(relativeFromLab) {
    return `/uploads/lab/${relativeFromLab}`;
}
