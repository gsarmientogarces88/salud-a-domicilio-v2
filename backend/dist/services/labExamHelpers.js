"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatLabDisplayId = formatLabDisplayId;
exports.addLabEvent = addLabEvent;
exports.getPatientUserId = getPatientUserId;
exports.isTerminalPatientStatus = isTerminalPatientStatus;
const prisma_1 = __importDefault(require("../lib/prisma"));
function formatLabDisplayId(displayNumber) {
    return `EXA-${String(displayNumber).padStart(6, '0')}`;
}
async function addLabEvent(requestId, kind, message) {
    return prisma_1.default.labExamEvent.create({
        data: { requestId, kind, message },
    });
}
async function getPatientUserId(patientProfileId) {
    const p = await prisma_1.default.patientProfile.findUnique({
        where: { id: patientProfileId },
        select: { userId: true },
    });
    return p?.userId ?? null;
}
function isTerminalPatientStatus(s) {
    return s === 'EXPIRED' || s === 'CANCELLED' || s === 'COMPLETED';
}
