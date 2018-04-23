const {
    assert,
    is
} = adone;

// Clone object or array
export const clone = function (obj, seen) {
    if (typeof obj !== "object" || is.null(obj)) {

        return obj;
    }

    seen = seen || new Map();

    const lookup = seen.get(obj);
    if (lookup) {
        return lookup;
    }

    let newObj;
    let cloneDeep = false;

    if (!is.array(obj)) {
        if (is.buffer(obj)) {
            newObj = Buffer.from(obj);
        } else if (obj instanceof Date) {
            newObj = new Date(obj.getTime());
        } else if (obj instanceof RegExp) {
            newObj = new RegExp(obj);
        } else {
            const proto = Object.getPrototypeOf(obj);
            if (proto &&
                proto.isImmutable) {

                newObj = obj;
            } else {
                newObj = Object.create(proto);
                cloneDeep = true;
            }
        }
    } else {
        newObj = [];
        cloneDeep = true;
    }

    seen.set(obj, newObj);

    if (cloneDeep) {
        const keys = Object.getOwnPropertyNames(obj);
        for (let i = 0; i < keys.length; ++i) {
            const key = keys[i];
            const descriptor = Object.getOwnPropertyDescriptor(obj, key);
            if (descriptor &&
                (descriptor.get ||
                    descriptor.set)) {

                Object.defineProperty(newObj, key, descriptor);
            } else {
                newObj[key] = exports.clone(obj[key], seen);
            }
        }
    }

    return newObj;
};


// Merge all the properties of source into target, source wins in conflict, and by default null and undefined from source are applied
export const merge = function (target, source, isNullOverride /* = true */, isMergeArrays /* = true */) {
    assert(target && typeof target === "object", "Invalid target value: must be an object");
    assert(is.nil(source) || typeof source === "object", "Invalid source value: must be null, undefined, or an object");

    if (!source) {
        return target;
    }

    if (is.array(source)) {
        exports.assert(is.array(target), "Cannot merge array onto an object");
        if (isMergeArrays === false) { // isMergeArrays defaults to true
            target.length = 0; // Must not change target assignment
        }

        for (let i = 0; i < source.length; ++i) {
            target.push(exports.clone(source[i]));
        }

        return target;
    }

    const keys = Object.keys(source);
    for (let i = 0; i < keys.length; ++i) {
        const key = keys[i];
        if (key === "__proto__") {
            continue;
        }

        const value = source[key];
        if (value &&
            typeof value === "object") {

            if (!target[key] ||
                typeof target[key] !== "object" ||
                (is.array(target[key]) !== is.array(value)) ||
                value instanceof Date ||
                is.buffer(value) ||
                value instanceof RegExp) {

                target[key] = exports.clone(value);
            } else {
                exports.merge(target[key], value, isNullOverride, isMergeArrays);
            }
        } else {
            if (!is.nil(value)) { // Explicit to preserve empty strings

                target[key] = value;
            } else if (isNullOverride !== false) { // Defaults to true
                target[key] = value;
            }
        }
    }

    return target;
};


// Apply options to a copy of the defaults
export const applyToDefaults = function (defaults, options, isNullOverride) {

    assert(defaults && typeof defaults === "object", "Invalid defaults value: must be an object");
    assert(!options || options === true || typeof options === "object", "Invalid options value: must be true, falsy or an object");

    if (!options) { // If no options, return null
        return null;
    }

    const copy = clone(defaults);

    if (options === true) { // If options is set to true, use defaults
        return copy;
    }

    return merge(copy, options, isNullOverride === true, false);
};


// Deep object or array comparison
export const deepEqual = function (obj, ref, options, seen) {
    options = options || { prototype: true };

    const type = typeof obj;

    if (type !== typeof ref) {
        return false;
    }

    if (type !== "object" ||
        is.null(obj) ||
        is.null(ref)) {

        if (obj === ref) { // Copied from Deep-eql, copyright(c) 2013 Jake Luer, jake@alogicalparadox.com, MIT Licensed, https://github.com/chaijs/deep-eql
            return obj !== 0 || 1 / obj === 1 / ref; // -0 / +0
        }

        return obj !== obj && ref !== ref; // NaN
    }

    seen = seen || [];
    if (seen.indexOf(obj) !== -1) {
        return true; // If previous comparison failed, it would have stopped execution
    }

    seen.push(obj);

    if (is.array(obj)) {
        if (!is.array(ref)) {
            return false;
        }

        if (!options.part && obj.length !== ref.length) {
            return false;
        }

        for (let i = 0; i < obj.length; ++i) {
            if (options.part) {
                let found = false;
                for (let j = 0; j < ref.length; ++j) {
                    if (exports.deepEqual(obj[i], ref[j], options)) {
                        found = true;
                        break;
                    }
                }

                return found;
            }

            if (!exports.deepEqual(obj[i], ref[i], options)) {
                return false;
            }
        }

        return true;
    }

    if (is.buffer(obj)) {
        if (!is.buffer(ref)) {
            return false;
        }

        if (obj.length !== ref.length) {
            return false;
        }

        for (let i = 0; i < obj.length; ++i) {
            if (obj[i] !== ref[i]) {
                return false;
            }
        }

        return true;
    }

    if (obj instanceof Date) {
        return (ref instanceof Date && obj.getTime() === ref.getTime());
    }

    if (obj instanceof RegExp) {
        return (ref instanceof RegExp && obj.toString() === ref.toString());
    }

    if (options.prototype) {
        if (Object.getPrototypeOf(obj) !== Object.getPrototypeOf(ref)) {
            return false;
        }
    }

    const keys = Object.getOwnPropertyNames(obj);

    if (!options.part && keys.length !== Object.getOwnPropertyNames(ref).length) {
        return false;
    }

    for (let i = 0; i < keys.length; ++i) {
        const key = keys[i];
        const descriptor = Object.getOwnPropertyDescriptor(obj, key);
        if (descriptor.get) {
            if (!exports.deepEqual(descriptor, Object.getOwnPropertyDescriptor(ref, key), options, seen)) {
                return false;
            }
        } else if (!exports.deepEqual(obj[key], ref[key], options, seen)) {
            return false;
        }
    }

    return true;
};


// Remove duplicate items from array
export const unique = (array, key) => {
    let result;
    if (key) {
        result = [];
        const index = new Set();
        array.forEach((item) => {

            const identifier = item[key];
            if (!index.has(identifier)) {
                index.add(identifier);
                result.push(item);
            }
        });
    } else {
        result = Array.from(new Set(array));
    }

    return result;
};


// Convert array into object
export const mapToObject = function (array, key) {
    if (!array) {
        return null;
    }

    const obj = {};
    for (let i = 0; i < array.length; ++i) {
        if (key) {
            if (array[i][key]) {
                obj[array[i][key]] = true;
            }
        } else {
            obj[array[i]] = true;
        }
    }

    return obj;
};

// Escape string for Regex construction
// Escape ^$.*+-?=!:|\/()[]{},
export const escapeRegex = (string) => string.replace(/[\^\$\.\*\+\-\?\=\!\:\|\\\/\(\)\[\]\{\}\,]/g, "\\$&");


// Test if the reference contains the values
export const contain = function (ref, values, options) {
    /**
     * string -> string(s)
     * array -> item(s)
     * object -> key(s)
     * object -> object (key:value)
     */

    let valuePairs = null;
    if (typeof ref === "object" &&
        typeof values === "object" &&
        !is.array(ref) &&
        !is.array(values)) {

        valuePairs = values;
        values = Object.keys(values);
    } else {
        values = [].concat(values);
    }

    options = options || {}; // deep, once, only, part

    assert(is.string(ref) || typeof ref === "object", "Reference must be string or an object");
    assert(values.length, "Values array cannot be empty");

    let compare;
    let compareFlags;
    if (options.deep) {
        compare = exports.deepEqual;

        const hasOnly = options.hasOwnProperty("only");
        const hasPart = options.hasOwnProperty("part");

        compareFlags = {
            prototype: hasOnly ? options.only : hasPart ? !options.part : false,
            part: hasOnly ? !options.only : hasPart ? options.part : true
        };
    } else {
        compare = (a, b) => a === b;
    }

    let misses = false;
    const matches = new Array(values.length);
    for (let i = 0; i < matches.length; ++i) {
        matches[i] = 0;
    }

    if (is.string(ref)) {
        let pattern = "(";
        for (let i = 0; i < values.length; ++i) {
            const value = values[i];
            assert(is.string(value), "Cannot compare string reference to non-string value");
            pattern += (i ? "|" : "") + escapeRegex(value);
        }

        const regex = new RegExp(`${pattern})`, "g");
        const leftovers = ref.replace(regex, ($0, $1) => {

            const index = values.indexOf($1);
            ++matches[index];
            return ""; // Remove from string
        });

        misses = Boolean(leftovers);
    } else if (is.array(ref)) {
        for (let i = 0; i < ref.length; ++i) {
            let matched = false;
            for (let j = 0; j < values.length && matched === false; ++j) {
                matched = compare(values[j], ref[i], compareFlags) && j;
            }

            if (matched !== false) {
                ++matches[matched];
            } else {
                misses = true;
            }
        }
    } else {
        const keys = Object.getOwnPropertyNames(ref);
        for (let i = 0; i < keys.length; ++i) {
            const key = keys[i];
            const pos = values.indexOf(key);
            if (pos !== -1) {
                if (valuePairs &&
                    !compare(valuePairs[key], ref[key], compareFlags)) {

                    return false;
                }

                ++matches[pos];
            } else {
                misses = true;
            }
        }
    }

    let result = false;
    for (let i = 0; i < matches.length; ++i) {
        result = result || Boolean(matches[i]);
        if ((options.once && matches[i] > 1) ||
            (!options.part && !matches[i])) {

            return false;
        }
    }

    if (options.only &&
        misses) {

        return false;
    }

    return result;
};


// Flatten array
export const flatten = function (array, target) {
    const result = target || [];

    for (let i = 0; i < array.length; ++i) {
        if (is.array(array[i])) {
            exports.flatten(array[i], result);
        } else {
            result.push(array[i]);
        }
    }

    return result;
};


// Convert an object key chain string ('a.b.c') to reference (object[a][b][c])
export const reach = function (obj, chain, options) {

    if (chain === false ||
        is.null(chain) ||
        is.undefined(chain)) {

        return obj;
    }

    options = options || {};
    if (is.string(options)) {
        options = { separator: options };
    }

    const path = chain.split(options.separator || ".");
    let ref = obj;
    for (let i = 0; i < path.length; ++i) {
        let key = path[i];
        if (key[0] === "-" && is.array(ref)) {
            key = key.slice(1, key.length);
            key = ref.length - key;
        }

        if (!ref ||
            !((typeof ref === "object" || is.function(ref)) && key in ref) ||
            (typeof ref !== "object" && options.functions === false)) { // Only object and function can have properties

            assert(!options.strict || i + 1 === path.length, "Missing segment", key, "in reach path ", chain);
            assert(typeof ref === "object" || options.functions === true || !is.function(ref), "Invalid segment", key, "in reach path ", chain);
            ref = options.default;
            break;
        }

        ref = ref[key];
    }

    return ref;
};

const safeCharCodes = (function () {
    const safe = {};

    for (let i = 32; i < 123; ++i) {

        if ((i >= 97) || // a-z
            (i >= 65 && i <= 90) || // A-Z
            (i >= 48 && i <= 57) || // 0-9
            i === 32 || // space
            i === 46 || // .
            i === 44 || // ,
            i === 45 || // -
            i === 58 || // :
            i === 95) { // _

            safe[i] = null;
        }
    }

    return safe;
}());

const namedHtml = {
    38: "&amp;",
    60: "&lt;",
    62: "&gt;",
    34: "&quot;",
    160: "&nbsp;",
    162: "&cent;",
    163: "&pound;",
    164: "&curren;",
    169: "&copy;",
    174: "&reg;"
};

const isSafe = (charCode) => (!is.undefined(safeCharCodes[charCode]));

const padLeft = function (str, len) {
    while (str.length < len) {
        str = `0${str}`;
    }

    return str;
};

const escapeHtmlChar = function (charCode) {
    const namedEscape = namedHtml[charCode];
    if (!is.undefined(namedEscape)) {
        return namedEscape;
    }

    if (charCode >= 256) {
        return `&#${charCode};`;
    }

    const hexValue = Buffer.from(String.fromCharCode(charCode), "ascii").toString("hex");
    return `&#x${padLeft(hexValue, 2)};`;
};

export const escapeHtml = function (input) {
    if (!input) {
        return "";
    }

    let escaped = "";

    for (let i = 0; i < input.length; ++i) {

        const charCode = input.charCodeAt(i);

        if (isSafe(charCode)) {
            escaped += input[i];
        } else {
            escaped += escapeHtmlChar(charCode);
        }
    }

    return escaped;
};

const mergeSort = (a, b) => a.sort === b.sort ? 0 : (a.sort < b.sort ? -1 : 1);

export class Topo {
    constructor() {
        this._items = [];
        this.nodes = [];
    }

    add(nodes, options) {
        options = options || {};

        // Validate rules

        const before = [].concat(options.before || []);
        const after = [].concat(options.after || []);
        const group = options.group || "?";
        const sort = options.sort || 0; // Used for merging only

        assert(!before.includes(group), `Item cannot come before itself: ${group}`);
        assert(!before.includes("?"), "Item cannot come before unassociated items");
        assert(!after.includes(group), `Item cannot come after itself: ${group}`);
        assert(!after.includes("?"), "Item cannot come after unassociated items");

        ([].concat(nodes)).forEach((node, i) => {

            const item = {
                seq: this._items.length,
                sort,
                before,
                after,
                group,
                node
            };

            this._items.push(item);
        });

        // Insert event

        const error = this._sort();
        assert(!error, `item ${(group !== "?" ? `added into group ${group}` : "")} created a dependencies error`);

        return this.nodes;
    }

    merge(others) {
        others = [].concat(others);
        for (let i = 0; i < others.length; ++i) {
            const other = others[i];
            if (other) {
                for (let j = 0; j < other._items.length; ++j) {
                    const item = {
                        ...other._items[j]
                    };
                    this._items.push(item);
                }
            }
        }

        // Sort items

        this._items.sort(mergeSort);
        for (let i = 0; i < this._items.length; ++i) {
            this._items[i].seq = i;
        }

        const error = this._sort();
        assert(!error, "merge created a dependencies error");

        return this.nodes;
    }

    _sort() {
        // Construct graph

        const graph = {};
        const graphAfters = Object.create(null); // A prototype can bungle lookups w/ false positives
        const groups = Object.create(null);

        for (let i = 0; i < this._items.length; ++i) {
            const item = this._items[i];
            const seq = item.seq; // Unique across all items
            const group = item.group;

            // Determine Groups

            groups[group] = groups[group] || [];
            groups[group].push(seq);

            // Build intermediary graph using 'before'

            graph[seq] = item.before;

            // Build second intermediary graph with 'after'

            const after = item.after;
            for (let j = 0; j < after.length; ++j) {
                graphAfters[after[j]] = (graphAfters[after[j]] || []).concat(seq);
            }
        }

        // Expand intermediary graph

        let graphNodes = Object.keys(graph);
        for (let i = 0; i < graphNodes.length; ++i) {
            const node = graphNodes[i];
            const expandedGroups = [];

            const graphNodeItems = Object.keys(graph[node]);
            for (let j = 0; j < graphNodeItems.length; ++j) {
                const group = graph[node][graphNodeItems[j]];
                groups[group] = groups[group] || [];

                for (let k = 0; k < groups[group].length; ++k) {
                    expandedGroups.push(groups[group][k]);
                }
            }
            graph[node] = expandedGroups;
        }

        // Merge intermediary graph using graphAfters into final graph

        const afterNodes = Object.keys(graphAfters);
        for (let i = 0; i < afterNodes.length; ++i) {
            const group = afterNodes[i];

            if (groups[group]) {
                for (let j = 0; j < groups[group].length; ++j) {
                    const node = groups[group][j];
                    graph[node] = graph[node].concat(graphAfters[group]);
                }
            }
        }

        // Compile ancestors

        let children;
        const ancestors = {};
        graphNodes = Object.keys(graph);
        for (let i = 0; i < graphNodes.length; ++i) {
            const node = graphNodes[i];
            children = graph[node];

            for (let j = 0; j < children.length; ++j) {
                ancestors[children[j]] = (ancestors[children[j]] || []).concat(node);
            }
        }

        // Topo sort

        const visited = {};
        const sorted = [];

        for (let i = 0; i < this._items.length; ++i) { // Really looping thru item.seq values out of order
            let next = i;

            if (ancestors[i]) {
                next = null;
                for (let j = 0; j < this._items.length; ++j) { // As above, these are item.seq values
                    if (visited[j] === true) {
                        continue;
                    }

                    if (!ancestors[j]) {
                        ancestors[j] = [];
                    }

                    const shouldSeeCount = ancestors[j].length;
                    let seenCount = 0;
                    for (let k = 0; k < shouldSeeCount; ++k) {
                        if (visited[ancestors[j][k]]) {
                            ++seenCount;
                        }
                    }

                    if (seenCount === shouldSeeCount) {
                        next = j;
                        break;
                    }
                }
            }

            if (!is.null(next)) {
                visited[next] = true;
                sorted.push(next);
            }
        }

        if (sorted.length !== this._items.length) {
            return new Error("Invalid dependencies");
        }

        const seqIndex = {};
        for (let i = 0; i < this._items.length; ++i) {
            const item = this._items[i];
            seqIndex[item.seq] = item;
        }

        const sortedNodes = [];
        this._items = sorted.map((value) => {

            const sortedItem = seqIndex[value];
            sortedNodes.push(sortedItem.node);
            return sortedItem;
        });

        this.nodes = sortedNodes;
    }
}
