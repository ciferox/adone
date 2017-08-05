declare namespace adone {
    const _null: Symbol;
    export { _null as null };
    export const noop: () => void;
    export const identity: <T>(x: T) => T;
    export const truly: () => true;
    export const falsely: () => false;
    export const ok: "OK";
    export const bad: "BAD";
    export const exts: [".js", ".tjs", ".ajs"];
    export const log: (...args: any[]) => void;
    export const fatal: (...args: any[]) => void;
    export const error: (...args: any[]) => void;
    export const warn: (...args: any[]) => void;
    export const info: (...args: any[]) => void;
    export const debug: (...args: any[]) => void;
    export const trace: (...args: any[]) => void;
    export const o: (...props: any[]) => object;
    export const Date: typeof global.Date;
    export const hrtime: typeof process.hrtime;
    export const setTimeout: typeof global.setTimeout
    export const setInterval: typeof global.setInterval;
    export const setImmediate: typeof global.setImmediate;
    export const clearTimeout: typeof global.clearTimeout;
    export const clearInterval: typeof global.clearInterval;
    export const clearImmediate: typeof global.clearImmediate;
    interface LazifyOptions {
        configurable: boolean = false;
    }
    export const lazify: (modules: object, obj?: object = {}, require?: Function, options?: LazifyOptions) => object;
    interface Tag {
        set(Class: object, tag: string): void;
        has(obj: object, tag: string): void;
        define(tag: string, predicate?: string): void;
        SUBSYSTEM: Symbol;
        SUBSYSTEM: Symbol;
        APPLICATION: Symbol;
        TRANSFORM: Symbol;
        CORE_STREAM: Symbol;
        LOGGER: Symbol;
        LONG: Symbol;
        BIGNUMBER: Symbol;
        EXBUFFER: Symbol;
        EXDATE: Symbol;
        CONFIGURATION: Symbol;
        GENESIS_NETRON: Symbol;
        GENESIS_PEER: Symbol;
        NETRON: Symbol;
        NETRON_PEER: Symbol;
        NETRON_ADAPTER: Symbol;
        NETRON_DEFINITION: Symbol;
        NETRON_DEFINITIONS: Symbol;
        NETRON_REFERENCE: Symbol;
        NETRON_INTERFACE: Symbol;
        NETRON_STUB: Symbol;
        NETRON_REMOTESTUB: Symbol;
        NETRON_STREAM: Symbol;
        FAST_STREAM: Symbol;
        FAST_FS_STREAM: Symbol;
        FAST_FS_MAP_STREAM: Symbol;
    }
    export const tag: Tag;
    export const run: (App: object, ignoreArgs: boolean = false) => Promise<void>;
    export const bind: (libName: string) => object;
    export const getAssetAbsolutePath: (relPath: string) => string;
    export const loadAsset: (relPath) => string | NodeBuffer;
    export const require: (path: string) => object;
    export const package: object;
}

module "adone" {
    export = adone;
}
