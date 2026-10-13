const clamp = (value) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
export function createCombinedProgress(report) {
    const state = {
        clang: 0,
        lld: 0,
        memfs: 0
    };
    const emit = () => {
        // Runtime readiness only depends on Clang and the filesystem. The linker is deliberately
        // loaded later, in parallel with source compilation, and must not hold startup progress
        // below 100%.
        report((state.clang + state.memfs) / 2);
    };
    const createSink = (key) => ({
        set(value) {
            state[key] = clamp(value);
            emit();
        }
    });
    return {
        clang: createSink('clang'),
        lld: createSink('lld'),
        memfs: createSink('memfs')
    };
}
