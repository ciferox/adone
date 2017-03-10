

const conversions = require("./conversions");
const route = require("./route");

const colorConvert = {};

const models = Object.keys(conversions);

function wrapRaw(fn) {
    const wrappedFn = function (args) {
        if (args === undefined || args === null) {
            return args;
        }

        if (arguments.length > 1) {
            args = Array.prototype.slice.call(arguments);
        }

        return fn(args);
    };

	// preserve .conversion property if there is one
    if ("conversion" in fn) {
        wrappedFn.conversion = fn.conversion;
    }

    return wrappedFn;
}

function wrapRounded(fn) {
    const wrappedFn = function (args) {
        if (args === undefined || args === null) {
            return args;
        }

        if (arguments.length > 1) {
            args = Array.prototype.slice.call(arguments);
        }

        const result = fn(args);

		// we're assuming the result is an array here.
		// see notice in conversions.js; don't use box types
		// in conversion functions.
        if (typeof result === "object") {
            for (let len = result.length, i = 0; i < len; i++) {
                result[i] = Math.round(result[i]);
            }
        }

        return result;
    };

	// preserve .conversion property if there is one
    if ("conversion" in fn) {
        wrappedFn.conversion = fn.conversion;
    }

    return wrappedFn;
}

models.forEach((fromModel) => {
    colorConvert[fromModel] = {};

    Object.defineProperty(colorConvert[fromModel], "channels", { value: conversions[fromModel].channels });
    Object.defineProperty(colorConvert[fromModel], "labels", { value: conversions[fromModel].labels });

    const routes = route(fromModel);
    const routeModels = Object.keys(routes);

    routeModels.forEach((toModel) => {
        const fn = routes[toModel];

        colorConvert[fromModel][toModel] = wrapRounded(fn);
        colorConvert[fromModel][toModel].raw = wrapRaw(fn);
    });
});


const env = process.env;

const support = (level) => {
    if (level === 0) {
        return false;
    }

    return {
        level,
        hasBasic: true,
        has256: level >= 2,
        has16m: level >= 3
    };
};

let supportLevel = (() => {
    if (process.stdout && !process.stdout.isTTY) {
        return 0;
    }

    if (process.platform === "win32") {
        return 1;
    }

    if ("CI" in env) {
        if ("TRAVIS" in env || env.CI === "Travis") {
            return 1;
        }

        return 0;
    }

    if ("TEAMCITY_VERSION" in env) {
        return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION) ? 1 : 0;
    }

    if ("TERM_PROGRAM" in env) {
        const version = parseInt((env.TERM_PROGRAM_VERSION || "").split(".")[0], 10);

        switch (env.TERM_PROGRAM) {
            case "iTerm.app":
                return version >= 3 ? 3 : 2;
            case "Hyper":
                return 3;
            case "Apple_Terminal":
                return 2;
			// no default
        }
    }

    if (/^(screen|xterm)-256(?:color)?/.test(env.TERM)) {
        return 2;
    }

    if (/^screen|^xterm|^vt100|color|ansi|cygwin|linux/i.test(env.TERM)) {
        return 1;
    }

    if ("COLORTERM" in env) {
        return 1;
    }

    if (env.TERM === "dumb") {
        return 0;
    }

    return 0;
})();

if ("FORCE_COLOR" in env) {
    supportLevel = parseInt(env.FORCE_COLOR, 10) === 0 ? 0 : (supportLevel || 1);
}

const supportsColor = process && support(supportLevel);


const wrapAnsi16 = (fn, offset) => function (...args) {
    const code = fn.apply(colorConvert, args);
    return `\u001B[${code + offset}m`;
};

const wrapAnsi256 = (fn, offset) => function (...args) {
    const code = fn.apply(colorConvert, args);
    return `\u001B[${38 + offset};5;${code}m`;
};

const wrapAnsi16m = (fn, offset) => function (...args) {
    const rgb = fn.apply(colorConvert, args);
    return `\u001B[${38 + offset};2;${rgb[0]};${rgb[1]};${rgb[2]}m`;
};

const ansiStyles = {
    modifier: {
        reset: [0, 0],
        // 21 isn't widely supported and 22 does the same thing
        bold: [1, 22],
        dim: [2, 22],
        italic: [3, 23],
        underline: [4, 24],
        inverse: [7, 27],
        hidden: [8, 28],
        strikethrough: [9, 29]
    },
    color: {
        black: [30, 39],
        red: [31, 39],
        green: [32, 39],
        yellow: [33, 39],
        blue: [34, 39],
        magenta: [35, 39],
        cyan: [36, 39],
        white: [37, 39],
        gray: [90, 39]
    },
    bgColor: {
        bgBlack: [40, 49],
        bgRed: [41, 49],
        bgGreen: [42, 49],
        bgYellow: [43, 49],
        bgBlue: [44, 49],
        bgMagenta: [45, 49],
        bgCyan: [46, 49],
        bgWhite: [47, 49]
    }
};

// fix humans
ansiStyles.color.grey = ansiStyles.color.gray;

Object.keys(ansiStyles).forEach((groupName) => {
    const group = ansiStyles[groupName];

    Object.keys(group).forEach((styleName) => {
        const style = group[styleName];

        ansiStyles[styleName] = group[styleName] = {
            open: `\u001B[${style[0]}m`,
            close: `\u001B[${style[1]}m`
        };
    });

    Object.defineProperty(ansiStyles, groupName, {
        value: group,
        enumerable: false
    });
});

const rgb2rgb = (r, g, b) => [r, g, b];

ansiStyles.color.close = "\u001B[39m";
ansiStyles.bgColor.close = "\u001B[49m";

ansiStyles.color.ansi = {};
ansiStyles.color.ansi256 = {};
ansiStyles.color.ansi16m = {
    rgb: wrapAnsi16m(rgb2rgb, 0)
};

ansiStyles.bgColor.ansi = {};
ansiStyles.bgColor.ansi256 = {};
ansiStyles.bgColor.ansi16m = {
    rgb: wrapAnsi16m(rgb2rgb, 10)
};

for (const key of Object.keys(colorConvert)) {
    if (typeof colorConvert[key] !== "object") {
        continue;
    }

    const suite = colorConvert[key];

    if ("ansi16" in suite) {
        ansiStyles.color.ansi[key] = wrapAnsi16(suite.ansi16, 0);
        ansiStyles.bgColor.ansi[key] = wrapAnsi16(suite.ansi16, 10);
    }

    if ("ansi256" in suite) {
        ansiStyles.color.ansi256[key] = wrapAnsi256(suite.ansi256, 0);
        ansiStyles.bgColor.ansi256[key] = wrapAnsi256(suite.ansi256, 10);
    }

    if ("rgb" in suite) {
        ansiStyles.color.ansi16m[key] = wrapAnsi16m(suite.rgb, 0);
        ansiStyles.bgColor.ansi16m[key] = wrapAnsi16m(suite.rgb, 10);
    }
}



const defineProps = Object.defineProperties;
const isSimpleWindowsTerm = process.platform === "win32" && !/^xterm/i.test(process.env.TERM);

function Chalk(options) {
    // detect mode if not set manually
    this.enabled = !options || options.enabled === undefined ? supportsColor : options.enabled;
}

// use bright blue on Windows as the normal blue color is illegible
if (isSimpleWindowsTerm) {
    ansiStyles.blue.open = "\u001b[94m";
}

const styles = {};

Object.keys(ansiStyles).forEach((key) => {
    ansiStyles[key].closeRe = new RegExp(adone.text.escapeStringRegexp(ansiStyles[key].close), "g");

    styles[key] = {
        get() {
            return build.call(this, this._styles ? this._styles.concat(key) : [key]);
        }
    };
});

// eslint-disable-next-line func-names
const proto = defineProps(function chalk() { }, styles);

function build(_styles) {
    const builder = function (...args) {
        return applyStyle.apply(builder, args);
    };

    const self = this;

    builder._styles = _styles;

    Object.defineProperty(builder, "enabled", {
        enumerable: true,
        get() {
            return self.enabled;
        },
        set(v) {
            self.enabled = v;
        }
    });

    // __proto__ is used because we must return a function, but there is
    // no way to create a function with a different prototype.
    /* eslint-disable no-proto */
    builder.__proto__ = proto;

    return builder;
}

function applyStyle(...args) {
    // support varags, but simply cast to string in case there's only one arg
    const argsLen = args.length;
    let str = argsLen !== 0 && String(args[0]);

    if (argsLen > 1) {
        // don't slice `arguments`, it prevents v8 optimizations
        for (let a = 1; a < argsLen; a++) {
            str += ` ${args[a]}`;
        }
    }

    if (!this.enabled || !str) {
        return str;
    }

    const nestedStyles = this._styles;
    let i = nestedStyles.length;

    // Turns out that on Windows dimmed gray text becomes invisible in cmd.exe,
    // see https://github.com/chalk/chalk/issues/58
    // If we're on Windows and we're dealing with a gray color, temporarily make 'dim' a noop.
    const originalDim = ansiStyles.dim.open;
    if (isSimpleWindowsTerm && (nestedStyles.indexOf("gray") !== -1 || nestedStyles.indexOf("grey") !== -1)) {
        ansiStyles.dim.open = "";
    }

    while (i--) {
        const code = ansiStyles[nestedStyles[i]];

        // Replace any instances already present with a re-opening code
        // otherwise only the part of the string until said closing code
        // will be colored, and the rest will simply be 'plain'.
        str = code.open + str.replace(code.closeRe, code.open) + code.close;

        // Close the styling before a linebreak and reopen
        // after next line to fix a bleed issue on macOS
        // https://github.com/chalk/chalk/pull/92
        str = str.replace(/\r?\n/g, `${code.close}$&${code.open}`);
    }

    // Reset the original 'dim' if we changed it to work around the Windows dimmed gray issue.
    ansiStyles.dim.open = originalDim;

    return str;
}

defineProps(Chalk.prototype, styles);

module.exports = new Chalk();
module.exports.styles = ansiStyles;
module.exports.supportsColor = supportsColor;
