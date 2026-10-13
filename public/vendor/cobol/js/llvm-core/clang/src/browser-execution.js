import { Directory, Fd, File, Inode, PreopenDirectory, WASI, wasi } from '../../../browser_wasi_shim/index.js';
function normalizeGuestPath(value) {
    const normalized = value.replace(/\\/g, '/');
    const absolute = normalized.startsWith('/') ? normalized : `/${normalized}`;
    const segments = [];
    for (const segment of absolute.split('/')) {
        if (!segment || segment === '.')
            continue;
        if (segment === '..') {
            throw new Error(`wasm-clang does not allow guest path traversal: ${value}`);
        }
        segments.push(segment);
    }
    return `/${segments.join('/')}`;
}
function toStandaloneBytes(value) {
    if (typeof value === 'string') {
        return new TextEncoder().encode(value);
    }
    return value instanceof Uint8Array ? new Uint8Array(value) : new Uint8Array(value);
}
export class CaptureFd extends Fd {
    ino = Inode.issue_ino();
    decoder = new TextDecoder();
    chunks = [];
    output;
    constructor(output) {
        super();
        this.output = output;
    }
    fd_filestat_get() {
        return {
            ret: wasi.ERRNO_SUCCESS,
            filestat: new wasi.Filestat(this.ino, wasi.FILETYPE_CHARACTER_DEVICE, 0n)
        };
    }
    fd_fdstat_get() {
        const fdstat = new wasi.Fdstat(wasi.FILETYPE_CHARACTER_DEVICE, 0);
        fdstat.fs_rights_base = BigInt(wasi.RIGHTS_FD_WRITE);
        return {
            ret: wasi.ERRNO_SUCCESS,
            fdstat
        };
    }
    fd_write(data) {
        const chunk = this.decoder.decode(data, { stream: true });
        this.chunks.push(chunk);
        this.output?.(chunk);
        return {
            ret: wasi.ERRNO_SUCCESS,
            nwritten: data.byteLength
        };
    }
    getText() {
        const trailing = this.decoder.decode();
        if (trailing) {
            this.chunks.push(trailing);
            this.output?.(trailing);
        }
        return this.chunks.join('');
    }
}
class BufferedExecutionInput {
    currentChunk = new Uint8Array(0);
    currentOffset = 0;
    readInput;
    constructor(readInput) {
        this.readInput = readInput;
    }
    read(size) {
        while (this.currentOffset >= this.currentChunk.length) {
            const nextChunk = this.readInput?.();
            if (nextChunk == null) {
                return new Uint8Array(0);
            }
            this.currentChunk = toStandaloneBytes(nextChunk);
            this.currentOffset = 0;
            if (this.currentChunk.byteLength === 0)
                continue;
        }
        const data = this.currentChunk.slice(this.currentOffset, this.currentOffset + size);
        this.currentOffset += data.byteLength;
        return data;
    }
}
class StdinFd extends Fd {
    ino = Inode.issue_ino();
    source;
    constructor(source) {
        super();
        this.source = source;
    }
    fd_filestat_get() {
        return {
            ret: wasi.ERRNO_SUCCESS,
            filestat: new wasi.Filestat(this.ino, wasi.FILETYPE_CHARACTER_DEVICE, 0n)
        };
    }
    fd_fdstat_get() {
        const fdstat = new wasi.Fdstat(wasi.FILETYPE_CHARACTER_DEVICE, 0);
        fdstat.fs_rights_base = BigInt(wasi.RIGHTS_FD_READ);
        return {
            ret: wasi.ERRNO_SUCCESS,
            fdstat
        };
    }
    fd_read(size) {
        return {
            ret: wasi.ERRNO_SUCCESS,
            data: this.source.read(size)
        };
    }
}
export function createBrowserWasiHost(options = {}) {
    const rootDirectory = new Directory(new Map());
    for (const file of options.files || []) {
        const guestPath = normalizeGuestPath(file.path);
        const segments = guestPath.slice(1).split('/');
        let directory = rootDirectory;
        for (const segment of segments.slice(0, -1)) {
            const existing = directory.contents.get(segment);
            if (existing instanceof Directory) {
                directory = existing;
                continue;
            }
            const nextDirectory = new Directory(new Map());
            directory.contents.set(segment, nextDirectory);
            directory = nextDirectory;
        }
        directory.contents.set(segments.at(-1), new File(toStandaloneBytes(file.contents)));
    }
    const stdin = new BufferedExecutionInput(options.stdin);
    const stdout = new CaptureFd(options.stdout);
    const stderr = new CaptureFd(options.stderr);
    const env = new Map([['PWD', '/']]);
    for (const [key, value] of Object.entries(options.env || {})) {
        env.set(key, value);
    }
    return {
        args: [options.programName || 'main.wasm', ...(options.args || [])],
        envEntries: Array.from(env.entries()).map(([key, value]) => `${key}=${value}`),
        rootDirectory,
        stdout,
        stderr,
        fds: [
            new StdinFd(stdin),
            stdout,
            stderr,
            new PreopenDirectory('/tmp', new Map()),
            new PreopenDirectory('/', rootDirectory.contents)
        ]
    };
}
export async function executeBrowserClangArtifact(artifact, options = {}) {
    if (artifact.target !== 'wasm32-wasi' || artifact.format !== 'wasi-core-wasm') {
        throw new Error('wasm-clang currently executes only wasm32-wasi preview1 core wasm artifacts.');
    }
    const host = createBrowserWasiHost({
        ...options,
        programName: options.programName || artifact.fileName
    });
    const wasiInstance = new WASI(host.args, host.envEntries, host.fds, { debug: false });
    const bytes = artifact.bytes instanceof Uint8Array
        ? new Uint8Array(artifact.bytes)
        : new Uint8Array(artifact.bytes);
    const module = artifact.wasm || (await WebAssembly.compile(bytes));
    const instanceRef = { current: null };
    const extraImports = typeof options.extraImports === 'function'
        ? await options.extraImports({ host, module, instance: instanceRef })
        : options.extraImports || {};
    const instance = await WebAssembly.instantiate(module, {
        ...extraImports,
        wasi_unstable: wasiInstance.wasiImport,
        wasi_snapshot_preview1: wasiInstance.wasiImport
    });
    instanceRef.current = instance;
    const exitCode = wasiInstance.start(instance);
    return {
        exitCode,
        stdout: host.stdout.getText(),
        stderr: host.stderr.getText()
    };
}
