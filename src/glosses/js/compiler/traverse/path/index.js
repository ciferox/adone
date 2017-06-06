import * as virtualTypes from "./lib/virtual_types";
import traverse from "../index";
import Scope from "../scope";
const { x, js: { compiler: { types } } } = adone;
import { path as pathCache } from "../cache";

export default class NodePath {
    constructor(hub, parent) {
        this.parent = parent;
        this.hub = hub;
        this.contexts = [];
        this.data = {};
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

    static get({ hub, parentPath, parent, container, listKey, key }) {
        if (!hub && parentPath) {
            hub = parentPath.hub;
        }

        if (!parent) {
            throw new x.Exception("To get a node path the parent needs to exist");
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

    getScope(scope) {
        let ourScope = scope;

        // we're entering a new scope so let's construct it!
        if (this.isScope()) {
            ourScope = new Scope(this, scope);
        }

        return ourScope;
    }

    setData(key, val) {
        return this.data[key] = val;
    }

    getData(key, def) {
        let val = this.data[key];
        if (!val && def) {
            val = this.data[key] = def;
        }
        return val;
    }

    buildCodeFrameError(msg, Error = SyntaxError) {
        return this.hub.file.buildCodeFrameError(this.node, msg, Error);
    }

    traverse(visitor, state) {
        traverse(this.node, visitor, this.scope, state, this);
    }

    mark(type, message) {
        this.hub.file.metadata.marked.push({
            type,
            message,
            loc: this.node.loc
        });
    }

    set(key, node) {
        types.validate(this.node, key, node);
        this.node[key] = node;
    }

    getPathLocation() {
        const parts = [];
        let path = this;
        for ( ; ; ) {
            let key = path.key;
            if (path.inList) {
                key = `${path.listKey}[${key}]`;
            }
            parts.unshift(key);
            path = path.parentPath;
            if (!path) {
                break;
            }
        }
        return parts.join(".");
    }

    debug(buildMessage) {
        // TODO
        // adone.log(`${this.getPathLocation()} ${this.type}: ${buildMessage()}`);
    }
}

Object.assign(NodePath.prototype, require("./ancestry"));
Object.assign(NodePath.prototype, require("./inference"));
Object.assign(NodePath.prototype, require("./replacement"));
Object.assign(NodePath.prototype, require("./evaluation"));
Object.assign(NodePath.prototype, require("./conversion"));
Object.assign(NodePath.prototype, require("./introspection"));
Object.assign(NodePath.prototype, require("./context"));
Object.assign(NodePath.prototype, require("./removal"));
Object.assign(NodePath.prototype, require("./modification"));
Object.assign(NodePath.prototype, require("./family"));
Object.assign(NodePath.prototype, require("./comments"));

for (const type of types.TYPES) {
    const typeKey = `is${type}`;
    NodePath.prototype[typeKey] = function (opts) {
        return types[typeKey](this.node, opts);
    };

    NodePath.prototype[`assert${type}`] = function (opts) {
        if (!this[typeKey](opts)) {
            throw new TypeError(`Expected node path of type ${type}`);
        }
    };
}

for (const type in virtualTypes) {
    if (type[0] === "_") {
        continue;
    }
    if (types.TYPES.indexOf(type) < 0) {
        types.TYPES.push(type);
    }

    const virtualType = virtualTypes[type];

    NodePath.prototype[`is${type}`] = function (opts) {
        return virtualType.checkPath(this, opts);
    };
}
