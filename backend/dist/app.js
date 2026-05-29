"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const path_1 = __importDefault(require("path"));
const config_1 = require("./config");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const services_routes_1 = __importDefault(require("./routes/services.routes"));
const payments_routes_1 = __importDefault(require("./routes/payments.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const doctor_routes_1 = __importDefault(require("./routes/doctor.routes"));
const scheduling_routes_1 = __importDefault(require("./routes/scheduling.routes"));
const professionals_routes_1 = __importDefault(require("./routes/professionals.routes"));
const agenda_routes_1 = __importDefault(require("./routes/agenda.routes"));
const laboratories_public_routes_1 = __importDefault(require("./routes/laboratories.public.routes"));
const patientLab_routes_1 = __importDefault(require("./routes/patientLab.routes"));
const patientNotifications_routes_1 = __importDefault(require("./routes/patientNotifications.routes"));
const patientProfile_routes_1 = __importDefault(require("./routes/patientProfile.routes"));
const laboratory_routes_1 = __importDefault(require("./routes/laboratory.routes"));
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({ origin: config_1.config.frontendUrl, credentials: true }));
app.use((0, morgan_1.default)(config_1.config.isDev ? 'dev' : 'combined'));
app.use(express_1.default.json());
app.use('/uploads', express_1.default.static(path_1.default.join(process.cwd(), 'uploads')));
// Health
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', ts: new Date().toISOString() });
});
// Rutas
app.use('/api/auth', auth_routes_1.default);
app.use('/api/services', services_routes_1.default);
app.use('/api/payments', payments_routes_1.default);
app.use('/api/admin', admin_routes_1.default);
app.use('/api/doctor', doctor_routes_1.default);
app.use('/api/scheduling', scheduling_routes_1.default);
app.use('/api/professionals', professionals_routes_1.default);
app.use('/api/agenda', agenda_routes_1.default);
app.use('/api/laboratories', laboratories_public_routes_1.default);
app.use('/api/patient/lab-exams', patientLab_routes_1.default);
app.use('/api/patient', patientProfile_routes_1.default);
app.use('/api/patient', patientNotifications_routes_1.default);
app.use('/api/laboratory', laboratory_routes_1.default);
// Error handler global
app.use((err, _req, res, _next) => {
    console.error('[ERROR]', err.message || err);
    res.status(err.status || 500).json({
        error: true,
        message: config_1.config.isDev ? err.message : 'Error interno',
    });
});
exports.default = app;
