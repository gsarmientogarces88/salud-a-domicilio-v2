"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyUser = notifyUser;
const prisma_1 = __importDefault(require("../lib/prisma"));
async function notifyUser(userId, type, title, body, link) {
    return prisma_1.default.notification.create({
        data: { userId, type, title, body, link: link ?? undefined },
    });
}
