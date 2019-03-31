const {
    is,
    js: { compiler: { types: t, generate: generator } }
} = adone;

import type { HubInterface } from "../hub";
import type TraversalContext from "../context";
import * as virtualTypes from "./lib/virtual-types";
import traverse from "../index";
import Scope from "../scope";
import { path as pathCache } from "../cache";

// NodePath is split across many files.
import * as NodePath_ancestry from "./ancestry";
import * as NodePath_inference from "./inference";
import * as NodePath_replacement from "./replacement";
import * as NodePath_evaluation from "./evaluation";
import * as NodePath_conversion from "./conversion";
import * as NodePath_introspection from "./introspection";
import * as NodePath_context from "./context";
import * as NodePath_removal from "./removal";
import * as NodePath_modification from "./modification";
import * as NodePath_family from "./family";
import * as NodePath_comments from "./comments";

export default class NodePath {
    constructor(hub: HubInterface, parent: Object) {
        this.parent = parent;
        this.hub = hub;
        this.contexts = [];
        this.data = Object.create(null);
        this.shouldSkip = false;
        this.shouldStop = false;
        this.removed = false;
        this.state = null;
        this.opts = null;
        this.skipKeys = null;
        this.parentPath = null;
        this.context = null;
        this.container = null;
        this.listKey = null;
        this.inList = false;
        this.parentKey = null;
        this.key = null;
        this.node = null;
        this.scope = null;
        this.type = null;
        this.typeAnnotation = null;
    }

    parent: Object;

    hub: HubInterface;

    contexts: Array<TraversalContext>;

    data: Object;

    shouldSkip: boolean;

    shouldStop: boolean;

    removed: boolean;

    state: any;

    opts: ?Object;

    skipKeys: ?Object;

    parentPath: ?NodePath;

    context: TraversalContext;

    container: ?Object | Array<Object>;

    listKey: ?string;

    inList: boolean;

    parentKey: ?string;

    key: ?string;

    node: ?Object;

    scope: Scope;

    type: ?string;

    typeAnnotation: ?Object;

    static get({ hub, parentPath, parent, container, listKey, key }): NodePath {
        if (!hub && parentPath) {
            hub = parentPath.hub;
        }

        if (!parent) {
            throw new Error("To get a node path the parent needs to exist");
        }

        const targetNode = container[key];

        const paths = pathCache.get(parent) || [];
        if (!pathCache.has(parent)) {
            pathCache.set(parent, paths);
        }

        let path;

        for (let i = 0; i < paths.length; i++) {
            const pathCheck = paths[i];
            if (pathCheck.node === targetNode) {
                path = pathCheck;
                break;
            }
        }

        if (!path) {
            path = new NodePath(hub, parent);
            paths.push(path);
        }

        path.setup(parentPath, container, listKey, key);

        return path;
    }

    getScope(scope: Scope) {
        return this.isScope() ? new Scope(this) : scope;
    }

    setData(key: string, val: any): any {
        return (this.data[key] = val);
    }

    getData(key: string, def?: any): any {
        let val = this.data[key];
        if (is.undefined(val) && !is.undefined(def)) {
            val = this.data[key] = def;
        }
        return val;
    }

    buildCodeFrameError(msg: string, Error: typeof Error = SyntaxError): Error {
        return this.hub.buildError(this.node, msg, Error);
    }

    traverse(visitor: Object, state?: any) {
        traverse(this.node, visitor, this.scope, state, this);
    }

    set(key: string, node: Object) {
        t.validate(this.node, key, node);
        this.node[key] = node;
    }

    getPathLocation(): string {
        const parts = [];
        let path = this;
        do {
            let key = path.key;
            if (path.inList) {
                key = `${path.listKey}[${key}]`;
            }
            parts.unshift(key);
        } while ((path = path.parentPath));
        return parts.join(".");
    }

    debug(message) {
        // if (!debug.enabled) {
        //     return;
        // }
        // debug(`${this.getPathLocation()} ${this.type}: ${message}`);
    }

    toString() {
        return generator(this.node).code;
    }
}

Object.assign(
    NodePath.prototype,
    NodePath_ancestry,
    NodePath_inference,
    NodePath_replacement,
    NodePath_evaluation,
    NodePath_conversion,
    NodePath_introspection,
    NodePath_context,
    NodePath_removal,
    NodePath_modification,
    NodePath_family,
    NodePath_comments,
);

for (const type of (t.TYPES: Array<string>)) {
    const typeKey = `is${type}`;
    const fn = t[typeKey];
    NodePath.prototype[typeKey] = function (opts) {
        return fn(this.node, opts);
    };

    NodePath.prototype[`assert${type}`] = function (opts) {
        if (!fn(this.node, opts)) {
            throw new TypeError(`Expected node path of type ${type}`);
        }
    };
}

for (const type of Object.keys(virtualTypes)) {
    if (type[0] === "_") {
        continue;
    }
    if (t.TYPES.indexOf(type) < 0) {
        t.TYPES.push(type);
    }

    const virtualType = virtualTypes[type];

    NodePath.prototype[`is${type}`] = function (opts) {
        return virtualType.checkPath(this, opts);
    };
}
