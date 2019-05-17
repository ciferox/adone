const {
    is
} = adone;

const utils = require("./utils");
const colors = require("./colors");

const styles = {
    default: colors.noop,
    noop: colors.noop,

    /**
   * Modifiers
   */

    set inverse(custom) {
        this._inverse = custom;
    },
    get inverse() {
        return this._inverse || utils.inverse(this.primary);
    },

    set complement(custom) {
        this._complement = custom;
    },
    get complement() {
        return this._complement || utils.complement(this.primary);
    },

    /**
   * Main color
   */

    primary: colors.cyan,

    /**
   * Main palette
   */

    success: colors.green,
    danger: colors.magenta,
    strong: colors.bold,
    warning: colors.yellow,
    muted: colors.dim,
    disabled: colors.gray,
    dark: colors.dim.gray,
    underline: colors.underline,

    set info(custom) {
        this._info = custom;
    },
    get info() {
        return this._info || this.primary;
    },

    set em(custom) {
        this._em = custom;
    },
    get em() {
        return this._em || this.primary.underline;
    },

    /**
   * Statuses
   */

    set pending(custom) {
        this._pending = custom;
    },
    get pending() {
        return this._pending || this.primary;
    },

    set submitted(custom) {
        this._submitted = custom;
    },
    get submitted() {
        return this._submitted || this.success;
    },

    set cancelled(custom) {
        this._cancelled = custom;
    },
    get cancelled() {
        return this._cancelled || this.danger;
    },

    /**
   * Special styling
   */

    set typing(custom) {
        this._typing = custom;
    },
    get typing() {
        return this._typing || this.dim;
    },

    set placeholder(custom) {
        this._placeholder = custom;
    },
    get placeholder() {
        return this._placeholder || this.primary.dim;
    },

    set highlight(custom) {
        this._highlight = custom;
    },
    get highlight() {
        return this._highlight || this.inverse;
    }
};

styles.merge = (options = {}) => {
    if (options.styles && is.boolean(options.styles.enabled)) {
        colors.enabled = options.styles.enabled;
    }
    if (options.styles && is.boolean(options.styles.visible)) {
        colors.visible = options.styles.visible;
    }

    const result = utils.merge({}, styles, options.styles);
    delete result.merge;

    for (const key of Object.keys(colors)) {
        if (!result.hasOwnProperty(key)) {
            Reflect.defineProperty(result, key, { get: () => colors[key] });
        }
    }

    for (const key of Object.keys(colors.styles)) {
        if (!result.hasOwnProperty(key)) {
            Reflect.defineProperty(result, key, { get: () => colors[key] });
        }
    }
    return result;
};

module.exports = styles;
