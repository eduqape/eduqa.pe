export const RUNTIME_ERROR_CODES = [
    'unsupported-language',
    'busy',
    'runtime-configuration',
    'asset-not-found',
    'asset-integrity',
    'asset-too-large',
    'worker-startup',
    'compile',
    'runtime',
    'timeout',
    'cancelled',
    'resource-limit',
    'output-limit',
    'diagnostic-limit',
    'protocol',
    'unsupported-browser-feature'
];
export const RUNTIME_PHASES = [
    'configuration',
    'asset',
    'startup',
    'compile',
    'execute',
    'protocol',
    'dispose'
];
export class WasmIdleError extends Error {
    code;
    phase;
    runtimeId;
    profileId;
    recoverable;
    constructor(message, options) {
        super(message, { cause: options.cause });
        this.name = 'WasmIdleError';
        this.code = options.code;
        this.phase = options.phase;
        this.runtimeId = options.runtimeId;
        this.profileId = options.profileId;
        this.recoverable = options.recoverable ?? false;
    }
}
export class UnsupportedLanguageError extends WasmIdleError {
    languageId;
    constructor(languageId, options = {}) {
        super(`Unsupported language: ${languageId}`, {
            ...options,
            code: 'unsupported-language',
            phase: options.phase ?? 'configuration',
            recoverable: options.recoverable ?? false
        });
        this.name = 'UnsupportedLanguageError';
        this.languageId = languageId;
    }
}
export class BusyError extends WasmIdleError {
    constructor(message = 'A runtime operation is already active', options = {}) {
        super(message, {
            ...options,
            code: 'busy',
            phase: options.phase ?? 'execute',
            recoverable: options.recoverable ?? true
        });
        this.name = 'BusyError';
    }
}
export class RuntimeConfigurationError extends WasmIdleError {
    constructor(message, options = {}) {
        super(message, {
            ...options,
            code: 'runtime-configuration',
            phase: options.phase ?? 'configuration',
            recoverable: options.recoverable ?? false
        });
        this.name = 'RuntimeConfigurationError';
    }
}
export class AssetNotFoundError extends WasmIdleError {
    constructor(message, options = {}) {
        super(message, {
            ...options,
            code: 'asset-not-found',
            phase: options.phase ?? 'asset',
            recoverable: options.recoverable ?? true
        });
        this.name = 'AssetNotFoundError';
    }
}
export class AssetIntegrityError extends WasmIdleError {
    constructor(message, options = {}) {
        super(message, {
            ...options,
            code: 'asset-integrity',
            phase: options.phase ?? 'asset',
            recoverable: options.recoverable ?? false
        });
        this.name = 'AssetIntegrityError';
    }
}
export class AssetTooLargeError extends WasmIdleError {
    limit;
    actual;
    constructor(message, options = {}) {
        super(message, {
            ...options,
            code: 'asset-too-large',
            phase: options.phase ?? 'asset',
            recoverable: options.recoverable ?? false
        });
        this.name = 'AssetTooLargeError';
        this.limit = options.limit;
        this.actual = options.actual;
    }
}
export class WorkerStartupError extends WasmIdleError {
    constructor(message, options = {}) {
        super(message, {
            ...options,
            code: 'worker-startup',
            phase: options.phase ?? 'startup',
            recoverable: options.recoverable ?? true
        });
        this.name = 'WorkerStartupError';
    }
}
export class CompileError extends WasmIdleError {
    constructor(message, options = {}) {
        super(message, {
            ...options,
            code: 'compile',
            phase: options.phase ?? 'compile',
            recoverable: options.recoverable ?? true
        });
        this.name = 'CompileError';
    }
}
export class RuntimeExecutionError extends WasmIdleError {
    constructor(message, options = {}) {
        super(message, {
            ...options,
            code: 'runtime',
            phase: options.phase ?? 'execute',
            recoverable: options.recoverable ?? true
        });
        this.name = 'RuntimeExecutionError';
    }
}
export class TimeoutError extends WasmIdleError {
    timeoutMs;
    constructor(message, options) {
        super(message, {
            ...options,
            code: 'timeout',
            recoverable: options.recoverable ?? true
        });
        this.name = 'TimeoutError';
        this.timeoutMs = options.timeoutMs;
    }
}
export class CancelledError extends WasmIdleError {
    constructor(message = 'Runtime operation cancelled', options = {}) {
        super(message, {
            ...options,
            code: 'cancelled',
            phase: options.phase ?? 'execute',
            recoverable: options.recoverable ?? true
        });
        this.name = 'CancelledError';
    }
}
export class ResourceLimitError extends WasmIdleError {
    resource;
    limit;
    actual;
    constructor(message, options) {
        super(message, {
            ...options,
            code: 'resource-limit',
            phase: options.phase ?? 'execute',
            recoverable: options.recoverable ?? true
        });
        this.name = 'ResourceLimitError';
        this.resource = options.resource;
        this.limit = options.limit;
        this.actual = options.actual;
    }
}
export class OutputLimitError extends WasmIdleError {
    limit;
    actual;
    constructor(message, options) {
        super(message, {
            ...options,
            code: 'output-limit',
            phase: options.phase ?? 'execute',
            recoverable: options.recoverable ?? true
        });
        this.name = 'OutputLimitError';
        this.limit = options.limit;
        this.actual = options.actual;
    }
}
export class DiagnosticLimitError extends WasmIdleError {
    limit;
    actual;
    constructor(message, options) {
        super(message, {
            ...options,
            code: 'diagnostic-limit',
            phase: options.phase ?? 'compile',
            recoverable: options.recoverable ?? true
        });
        this.name = 'DiagnosticLimitError';
        this.limit = options.limit;
        this.actual = options.actual;
    }
}
export class ProtocolError extends WasmIdleError {
    constructor(message, options = {}) {
        super(message, {
            ...options,
            code: 'protocol',
            phase: options.phase ?? 'protocol',
            recoverable: options.recoverable ?? false
        });
        this.name = 'ProtocolError';
    }
}
export class UnsupportedBrowserFeatureError extends WasmIdleError {
    feature;
    constructor(feature, options = {}) {
        super(`Unsupported browser feature: ${feature}`, {
            ...options,
            code: 'unsupported-browser-feature',
            phase: options.phase ?? 'configuration',
            recoverable: options.recoverable ?? false
        });
        this.name = 'UnsupportedBrowserFeatureError';
        this.feature = feature;
    }
}
export function isWasmIdleError(value) {
    return value instanceof WasmIdleError;
}
