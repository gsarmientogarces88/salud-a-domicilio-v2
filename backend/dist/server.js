"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const config_1 = require("./config");
const pendingTimeout_job_1 = require("./jobs/pendingTimeout.job");
const expireHolds_job_1 = require("./jobs/expireHolds.job");
const inProgressAutoComplete_job_1 = require("./jobs/inProgressAutoComplete.job");
const labQuoteTimeout_job_1 = require("./jobs/labQuoteTimeout.job");
app_1.default.listen(config_1.config.port, () => {
    console.log(`🏥 API corriendo en puerto ${config_1.config.port}`);
    (0, pendingTimeout_job_1.startPendingTimeoutJob)();
    (0, expireHolds_job_1.startExpireHoldsJob)();
    (0, inProgressAutoComplete_job_1.startInProgressAutoCompleteJob)();
    (0, labQuoteTimeout_job_1.startLabQuoteTimeoutJob)();
});
