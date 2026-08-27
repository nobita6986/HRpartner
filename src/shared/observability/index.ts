/**
 * Observability foundation barrel — V5-OPS-04a §4.2 scope.
 */
export { getCorrelationId, generateId, buildCorrelationHeaders, CORRELATION_HEADER } from './correlation-id';
export type { SafeMeta, LogEntry, LogLevel } from './logger';
export { debug, info, warn, error, setSink, LOG_SCHEMA_VERSION, __captureSink, __resetSink } from './logger';
export { report, reportSafe, configure, isConfigured, noopAdapter } from './error-reporter';
export type { SafeErrorEnvelope, ReportStatus, ReporterAdapter } from './error-reporter';
