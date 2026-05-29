export declare const AGENDA_HOME_VISIT_FEE_ERROR = "Debe configurar el valor de la consulta a domicilio";
export declare function isValidAgendaBaseFee(fee: unknown): fee is number;
export declare function assertAgendaBaseFeeConfigured(fee: unknown): number;
