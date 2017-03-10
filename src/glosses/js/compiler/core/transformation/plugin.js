// @flow


const { is, js: { compiler: { messages, traverse } }, vendor: { lodash: _ } } = adone;
import Store from "../store";

const GLOBAL_VISITOR_PROPS = ["enter", "exit"];

export default class Plugin extends Store {
    constructor(plugin: Object, key?: string) {
        super();

        this.initialized = false;
        this.raw = Object.assign({}, plugin);
        this.key = this.take("name") || key;

        this.manipulateOptions = this.take("manipulateOptions");
        this.post = this.take("post");
        this.pre = this.take("pre");
        this.visitor = this.normaliseVisitor(_.clone(this.take("visitor")) || {});
    }

    initialized: boolean;
    raw: Object;
    manipulateOptions: ?Function;
    post: ?Function;
    pre: ?Function;
    visitor: Object;

    take(key) {
        const val = this.raw[key];
        delete this.raw[key];
        return val;
    }

    chain(target, key) {
        if (!target[key]) {
            return this[key];
        }
        if (!this[key]) {
            return target[key];
        }

        const fns: ?Function[] = [target[key], this[key]];

        return function (...args) {
            let val;
            for (const fn of fns) {
                if (fn) {
                    const ret = fn.apply(this, args);
                    if (is.exist(ret)) {
                        val = ret;
                    }
                }
            }
            return val;
        };
    }

    maybeInherit(loc: string) {
        let inherits = this.take("inherits");
        if (!inherits) {
            return;
        }

        inherits = adone.js.compiler.transformation.file.OptionManager.normalisePlugin(inherits, loc, "inherits");

        this.manipulateOptions = this.chain(inherits, "manipulateOptions");
        this.post = this.chain(inherits, "post");
        this.pre = this.chain(inherits, "pre");
        this.visitor = traverse.visitors.merge([inherits.visitor, this.visitor]);
    }

    /**
     * We lazy initialise parts of a plugin that rely on contextual information such as
     * position on disk and how it was specified.
     */

    init(loc: string, i: number) {
        if (this.initialized) {
            return;
        }
        this.initialized = true;

        this.maybeInherit(loc);

        for (const key in this.raw) {
            throw new Error(messages.get("pluginInvalidProperty", loc, i, key));
        }
    }

    normaliseVisitor(visitor: Object): Object {
        for (const key of GLOBAL_VISITOR_PROPS) {
            if (visitor[key]) {
                throw new Error("Plugins aren't allowed to specify catch-all enter/exit handlers. Please target individual nodes.");
            }
        }

        traverse.explode(visitor);
        return visitor;
    }
}
