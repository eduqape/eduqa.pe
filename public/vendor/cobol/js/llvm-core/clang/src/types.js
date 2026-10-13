export function resolveDebugMode(options) {
    if (options.debugMode !== undefined) {
        if (options.debugMode === 'none' ||
            options.debugMode === 'trace' ||
            options.debugMode === 'lldb') {
            return options.debugMode;
        }
        throw new Error(`unsupported wasm-clang debug mode: ${String(options.debugMode)}`);
    }
    return options.debug ? 'trace' : 'none';
}
