import { readStr, readStrR } from './encode.js';
export default class Memory {
    memory;
    view;
    buffer;
    u8;
    u32;
    constructor(memory) {
        this.memory = memory;
        this.buffer = memory.buffer;
        this.view = new DataView(this.buffer);
        this.u8 = new Uint8Array(this.buffer);
        this.u32 = new Uint32Array(this.buffer);
    }
    check() {
        if (this.buffer.byteLength === 0) {
            this.buffer = this.memory.buffer;
            this.view = new DataView(this.buffer);
            this.u8 = new Uint8Array(this.buffer);
            this.u32 = new Uint32Array(this.buffer);
        }
    }
    read8(o) {
        return this.u8[o];
    }
    read32(o) {
        return this.u32[o >> 2];
    }
    readInt32(o) {
        return this.view.getInt32(o, true);
    }
    readFloat32(o) {
        return this.view.getFloat32(o, true);
    }
    readFloat64(o) {
        return this.view.getFloat64(o, true);
    }
    readStr(o, len) {
        return readStr(this.u8, o, len);
    }
    readStrR(o, len) {
        return readStrR(this.u8, o, len);
    }
    write8(o, v) {
        this.u8[o] = v;
    }
    write32(o, v) {
        this.u32[o >> 2] = v;
    }
    write64(o, vlo, vhi = 0) {
        this.write32(o, vlo);
        this.write32(o + 4, vhi);
    }
    writeStr(o, str) {
        o += this.write(o, str);
        this.write8(o, 0);
        return str.length + 1;
    }
    writeUint8(o, arr) {
        new Uint8Array(this.buffer, o, arr.length).set(arr);
        return arr.length;
    }
    write(o, buf) {
        if (buf instanceof ArrayBuffer)
            return this.writeUint8(o, new Uint8Array(buf));
        if (buf instanceof SharedArrayBuffer)
            return this.writeUint8(o, new Uint8Array(buf));
        else if (typeof buf === 'string')
            return this.writeUint8(o, buf.split('').map((x) => x.charCodeAt(0)));
        else
            return this.writeUint8(o, buf);
    }
}
