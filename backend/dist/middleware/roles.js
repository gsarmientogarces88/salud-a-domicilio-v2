"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = void 0;
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: true, message: 'No autenticado' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: true, message: 'Sin permisos' });
        }
        next();
    };
};
exports.authorize = authorize;
