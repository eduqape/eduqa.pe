import Runtime from './runtime.js';
import { resolveDebugMode } from './types.js';
import { normalizeWorkspacePath } from './workspace.js';
import { IncrementalCompilationCache, incrementalArgumentsEligible } from './incremental-compilation.js';
/**
 * Explicit opt-in runtime for browser experiments; the default runtime is unchanged.
 * The compiler, linker, asset-integrity, existing PCH and debugging implementations
 * remain the real inherited implementations. Only eligible object invocations are intercepted.
 */
export default class ExperimentalIncrementalClangRuntime extends Runtime {
    objects;
    cacheSignal;
    compilerIds = new WeakMap();
    nextCompilerId = 0;
    compilation;
    constructor(options) {
        // Validate budgets before starting the inherited asynchronous runtime startup.
        const objects = new IncrementalCompilationCache(options.objectCache);
        super(options);
        this.objects = objects;
        this.cacheSignal = options.signal;
    }
    get incrementalCompilationStats() {
        return this.objects.stats;
    }
    clearIncrementalCompilationCache() {
        this.objects.clear();
    }
    // Never let a failed rebuild make the inherited whole-build cache return an older program.
    async compileLink(code, options = {}) {
        try {
            return await super.compileLink(code, options);
        }
        catch (error) {
            this.lastBuildKey = '';
            this.wasm = undefined;
            throw error;
        }
    }
    async compile(options) {
        if (this.compilation)
            throw new Error('Concurrent Clang compilations are unsupported');
        const input = normalizeWorkspacePath(options.input || 'main.cc') || 'main.cc';
        const args = options.compileArgs ?? options.args ?? [];
        const safePaths = [input, options.obj, ...(options.workspaceFiles ?? []).map((file) => normalizeWorkspacePath(file.path))]
            .every((path) => typeof path === 'string' && !path.replace(/^\/+/, '').startsWith('__wasm_idle_build/incremental'));
        const eligible = resolveDebugMode(options) === 'none' &&
            (options.language === undefined || options.language === 'C' || options.language === 'CPP') &&
            typeof options.transformSource !== 'function' && !options.planPrecompiledHeaderOnly &&
            Array.isArray(args) && incrementalArgumentsEligible(args) && safePaths;
        if (!eligible)
            return super.compile(options);
        this.compilation = { input, object: options.obj };
        try {
            return await super.compile(options);
        }
        finally {
            this.compilation = undefined;
        }
    }
    async run(module, out, ...args) {
        const context = this.compilation;
        if (!context || !out || args[0] !== 'clang' || !args.includes('-emit-obj') ||
            args.includes('-include-pch') || module !== this.moduleCache[this.assetUrls.clang]) {
            return super.run(module, out, ...args);
        }
        let compilerIdentity = this.compilerIds.get(module);
        if (!compilerIdentity) {
            compilerIdentity = `runtime-module-${++this.nextCompilerId}`;
            this.compilerIds.set(module, compilerIdentity);
        }
        return this.objects.compile({
            signal: this.cacheSignal,
            read: (path) => this.memfs.getFileContents(path.replace(/^\/+/, '')),
            write: (path, bytes) => {
                this.addWorkspaceDirectories(path);
                this.memfs.addFile(path, bytes);
            },
            replay: (diagnostics) => {
                this.memfs.out = out;
                if (out && diagnostics)
                    this.memfs.stdout(diagnostics);
            },
            execute: async (invocation, emit) => {
                const stdout = this.memfs.stdout;
                let diagnostics = '';
                let complete = true;
                this.memfs.stdout = (chunk) => {
                    if (diagnostics.length + chunk.length <= 128 * 1024)
                        diagnostics += chunk;
                    else
                        complete = false;
                    if (emit)
                        stdout(chunk);
                };
                try {
                    const value = await super.run(module, true, ...invocation);
                    return { value, diagnostics, cacheable: complete && value === null };
                }
                finally {
                    this.memfs.stdout = stdout;
                }
            }
        }, args, context.input, context.object, compilerIdentity);
    }
}
