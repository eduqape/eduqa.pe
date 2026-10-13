export const resolveHostedRuntimeUrl = (value, label) => {
    const href = value?.toString().trim();
    if (!href) {
        throw new Error(`${label} is required`);
    }
    let resolved;
    try {
        resolved = new URL(href, typeof location !== 'undefined' ? location.href : undefined);
    }
    catch {
        throw new Error(`${label} must be an absolute HTTP(S) URL`);
    }
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') {
        throw new Error(`${label} must use HTTP(S)`);
    }
    return resolved;
};
export const normalizeBaseUrl = (prefix) => {
    const resolved = resolveHostedRuntimeUrl(prefix, 'wasm-clang runtime base URL');
    if (!resolved.pathname.endsWith('/'))
        resolved.pathname += '/';
    resolved.hash = '';
    return resolved;
};
export const resolveVersionedAssetUrl = (prefix, assetPath) => new URL(assetPath, normalizeBaseUrl(prefix)).toString();
const resolveRuntimeAssetUrl = (prefix, assetPath) => resolveVersionedAssetUrl(prefix, assetPath);
export const resolveRuntimeBaseUrl = (prefix) => normalizeBaseUrl(prefix).toString();
export const resolveRuntimeBaseUrlFromManifestUrl = (manifestUrl) => normalizeBaseUrl(new URL('./', resolveHostedRuntimeUrl(manifestUrl, 'wasm-clang runtime manifest URL'))).toString();
export const runtimeManifestUrl = (prefix) => resolveRuntimeAssetUrl(prefix, 'runtime-manifest.v1.json');
export const memfsUrl = (prefix) => resolveRuntimeAssetUrl(prefix, 'bin/memfs.wasm.gz');
export const clangUrl = (prefix) => resolveRuntimeAssetUrl(prefix, 'bin/clang.wasm.gz');
export const lldUrl = (prefix) => resolveRuntimeAssetUrl(prefix, 'bin/lld.wasm.gz');
export const rootUrl = (prefix) => resolveRuntimeAssetUrl(prefix, 'bin/sysroot.tar.gz');
export const clangdJsUrl = (prefix) => resolveRuntimeAssetUrl(prefix, 'clangd/clangd.js');
export const clangdWasmUrl = (prefix) => resolveRuntimeAssetUrl(prefix, 'clangd/clangd.wasm.gz');
