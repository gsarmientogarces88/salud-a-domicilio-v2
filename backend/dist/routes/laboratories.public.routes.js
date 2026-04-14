"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const router = (0, express_1.Router)();
// GET /laboratories — listado público para que el paciente elija laboratorio
router.get('/', async (_req, res) => {
    try {
        const labs = await prisma_1.default.laboratory.findMany({
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
                commune: true,
                province: true,
                region: true,
                phone: true,
            },
        });
        res.json({ data: labs.map((l) => ({ ...l, city: l.province })) });
    }
    catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});
exports.default = router;
