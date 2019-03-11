const {
    is,
    cli: { esc, stats }
} = adone;

const TEMPLATE_REGEX = /(?:\\(u[a-f\d]{4}|x[a-f\d]{2}|.))|(?:\{(~)?(\w+(?:\([^)]*\))?(?:\.\w+(?:\([^)]*\))?)*)(?:[ \t]|(?=\r?\n)))|(\})|((?:.|[\r\n\f])+?)/gi;
const STYLE_REGEX = /(?:^|\.)(\w+)(?:\(([^)]*)\))?/g;
const STRING_REGEX = /^(['"])((?:\\.|(?!\1)[^\\])*)\1$/;
const ESCAPE_REGEX = /\\(u[a-f\d]{4}|x[a-f\d]{2}|.)|([^\\])/gi;

const ESCAPES = new Map([
    ["n", "\n"],
    ["r", "\r"],
    ["t", "\t"],
    ["b", "\b"],
    ["f", "\f"],
    ["v", "\v"],
    ["0", "\0"],
    ["\\", "\\"],
    ["e", "\u001B"],
    ["a", "\u0007"]
]);

const unescape = function (c) {
    if ((c[0] === "u" && c.length === 5) || (c[0] === "x" && c.length === 3)) {
        return String.fromCharCode(parseInt(c.slice(1), 16));
    }

    return ESCAPES.get(c) || c;
};

const parseArguments = function (name, args) {
    const results = [];
    const chunks = args.trim().split(/\s*,\s*/g);
    let matches;

    for (const chunk of chunks) {
        const number = Number(chunk);
        if (!is.nan(number)) {
            results.push(number);
        } else if ((matches = chunk.match(STRING_REGEX))) {
            results.push(matches[2].replace(ESCAPE_REGEX, (m, escape, character) => escape ? unescape(escape) : character));
        } else {
            throw new Error(`Invalid Chalk template style argument: ${chunk} (in style '${name}')`);
        }
    }

    return results;
};

const parseStyle = function (style) {
    STYLE_REGEX.lastIndex = 0;

    const results = [];
    let matches;

    while (!is.null(matches = STYLE_REGEX.exec(style))) {
        const name = matches[1];

        if (matches[2]) {
            const args = parseArguments(name, matches[2]);
            results.push([name, ...args]);
        } else {
            results.push([name]);
        }
    }

    return results;
};

const buildStyle = function (chalk, styles) {
    const enabled = {};

    for (const layer of styles) {
        for (const style of layer.styles) {
            enabled[style[0]] = layer.inverse ? null : style.slice(1);
        }
    }

    let current = chalk;
    for (const styleName of Object.keys(enabled)) {
        if (!is.array(enabled[styleName])) {
            continue;
        }
        if (!(styleName in current)) {
            throw new Error(`Unknown Chalk style: ${styleName}`);
        }

        if (enabled[styleName].length > 0) {
            current = current[styleName](...enabled[styleName]);
        } else {
            current = current[styleName];
        }
    }

    return current;
};

const template = (chalk, tmp) => {
    const styles = [];
    const chunks = [];
    let chunk = [];

    // eslint-disable-next-line max-params
    tmp.replace(TEMPLATE_REGEX, (m, escapeCharacter, inverse, style, close, character) => {
        if (escapeCharacter) {
            chunk.push(unescape(escapeCharacter));
        } else if (style) {
            const string = chunk.join("");
            chunk = [];
            chunks.push(styles.length === 0 ? string : buildStyle(chalk, styles)(string));
            styles.push({ inverse, styles: parseStyle(style) });
        } else if (close) {
            if (styles.length === 0) {
                throw new Error("Found extraneous } in Chalk template literal");
            }

            chunks.push(buildStyle(chalk, styles)(chunk.join("")));
            chunk = [];
            styles.pop();
        } else {
            chunk.push(character);
        }
    });

    chunks.push(chunk.join(""));

    if (styles.length > 0) {
        const errMsg = `Chalk template literal is missing ${styles.length} closing bracket${styles.length === 1 ? "" : "s"} (\`}\`)`;
        throw new Error(errMsg);
    }

    return chunks.join("");
};


const matchOperatorsRe = /[|\\{}()[\]^$+*?.]/g;

const escapeStringRegexp = function (str) {
    if (!is.string(str)) {
        throw new TypeError("Expected a string");
    }

    return str.replace(matchOperatorsRe, "\\$&");
};

const isSimpleWindowsTerm = is.windows && !(process.env.TERM || "").toLowerCase().startsWith("xterm");

// `supportsColor.level` → `esc.color[name]` mapping
const levelMapping = ["ansi", "ansi", "ansi256", "ansi16m"];

// `color-convert` models to exclude from the Chalk API due to conflicts and such
const skipModels = new Set(["gray"]);

const styles = Object.create(null);

// Use bright blue on Windows as the normal blue color is illegible
if (isSimpleWindowsTerm) {
    esc.blue.open = "\u001B[94m";
}

for (const key of Object.keys(esc)) {
    esc[key].closeRe = new RegExp(escapeStringRegexp(esc[key].close), "g");

    styles[key] = {
        get() {
            const codes = esc[key];
            return build.call(this, [...(this._styles || []), codes], this._empty, key);
        }
    };
}

styles.visible = {
    get() {
        return build.call(this, this._styles || [], true, "visible");
    }
};

esc.color.closeRe = new RegExp(escapeStringRegexp(esc.color.close), "g");
for (const model of Object.keys(esc.color.ansi)) {
    if (skipModels.has(model)) {
        continue;
    }

    styles[model] = {
        get() {
            const level = this.level;
            return function (...args) {
                const open = esc.color[levelMapping[level]][model](...args);
                const codes = {
                    open,
                    close: esc.color.close,
                    closeRe: esc.color.closeRe
                };
                return build.call(this, [...(this._styles || []), codes], this._empty, model);
            };
        }
    };
}

esc.bgColor.closeRe = new RegExp(escapeStringRegexp(esc.bgColor.close), "g");
for (const model of Object.keys(esc.bgColor.ansi)) {
    if (skipModels.has(model)) {
        continue;
    }

    const bgModel = `bg${model[0].toUpperCase()}${model.slice(1)}`;
    styles[bgModel] = {
        get() {
            const level = this.level;
            return function (...args) {
                const open = esc.bgColor[levelMapping[level]][model](...args);
                const codes = {
                    open,
                    close: esc.bgColor.close,
                    closeRe: esc.bgColor.closeRe
                };
                return build.call(this, [...(this._styles || []), codes], this._empty, model);
            };
        }
    };
}

const applyStyle = function (...args) {
    let string = args.join(" ");

    if (!this.enabled || this.level <= 0 || !string) {
        return this._empty ? "" : string;
    }

    // Turns out that on Windows dimmed gray text becomes invisible in cmd.exe,
    // see https://github.com/chalk/chalk/issues/58
    // If we're on Windows and we're dealing with a gray color, temporarily make 'dim' a noop.
    const originalDim = esc.dim.open;
    if (isSimpleWindowsTerm && this.hasGrey) {
        esc.dim.open = "";
    }

    for (const code of this._styles.slice().reverse()) {
        // Replace any instances already present with a re-opening code
        // otherwise only the part of the string until said closing code
        // will be colored, and the rest will simply be 'plain'.
        string = code.open + string.replace(code.closeRe, code.open) + code.close;

        // Close the styling before a linebreak and reopen
        // after next line to fix a bleed issue on macOS
        // https://github.com/chalk/chalk/pull/92
        string = string.replace(/\r?\n/g, `${code.close}$&${code.open}`);
    }

    // Reset the original `dim` if we changed it to work around the Windows dimmed gray issue
    esc.dim.open = originalDim;

    return string;
};

const proto = Object.defineProperties(() => { }, styles);

const build = function (_styles, _empty, key) {
    const builder = function (...args) {
        return applyStyle.apply(builder, args);
    };

    builder._styles = _styles;
    builder._empty = _empty;

    const self = this;

    Object.defineProperty(builder, "level", {
        enumerable: true,
        get() {
            return self.level;
        },
        set(level) {
            self.level = level;
        }
    });

    Object.defineProperty(builder, "enabled", {
        enumerable: true,
        get() {
            return self.enabled;
        },
        set(enabled) {
            self.enabled = enabled;
        }
    });

    // See below for fix regarding invisible grey/dim combination on Windows
    builder.hasGrey = this.hasGrey || key === "gray" || key === "grey";

    // `__proto__` is used because we must return a function, but there is
    // no way to create a function with a different prototype
    builder.__proto__ = proto; // eslint-disable-line no-proto

    return builder;
};

const applyOptions = (instance, { enabled, level } = {}) => {
    if (level > 3 || level < 0) {
        throw new adone.error.InvalidArgumentException("The 'level' option should be an integer from 0 to 3");
    }
    const scLevel = stats.stdout ? stats.stdout.level : 0;
    instance.level = is.undefined(level) ? scLevel : level;
    instance.enabled = is.undefined(enabled) ? instance.level > 0 : enabled;
};

const chalkTag = function (chalk, strings) {
    if (!is.array(strings)) {
        // If chalk() was called by itself or with a string,
        // return the string itself as a string.
        return [].slice.call(arguments, 1).join(" ");
    }

    const args = [].slice.call(arguments, 2);
    const parts = [strings.raw[0]];

    for (let i = 1; i < strings.length; i++) {
        parts.push(
            String(args[i - 1]).replace(/[{}\\]/g, "\\$&"),
            String(strings.raw[i])
        );
    }

    return template(chalk, parts.join(""));
};

const Chalk = function (options) {
    // We check for this.template here since calling `chalk.constructor()`
    // by itself will have a `this` of a previously constructed chalk object
    if (!this || !(this instanceof Chalk) || this.template) {
        const chalk = {};
        applyOptions(chalk, options);

        chalk.template = function (...args) {
            return chalkTag(...[chalk.template, ...args]);
        };

        Object.setPrototypeOf(chalk, Chalk.prototype);
        Object.setPrototypeOf(chalk.template, chalk);

        chalk.template.constructor = Chalk;

        return chalk.template;
    }

    applyOptions(this, options);
};

Object.defineProperties(Chalk.prototype, styles);

export default Chalk;
