const { is, vendor: { lodash: _ } } = adone;

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

/**
 * Helpers
 */

function noop() {
    return "";
}

noop.unsupported = true;

function merge(a, b) {
    Object.keys(b).forEach((key) => {
        a[key] = b[key];
    });
    return a;
}

function write(data) {
    return process.stdout.write(data);
}

function tryRead(file) {
    if (Array.isArray(file)) {
        for (let i = 0; i < file.length; i++) {
            let data = tryRead(file[i]);
            if (data) { return data; }
        }
        return "";
    }
    if (!file) { return ""; }
    file = adone.std.path.resolve.apply(adone.std.path, arguments);
    try {
        return adone.std.fs.readFileSync(file, "utf8");
    } catch (e) {
        return "";
    }
}

/* Escape sequences */

// Mini-doc:

// ESC = \x1b
// CSI = ESC + [
// OSC = ESC + ]
// DSC = ESC + P
// ST = ESC + \	(end some sequences)

// CSI: ESC + [ + <command> + <type>
// It is possible to separate many command with a ';' before the final 'type'.

// See: http://en.wikipedia.org/wiki/ANSI_escape_code
// and: http://invisible-island.net/xterm/ctlseqs/ctlseqs.html
// man tput
// man infocmp
// man 5 terminfo
// For tput tcap name, see: http://pubs.opengroup.org/onlinepubs/7990989799/xcurses/terminfo.html
// useful command: infocmp -l $TERM

const esc = {
    /* Common sequences */

    // Reset the terminal
    reset: { on: "\x1bc" },

    /* Cursor sequences */
    cursorLeft: { on: "\x1b[1000D" },
    saveCursor: { on: "\x1b7" },	// also '\x1b[s'
    restoreCursor: { on: "\x1b8" },	// also '\x1b[u'

    up: { on: "\x1b[%UA" },
    down: { on: "\x1b[%UB" },
    right: { on: "\x1b[%UC" },
    left: { on: "\x1b[%UD" },
    nextLine: { on: "\x1b[%UE" },
    previousLine: { on: "\x1b[%UF" },
    column: { on: "\x1b[%UG" },
    row: { on: "\x1b[%Ud" },
    scrollUp: { on: "\x1b[%US" },
    scrollDown: { on: "\x1b[%UT" },
    moveTo: { on: "\x1b[%U;%UH" },
    // cursorPos: {
    //     on: "%[cursorPos:%a%a]F",
    //     handler(y, x) {
    //         return `\x1b[${++y};${++x}H`;
    //     }
    // },
    hideCursor: { on: "\x1b[?25l", off: "\x1b[?25h" },

    // Cursor styles
    blockCursor: { on: "\x1b[2 q" },
    blinkingBlockCursor: { on: "\x1b[0 q" },
    underlineCursor: { on: "\x1b[4 q" },
    blinkingUnderlineCursor: { on: "\x1b[3 q" },
    beamCursor: { on: "\x1b[6 q" },
    blinkingBeamCursor: { on: "\x1b[5 q" },

    /* Editing sequences */

    clear: { on: "\x1b[H\x1b[2J" },
    eraseDisplayBelow: { on: "\x1b[0J" },
    eraseDisplayAbove: { on: "\x1b[1J" },
    eraseDisplay: { on: "\x1b[2J" },
    eraseLineAfter: { on: "\x1b[0K" },
    eraseLineBefore: { on: "\x1b[1K" },
    eraseEndLine: { on: "\x1b[K" },
    eraseStartLine: { on: "\x1b[1K" },
    eraseLine: { on: "\x1b[2K" },
    insertLine: { on: "\x1b[%UL" },
    deleteLine: { on: "\x1b[%UM" },
    insert: { on: "\x1b[%U@" },	// insert char
    delete: { on: "\x1b[%UP" },	// delete char
    backDelete: { on: "\x1b[1D\x1b[1P" },	// Backspace-like, left(1) followed by delete(1)

    // This set the alternate screen buffer, do not work on many term, due to this titeInhibit shit...
    alternateScreenBuffer: { on: "\x1b[?1049h", off: "\x1b[?1049l" },

    alternateCharsetMode: { on: "\x1b(0", off: "\x1b(B" },

    /* Misc sequences */

    bell: { on: "\x07" },	// Emit an audible bell

    /* Input / Output sequences */

    // Terminal will send event on button pressed with mouse position
    mouseButton: { on: "\x1b[?1000h", off: "\x1b[?1000l" },

    // Terminal will send position of the column hilighted
    mouseHilight: { on: "\x1b[?1001h", off: "\x1b[?1001l" },

    // Terminal will send event on button pressed and mouse motion as long as a button is down, with mouse position
    mouseDrag: { on: "\x1b[?1002h", off: "\x1b[?1002l" },

    // Terminal will send event on button pressed and motion
    mouseMotion: { on: "\x1b[?1003h", off: "\x1b[?1003l" },

    // Another mouse protocol that extend coordinate mapping (without it, it supports only 223 rows and columns)
    mouseSGR: { on: "\x1b[?1006h", off: "\x1b[?1006l" },

    // Terminal will send event when it gains and loses focus
    focusEvent: { on: "\x1b[?1004h", off: "\x1b[?1004l" },

    // Should allow keypad to send different code than 0..9 keys but it does not works on some setup
    applicationKeypad: { on: "\x1b[?1h\x1b=", off: "\x1b[?1l\x1b>" },

    setScrollRegion: {
        on: "%[setScrollRegion:%a%a]F",
        handler(top, bottom) {
            return `\x1b[${++top};${++bottom}r`;
        }
    },

    /* OSC - OS Control sequences: may be unavailable on some context */

    // Set the title of an xterm-compatible window
    windowTitle: { on: "\x1b]0;%s\x07" }
};

const defaultConfig = {
    esc,
    support: {
        deltaEscapeSequence: true
    },
    bools: {
        back_color_erase: true
    }
};

function configuration(terminal) {
    let config;
    if (terminal === "xterm") {
        config = _.extend(adone.o(), defaultConfig);
    } else if (terminal === "xterm-256color") {
        config = _.merge(configuration("xterm"), {});
    } else if (terminal === "xterm-256color.generic") {
        const xtermGeneric = configuration("xterm.generic");
        config = _.merge(configuration("xterm-256color"), {
            esc: xtermGeneric.esc,
            handler: xtermGeneric.handler
        });
    } else if (terminal === "xterm.generic") { // generic xterm configuration
        config = _.merge(configuration("xterm"), {
            esc: {
                // KDE Konsole does not support that. This workaround use up()/down() & column(1)
                nextLine: { on: "\x1b[%UB\x1b[1G" },
                previousLine: { on: "\x1b[%UA\x1b[1G" },

                // Try that sequences for instance, if it fails gracefully, it will be kept Xterm sequences fail and write garbage
                blockCursor: { on: "\x1b]50;CursorShape=0\x07" },
                blinkingBlockCursor: { on: "\x1b]50;CursorShape=0\x07" },
                underlineCursor: { on: "\x1b]50;CursorShape=2\x07" },
                blinkingUnderlineCursor: { on: "\x1b]50;CursorShape=2\x07" },
                beamCursor: { on: "\x1b]50;CursorShape=1\x07" },
                blinkingBeamCursor: { on: "\x1b]50;CursorShape=1\x07" }
            }
        });
    } else if (terminal === "xfce") {
        config = _.merge(configuration("xterm-256color"), {
            esc: {
                // Cursor styles not supported
                blockCursor: { on: "", na: true },
                blinkingBlockCursor: { on: "", na: true },
                underlineCursor: { on: "", na: true },
                blinkingUnderlineCursor: { on: "", na: true },
                beamCursor: { on: "", na: true },
                blinkingBeamCursor: { on: "", na: true }
            }
        });
    } else if (terminal === "gnome") {
        config = _.merge(configuration("xterm"), {
            esc: {
                // Looks like a no go, gnome-terminal is too stubborn to let the application decide about that
                blockCursor: { on: "", na: true },
                blinkingBlockCursor: { on: "", na: true },
                underlineCursor: { on: "", na: true },
                blinkingUnderlineCursor: { on: "", na: true },
                beamCursor: { on: "", na: true },
                blinkingBeamCursor: { on: "", na: true }

                /*
                blockCursor: { on: '\x1b]50;CursorShape=0\x07' } ,
                blinkingBlockCursor: { on: '\x1b]50;CursorShape=0\x07' } ,
                underlineCursor: { on: '\x1b]50;CursorShape=2\x07' } ,
                blinkingUnderlineCursor: { on: '\x1b]50;CursorShape=2\x07' } ,
                beamCursor: { on: '\x1b]50;CursorShape=1\x07' } ,
                blinkingBeamCursor: { on: '\x1b]50;CursorShape=1\x07' }
                */
            }
        });
    } else if (terminal === "gnome-256color") {
        const gnome = configuration("gnome");
        config = _.merge(configuration("xterm-256color"), {
            esc: _.extend(gnome.esc, {}),
            handler: gnome.handler
        });
    } else if (terminal === "konsole") {
        config = _.merge(configuration("xterm"), {
            esc: {
                // Amazingly, those uber-standard and uber-common sequences are *NOT* supported by Konsole...
                // SHAME on you KDE! Even the Linux Console support it!
                // This workaround use up()/down() & column(1)
                nextLine: { on: "\x1b[%UB\x1b[1G" },
                previousLine: { on: "\x1b[%UA\x1b[1G" },

                // Cursor styles
                blockCursor: { on: "\x1b]50;CursorShape=0\x07" },
                blinkingBlockCursor: { on: "\x1b]50;CursorShape=0\x07" },
                underlineCursor: { on: "\x1b]50;CursorShape=2\x07" },
                blinkingUnderlineCursor: { on: "\x1b]50;CursorShape=2\x07" },
                beamCursor: { on: "\x1b]50;CursorShape=1\x07" },
                blinkingBeamCursor: { on: "\x1b]50;CursorShape=1\x07" }
            },
        });
    } else if (terminal === "konsole-256color") {
        const xterm256 = configuration("xterm-256color");
        const konsole = configuration("konsole");

        config = _.merge(xterm256, {
            esc: _.extend(konsole.esc, {}),
            handler: konsole.handler
        });
    } else if (terminal === "eterm") {
        config = _.merge(configuration("xterm"), {
            esc: {
                // Cursor styles not supported
                blockCursor: { on: "", na: true },
                blinkingBlockCursor: { on: "", na: true },
                underlineCursor: { on: "", na: true },
                blinkingUnderlineCursor: { on: "", na: true },
                beamCursor: { on: "", na: true },
                blinkingBeamCursor: { on: "", na: true },

                // Not capable, fallback to mouseButton
                mouseDrag: { on: "\x1b[?1000h", off: "\x1b[?1000l", fb: true },
                mouseMotion: { on: "\x1b[?1000h", off: "\x1b[?1000l", fb: true }
            },
        });
    } else if (terminal === "eterm-256color") {
        const eterm = configuration("eterm");

        config = _.merge(configuration("xterm-256color"), {
            esc: _.extend(eterm.esc, {}),
            handler: eterm.handler,
        });
    } else if (terminal === "rxvt") {
        config = _.merge(configuration("xterm"), {
            esc: {
                // Cursor styles not supported
                blockCursor: { on: "", na: true },
                blinkingBlockCursor: { on: "", na: true },
                underlineCursor: { on: "", na: true },
                blinkingUnderlineCursor: { on: "", na: true },
                beamCursor: { on: "", na: true },
                blinkingBeamCursor: { on: "", na: true },

                // Not capable, fallback to mouseButton
                mouseDrag: { on: "\x1b[?1000h", off: "\x1b[?1000l", fb: true },
                mouseMotion: { on: "\x1b[?1000h", off: "\x1b[?1000l", fb: true }
            },
        });
    } else if (terminal === "rxvt-256color") {
        const rxvt = configuration("rxvt");

        config = _.merge(configuration("xterm-256color"), {
            esc: _.extend(rxvt.esc, {}),
            handler: rxvt.handler,
        });
    } else if (terminal === "linux") {
        const xterm = configuration("xterm");

        config = _.merge(xterm, {
            esc: {
                // Clear screen
                clear: { on: "\x1b[H\x1b[J" },

                // Cursor styles
                hideCursor: { on: "\x1b[?1c", off: "\x1b[?0c" },
                blockCursor: { on: "\x1b[?16;0;16c" },
                blinkingBlockCursor: { on: "\x1b[?6c" },
                underlineCursor: { on: "\x1b[?2c" },	// it's blinking anyway
                blinkingUnderlineCursor: { on: "\x1b[?2c" },
                beamCursor: { on: "" },	// do not exists
                blinkingBeamCursor: { on: "" },	// do not exists

                /* OSC */

                // Does not exist, silently drop it...
                windowTitle: { on: "%D" },

                mouseHilight: { on: "", off: "" },
                mouseSGR: { on: "", off: "" },
                focusEvent: { on: "", off: "" }
            },
            support: {
                deltaEscapeSequence: false
            },
        });
    } else if (terminal === "windows-ansi.generic") {
        config = _.merge(configuration("xterm.generic"), {
            esc: {
                reset: { on: "" },
                saveCursor: { on: "" },
                restoreCursor: { on: "" }
            }
        });
    }
    return config;
}

const pseudoEsc = {
    // It just set attr:true so it will not write anything, but return an attribute object
    attr: { attr: true },

    // It just set noFormat:true so it will not call string.format() on user input,
    // only useful for ScreenBuffer, so blit-like redraw() can perform slightly faster
    noFormat: { noFormat: true },
    markupOnly: { markupOnly: true },

    move: {
        on: "%[move:%a%a]F",
        handler: function move(x, y) {
            let sequence = "";

            if (x) {
                if (x > 0) {
                    sequence += this.root.format(this.root.esc.right.on, x);
                } else {
                    sequence += this.root.format(this.root.esc.left.on, -x);
                }
            }
            if (y) {
                if (y > 0) {
                    sequence += this.root.format(this.root.esc.down.on, y);
                } else {
                    sequence += this.root.format(this.root.esc.up.on, -y);
                }
            }

            return sequence;
        }
    }
};

function applyEscape(options) {
    let onFormat = [options.on];
    let on;
    let off;
    let action = arguments[1 + options.params];

    if (options.params) {
        onFormat = onFormat.concat(Array.prototype.slice.call(arguments, 1, 1 + options.params));
    }

    if (is.undefined(action) || action === true) {
        on = options.onHasFormatting ? options.root.format.apply(undefined, onFormat) : options.on;
        return on;
    }

    if (is.null(action) || action === false) {
        off = options.offHasFormatting ? options.root.format(options.off) : options.off;
        return off;
    }

    if (typeof action !== "string") {
        if (is.function(action.toString)) {
            action = action.toString();
        } else {
            action = "";
        }
    }

    on = options.onHasFormatting ? options.root.format.apply(undefined, onFormat) : options.on;
    action = options.root.format.apply(undefined, Array.prototype.slice.call(arguments, 1 + options.params));
    off = options.offHasFormatting ? options.root.format(options.off) : options.off;

    return [on, action, off].join("");
}

export default class Terminfo {
    constructor() {
        this.terminal = process.env.COLORTERM || process.env.TERM;
        const safe = (process.env.COLORTERM || (process.env.TERM !== "xterm" && process.env.TERM !== "xterm-256color")) ? true : false;
        const is256color = (process.env.TERM && process.env.TERM.match(/256/)) || (process.env.COLORTERM && process.env.COLORTERM.match(/256/));
        switch (this.terminal) {
            case "xterm":
            case "xterm-256color":
                if (safe) {
                    break;
                }
                for (const envVar in process.env) {
                    if (envVar.match(/KONSOLE/)) {
                        this.terminal = is256color ? "konsole-256color" : "konsole";
                        break;
                    }
                }
                if (Number.parseInt(process.env.VTE_VERSION) >= 3803) {
                    this.terminal = is256color ? "gnome-256color" : "gnome";
                    break;
                }
                break;
            case "linux":
            case "aterm":
            case "kuake":
            case "tilda":
            case "terminology":
            case "wterm":
            case "mrxvt":
                break;
            case "truecolor":
                this.terminal = "gnome-256color";
                break;
            case "gnome":
            case "gnome-256color":
            case "gnome-terminal":
            case "gnome-terminal-256color":
            case "terminator": // it uses gnome terminal lib
            case "guake": // same here
                this.terminal = is256color ? "gnome-256color" : "gnome";
                break;
            case "konsole":
                this.terminal = is256color ? "konsole-256color" : "konsole";
                break;
            case "rxvt":
            case "rxvt-xpm":
            case "rxvt-unicode-256color":
            case "urxvt256c":
            case "urxvt256c-ml":
            case "rxvt-unicode":
            case "urxvt":
            case "urxvt-ml":
                if (process.env.TERM === "rxvt") {
                    this.terminal = "rxvt-256color";
                } else {
                    this.terminal = is256color ? "rxvt-256color" : "rxvt";
                }
                break;
            case "xfce":
            case "xfce-terminal":
            case "xfce4-terminal":
                this.terminal = "xfce";
                break;
            case "eterm":
            case "Eterm":
                this.terminal = is256color ? "eterm-256color" : "eterm";
                break;
            case "atomic-terminal":
                this.terminal = "atomic-terminal";
                break;
            default:
                break;
        }

        this._cachedGetPath = "";
        this._input = null;
        this._output = null;
        this.state = {
            fullscreen: false,
            button: {
                left: false,
                middle: false,
                right: false,
                other: false
            }
        };

        // const input = Terminfo.getTTYInput();
        // const output = Terminfo.getTTYOutput();
        this.generic = (process.env.COLORTERM === "truecolor" ? "xterm-256color" : ((process.env.TERM && process.env.TERM) || (process.platform === "win32" ? "windows-ansi" : "xterm")).toLowerCase());

        if (this.generic === "screen") {
            this.generic = "xterm";
        } else if (this.generic === "cygwin") {
            this.generic = "windows-ansi";
        }

        // For some reason, starting from node v4, once process.stdin getter is triggered, the 'tty' command does not work.
        // This 'hack' cache the result of the command 'tty' if we are in the linux console, so 'gpm' can work.
        if (this.generic === "linux") {
            this.getTTYPath();
        }

        let termConfig;
        if (this.terminal) {
            try {
                termConfig = configuration(this.terminal);
            } catch (error) { }
        }
        if (!termConfig) {
            try {
                termConfig = configuration(`${this.generic}.generic`);
            } catch (error) {
                try {
                    termConfig = configuration(this.generic);
                } catch (error) {
                    termConfig = configuration("xterm.generic");
                }
            }
        }

        _.extend(termConfig.esc, pseudoEsc);
        _.extend(this, termConfig);

        const fnOptions = {
            on: "",
            off: "",
            params: 0//,
            //            out: this.getTTYOutput()
        };

        this.escHandler = {};
        this.escOffHandler = {};

        Object.keys(this.esc).forEach((key) => {
            // build-time resolution
            if (is.function(this.esc[key].on)) {
                this.esc[key].on = this.esc[key].on.call(this);
            }
            if (is.function(this.esc[key].off)) {
                this.esc[key].off = this.esc[key].off.call(this);
            }

            // dynamic handler
            if (this.esc[key].handler) {
                if (is.function(this.esc[key].handler)) {
                    this.escHandler[key] = this.esc[key].handler;
                } else {
                    this.escHandler[key] = this.handler[this.esc[key].handler];
                }
            }

            // dynamic off handler
            if (this.esc[key].offHandler) {
                if (is.function(this.esc[key].offHandler)) {
                    this.escOffHandler[key] = this.esc[key].offHandler;
                } else {
                    this.escOffHandler[key] = this.handler[this.esc[key].offHandler];
                }
            }

            Object.defineProperty(this, key, {
                configurable: true,
                get() {
                    const options = _.extend({}, fnOptions);
                    options.on += this.root.esc[key].on || "";
                    options.off = (this.root.esc[key].off || "") + options.off;
                    options.params += adone.format.count(this.root.esc[key].on);

                    if (!options.onHasFormatting && (options.params || (is.string(this.root.esc[key].on) && adone.format.hasFormatting(this.root.esc[key].on)))) {
                        options.onHasFormatting = true;
                    }

                    if (!options.offHasFormatting && (is.string(this.root.esc[key].off) && adone.format.hasFormatting(this.root.esc[key].off))) {
                        options.offHasFormatting = true;
                    }

                    const fn = applyEscape.bind(undefined, options);

                    Object.defineProperty(this, key, { value: fn });

                    return fn;
                }
            });
        });

        fnOptions.root = this;
        const formatFn = {};
        for (const k in this.escHandler) {
            formatFn[k] = this.escHandler[k] = this.escHandler[k].bind(this);
        }
        for (const k in this.escOffHandler) {
            formatFn[`${k}_off`] = this.escOffHandler[k] = this.escOffHandler[k].bind(this);
        }

        this.format = adone.format.formatMethod.bind({ fn: formatFn });
        this.escHandler.root = this;
        this.escOffHandler.root = this;
        this.root = this;

        this.extended = true;
        this.error = null;
        this.setup();
    }

    /*
        getPath( [stdin] )
            * stdin: a stream that is the current STDIN of the terminal
        
        Returns an object, where:
            * ttyPath: the path of the tty
            * ttyIndex: the index number of the tty, only if it is a /dev/tty*, /dev/pts/* return null
    */
    getTTYPath(stdin) {
        let cacheIt;
        let ttyPath;

        if (!stdin) {
            // getPath() does not work as soon as process.stdin getter is triggered (since node v4)
            // So 0 should be used instead of process.stdin
            stdin = 0;
            //stdin = process.stdin ;
        }

        if (stdin === 0 || stdin === process.stdin) {
            if (this._cachedGetPath) { return this._cachedGetPath; }
            cacheIt = true;
        }


        try {
            // if no stdio are passed, the command will report 'not a TTY'
            ttyPath = adone.std.child_process.execSync("tty", { stdio: [stdin, null, null] }).toString();
        } catch (error) {
            ttyPath = error.stdout.toString();
        }

        ttyPath = ttyPath.trim();

        const matches = ttyPath.match(/\/dev\/tty([0-9]*)/);
        const ttyIndex = matches ? matches[1] || null : null;
        const result = {
            path: ttyPath,
            index: ttyIndex
        };

        if (cacheIt) { this._cachedGetPath = result; }
        return result;
    }

    getTTYInput() {
        if (is.null(this._input)) {
            let input;
            if (adone.std.tty.isatty(0)) {
                input = process.stdin;
            } else {
                const inputFd = adone.std.fs.openSync("/dev/tty", "r");
                if (!adone.std.tty.isatty(inputFd)) {
                    throw new Error("Input file descriptor is not a TTY.");
                }
                input = new adone.std.tty.ReadStream(inputFd);
                input._type = "tty";
            }
            this._input = input;
        }
        return this._input;
    }

    getTTYOutput() {
        if (is.null(this._output)) {
            let output;
            if (adone.std.tty.isatty(1)) {
                output = process.stdout;
            } else {
                const outputFd = adone.std.fs.openSync("/dev/tty", "w");
                if (!adone.std.tty.isatty(outputFd)) {
                    throw new Error("Output file descriptor is not a TTY.");
                }
                output = new adone.std.tty.WriteStream(outputFd);
                output._type = "tty";
            }

            // Hack to have the stdout stream not keep the event loop alive.
            // See: https://github.com/joyent/node/issues/1726
            // XXX: remove/fix this once src/node.js does something different as well.
            // @cronvel: that doesn't work much either...
            if (output._handle && output._handle.unref) {
                output._handle.unref();
            }

            // Update the "columns" and "rows" properties on the stdout stream
            // whenever the console window gets resized.
            if (output._refreshSize) {
                process.on("SIGWINCH", () => {
                    output._refreshSize();
                });
            }
            this._output = output;
        }
        return this._output;
    }

    setup() {
        this.error = null;
        try {
            if (this.termcap) {
                try {
                    this.injectTermcap();
                } catch (e) {
                    if (this.debug) {
                        throw e;
                    }
                    this.error = new Error("Termcap parse error.");
                    this._useInternalCap(this.generic);
                }
            } else {
                try {
                    this.injectTerminfo();
                } catch (e) {
                    if (this.debug) {
                        throw e;
                    }
                    this.error = new Error("Terminfo parse error.");
                    this._useInternalInfo(this.generic);
                }
            }
        } catch (e) {
            // If there was an error, fallback to an internally stored terminfo/cap.
            if (this.debug) {
                throw e;
            }
            this.error = new Error("Terminfo not found.");
            this._useXtermInfo();
        }
    }

    term(is) {
        return this.terminal.indexOf(is) === 0;
    }

    _debug(...args) {
        if (this.debug) {
            return console.log.apply(console, args);
        }
    }

    /**
     * Fallback
     */
    _useVt102Cap() {
        return this.injectTermcap("vt102");
    }

    _useXtermCap() {
        return this.injectTermcap(adone.std.path.join(__dirname, "../../../defaults/terminal/xterm.termcap"));
    }

    _useXtermInfo() {
        return this.injectTerminfo(adone.std.path.join(__dirname, "../../../defaults/terminal/xterm"));
    }

    _useInternalInfo(name) {
        name = adone.std.path.basename(name);
        return this.injectTerminfo(adone.std.path.join(__dirname, "../../../defaults/terminal", name));
    }

    _useInternalCap(name) {
        name = adone.std.path.basename(name);
        return this.injectTermcap(adone.std.path.join(__dirname, "../../../defaults/terminal", `${name}.termcap`));
    }

    readTerminfo(term) {
        let data;
        let file;
        let info;

        term = term || this.generic;

        file = adone.std.path.normalize(this._prefix(term));
        data = adone.std.fs.readFileSync(file);
        info = this.parseTerminfo(data, file);

        if (this.debug) {
            this._terminfo = info;
        }

        return info;
    }

    _prefix(term) {
        // If we have a terminfoFile, or our
        // term looks like a filename, use it.
        if (term) {
            if (~term.indexOf(adone.std.path.sep)) {
                return term;
            }
            if (this.terminfoFile) {
                return this.terminfoFile;
            }
        }

        const paths = Terminfo.ipaths.slice();
        let file;

        if (this.terminfoPrefix) {
            paths.unshift(this.terminfoPrefix);
        }

        // Try exact matches.
        file = this._tprefix(paths, term);
        if (file) {
            return file;
        }

        // Try similar matches.
        file = this._tprefix(paths, term, true);
        if (file) {
            return file;
        }

        // Not found.
        throw new Error("Terminfo directory not found.");
    }

    _tprefix(prefix, term, soft) {
        if (!prefix) {
            return;
        }

        let file
            , dir
            , i
            , sdiff
            , sfile
            , list;

        if (Array.isArray(prefix)) {
            for (i = 0; i < prefix.length; i++) {
                file = this._tprefix(prefix[i], term, soft);
                if (file) { return file; }
            }
            return;
        }

        let find = function (word) {
            let file, ch;

            file = adone.std.path.resolve(prefix, word[0]);
            try {
                adone.std.fs.statSync(file);
                return file;
            } catch (e) { }

            ch = word[0].charCodeAt(0).toString(16);
            if (ch.length < 2) { ch = "0" + ch; }

            file = adone.std.path.resolve(prefix, ch);
            try {
                adone.std.fs.statSync(file);
                return file;
            } catch (e) {

            }
        };

        if (!term) {
            // Make sure the directory's sub-directories
            // are all one-letter, or hex digits.
            // return find('x') ? prefix : null;
            try {
                dir = adone.std.fs.readdirSync(prefix).filter((file) => {
                    return file.length !== 1 && !/^[0-9a-fA-F]{2}$/.test(file);
                });
                if (!dir.length) {
                    return prefix;
                }
            } catch (e) {

            }
            return;
        }

        term = adone.std.path.basename(term);
        dir = find(term);

        if (!dir) { return; }

        if (soft) {
            try {
                list = adone.std.fs.readdirSync(dir);
            } catch (e) {
                return;
            }

            list.forEach((file) => {
                if (file.indexOf(term) === 0) {
                    let diff = file.length - term.length;
                    if (!sfile || diff < sdiff) {
                        sdiff = diff;
                        sfile = file;
                    }
                }
            });

            return sfile && (soft || sdiff === 0) ? adone.std.path.resolve(dir, sfile) : null;
        }

        file = adone.std.path.resolve(dir, term);
        try {
            adone.std.fs.statSync(file);
            return file;
        } catch (e) {

        }
    }

    /**
     * Terminfo Parser
     * All shorts are little-endian
     */
    parseTerminfo(data, file) {
        let info = {}
            , extended
            , l = data.length
            , i = 0
            , v
            , o;

        let h = info.header = {
            dataSize: data.length,
            headerSize: 12,
            magicNumber: (data[1] << 8) | data[0],
            namesSize: (data[3] << 8) | data[2],
            boolCount: (data[5] << 8) | data[4],
            numCount: (data[7] << 8) | data[6],
            strCount: (data[9] << 8) | data[8],
            strTableSize: (data[11] << 8) | data[10]
        };

        h.total = h.headerSize
            + h.namesSize
            + h.boolCount
            + h.numCount * 2
            + h.strCount * 2
            + h.strTableSize;

        i += h.headerSize;

        // Names Section
        let names = data.toString("ascii", i, i + h.namesSize - 1)
            , parts = names.split("|")
            , name = parts[0]
            , desc = parts.pop();

        info.name = name;
        info.names = parts;
        info.desc = desc;

        info.dir = adone.std.path.resolve(file, "..", "..");
        info.file = file;

        i += h.namesSize - 1;

        // Names is nul-terminated.
        i++;

        // Booleans Section
        // One byte for each flag
        // Same order as <term.h>
        info.bools = {};
        l = i + h.boolCount;
        o = 0;
        for (; i < l; i++) {
            v = Terminfo.bools[o++];
            info.bools[v] = data[i] === 1;
        }

        // Null byte in between to make sure numbers begin on an even byte.
        if (i % 2) {
            i++;
        }

        // Numbers Section
        info.numbers = {};
        l = i + h.numCount * 2;
        o = 0;
        for (; i < l; i += 2) {
            v = Terminfo.numbers[o++];
            if (data[i + 1] === 0xff && data[i] === 0xff) {
                info.numbers[v] = -1;
            } else {
                info.numbers[v] = (data[i + 1] << 8) | data[i];
            }
        }

        // Strings Section
        info.strings = {};
        l = i + h.strCount * 2;
        o = 0;
        for (; i < l; i += 2) {
            v = Terminfo.strings[o++];
            if (data[i + 1] === 0xff && data[i] === 0xff) {
                info.strings[v] = -1;
            } else {
                info.strings[v] = (data[i + 1] << 8) | data[i];
            }
        }

        // String Table
        Object.keys(info.strings).forEach((key) => {
            if (info.strings[key] === -1) {
                delete info.strings[key];
                return;
            }

            // Workaround: fix an odd bug in the screen-256color terminfo where it tries
            // to set -1, but it appears to have {0xfe, 0xff} instead of {0xff, 0xff}.
            // TODO: Possibly handle errors gracefully below, as well as in the
            // extended info. Also possibly do: `if (info.strings[key] >= data.length)`.
            if (info.strings[key] === 65534) {
                delete info.strings[key];
                return;
            }

            let s = i + info.strings[key]
                , j = s;

            while (data[j]) { j++; }

            info.strings[key] = data.toString("ascii", s, j);
        });

        // Extended Header
        if (this.extended !== false) {
            i--;
            i += h.strTableSize;
            if (i % 2) {
                i++;
            }
            l = data.length;
            if (i < l - 1) {
                try {
                    extended = this.parseExtended(data.slice(i));
                } catch (e) {
                    if (this.debug) {
                        throw e;
                    }
                    return info;
                }
                info.header.extended = extended.header;
                ["bools", "numbers", "strings"].forEach((key) => {
                    merge(info[key], extended[key]);
                });
            }
        }

        return info;
    }

    /**
     * Extended Parsing
     */

    // Some data to help understand:

    // For xterm, non-extended header:
    // { dataSize: 3270,
    //   headerSize: 12,
    //   magicNumber: 282,
    //   namesSize: 48,
    //   boolCount: 38,
    //   numCount: 15,
    //   strCount: 413,
    //   strTableSize: 1388,
    //   total: 2342 }

    // For xterm, header:
    // Offset: 2342
    // { header:
    //    { dataSize: 928,
    //      headerSize: 10,
    //      boolCount: 2,
    //      numCount: 1,
    //      strCount: 57,
    //      strTableSize: 117,
    //      lastStrTableOffset: 680,
    //      total: 245 },

    // For xterm, layout:
    // { header: '0 - 10', // length: 10
    //   bools: '10 - 12', // length: 2
    //   numbers: '12 - 14', // length: 2
    //   strings: '14 - 128', // length: 114 (57 short)
    //   symoffsets: '128 - 248', // length: 120 (60 short)
    //   stringtable: '248 - 612', // length: 364
    //   sym: '612 - 928' } // length: 316
    //
    // How lastStrTableOffset works:
    //   data.length - h.lastStrTableOffset === 248
    //     (sym-offset end, string-table start)
    //   364 + 316 === 680 (lastStrTableOffset)
    // How strTableSize works:
    //   h.strCount + [symOffsetCount] === h.strTableSize
    //   57 + 60 === 117 (strTableSize)
    //   symOffsetCount doesn't actually exist in the header. it's just implied.
    // Getting the number of sym offsets:
    //   h.symOffsetCount = h.strTableSize - h.strCount;
    //   h.symOffsetSize = (h.strTableSize - h.strCount) * 2;

    parseExtended(data) {
        let info = {}
            , l = data.length
            , i = 0;

        let h = info.header = {
            dataSize: data.length,
            headerSize: 10,
            boolCount: (data[i + 1] << 8) | data[i + 0],
            numCount: (data[i + 3] << 8) | data[i + 2],
            strCount: (data[i + 5] << 8) | data[i + 4],
            strTableSize: (data[i + 7] << 8) | data[i + 6],
            lastStrTableOffset: (data[i + 9] << 8) | data[i + 8]
        };

        // h.symOffsetCount = h.strTableSize - h.strCount;

        h.total = h.headerSize
            + h.boolCount
            + h.numCount * 2
            + h.strCount * 2
            + h.strTableSize;

        i += h.headerSize;

        // Booleans Section
        // One byte for each flag
        let _bools = [];
        l = i + h.boolCount;
        for (; i < l; i++) {
            _bools.push(data[i] === 1);
        }

        // Null byte in between to make sure numbers begin on an even byte.
        if (i % 2) {
            i++;
        }

        // Numbers Section
        let _numbers = [];
        l = i + h.numCount * 2;
        for (; i < l; i += 2) {
            if (data[i + 1] === 0xff && data[i] === 0xff) {
                _numbers.push(-1);
            } else {
                _numbers.push((data[i + 1] << 8) | data[i]);
            }
        }

        // Strings Section
        let _strings = [];
        l = i + h.strCount * 2;
        for (; i < l; i += 2) {
            if (data[i + 1] === 0xff && data[i] === 0xff) {
                _strings.push(-1);
            } else {
                _strings.push((data[i + 1] << 8) | data[i]);
            }
        }

        // Pass over the sym offsets and get to the string table.
        i = data.length - h.lastStrTableOffset;
        // Might be better to do this instead if the file has trailing bytes:
        // i += h.symOffsetCount * 2;

        // String Table
        let high = 0;
        _strings.forEach((offset, k) => {
            if (offset === -1) {
                _strings[k] = "";
                return;
            }

            let s = i + offset
                , j = s;

            while (data[j]) { j++; }

            // Find out where the string table ends by
            // getting the highest string length.
            if (high < j - i) {
                high = j - i;
            }

            _strings[k] = data.toString("ascii", s, j);
        });

        // Symbol Table
        // Add one to the highest string length because we didn't count \0.
        i += high + 1;
        l = data.length;

        let sym = []
            , j;

        for (; i < l; i++) {
            j = i;
            while (data[j]) { j++; }
            sym.push(data.toString("ascii", i, j));
            i = j;
        }

        // Identify by name
        j = 0;

        info.bools = {};
        _bools.forEach((bool) => {
            info.bools[sym[j++]] = bool;
        });

        info.numbers = {};
        _numbers.forEach((number) => {
            info.numbers[sym[j++]] = number;
        });

        info.strings = {};
        _strings.forEach((string) => {
            info.strings[sym[j++]] = string;
        });

        // Should be the very last bit of data.

        return info;
    }

    compileTerminfo(term) {
        return this.compile(this.readTerminfo(term));
    }

    injectTerminfo(term) {
        return this.inject(this.compileTerminfo(term));
    }

    /**
     * Compiler - terminfo cap->javascript
     */

    compile(info) {
        let self = this;

        if (!info) {
            throw new Error("Terminal not found.");
        }

        this.detectFeatures(info);

        this._debug(info);

        info.all = {};
        // info.methods = {};

        ["bools", "numbers", "strings"].forEach((type) => {
            Object.keys(info[type]).forEach((key) => {
                info.all[key] = info[type][key];
                // info.methods[key] = self._compile(info, key, info.all[key]);
            });
        });

        // Terminfo.bools.forEach(function (key) {
        //     if (info.methods[key] == null) info.methods[key] = false;
        // });

        // Terminfo.numbers.forEach(function (key) {
        //     if (info.methods[key] == null) info.methods[key] = -1;
        // });

        // Terminfo.strings.forEach(function (key) {
        //     if (!info.methods[key]) info.methods[key] = noop;
        // });

        // Object.keys(info.methods).forEach(function (key) {
        //     if (!Terminfo.alias[key]) return;
        //     Terminfo.alias[key].forEach(function (alias) {
        //         info.methods[alias] = info.methods[key];
        //     });
        //     // Could just use:
        //     // Object.keys(Terminfo.aliasMap).forEach(function(key) {
        //     //   info.methods[key] = info.methods[Terminfo.aliasMap[key]];
        //     // });
        // });

        return info;
    }

    inject(info) {
        let self = this;
        // let methods = info.methods || info;

        // Object.keys(methods).forEach(function (key) {
        //     if (typeof methods[key] !== "function") {
        //         self[key] = methods[key];
        //         return;
        //     }
        //     self[key] = function () {
        //         var args = Array.prototype.slice.call(arguments);
        //         return methods[key].call(self, args);
        //     };
        // });

        this.info = info;
        this.all = info.all;
        // this.methods = info.methods;
        this.bools = info.bools;
        this.numbers = info.numbers;
        this.strings = info.strings;

        if (!~info.names.indexOf(this.generic)) {
            this.generic = info.name;
        }

        this.features = info.features;
        Object.keys(info.features).forEach((key) => {
            if (key === "padding") {
                if (!info.features.padding && self.options.padding !== true) {
                    self.padding = false;
                }
                return;
            }
            self[key] = info.features[key];
        });
    }

    // See:
    // ~/ncurses/ncurses/tinfo/lib_tparm.c
    // ~/ncurses/ncurses/tinfo/comp_scan.c
    _compile(info, key, str) {
        let v;

        this._debug("Compiling %s: %s", key, JSON.stringify(str));

        switch (typeof str) {
            case "boolean":
                return str;
            case "number":
                return str;
            case "string":
                break;
            default:
                return noop;
        }

        if (!str) {
            return noop;
        }

        // See:
        // ~/ncurses/progs/tput.c - tput() - L149
        // ~/ncurses/progs/tset.c - set_init() - L992
        if (key === "init_file" || key === "reset_file") {
            try {
                str = adone.std.fs.readFileSync(str, "utf8");
                if (this.debug) {
                    v = (`return ${JSON.stringify(str)};`)
                        .replace(/\x1b/g, "\\x1b")
                        .replace(/\r/g, "\\r")
                        .replace(/\n/g, "\\n");
                    process.stdout.write(`${v}\n`);
                }
                return function () {
                    return str;
                };
            } catch (e) {
                return noop;
            }
        }

        let tkey = `${info.name}.${key}`
            , header = "var v, dyn = {}, stat = {}, stack = [], out = [];"
            , footer = ";return out.join(\"\");"
            , code = header
            , val = str
            , buff = ""
            , cap
            , ch
            , fi
            , then
            , els
            , end;

        function read(regex, no) {
            cap = regex.exec(val);
            if (!cap) { return; }
            val = val.substring(cap[0].length);
            ch = cap[1];
            if (!no) { clear(); }
            return cap;
        }

        function stmt(c) {
            if (code[code.length - 1] === ",") {
                code = code.slice(0, -1);
            }
            code += c;
        }

        function expr(c) {
            code += `${c},`;
        }

        function echo(c) {
            if (c === "\"\"") { return; }
            expr(`out.push(${c})`);
        }

        function print(c) {
            buff += c;
        }

        function clear() {
            if (buff) {
                echo(JSON.stringify(buff).replace(/\\u00([0-9a-fA-F]{2})/g, "\\x$1"));
                buff = "";
            }
        }

        while (val) {
            // Ignore newlines
            if (read(/^\n /, true)) {
                continue;
            }

            // '^A' -> ^A
            if (read(/^\^(.)/i, true)) {
                if (!(ch >= " " && ch <= "~")) {
                    this._debug("%s: bad caret char.", tkey);
                    // NOTE: ncurses appears to simply
                    // continue in this situation, but
                    // I could be wrong.
                    print(cap[0]);
                    continue;
                }
                if (ch === "?") {
                    ch = "\x7f";
                } else {
                    ch = ch.charCodeAt(0) & 31;
                    if (ch === 0) { ch = 128; }
                    ch = String.fromCharCode(ch);
                }
                print(ch);
                continue;
            }

            // 3 octal digits -> character
            if (read(/^\\([0-7]{3})/, true)) {
                print(String.fromCharCode(parseInt(ch, 8)));
                continue;
            }

            // '\e' -> ^[
            // '\n' -> \n
            // '\r' -> \r
            // '\0' -> \200 (special case)
            if (read(/^\\([eEnlrtbfs\^\\,:0]|.)/, true)) {
                switch (ch) {
                    case "e":
                    case "E":
                        ch = "\x1b";
                        break;
                    case "n":
                        ch = "\n";
                        break;
                    case "l":
                        ch = "\x85";
                        break;
                    case "r":
                        ch = "\r";
                        break;
                    case "t":
                        ch = "\t";
                        break;
                    case "b":
                        ch = "\x08";
                        break;
                    case "f":
                        ch = "\x0c";
                        break;
                    case "s":
                        ch = " ";
                        break;
                    case "^":
                        ch = "^";
                        break;
                    case "\\":
                        ch = "\\";
                        break;
                    case ",":
                        ch = ",";
                        break;
                    case ":":
                        ch = ":";
                        break;
                    case "0":
                        ch = "\x80";
                        break;
                    case "a":
                        ch = "\x07";
                        break;
                    default:
                        this._debug("%s: bad backslash char.", tkey);
                        ch = cap[0];
                        break;
                }
                print(ch);
                continue;
            }

            // $<5> -> padding
            // e.g. flash_screen: '\u001b[?5h$<100/>\u001b[?5l',
            if (read(/^\$<(\d+)([*\/]{0,2})>/, true)) {
                if (this.padding) { print(cap[0]); }
                continue;
            }

            // %%   outputs `%'
            if (read(/^%%/, true)) {
                print("%");
                continue;
            }

            // %[[:]flags][width[.precision]][doxXs]
            //   as in printf, flags are [-+#] and space.  Use a `:' to allow the
            //   next character to be a `-' flag, avoiding interpreting "%-" as an
            //   operator.
            // %c   print pop() like %c in printf
            // Example from screen terminfo:
            //   S0: "\u001b(%p1%c"
            // %d   print pop()
            // "Print (e.g., "%d") is a special case."
            // %s   print pop() like %s in printf
            if (read(/^%((?::-|[+# ]){1,4})?(\d+(?:\.\d+)?)?([doxXsc])/)) {
                if (this.printf || cap[1] || cap[2] || ~"oxX".indexOf(cap[3])) {
                    echo(`sprintf("${cap[0].replace(":-", "-")}", stack.pop())`);
                } else if (cap[3] === "c") {
                    echo("(v = stack.pop(), isFinite(v) "
                        + "? String.fromCharCode(v || 0200) : \"\")");
                } else {
                    echo("stack.pop()");
                }
                continue;
            }

            // %p[1-9]
            //   push i'th parameter
            if (read(/^%p([1-9])/)) {
                expr(`(stack.push(v = params[${ch - 1}]), v)`);
                continue;
            }

            // %P[a-z]
            //   set dynamic variable [a-z] to pop()
            if (read(/^%P([a-z])/)) {
                expr(`dyn.${ch} = stack.pop()`);
                continue;
            }

            // %g[a-z]
            //   get dynamic variable [a-z] and push it
            if (read(/^%g([a-z])/)) {
                expr(`(stack.push(dyn.${ch}), dyn.${ch})`);
                continue;
            }

            // %P[A-Z]
            //   set static variable [a-z] to pop()
            if (read(/^%P([A-Z])/)) {
                expr(`stat.${ch} = stack.pop()`);
                continue;
            }

            // %g[A-Z]
            //   get static variable [a-z] and push it
            //   The  terms  "static"  and  "dynamic" are misleading.  Historically,
            //   these are simply two different sets of variables, whose values are
            //   not reset between calls to tparm.  However, that fact is not
            //   documented in other implementations.  Relying on it will adversely
            //   impact portability to other implementations.
            if (read(/^%g([A-Z])/)) {
                expr(`(stack.push(v = stat.${ch}), v)`);
                continue;
            }

            // %'c' char constant c
            // NOTE: These are stored as c chars, exemplified by:
            // cursor_address: "\u001b=%p1%' '%+%c%p2%' '%+%c"
            if (read(/^%'(.)'/)) {
                expr(`(stack.push(v = ${ch.charCodeAt(0)}), v)`);
                continue;
            }

            // %{nn}
            //   integer constant nn
            if (read(/^%\{(\d+)\}/)) {
                expr(`(stack.push(v = ${ch}), v)`);
                continue;
            }

            // %l   push strlen(pop)
            if (read(/^%l/)) {
                expr("(stack.push(v = (stack.pop() || \"\").length || 0), v)");
                continue;
            }

            // %+ %- %* %/ %m
            //   arithmetic (%m is mod): push(pop() op pop())
            // %& %| %^
            //   bit operations (AND, OR and exclusive-OR): push(pop() op pop())
            // %= %> %<
            //   logical operations: push(pop() op pop())
            if (read(/^%([+\-*\/m&|\^=><])/)) {
                if (ch === "=") { ch = "==="; }
                else if (ch === "m") { ch = "%"; }
                expr(`${"(v = stack.pop(),"
                    + " stack.push(v = (stack.pop() "}${ch} v) || 0),`
                    + ` v)`);
                continue;
            }

            // %A, %O
            //   logical AND and OR operations (for conditionals)
            if (read(/^%([AO])/)) {
                // Are we supposed to store the result on the stack?
                expr(`(stack.push(v = (stack.pop() ${
                    ch === "A" ? "&&" : "||"
                    } stack.pop())), v)`);
                continue;
            }

            // %! %~
            //   unary operations (logical and bit complement): push(op pop())
            if (read(/^%([!~])/)) {
                expr(`(stack.push(v = ${ch}stack.pop()), v)`);
                continue;
            }

            // %i   add 1 to first two parameters (for ANSI terminals)
            if (read(/^%i/)) {
                // Are these supposed to go on the stack in certain situations?
                // ncurses doesn't seem to put them on the stack, but xterm.user6
                // seems to assume they're on the stack for some reason. Could
                // just be a bad terminfo string.
                // user6: "\u001b[%i%d;%dR" - possibly a termcap-style string.
                // expr('(params[0] |= 0, params[1] |= 0, params[0]++, params[1]++)');
                expr("(params[0]++, params[1]++)");
                continue;
            }

            // %? expr %t thenpart %e elsepart %;
            //   This forms an if-then-else.  The %e elsepart is optional.  Usually
            //   the %? expr part pushes a value onto the stack, and %t pops it from
            //   the stack, testing if it is nonzero (true).  If it is zero (false),
            //   control passes to the %e (else) part.
            //   It is possible to form else-if's a la Algol 68:
            //     %? c1 %t b1 %e c2 %t b2 %e c3 %t b3 %e c4 %t b4 %e %;
            //   where ci are conditions, bi are bodies.
            if (read(/^%\?/)) {
                end = -1;
                stmt(";if (");
                continue;
            }

            if (read(/^%t/)) {
                end = -1;
                // Technically this is supposed to pop everything off the stack that was
                // pushed onto the stack after the if statement, see man terminfo.
                // Right now, we don't pop anything off. This could cause compat issues.
                // Perhaps implement a "pushed" counter from the time the if statement
                // is added, to the time the then statement is added, and pop off
                // the appropriate number of elements.
                // while (pushed--) expr('stack.pop()');
                stmt(") {");
                continue;
            }

            // Terminfo does elseif's like
            // this: %?[expr]%t...%e[expr]%t...%;
            if (read(/^%e/)) {
                fi = val.indexOf("%?");
                then = val.indexOf("%t");
                els = val.indexOf("%e");
                end = val.indexOf("%;");
                if (end === -1) { end = Infinity; }
                if (then !== -1 && then < end
                    && (fi === -1 || then < fi)
                    && (els === -1 || then < els)) {
                    stmt("} else if (");
                } else {
                    stmt("} else {");
                }
                continue;
            }

            if (read(/^%;/)) {
                end = null;
                stmt("}");
                continue;
            }

            buff += val[0];
            val = val.substring(1);
        }

        // Clear the buffer of any remaining text.
        clear();

        // Some terminfos (I'm looking at you, atari-color), don't end an if
        // statement. It's assumed terminfo will automatically end it for
        // them, because they are a bunch of lazy bastards.
        if (end != null) {
            stmt("}");
        }

        // Add the footer.
        stmt(footer);

        // Optimize and cleanup generated code.
        v = code.slice(header.length, -footer.length);
        if (!v.length) {
            code = "return \"\";";
        } else if (v = /^out\.push\(("(?:[^"]|\\")+")\)$/.exec(v)) {
            code = `return ${v[1]};`;
        } else {
            // Turn `(stack.push(v = params[0]), v),out.push(stack.pop())`
            // into `out.push(params[0])`.
            code = code.replace(
                /\(stack\.push\(v = params\[(\d+)\]\), v\),out\.push\(stack\.pop\(\)\)/g,
                "out.push(params[$1])");

            // Remove unnecessary variable initializations.
            v = code.slice(header.length, -footer.length);
            if (!~v.indexOf("v = ")) { code = code.replace("v, ", ""); }
            if (!~v.indexOf("dyn")) { code = code.replace("dyn = {}, ", ""); }
            if (!~v.indexOf("stat")) { code = code.replace("stat = {}, ", ""); }
            if (!~v.indexOf("stack")) { code = code.replace("stack = [], ", ""); }

            // Turn `var out = [];out.push("foo"),` into `var out = ["foo"];`.
            code = code.replace(
                /out = \[\];out\.push\(("(?:[^"]|\\")+")\),/,
                "out = [$1];");
        }

        // Terminfos `wyse350-vb`, and `wy350-w`
        // seem to have a few broken strings.
        if (str === "\u001b%?") {
            code = "return \"\\x1b\";";
        }

        if (this.debug) {
            v = code
                .replace(/\x1b/g, "\\x1b")
                .replace(/\r/g, "\\r")
                .replace(/\n/g, "\\n");
            process.stdout.write(`${v}\n`);
        }

        try {
            // if (this.options.stringify && code.indexOf("return ") === 0) {
            //     return new Function("", code)();
            // }
            return this.printf || ~code.indexOf("sprintf(") ? new Function("sprintf, params", code).bind(null, adone.sprintf) : new Function("params", code);
        } catch (e) {
            console.error("");
            console.error("Error on %s:", tkey);
            console.error(JSON.stringify(str));
            console.error("");
            console.error(code.replace(/(,|;)/g, "$1\n"));
            e.stack = e.stack.replace(/\x1b/g, "\\x1b");
            throw e;
        }
    }

    // See: ~/ncurses/ncurses/tinfo/lib_tputs.c
    _print(code, print, done) {
        let xon = !this.bools.needs_xon_xoff || this.bools.xon_xoff;

        print = print || write;
        done = done || noop;

        if (!this.padding) {
            print(code);
            return done();
        }

        let parts = code.split(/(?=\$<[\d.]+[*\/]{0,2}>)/)
            , i = 0;

        (function next() {
            if (i === parts.length) {
                return done();
            }

            let part = parts[i++]
                , padding = /^\$<([\d.]+)([*\/]{0,2})>/.exec(part)
                , amount
                , suffix;
            // , affect;

            if (!padding) {
                print(part);
                return next();
            }

            part = part.substring(padding[0].length);
            amount = Number(padding[1]);
            suffix = padding[2];

            // A `/'  suffix indicates  that  the  padding  is  mandatory and forces a
            // delay of the given number of milliseconds even on devices for which xon
            // is present to indicate flow control.
            if (xon && !~suffix.indexOf("/")) {
                print(part);
                return next();
            }

            // A `*' indicates that the padding required is proportional to the number
            // of lines affected by the operation, and  the amount  given  is the
            // per-affected-unit padding required.  (In the case of insert character,
            // the factor is still the number of lines affected.) Normally, padding is
            // advisory if the device has the xon capability; it is used for cost
            // computation but does not trigger delays.
            if (~suffix.indexOf("*")) {
                // XXX Disable this for now.
                amount = amount;
                // if (affect = /\x1b\[(\d+)[LM]/.exec(part)) {
                //   amount *= +affect[1];
                // }
                // The above is a huge workaround. In reality, we need to compile
                // `_print` into the string functions and check the cap name and
                // params.
                // if (cap === 'insert_line' || cap === 'delete_line') {
                //   amount *= params[0];
                // }
                // if (cap === 'clear_screen') {
                //   amount *= process.stdout.rows;
                // }
            }

            return setTimeout(() => {
                print(part);
                return next();
            }, amount);
        })();
    }

    readTermcap(term) {
        let self = this
            , terms
            , term_
            , root
            , paths;

        term = term || this.generic;

        // Termcap has a bunch of terminals usually stored in one file/string,
        // so we need to find the one containing our desired terminal.
        if (~term.indexOf(adone.std.path.sep) && (terms = this._tryCap(adone.std.path.resolve(term)))) {
            term_ = adone.std.path.basename(term).split(".")[0];
            if (terms[process.env.TERM]) {
                term = process.env.TERM;
            } else if (terms[term_]) {
                term = term_;
            } else {
                term = Object.keys(terms)[0];
            }
        } else {
            paths = Terminfo.cpaths.slice();

            if (this.termcapFile) {
                paths.unshift(this.termcapFile);
            }

            paths.push(Terminfo.termcap);

            terms = this._tryCap(paths, term);
        }

        if (!terms) {
            throw new Error(`Cannot find termcap for: ${term}`);
        }

        root = terms[term];

        if (this.debug) {
            this._termcap = terms;
        }

        (function tc(term) {
            if (term && term.strings.tc) {
                root.inherits = root.inherits || [];
                root.inherits.push(term.strings.tc);

                let names = terms[term.strings.tc]
                    ? terms[term.strings.tc].names
                    : [term.strings.tc];

                self._debug("%s inherits from %s.",
                    term.names.join("/"), names.join("/"));

                let inherit = tc(terms[term.strings.tc]);
                if (inherit) {
                    ["bools", "numbers", "strings"].forEach((type) => {
                        merge(term[type], inherit[type]);
                    });
                }
            }
            return term;
        })(root);

        // Translate termcap names to terminfo-style names.
        root = this.translateTermcap(root);

        return root;
    }

    _tryCap(file, term) {
        if (!file) { return; }

        let terms
            , data
            , i;

        if (Array.isArray(file)) {
            for (i = 0; i < file.length; i++) {
                data = this._tryCap(file[i], term);
                if (data) { return data; }
            }
            return;
        }

        // If the termcap string starts with `/`,
        // ncurses considers it a filename.
        data = file[0] === "/"
            ? tryRead(file)
            : file;

        if (!data) { return; }

        terms = this.parseTermcap(data, file);

        if (term && !terms[term]) {
            return;
        }

        return terms;
    }

    /**
     * Termcap Parser
     *  http://en.wikipedia.org/wiki/Termcap
     *  http://www.gnu.org/software
     *    /termutils/manual/termcap-1.3/html_mono/termcap.html
     *  http://www.gnu.org/software
     *    /termutils/manual/termcap-1.3/html_mono/termcap.html#SEC17
     *  http://tldp.org/HOWTO/Text-Terminal-HOWTO.html#toc16
     *  man termcap
     */

    // Example:
    // vt102|dec vt102:\
    //  :do=^J:co#80:li#24:cl=50\E[;H\E[2J:\
    //  :le=^H:bs:cm=5\E[%i%d;%dH:nd=2\E[C:up=2\E[A:\
    //  :ce=3\E[K:cd=50\E[J:so=2\E[7m:se=2\E[m:us=2\E[4m:ue=2\E[m:\
    //  :md=2\E[1m:mr=2\E[7m:mb=2\E[5m:me=2\E[m:is=\E[1;24r\E[24;1H:\
    //  :rs=\E>\E[?3l\E[?4l\E[?5l\E[?7h\E[?8h:ks=\E[?1h\E=:ke=\E[?1l\E>:\
    //  :ku=\EOA:kd=\EOB:kr=\EOC:kl=\EOD:kb=^H:\
    //  :ho=\E[H:k1=\EOP:k2=\EOQ:k3=\EOR:k4=\EOS:pt:sr=5\EM:vt#3:\
    //  :sc=\E7:rc=\E8:cs=\E[%i%d;%dr:vs=\E[?7l:ve=\E[?7h:\
    //  :mi:al=\E[L:dc=\E[P:dl=\E[M:ei=\E[4l:im=\E[4h:

    parseTermcap(data, file) {
        let terms = {}
            , parts
            , term
            , entries
            , fields
            , field
            , names
            , i
            , j
            , k;

        // remove escaped newlines
        data = data.replace(/\\\n[ \t]*/g, "");

        // remove comments
        data = data.replace(/^#[^\n]+/gm, "");

        // split entries
        entries = data.trim().split(/\n+/);

        for (i = 0; i < entries.length; i++) {
            fields = entries[i].split(/:+/);
            for (j = 0; j < fields.length; j++) {
                field = fields[j].trim();
                if (!field) { continue; }

                if (j === 0) {
                    names = field.split("|");
                    term = {
                        name: names[0],
                        names,
                        desc: names.pop(),
                        file: ~file.indexOf(adone.std.path.sep) ? adone.std.path.resolve(file) : file,
                        termcap: true
                    };

                    for (k = 0; k < names.length; k++) {
                        terms[names[k]] = term;
                    }

                    term.bools = {};
                    term.numbers = {};
                    term.strings = {};

                    continue;
                }

                if (~field.indexOf("=")) {
                    parts = field.split("=");
                    term.strings[parts[0]] = parts.slice(1).join("=");
                } else if (~field.indexOf("#")) {
                    parts = field.split("#");
                    term.numbers[parts[0]] = Number(parts.slice(1).join("#"));
                } else {
                    term.bools[field] = true;
                }
            }
        }

        return terms;
    }

    /**
     * Termcap Compiler
     *  man termcap
     */
    translateTermcap(info) {
        let self = this
            , out = {};

        if (!info) { return; }

        this._debug(info);

        ["name", "names", "desc", "file", "termcap"].forEach((key) => {
            out[key] = info[key];
        });

        // Separate aliases for termcap
        let map = (function () {
            let out = {};

            Object.keys(Terminfo.alias).forEach((key) => {
                let aliases = Terminfo.alias[key];
                out[aliases.termcap] = key;
            });

            return out;
        })();

        // Translate termcap cap names to terminfo cap names.
        // e.g. `up` -> `cursor_up`
        ["bools", "numbers", "strings"].forEach((key) => {
            out[key] = {};
            Object.keys(info[key]).forEach((cap) => {
                if (key === "strings") {
                    info.strings[cap] = self._captoinfo(cap, info.strings[cap], 1);
                }
                if (map[cap]) {
                    out[key][map[cap]] = info[key][cap];
                } else {
                    // NOTE: Possibly include all termcap names
                    // in a separate alias.js file. Some are
                    // missing from the terminfo alias.js file
                    // which is why we have to do this:
                    // See: $ man termcap
                    out[key][cap] = info[key][cap];
                }
            });
        });

        return out;
    }

    compileTermcap(term) {
        return this.compile(this.readTermcap(term));
    }

    injectTermcap(term) {
        return this.inject(this.compileTermcap(term));
    }

    /**
     * _nc_captoinfo - ported to javascript directly from ncurses.
     * Copyright (c) 1998-2009,2010 Free Software Foundation, Inc.
     * See: ~/ncurses/ncurses/tinfo/captoinfo.c
     *
     * Convert a termcap string to terminfo format.
     * 'cap' is the relevant terminfo capability index.
     * 's' is the string value of the capability.
     * 'parameterized' tells what type of translations to do:
     *    % translations if 1
     *    pad translations if >=0
     */

    _captoinfo(cap, s, parameterized) {
        let self = this;

        let capstart;

        if (parameterized == null) {
            parameterized = 0;
        }

        let MAX_PUSHED = 16
            , stack = [];

        let stackptr = 0
            , onstack = 0
            , seenm = 0
            , seenn = 0
            , seenr = 0
            , param = 1
            , i = 0
            , out = "";

        function warn() {
            let args = Array.prototype.slice.call(arguments);
            args[0] = `captoinfo: ${args[0] || ""}`;
            return self._debug.apply(self, args);
        }

        function isdigit(ch) {
            return ch >= "0" && ch <= "9";
        }

        function isgraph(ch) {
            return ch > " " && ch <= "~";
        }

        // convert a character to a terminfo push
        function cvtchar(sp) {
            let c = "\0"
                , len;

            let j = i;

            switch (sp[j]) {
                case "\\":
                    switch (sp[++j]) {
                        case "'":
                        case "$":
                        case "\\":
                        case "%":
                            c = sp[j];
                            len = 2;
                            break;
                        case "\0":
                            c = "\\";
                            len = 1;
                            break;
                        case "0":
                        case "1":
                        case "2":
                        case "3":
                            len = 1;
                            while (isdigit(sp[j])) {
                                c = String.fromCharCode(8 * c.charCodeAt(0)
                                    + (sp[j++].charCodeAt(0) - "0".charCodeAt(0)));
                                len++;
                            }
                            break;
                        default:
                            c = sp[j];
                            len = 2;
                            break;
                    }
                    break;
                case "^":
                    c = String.fromCharCode(sp[++j].charCodeAt(0) & 0x1f);
                    len = 2;
                    break;
                default:
                    c = sp[j];
                    len = 1;
            }
            if (isgraph(c) && c !== "," && c !== "'" && c !== "\\" && c !== ":") {
                out += "%'";
                out += c;
                out += "'";
            } else {
                out += "%{";
                if (c.charCodeAt(0) > 99) {
                    out += String.fromCharCode(
                        (c.charCodeAt(0) / 100 | 0) + "0".charCodeAt(0));
                }
                if (c.charCodeAt(0) > 9) {
                    out += String.fromCharCode(
                        (c.charCodeAt(0) / 10 | 0) % 10 + "0".charCodeAt(0));
                }
                out += String.fromCharCode(
                    c.charCodeAt(0) % 10 + "0".charCodeAt(0));
                out += "}";
            }

            return len;
        }

        // push n copies of param on the terminfo stack if not already there
        function getparm(parm, n) {
            if (seenr) {
                if (parm === 1) {
                    parm = 2;
                } else if (parm === 2) {
                    parm = 1;
                }
            }

            if (onstack === parm) {
                if (n > 1) {
                    warn("string may not be optimal");
                    out += "%Pa";
                    while (n--) {
                        out += "%ga";
                    }
                }
                return;
            }

            if (onstack !== 0) {
                push();
            }

            onstack = parm;

            while (n--) {
                out += "%p";
                out += String.fromCharCode("0".charCodeAt(0) + parm);
            }

            if (seenn && parm < 3) {
                out += "%{96}%^";
            }

            if (seenm && parm < 3) {
                out += "%{127}%^";
            }
        }

        // push onstack on to the stack
        function push() {
            if (stackptr >= MAX_PUSHED) {
                warn("string too complex to convert");
            } else {
                stack[stackptr++] = onstack;
            }
        }

        // pop the top of the stack into onstack
        function pop() {
            if (stackptr === 0) {
                if (onstack === 0) {
                    warn("I'm confused");
                } else {
                    onstack = 0;
                }
            } else {
                onstack = stack[--stackptr];
            }
            param++;
        }

        function see03() {
            getparm(param, 1);
            out += "%3d";
            pop();
        }

        function invalid() {
            out += "%";
            i--;
            warn("unknown %% code %s (%#x) in %s",
                JSON.stringify(s[i]), s[i].charCodeAt(0), cap);
        }

        // skip the initial padding (if we haven't been told not to)
        capstart = null;
        if (s == null) { s = ""; }

        if (parameterized >= 0 && isdigit(s[i])) {
            for (capstart = i; ; i++) {
                if (!(isdigit(s[i]) || s[i] === "*" || s[i] === ".")) {
                    break;
                }
            }
        }

        while (s[i]) {
            switch (s[i]) {
                case "%":
                    i++;
                    if (parameterized < 1) {
                        out += "%";
                        break;
                    }
                    switch (s[i++]) {
                        case "%":
                            out += "%";
                            break;
                        case "r":
                            if (seenr++ === 1) {
                                warn("saw %%r twice in %s", cap);
                            }
                            break;
                        case "m":
                            if (seenm++ === 1) {
                                warn("saw %%m twice in %s", cap);
                            }
                            break;
                        case "n":
                            if (seenn++ === 1) {
                                warn("saw %%n twice in %s", cap);
                            }
                            break;
                        case "i":
                            out += "%i";
                            break;
                        case "6":
                        case "B":
                            getparm(param, 1);
                            out += "%{10}%/%{16}%*";
                            getparm(param, 1);
                            out += "%{10}%m%+";
                            break;
                        case "8":
                        case "D":
                            getparm(param, 2);
                            out += "%{2}%*%-";
                            break;
                        case ">":
                            getparm(param, 2);
                            // %?%{x}%>%t%{y}%+%;
                            out += "%?";
                            i += cvtchar(s);
                            out += "%>%t";
                            i += cvtchar(s);
                            out += "%+%;";
                            break;
                        case "a":
                            if ((s[i] === "=" || s[i] === "+" || s[i] === "-"
                                || s[i] === "*" || s[i] === "/")
                                && (s[i + 1] === "p" || s[i + 1] === "c")
                                && s[i + 2] !== "\0" && s[i + 2]) {
                                var l;
                                l = 2;
                                if (s[i] !== "=") {
                                    getparm(param, 1);
                                }
                                if (s[i + 1] === "p") {
                                    getparm(param + s[i + 2].charCodeAt(0) - "@".charCodeAt(0), 1);
                                    if (param !== onstack) {
                                        pop();
                                        param--;
                                    }
                                    l++;
                                } else {
                                    i += 2, l += cvtchar(s), i -= 2;
                                }
                                switch (s[i]) {
                                    case "+":
                                        out += "%+";
                                        break;
                                    case "-":
                                        out += "%-";
                                        break;
                                    case "*":
                                        out += "%*";
                                        break;
                                    case "/":
                                        out += "%/";
                                        break;
                                    case "=":
                                        if (seenr) {
                                            if (param === 1) {
                                                onstack = 2;
                                            } else if (param === 2) {
                                                onstack = 1;
                                            } else {
                                                onstack = param;
                                            }
                                        } else {
                                            onstack = param;
                                        }
                                        break;
                                }
                                i += l;
                                break;
                            }
                            getparm(param, 1);
                            i += cvtchar(s);
                            out += "%+";
                            break;
                        case "+":
                            getparm(param, 1);
                            i += cvtchar(s);
                            out += "%+%c";
                            pop();
                            break;
                        case "s":
                            // #ifdef WATERLOO
                            //          i += cvtchar(s);
                            //          getparm(param, 1);
                            //          out += '%-';
                            // #else
                            getparm(param, 1);
                            out += "%s";
                            pop();
                            // #endif /* WATERLOO */
                            break;
                        case "-":
                            i += cvtchar(s);
                            getparm(param, 1);
                            out += "%-%c";
                            pop();
                            break;
                        case ".":
                            getparm(param, 1);
                            out += "%c";
                            pop();
                            break;
                        case "0": // not clear any of the historical termcaps did this
                            if (s[i] === "3") {
                                see03(); // goto
                                break;
                            } else if (s[i] !== "2") {
                                invalid(); // goto
                                break;
                            }
                        // FALLTHRU
                        case "2":
                            getparm(param, 1);
                            out += "%2d";
                            pop();
                            break;
                        case "3":
                            see03();
                            break;
                        case "d":
                            getparm(param, 1);
                            out += "%d";
                            pop();
                            break;
                        case "f":
                            param++;
                            break;
                        case "b":
                            param--;
                            break;
                        case "\\":
                            out += "%\\";
                            break;
                        default:
                            invalid();
                            break;
                    }
                    break;
                // #ifdef REVISIBILIZE
                //    case '\\':
                //      out += s[i++];
                //      out += s[i++];
                //      break;
                //    case '\n':
                //      out += '\\n';
                //      i++;
                //      break;
                //    case '\t':
                //      out += '\\t';
                //      i++;
                //      break;
                //    case '\r':
                //      out += '\\r';
                //      i++;
                //      break;
                //    case '\200':
                //      out += '\\0';
                //      i++;
                //      break;
                //    case '\f':
                //      out += '\\f';
                //      i++;
                //      break;
                //    case '\b':
                //      out += '\\b';
                //      i++;
                //      break;
                //    case ' ':
                //      out += '\\s';
                //      i++;
                //      break;
                //    case '^':
                //      out += '\\^';
                //      i++;
                //      break;
                //    case ':':
                //      out += '\\:';
                //      i++;
                //      break;
                //    case ',':
                //      out += '\\,';
                //      i++;
                //      break;
                //    default:
                //      if (s[i] === '\033') {
                //        out += '\\E';
                //        i++;
                //      } else if (s[i].charCodeAt(0) > 0 && s[i].charCodeAt(0) < 32) {
                //        out += '^';
                //        out += String.fromCharCode(s[i].charCodeAt(0) + '@'.charCodeAt(0));
                //        i++;
                //      } else if (s[i].charCodeAt(0) <= 0 || s[i].charCodeAt(0) >= 127) {
                //        out += '\\';
                //        out += String.fromCharCode(
                //          ((s[i].charCodeAt(0) & 0300) >> 6) + '0'.charCodeAt(0));
                //        out += String.fromCharCode(
                //          ((s[i].charCodeAt(0) & 0070) >> 3) + '0'.charCodeAt(0));
                //        out += String.fromCharCode(
                //          (s[i].charCodeAt(0) & 0007) + '0'.charCodeAt(0));
                //        i++;
                //      } else {
                //        out += s[i++];
                //      }
                //      break;
                // #else
                default:
                    out += s[i++];
                    break;
                // #endif
            }
        }

        // Now, if we stripped off some leading padding, add it at the end
        // of the string as mandatory padding.
        if (capstart != null) {
            out += "$<";
            for (i = capstart; ; i++) {
                if (isdigit(s[i]) || s[i] === "*" || s[i] === ".") {
                    out += s[i];
                } else {
                    break;
                }
            }
            out += "/>";
        }

        if (s !== out) {
            warn("Translating %s from %s to %s.",
                cap, JSON.stringify(s), JSON.stringify(out));
        }

        return out;
    }

    /**
     * Compile All Terminfo
     */

    getAll() {
        let dir = this._prefix()
            , list = asort(adone.std.fs.readdirSync(dir))
            , infos = [];

        list.forEach((letter) => {
            let terms = asort(adone.std.fs.readdirSync(adone.std.path.resolve(dir, letter)));
            infos.push.apply(infos, terms);
        });

        function asort(obj) {
            return obj.sort((a, b) => {
                a = a.toLowerCase().charCodeAt(0);
                b = b.toLowerCase().charCodeAt(0);
                return a - b;
            });
        }

        return infos;
    }

    compileAll(start) {
        let self = this
            , all = {};

        this.getAll().forEach((name) => {
            if (start && name !== start) {
                return;
            } else {
                start = null;
            }
            all[name] = self.compileTerminfo(name);
        });

        return all;
    }

    /**
     * Detect Features / Quirks
     */
    detectFeatures(info) {
        let data = this.parseACS(info);
        info.features = {
            unicode: this.detectUnicode(info),
            brokenACS: this.detectBrokenACS(info),
            PCRomSet: this.detectPCRomSet(info),
            magicCookie: this.detectMagicCookie(info),
            padding: this.detectPadding(info),
            setbuf: this.detectSetbuf(info),
            acsc: data.acsc,
            acscr: data.acscr
        };
        return info.features;
    }

    detectUnicode() {
        if (process.env.NCURSES_FORCE_UNICODE != null) {
            return Boolean(+process.env.NCURSES_FORCE_UNICODE);
        }

        let LANG = `${process.env.LANG
            }:${process.env.LANGUAGE
            }:${process.env.LC_ALL
            }:${process.env.LC_CTYPE}`;

        return /utf-?8/i.test(LANG) || (this.GetConsoleCP() === 65001);
    }

    // For some reason TERM=linux has smacs/rmacs, but it maps to `^[[11m`
    // and it does not switch to the DEC SCLD character set. What the hell?
    // xterm: \x1b(0, screen: \x0e, linux: \x1b[11m (doesn't work)
    // `man console_codes` says:
    // 11  select null mapping, set display control flag, reset tog‐
    //     gle meta flag (ECMA-48 says "first alternate font").
    // See ncurses:
    // ~/ncurses/ncurses/base/lib_set_term.c
    // ~/ncurses/ncurses/tinfo/lib_acs.c
    // ~/ncurses/ncurses/tinfo/tinfo_driver.c
    // ~/ncurses/ncurses/tinfo/lib_setup.c
    detectBrokenACS(info) {
        // ncurses-compatible env variable.
        if (process.env.NCURSES_NO_UTF8_ACS != null) {
            return Boolean(+process.env.NCURSES_NO_UTF8_ACS);
        }

        // If the terminal supports unicode, we don't need ACS.
        if (info.numbers.U8 >= 0) {
            return Boolean(info.numbers.U8);
        }

        // The linux console is just broken for some reason.
        // Apparently the Linux console does not support ACS,
        // but it does support the PC ROM character set.
        if (info.name === "linux") {
            return true;
        }

        // PC alternate charset
        // if (acsc.indexOf('+\x10,\x11-\x18.\x190') === 0) {
        if (this.detectPCRomSet(info)) {
            return true;
        }

        // screen termcap is bugged?
        if (this.termcap
            && info.name.indexOf("screen") === 0
            && process.env.TERMCAP
            && ~process.env.TERMCAP.indexOf("screen")
            && ~process.env.TERMCAP.indexOf("hhII00")) {
            if (~info.strings.enter_alt_charset_mode.indexOf("\x0e")
                || ~info.strings.enter_alt_charset_mode.indexOf("\x0f")
                || ~info.strings.set_attributes.indexOf("\x0e")
                || ~info.strings.set_attributes.indexOf("\x0f")) {
                return true;
            }
        }

        return false;
    }

    // If enter_pc_charset is the same as enter_alt_charset,
    // the terminal does not support SCLD as ACS.
    // See: ~/ncurses/ncurses/tinfo/lib_acs.c
    detectPCRomSet(info) {
        let s = info.strings;
        if (s.enter_pc_charset_mode && s.enter_alt_charset_mode
            && s.enter_pc_charset_mode === s.enter_alt_charset_mode
            && s.exit_pc_charset_mode === s.exit_alt_charset_mode) {
            return true;
        }
        return false;
    }

    detectMagicCookie() {
        return process.env.NCURSES_NO_MAGIC_COOKIE == null;
    }

    detectPadding() {
        return process.env.NCURSES_NO_PADDING == null;
    }

    detectSetbuf() {
        return process.env.NCURSES_NO_SETBUF == null;
    }

    parseACS(info) {
        let data = {};

        data.acsc = {};
        data.acscr = {};

        // Possibly just return an empty object, as done here, instead of
        // specifically saying ACS is "broken" above. This would be more
        // accurate to ncurses logic. But it doesn't really matter.
        if (this.detectPCRomSet(info)) {
            return data;
        }

        // See: ~/ncurses/ncurses/tinfo/lib_acs.c: L208
        Object.keys(Terminfo.acsc).forEach((ch) => {
            let acs_chars = info.strings.acs_chars || ""
                , i = acs_chars.indexOf(ch)
                , next = acs_chars[i + 1];

            if (!next || i === -1 || !Terminfo.acsc[next]) {
                return;
            }

            data.acsc[ch] = Terminfo.acsc[next];
            data.acscr[Terminfo.acsc[next]] = ch;
        });

        return data;
    }

    GetConsoleCP() {
        let ccp;

        if (process.platform !== "win32") {
            return -1;
        }

        // Allow unicode on all windows consoles for now:
        if (Number(process.env.NCURSES_NO_WINDOWS_UNICODE) !== 1) {
            return 65001;
        }

        // adone.std.child_process.execSync('chcp 65001', { stdio: 'ignore', timeout: 1500 });

        try {
            // Produces something like: 'Active code page: 437\n\n'
            ccp = adone.std.child_process.execFileSync(`${process.env.WINDIR}\\system32\\chcp.com`, [], {
                stdio: ["ignore", "pipe", "ignore"],
                encoding: "ascii",
                timeout: 1500
            });
            // ccp = adone.std.child_process.execSync('chcp', {
            //   stdio: ['ignore', 'pipe', 'ignore'],
            //   encoding: 'ascii',
            //   timeout: 1500
            // });
        } catch (e) {

        }

        ccp = /\d+/.exec(ccp);

        if (!ccp) {
            return -1;
        }

        ccp = Number(ccp[0]);

        return ccp;
    }

    has(name) {
        name = Terminfo.aliasMap[name];

        let val = this.all[name];

        if (!name) { return false; }

        if (typeof val === "number") {
            return val !== -1;
        }

        return Boolean(val);
    }
}
/**
 * Terminfo
 */
Terminfo.ipaths = [
    process.env.TERMINFO || "",
    (process.env.TERMINFO_DIRS || "").split(":"),
    `${process.env.HOME || ""}/.terminfo`,
    "/usr/share/terminfo",
    "/usr/share/lib/terminfo",
    "/usr/lib/terminfo",
    "/usr/local/share/terminfo",
    "/usr/local/share/lib/terminfo",
    "/usr/local/lib/terminfo",
    "/usr/local/ncurses/lib/terminfo",
    "/lib/terminfo"
];

// A small helper function if we want to easily output text with setTimeouts.
Terminfo.print = function () {
    let fake = {
        padding: true,
        bools: { needs_xon_xoff: true, xon_xoff: false }
    };
    return Terminfo.prototype._print.apply(fake, arguments);
};

/**
 * Termcap
 */

Terminfo.cpaths = [
    process.env.TERMCAP || "",
    (process.env.TERMPATH || "").split(/[: ]/),
    `${process.env.HOME || ""}/.termcap`,
    "/usr/share/misc/termcap",
    "/etc/termcap"
];

/**
 * Aliases
 */

/**
 * alias.js - terminfo/cap aliases for blessed.
 * https://github.com/chjj/blessed
 * Taken from terminfo(5) man page.
 */

/* jshint maxlen: 300 */
// jscs:disable maximumLineLength
// jscs:disable

Terminfo._alias = {};

// These are the boolean capabilities:
Terminfo._alias.bools = {
    //         Variable                                      Cap-                               TCap                                  Description
    //         Booleans                                      name                               Code
    auto_left_margin: ["bw", "bw"], //                                cub1 wraps from col‐ umn 0 to last column
    auto_right_margin: ["am", "am"], //                                terminal has auto‐ matic margins
    back_color_erase: ["bce", "ut"], //                                screen erased with background color
    can_change: ["ccc", "cc"], //                                terminal can re- define existing col‐ ors
    ceol_standout_glitch: ["xhp", "xs"], //                                standout not erased by overwriting (hp)
    col_addr_glitch: ["xhpa", "YA"], //                                only positive motion for hpa/mhpa caps
    cpi_changes_res: ["cpix", "YF"], //                                changing character pitch changes reso‐ lution
    cr_cancels_micro_mode: ["crxm", "YB"], //                                using cr turns off micro mode
    dest_tabs_magic_smso: ["xt", "xt"], //                                tabs destructive, magic so char (t1061)
    eat_newline_glitch: ["xenl", "xn"], //                                newline ignored after 80 cols (con‐ cept)
    erase_overstrike: ["eo", "eo"], //                                can erase over‐ strikes with a blank
    generic_type: ["gn", "gn"], //                                generic line type
    hard_copy: ["hc", "hc"], //                                hardcopy terminal
    hard_cursor: ["chts", "HC"], //                                cursor is hard to see
    has_meta_key: ["km", "km"], //                                Has a meta key (i.e., sets 8th-bit)
    has_print_wheel: ["daisy", "YC"], //                                printer needs opera‐ tor to change char‐ acter set
    has_status_line: ["hs", "hs"], //                                has extra status line
    hue_lightness_saturation: ["hls", "hl"], //                                terminal uses only HLS color notation (Tektronix)
    insert_null_glitch: ["in", "in"], //                                insert mode distin‐ guishes nulls
    lpi_changes_res: ["lpix", "YG"], //                                changing line pitch changes resolution
    memory_above: ["da", "da"], //                                display may be retained above the screen
    memory_below: ["db", "db"], //                                display may be retained below the screen
    move_insert_mode: ["mir", "mi"], //                                safe to move while in insert mode
    move_standout_mode: ["msgr", "ms"], //                                safe to move while in standout mode
    needs_xon_xoff: ["nxon", "nx"], //                                padding will not work, xon/xoff required
    no_esc_ctlc: ["xsb", "xb"], //                                beehive (f1=escape, f2=ctrl C)
    no_pad_char: ["npc", "NP"], //                                pad character does not exist
    non_dest_scroll_region: ["ndscr", "ND"], //                                scrolling region is non-destructive
    non_rev_rmcup: ["nrrmc", "NR"], //                                smcup does not reverse rmcup
    over_strike: ["os", "os"], //                                terminal can over‐ strike
    prtr_silent: ["mc5i", "5i"], //                                printer will not echo on screen
    row_addr_glitch: ["xvpa", "YD"], //                                only positive motion for vpa/mvpa caps
    semi_auto_right_margin: ["sam", "YE"], //                                printing in last column causes cr
    status_line_esc_ok: ["eslok", "es"], //                                escape can be used on the status line
    tilde_glitch: ["hz", "hz"], //                                cannot print ~'s (hazeltine)
    transparent_underline: ["ul", "ul"], //                                underline character overstrikes
    xon_xoff: ["xon", "xo"]  //                                terminal uses xon/xoff handshaking
};

// These are the numeric capabilities:
Terminfo._alias.numbers = {
    //         Variable                                      Cap-                               TCap                                  Description
    //          Numeric                                      name                               Code
    columns: ["cols", "co"], //                                number of columns in a line
    init_tabs: ["it", "it"], //                                tabs initially every # spaces
    label_height: ["lh", "lh"], //                                rows in each label
    label_width: ["lw", "lw"], //                                columns in each label
    lines: ["lines", "li"], //                                number of lines on screen or page
    lines_of_memory: ["lm", "lm"], //                                lines of memory if > line. 0 means varies
    magic_cookie_glitch: ["xmc", "sg"], //                                number of blank characters left by smso or rmso
    max_attributes: ["ma", "ma"], //                                maximum combined attributes terminal can handle
    max_colors: ["colors", "Co"], //                                maximum number of colors on screen
    max_pairs: ["pairs", "pa"], //                                maximum number of color-pairs on the screen
    maximum_windows: ["wnum", "MW"], //                                maximum number of defineable windows
    no_color_video: ["ncv", "NC"], //                                video attributes that cannot be used with colors
    num_labels: ["nlab", "Nl"], //                                number of labels on screen
    padding_baud_rate: ["pb", "pb"], //                                lowest baud rate where padding needed
    virtual_terminal: ["vt", "vt"], //                                virtual terminal number (CB/unix)
    width_status_line: ["wsl", "ws"], //                                number of columns in status line

    // The  following  numeric  capabilities  are present in the SVr4.0 term structure, but are not yet documented in the man page.  They came in with
    // SVr4's printer support.


    //         Variable                                      Cap-                               TCap                                  Description
    //          Numeric                                      name                               Code
    bit_image_entwining: ["bitwin", "Yo"], //                                number of passes for each bit-image row
    bit_image_type: ["bitype", "Yp"], //                                type of bit-image device
    buffer_capacity: ["bufsz", "Ya"], //                                numbers of bytes buffered before printing
    buttons: ["btns", "BT"], //                                number of buttons on mouse
    dot_horz_spacing: ["spinh", "Yc"], //                                spacing of dots hor‐ izontally in dots per inch
    dot_vert_spacing: ["spinv", "Yb"], //                                spacing of pins ver‐ tically in pins per inch
    max_micro_address: ["maddr", "Yd"], //                                maximum value in micro_..._address
    max_micro_jump: ["mjump", "Ye"], //                                maximum value in parm_..._micro
    micro_col_size: ["mcs", "Yf"], //                                character step size when in micro mode
    micro_line_size: ["mls", "Yg"], //                                line step size when in micro mode
    number_of_pins: ["npins", "Yh"], //                                numbers of pins in print-head
    output_res_char: ["orc", "Yi"], //                                horizontal resolu‐ tion in units per line
    output_res_horz_inch: ["orhi", "Yk"], //                                horizontal resolu‐ tion in units per inch
    output_res_line: ["orl", "Yj"], //                                vertical resolution in units per line
    output_res_vert_inch: ["orvi", "Yl"], //                                vertical resolution in units per inch
    print_rate: ["cps", "Ym"], //                                print rate in char‐ acters per second
    wide_char_size: ["widcs", "Yn"]  //                                character step size when in double wide mode
};

// These are the string capabilities:
Terminfo._alias.strings = {
    //         Variable                                    Cap-                             TCap                                   Description
    //          String                                     name                             Code
    acs_chars: ["acsc", "ac"], //                              graphics charset pairs, based on vt100
    back_tab: ["cbt", "bt"], //                              back tab (P)
    bell: ["bel", "bl"], //                              audible signal (bell) (P)
    carriage_return: ["cr", "cr"], //                              carriage return (P*) (P*)
    change_char_pitch: ["cpi", "ZA"], //                              Change number of characters per inch to #1
    change_line_pitch: ["lpi", "ZB"], //                              Change number of lines per inch to #1
    change_res_horz: ["chr", "ZC"], //                              Change horizontal resolution to #1
    change_res_vert: ["cvr", "ZD"], //                              Change vertical res‐ olution to #1
    change_scroll_region: ["csr", "cs"], //                              change region to line #1 to line #2 (P)
    char_padding: ["rmp", "rP"], //                              like ip but when in insert mode
    clear_all_tabs: ["tbc", "ct"], //                              clear all tab stops (P)
    clear_margins: ["mgc", "MC"], //                              clear right and left soft margins
    clear_screen: ["clear", "cl"], //                              clear screen and home cursor (P*)
    clr_bol: ["el1", "cb"], //                              Clear to beginning of line
    clr_eol: ["el", "ce"], //                              clear to end of line (P)
    clr_eos: ["ed", "cd"], //                              clear to end of screen (P*)
    column_address: ["hpa", "ch"], //                              horizontal position #1, absolute (P)
    command_character: ["cmdch", "CC"], //                              terminal settable cmd character in prototype !?
    create_window: ["cwin", "CW"], //                              define a window #1 from #2,#3 to #4,#5
    cursor_address: ["cup", "cm"], //                              move to row #1 col‐ umns #2
    cursor_down: ["cud1", "do"], //                              down one line
    cursor_home: ["home", "ho"], //                              home cursor (if no cup)
    cursor_invisible: ["civis", "vi"], //                              make cursor invisi‐ ble
    cursor_left: ["cub1", "le"], //                              move left one space
    cursor_mem_address: ["mrcup", "CM"], //                              memory relative cur‐ sor addressing, move to row #1 columns #2
    cursor_normal: ["cnorm", "ve"], //                              make cursor appear normal (undo civis/cvvis)
    cursor_right: ["cuf1", "nd"], //                              non-destructive space (move right one space)
    cursor_to_ll: ["ll", "ll"], //                              last line, first column (if no cup)
    cursor_up: ["cuu1", "up"], //                              up one line
    cursor_visible: ["cvvis", "vs"], //                              make cursor very visible
    define_char: ["defc", "ZE"], //                              Define a character #1, #2 dots wide, descender #3
    delete_character: ["dch1", "dc"], //                              delete character (P*)
    delete_line: ["dl1", "dl"], //                              delete line (P*)
    dial_phone: ["dial", "DI"], //                              dial number #1
    dis_status_line: ["dsl", "ds"], //                              disable status line
    display_clock: ["dclk", "DK"], //                              display clock
    down_half_line: ["hd", "hd"], //                              half a line down
    ena_acs: ["enacs", "eA"], //                              enable alternate char set
    enter_alt_charset_mode: ["smacs", "as"], //                              start alternate character set (P)
    enter_am_mode: ["smam", "SA"], //                              turn on automatic margins
    enter_blink_mode: ["blink", "mb"], //                              turn on blinking
    enter_bold_mode: ["bold", "md"], //                              turn on bold (extra bright) mode
    enter_ca_mode: ["smcup", "ti"], //                              string to start pro‐ grams using cup
    enter_delete_mode: ["smdc", "dm"], //                              enter delete mode
    enter_dim_mode: ["dim", "mh"], //                              turn on half-bright mode
    enter_doublewide_mode: ["swidm", "ZF"], //                              Enter double-wide mode
    enter_draft_quality: ["sdrfq", "ZG"], //                              Enter draft-quality mode
    enter_insert_mode: ["smir", "im"], //                              enter insert mode
    enter_italics_mode: ["sitm", "ZH"], //                              Enter italic mode
    enter_leftward_mode: ["slm", "ZI"], //                              Start leftward car‐ riage motion
    enter_micro_mode: ["smicm", "ZJ"], //                              Start micro-motion mode
    enter_near_letter_quality: ["snlq", "ZK"], //                              Enter NLQ mode
    enter_normal_quality: ["snrmq", "ZL"], //                              Enter normal-quality mode
    enter_protected_mode: ["prot", "mp"], //                              turn on protected mode
    enter_reverse_mode: ["rev", "mr"], //                              turn on reverse video mode
    enter_secure_mode: ["invis", "mk"], //                              turn on blank mode (characters invisi‐ ble)
    enter_shadow_mode: ["sshm", "ZM"], //                              Enter shadow-print mode
    enter_standout_mode: ["smso", "so"], //                              begin standout mode
    enter_subscript_mode: ["ssubm", "ZN"], //                              Enter subscript mode
    enter_superscript_mode: ["ssupm", "ZO"], //                              Enter superscript mode
    enter_underline_mode: ["smul", "us"], //                              begin underline mode
    enter_upward_mode: ["sum", "ZP"], //                              Start upward car‐ riage motion
    enter_xon_mode: ["smxon", "SX"], //                              turn on xon/xoff handshaking
    erase_chars: ["ech", "ec"], //                              erase #1 characters (P)
    exit_alt_charset_mode: ["rmacs", "ae"], //                              end alternate char‐ acter set (P)
    exit_am_mode: ["rmam", "RA"], //                              turn off automatic margins
    exit_attribute_mode: ["sgr0", "me"], //                              turn off all attributes
    exit_ca_mode: ["rmcup", "te"], //                              strings to end pro‐ grams using cup
    exit_delete_mode: ["rmdc", "ed"], //                              end delete mode
    exit_doublewide_mode: ["rwidm", "ZQ"], //                              End double-wide mode
    exit_insert_mode: ["rmir", "ei"], //                              exit insert mode
    exit_italics_mode: ["ritm", "ZR"], //                              End italic mode
    exit_leftward_mode: ["rlm", "ZS"], //                              End left-motion mode


    exit_micro_mode: ["rmicm", "ZT"], //                              End micro-motion mode
    exit_shadow_mode: ["rshm", "ZU"], //                              End shadow-print mode
    exit_standout_mode: ["rmso", "se"], //                              exit standout mode
    exit_subscript_mode: ["rsubm", "ZV"], //                              End subscript mode
    exit_superscript_mode: ["rsupm", "ZW"], //                              End superscript mode
    exit_underline_mode: ["rmul", "ue"], //                              exit underline mode
    exit_upward_mode: ["rum", "ZX"], //                              End reverse charac‐ ter motion
    exit_xon_mode: ["rmxon", "RX"], //                              turn off xon/xoff handshaking
    fixed_pause: ["pause", "PA"], //                              pause for 2-3 sec‐ onds
    flash_hook: ["hook", "fh"], //                              flash switch hook
    flash_screen: ["flash", "vb"], //                              visible bell (may not move cursor)
    form_feed: ["ff", "ff"], //                              hardcopy terminal page eject (P*)
    from_status_line: ["fsl", "fs"], //                              return from status line
    goto_window: ["wingo", "WG"], //                              go to window #1
    hangup: ["hup", "HU"], //                              hang-up phone
    init_1string: ["is1", "i1"], //                              initialization string
    init_2string: ["is2", "is"], //                              initialization string
    init_3string: ["is3", "i3"], //                              initialization string
    init_file: ["if", "if"], //                              name of initializa‐ tion file
    init_prog: ["iprog", "iP"], //                              path name of program for initialization
    initialize_color: ["initc", "Ic"], //                              initialize color #1 to (#2,#3,#4)
    initialize_pair: ["initp", "Ip"], //                              Initialize color pair #1 to fg=(#2,#3,#4), bg=(#5,#6,#7)
    insert_character: ["ich1", "ic"], //                              insert character (P)
    insert_line: ["il1", "al"], //                              insert line (P*)
    insert_padding: ["ip", "ip"], //                              insert padding after inserted character
    key_a1: ["ka1", "K1"], //                              upper left of keypad
    key_a3: ["ka3", "K3"], //                              upper right of key‐ pad
    key_b2: ["kb2", "K2"], //                              center of keypad
    key_backspace: ["kbs", "kb"], //                              backspace key
    key_beg: ["kbeg", "@1"], //                              begin key
    key_btab: ["kcbt", "kB"], //                              back-tab key
    key_c1: ["kc1", "K4"], //                              lower left of keypad
    key_c3: ["kc3", "K5"], //                              lower right of key‐ pad
    key_cancel: ["kcan", "@2"], //                              cancel key
    key_catab: ["ktbc", "ka"], //                              clear-all-tabs key
    key_clear: ["kclr", "kC"], //                              clear-screen or erase key
    key_close: ["kclo", "@3"], //                              close key
    key_command: ["kcmd", "@4"], //                              command key
    key_copy: ["kcpy", "@5"], //                              copy key
    key_create: ["kcrt", "@6"], //                              create key
    key_ctab: ["kctab", "kt"], //                              clear-tab key
    key_dc: ["kdch1", "kD"], //                              delete-character key
    key_dl: ["kdl1", "kL"], //                              delete-line key
    key_down: ["kcud1", "kd"], //                              down-arrow key

    key_eic: ["krmir", "kM"], //                              sent by rmir or smir in insert mode
    key_end: ["kend", "@7"], //                              end key
    key_enter: ["kent", "@8"], //                              enter/send key
    key_eol: ["kel", "kE"], //                              clear-to-end-of-line key
    key_eos: ["ked", "kS"], //                              clear-to-end-of- screen key
    key_exit: ["kext", "@9"], //                              exit key
    key_f0: ["kf0", "k0"], //                              F0 function key
    key_f1: ["kf1", "k1"], //                              F1 function key
    key_f10: ["kf10", "k;"], //                              F10 function key
    key_f11: ["kf11", "F1"], //                              F11 function key
    key_f12: ["kf12", "F2"], //                              F12 function key
    key_f13: ["kf13", "F3"], //                              F13 function key
    key_f14: ["kf14", "F4"], //                              F14 function key
    key_f15: ["kf15", "F5"], //                              F15 function key
    key_f16: ["kf16", "F6"], //                              F16 function key
    key_f17: ["kf17", "F7"], //                              F17 function key
    key_f18: ["kf18", "F8"], //                              F18 function key
    key_f19: ["kf19", "F9"], //                              F19 function key
    key_f2: ["kf2", "k2"], //                              F2 function key
    key_f20: ["kf20", "FA"], //                              F20 function key
    key_f21: ["kf21", "FB"], //                              F21 function key
    key_f22: ["kf22", "FC"], //                              F22 function key
    key_f23: ["kf23", "FD"], //                              F23 function key
    key_f24: ["kf24", "FE"], //                              F24 function key
    key_f25: ["kf25", "FF"], //                              F25 function key
    key_f26: ["kf26", "FG"], //                              F26 function key
    key_f27: ["kf27", "FH"], //                              F27 function key
    key_f28: ["kf28", "FI"], //                              F28 function key
    key_f29: ["kf29", "FJ"], //                              F29 function key
    key_f3: ["kf3", "k3"], //                              F3 function key
    key_f30: ["kf30", "FK"], //                              F30 function key
    key_f31: ["kf31", "FL"], //                              F31 function key
    key_f32: ["kf32", "FM"], //                              F32 function key
    key_f33: ["kf33", "FN"], //                              F33 function key
    key_f34: ["kf34", "FO"], //                              F34 function key
    key_f35: ["kf35", "FP"], //                              F35 function key
    key_f36: ["kf36", "FQ"], //                              F36 function key
    key_f37: ["kf37", "FR"], //                              F37 function key
    key_f38: ["kf38", "FS"], //                              F38 function key
    key_f39: ["kf39", "FT"], //                              F39 function key
    key_f4: ["kf4", "k4"], //                              F4 function key
    key_f40: ["kf40", "FU"], //                              F40 function key
    key_f41: ["kf41", "FV"], //                              F41 function key
    key_f42: ["kf42", "FW"], //                              F42 function key
    key_f43: ["kf43", "FX"], //                              F43 function key
    key_f44: ["kf44", "FY"], //                              F44 function key
    key_f45: ["kf45", "FZ"], //                              F45 function key
    key_f46: ["kf46", "Fa"], //                              F46 function key
    key_f47: ["kf47", "Fb"], //                              F47 function key
    key_f48: ["kf48", "Fc"], //                              F48 function key
    key_f49: ["kf49", "Fd"], //                              F49 function key
    key_f5: ["kf5", "k5"], //                              F5 function key
    key_f50: ["kf50", "Fe"], //                              F50 function key
    key_f51: ["kf51", "Ff"], //                              F51 function key
    key_f52: ["kf52", "Fg"], //                              F52 function key
    key_f53: ["kf53", "Fh"], //                              F53 function key
    key_f54: ["kf54", "Fi"], //                              F54 function key
    key_f55: ["kf55", "Fj"], //                              F55 function key
    key_f56: ["kf56", "Fk"], //                              F56 function key
    key_f57: ["kf57", "Fl"], //                              F57 function key
    key_f58: ["kf58", "Fm"], //                              F58 function key
    key_f59: ["kf59", "Fn"], //                              F59 function key

    key_f6: ["kf6", "k6"], //                              F6 function key
    key_f60: ["kf60", "Fo"], //                              F60 function key
    key_f61: ["kf61", "Fp"], //                              F61 function key
    key_f62: ["kf62", "Fq"], //                              F62 function key
    key_f63: ["kf63", "Fr"], //                              F63 function key
    key_f7: ["kf7", "k7"], //                              F7 function key
    key_f8: ["kf8", "k8"], //                              F8 function key
    key_f9: ["kf9", "k9"], //                              F9 function key
    key_find: ["kfnd", "@0"], //                              find key
    key_help: ["khlp", "%1"], //                              help key
    key_home: ["khome", "kh"], //                              home key
    key_ic: ["kich1", "kI"], //                              insert-character key
    key_il: ["kil1", "kA"], //                              insert-line key
    key_left: ["kcub1", "kl"], //                              left-arrow key
    key_ll: ["kll", "kH"], //                              lower-left key (home down)
    key_mark: ["kmrk", "%2"], //                              mark key
    key_message: ["kmsg", "%3"], //                              message key
    key_move: ["kmov", "%4"], //                              move key
    key_next: ["knxt", "%5"], //                              next key
    key_npage: ["knp", "kN"], //                              next-page key
    key_open: ["kopn", "%6"], //                              open key
    key_options: ["kopt", "%7"], //                              options key
    key_ppage: ["kpp", "kP"], //                              previous-page key
    key_previous: ["kprv", "%8"], //                              previous key
    key_print: ["kprt", "%9"], //                              print key
    key_redo: ["krdo", "%0"], //                              redo key
    key_reference: ["kref", "&1"], //                              reference key
    key_refresh: ["krfr", "&2"], //                              refresh key
    key_replace: ["krpl", "&3"], //                              replace key
    key_restart: ["krst", "&4"], //                              restart key
    key_resume: ["kres", "&5"], //                              resume key
    key_right: ["kcuf1", "kr"], //                              right-arrow key
    key_save: ["ksav", "&6"], //                              save key
    key_sbeg: ["kBEG", "&9"], //                              shifted begin key
    key_scancel: ["kCAN", "&0"], //                              shifted cancel key
    key_scommand: ["kCMD", "*1"], //                              shifted command key
    key_scopy: ["kCPY", "*2"], //                              shifted copy key
    key_screate: ["kCRT", "*3"], //                              shifted create key
    key_sdc: ["kDC", "*4"], //                              shifted delete-char‐ acter key
    key_sdl: ["kDL", "*5"], //                              shifted delete-line key
    key_select: ["kslt", "*6"], //                              select key
    key_send: ["kEND", "*7"], //                              shifted end key
    key_seol: ["kEOL", "*8"], //                              shifted clear-to- end-of-line key
    key_sexit: ["kEXT", "*9"], //                              shifted exit key
    key_sf: ["kind", "kF"], //                              scroll-forward key
    key_sfind: ["kFND", "*0"], //                              shifted find key
    key_shelp: ["kHLP", "#1"], //                              shifted help key
    key_shome: ["kHOM", "#2"], //                              shifted home key
    key_sic: ["kIC", "#3"], //                              shifted insert-char‐ acter key
    key_sleft: ["kLFT", "#4"], //                              shifted left-arrow key
    key_smessage: ["kMSG", "%a"], //                              shifted message key
    key_smove: ["kMOV", "%b"], //                              shifted move key
    key_snext: ["kNXT", "%c"], //                              shifted next key
    key_soptions: ["kOPT", "%d"], //                              shifted options key
    key_sprevious: ["kPRV", "%e"], //                              shifted previous key
    key_sprint: ["kPRT", "%f"], //                              shifted print key
    key_sr: ["kri", "kR"], //                              scroll-backward key
    key_sredo: ["kRDO", "%g"], //                              shifted redo key
    key_sreplace: ["kRPL", "%h"], //                              shifted replace key

    key_sright: ["kRIT", "%i"], //                              shifted right-arrow key
    key_srsume: ["kRES", "%j"], //                              shifted resume key
    key_ssave: ["kSAV", "!1"], //                              shifted save key
    key_ssuspend: ["kSPD", "!2"], //                              shifted suspend key
    key_stab: ["khts", "kT"], //                              set-tab key
    key_sundo: ["kUND", "!3"], //                              shifted undo key
    key_suspend: ["kspd", "&7"], //                              suspend key
    key_undo: ["kund", "&8"], //                              undo key
    key_up: ["kcuu1", "ku"], //                              up-arrow key
    keypad_local: ["rmkx", "ke"], //                              leave 'key‐ board_transmit' mode
    keypad_xmit: ["smkx", "ks"], //                              enter 'key‐ board_transmit' mode
    lab_f0: ["lf0", "l0"], //                              label on function key f0 if not f0
    lab_f1: ["lf1", "l1"], //                              label on function key f1 if not f1
    lab_f10: ["lf10", "la"], //                              label on function key f10 if not f10
    lab_f2: ["lf2", "l2"], //                              label on function key f2 if not f2
    lab_f3: ["lf3", "l3"], //                              label on function key f3 if not f3
    lab_f4: ["lf4", "l4"], //                              label on function key f4 if not f4
    lab_f5: ["lf5", "l5"], //                              label on function key f5 if not f5
    lab_f6: ["lf6", "l6"], //                              label on function key f6 if not f6
    lab_f7: ["lf7", "l7"], //                              label on function key f7 if not f7
    lab_f8: ["lf8", "l8"], //                              label on function key f8 if not f8
    lab_f9: ["lf9", "l9"], //                              label on function key f9 if not f9
    label_format: ["fln", "Lf"], //                              label format
    label_off: ["rmln", "LF"], //                              turn off soft labels
    label_on: ["smln", "LO"], //                              turn on soft labels
    meta_off: ["rmm", "mo"], //                              turn off meta mode
    meta_on: ["smm", "mm"], //                              turn on meta mode (8th-bit on)
    micro_column_address: ["mhpa", "ZY"], //                              Like column_address in micro mode
    micro_down: ["mcud1", "ZZ"], //                              Like cursor_down in micro mode
    micro_left: ["mcub1", "Za"], //                              Like cursor_left in micro mode
    micro_right: ["mcuf1", "Zb"], //                              Like cursor_right in micro mode
    micro_row_address: ["mvpa", "Zc"], //                              Like row_address #1 in micro mode
    micro_up: ["mcuu1", "Zd"], //                              Like cursor_up in micro mode
    newline: ["nel", "nw"], //                              newline (behave like cr followed by lf)
    order_of_pins: ["porder", "Ze"], //                              Match software bits to print-head pins
    orig_colors: ["oc", "oc"], //                              Set all color pairs to the original ones
    orig_pair: ["op", "op"], //                              Set default pair to its original value
    pad_char: ["pad", "pc"], //                              padding char (instead of null)


    parm_dch: ["dch", "DC"], //                              delete #1 characters (P*)
    parm_delete_line: ["dl", "DL"], //                              delete #1 lines (P*)
    parm_down_cursor: ["cud", "DO"], //                              down #1 lines (P*)
    parm_down_micro: ["mcud", "Zf"], //                              Like parm_down_cur‐ sor in micro mode
    parm_ich: ["ich", "IC"], //                              insert #1 characters (P*)
    parm_index: ["indn", "SF"], //                              scroll forward #1 lines (P)
    parm_insert_line: ["il", "AL"], //                              insert #1 lines (P*)
    parm_left_cursor: ["cub", "LE"], //                              move #1 characters to the left (P)
    parm_left_micro: ["mcub", "Zg"], //                              Like parm_left_cur‐ sor in micro mode
    parm_right_cursor: ["cuf", "RI"], //                              move #1 characters to the right (P*)
    parm_right_micro: ["mcuf", "Zh"], //                              Like parm_right_cur‐ sor in micro mode
    parm_rindex: ["rin", "SR"], //                              scroll back #1 lines (P)
    parm_up_cursor: ["cuu", "UP"], //                              up #1 lines (P*)
    parm_up_micro: ["mcuu", "Zi"], //                              Like parm_up_cursor in micro mode
    pkey_key: ["pfkey", "pk"], //                              program function key #1 to type string #2
    pkey_local: ["pfloc", "pl"], //                              program function key #1 to execute string #2
    pkey_xmit: ["pfx", "px"], //                              program function key #1 to transmit string #2
    plab_norm: ["pln", "pn"], //                              program label #1 to show string #2
    print_screen: ["mc0", "ps"], //                              print contents of screen
    prtr_non: ["mc5p", "pO"], //                              turn on printer for #1 bytes
    prtr_off: ["mc4", "pf"], //                              turn off printer
    prtr_on: ["mc5", "po"], //                              turn on printer
    pulse: ["pulse", "PU"], //                              select pulse dialing
    quick_dial: ["qdial", "QD"], //                              dial number #1 with‐ out checking
    remove_clock: ["rmclk", "RC"], //                              remove clock
    repeat_char: ["rep", "rp"], //                              repeat char #1 #2 times (P*)
    req_for_input: ["rfi", "RF"], //                              send next input char (for ptys)
    reset_1string: ["rs1", "r1"], //                              reset string
    reset_2string: ["rs2", "r2"], //                              reset string
    reset_3string: ["rs3", "r3"], //                              reset string
    reset_file: ["rf", "rf"], //                              name of reset file
    restore_cursor: ["rc", "rc"], //                              restore cursor to position of last save_cursor
    row_address: ["vpa", "cv"], //                              vertical position #1 absolute (P)
    save_cursor: ["sc", "sc"], //                              save current cursor position (P)
    scroll_forward: ["ind", "sf"], //                              scroll text up (P)
    scroll_reverse: ["ri", "sr"], //                              scroll text down (P)
    select_char_set: ["scs", "Zj"], //                              Select character set, #1



    set_attributes: ["sgr", "sa"], //                              define video attributes #1-#9 (PG9)
    set_background: ["setb", "Sb"], //                              Set background color #1
    set_bottom_margin: ["smgb", "Zk"], //                              Set bottom margin at current line
    set_bottom_margin_parm: ["smgbp", "Zl"], //                              Set bottom margin at line #1 or (if smgtp is not given) #2 lines from bottom
    set_clock: ["sclk", "SC"], //                              set clock, #1 hrs #2 mins #3 secs
    set_color_pair: ["scp", "sp"], //                              Set current color pair to #1
    set_foreground: ["setf", "Sf"], //                              Set foreground color #1
    set_left_margin: ["smgl", "ML"], //                              set left soft margin at current col‐ umn.  See smgl. (ML is not in BSD termcap).
    set_left_margin_parm: ["smglp", "Zm"], //                              Set left (right) margin at column #1
    set_right_margin: ["smgr", "MR"], //                              set right soft margin at current column
    set_right_margin_parm: ["smgrp", "Zn"], //                              Set right margin at column #1
    set_tab: ["hts", "st"], //                              set a tab in every row, current columns
    set_top_margin: ["smgt", "Zo"], //                              Set top margin at current line
    set_top_margin_parm: ["smgtp", "Zp"], //                              Set top (bottom) margin at row #1
    set_window: ["wind", "wi"], //                              current window is lines #1-#2 cols #3-#4
    start_bit_image: ["sbim", "Zq"], //                              Start printing bit image graphics
    start_char_set_def: ["scsd", "Zr"], //                              Start character set defi‐ nition #1, with #2 charac‐ ters in the set
    stop_bit_image: ["rbim", "Zs"], //                              Stop printing bit image graphics
    stop_char_set_def: ["rcsd", "Zt"], //                              End definition of charac‐ ter set #1
    subscript_characters: ["subcs", "Zu"], //                              List of subscriptable characters
    superscript_characters: ["supcs", "Zv"], //                              List of superscriptable characters
    tab: ["ht", "ta"], //                              tab to next 8-space hard‐ ware tab stop
    these_cause_cr: ["docr", "Zw"], //                              Printing any of these characters causes CR
    to_status_line: ["tsl", "ts"], //                              move to status line, col‐ umn #1
    tone: ["tone", "TO"], //                              select touch tone dialing
    underline_char: ["uc", "uc"], //                              underline char and move past it
    up_half_line: ["hu", "hu"], //                              half a line up
    user0: ["u0", "u0"], //                              User string #0
    user1: ["u1", "u1"], //                              User string #1
    user2: ["u2", "u2"], //                              User string #2
    user3: ["u3", "u3"], //                              User string #3
    user4: ["u4", "u4"], //                              User string #4
    user5: ["u5", "u5"], //                              User string #5

    user6: ["u6", "u6"], //                              User string #6
    user7: ["u7", "u7"], //                              User string #7
    user8: ["u8", "u8"], //                              User string #8
    user9: ["u9", "u9"], //                              User string #9
    wait_tone: ["wait", "WA"], //                              wait for dial-tone
    xoff_character: ["xoffc", "XF"], //                              XOFF character
    xon_character: ["xonc", "XN"], //                              XON character
    zero_motion: ["zerom", "Zx"], //                              No motion for subsequent character

    // The following string capabilities are present in the SVr4.0 term structure, but were originally not documented in the man page.


    //         Variable                                      Cap-                                 TCap                                 Description
    //          String                                       name                                 Code
    alt_scancode_esc: ["scesa", "S8"], //                                Alternate escape for scancode emu‐ lation
    bit_image_carriage_return: ["bicr", "Yv"], //                                Move to beginning of same row
    bit_image_newline: ["binel", "Zz"], //                                Move to next row of the bit image
    bit_image_repeat: ["birep", "Xy"], //                                Repeat bit image cell #1 #2 times
    char_set_names: ["csnm", "Zy"], //                                Produce #1'th item from list of char‐ acter set names
    code_set_init: ["csin", "ci"], //                                Init sequence for multiple codesets
    color_names: ["colornm", "Yw"], //                                Give name for color #1
    define_bit_image_region: ["defbi", "Yx"], //                                Define rectan‐ gualar bit image region
    device_type: ["devt", "dv"], //                                Indicate lan‐ guage/codeset sup‐ port
    display_pc_char: ["dispc", "S1"], //                                Display PC charac‐ ter #1
    end_bit_image_region: ["endbi", "Yy"], //                                End a bit-image region
    enter_pc_charset_mode: ["smpch", "S2"], //                                Enter PC character display mode
    enter_scancode_mode: ["smsc", "S4"], //                                Enter PC scancode mode
    exit_pc_charset_mode: ["rmpch", "S3"], //                                Exit PC character display mode
    exit_scancode_mode: ["rmsc", "S5"], //                                Exit PC scancode mode
    get_mouse: ["getm", "Gm"], //                                Curses should get button events, parameter #1 not documented.
    key_mouse: ["kmous", "Km"], //                                Mouse event has occurred
    mouse_info: ["minfo", "Mi"], //                                Mouse status information
    pc_term_options: ["pctrm", "S6"], //                                PC terminal options
    pkey_plab: ["pfxl", "xl"], //                                Program function key #1 to type string #2 and show string #3
    req_mouse_pos: ["reqmp", "RQ"], //                                Request mouse position

    scancode_escape: ["scesc", "S7"], //                                Escape for scan‐ code emulation
    set0_des_seq: ["s0ds", "s0"], //                                Shift to codeset 0 (EUC set 0, ASCII)
    set1_des_seq: ["s1ds", "s1"], //                                Shift to codeset 1
    set2_des_seq: ["s2ds", "s2"], //                                Shift to codeset 2
    set3_des_seq: ["s3ds", "s3"], //                                Shift to codeset 3
    set_a_background: ["setab", "AB"], //                                Set background color to #1, using ANSI escape
    set_a_foreground: ["setaf", "AF"], //                                Set foreground color to #1, using ANSI escape
    set_color_band: ["setcolor", "Yz"], //                                Change to ribbon color #1
    set_lr_margin: ["smglr", "ML"], //                                Set both left and right margins to #1, #2.  (ML is not in BSD term‐ cap).
    set_page_length: ["slines", "YZ"], //                                Set page length to #1 lines
    set_tb_margin: ["smgtb", "MT"], //                                Sets both top and bottom margins to #1, #2

    // The XSI Curses standard added these.  They are some post-4.1 versions of System V curses, e.g., Solaris 2.5 and IRIX 6.x.  The ncurses termcap
    // names for them are invented; according to the XSI Curses standard, they have no termcap names.  If your compiled terminfo entries  use  these,
    // they may not be binary-compatible with System V terminfo entries after SVr4.1; beware!


    //         Variable                                      Cap-                               TCap                                 Description
    //          String                                       name                               Code
    enter_horizontal_hl_mode: ["ehhlm", "Xh"], //                               Enter horizontal highlight mode
    enter_left_hl_mode: ["elhlm", "Xl"], //                               Enter left highlight mode
    enter_low_hl_mode: ["elohlm", "Xo"], //                               Enter low highlight mode
    enter_right_hl_mode: ["erhlm", "Xr"], //                               Enter right high‐ light mode
    enter_top_hl_mode: ["ethlm", "Xt"], //                               Enter top highlight mode
    enter_vertical_hl_mode: ["evhlm", "Xv"], //                               Enter vertical high‐ light mode
    set_a_attributes: ["sgr1", "sA"], //                               Define second set of video attributes #1-#6
    set_pglen_inch: ["slength", "sL"]  //                               YI Set page length to #1 hundredth of an inch
};

Terminfo.alias = {};
["bools", "numbers", "strings"].forEach((type) => {
    Object.keys(Terminfo._alias[type]).forEach((key) => {
        const aliases = Terminfo._alias[type][key];
        Terminfo.alias[key] = [aliases[0]];
        Terminfo.alias[key].terminfo = aliases[0];
        Terminfo.alias[key].termcap = aliases[1];
    });
});

// Bools
Terminfo.alias.no_esc_ctlc.push("beehive_glitch");
Terminfo.alias.dest_tabs_magic_smso.push("teleray_glitch");

// Numbers
Terminfo.alias.micro_col_size.push("micro_char_size");

/**
 * Feature Checking
 */

Terminfo.aliasMap = {};

Object.keys(Terminfo.alias).forEach((key) => {
    Terminfo.aliasMap[key] = key;
    Terminfo.alias[key].forEach((k) => {
        Terminfo.aliasMap[k] = key;
    });
});

/**
 * Fallback Termcap Entry
 */

Terminfo.termcap = ""
    + "vt102|dec vt102:"
    + ":do=^J:co#80:li#24:cl=50\\E[;H\\E[2J:"
    + ":le=^H:bs:cm=5\\E[%i%d;%dH:nd=2\\E[C:up=2\\E[A:"
    + ":ce=3\\E[K:cd=50\\E[J:so=2\\E[7m:se=2\\E[m:us=2\\E[4m:ue=2\\E[m:"
    + ":md=2\\E[1m:mr=2\\E[7m:mb=2\\E[5m:me=2\\E[m:is=\\E[1;24r\\E[24;1H:"
    + ":rs=\\E>\\E[?3l\\E[?4l\\E[?5l\\E[?7h\\E[?8h:ks=\\E[?1h\\E=:ke=\\E[?1l\\E>:"
    + ":ku=\\EOA:kd=\\EOB:kr=\\EOC:kl=\\EOD:kb=^H:\\\n"
    + ":ho=\\E[H:k1=\\EOP:k2=\\EOQ:k3=\\EOR:k4=\\EOS:pt:sr=5\\EM:vt#3:"
    + ":sc=\\E7:rc=\\E8:cs=\\E[%i%d;%dr:vs=\\E[?7l:ve=\\E[?7h:"
    + ":mi:al=\\E[L:dc=\\E[P:dl=\\E[M:ei=\\E[4l:im=\\E[4h:";

/**
 * Terminfo Data
 */

Terminfo.bools = [
    "auto_left_margin",
    "auto_right_margin",
    "no_esc_ctlc",
    "ceol_standout_glitch",
    "eat_newline_glitch",
    "erase_overstrike",
    "generic_type",
    "hard_copy",
    "has_meta_key",
    "has_status_line",
    "insert_null_glitch",
    "memory_above",
    "memory_below",
    "move_insert_mode",
    "move_standout_mode",
    "over_strike",
    "status_line_esc_ok",
    "dest_tabs_magic_smso",
    "tilde_glitch",
    "transparent_underline",
    "xon_xoff",
    "needs_xon_xoff",
    "prtr_silent",
    "hard_cursor",
    "non_rev_rmcup",
    "no_pad_char",
    "non_dest_scroll_region",
    "can_change",
    "back_color_erase",
    "hue_lightness_saturation",
    "col_addr_glitch",
    "cr_cancels_micro_mode",
    "has_print_wheel",
    "row_addr_glitch",
    "semi_auto_right_margin",
    "cpi_changes_res",
    "lpi_changes_res",

    // #ifdef __INTERNAL_CAPS_VISIBLE
    "backspaces_with_bs",
    "crt_no_scrolling",
    "no_correctly_working_cr",
    "gnu_has_meta_key",
    "linefeed_is_newline",
    "has_hardware_tabs",
    "return_does_clr_eol"
];

Terminfo.numbers = [
    "columns",
    "init_tabs",
    "lines",
    "lines_of_memory",
    "magic_cookie_glitch",
    "padding_baud_rate",
    "virtual_terminal",
    "width_status_line",
    "num_labels",
    "label_height",
    "label_width",
    "max_attributes",
    "maximum_windows",
    "max_colors",
    "max_pairs",
    "no_color_video",
    "buffer_capacity",
    "dot_vert_spacing",
    "dot_horz_spacing",
    "max_micro_address",
    "max_micro_jump",
    "micro_col_size",
    "micro_line_size",
    "number_of_pins",
    "output_res_char",
    "output_res_line",
    "output_res_horz_inch",
    "output_res_vert_inch",
    "print_rate",
    "wide_char_size",
    "buttons",
    "bit_image_entwining",
    "bit_image_type",

    // #ifdef __INTERNAL_CAPS_VISIBLE
    "magic_cookie_glitch_ul",
    "carriage_return_delay",
    "new_line_delay",
    "backspace_delay",
    "horizontal_tab_delay",
    "number_of_function_keys"
];

Terminfo.strings = [
    "back_tab",
    "bell",
    "carriage_return",
    "change_scroll_region",
    "clear_all_tabs",
    "clear_screen",
    "clr_eol",
    "clr_eos",
    "column_address",
    "command_character",
    "cursor_address",
    "cursor_down",
    "cursor_home",
    "cursor_invisible",
    "cursor_left",
    "cursor_mem_address",
    "cursor_normal",
    "cursor_right",
    "cursor_to_ll",
    "cursor_up",
    "cursor_visible",
    "delete_character",
    "delete_line",
    "dis_status_line",
    "down_half_line",
    "enter_alt_charset_mode",
    "enter_blink_mode",
    "enter_bold_mode",
    "enter_ca_mode",
    "enter_delete_mode",
    "enter_dim_mode",
    "enter_insert_mode",
    "enter_secure_mode",
    "enter_protected_mode",
    "enter_reverse_mode",
    "enter_standout_mode",
    "enter_underline_mode",
    "erase_chars",
    "exit_alt_charset_mode",
    "exit_attribute_mode",
    "exit_ca_mode",
    "exit_delete_mode",
    "exit_insert_mode",
    "exit_standout_mode",
    "exit_underline_mode",
    "flash_screen",
    "form_feed",
    "from_status_line",
    "init_1string",
    "init_2string",
    "init_3string",
    "init_file",
    "insert_character",
    "insert_line",
    "insert_padding",
    "key_backspace",
    "key_catab",
    "key_clear",
    "key_ctab",
    "key_dc",
    "key_dl",
    "key_down",
    "key_eic",
    "key_eol",
    "key_eos",
    "key_f0",
    "key_f1",
    "key_f10",
    "key_f2",
    "key_f3",
    "key_f4",
    "key_f5",
    "key_f6",
    "key_f7",
    "key_f8",
    "key_f9",
    "key_home",
    "key_ic",
    "key_il",
    "key_left",
    "key_ll",
    "key_npage",
    "key_ppage",
    "key_right",
    "key_sf",
    "key_sr",
    "key_stab",
    "key_up",
    "keypad_local",
    "keypad_xmit",
    "lab_f0",
    "lab_f1",
    "lab_f10",
    "lab_f2",
    "lab_f3",
    "lab_f4",
    "lab_f5",
    "lab_f6",
    "lab_f7",
    "lab_f8",
    "lab_f9",
    "meta_off",
    "meta_on",
    "newline",
    "pad_char",
    "parm_dch",
    "parm_delete_line",
    "parm_down_cursor",
    "parm_ich",
    "parm_index",
    "parm_insert_line",
    "parm_left_cursor",
    "parm_right_cursor",
    "parm_rindex",
    "parm_up_cursor",
    "pkey_key",
    "pkey_local",
    "pkey_xmit",
    "print_screen",
    "prtr_off",
    "prtr_on",
    "repeat_char",
    "reset_1string",
    "reset_2string",
    "reset_3string",
    "reset_file",
    "restore_cursor",
    "row_address",
    "save_cursor",
    "scroll_forward",
    "scroll_reverse",
    "set_attributes",
    "set_tab",
    "set_window",
    "tab",
    "to_status_line",
    "underline_char",
    "up_half_line",
    "init_prog",
    "key_a1",
    "key_a3",
    "key_b2",
    "key_c1",
    "key_c3",
    "prtr_non",
    "char_padding",
    "acs_chars",
    "plab_norm",
    "key_btab",
    "enter_xon_mode",
    "exit_xon_mode",
    "enter_am_mode",
    "exit_am_mode",
    "xon_character",
    "xoff_character",
    "ena_acs",
    "label_on",
    "label_off",
    "key_beg",
    "key_cancel",
    "key_close",
    "key_command",
    "key_copy",
    "key_create",
    "key_end",
    "key_enter",
    "key_exit",
    "key_find",
    "key_help",
    "key_mark",
    "key_message",
    "key_move",
    "key_next",
    "key_open",
    "key_options",
    "key_previous",
    "key_print",
    "key_redo",
    "key_reference",
    "key_refresh",
    "key_replace",
    "key_restart",
    "key_resume",
    "key_save",
    "key_suspend",
    "key_undo",
    "key_sbeg",
    "key_scancel",
    "key_scommand",
    "key_scopy",
    "key_screate",
    "key_sdc",
    "key_sdl",
    "key_select",
    "key_send",
    "key_seol",
    "key_sexit",
    "key_sfind",
    "key_shelp",
    "key_shome",
    "key_sic",
    "key_sleft",
    "key_smessage",
    "key_smove",
    "key_snext",
    "key_soptions",
    "key_sprevious",
    "key_sprint",
    "key_sredo",
    "key_sreplace",
    "key_sright",
    "key_srsume",
    "key_ssave",
    "key_ssuspend",
    "key_sundo",
    "req_for_input",
    "key_f11",
    "key_f12",
    "key_f13",
    "key_f14",
    "key_f15",
    "key_f16",
    "key_f17",
    "key_f18",
    "key_f19",
    "key_f20",
    "key_f21",
    "key_f22",
    "key_f23",
    "key_f24",
    "key_f25",
    "key_f26",
    "key_f27",
    "key_f28",
    "key_f29",
    "key_f30",
    "key_f31",
    "key_f32",
    "key_f33",
    "key_f34",
    "key_f35",
    "key_f36",
    "key_f37",
    "key_f38",
    "key_f39",
    "key_f40",
    "key_f41",
    "key_f42",
    "key_f43",
    "key_f44",
    "key_f45",
    "key_f46",
    "key_f47",
    "key_f48",
    "key_f49",
    "key_f50",
    "key_f51",
    "key_f52",
    "key_f53",
    "key_f54",
    "key_f55",
    "key_f56",
    "key_f57",
    "key_f58",
    "key_f59",
    "key_f60",
    "key_f61",
    "key_f62",
    "key_f63",
    "clr_bol",
    "clear_margins",
    "set_left_margin",
    "set_right_margin",
    "label_format",
    "set_clock",
    "display_clock",
    "remove_clock",
    "create_window",
    "goto_window",
    "hangup",
    "dial_phone",
    "quick_dial",
    "tone",
    "pulse",
    "flash_hook",
    "fixed_pause",
    "wait_tone",
    "user0",
    "user1",
    "user2",
    "user3",
    "user4",
    "user5",
    "user6",
    "user7",
    "user8",
    "user9",
    "orig_pair",
    "orig_colors",
    "initialize_color",
    "initialize_pair",
    "set_color_pair",
    "set_foreground",
    "set_background",
    "change_char_pitch",
    "change_line_pitch",
    "change_res_horz",
    "change_res_vert",
    "define_char",
    "enter_doublewide_mode",
    "enter_draft_quality",
    "enter_italics_mode",
    "enter_leftward_mode",
    "enter_micro_mode",
    "enter_near_letter_quality",
    "enter_normal_quality",
    "enter_shadow_mode",
    "enter_subscript_mode",
    "enter_superscript_mode",
    "enter_upward_mode",
    "exit_doublewide_mode",
    "exit_italics_mode",
    "exit_leftward_mode",
    "exit_micro_mode",
    "exit_shadow_mode",
    "exit_subscript_mode",
    "exit_superscript_mode",
    "exit_upward_mode",
    "micro_column_address",
    "micro_down",
    "micro_left",
    "micro_right",
    "micro_row_address",
    "micro_up",
    "order_of_pins",
    "parm_down_micro",
    "parm_left_micro",
    "parm_right_micro",
    "parm_up_micro",
    "select_char_set",
    "set_bottom_margin",
    "set_bottom_margin_parm",
    "set_left_margin_parm",
    "set_right_margin_parm",
    "set_top_margin",
    "set_top_margin_parm",
    "start_bit_image",
    "start_char_set_def",
    "stop_bit_image",
    "stop_char_set_def",
    "subscript_characters",
    "superscript_characters",
    "these_cause_cr",
    "zero_motion",
    "char_set_names",
    "key_mouse",
    "mouse_info",
    "req_mouse_pos",
    "get_mouse",
    "set_a_foreground",
    "set_a_background",
    "pkey_plab",
    "device_type",
    "code_set_init",
    "set0_des_seq",
    "set1_des_seq",
    "set2_des_seq",
    "set3_des_seq",
    "set_lr_margin",
    "set_tb_margin",
    "bit_image_repeat",
    "bit_image_newline",
    "bit_image_carriage_return",
    "color_names",
    "define_bit_image_region",
    "end_bit_image_region",
    "set_color_band",
    "set_page_length",
    "display_pc_char",
    "enter_pc_charset_mode",
    "exit_pc_charset_mode",
    "enter_scancode_mode",
    "exit_scancode_mode",
    "pc_term_options",
    "scancode_escape",
    "alt_scancode_esc",
    "enter_horizontal_hl_mode",
    "enter_left_hl_mode",
    "enter_low_hl_mode",
    "enter_right_hl_mode",
    "enter_top_hl_mode",
    "enter_vertical_hl_mode",
    "set_a_attributes",
    "set_pglen_inch",

    // #ifdef __INTERNAL_CAPS_VISIBLE
    "termcap_init2",
    "termcap_reset",
    "linefeed_if_not_lf",
    "backspace_if_not_bs",
    "other_non_function_keys",
    "arrow_key_map",
    "acs_ulcorner",
    "acs_llcorner",
    "acs_urcorner",
    "acs_lrcorner",
    "acs_ltee",
    "acs_rtee",
    "acs_btee",
    "acs_ttee",
    "acs_hline",
    "acs_vline",
    "acs_plus",
    "memory_lock",
    "memory_unlock",
    "box_chars_1"
];

// DEC Special Character and Line Drawing Set.
// Taken from tty.js.
Terminfo.acsc = {    // (0
    "`": "\u25c6", // '◆'
    a: "\u2592", // '▒'
    b: "\u0009", // '\t'
    c: "\u000c", // '\f'
    d: "\u000d", // '\r'
    e: "\u000a", // '\n'
    f: "\u00b0", // '°'
    g: "\u00b1", // '±'
    h: "\u2424", // '\u2424' (NL)
    i: "\u000b", // '\v'
    j: "\u2518", // '┘'
    k: "\u2510", // '┐'
    l: "\u250c", // '┌'
    m: "\u2514", // '└'
    n: "\u253c", // '┼'
    o: "\u23ba", // '⎺'
    p: "\u23bb", // '⎻'
    q: "\u2500", // '─'
    r: "\u23bc", // '⎼'
    s: "\u23bd", // '⎽'
    t: "\u251c", // '├'
    u: "\u2524", // '┤'
    v: "\u2534", // '┴'
    w: "\u252c", // '┬'
    x: "\u2502", // '│'
    y: "\u2264", // '≤'
    z: "\u2265", // '≥'
    "{": "\u03c0", // 'π'
    "|": "\u2260", // '≠'
    "}": "\u00a3", // '£'
    "~": "\u00b7"  // '·'
};

// Convert ACS unicode characters to the most similar-looking ascii characters.
Terminfo.utoa = Terminfo.prototype.utoa = {
    "\u25c6": "*", // '◆'
    "\u2592": " ", // '▒'
    // '\u0009': '\t', // '\t'
    // '\u000c': '\f', // '\f'
    // '\u000d': '\r', // '\r'
    // '\u000a': '\n', // '\n'
    "\u00b0": "*", // '°'
    "\u00b1": "+", // '±'
    "\u2424": "\n", // '\u2424' (NL)
    // '\u000b': '\v', // '\v'
    "\u2518": "+", // '┘'
    "\u2510": "+", // '┐'
    "\u250c": "+", // '┌'
    "\u2514": "+", // '└'
    "\u253c": "+", // '┼'
    "\u23ba": "-", // '⎺'
    "\u23bb": "-", // '⎻'
    "\u2500": "-", // '─'
    "\u23bc": "-", // '⎼'
    "\u23bd": "_", // '⎽'
    "\u251c": "+", // '├'
    "\u2524": "+", // '┤'
    "\u2534": "+", // '┴'
    "\u252c": "+", // '┬'
    "\u2502": "|", // '│'
    "\u2264": "<", // '≤'
    "\u2265": ">", // '≥'
    π: "?", // 'π'
    "\u2260": "=", // '≠'
    "\u00a3": "?", // '£'
    "\u00b7": "*"  // '·'
};
