"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AGENDA_HOME_VISIT_FEE_ERROR = void 0;
exports.isValidAgendaBaseFee = isValidAgendaBaseFee;
exports.assertAgendaBaseFeeConfigured = assertAgendaBaseFeeConfigured;
exports.AGENDA_HOME_VISIT_FEE_ERROR = 'Debe configurar el valor de la consulta a domicilio';
function isValidAgendaBaseFee(fee) {
    return typeof fee === 'number' && Number.isFinite(fee) && fee > 0;
}
function assertAgendaBaseFeeConfigured(fee) {
    if (!isValidAgendaBaseFee(fee)) {
        throw new Error(exports.AGENDA_HOME_VISIT_FEE_ERROR);
    }
    return fee;
}
