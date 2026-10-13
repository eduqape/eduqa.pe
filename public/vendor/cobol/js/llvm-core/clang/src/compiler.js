import Runtime from './artifact-runtime.js';
import { loadRuntimeManifest, resolveRuntimeManifestUrl } from './runtime-manifest.js';
import { resolveRuntimeBaseUrl, resolveRuntimeBaseUrlFromManifestUrl } from './url.js';
import { DEFAULT_MAX_DECOMPRESSED_ASSET_BYTES, DEFAULT_MAX_RUNTIME_JSON_BYTES } from '../../core/src/wasm.js';
import { resolveDebugMode } from './types.js';
function resolveMaxAssetBytes(maxAssetBytes) {
    const resolved = maxAssetBytes ?? DEFAULT_MAX_DECOMPRESSED_ASSET_BYTES;
    if (!Number.isSafeInteger(resolved) || resolved <= 0) {
        throw new TypeError('Clang maxAssetBytes must be a positive safe integer');
    }
    return resolved;
}
function pushRecord(records, enabled, message, level = 'log') {
    if (!enabled)
        return;
    records.push({ level, message });
}
function emitProgress(request, stage, percent, message) {
    request.onProgress?.({
        stage,
        completed: Math.round(percent),
        total: 100,
        percent,
        message
    });
}
function extractCompilerDiagnostics(output) {
    const diagnostics = [];
    for (const line of output.split(/\r?\n/)) {
        const match = line.match(/^(.*?):(\d+):(?:(\d+):)?\s*(fatal error|error|warning|note):\s*(.+)$/);
        if (!match)
            continue;
        diagnostics.push({
            fileName: match[1] || undefined,
            lineNumber: Number(match[2]),
            columnNumber: match[3] ? Number(match[3]) : undefined,
            severity: match[4] === 'warning' ? 'warning' : match[4] === 'note' ? 'other' : 'error',
            message: match[5]
        });
    }
    return diagnostics;
}
function createLogResult(records, enabled) {
    return enabled
        ? {
            logRecords: records,
            logs: records.map((record) => record.message)
        }
        : {};
}
async function resolveRuntimeLocation(options) {
    const maxAssetBytes = resolveMaxAssetBytes(options.maxAssetBytes);
    const runtimeBaseUrl = options.runtimeBaseUrl !== undefined
        ? resolveRuntimeBaseUrl(options.runtimeBaseUrl)
        : resolveRuntimeBaseUrlFromManifestUrl(options.manifestUrl);
    const manifestUrl = options.manifestUrl || resolveRuntimeManifestUrl(runtimeBaseUrl);
    const manifest = options.manifest ||
        (await loadRuntimeManifest(manifestUrl, options.fetchImpl || fetch, options.signal, Math.min(maxAssetBytes, DEFAULT_MAX_RUNTIME_JSON_BYTES)));
    return { manifest, maxAssetBytes, runtimeBaseUrl };
}
export async function preloadBrowserClangRuntime(options) {
    if (options.signal?.aborted)
        throw options.signal.reason;
    const { manifest, maxAssetBytes, runtimeBaseUrl } = await resolveRuntimeLocation(options);
    const runtime = new Runtime({
        stdin: () => '',
        stdout: () => { },
        progress: () => { },
        signal: options.signal,
        log: false,
        maxAssetBytes,
        runtimeBaseUrl,
        manifest
    });
    await runtime.ready;
}
export async function compileClang(request, options) {
    if (options.signal?.aborted)
        throw options.signal.reason;
    if (!request.code || typeof request.code !== 'string') {
        return {
            success: false,
            stderr: 'wasm-clang requires a non-empty source string'
        };
    }
    if (request.target && request.target !== 'wasm32-wasi') {
        return {
            success: false,
            stderr: `unsupported wasm-clang target: ${request.target}`
        };
    }
    const enabledLogs = request.log ?? options.log ?? false;
    const debugMode = resolveDebugMode(request);
    const logRecords = [];
    const compilerOutput = [];
    emitProgress(request, 'bootstrap', 0, 'loading runtime manifest');
    const { manifest, maxAssetBytes, runtimeBaseUrl } = await resolveRuntimeLocation(options);
    pushRecord(logRecords, enabledLogs, '[wasm-clang] runtime manifest loaded');
    let lastPercent = 0;
    const runtimeOptions = {
        stdin: () => '',
        stdout: (chunk) => compilerOutput.push(chunk),
        progress: (value) => {
            const percent = Math.round(Math.max(lastPercent, value * 100));
            lastPercent = percent;
            const stage = percent < 34 ? 'bootstrap' : percent < 90 ? 'compile' : 'link';
            emitProgress(request, stage, percent, stage === 'link'
                ? 'linking wasm module'
                : stage === 'compile'
                    ? 'compiling source'
                    : 'loading runtime');
        },
        log: enabledLogs,
        maxAssetBytes,
        signal: options.signal,
        showTiming: request.showTiming ?? options.showTiming ?? false,
        runtimeBaseUrl,
        manifest
    };
    const runtime = new Runtime(runtimeOptions);
    try {
        await runtime.ready;
        pushRecord(logRecords, enabledLogs, '[wasm-clang] runtime ready');
        const builtArtifact = await runtime.compileArtifact(request.code, {
            language: request.language || 'CPP',
            fileName: request.fileName,
            activePath: request.activePath,
            workspaceFiles: request.workspaceFiles || [],
            compileArgs: request.compileArgs || [],
            debugMode,
            breakpoints: request.breakpoints,
            pauseOnEntry: request.pauseOnEntry,
            cppVersion: request.cppVersion,
            cVersion: request.cVersion
        });
        const output = compilerOutput.join('');
        const diagnostics = extractCompilerDiagnostics(output);
        const artifact = builtArtifact;
        emitProgress(request, 'done', 100, 'done');
        return {
            success: true,
            artifact,
            stdout: output,
            ...(diagnostics.length ? { diagnostics } : {}),
            ...createLogResult(logRecords, enabledLogs)
        };
    }
    catch (error) {
        if (options.signal?.aborted)
            throw options.signal.reason;
        pushRecord(logRecords, enabledLogs, error instanceof Error ? error.message : String(error), 'error');
        const output = compilerOutput.join('');
        const diagnostics = extractCompilerDiagnostics(output);
        return {
            success: false,
            stdout: output,
            stderr: output || (error instanceof Error ? error.message : String(error)),
            ...(diagnostics.length ? { diagnostics } : {}),
            ...createLogResult(logRecords, enabledLogs)
        };
    }
}
export async function createClangCompiler(options) {
    return {
        compile: (request) => compileClang(request, options)
    };
}
