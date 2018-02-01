const {
    is,
    collection,
    exception
} = adone;

const RE_PARAM = /(?:\?)|(?::(\d+|(?:[a-zA-Z][a-zA-Z0-9_]*)))/g;
const DQUOTE = 34;
const SQUOTE = 39;
const BSLASH = 92;

const parse = (query) => {
    let ppos = RE_PARAM.exec(query);

    if (ppos) {
        let curpos = 0;
        let start = 0;
        let end;
        const parts = [];
        let inQuote = false;
        let escape = false;
        let qchr;
        const tokens = [];
        let qcnt = 0;
        let lastTokenEndPos = 0;

        let i;
        do {
            for (i = curpos, end = ppos.index; i < end; ++i) {
                const chr = query.charCodeAt(i);
                if (chr === BSLASH) {
                    escape = !escape;
                } else {
                    if (escape) {
                        escape = false;
                        continue;
                    }
                    if (inQuote && chr === qchr) {
                        if (query.charCodeAt(i + 1) === qchr) {
                            // quote escaped via "" or ''
                            ++i;
                            continue;
                        }
                        inQuote = false;
                    } else if (chr === DQUOTE || chr === SQUOTE) {
                        inQuote = true;
                        qchr = chr;
                    }
                }
            }
            if (!inQuote) {
                parts.push(query.substring(start, end));
                tokens.push(ppos[0].length === 1 ? qcnt++ : ppos[1]);
                start = end + ppos[0].length;
                lastTokenEndPos = start;
            }
            curpos = end + ppos[0].length;
        } while ((ppos = RE_PARAM.exec(query)));

        if (tokens.length) {
            if (curpos < query.length) {
                parts.push(query.substring(lastTokenEndPos));
            }
            return [parts, tokens];
        }
    }
    return [query];
};

export const createCompiler = (config = {}) => {
    if (!config.placeholder) {
        config.placeholder = "?";
    }
    let ncache = 100;
    let cache;
    if (is.number(config.cache)) {
        ncache = config.cache;
    }
    if (is.object(config.cache)) {
        cache = config.cache;
    }
    if (config.cache !== false && !cache) {
        cache = new collection.FastLRU(ncache);
    }

    const toArrayParams = (tree, params) => {
        const arr = [];
        if (tree.length === 1) {
            return [tree[0], []];
        }

        if (is.undefined(params)) {
            throw new exception.InvalidArgument("Named query contains placeholders, but parameters object is undefined");
        }

        const tokens = tree[1];
        for (let i = 0; i < tokens.length; ++i) {
            arr.push(params[tokens[i]]);
        }
        return [tree[0], arr];
    };

    const noTailingSemicolon = (s) => {
        if (s.slice(-1) === ":") {
            return s.slice(0, -1);
        }
        return s;
    };

    const join = (tree) => {
        if (tree.length === 1) {
            return tree;
        }

        let unnamed = noTailingSemicolon(tree[0][0]);
        for (let i = 1; i < tree[0].length; ++i) {
            if (tree[0][i - 1].slice(-1) === ":") {
                unnamed += config.placeholder;
            }
            unnamed += config.placeholder;
            unnamed += noTailingSemicolon(tree[0][i]);
        }

        const last = tree[0][tree[0].length - 1];
        if (tree[0].length === tree[1].length) {
            if (last.slice(-1) === ":") {
                unnamed += config.placeholder;
            }
            unnamed += config.placeholder;
        }
        return [unnamed, tree[1]];
    };

    const compile = function (query, paramsObj) {
        let tree;
        if (cache) {
            tree = cache.get(query);
            if (tree) {
                return toArrayParams(tree, paramsObj);
            }
        }
        tree = join(parse(query));
        if (cache) {
            cache.set(query, tree);
        }
        return toArrayParams(tree, paramsObj);
    };

    compile.parse = parse;
    return compile;
};

// named :one :two to postgres-style numbered $1 $2 $3
export const toNumbered = (q, params) => {
    const tree = parse(q);
    let paramsArr = [];
    if (tree.length === 1) {
        return [tree[0], paramsArr];
    }

    const pIndexes = {};
    let pLastIndex = 0;
    let qs = "";
    let varIndex;
    const varNames = [];
    for (let i = 0; i < tree[0].length; ++i) {
        varIndex = pIndexes[tree[1][i]];
        if (!varIndex) {
            varIndex = ++pLastIndex;
            pIndexes[tree[1][i]] = varIndex;
        }
        if (tree[1][i]) {
            varNames[varIndex - 1] = tree[1][i];
            qs += `${tree[0][i]}$${varIndex}`;
        } else {
            qs += tree[0][i];
        }
    }
    paramsArr = varNames.map((n) => params[n]);
    return [qs, paramsArr];
};
