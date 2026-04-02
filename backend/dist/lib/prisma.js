"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const config_1 = require("../config");
const prisma = new client_1.PrismaClient({
    log: config_1.config.isDev ? ['error', 'warn'] : ['error'],
});
exports.default = prisma;
