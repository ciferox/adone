declare namespace adone.util {
    interface Arrify {
        <T>(val: T[]): T[];
        <T>(val: T): [T];
    }
    export const arrify: Arrify;
    export const slice: <T>(args: T[], sliceStart?: number = 0, sliceEnd?: number = args.length) => T[];
    export const spliceOne: (list: any[], index: number) => void;
    export const normalizePath: (str: string, stripTrailing: boolean = false) => string;
    export const unixifyPath: (filePath: string, unescape: boolean = false) => string;
    export const functionName: (fn: Function) => string;
    export const mapArguments: (argmap: any) => Function;
    interface ParseMsResult {
        days: number;
        hours: number;
        minutes: number;
        seconds: number;
        milliseconds: number;
    }
    export const parseMs: (ms: number) => ParseMsResult;
    export const pluralizeWord: (str: string, plural?: string, count?: number) => string;
    export const functionParams: (func: Function) => string[];
    export const randomChoice: <T>(arrayLike: ArrayLike<T>, from?: number = 0, to?: number = arrayLike.length) => T;
    export const shuffleArray: <T>(array: T[]) => T[];
    export const enumerate: <T>(iterable: Iterable<T>, start?: number = 0) => IterableIterator<[number, T]>;
    interface Zip {
        <T1, T2>(a: Iterable<T1>, b: Iterable<T2>): IterableIterator<[T1, T2]>
        <T1, T2, T3>(a: Iterable<T1>, b: Iterable<T2>, c: Iterable<T3>): IterableIterator<[T1, T2, T3]>
        <T1, T2, T3, T4>(a: Iterable<T1>, b: Iterable<T2>, c: Iterable<T3>, d: Iterable<T4>): IterableIterator<[T1, T2, T3, T4]>
        (...iterables: Iterable[]): IterableIterator<any[]>
    }
    export const zip: Zip;
    interface KeysOptions {
        onlyEnumerable: boolean = true;
        followProto: boolean = false;
        all: boolean = false;
    }
    export const keys: (object: object, options?: KeysOptions = {}) => string[];
    export const values: (object: object, options?: KeysOptions = {}) => any[];
    export const entries: (object: object, options?: KeysOptions = {}) => [string, any][];
    export const toDotNotation: (object: object) => object;
    interface FlattenOptions {
        depth: number = 1;
    }
    export const flatten: (array: any[], options: FlattenOptions) => any[];
    export const globParent: (str: string) => string;
    export const by: (by: Function, compare?: Function) => Function;
    export const toFastProperties = (object: object) => object;
    export const stripBom: (x: string) => string;
    interface SortKeysOptions {
        deep: boolean = false;
        compare?: Function
    }
    export const sortKeys: (object: object, options?: SortKeysOptions = {}) => object;
    interface GlobizeOptions {
        exts: string = "";
        recursively: boolean = false;
    }
    export const globize: (path: string, options: GlobizeOptions) => string;
    export const unique = <T>(array: T[], projection?: Function) => T[];
    export const invertObject: (source: object, options: KeysOptions) => object;
    interface HumanizeTimeOptions {
        msDecimalDigits: number = 0;
        secDecimalDigits: number = 1;
        verbose: boolean = false;
        compact: boolean = false;
    }
    export const humanizeTime: (ms: number, options: HumanizeTimeOptions) => string;
    export const humanizeSize: (num: number, space: string = "") => string;
    export const parseSize = (str: string) => number | null;
    interface CloneOptions {
        deep: boolean = true;
    }
    export const clone: (object: object, options: CloneOptions) => object;
    export const toUTF8Array: (str: string) => number[];
    export const asyncIter: (array: any[], iter: Function, cb: Function) => void;
    export const asyncFor: (obj: object, iter: Function, cb: Function) => void;
    interface OnceOptions {
        silent: boolean = true;
    }
    export const once: <T>(fn: (...args) => T, options?: OnceOptions = {}) => (...args) => T;
    export const asyncWaterfall: <T>(tasks: any[], callback?: Function = adone.noop) => void;
    export const xrange: (start?: number, stop?: number, step?: number = 1) => IterableIterator<number>;
    export const range: (start?: number, stop?: number, step?: number = 1) => number[];
    export const reFindAll: (regexp: RegExp, str: string) => RegExpExecArray[];
    export const assignDeep: <T>(target: T, ...sources: object[]) => T;
    interface MatchOptions {
        index: boolean = false;
        start: number = 0;
        end?: number;
        dot: boolean = false;
    }
    interface Match {
        (criteria: any | any[]): (value: any | any[], opts: MatchOptions) => number | boolean;
        (criteria: any | any[], options: MatchOptions): (value: any | any[], opts: MatchOptions) => number | boolean;
        (criteria: any | any[], value: any | any[], options: MatchOptions): number | boolean;
    }
    export const match: Match;
    export const toposort: (array: any[]) => any[]; // TODO
    interface JSEscOptions {
        escapeEverything: boolean = false,
        minimal: boolean =false,
        isScriptContext: boolean = false,
        quotes: string = "single",
        wrap: boolean = false,
        es6: boolean = false,
        json: boolean = false,
        compact: boolean = true,
        lowercaseHex: boolean = false,
        numbers: string = "decimal",
        indent: string = "\t",
        indentLevel: number = 0,
        __inline1__: boolean = false,
        __inline2__: boolean = false
    }
    export const jsesc: (argument: any, options: JSEscOptions) => string;
    export const typeOf: (obj: any) => string;
    namespace memcpy {
        export const utou: (target: Buffer, targetOffset: number, source: Buffer, sourceStart: number, sourceEnd: number) => number;
        export const atoa: (target: ArrayBuffer, targetOffset: number, source: ArrayBuffer, sourceStart: number, sourceEnd: number) => number;
        export const atou: (target: Buffer, targetOffset: number, source: ArrayBuffer, sourceStart: number, sourceEnd: number) => number;
        export const utoa: (target: ArrayBuffer, targetOffset: number, source: Buffer, sourceStart: number, sourceEnd: number) => number;
        export const copy: (target: Buffer | ArrayBuffer, targetOffset: number, source: Buffer | ArrayBuffer, sourceStart: number, sourceEnd: number) => number;
    }
    namespace uuid {
        interface V1Options {
            clockseq?: number;
            msecs?: number;
            nsecs?: number;

        }
        interface V1 {
            (options: V1Options = {}): string;
            (options: V1Options = {}, buf: any[], offset?: number = 0): number[];
        }
        export const v1: V1;

        interface V4 {
            (options?: any): string
            (options: any, buf: array[]): number[];
        }
        export const v4: V4;

        interface V5 {
            (name: string | number[], namespace: string | number[]): string;
            (name: string | number[], namespace: string | number[], buf: any[], offset?: number = 0): number[];
        }
        export const v5: V5;
    }

    interface Delegator {
        method(name: string): Delegator;
        access(name: string): Delegator;
        getter(name: string): Delegator;
        setter(name: string): Delegator;
    }
    export const delegate: (object: object, property: string) => Delegator;


    interface GlobExpOptions {

    }
    export class GlobExp {
        constructor(pattern: string, options?: GlobExpOptions = {});

        hasMagic(): boolean;

        static hasMagic(pattern: string, options?: GlobExpOptions = {}): boolean;

        expandBraces(): string[];

        static expandBraces(pattern: string, options?: GlobExpOptions = {}): string[];

        parse(pattern: string): RegExp;

        makeRe(): RegExp;

        static makeRe(pattern: string, options: GlobExpOptions): RegExp;

        static test(p: string, pattern: string, options?: GlobExpOptions = {}): boolean;

        test(p: string): boolean;
    }
    namespace iconv {
        // TODO
    }
    namespace sqlstring {
        export const escapeId: (val: string | string[], forbidQualified?: boolean = false) => string;
        export const dateToString: (date: any, timeZone?: string) => string;
        export const arrayToList: (array: any[]) => string;
        export const bufferToString: (buffer: Buffer) => string;
        export const objectToValues: (object: object, timeZone: string) => string;
        export const escape: (value: any, stringifyObjects?: boolean = false, timeZone?: string) => string;
        export const format: (sql: string, values?: any | any[], stringifyObjects?: boolean = false, timeZone?: string) => string;
    }
    interface EditorOptions {
        text: string = "";
        editor?: string;
        path?: string;
        ext: string = ""
    }
    export class Editor {
        static DEFAULT: string;

        constructor(options: EditorOptions);

        spawn(): Promise<adone.std.child_process.ChildProcess>;

        run(): Promise<string>;

        cleanup(): Promise<void>;

        static edit(options: EditorOptions): Promise<string>;
    }

    interface BinarySearch {
        <T>(aHaystack: T[], aNeedle: number, aLow: number = -1, aHigh: number = aHaystack.length, aCompare?: Function, aBias: BinarySearch.GREATEST_LOWER_BOUND): T;
        GREATEST_LOWER_BOUND: number;
        LEAST_UPPER_BOUND: number;
    }
    export const binarySearch: BinarySearch;
    namespace buffer {
        export const concat: (list: Buffer[], totalLength: number) => Buffer;
        export const mask: (buffer: Buffer, mask: Buffer, output: Buffer, offset: number, length: number) => void;
        export const unmask: (buffer: Buffer, mask: Buffer) => void;
    }
    export const shebang: (str: string) => string | null;
    export class ReInterval {
        constructor(callback: Function, interval: number, args?: any[]);

        reschedule(interval: number): void;

        clear(): void;

        destroy(): void;
    }
    export class RateLimiter {
        constructor(tokensPerInterval?: number = 1, interval?: number = 1000, fireImmediately?: boolean = false);

        removeTokens(count: number): Promise<number>;

        tryRemoveTokens(count: number): boolean;

        getTokensRemaining(): number;
    }

    interface ThrottleOptions {
        max: number = 1;
        interval: number = 0;
        ordered: boolean = true;
        waitForReturn: boolean = true;
    }
    export const throttle: <T>(fn: (...args) => T, options: ThrottleOptions = {}) => (...args) => Promise<T>;
    // TODO fakeClock, ltgt
}

