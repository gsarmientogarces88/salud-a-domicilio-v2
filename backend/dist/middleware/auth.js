"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const prisma_1 = __importDefault(require("../lib/prisma"));
const authenticate = async (req, res, next) => {
    try {
        const header = req.headers.authorization;
        if (!header?.startsWith('Bearer ')) {
            return res.status(401).json({ error: true, message: 'Token requerido' });
        }
        const token = header.split(' ')[1];
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret);
        const user = await prisma_1.default.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, role: true, isBanned: true },
        });
        if (!user) {
            return res.status(401).json({ error: true, message: 'Usuario no existe' });
        }
        if (user.isBanned) {
            return res.status(403).json({ error: true, message: 'Usuario baneado' });
        }
        req.user = user;
        next();
    }
    catch {
        return res.status(401).json({ error: true, message: 'Token inválido o expirado' });
    }
};
exports.authenticate = authenticate;
