import Terminfo from "./terminfo";

const {
    is,
    std: { fs, string_decoder: stringDecoder },
} = adone;

const COLOR_SCHEME = Symbol();
const BAR = Symbol();
const SILENT = Symbol();
const ACTIVE_PROMPT = Symbol();

const env = process.env;

// Resources:
//   $ man term
//   $ man terminfo
//   http://invisible-island.net/ncurses/man/term.5.html
//   https://en.wikipedia.org/wiki/Terminfo

// Todo:
// - xterm's XT (set-title capability?) value should
//   be true (at least tmux thinks it should).
//   It's not parsed as true. Investigate.
// - Possibly switch to other method of finding the
//   extended data string table: i += h.symOffsetCount * 2;

const noop = () => "";
noop.unsupported = true;


/**
 * Some patterns seen in terminal key escape codes, derived from combos seen
 * at http://www.midnight-commander.org/browser/lib/tty/key.c
 *
 * ESC letter
 * ESC [ letter
 * ESC [ modifier letter
 * ESC [ 1 ; modifier letter
 * ESC [ num char
 * ESC [ num ; modifier char
 * ESC O letter
 * ESC O modifier letter
 * ESC O 1 ; modifier letter
 * ESC N letter
 * ESC [ [ num ; modifier char
 * ESC [ [ 1 ; modifier letter
 * ESC ESC [ num char
 * ESC ESC O letter
 *
 * - char is usually ~ but $ and ^ also happen with rxvt
 * - modifier is 1 +
 * (shift     * 1) +
 * (left_alt  * 2) +
 * (ctrl      * 4) +
 * (right_alt * 8)
 * - two leading ESCs apparently mean the same as one leading ESC
 */

// Regexes used for ansi escape code splitting
const metaKeyCodeReAnywhere = /(?:\x1b)([a-zA-Z0-9])/;
const metaKeyCodeRe = new RegExp(`^${metaKeyCodeReAnywhere.source}$`);
const functionKeyCodeReAnywhere = new RegExp(`(?:\x1b+)(O|N|\\[|\\[\\[)(?:${[
    "(\\d+)(?:;(\\d+))?([~^$])",
    "(?:M([@ #!a`])(.)(.))", // mouse
    "(?:1;)?(\\d+)?([a-zA-Z])"
].join("|")})`);
const functionKeyCodeRe = new RegExp(`^${functionKeyCodeReAnywhere.source}`);
const escapeCodeReAnywhere = new RegExp([
    functionKeyCodeReAnywhere.source, metaKeyCodeReAnywhere.source, /\x1b./.source
].join("|"));

const isMouse = (s) => {
    return /\x1b\[M/.test(s)
        || /\x1b\[M([\x00\u0020-\uffff]{3})/.test(s)
        || /\x1b\[(\d+;\d+;\d+)M/.test(s)
        || /\x1b\[<(\d+;\d+;\d+)([mM])/.test(s)
        || /\x1b\[<(\d+;\d+;\d+;\d+)&w/.test(s)
        || /\x1b\[24([0135])~\[(\d+),(\d+)\]\r/.test(s)
        || /\x1b\[(O|I)/.test(s);
};

const emitKeys = (stream, s) => {
    if (is.buffer(s)) {
        if (s[0] > 127 && is.undefined(s[1])) {
            s[0] -= 128;
            s = `\x1b${s.toString(stream.encoding || "utf-8")}`;
        } else {
            s = s.toString(stream.encoding || "utf-8");
        }
    }

    if (isMouse(s)) {
        return;
    }

    let buffer = [];
    let match;
    while (match = escapeCodeReAnywhere.exec(s)) {
        buffer = buffer.concat(s.slice(0, match.index).split(""));
        buffer.push(match[0]);
        s = s.slice(match.index + match[0].length);
    }
    buffer = buffer.concat(s.split(""));

    buffer.forEach((s) => {
        let ch;
        let key = {
            sequence: s,
            name: undefined,
            ctrl: false,
            meta: false,
            shift: false
        };
        let parts;

        if (s === "\r") {
            // carriage return
            key.name = "return";
        } else if (s === "\n") {
            // enter, should have been called linefeed
            key.name = "enter";
            // linefeed
            // key.name = 'linefeed';
        } else if (s === "\t") {
            // tab
            key.name = "tab";
        } else if (s === "\b" || s === "\x7f" || s === "\x1b\x7f" || s === "\x1b\b") {
            // backspace or ctrl+h
            key.name = "backspace";
            key.alt = (s.charAt(0) === "\x1b");
        } else if (s === "\x1b" || s === "\x1b\x1b") {
            // escape key
            key.name = "escape";
            key.alt = (s.length === 2);
        } else if (s === " " || s === "\x1b ") {
            key.name = "space";
            key.alt = (s.length === 2);
        } else if (s.length === 1 && s <= "\x1a") {
            // ctrl+letter
            key.name = String.fromCharCode(s.charCodeAt(0) + "a".charCodeAt(0) - 1);
            key.ctrl = true;
        } else if (s.length === 1 && s >= "a" && s <= "z") {
            // lowercase letter
            key.name = s;
        } else if (s.length === 1 && s >= "A" && s <= "Z") {
            // shift+letter
            key.name = s.toLowerCase();
            key.shift = true;
        } else if (parts = metaKeyCodeRe.exec(s)) {
            // meta+character key
            key.name = parts[1].toLowerCase();
            key.alt = true;
            key.shift = /^[A-Z]$/.test(parts[1]);
        } else if (parts = functionKeyCodeRe.exec(s)) {
            // ansi escape sequence

            // reassemble the key code leaving out leading \x1b's,
            // the modifier key bitflag and any meaningless "1;" sequence
            const code = (parts[1] || "") + (parts[2] || "") + (parts[4] || "") + (parts[9] || "");
            const modifier = (parts[3] || parts[8] || 1) - 1;
            // Parse the key modifier
            key.ctrl = Boolean(modifier & 4);
            key.alt = Boolean(modifier & 10);
            key.shift = Boolean(modifier & 1);
            key.code = code;

            // Parse the key itself
            switch (code) {
                /* xterm/gnome ESC O letter */
                case "OP": key.name = "f1"; break;
                case "OQ": key.name = "f2"; break;
                case "OR": key.name = "f3"; break;
                case "OS": key.name = "f4"; break;

                /* xterm/eterm/rxvt ESC [ number ~ */
                case "[11~": key.name = "f1"; break;
                case "[12~": key.name = "f2"; break;
                case "[13~": key.name = "f3"; break;
                case "[14~": key.name = "f4"; break;

                /* linux terminal & from Cygwin and used in libuv */
                case "[[A": key.name = "f1"; break;
                case "[[B": key.name = "f2"; break;
                case "[[C": key.name = "f3"; break;
                case "[[D": key.name = "f4"; break;
                case "[[E": key.name = "f5"; break;

                /* common */
                case "[15~": key.name = "f5"; break;
                case "[17~": key.name = "f6"; break;
                case "[18~": key.name = "f7"; break;
                case "[19~": key.name = "f8"; break;
                case "[20~": key.name = "f9"; break;
                case "[21~": key.name = "f10"; break;
                case "[22~":
                case "[23~": key.name = "f11"; break;
                case "[24~": key.name = "f12"; break;

                /* xterm ESC [ letter */
                case "[A": key.name = "up"; break;
                case "[B": key.name = "down"; break;
                case "[C": key.name = "right"; break;
                case "[D": key.name = "left"; break;
                case "[E": key.name = "clear"; break;
                case "[F": key.name = "end"; break;
                case "[H": key.name = "home"; break;

                /* xterm/gnome ESC O letter */
                case "OA": key.name = "up"; break;
                case "OB": key.name = "down"; break;
                case "OC": key.name = "right"; break;
                case "OD": key.name = "left"; break;
                case "OE": key.name = "clear"; break;
                case "OF": key.name = "end"; break;
                case "OH": key.name = "home"; break;

                /* xterm/rxvt ESC [ number ~ */
                case "[1~": key.name = "home"; break;
                case "[2~": key.name = "insert"; break;
                case "[3~": key.name = "delete"; break;
                case "[4~": key.name = "end"; break;
                case "[5~": key.name = "pageup"; break;
                case "[6~": key.name = "pagedown"; break;

                /* putty */
                case "[[5~": key.name = "pageup"; break;
                case "[[6~": key.name = "pagedown"; break;

                /* rxvt */
                case "[7~": key.name = "home"; break;
                case "[8~": key.name = "end"; break;

                /* rxvt keys with modifiers */
                case "[a": key.name = "up"; key.shift = true; break;
                case "[b": key.name = "down"; key.shift = true; break;
                case "[c": key.name = "right"; key.shift = true; break;
                case "[d": key.name = "left"; key.shift = true; break;
                case "[e": key.name = "clear"; key.shift = true; break;

                case "[2$": key.name = "insert"; key.shift = true; break;
                case "[3$": key.name = "delete"; key.shift = true; break;
                case "[5$": key.name = "pageup"; key.shift = true; break;
                case "[6$": key.name = "pagedown"; key.shift = true; break;
                case "[7$": key.name = "home"; key.shift = true; break;
                case "[8$": key.name = "end"; key.shift = true; break;

                case "Oa": key.name = "up"; key.ctrl = true; break;
                case "Ob": key.name = "down"; key.ctrl = true; break;
                case "Oc": key.name = "right"; key.ctrl = true; break;
                case "Od": key.name = "left"; key.ctrl = true; break;
                case "Oe": key.name = "clear"; key.ctrl = true; break;

                case "[2^": key.name = "insert"; key.ctrl = true; break;
                case "[3^": key.name = "delete"; key.ctrl = true; break;
                case "[5^": key.name = "pageup"; key.ctrl = true; break;
                case "[6^": key.name = "pagedown"; key.ctrl = true; break;
                case "[7^": key.name = "home"; key.ctrl = true; break;
                case "[8^": key.name = "end"; key.ctrl = true; break;

                case "Oo": key.name = "kp_div"; break;
                case "Oj": key.name = "kp_mul"; break;
                case "Om": key.name = "kp_minus"; break;
                case "Ok": key.name = "kp_plus"; break;
                case "OM": key.name = "kp_return"; break;

                /* misc. */
                case "[Z": key.name = "tab"; key.shift = true; break;
                default: key.name = "undefined"; break;
            }
        }

        // Don't emit a key if no name was found
        if (is.undefined(key.name)) {
            key = undefined;
        }

        if (s.length === 1) {
            ch = s;
        }

        if (key || ch) {
            stream.emit("keypress", ch, key);
            // if (key && key.name === 'return') {
            //   var nkey = {};
            //   Object.keys(key).forEach(function(k) {
            //     nkey[k] = key[k];
            //   });
            //   nkey.name = 'enter';
            //   stream.emit('keypress', ch, nkey);
            // }
        }
    });
};

let forceColor;

if ("FORCE_COLOR" in env) {
    forceColor = env.FORCE_COLOR.length === 0 || parseInt(env.FORCE_COLOR, 10) !== 0;
}

const supportsColor = function (stream) {
    if (forceColor === false) {
        return 0;
    }

    if (stream && !stream.isTTY && forceColor !== true) {
        return 0;
    }

    const min = forceColor ? 1 : 0;

    if (is.windows) {
        const osRelease = adone.std.os.release().split(".");
        if (
            Number(process.versions.node.split(".")[0]) >= 8 &&
            Number(osRelease[0]) >= 10 &&
            Number(osRelease[2]) >= 10586
        ) {
            return Number(osRelease[2]) >= 14931 ? 3 : 2;
        }

        return 1;
    }

    if (env.COLORTERM === "truecolor") {
        return 3;
    }

    if ("TERM_PROGRAM" in env) {
        const version = parseInt((env.TERM_PROGRAM_VERSION || "").split(".")[0], 10);

        switch (env.TERM_PROGRAM) {
            case "iTerm.app":
                return version >= 3 ? 3 : 2;
            case "Apple_Terminal":
                return 2;
            // No default
        }
    }

    if (/-256(color)?$/i.test(env.TERM)) {
        return 2;
    }

    if (/^screen|^xterm|^vt100|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM)) {
        return 1;
    }

    if ("COLORTERM" in env) {
        return 1;
    }

    if (env.TERM === "dumb") {
        return min;
    }

    return min;
};

const getColorsInfo = function (stream) {
    const level = supportsColor(stream);
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

class Terminal extends adone.event.Emitter {
    constructor() {
        super();

        this[BAR] = null;
        this[SILENT] = false;
        this[ACTIVE_PROMPT] = null;
        this[COLOR_SCHEME] = adone.lazify({
            primary: () => this.chalkify("#388E3C"),
            secondary: () => this.chalkify("#2196F3"),
            accent: () => this.chalkify("#7C4DFF"),
            focus: () => this.chalkify("#009688"),
            inactive: () => this.chalkify("#616161"),
            error: () => this.chalkify("#D32F2F"),
            warn: () => this.chalkify("#FF5722"),
            info: () => this.chalkify("#FFEB3B"),
            notice: () => this.chalkify("#FFEB3B")
        }, null);

        this._native = null;
        this.useBuffer = false;
        this._resizeTimeout = 0;
        this.grabbing = false;
        this.timeout = 200;	// 200ms timeout by default, so ssh can work without trouble
        this.hasProcessOnExit = false;
        this.lock = {};
        this._logger = null;
        this.x = 0;
        this.y = 0;
        this.savedX = 0;
        this.savedY = 0;
        this.scrollTop = 0;
        this._buf = "";
        this._flush = this.flush.bind(this);

        this.initialize();

        this.scrollBottom = this.stats.rows - 1;
    }

    initialize() {
        const stats = this.stats = {
            cols: 1,
            rows: 1
        };
        // OSX
        stats.isOSXTerm = env.TERM_PROGRAM === "Apple_Terminal";
        stats.isiTerm2 = env.TERM_PROGRAM === "iTerm.app" || Boolean(env.ITERM_SESSION_ID);

        // VTE
        // NOTE: lxterminal does not provide an env variable to check for.
        // NOTE: gnome-terminal and sakura use a later version of VTE
        // which provides VTE_VERSION as well as supports SGR events.
        stats.isXFCE = /xfce/i.test(env.COLORTERM);
        stats.isTerminator = Boolean(env.TERMINATOR_UUID);
        stats.isVTE = Boolean(env.VTE_VERSION) || this.isXFCE || this.isTerminator;

        // xterm and rxvt - not accurate
        stats.isRxvt = /rxvt/i.test(env.COLORTERM);

        stats.stdout = getColorsInfo(process.stdout);
        stats.stderr = getColorsInfo(process.stderr);

        this.terminfo = new Terminfo();
        this.input = process.stdin;
        this.output = process.stdout;

        if (!this.output.isTTY) {
            process.nextTick(() => {
                this.emit("warning", "Output is not a TTY");
            });
        }

        const resize = () => {
            if (is.function(this.output.getWindowSize)) {
                const windowSize = this.output.getWindowSize();
                this.stats.cols = windowSize[0];
                this.stats.rows = windowSize[1];
            } else {
                this.stats.cols = this.output.columns;
                this.stats.rows = this.output.rows;
            }
            this.emit("resize", this.stats.cols, this.stats.rows);
        };

        this.output._resizeHandler = () => {
            if (this._resizeTimeout === 0) {
                return resize();
            }
            if (this._resizeTimer) {
                clearTimeout(this._resizeTimer);
                delete this._resizeTimer;
            }
            this._resizeTimer = setTimeout(resize, this._resizeTimeout);
        };

        resize();
        if (this.output.isTTY) {
            this.output.on("resize", this.output._resizeHandler);
        } else {
            process.on("SIGWINCH", this.output._resizeHandler);
        }
        this.setMaxListeners(Infinity);
    }

    async syncCursor() {
        if (is.function(this.input.setRawMode)) {
            let needRestore = false;
            if (!this.input.isRaw) {
                this.input.setRawMode(true);
                this.input.resume();
                needRestore = true;
            }

            this.input.once("data", (data) => {
                this.emit("data", data);
            });

            const result = await this.getCursorPos();
            this.x = result.x - 1;
            this.y = result.y - 1;

            if (needRestore) {
                this.input.setRawMode(false);
                this.input.pause();
            }
        }
    }

    trackCursor(done) {
        if (is.undefined(this._trackCursor)) {
            this._trackCursor = true;
            const curPosHandler = (err, event) => {
                if (this.input.isRaw) {
                    this.input.setRawMode(false);
                    this.input.pause();
                }

                this.x = event.x - 1;
                this.y = event.y - 1;

                const newlineHandler = (count) => {
                    let newY = this.y + count;
                    if (newY >= this.stats.rows) {
                        newY = this.stats.rows - 1;
                    }
                    this.y = newY;
                };

                adone.stream.newlineCounter.install(this.output);
                adone.stream.newlineCounter.install(process.stderr);

                this.output.on("newlines:after", newlineHandler);
                process.stderr.on("newlines:after", newlineHandler);

                done();
            };

            this.input.once("data", (data) => {
                // // Pull data from input stream internal buffer, thus, after the application is completed, this data will not be flushed to terminal.
                // Buggy
                // this.input.read(data.length);
                this.emit("data", data);
            });

            if (is.function(this.input.setRawMode) && !this.input.isRaw) {
                this.input.setRawMode(true);
            }
            if (is.function(this.input.resume)) {
                this.input.resume();
            }
            this.getCursorPos(curPosHandler);
        } else if (is.function(done)) {
            process.nextTick(done);
        }
    }

    parse(text) {
        if (!/{\/?[\w\-,;!#=~]*}/.test(text)) {
            return text;
        }

        let out = "";
        let state;
        const bg = [];
        const fg = [];
        const flag = [];
        let cap;
        let slash;
        let param;
        let attr;
        let esc;

        for (; ;) {
            if (!esc && (cap = /^{escape}/.exec(text))) {
                text = text.substring(cap[0].length);
                esc = true;
                continue;
            }

            if (esc && (cap = /^([\s\S]*?){\/escape}/.exec(text))) {
                text = text.substring(cap[0].length);
                out += cap[1];
                esc = false;
                continue;
            }

            if (esc) {
                // throw new Error('Unterminated escape tag.');
                out += text;
                break;
            }

            cap = /^{(\/?)([\w\-,;!#=~]*)}/.exec(text);
            if (cap) {
                text = text.substring(cap[0].length);
                slash = cap[1] === "/";
                param = cap[2].replace(/-/g, " ");

                if (param === "open") {
                    out += "{";
                    continue;
                } else if (param === "close") {
                    out += "}";
                    continue;
                }

                if (param.slice(-3) === " bg") {
                    state = bg;
                } else if (param.slice(-3) === " fg") {
                    state = fg;
                } else {
                    state = flag;
                }

                if (slash) {
                    if (!param) {
                        out += this._attr("normal");
                        bg.length = 0;
                        fg.length = 0;
                        flag.length = 0;
                    } else {
                        attr = this._attr(param, false);
                        if (is.null(attr)) {
                            out += cap[0];
                        } else {
                            // if (param !== state[state.length - 1]) {
                            //   throw new Error('Misnested tags.');
                            // }
                            state.pop();
                            if (state.length) {
                                out += this._attr(state[state.length - 1]);
                            } else {
                                out += attr;
                            }
                        }
                    }
                } else {
                    if (!param) {
                        out += cap[0];
                    } else {
                        attr = this._attr(param);
                        if (is.null(attr)) {
                            out += cap[0];
                        } else {
                            state.push(param);
                            out += attr;
                        }
                    }
                }

                continue;
            }

            cap = /^[\s\S]+?(?={\/?[\w\-,;!#=~]*})/.exec(text);
            if (cap) {
                text = text.substring(cap[0].length);
                out += cap[0];
                continue;
            }

            out += text;
            break;
        }

        return out;
    }

    _attr(param, val) {
        let parts;

        if (is.array(param)) {
            parts = param;
            param = parts[0] || "normal";
        } else {
            param = param || "normal";
            parts = param.split(/\s*[,;]\s*/);
        }

        if (parts.length > 1) {
            const used = {};
            const out = [];

            parts.forEach((part) => {
                part = this._attr(part, val).slice(2, -1);
                if (part === "") {
                    return;
                }
                if (used[part]) {
                    return;
                }
                used[part] = true;
                out.push(part);
            });

            return `\x1b[${out.join(";")}m`;
        }

        if (param.indexOf("no ") === 0) {
            param = param.substring(3);
            val = false;
        } else if (param.indexOf("!") === 0) {
            param = param.substring(1);
            val = false;
        }

        const { esc } = adone.cli;
        const color = esc.color;
        const bgColor = esc.bgColor;

        switch (param) {
            // attributes
            case "normal":
            case "default":
                return val === false ? "" : esc.normal.open;
            case "bold":
                return val === false ? esc.bold.close : esc.bold.open;
            case "italic":
                return val === false ? esc.italic.close : esc.italic.open;
            case "dim":
                return val === false ? esc.dim.close : esc.dim.open;
            case "ul":
            case "underline":
                return val === false ? esc.underline.close : esc.underline.open;
            case "blink":
                return val === false ? esc.blink.close : esc.blink.open;
            case "inverse":
                return val === false ? esc.inverse.close : esc.inverse.open;
            case "hidden":
                return val === false ? esc.hidden.close : esc.hidden.open;

            // 8-color foreground
            case "black fg":
                return val === false ? esc.black.close : esc.black.open;
            case "red fg":
                return val === false ? esc.red.close : esc.red.open;
            case "green fg":
                return val === false ? esc.green.close : esc.green.open;
            case "yellow fg":
                return val === false ? esc.yellow.close : esc.yellow.open;
            case "blue fg":
                return val === false ? esc.blue.close : esc.blue.open;
            case "magenta fg":
                return val === false ? esc.magenta.close : esc.magenta.open;
            case "cyan fg":
                return val === false ? esc.cyan.close : esc.cyan.open;
            case "white fg":
                return val === false ? esc.white.close : esc.white.open;
            case "default fg":
                return val === false ? "" : esc.defaultColor.open;

            // 8-color background
            case "black bg":
                return val === false ? esc.bgBlack.close : esc.bgBlack.open;
            case "red bg":
                return val === false ? esc.bgRed.close : esc.bgRed.open;
            case "green bg":
                return val === false ? esc.bgGreen.close : esc.bgGreen.open;
            case "yellow bg":
                return val === false ? esc.bgYellow.close : esc.bgYellow.open;
            case "blue bg":
                return val === false ? esc.bgBlue.close : esc.bgBlue.open;
            case "magenta bg":
                return val === false ? esc.bgMagenta.close : esc.bgMagenta.open;
            case "cyan bg":
                return val === false ? esc.bgCyan.close : esc.bgCyan.open;
            case "white bg":
                return val === false ? esc.bgWhite.close : esc.bgWhite.open;
            case "default bg":
                return val === false ? "" : esc.bgDefaultColor.open;

            // 16-color foreground
            case "brightblack fg":
            case "grey fg":
            case "gray fg":
                return val === false ? esc.gray.close : esc.gray.open;
            case "redbright fg":
                return val === false ? esc.redBright.close : esc.redBright.open;
            case "greenbright fg":
                return val === false ? esc.greenBright.close : esc.greenBright.open;
            case "yellowbright fg":
                return val === false ? esc.yellowBright.close : esc.yellowBright.open;
            case "bluebright fg":
                return val === false ? esc.blueBright.close : esc.blueBright.open;
            case "magentabright fg":
                return val === false ? esc.magentaBright.close : esc.magentaBright.open;
            case "cyanbright fg":
                return val === false ? esc.cyanBright.close : esc.cyanBright.open;
            case "whitebright fg":
                return val === false ? esc.whiteBright.close : esc.whiteBright.open;

            // 16-color background
            case "brightblack bg":
            case "grey bg":
            case "gray bg":
                return val === false ? esc.bgGray.close : esc.bgGray.open;
            case "redbright bg":
                return val === false ? esc.bgRedBright.close : esc.bgRedBright.open;
            case "greenbright bg":
                return val === false ? esc.bgGreenBright.close : esc.bgGreenBright.open;
            case "yellowbright bg":
                return val === false ? esc.bgYellowBright.close : esc.bgYellowBright.open;
            case "bluebright bg":
                return val === false ? esc.bgBlueBright.close : esc.bgBlueBright.open;
            case "magentabright bg":
                return val === false ? esc.bgMagentaBright.close : esc.bgMagentaBright.open;
            case "cyanbright bg":
                return val === false ? esc.bgCyanBright.close : esc.bgCyanBright.open;
            case "whitebright bg":
                return val === false ? esc.bgWhiteBright.close : esc.bgWhiteBright.open;
            // non-16-color rxvt default fg and bg
            case "default fg bg":
                if (val === false) {
                    return "";
                }
                return this.term("rxvt") ? "\x1b[100m" : "\x1b[39;49m";
            default: {
                // 256/24bit -color fg and bg
                param = param.toLowerCase();

                let m = /^(#(?:[0-9a-f]{3}){1,2}) (fg|bg)$/.exec(param);
                if (m) {
                    if (m[2] === "fg") {
                        return color.ansi16m.hex(m[1]);
                    }
                    if (m[2] === "bg") {
                        return bgColor.ansi16m.hex(m[1]);
                    }
                }
                m = /^(=|~)([01]?[0-9]?[0-9]|2[0-4][0-9]|25[0-5]) (fg|bg)$/.exec(param);
                if (m) {
                    const colorVal = Number.parseInt(m[2], 10);
                    if (m[1] === "=") {
                        if (m[3] === "fg") {
                            return color.ansi256.rgb(colorVal, colorVal, colorVal);
                        }
                        if (m[3] === "bg") {
                            return bgColor.ansi256.rgb(colorVal, colorVal, colorVal);
                        }
                    } else if (m[1] === "~") {
                        if (m[3] === "fg") {
                            return color.ansi16m.rgb(colorVal, colorVal, colorVal);
                        }
                        if (m[3] === "bg") {
                            return bgColor.ansi16m.rgb(colorVal, colorVal, colorVal);
                        }
                    } else {
                        return null;
                    }
                }

                if (/^[\d;]*$/.test(param)) {
                    return `\x1b[${param}m`;
                }
                return null;
            }
        }
    }

    setResizeTimeout(timeout) {
        this._resizeTimeout = timeout;
    }

    enableDebug(debug) {
        this.debug = debug;
    }

    listen() {
        // Listen for keys/mouse on input
        if (is.undefined(this.input._adoneInput)) {
            this.input._adoneInput = 1;

            // Input
            this.input.on("keypress", this.input._keypressHandler = (ch, key) => {
                key = key || { ch };

                if (key.name === "undefined" && (key.code === "[M" || key.code === "[I" || key.code === "[O")) {
                    // A mouse sequence. The `keys` module doesn't understand these.
                    return;
                }

                if (key.name === "undefined") {
                    // Not sure what this is, but we should probably ignore it.
                    return;
                }

                if (key.name === "enter" && key.sequence === "\n") {
                    key.name = "linefeed";
                }

                if (key.name === "return" && key.sequence === "\r") {
                    this.input.emit("keypress", ch, Object.assign({}, key, { name: "enter" }));
                }

                const name = (key.ctrl ? "C-" : "") + (key.alt ? "A-" : "") + (key.shift && key.name ? "S-" : "") + (key.name || ch);

                key.full = name;

                this.emit("keypress", ch, key);
                this.emit(`key ${name}`, ch, key);
            });

            this.input.on("data", this.input._dataHandler = (data) => {
                this.emit("data", data);
            });

            if (this.input._keypressDecoder) {
                return;
            }
            this.input._keypressDecoder = new stringDecoder.StringDecoder("utf8");

            let onNewListener;
            const onData = (b) => {
                if (adone.event.Emitter.listenerCount(this.input, "keypress") > 0) {
                    const r = this.input._keypressDecoder.write(b);
                    if (r) {
                        emitKeys(this.input, r);
                    }
                } else {
                    // Nobody's watching anyway
                    this.input.removeListener("data", onData);
                    this.input.on("newListener", onNewListener);
                }
            };

            onNewListener = (event) => {
                if (event === "keypress") {
                    this.input.on("data", onData);
                    this.input.removeListener("newListener", onNewListener);
                }
            };

            if (adone.event.Emitter.listenerCount(this.input, "keypress") > 0) {
                this.input.on("data", onData);
            } else {
                this.input.on("newListener", onNewListener);
            }
        } else {
            this.input._adoneInput++;
        }

        this._newHandler = (type) => {
            if (type === "keypress" || type === "mouse") {
                this.removeListener("newListener", this._newHandler);
                if (this.input.setRawMode && !this.input.isRaw) {
                    this.input.setRawMode(true);
                    this.input.resume();
                    // if (options.mouse) {
                    //     switch (options.mouse) {
                    //         case "button": this.mouseButton().mouseSGR(); break;
                    //         case "drag": this.mouseDrag().mouseSGR(); break;
                    //         case "motion": this.mouseMotion().mouseSGR(); break;
                    //     }
                    // }

                    // if (options.focus) {
                    //     this.focusEvent();
                    // }
                }
            }
        };

        this.on("newListener", this._newHandler).on("newListener", function fn(type) {
            if (type === "mouse") {
                this.removeListener("newListener", fn);
                this.bindMouse();
            }
        });
    }

    setupLogger(log, dump) {
        if (log && is.null(this._logger)) {
            this._logger = fs.createWriteStream(log);
            if (dump) {
                this.setupDump();
            }
        }
    }

    setupDump() {
        const self = this;
        const write = this.output.write;
        const decoder = new stringDecoder.StringDecoder("utf8");

        function stringify(data) {
            return caret(data
                .replace(/\r/g, "\\r")
                .replace(/\n/g, "\\n")
                .replace(/\t/g, "\\t"))
                .replace(/[^ -~]/g, (ch) => {
                    if (ch.charCodeAt(0) > 0xff) {
                        return ch;
                    }
                    ch = ch.charCodeAt(0).toString(16);
                    if (ch.length > 2) {
                        if (ch.length < 4) {
                            ch = `0${ch}`;
                        }
                        return `\\u${ch}`;
                    }
                    if (ch.length < 2) {
                        ch = `0${ch}`;
                    }
                    return `\\x${ch}`;
                });
        }

        function caret(data) {
            return data.replace(/[\0\x80\x1b-\x1f\x7f\x01-\x1a]/g, (ch) => {
                switch (ch) {
                    case "\0":
                    case "\x80":
                        ch = "@";
                        break;
                    case "\x1b":
                        ch = "[";
                        break;
                    case "\x1c":
                        ch = "\\";
                        break;
                    case "\x1d":
                        ch = "]";
                        break;
                    case "\x1e":
                        ch = "^";
                        break;
                    case "\x1f":
                        ch = "_";
                        break;
                    case "\x7f":
                        ch = "?";
                        break;
                    default:
                        ch = ch.charCodeAt(0);
                        // From ('A' - 64) to ('Z' - 64).
                        if (ch >= 1 && ch <= 26) {
                            ch = String.fromCharCode(ch + 64);
                        } else {
                            return String.fromCharCode(ch);
                        }
                        break;
                }
                return `^${ch}`;
            });
        }

        this.input.on("data", (data) => {
            self._log("IN", stringify(decoder.write(data)));
        });

        this.output.write = function (data) {
            self._log("OUT", stringify(data));
            return write.apply(this, arguments);
        };
    }

    get title() {
        return this._title;
    }

    set title(title) {
        this._title = title;
        this.write(this.terminfo.windowTitle(title));
        return this._title;
    }

    get name() {
        return this._terminal;
    }

    log(...args) {
        return this._log("LOG", adone.sprintf.apply(null, args));
    }

    debug(...args) {
        if (this.debug) {
            return this._log("DEBUG", adone.sprintf.apply(null, args));
        }
    }

    _log(pre, msg) {
        if (this._logger) {
            return this._logger.write(`${pre}: ${msg}\n-\n`);
        }
    }

    has(name) {
        return this.tput.has(name);
    }

    term(is) {
        return this._terminal.indexOf(is) === 0;
    }

    destroy() {
        if (!is.null(this[ACTIVE_PROMPT])) {
            // Make sure new prompt start on a newline when closing
            this[ACTIVE_PROMPT].forceClose();
        }

        this.flush();
        this._exiting = true;

        // this.styleReset();
        // this.showCursor(); // Restore cursor

        this.input._adoneInput--;

        if (this.input._adoneInput === 0) {
            if (is.function(this.input._keypressHandler)) {
                this.input.removeListener("keypress", this.input._keypressHandler);
                delete this.input._keypressHandler;
            }

            if (is.function(this.input._dataHandler)) {
                this.input.removeListener("data", this.input._dataHandler);
                delete this.input._dataHandler;
            }

            if (is.function(this.input.setRawMode)) {
                if (this.input.isRaw) {
                    this.input.setRawMode(false);
                }
                if (!this.input.destroyed) {
                    this.input.pause();
                }
            }
        }

        if (is.function(this.output._resizeHandler)) {
            if (this.output.isTTY) {
                this.output.removeListener("resize", this.output._resizeHandler);
            } else {
                process.removeListener("SIGWINCH", this.output._resizeHandler);
            }
            delete this.output._resizeHandler;
        }

        if (is.function(this._newHandler)) {
            this.removeListener("newListener", this._newHandler);
            delete this._newHandler;
        }

        this.destroyed = true;
        this.emit("destroy");
    }

    key(key, listener) {
        if (is.string(key)) {
            key = key.split(/\s*,\s*/);
        }
        key.forEach((key) => this.on(`key ${key}`, listener), this);
    }

    onceKey(key, listener) {
        if (is.string(key)) {
            key = key.split(/\s*,\s*/);
        }
        key.forEach((key) => this.once(`key ${key}`, listener), this);
    }

    unkey(key, listener) {
        if (is.string(key)) {
            key = key.split(/\s*,\s*/);
        }
        key.forEach((key) => this.removeListener(`key ${key}`, listener), this);
    }

    // XTerm mouse events
    // http://invisible-island.net/xterm/ctlseqs/ctlseqs.html#Mouse%20Tracking
    // To better understand these
    // the xterm code is very helpful:
    // Relevant files:
    //   button.c, charproc.c, misc.c
    // Relevant functions in xterm/button.c:
    //   BtnCode, EmitButtonCode, EditorButton, SendMousePosition
    // send a mouse event:
    // regular/utf8: ^[[M Cb Cx Cy
    // urxvt: ^[[ Cb ; Cx ; Cy M
    // sgr: ^[[ Cb ; Cx ; Cy M/m
    // vt300: ^[[ 24(1/3/5)~ [ Cx , Cy ] \r
    // locator: CSI P e ; P b ; P r ; P c ; P p & w
    // motion example of a left click:
    // ^[[M 3<^[[M@4<^[[M@5<^[[M@6<^[[M@7<^[[M#7<
    // mouseup, mousedown, mousewheel
    // left click: ^[[M 3<^[[M#3<
    // mousewheel up: ^[[M`3>
    bindMouse() {
        if (this._boundMouse) {
            return;
        }
        this._boundMouse = true;

        const decoder = new stringDecoder.StringDecoder("utf8");

        this.on("data", (data) => {
            let text = decoder.write(data);
            if (!text) {
                return;
            }

            const self = this;
            let parts;
            let b;
            let x;
            let y;
            let mod;
            let params;
            let down;
            let page;
            let button;

            const key = {
                name: undefined,
                ctrl: false,
                meta: false,
                shift: false
            };

            if (is.buffer(text)) {
                if (text[0] > 127 && is.undefined(text[1])) {
                    text[0] -= 128;
                    text = `\x1b${text.toString("utf-8")}`;
                } else {
                    text = text.toString("utf-8");
                }
            }

            // if (this.8bit) {
            //   text = text.replace(/\233/g, '\x1b[');
            //   data = new Buffer(text, 'utf8');
            // }

            // XTerm / X10 for buggy VTE
            // VTE can only send unsigned chars and no unicode for coords. This limits
            // them to 0xff. However, normally the x10 protocol does not allow a byte
            // under 0x20, but since VTE can have the bytes overflow, we can consider
            // bytes below 0x20 to be up to 0xff + 0x20. This gives a limit of 287. Since
            // characters ranging from 223 to 248 confuse javascript'text utf parser, we
            // need to parse the raw binary. We can detect whether the terminal is using
            // a bugged VTE version by examining the coordinates and seeing whether they
            // are a value they would never otherwise be with a properly implemented x10
            // protocol. This method of detecting VTE is only 99% reliable because we
            // can't check if the coords are 0x00 (255) since that is a valid x10 coord
            // technically.
            const bx = text.charCodeAt(4);
            const by = text.charCodeAt(5);
            if (data[0] === 0x1b && data[1] === 0x5b && data[2] === 0x4d && (this.isVTE || bx >= 65533 || by >= 65533 || (bx > 0x00 && bx < 0x20) || (by > 0x00 && by < 0x20) || (data[4] > 223 && data[4] < 248 && data.length === 6) || (data[5] > 223 && data[5] < 248 && data.length === 6))) {
                b = data[3];
                x = data[4];
                y = data[5];

                // unsigned char overflow.
                if (x < 0x20) {
                    x += 0xff;
                }
                if (y < 0x20) {
                    y += 0xff;
                }

                // Convert the coordinates into a
                // properly formatted x10 utf8 sequence.
                text = `\x1b[M${String.fromCharCode(b)}${String.fromCharCode(x)}${String.fromCharCode(y)}`;
            }

            // XTerm / X10
            parts = /^\x1b\[M([\x00\u0020-\uffff]{3})/.exec(text);
            if (parts) {
                b = parts[1].charCodeAt(0);
                x = parts[1].charCodeAt(1);
                y = parts[1].charCodeAt(2);

                key.name = "mouse";
                key.type = "X10";

                key.raw = [b, x, y, parts[0]];
                key.buf = data;
                key.x = x - 32;
                key.y = y - 32;

                key.x--;
                key.y--;

                if (x === 0) {
                    key.x = 255;
                }
                if (y === 0) {
                    key.y = 255;
                }

                mod = b >> 2;
                key.shift = Boolean(mod & 1);
                key.alt = Boolean((mod >> 1) & 1);
                key.ctrl = Boolean((mod >> 2) & 1);

                b -= 32;

                if ((b >> 6) & 1) {
                    key.action = b & 1 ? "wheeldown" : "wheelup";
                    key.button = "middle";
                } else if (b === 3) {
                    // NOTE: x10 and urxvt have no way
                    // of telling which button mouseup used.
                    key.action = "mouseup";
                    key.button = this._lastButton || "unknown";
                    delete this._lastButton;
                } else {
                    key.action = "mousedown";
                    button = b & 3;
                    key.button = button === 0 ? "left" : button === 1 ? "middle" : button === 2 ? "right" : "unknown";
                    this._lastButton = key.button;
                }

                // Probably a movement.
                // The *newer* VTE gets mouse movements comepletely wrong.
                // This presents a problem: older versions of VTE that get it right might
                // be confused by the second conditional in the if statement.
                // NOTE: Possibly just switch back to the if statement below.
                // none, shift, ctrl, alt
                // gnome: 32, 36, 48, 40
                // xterm: 35, _, 51, _
                // urxvt: 35, _, _, _
                // if (key.action === 'mousedown' && key.button === 'unknown') {
                if (b === 35 || b === 39 || b === 51 || b === 43
                    || (this.isVTE && (b === 32 || b === 36 || b === 48 || b === 40))) {
                    delete key.button;
                    key.action = "mousemove";
                }

                self.emit("mouse", key);

                return;
            }

            // URxvt
            parts = /^\x1b\[(\d+;\d+;\d+)M/.exec(text);
            if (parts) {
                params = parts[1].split(";");
                b = Number(params[0]);
                x = Number(params[1]);
                y = Number(params[2]);

                key.name = "mouse";
                key.type = "urxvt";

                key.raw = [b, x, y, parts[0]];
                key.buf = data;
                key.x = x;
                key.y = y;

                key.x--;
                key.y--;

                mod = b >> 2;
                key.shift = Boolean(mod & 1);
                key.alt = Boolean((mod >> 1) & 1);
                key.ctrl = Boolean((mod >> 2) & 1);

                // XXX Bug in urxvt after wheelup/down on mousemove
                // NOTE: This may be different than 128/129 depending
                // on mod keys.
                if (b === 128 || b === 129) {
                    b = 67;
                }

                b -= 32;

                if ((b >> 6) & 1) {
                    key.action = b & 1 ? "wheeldown" : "wheelup";
                    key.button = "middle";
                } else if (b === 3) {
                    // NOTE: x10 and urxvt have no way
                    // of telling which button mouseup used.
                    key.action = "mouseup";
                    key.button = this._lastButton || "unknown";
                    delete this._lastButton;
                } else {
                    key.action = "mousedown";
                    button = b & 3;
                    key.button =
                        button === 0 ? "left"
                            : button === 1 ? "middle"
                                : button === 2 ? "right"
                                    : "unknown";
                    // NOTE: 0/32 = mousemove, 32/64 = mousemove with left down
                    // if ((b >> 1) === 32)
                    this._lastButton = key.button;
                }

                // Probably a movement.
                // The *newer* VTE gets mouse movements comepletely wrong.
                // This presents a problem: older versions of VTE that get it right might
                // be confused by the second conditional in the if statement.
                // NOTE: Possibly just switch back to the if statement below.
                // none, shift, ctrl, alt
                // urxvt: 35, _, _, _
                // gnome: 32, 36, 48, 40
                // if (key.action === 'mousedown' && key.button === 'unknown') {
                if (b === 35 || b === 39 || b === 51 || b === 43
                    || (this.isVTE && (b === 32 || b === 36 || b === 48 || b === 40))) {
                    delete key.button;
                    key.action = "mousemove";
                }

                self.emit("mouse", key);

                return;
            }

            // SGR
            parts = /^\x1b\[<(\d+;\d+;\d+)([mM])/.exec(text);
            if (parts) {
                down = parts[2] === "M";
                params = parts[1].split(";");
                b = Number(params[0]);
                x = Number(params[1]);
                y = Number(params[2]);

                key.name = "mouse";
                key.type = "sgr";

                key.raw = [b, x, y, parts[0]];
                key.buf = data;
                key.x = x;
                key.y = y;

                key.x--;
                key.y--;

                mod = b >> 2;
                key.shift = Boolean(mod & 1);
                key.alt = Boolean((mod >> 1) & 1);
                key.ctrl = Boolean((mod >> 2) & 1);

                if ((b >> 6) & 1) {
                    key.action = b & 1 ? "wheeldown" : "wheelup";
                    key.button = "middle";
                } else {
                    key.action = down
                        ? "mousedown"
                        : "mouseup";
                    button = b & 3;
                    key.button =
                        button === 0 ? "left"
                            : button === 1 ? "middle"
                                : button === 2 ? "right"
                                    : "unknown";
                }

                // Probably a movement.
                // The *newer* VTE gets mouse movements comepletely wrong.
                // This presents a problem: older versions of VTE that get it right might
                // be confused by the second conditional in the if statement.
                // NOTE: Possibly just switch back to the if statement below.
                // none, shift, ctrl, alt
                // xterm: 35, _, 51, _
                // gnome: 32, 36, 48, 40
                // if (key.action === 'mousedown' && key.button === 'unknown') {
                if (b === 35 || b === 39 || b === 51 || b === 43
                    || (this.isVTE && (b === 32 || b === 36 || b === 48 || b === 40))) {
                    delete key.button;
                    key.action = "mousemove";
                }

                self.emit("mouse", key);

                return;
            }

            // DEC
            // The xterm mouse documentation says there is a
            // `<` prefix, the DECRQLP says there is no prefix.
            parts = /^\x1b\[<(\d+;\d+;\d+;\d+)&w/.exec(text);
            if (parts) {
                params = parts[1].split(";");
                b = Number(params[0]);
                x = Number(params[1]);
                y = Number(params[2]);
                page = Number(params[3]);

                key.name = "mouse";
                key.type = "dec";

                key.raw = [b, x, y, parts[0]];
                key.buf = data;
                key.x = x;
                key.y = y;
                key.page = page;

                key.x--;
                key.y--;

                key.action = b === 3
                    ? "mouseup"
                    : "mousedown";

                key.button =
                    b === 2 ? "left"
                        : b === 4 ? "middle"
                            : b === 6 ? "right"
                                : "unknown";

                self.emit("mouse", key);

                return;
            }

            // vt300
            parts = /^\x1b\[24([0135])~\[(\d+),(\d+)\]\r/.exec(text);
            if (parts) {
                b = Number(parts[1]);
                x = Number(parts[2]);
                y = Number(parts[3]);

                key.name = "mouse";
                key.type = "vt300";

                key.raw = [b, x, y, parts[0]];
                key.buf = data;
                key.x = x;
                key.y = y;

                key.x--;
                key.y--;

                key.action = "mousedown";
                key.button =
                    b === 1 ? "left"
                        : b === 2 ? "middle"
                            : b === 5 ? "right"
                                : "unknown";

                self.emit("mouse", key);

                return;
            }

            parts = /^\x1b\[(O|I)/.exec(text);
            if (parts) {
                key.action = parts[1] === "I" ? "focus" : "blur";

                self.emit("mouse", key);
                self.emit(key.action);


            }
        });
    }

    // gpm support for linux vc
    enableGpm() {
        const self = this;
        const gpmclient = require("./gpmclient");

        if (this.gpm) {
            return;
        }

        this.gpm = gpmclient();

        this.gpm.on("btndown", (btn, modifier, x, y) => {
            x--;
            y--;

            const key = {
                name: "mouse",
                type: "GPM",
                action: "mousedown",
                button: self.gpm.ButtonName(btn),
                raw: [btn, modifier, x, y],
                x,
                y,
                shift: self.gpm.hasShiftKey(modifier),
                meta: self.gpm.hasMetaKey(modifier),
                ctrl: self.gpm.hasCtrlKey(modifier)
            };

            self.emit("mouse", key);
        });

        this.gpm.on("btnup", (btn, modifier, x, y) => {
            x--;
            y--;

            const key = {
                name: "mouse",
                type: "GPM",
                action: "mouseup",
                button: self.gpm.ButtonName(btn),
                raw: [btn, modifier, x, y],
                x,
                y,
                shift: self.gpm.hasShiftKey(modifier),
                meta: self.gpm.hasMetaKey(modifier),
                ctrl: self.gpm.hasCtrlKey(modifier)
            };

            self.emit("mouse", key);
        });

        this.gpm.on("move", (btn, modifier, x, y) => {
            x--;
            y--;

            const key = {
                name: "mouse",
                type: "GPM",
                action: "mousemove",
                button: self.gpm.ButtonName(btn),
                raw: [btn, modifier, x, y],
                x,
                y,
                shift: self.gpm.hasShiftKey(modifier),
                meta: self.gpm.hasMetaKey(modifier),
                ctrl: self.gpm.hasCtrlKey(modifier)
            };

            self.emit("mouse", key);
        });

        this.gpm.on("drag", (btn, modifier, x, y) => {
            x--;
            y--;

            const key = {
                name: "mouse",
                type: "GPM",
                action: "mousemove",
                button: self.gpm.ButtonName(btn),
                raw: [btn, modifier, x, y],
                x,
                y,
                shift: self.gpm.hasShiftKey(modifier),
                meta: self.gpm.hasMetaKey(modifier),
                ctrl: self.gpm.hasCtrlKey(modifier)
            };

            self.emit("mouse", key);
        });

        this.gpm.on("mousewheel", (btn, modifier, x, y, dx, dy) => {
            const key = {
                name: "mouse",
                type: "GPM",
                action: dy > 0 ? "wheelup" : "wheeldown",
                button: self.gpm.ButtonName(btn),
                raw: [btn, modifier, x, y, dx, dy],
                x,
                y,
                shift: self.gpm.hasShiftKey(modifier),
                meta: self.gpm.hasMetaKey(modifier),
                ctrl: self.gpm.hasCtrlKey(modifier)
            };

            self.emit("mouse", key);
        });
    }

    disableGpm() {
        if (this.gpm) {
            this.gpm.stop();
            delete this.gpm;
        }
    }

    // All possible responses from the terminal
    bindResponse() {
        if (this._boundResponse) {
            return;
        }
        this._boundResponse = true;

        const decoder = new stringDecoder.StringDecoder("utf8");

        this.on("data", (data) => {
            data = decoder.write(data);

            if (!data) {
                return;
            }
            this._bindResponse(data);
        });
    }

    _bindResponse(s) {
        const out = {};
        let parts;

        if (is.buffer(s)) {
            if (s[0] > 127 && is.undefined(s[1])) {
                s[0] -= 128;
                s = `\x1b${s.toString("utf-8")}`;
            } else {
                s = s.toString("utf-8");
            }
        }

        // CSI P s c
        // Send Device Attributes (Primary DA).
        // CSI > P s c
        // Send Device Attributes (Secondary DA).
        parts = /^\x1b\[(\?|>)(\d*(?:;\d*)*)c/.exec(s);
        if (parts) {
            parts = parts[2].split(";").map((ch) => {
                return Number(ch) || 0;
            });

            out.event = "device-attributes";
            out.code = "DA";

            if (parts[1] === "?") {
                out.type = "primary-attribute";
                // VT100-style params:
                if (parts[0] === 1 && parts[2] === 2) {
                    out.term = "vt100";
                    out.advancedVideo = true;
                } else if (parts[0] === 1 && parts[2] === 0) {
                    out.term = "vt101";
                } else if (parts[0] === 6) {
                    out.term = "vt102";
                } else if (parts[0] === 60
                    && parts[1] === 1 && parts[2] === 2
                    && parts[3] === 6 && parts[4] === 8
                    && parts[5] === 9 && parts[6] === 15) {
                    out.term = "vt220";
                } else {
                    // VT200-style params:
                    parts.forEach((attr) => {
                        switch (attr) {
                            case 1:
                                out.cols132 = true;
                                break;
                            case 2:
                                out.printer = true;
                                break;
                            case 6:
                                out.selectiveErase = true;
                                break;
                            case 8:
                                out.userDefinedKeys = true;
                                break;
                            case 9:
                                out.nationalReplacementCharsets = true;
                                break;
                            case 15:
                                out.technicalCharacters = true;
                                break;
                            case 18:
                                out.userWindows = true;
                                break;
                            case 21:
                                out.horizontalScrolling = true;
                                break;
                            case 22:
                                out.ansiColor = true;
                                break;
                            case 29:
                                out.ansiTextLocator = true;
                                break;
                        }
                    });
                }
            } else {
                out.type = "secondary-attribute";
                switch (parts[0]) {
                    case 0:
                        out.term = "vt100";
                        break;
                    case 1:
                        out.term = "vt220";
                        break;
                    case 2:
                        out.term = "vt240";
                        break;
                    case 18:
                        out.term = "vt330";
                        break;
                    case 19:
                        out.term = "vt340";
                        break;
                    case 24:
                        out.term = "vt320";
                        break;
                    case 41:
                        out.term = "vt420";
                        break;
                    case 61:
                        out.term = "vt510";
                        break;
                    case 64:
                        out.term = "vt520";
                        break;
                    case 65:
                        out.term = "vt525";
                        break;
                }
                out.firmwareVersion = parts[1];
                out.romCartridgeRegistrationNumber = parts[2];
            }

            // LEGACY
            out.deviceAttributes = out;

            this.emit("response", out);
            this.emit(`response ${out.event}`, out);

            return;
        }

        // CSI Ps n  Device Status Report (DSR).
        //     Ps = 5  -> Status Report.  Result (``OK'') is
        //   CSI 0 n
        // CSI ? Ps n
        //   Device Status Report (DSR, DEC-specific).
        //     Ps = 1 5  -> Report Printer status as CSI ? 1 0  n  (ready).
        //     or CSI ? 1 1  n  (not ready).
        //     Ps = 2 5  -> Report UDK status as CSI ? 2 0  n  (unlocked)
        //     or CSI ? 2 1  n  (locked).
        //     Ps = 2 6  -> Report Keyboard status as
        //   CSI ? 2 7  ;  1  ;  0  ;  0  n  (North American).
        //   The last two parameters apply to VT400 & up, and denote key-
        //   board ready and LK01 respectively.
        //     Ps = 5 3  -> Report Locator status as
        //   CSI ? 5 3  n  Locator available, if compiled-in, or
        //   CSI ? 5 0  n  No Locator, if not.
        parts = /^\x1b\[(\?)?(\d+)(?:;(\d+);(\d+);(\d+))?n/.exec(s);
        if (parts) {
            out.event = "device-status";
            out.code = "DSR";

            if (!parts[1] && parts[2] === "0" && !parts[3]) {
                out.type = "device-status";
                out.status = "OK";

                // LEGACY
                out.deviceStatus = out.status;

                this.emit("response", out);
                this.emit(`response ${out.event}`, out);

                return;
            }

            if (parts[1] && (parts[2] === "10" || parts[2] === "11") && !parts[3]) {
                out.type = "printer-status";
                out.status = parts[2] === "10" ? "ready" : "not ready";

                // LEGACY
                out.printerStatus = out.status;

                this.emit("response", out);
                this.emit(`response ${out.event}`, out);

                return;
            }

            if (parts[1] && (parts[2] === "20" || parts[2] === "21") && !parts[3]) {
                out.type = "udk-status";
                out.status = parts[2] === "20" ? "unlocked" : "locked";

                // LEGACY
                out.UDKStatus = out.status;

                this.emit("response", out);
                this.emit(`response ${out.event}`, out);

                return;
            }

            if (parts[1]
                && parts[2] === "27"
                && parts[3] === "1"
                && parts[4] === "0"
                && parts[5] === "0") {
                out.type = "keyboard-status";
                out.status = "OK";

                // LEGACY
                out.keyboardStatus = out.status;

                this.emit("response", out);
                this.emit(`response ${out.event}`, out);

                return;
            }

            if (parts[1] && (parts[2] === "53" || parts[2] === "50") && !parts[3]) {
                out.type = "locator-status";
                out.status = parts[2] === "53" ? "available" : "unavailable";

                // LEGACY
                out.locator = out.status;

                this.emit("response", out);
                this.emit(`response ${out.event}`, out);

                return;
            }

            out.type = "error";
            out.text = `Unhandled: ${JSON.stringify(parts)}`;

            // LEGACY
            out.error = out.text;

            this.emit("response", out);
            this.emit(`response ${out.event}`, out);

            return;
        }

        // CSI Ps n  Device Status Report (DSR).
        //     Ps = 6  -> Report Cursor Position (CPR) [row;column].
        //   Result is
        //   CSI r ; c R
        // CSI ? Ps n
        //   Device Status Report (DSR, DEC-specific).
        //     Ps = 6  -> Report Cursor Position (CPR) [row;column] as CSI
        //     ? r ; c R (assumes page is zero).
        parts = /^\x1b\[(\?)?(\d+);(\d+)R/.exec(s);
        if (parts) {
            out.event = "device-status";
            out.code = "DSR";
            out.type = "cursor-status";

            out.status = {
                x: Number(parts[3]),
                y: Number(parts[2]),
                page: !parts[1] ? undefined : 0
            };

            out.x = out.status.x;
            out.y = out.status.y;
            out.page = out.status.page;

            // LEGACY
            out.cursor = out.status;

            this.emit("response", out);
            this.emit(`response ${out.event}`, out);

            return;
        }

        // CSI Ps ; Ps ; Ps t
        //   Window manipulation (from dtterm, as well as extensions).
        //   These controls may be disabled using the allowWindowOps
        //   resource.  Valid values for the first (and any additional
        //   parameters) are:
        //     Ps = 1 1  -> Report xterm window state.  If the xterm window
        //     is open (non-iconified), it returns CSI 1 t .  If the xterm
        //     window is iconified, it returns CSI 2 t .
        //     Ps = 1 3  -> Report xterm window position.  Result is CSI 3
        //     ; x ; y t
        //     Ps = 1 4  -> Report xterm window in pixels.  Result is CSI
        //     4  ;  height ;  width t
        //     Ps = 1 8  -> Report the size of the text area in characters.
        //     Result is CSI  8  ;  height ;  width t
        //     Ps = 1 9  -> Report the size of the screen in characters.
        //     Result is CSI  9  ;  height ;  width t
        parts = /^\x1b\[(\d+)(?:;(\d+);(\d+))?t/.exec(s);
        if (parts) {
            out.event = "window-manipulation";
            out.code = "";

            if ((parts[1] === "1" || parts[1] === "2") && !parts[2]) {
                out.type = "window-state";
                out.state = parts[1] === "1"
                    ? "non-iconified"
                    : "iconified";

                // LEGACY
                out.windowState = out.state;

                this.emit("response", out);
                this.emit(`response ${out.event}`, out);

                return;
            }

            if (parts[1] === "3" && parts[2]) {
                out.type = "window-position";

                out.position = {
                    x: Number(parts[2]),
                    y: Number(parts[3])
                };
                out.x = out.position.x;
                out.y = out.position.y;

                // LEGACY
                out.windowPosition = out.position;

                this.emit("response", out);
                this.emit(`response ${out.event}`, out);

                return;
            }

            if (parts[1] === "4" && parts[2]) {
                out.type = "window-size-pixels";
                out.size = {
                    height: Number(parts[2]),
                    width: Number(parts[3])
                };
                out.height = out.size.height;
                out.width = out.size.width;

                // LEGACY
                out.windowSizePixels = out.size;

                this.emit("response", out);
                this.emit(`response ${out.event}`, out);

                return;
            }

            if (parts[1] === "8" && parts[2]) {
                out.type = "textarea-size";
                out.size = {
                    height: Number(parts[2]),
                    width: Number(parts[3])
                };
                out.height = out.size.height;
                out.width = out.size.width;

                // LEGACY
                out.textAreaSizeCharacters = out.size;

                this.emit("response", out);
                this.emit(`response ${out.event}`, out);

                return;
            }

            if (parts[1] === "9" && parts[2]) {
                out.type = "screen-size";
                out.size = {
                    height: Number(parts[2]),
                    width: Number(parts[3])
                };
                out.height = out.size.height;
                out.width = out.size.width;

                // LEGACY
                out.screenSizeCharacters = out.size;

                this.emit("response", out);
                this.emit(`response ${out.event}`, out);

                return;
            }

            out.type = "error";
            out.text = `Unhandled: ${JSON.stringify(parts)}`;

            // LEGACY
            out.error = out.text;

            this.emit("response", out);
            this.emit(`response ${out.event}`, out);

            return;
        }

        // rxvt-unicode does not support window manipulation
        //   Result Normal: OSC l/L 0xEF 0xBF 0xBD
        //   Result ASCII: OSC l/L 0x1c (file separator)
        //   Result UTF8->ASCII: OSC l/L 0xFD
        // Test with:
        //   echo -ne '\ePtmux;\e\e[>3t\e\\'
        //   sleep 2 && echo -ne '\ePtmux;\e\e[21t\e\\' & cat -v
        //   -
        //   echo -ne '\e[>3t'
        //   sleep 2 && echo -ne '\e[21t' & cat -v
        parts = /^\x1b\](l|L)([^\x07\x1b]*)$/.exec(s);
        if (parts) {
            parts[2] = "rxvt";
            s = `\x1b]${parts[1]}${parts[2]}\x1b\\`;
        }

        // CSI Ps ; Ps ; Ps t
        //   Window manipulation (from dtterm, as well as extensions).
        //   These controls may be disabled using the allowWindowOps
        //   resource.  Valid values for the first (and any additional
        //   parameters) are:
        //     Ps = 2 0  -> Report xterm window's icon label.  Result is
        //     OSC  L  label ST
        //     Ps = 2 1  -> Report xterm window's title.  Result is OSC  l
        //     label ST
        parts = /^\x1b\](l|L)([^\x07\x1b]*)(?:\x07|\x1b\\)/.exec(s);
        if (parts) {
            out.event = "window-manipulation";
            out.code = "";

            if (parts[1] === "L") {
                out.type = "window-icon-label";
                out.text = parts[2];

                // LEGACY
                out.windowIconLabel = out.text;

                this.emit("response", out);
                this.emit(`response ${out.event}`, out);

                return;
            }

            if (parts[1] === "l") {
                out.type = "window-title";
                out.text = parts[2];

                // LEGACY
                out.windowTitle = out.text;

                this.emit("response", out);
                this.emit(`response ${out.event}`, out);

                return;
            }

            out.type = "error";
            out.text = `Unhandled: ${JSON.stringify(parts)}`;

            // LEGACY
            out.error = out.text;

            this.emit("response", out);
            this.emit(`response ${out.event}`, out);

            return;
        }

        // CSI Ps ' |
        //   Request Locator Position (DECRQLP).
        //     -> CSI Pe ; Pb ; Pr ; Pc ; Pp &  w
        //   Parameters are [event;button;row;column;page].
        //   Valid values for the event:
        //     Pe = 0  -> locator unavailable - no other parameters sent.
        //     Pe = 1  -> request - xterm received a DECRQLP.
        //     Pe = 2  -> left button down.
        //     Pe = 3  -> left button up.
        //     Pe = 4  -> middle button down.
        //     Pe = 5  -> middle button up.
        //     Pe = 6  -> right button down.
        //     Pe = 7  -> right button up.
        //     Pe = 8  -> M4 button down.
        //     Pe = 9  -> M4 button up.
        //     Pe = 1 0  -> locator outside filter rectangle.
        //   ``button'' parameter is a bitmask indicating which buttons are
        //     pressed:
        //     Pb = 0  <- no buttons down.
        //     Pb & 1  <- right button down.
        //     Pb & 2  <- middle button down.
        //     Pb & 4  <- left button down.
        //     Pb & 8  <- M4 button down.
        //   ``row'' and ``column'' parameters are the coordinates of the
        //     locator position in the xterm window, encoded as ASCII deci-
        //     mal.
        //   The ``page'' parameter is not used by xterm, and will be omit-
        //   ted.
        // NOTE:
        // This is already implemented in the bindMouse
        // method, but it might make more sense here.
        // The xterm mouse documentation says there is a
        // `<` prefix, the DECRQLP says there is no prefix.
        parts = /^\x1b\[(\d+(?:;\d+){4})&w/.exec(s);
        if (parts) {
            parts = parts[1].split(";").map((ch) => {
                return Number(ch);
            });

            out.event = "locator-position";
            out.code = "DECRQLP";

            switch (parts[0]) {
                case 0:
                    out.status = "locator-unavailable";
                    break;
                case 1:
                    out.status = "request";
                    break;
                case 2:
                    out.status = "left-button-down";
                    break;
                case 3:
                    out.status = "left-button-up";
                    break;
                case 4:
                    out.status = "middle-button-down";
                    break;
                case 5:
                    out.status = "middle-button-up";
                    break;
                case 6:
                    out.status = "right-button-down";
                    break;
                case 7:
                    out.status = "right-button-up";
                    break;
                case 8:
                    out.status = "m4-button-down";
                    break;
                case 9:
                    out.status = "m4-button-up";
                    break;
                case 10:
                    out.status = "locator-outside";
                    break;
            }

            out.mask = parts[1];
            out.row = parts[2];
            out.col = parts[3];
            out.page = parts[4];

            // LEGACY
            out.locatorPosition = out;

            this.emit("response", out);
            this.emit(`response ${out.event}`, out);

            return;
        }

        // OSC Ps ; Pt BEL
        // OSC Ps ; Pt ST
        // Set Text Parameters
        parts = /^\x1b\](\d+);([^\x07\x1b]+)(?:\x07|\x1b\\)/.exec(s);
        if (parts) {
            out.event = "text-params";
            out.code = "Set Text Parameters";
            out.ps = Number(s[1]);
            out.pt = s[2];
            this.emit("response", out);
            this.emit(`response ${out.event}`, out);
        }
    }

    response(name, text, callback, noBypass) {
        if (arguments.length === 2) {
            callback = text;
            text = name;
            name = null;
        }

        if (!callback) {
            callback = adone.noop;
        }

        this.bindResponse();

        name = name ? `response ${name}` : "response";

        let timeout;
        const onresponse = (event) => {
            if (timeout) {
                clearTimeout(timeout);
            }
            if (event.type === "error") {
                return callback(new Error(`${event.event}: ${event.text}`));
            }
            return callback(null, event);
        };

        this.once(name, onresponse);

        // timeout = setTimeout(() => {
        //     this.removeListener(name, onresponse);
        //     return callback(new Error("Timeout."));
        // }, 2000);

        return this.write(text);
    }

    // CSI Ps ; Ps ; Ps t
    //   Window manipulation (from dtterm, as well as extensions).
    //   These controls may be disabled using the allowWindowOps
    //   resource.  Valid values for the first (and any additional
    //   parameters) are:
    //     Ps = 1  -> De-iconify window.
    //     Ps = 2  -> Iconify window.
    //     Ps = 3  ;  x ;  y -> Move window to [x, y].
    //     Ps = 4  ;  height ;  width -> Resize the xterm window to
    //     height and width in pixels.
    //     Ps = 5  -> Raise the xterm window to the front of the stack-
    //     ing order.
    //     Ps = 6  -> Lower the xterm window to the bottom of the
    //     stacking order.
    //     Ps = 7  -> Refresh the xterm window.
    //     Ps = 8  ;  height ;  width -> Resize the text area to
    //     [height;width] in characters.
    //     Ps = 9  ;  0  -> Restore maximized window.
    //     Ps = 9  ;  1  -> Maximize window (i.e., resize to screen
    //     size).
    //     Ps = 1 0  ;  0  -> Undo full-screen mode.
    //     Ps = 1 0  ;  1  -> Change to full-screen.
    //     Ps = 1 1  -> Report xterm window state.  If the xterm window
    //     is open (non-iconified), it returns CSI 1 t .  If the xterm
    //     window is iconified, it returns CSI 2 t .
    //     Ps = 1 3  -> Report xterm window position.  Result is CSI 3
    //     ; x ; y t
    //     Ps = 1 4  -> Report xterm window in pixels.  Result is CSI
    //     4  ;  height ;  width t
    //     Ps = 1 8  -> Report the size of the text area in characters.
    //     Result is CSI  8  ;  height ;  width t
    //     Ps = 1 9  -> Report the size of the screen in characters.
    //     Result is CSI  9  ;  height ;  width t
    //     Ps = 2 0  -> Report xterm window's icon label.  Result is
    //     OSC  L  label ST
    //     Ps = 2 1  -> Report xterm window's title.  Result is OSC  l
    //     label ST
    //     Ps = 2 2  ;  0  -> Save xterm icon and window title on
    //     stack.
    //     Ps = 2 2  ;  1  -> Save xterm icon title on stack.
    //     Ps = 2 2  ;  2  -> Save xterm window title on stack.
    //     Ps = 2 3  ;  0  -> Restore xterm icon and window title from
    //     stack.
    //     Ps = 2 3  ;  1  -> Restore xterm icon title from stack.
    //     Ps = 2 3  ;  2  -> Restore xterm window title from stack.
    //     Ps >= 2 4  -> Resize to Ps lines (DECSLPP).
    manipulateWindow(...args) {
        const callback = is.function(args[args.length - 1]) ? args.pop() : function () { };

        return this.response("window-manipulation", `\x1b[${args.join(";")}t`, callback);
    }

    getWindowSize(callback) {
        return this.manipulateWindow(18, callback);
    }

    enableMouse() {
        if (this.term("rxvt-unicode")) {
            return this.setMouse({
                urxvtMouse: true,
                cellMotion: true,
                allMotion: true
            }, true);
        }

        // rxvt does not support the X10 UTF extensions
        if (this.term("rxvt")) {
            return this.setMouse({
                vt200Mouse: true,
                x10Mouse: true,
                cellMotion: true,
                allMotion: true
            }, true);
        }

        // libvte is broken. Older versions do not support the X10 UTF extension. However, later versions do support SGR/URXVT.
        if (this.isVTE) {
            return this.setMouse({
                // NOTE: Could also use urxvtMouse here.
                sgrMouse: true,
                cellMotion: true,
                allMotion: true
            }, true);
        }

        if (this.term("linux")) {
            return this.setMouse({
                vt200Mouse: true,
                gpmMouse: true
            }, true);
        }

        if (this.term("xterm") || this.term("screen") || (this.tput.strings.key_mouse)) {
            return this.setMouse({
                vt200Mouse: true,
                utfMouse: true,
                cellMotion: true,
                allMotion: true
            }, true);
        }
    }

    disableMouse() {
        if (!this._currentMouse) {
            return;
        }

        const obj = {};

        Object.keys(this._currentMouse).forEach((key) => {
            obj[key] = false;
        });

        return this.setMouse(obj, false);
    }

    // Set Mouse
    setMouse(opt, enable) {
        if (!is.nil(opt.normalMouse)) {
            opt.vt200Mouse = opt.normalMouse;
            opt.allMotion = opt.normalMouse;
        }

        if (!is.nil(opt.hiliteTracking)) {
            opt.vt200Hilite = opt.hiliteTracking;
        }

        if (enable === true) {
            if (this._currentMouse) {
                this.setMouse(opt);
                Object.keys(opt).forEach((key) => {
                    this._currentMouse[key] = opt[key];
                });
                return;
            }
            this._currentMouse = opt;
            this.mouseEnabled = true;
        } else if (enable === false) {
            delete this._currentMouse;
            this.mouseEnabled = false;
        }

        //     Ps = 9  -> Send Mouse X & Y on button press.  See the sec-
        //     tion Mouse Tracking.
        //     Ps = 9  -> Don't send Mouse X & Y on button press.
        // x10 mouse
        if (!is.nil(opt.x10Mouse)) {
            if (opt.x10Mouse) {
                this.setMode("?9");
            } else {
                this.resetMode("?9");
            }
        }

        //     Ps = 1 0 0 0  -> Send Mouse X & Y on button press and
        //     release.  See the section Mouse Tracking.
        //     Ps = 1 0 0 0  -> Don't send Mouse X & Y on button press and
        //     release.  See the section Mouse Tracking.
        // vt200 mouse
        if (!is.nil(opt.vt200Mouse)) {
            if (opt.vt200Mouse) {
                this.setMode("?1000");
            } else {
                this.resetMode("?1000");
            }
        }

        //     Ps = 1 0 0 1  -> Use Hilite Mouse Tracking.
        //     Ps = 1 0 0 1  -> Don't use Hilite Mouse Tracking.
        if (!is.nil(opt.vt200Hilite)) {
            if (opt.vt200Hilite) {
                this.setMode("?1001");
            } else {
                this.resetMode("?1001");
            }
        }

        //     Ps = 1 0 0 2  -> Use Cell Motion Mouse Tracking.
        //     Ps = 1 0 0 2  -> Don't use Cell Motion Mouse Tracking.
        // button event mouse
        if (!is.nil(opt.cellMotion)) {
            if (opt.cellMotion) {
                this.setMode("?1002");
            } else {
                this.resetMode("?1002");
            }
        }

        //     Ps = 1 0 0 3  -> Use All Motion Mouse Tracking.
        //     Ps = 1 0 0 3  -> Don't use All Motion Mouse Tracking.
        // any event mouse
        if (!is.nil(opt.allMotion)) {
            if (opt.allMotion) {
                this.setMode("?1003");
            } else {
                this.resetMode("?1003");
            }
        }

        //     Ps = 1 0 0 4  -> Send FocusIn/FocusOut events.
        //     Ps = 1 0 0 4  -> Don't send FocusIn/FocusOut events.
        if (!is.nil(opt.sendFocus)) {
            if (opt.sendFocus) {
                this.setMode("?1004");
            } else {
                this.resetMode("?1004");
            }
        }

        //     Ps = 1 0 0 5  -> Enable Extended Mouse Mode.
        //     Ps = 1 0 0 5  -> Disable Extended Mouse Mode.
        if (!is.nil(opt.utfMouse)) {
            if (opt.utfMouse) {
                this.setMode("?1005");
            } else {
                this.resetMode("?1005");
            }
        }

        // sgr mouse
        if (!is.nil(opt.sgrMouse)) {
            if (opt.sgrMouse) {
                this.setMode("?1006");
            } else {
                this.resetMode("?1006");
            }
        }

        // urxvt mouse
        if (!is.nil(opt.urxvtMouse)) {
            if (opt.urxvtMouse) {
                this.setMode("?1015");
            } else {
                this.resetMode("?1015");
            }
        }

        // dec mouse
        if (!is.nil(opt.decMouse)) {
            if (opt.decMouse) {
                this.write("\x1b[1;2'z\x1b[1;3'{");
            } else {
                this.write("\x1b['z");
            }
        }

        // pterm mouse
        if (!is.nil(opt.ptermMouse)) {
            if (opt.ptermMouse) {
                this.write("\x1b[>1h\x1b[>6h\x1b[>7h\x1b[>1h\x1b[>9l");
            } else {
                this.write("\x1b[>1l\x1b[>6l\x1b[>7l\x1b[>1l\x1b[>9h");
            }
        }

        // jsbterm mouse
        if (!is.nil(opt.jsbtermMouse)) {
            // + = advanced mode
            if (opt.jsbtermMouse) {
                this.write("\x1b[0~ZwLMRK+1Q\x1b\\");
            } else {
                this.write("\x1b[0~ZwQ\x1b\\");
            }
        }

        // gpm mouse
        if (!is.nil(opt.gpmMouse)) {
            if (opt.gpmMouse) {
                this.enableGpm();
            } else {
                this.disableGpm();
            }
        }
    }

    /**
     * OSC
     */

    // OSC Ps ; Pt ST
    // OSC Ps ; Pt BEL
    //   Reset colors
    resetColors(param) {
        if (this.has("Cr")) {
            return this.put.Cr(param);
        }
        return this.write("\x1b]112\x07");
        //return this.write('\x1b]112;' + param + '\x07');
    }

    // OSC Ps ; Pt ST
    // OSC Ps ; Pt BEL
    //   Change dynamic colors
    dynamicColors(param) {
        if (this.has("Cs")) {
            return this.put.Cs(param);
        }
        return this.write(`\x1b]12;${param}\x07`);
    }

    // OSC Ps ; Pt ST
    // OSC Ps ; Pt BEL
    //   Sel data
    selData(a, b) {
        if (this.has("Ms")) {
            return this.put.Ms(a, b);
        }
        return this.write(`\x1b]52;${a};${b}\x07`);
    }

    _owrite(text) {
        if (this.output.writable) {
            return this.output.write(text);
        }
    }

    _buffer(text) {
        if (this._exiting) {
            this.flush();
            this._owrite(text);
            return false;
        }

        if (this._buf) {
            this._buf += text;
            return false;
        }

        this._buf = text;
        process.nextTick(this._flush);
        return true;
    }

    flush() {
        if (this._buf) {
            this._owrite(this._buf);
            this._buf = "";
        }
    }

    write(text) {
        if (this.ret) {
            return text;
        }
        if (this.useBuffer) {
            this._buffer(text);
            return this;
        }
        this._owrite(text);
        return this;
    }

    print(...args) {
        switch (args.length) {
            case 1:
                this.write(this.parse(args[0]));
                break;
            default:
                this.write(this.parse(adone.sprintf.apply(null, args)));
        }
        return this;
    }

    // put(...args) {
    //     args = slice.call(args);
    //     const cap = args.shift();
    //     const tput = this.terminfo;
    //     if (tput[cap]) {
    //         return this.write(tput[cap].apply(tput, args));
    //     }
    // }

    clear() {
        this.x = 0;
        this.y = 0;
        this.write(this.terminfo.clear());
        return this;
    }

    eraseDisplayBelow() {
        this.write(this.terminfo.eraseDisplayBelow());
        return this;
    }

    eraseDisplayAbove() {
        this.write(this.terminfo.eraseDisplayAbove());
        return this;
    }

    eraseDisplay() {
        this.write(this.terminfo.eraseDisplay());
        return this;
    }

    eraseLineAfter() {
        this.write(this.terminfo.eraseLineAfter());
        return this;
    }

    eraseLineBefore() {
        this.write(this.terminfo.eraseLineBefore());
        return this;
    }

    eraseLine() {
        this.write(this.terminfo.eraseLine());
        return this;
    }

    eraseLines(n) {
        let buf = "";
        const cursorLeft = this.terminfo.cursorLeft();
        const cursorUp = this.terminfo.up(1);
        const eraseEndLine = this.terminfo.eraseEndLine();

        for (let i = 0; i < n; i++) {
            buf += cursorLeft + eraseEndLine + (i < n - 1 ? cursorUp : "");
        }

        this.write(buf);
        return this;
    }

    insertLine(n) {
        this.write(this.terminfo.insertLine(n));
        return this;
    }

    deleteLine(n) {
        this.write(this.terminfo.deleteLine(n));
        return this;
    }

    insert(c) {
        this.write(this.terminfo.insert(c));
        return this;
    }

    delete(c) {
        this.write(this.terminfo.delete(c));
        return this;
    }

    backDelete() {
        this.write(this.terminfo.backDelete());
        return this;
    }

    styleReset() {
        this.write(adone.cli.esc.reset.open);
        return this;
    }

    mouseButton(enable) {
        this.write(this.terminfo.mouseButton(enable));
        return this;
    }

    mouseDrag(enable) {
        this.write(this.terminfo.mouseDrag(enable));
        return this;
    }

    mouseMotion(enable) {
        this.write(this.terminfo.mouseMotion(enable));
        return this;
    }

    mouseSGR(enable) {
        this.write(this.terminfo.mouseSGR(enable));
        return this;
    }

    focusEvent(enable) {
        this.write(this.terminfo.focusEvent(enable));
        return this;
    }

    applicationKeypad(enable) {
        this.write(this.terminfo.applicationKeypad(enable));
        return this;
    }

    // CSI Ps n  Device Status Report (DSR).
    //     Ps = 5  -> Status Report.  Result (``OK'') is
    //   CSI 0 n
    //     Ps = 6  -> Report Cursor Position (CPR) [row;column].
    //   Result is
    //   CSI r ; c R
    // CSI ? Ps n
    //   Device Status Report (DSR, DEC-specific).
    //     Ps = 6  -> Report Cursor Position (CPR) [row;column] as CSI
    //     ? r ; c R (assumes page is zero).
    //     Ps = 1 5  -> Report Printer status as CSI ? 1 0  n  (ready).
    //     or CSI ? 1 1  n  (not ready).
    //     Ps = 2 5  -> Report UDK status as CSI ? 2 0  n  (unlocked)
    //     or CSI ? 2 1  n  (locked).
    //     Ps = 2 6  -> Report Keyboard status as
    //   CSI ? 2 7  ;  1  ;  0  ;  0  n  (North American).
    //   The last two parameters apply to VT400 & up, and denote key-
    //   board ready and LK01 respectively.
    //     Ps = 5 3  -> Report Locator status as
    //   CSI ? 5 3  n  Locator available, if compiled-in, or
    //   CSI ? 5 0  n  No Locator, if not.
    deviceStatus(param, callback, dec, noBypass) {
        if (dec) {
            return this.response("device-status", `\x1b[?${param || "0"}n`, callback, noBypass);
        }
        return this.response("device-status", `\x1b[${param || "0"}n`, callback, noBypass);
    }

    getCursorPos(callback) {
        if (is.function(callback)) {
            this.deviceStatus(6, callback, false, true);
        }
        return new Promise((resolve, reject) => {
            this.deviceStatus(6, (err, result) => err ? reject(err) : resolve(result), false, true);
        });
    }

    saveCursor(key) {
        if (key) {
            return this.lsaveCursor(key);
        }
        this.savedX = this.x || 0;
        this.savedY = this.y || 0;

        this.write(this.terminfo.saveCursor());
        return this;
    }

    // Save Cursor Locally
    lsaveCursor(key) {
        key = key || "local";
        this._saved = this._saved || {};
        this._saved[key] = this._saved[key] || {};
        this._saved[key].x = this.x;
        this._saved[key].y = this.y;
        this._saved[key].hidden = this.cursorHidden;
    }

    restoreCursor(key, hide) {
        if (key) {
            return this.lrestoreCursor(key, hide);
        }
        this.x = this.savedX || 0;
        this.y = this.savedY || 0;
        this.write(this.terminfo.restoreCursor());
        return this;
    }

    // Restore Cursor Locally
    lrestoreCursor(key, hide) {
        key = key || "local";
        if (!this._saved || !this._saved[key]) {
            return;
        }
        const pos = this._saved[key];
        //delete this._saved[key];
        this.moveTo(pos.y, pos.x);
        if (hide && pos.hidden !== this.cursorHidden) {
            if (pos.hidden) {
                this.hideCursor();
            } else {
                this.showCursor();
            }
        }
    }

    // move(x, y) {
    //     return this.cursorPos(y, x);
    // }

    moveTo(row = 0, col = 0) {
        this.x = col;
        this.y = row;
        this._ncoords();
        this.write(this.terminfo.moveTo(row + 1, col + 1));
        return this;
    }

    showCursor() {
        this.cursorHidden = false;
        this.write(this.terminfo.hideCursor(false));
        return this;
    }

    hideCursor() {
        this.cursorHidden = true;
        this.write(this.terminfo.hideCursor(true));
        return this;
    }

    up(cnt = 1) {
        this.y -= cnt;
        this.write(this.terminfo.up(cnt));
        return this;
    }

    down(cnt = 1) {
        this.y += cnt;
        this.write(this.terminfo.down(cnt));
        return this;
    }

    right(cnt = 1) {
        this.x += cnt;
        this.write(this.terminfo.right(cnt));
        return this;
    }

    left(cnt = 1) {
        this.x -= cnt;
        this.write(this.terminfo.left(cnt));
        return this;
    }

    nextLine(cnt) {
        this.write(this.terminfo.nextLine(cnt));
        return this;
    }

    previousLine(cnt) {
        this.write(this.terminfo.previousLine(cnt));
        return this;
    }

    column(c) {
        this.write(this.terminfo.column(c));
        return this;
    }

    row(r) {
        this.write(this.terminfo.row(r));
        return this;
    }

    scrollUp(rows) {
        this.write(this.terminfo.scrollUp(rows));
        return this;
    }

    scrollDown(rows) {
        this.write(this.terminfo.scrollDown(rows));
        return this;
    }

    setScrollRegion(top, bottom) {
        top = top || 0;
        bottom = bottom || (this.stats.rows - 1);
        this.scrollTop = top;
        this.scrollBottom = bottom;
        this.x = 0;
        this.y = 0;
        this._ncoords();
        this.write(this.terminfo.setScrollRegion(top, bottom));
        return this;
    }

    alternateScreenBuffer(isAlt) {
        this.isAlt = isAlt;
        this.write(this.terminfo.alternateScreenBuffer(isAlt));
        return this;
    }

    bell() {
        this.write(this.terminfo.bell());
        return this;
    }

    color(c) {
        this.write(this.terminfo.color(c));
        return this;
    }

    bgColor(c) {
        this.write(this.terminfo.bgColor(c));
        return this;
    }

    blockCursor() {
        this.write(this.terminfo.blockCursor());
        return this;
    }

    blinkingBlockCursor() {
        this.write(this.terminfo.blinkingBlockCursor());
        return this;
    }

    underlineCursor() {
        this.write(this.terminfo.underlineCursor());
        return this;
    }

    blinkingUnderlineCursor() {
        this.write(this.terminfo.blinkingUnderlineCursor());
        return this;
    }

    beamCursor() {
        this.write(this.terminfo.beamCursor());
        return this;
    }

    blinkingBeamCursor() {
        this.write(this.terminfo.blinkingBeamCursor());
        return this;
    }

    resetMode(...args) {
        const param = args.join(";");
        return this.write(`\x1b[${param || ""}l`);
    }

    setMode(...args) {
        const param = args.join(";");
        return this.write(`\x1b[${param || ""}h`);
    }

    copyToClipboard(text) {
        if (this.isiTerm2) {
            this.write(`\x1b]50;CopyToCliboard=${text}\x07`);
            return true;
        }
        return false;
    }

    _ncoords() {
        if (this.x < 0) {
            this.x = 0;
        } else if (this.x >= this.stats.cols) {
            this.x = this.stats.cols - 1;
        }
        if (this.y < 0) {
            this.y = 0;
        } else if (this.y >= this.stats.rows) {
            this.y = this.stats.rows - 1;
        }
    }











    // High-level CLI functions

    get style() {
        return this[COLOR_SCHEME];
    }

    setColorScheme(scheme) {
        this[COLOR_SCHEME] = scheme;
    }

    setProgressBar(bar) {
        this[BAR] = bar;
    }

    setSilent(silent) {
        this[SILENT] = silent;
    }

    async observe(what, taskManager) {
        if (is.array(what)) {
            for (const w of what) {
                this.observe(w, taskManager);
            }
            return;
        }

        let notifName;
        if (is.object(what)) {
            notifName = what.name;
        } else {
            notifName = what;
        }

        switch (notifName) {
            case "progress": {
                this.progress("preparing");
                await taskManager.onNotification("progress", (sender, name, info) => {
                    this.updateProgress(info);
                });
                break;
            }
            default:
                throw new adone.error.UnknownException(`Unknown notification name: ${what}`);
        }
    }

    // async connect() {
    //     if (!adone.omnitron.dispatcher.isConnected()) {
    //         await adone.omnitron.dispatcher.connectLocal({
    //             forceStart: false
    //         });

    //         // Add dispatcher as subsystem.
    //         this.addSubsystem({
    //             name: "dispatcher",
    //             bind: true,
    //             subsystem: adone.omnitron.dispatcher
    //         });
    //         await this.configureSubsystem("dispatcher");
    //         await this.initializeSubsystem("dispatcher");
    //     }
    // }

    progress(message) {
        let options;
        if (is.string(message)) {
            options = {
                schema: `:spinner ${message}`
            };
        } else {
            options = message;
        }
        if (!this[SILENT]) {
            this[BAR] = new this.Progress(options);
            this[BAR].update(0);
        }
    }

    updateProgress({ clean = false, schema, message, status } = {}) {
        if (is.null(this[BAR])) {
            this.progress(message);
        }
        if (!this[SILENT]) {
            if (is.string(message)) {
                schema = `:spinner ${message}`;
            } else if (!is.string(schema)) {
                schema = ":spinner";
            }
            this[BAR].setSchema(schema);
            if (is.boolean(status) || is.string(status)) {
                if (clean) {
                    this[BAR].clean = true;
                }
                this[BAR].complete(status);
            }
        }
    }

    async prompt(questions, customTerminal) {
        const p = new this.prompt.Manager(customTerminal || this);
        this[ACTIVE_PROMPT] = p;
        const result = await p.run(questions);
        this[ACTIVE_PROMPT] = null;
        return result;
    }

    separator(value) {
        return new this.prompt.Separator(value);
    }
}
Terminal.prototype.type = "program";
Terminal.prototype.Terminal = Terminal;

const terminal = new Terminal();
terminal.Terminal = Terminal;
terminal.Terminfo = Terminfo;

const __ = adone.lazify({
    Progress: "./progress",
    prompt: "./prompt",
    esc: "./esc",
    Chalk: "./chalk",
    chalk: () => __.Chalk(),
    chalkify: "./chalkify",
    gradient: "./gradient",
    ui: "./ui"
}, terminal, require);

export default adone.asNamespace(terminal);
