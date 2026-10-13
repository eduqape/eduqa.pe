const SEQUENCE_INDEX = 0;
const LENGTH_INDEX = 1;
const HEADER_BYTES = Int32Array.BYTES_PER_ELEMENT * 2;
const EOF_LENGTH = -1;
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const controlViewOf = (buffer) => buffer instanceof Int32Array ? buffer : new Int32Array(buffer);
const payloadViewOf = (control) => new Uint8Array(control.buffer, control.byteOffset + HEADER_BYTES, control.byteLength - HEADER_BYTES);
const splitChunk = (input, maxBytes) => {
    const encoded = encoder.encode(input);
    if (encoded.length <= maxBytes) {
        return { bytes: encoded, rest: '' };
    }
    let left = 0;
    let right = input.length;
    while (left < right) {
        const middle = Math.ceil((left + right) / 2);
        if (encoder.encode(input.slice(0, middle)).length <= maxBytes) {
            left = middle;
        }
        else {
            right = middle - 1;
        }
    }
    const chunk = input.slice(0, left);
    return {
        bytes: encoder.encode(chunk),
        rest: input.slice(left)
    };
};
export const flushQueuedStdin = (queue, buffer) => {
    if (!queue.length)
        return false;
    const control = controlViewOf(buffer);
    const payload = payloadViewOf(control);
    const next = queue[0] || '';
    const { bytes, rest } = splitChunk(next, payload.length);
    payload.fill(0);
    payload.set(bytes);
    Atomics.store(control, LENGTH_INDEX, bytes.length);
    Atomics.add(control, SEQUENCE_INDEX, 1);
    Atomics.notify(control, SEQUENCE_INDEX);
    if (rest) {
        queue[0] = rest;
    }
    else {
        queue.shift();
    }
    return true;
};
export const readBufferedStdin = (buffer) => {
    const control = controlViewOf(buffer);
    const length = Atomics.load(control, LENGTH_INDEX);
    if (length === EOF_LENGTH)
        return null;
    const payload = payloadViewOf(control);
    return decoder.decode(payload.slice(0, length));
};
export const bufferedSequence = (buffer) => Atomics.load(controlViewOf(buffer), SEQUENCE_INDEX);
export const waitForBufferedSequenceChange = (buffer, sequence, timeoutMs = 5000) => new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const poll = () => {
        if (bufferedSequence(buffer) !== sequence) {
            resolve(readBufferedStdin(buffer));
            return;
        }
        if (Date.now() - startedAt >= timeoutMs) {
            reject(new Error('Timed out waiting for buffered value'));
            return;
        }
        setTimeout(poll, 10);
    };
    poll();
});
export const flushBufferedEof = (buffer) => {
    const control = controlViewOf(buffer);
    const payload = payloadViewOf(control);
    payload.fill(0);
    Atomics.store(control, LENGTH_INDEX, EOF_LENGTH);
    Atomics.add(control, SEQUENCE_INDEX, 1);
    Atomics.notify(control, SEQUENCE_INDEX);
};
export const waitForBufferedStdin = (buffer, requestInput) => {
    const sequence = Atomics.load(buffer, SEQUENCE_INDEX);
    requestInput();
    while (true) {
        const result = Atomics.wait(buffer, SEQUENCE_INDEX, sequence, 100);
        if (result === 'not-equal') {
            return readBufferedStdin(buffer);
        }
    }
};
export const resetBufferedStdin = (buffer) => {
    const control = controlViewOf(buffer);
    const payload = payloadViewOf(control);
    payload.fill(0);
    Atomics.store(control, SEQUENCE_INDEX, 0);
    Atomics.store(control, LENGTH_INDEX, 0);
};
