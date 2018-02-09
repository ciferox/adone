const {
    is,
    terminal: {
        esc
    }
} = adone;

const matchOperatorsRe = /[|\\{}()[\]^$+*?.]/g;

const escapeStringRegexp = function (str) {
    if (!is.string(str)) {
        throw new TypeError("Expected a string");
    }

    return str.replace(matchOperatorsRe, "\\$&");
};
// const template = require("./templates.js");

const isSimpleWindowsTerm = process.platform === "win32" && !(process.env.TERM || "").toLowerCase().startsWith("xterm");

// `supportsColor.level` → `ansiStyles.color[name]` mapping
const levelMapping = ["ansi", "ansi", "ansi256", "ansi16m"];

// `color-convert` models to exclude from the Chalk API due to conflicts and such
const skipModels = new Set(["gray"]);

const styles = Object.create(null);

// Use bright blue on Windows as the normal blue color is illegible
if (isSimpleWindowsTerm) {
    esc.blue.open = "\u001B[94m"; // TODO: ??????
}

for (const key of Object.keys(esc)) {
    esc[key].closeRe = new RegExp(escapeStringRegexp(esc[key].close), "g");

    styles[key] = {
        get() {
            const codes = esc[key];
            return build.call(this, this._styles ? this._styles.concat(codes) : [codes], this._empty, key);
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
                return build.call(this, this._styles ? this._styles.concat(codes) : [codes], this._empty, model);
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
                return build.call(this, this._styles ? this._styles.concat(codes) : [codes], this._empty, model);
            };
        }
    };
}

const applyStyle = function (...args) {
    // Support varags, but simply cast to string in case there's only one arg
    const argsLen = args.length;
    let str = String(args[0]);

    if (argsLen === 0) {
        return "";
    }

    if (argsLen > 1) {
        // Don't slice `arguments`, it prevents V8 optimizations
        for (let a = 1; a < argsLen; a++) {
            str += ` ${args[a]}`;
        }
    }

    if (!this.enabled || this.level <= 0 || !str) {
        return this._empty ? "" : str;
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
        str = code.open + str.replace(code.closeRe, code.open) + code.close;

        // Close the styling before a linebreak and reopen
        // after next line to fix a bleed issue on macOS
        // https://github.com/chalk/chalk/pull/92
        str = str.replace(/\r?\n/g, `${code.close}$&${code.open}`);
    }

    // Reset the original `dim` if we changed it to work around the Windows dimmed gray issue
    esc.dim.open = originalDim;

    return str;
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

// function chalkTag(chalk, strings) {
//     if (!is.array(strings)) {
//         // If chalk() was called by itself or with a string,
//         // return the string itself as a string.
//         return [].slice.call(arguments, 1).join(" ");
//     }

//     const args = [].slice.call(arguments, 2);
//     const parts = [strings.raw[0]];

//     for (let i = 1; i < strings.length; i++) {
//         parts.push(String(args[i - 1]).replace(/[{}\\]/g, "\\$&"));
//         parts.push(String(strings.raw[i]));
//     }

//     return template(chalk, parts.join(""));
// }

export default class Chalk {
    constructor({ enabled, level } = {}) {
        // Detect level if not set manually
        const scLevel = adone.runtime.term.level;
        this.level = is.undefined(level) ? scLevel : level;
        this.enabled = is.undefined(enabled) ? this.level > 0 : enabled;
    }
}

Object.defineProperties(Chalk.prototype, styles);
