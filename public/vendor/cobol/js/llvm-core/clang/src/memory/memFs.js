import CoreMemFS from '../../../core/src/memfs.js';
import { memfsUrl } from '../url.js';
export default class MemFS extends CoreMemFS {
    constructor(options) {
        const { memfsModuleUrl, path, ...coreOptions } = options;
        super({
            ...coreOptions,
            moduleUrl: memfsModuleUrl || memfsUrl(path)
        });
    }
}
