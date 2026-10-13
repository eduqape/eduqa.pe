import { readOct, readStr } from './encode.js';
function* readEntry(buffer) {
    const u8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let offset = 0;
    let nextFilename = '';
    const str = (len) => {
        offset += len;
        return readStr(u8, offset - len, len);
    }, oct = (len) => {
        offset += len;
        return readOct(u8, offset - len, len);
    }, align = () => (offset = (offset + 511) & ~511);
    while (offset + 512 <= u8.length) {
        const entryInit = {
            filename: str(100),
            mode: oct(8),
            owner: oct(8),
            group: oct(8),
            size: oct(12),
            mtime: oct(12),
            checksum: oct(8),
            type: str(1),
            linkname: str(100),
            ustar: str(8)
        };
        if (!entryInit.ustar)
            return;
        const entry = {
            ...entryInit,
            ownerName: str(32),
            groupName: str(32),
            devMajor: str(8),
            devMinor: str(8),
            filenamePrefix: str(155)
        };
        align();
        if (entry.size > 0 || entry.type === '0' || entry.type === '' || entry.type === 'L') {
            const contents = u8.subarray(offset, offset + entry.size);
            entry.contents = contents;
            offset += entry.size;
            align();
        }
        if (entry.type === 'L') {
            if (entry.contents)
                nextFilename = readStr(entry.contents, 0, entry.size);
            continue;
        }
        entry.filename =
            nextFilename ||
                (entry.filenamePrefix ? `${entry.filenamePrefix}/${entry.filename}` : entry.filename);
        nextFilename = '';
        yield entry;
    }
}
export default function untar(buffer, memfs) {
    for (const entry of readEntry(buffer)) {
        switch (entry.type) {
            case '': // Regular file.
            case '0': // Regular file.
                memfs.addFile(entry.filename, entry.contents);
                break;
            case '5': // Folder.
                memfs.addDirectory(entry.filename);
                break;
            default:
                throw new Error(`unsupported tar entry type: ${entry.type}`);
        }
    }
}
