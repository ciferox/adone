const { FORCE_COLOR, NODE_DISABLE_COLORS, TERM } = process.env;

const $ = {
    enabled: !NODE_DISABLE_COLORS && TERM !== "dumb" && FORCE_COLOR !== "0"
};

const code = (open, close) => ({
    open: `\x1b[${open}m`,
    close: `\x1b[${close}m`,
    rgx: new RegExp(`\\x1b\\[${close}m`, "g")
});

const CODES = {
    // modifiers
    reset: code(0, 0),
    bold: code(1, 22),
    dim: code(2, 22),
    italic: code(3, 23),
    underline: code(4, 24),
    inverse: code(7, 27),
    hidden: code(8, 28),
    strikethrough: code(9, 29),

    // colors
    black: code(30, 39),
    red: code(31, 39),
    green: code(32, 39),
    yellow: code(33, 39),
    blue: code(34, 39),
    magenta: code(35, 39),
    cyan: code(36, 39),
    white: code(37, 39),
    gray: code(90, 39),

    // background colors
    bgBlack: code(40, 49),
    bgRed: code(41, 49),
    bgGreen: code(42, 49),
    bgYellow: code(43, 49),
    bgBlue: code(44, 49),
    bgMagenta: code(45, 49),
    bgCyan: code(46, 49),
    bgWhite: code(47, 49)
};

const run = function (arr, str) {
    let i = 0; let tmp = {};
    for (; i < arr.length;) {
        tmp = Reflect.get(CODES, arr[i++]);
        str = tmp.open + str.replace(tmp.rgx, tmp.open) + tmp.close;
    }
    return str;
}

const chain = function (keys) {
    const ctx = { keys };

    ctx.reset = $.reset.bind(ctx);
    ctx.bold = $.bold.bind(ctx);
    ctx.dim = $.dim.bind(ctx);
    ctx.italic = $.italic.bind(ctx);
    ctx.underline = $.underline.bind(ctx);
    ctx.inverse = $.inverse.bind(ctx);
    ctx.hidden = $.hidden.bind(ctx);
    ctx.strikethrough = $.strikethrough.bind(ctx);

    ctx.black = $.black.bind(ctx);
    ctx.red = $.red.bind(ctx);
    ctx.green = $.green.bind(ctx);
    ctx.yellow = $.yellow.bind(ctx);
    ctx.blue = $.blue.bind(ctx);
    ctx.magenta = $.magenta.bind(ctx);
    ctx.cyan = $.cyan.bind(ctx);
    ctx.white = $.white.bind(ctx);
    ctx.gray = $.gray.bind(ctx);

    ctx.bgBlack = $.bgBlack.bind(ctx);
    ctx.bgRed = $.bgRed.bind(ctx);
    ctx.bgGreen = $.bgGreen.bind(ctx);
    ctx.bgYellow = $.bgYellow.bind(ctx);
    ctx.bgBlue = $.bgBlue.bind(ctx);
    ctx.bgMagenta = $.bgMagenta.bind(ctx);
    ctx.bgCyan = $.bgCyan.bind(ctx);
    ctx.bgWhite = $.bgWhite.bind(ctx);

    return ctx;
};

const init = (key) => function (txt) {
    const isChain = this !== void 0 && Boolean(this.keys);
    if (isChain) {
        this.keys.includes(key) || this.keys.push(key);
    }
    if (txt !== void 0) {
        return $.enabled ? run(isChain ? this.keys : [key], String(txt)) : `${txt}`;
    }
    return isChain ? this : chain([key]);
};


for (const key in CODES) {
    Object.defineProperty($, key, {
        value: init(key),
        enumerable: true,
        writable: false
    });
}

export default $;
