const { is, x } = adone;

const PATH_REGEXP = new RegExp([
    // Match escaped characters that would otherwise appear in future matches.
    // This allows the user to escape special characters that won't transform.
    "(\\\\.)",
    // Match Express-style parameters and un-named parameters with a prefix
    // and optional suffixes. Matches appear as:
    //
    // "/:test(\\d+)?" => ["/", "test", "\d+", undefined, "?", undefined]
    // "/route(\\d+)"  => [undefined, undefined, undefined, "\d+", undefined, undefined]
    // "/*"            => ["/", undefined, undefined, undefined, undefined, "*"]
    "([\\/.])?(?:(?:\\:(\\w+)(?:\\(((?:\\\\.|[^\\\\()])+)\\))?|\\(((?:\\\\.|[^\\\\()])+)\\))([+*?])?|(\\*))"
].join("|"), "g");

const escapeString = (str) => str.replace(/([.+*?=^!:${}()[\]|\/\\])/g, "\\$1");

const escapeGroup = (group) => group.replace(/([=!:$\/()])/g, "\\$1");

const parse = (str, options) => {
    const tokens = [];
    let key = 0;
    let index = 0;
    let path = "";
    const defaultDelimiter = options && options.delimiter || "/";

    while (true) {  // eslint-disable-line
        const res = PATH_REGEXP.exec(str);
        if (is.null(res)) {
            break;
        }
        const [m, escaped] = res;
        const { index: offset } = res;
        path += str.slice(index, offset);
        index = offset + m.length;

        // Ignore already escaped sequences.
        if (escaped) {
            path += escaped[1];
            continue;
        }

        const next = str[index];
        const [, , prefix, name, capture, group, modifier, asterisk] = res;

        // Push the current path onto the tokens.
        if (path) {
            tokens.push(path);
            path = "";
        }

        const partial = !is.nil(prefix) && !is.nil(next) && next !== prefix;
        const repeat = modifier === "+" || modifier === "*";
        const optional = modifier === "?" || modifier === "*";
        const delimiter = prefix || defaultDelimiter;
        const pattern = capture || group;

        tokens.push({
            name: name || key++,
            prefix: prefix || "",
            delimiter,
            optional,
            repeat,
            partial,
            asterisk: Boolean(asterisk),
            pattern: pattern ? escapeGroup(pattern) : (asterisk ? ".*" : `[^${escapeString(delimiter)}]+?`)
        });
    }

    // Match any characters still remaining.
    if (index < str.length) {
        path += str.substr(index);
    }

    // If the path exists, push it onto the end.
    if (path) {
        tokens.push(path);
    }

    return tokens;
};

const encodeURIComponentPretty = (str) => encodeURI(str).replace(/[\/?#]/g, (c) => {
    return `%${c.charCodeAt(0).toString(16).toUpperCase()}`;
});

// Similar to `pretty`, but allows slashes.
const encodeAsterisk = (str) => encodeURI(str).replace(/[?#]/g, (c) => {
    return `%${c.charCodeAt(0).toString(16).toUpperCase()}`;
});

const tokensToFunction = (tokens) => {
    const matches = new Array(tokens.length);

    for (let i = 0; i < tokens.length; i++) {
        if (is.object(tokens[i])) {
            matches[i] = new RegExp(`^(?:${tokens[i].pattern})$`);
        }
    }

    return (data, options = {}) => {
        const encode = options.pretty ? encodeURIComponentPretty : encodeURIComponent;
        let path = "";
        data = data || {};

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];

            if (is.string(token)) {
                path += token;

                continue;
            }

            const value = data[token.name];

            if (is.nil(value)) {
                if (token.optional) {
                    // Prepend partial segment prefixes.
                    if (token.partial) {
                        path += token.prefix;
                    }

                    continue;
                } else {
                    throw new x.IllegalState(`Expected "${token.name}" to be defined`);
                }
            }

            let segment;

            if (is.array(value)) {
                if (!token.repeat) {
                    throw new x.IllegalState(`Expected "${token.name}" to not repeat, but received \`${JSON.stringify(value)}\``);
                }

                if (value.length === 0) {
                    if (token.optional) {
                        continue;
                    } else {
                        throw new x.IllegalState(`Expected "${token.name}" to not be empty`);
                    }
                }

                for (let j = 0; j < value.length; j++) {
                    segment = encode(value[j]);

                    if (!matches[i].test(segment)) {
                        throw new x.IllegalState(`Expected all "${token.name}" to match "${token.pattern}", but received \`${JSON.stringify(segment)}\``);
                    }

                    path += (j === 0 ? token.prefix : token.delimiter) + segment;
                }

                continue;
            }

            segment = token.asterisk ? encodeAsterisk(value) : encode(value);

            if (!matches[i].test(segment)) {
                throw new x.IllegalState(`Expected "${token.name}" to match "${token.pattern}", but received "${segment}"`);
            }

            path += token.prefix + segment;
        }

        return path;
    };
};

const compile = (str, options) => tokensToFunction(parse(str, options));

const attachKeys = (re, keys) => {
    re.keys = keys;
    return re;
};

const flags = (options) => options.sensitive ? "" : "i";

const regexpToRegexp = (path, keys) => {
    const groups = path.source.match(/\((?!\?)/g);

    if (groups) {
        for (let i = 0; i < groups.length; i++) {
            keys.push({
                name: i,
                prefix: null,
                delimiter: null,
                optional: false,
                repeat: false,
                partial: false,
                asterisk: false,
                pattern: null
            });
        }
    }

    return attachKeys(path, keys);
};

const arrayToRegexp = (path, keys, options) => {
    const parts = [];

    for (const i of path) {
        parts.push(pathToRegexp(i, keys, options).source);
    }

    const regexp = new RegExp(`(?:${parts.join("|")})`, flags(options));

    return attachKeys(regexp, keys);
};

const tokensToRegExp = (tokens, keys, options) => {
    if (!is.array(keys)) {
        options = (keys || options);
        keys = [];
    }

    options = options || {};

    const strict = options.strict;
    const end = options.end !== false;
    let route = "";

    for (const token of tokens) {
        if (is.string(token)) {
            route += escapeString(token);
        } else {
            const prefix = escapeString(token.prefix);
            let capture = `(?:${token.pattern})`;

            keys.push(token);

            if (token.repeat) {
                capture += `(?:${prefix}${capture})*`;
            }

            if (token.optional) {
                if (!token.partial) {
                    capture = `(?:${prefix}(${capture}))?`;
                } else {
                    capture = `${prefix}(${capture})?`;
                }
            } else {
                capture = `${prefix}(${capture})`;
            }

            route += capture;
        }
    }

    const delimiter = escapeString(options.delimiter || "/");
    const endsWithDelimiter = route.slice(-delimiter.length) === delimiter;

    // In non-strict mode we allow a slash at the end of match. If the path to
    // match already ends with a slash, we remove it for consistency. The slash
    // is valid at the end of a path match, not in the middle. This is important
    // in non-ending mode, where "/test/" shouldn't match "/test//route".
    if (!strict) {
        route = `${endsWithDelimiter ? route.slice(0, -delimiter.length) : route}(?:${delimiter}(?=$))?`;
    }

    if (end) {
        route += "$";
    } else {
        // In non-ending mode, we need the capturing groups to match as much as
        // possible by using a positive lookahead to the end or next path segment.
        route += strict && endsWithDelimiter ? "" : `(?=${delimiter}|$)`;
    }

    return attachKeys(new RegExp(`^${route}`, flags(options)), keys);
};

const stringToRegexp = (path, keys, options) => tokensToRegExp(parse(path, options), keys, options);

export default function pathToRegexp(path, keys, options) {
    if (!is.array(keys)) {
        options = keys || options;
        keys = [];
    }

    options = options || {};

    if (is.regexp(path)) {
        return regexpToRegexp(path, keys);
    }

    if (is.array(path)) {
        return arrayToRegexp(path, keys, options);
    }

    return stringToRegexp(path, keys, options);
}

pathToRegexp.parse = parse;
pathToRegexp.compile = compile;
pathToRegexp.tokensToFunction = tokensToFunction;
pathToRegexp.tokensToRegExp = tokensToRegExp;
