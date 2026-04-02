"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const roles_1 = require("../middleware/roles");
const prisma_1 = __importDefault(require("../lib/prisma"));
const paySvc = __importStar(require("../services/payments.service"));
const router = (0, express_1.Router)();
// 1) POST /payments/:serviceId/create — Paciente crea transacción pendiente
router.post('/:serviceId/create', auth_1.authenticate, (0, roles_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const sr = await prisma_1.default.serviceRequest.findUnique({ where: { id: req.params.serviceId } });
        if (!sr)
            return res.status(404).json({ error: true, message: 'Solicitud no encontrada' });
        // Verificar dueño
        const patient = await prisma_1.default.patientProfile.findUnique({ where: { userId: req.user.id } });
        if (!patient || patient.id !== sr.patientId) {
            return res.status(403).json({ error: true, message: 'No es tu solicitud' });
        }
        const provider = req.body.provider || 'mercadopago';
        const tx = await paySvc.createTransaction(sr.id, provider, sr.totalAmount);
        res.status(201).json({ message: 'Transacción creada', data: tx });
    }
    catch (e) {
        res.status(400).json({ error: true, message: e.message });
    }
});
// 2) POST /payments/:serviceId/confirm — Paciente confirma pago
router.post('/:serviceId/confirm', auth_1.authenticate, (0, roles_1.authorize)('PATIENT'), async (req, res) => {
    try {
        const sr = await prisma_1.default.serviceRequest.findUnique({
            where: { id: req.params.serviceId },
            include: { transactions: { where: { status: 'COMPLETED' }, take: 1 } },
        });
        if (!sr)
            return res.status(404).json({ error: true, message: 'Solicitud no encontrada' });
        // Verificar dueño
        const patient = await prisma_1.default.patientProfile.findUnique({ where: { userId: req.user.id } });
        if (!patient || patient.id !== sr.patientId) {
            return res.status(403).json({ error: true, message: 'No es tu solicitud' });
        }
        // Evitar doble confirmación
        if (sr.transactions.length > 0) {
            return res.status(409).json({ error: true, message: 'Pago ya confirmado' });
        }
        const providerRef = req.body.providerRef || `placeholder-${Date.now()}`;
        const result = await paySvc.markAsPaid(sr.id, providerRef);
        res.json({ message: 'Pago confirmado', data: result });
    }
    catch (e) {
        res.status(400).json({ error: true, message: e.message });
    }
});
// 3) POST /payments/:serviceId/refund — Admin reembolsa
router.post('/:serviceId/refund', auth_1.authenticate, (0, roles_1.authorize)('ADMIN'), async (req, res) => {
    try {
        const sr = await prisma_1.default.serviceRequest.findUnique({ where: { id: req.params.serviceId } });
        if (!sr)
            return res.status(404).json({ error: true, message: 'Solicitud no encontrada' });
        const result = await paySvc.refund(sr.id);
        res.json({ message: 'Reembolso procesado', data: result });
    }
    catch (e) {
        res.status(400).json({ error: true, message: e.message });
    }
});
// 4) POST /payments/webhook — Placeholder pasarela de pago
router.post('/webhook', (_req, res) => {
    // TODO Fase 2: validar firma, procesar evento de Stripe/MercadoPago
    res.status(200).json({ received: true });
});
exports.default = router;
