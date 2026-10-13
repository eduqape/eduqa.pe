import Runtime from '../runtime.js';
import { BrowserClangDebugController } from './controller.js';
export class BrowserClangDebugDriver {
    runtime;
    controller;
    constructor(runtime, controller) {
        this.runtime = runtime;
        this.controller = controller;
    }
    get breakpoints() {
        return this.controller.breakpoints;
    }
    setBreakpoints(lines) {
        this.controller.setBreakpoints(lines);
    }
    resume() {
        this.controller.resume();
    }
    stepInto() {
        this.controller.stepInto();
    }
    nextLine() {
        this.controller.nextLine();
    }
    stepOut() {
        this.controller.stepOut();
    }
    evaluate(expression, timeoutMs) {
        return this.controller.evaluate(expression, timeoutMs);
    }
    interrupt() {
        this.controller.interrupt();
    }
    clear() {
        this.controller.clear();
    }
    async run(request) {
        const { code, breakpoints, pauseOnEntry, ...runtimeOptions } = request;
        await this.runtime.compileLinkRun(code, {
            ...runtimeOptions,
            ...this.controller.createRuntimeRunOptions({
                breakpoints,
                pauseOnEntry
            })
        });
    }
}
export async function createBrowserClangDebugDriver(options) {
    const runtime = new Runtime(options);
    await runtime.ready;
    const controller = new BrowserClangDebugController(options);
    return new BrowserClangDebugDriver(runtime, controller);
}
