"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startLabQuoteTimeoutJob = startLabQuoteTimeoutJob;
const prisma_1 = __importDefault(require("../lib/prisma"));
const INTERVAL_MS = 15000;
async function expirePendingQuoteRequests() {
    try {
        const now = new Date();
        const expired = await prisma_1.default.labExamRequest.findMany({
            where: {
                status: { in: ['PENDING_QUOTES', 'QUOTED'] },
                selectedQuoteId: null,
                quoteDeadlineAt: { lt: now },
            },
            select: { id: true, displayNumber: true, quotes: { select: { id: true } } },
        });
        if (!expired.length)
            return;
        for (const req of expired) {
            const hasAnyQuote = req.quotes.length > 0;
            if (!hasAnyQuote) {
                await prisma_1.default.labExamRequest.update({
                    where: { id: req.id },
                    data: { status: 'EXPIRED' },
                });
                await prisma_1.default.labExamEvent.create({
                    data: {
                        requestId: req.id,
                        kind: 'NO_PROVIDERS',
                        message: 'No existen prestadores disponibles en su zona en este momento.',
                    },
                });
            }
        }
    }
    catch (err) {
        console.error('[LAB_QUOTE_TIMEOUT] Error:', err);
    }
}
let timer = null;
function startLabQuoteTimeoutJob() {
    if (timer)
        return;
    timer = setInterval(expirePendingQuoteRequests, INTERVAL_MS);
    void expirePendingQuoteRequests();
}
