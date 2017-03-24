const colors = require("./colors");
const unicode = require("./unicode");
const helpers = require("./helpers");

/**
 * Angle Table
 */
const angles = {
    "\u2518": true, // '┘'
    "\u2510": true, // '┐'
    "\u250c": true, // '┌'
    "\u2514": true, // '└'
    "\u253c": true, // '┼'
    "\u251c": true, // '├'
    "\u2524": true, // '┤'
    "\u2534": true, // '┴'
    "\u252c": true, // '┬'
    "\u2502": true, // '│'
    "\u2500": true  // '─'
};

const langles = {
    "\u250c": true, // '┌'
    "\u2514": true, // '└'
    "\u253c": true, // '┼'
    "\u251c": true, // '├'
    "\u2534": true, // '┴'
    "\u252c": true, // '┬'
    "\u2500": true  // '─'
};

const uangles = {
    "\u2510": true, // '┐'
    "\u250c": true, // '┌'
    "\u253c": true, // '┼'
    "\u251c": true, // '├'
    "\u2524": true, // '┤'
    "\u252c": true, // '┬'
    "\u2502": true  // '│'
};

const rangles = {
    "\u2518": true, // '┘'
    "\u2510": true, // '┐'
    "\u253c": true, // '┼'
    "\u2524": true, // '┤'
    "\u2534": true, // '┴'
    "\u252c": true, // '┬'
    "\u2500": true  // '─'
};

const dangles = {
    "\u2518": true, // '┘'
    "\u2514": true, // '└'
    "\u253c": true, // '┼'
    "\u251c": true, // '├'
    "\u2524": true, // '┤'
    "\u2534": true, // '┴'
    "\u2502": true  // '│'
};

// var cdangles = {
//   '\u250c': true  // '┌'
// };

// Every ACS angle character can be
// represented by 4 bits ordered like this:
// [langle][uangle][rangle][dangle]
const angleTable = {
    "0000": "", // ?
    "0001": "\u2502", // '│' // ?
    "0010": "\u2500", // '─' // ??
    "0011": "\u250c", // '┌'
    "0100": "\u2502", // '│' // ?
    "0101": "\u2502", // '│'
    "0110": "\u2514", // '└'
    "0111": "\u251c", // '├'
    1000: "\u2500", // '─' // ??
    1001: "\u2510", // '┐'
    1010: "\u2500", // '─' // ??
    1011: "\u252c", // '┬'
    1100: "\u2518", // '┘'
    1101: "\u2524", // '┤'
    1110: "\u2534", // '┴'
    1111: "\u253c"  // '┼'
};

Object.keys(angleTable).forEach((key) => {
    angleTable[parseInt(key, 2)] = angleTable[key];
    delete angleTable[key];
});

class DevNull extends adone.std.stream.Duplex {
    constructor(options = {}) {
        super(options);
    }

    _write(chunk, encoding, cb) {
        cb();
    }

    _read(n) {
        this.push(null);
    }
}

export default class Screen extends adone.terminal.Node {
    constructor(options = {}) {
        super(options);

        Screen.bind(this);

        this.terminal = adone.terminal;
        // Redefine process.stderr to null.
        this._devNull = new DevNull();
        this._oldStderrGetter = Object.getOwnPropertyDescriptor(process, "stderr").get;
        Object.defineProperty(process, "stderr", {
            get: () => this._devNull
        });
        this._oldStdoutGetter = Object.getOwnPropertyDescriptor(process, "stdout").get;
        Object.defineProperty(process, "stdout", {
            get: () => this._devNull
        });
        this.terminal.listen();
        this.terminal.enableDebug(options.debug);
        this.terminal.setupLogger(options.log, options.dump);
        this.terminal.useBuffer = true;
        this.terminal.setResizeTimeout(options.resizeTimeout || 300);
        this.terminfo = this.terminal.terminfo;

        this.autoPadding = options.autoPadding !== false;
        this.tabc = Array((options.tabSize || 4) + 1).join(" ");
        this.dockBorders = options.dockBorders;

        this.ignoreLocked = options.ignoreLocked || [];

        this._unicode = this.terminfo.unicode || this.terminfo.numbers.U8 === 1;
        this.fullUnicode = this.options.fullUnicode && this._unicode;

        this.dattr = ((0 << 18) | (0x1ff << 9)) | 0x1ff;

        this.renders = 0;
        const self = this;
        this.position = {
            left: this.left = this.aleft = this.rleft = 0,
            right: this.right = this.aright = this.rright = 0,
            top: this.top = this.atop = this.rtop = 0,
            bottom: this.bottom = this.abottom = this.rbottom = 0,
            get height() {
                return self.height;
            },
            get width() {
                return self.width;
            }
        };

        this.ileft = 0;
        this.itop = 0;
        this.iright = 0;
        this.ibottom = 0;
        this.iheight = 0;
        this.iwidth = 0;

        this.padding = {
            left: 0,
            top: 0,
            right: 0,
            bottom: 0
        };

        this.hover = null;
        this.history = [];
        this.clickable = [];
        this.keyable = [];
        this.grabKeys = false;
        this.lockKeys = false;
        this.focused;
        this._buf = "";

        this._ci = -1;

        if (options.title) {
            this.title = options.title;
        }

        options.cursor = options.cursor || {
            artificial: options.artificialCursor,
            shape: options.cursorShape,
            blink: options.cursorBlink,
            color: options.cursorColor
        };

        this.cursor = {
            artificial: options.cursor.artificial || false,
            shape: options.cursor.shape || "block",
            blink: options.cursor.blink || false,
            color: options.cursor.color || null,
            _set: false,
            _state: 1,
            _hidden: true
        };

        this.terminal.on("resize", () => {
            this.alloc();
            this.render();
            (function emit(el) {
                el.emit("resize");
                el.children.forEach(emit);
            })(this);
        }).on("focus", () => {
            this.emit("focus");
        }).on("blur", () => {
            this.emit("blur");
        }).on("warning", (text) => {
            this.emit("warning", text);
        });

        this.on("newListener", (type) => {
            if (type === "keypress" || type.indexOf("key ") === 0) {
                this._listenKeys();
            } else if (type === "mouse" || type === "click" || type === "mouseover" || type === "mouseout" || type === "mousedown" || type === "mouseup" || type === "mousewheel" || type === "wheeldown" || type === "wheelup" || type === "mousemove") {
                this._listenMouse();
            }
        });

        this.setMaxListeners(Infinity);
        this.enter();
        this.postEnter();
    }

    get title() {
        return this.terminal.title;
    }

    set title(title) {
        return this.terminal.title = title;
    }

    get terminalId() {
        return this.terminal.terminal;
    }

    get cols() {
        return this.terminal.cols;
    }

    get rows() {
        return this.terminal.rows;
    }

    get width() {
        return this.terminal.cols;
    }

    get height() {
        return this.terminal.rows;
    }

    get focused() {
        return this.history[this.history.length - 1];
    }

    set focused(el) {
        return this.focusPush(el);
    }

    enter() {
        if (this.terminal.isAlt) {
            return;
        }
        if (!this.cursor._set) {
            if (this.options.cursor.shape) {
                this.cursorShape(this.cursor.shape, this.cursor.blink);
            }
            if (this.options.cursor.color) {
                this.cursorColor(this.cursor.color);
            }
        }
        if (process.platform === "win32") {
            try {
                adone.std.child_process.execSync("cls", { stdio: "ignore", timeout: 1000 });
            } catch (e) { }
        }
        this.terminal.alternateScreenBuffer(true);
        this.terminal.applicationKeypad(true);
        this.terminal.setScrollRegion(0, this.height - 1);
        this.terminal.hideCursor();
        this.terminal.cursorPos(0, 0);
        this.alloc();
    }

    leave() {
        if (!this.terminal.isAlt) {
            return;
        }
        this.terminal.applicationKeypad(false);
        if (this.terminal.scrollTop !== 0 || this.terminal.scrollBottom !== this.rows - 1) {
            this.terminal.setScrollRegion(0, this.height - 1);
        }
        // XXX For some reason if alloc/clear() is before this line, it doesn't work on linux console.
        this.terminal.showCursor();
        this.alloc();
        if (this._listenedMouse) {
            this.terminal.disableMouse();
        }
        this.terminal.alternateScreenBuffer(false);
        if (this.cursor._set) {
            this.cursorReset();
        }
        this.terminal.flush();
        if (process.platform === "win32") {
            try {
                adone.std.child_process.execSync("cls", { stdio: "ignore", timeout: 1000 });
            } catch (e) { }
        }
    }

    postEnter() {
        const self = this;
        if (this.options.debug) {
            this.debugLog = new adone.terminal.widget.Log({
                screen: this,
                parent: this,
                hidden: true,
                draggable: true,
                left: "center",
                top: "center",
                width: "30%",
                height: "30%",
                border: "line",
                label: " {bold}Debug Log{/bold} ",
                tags: true,
                keys: true,
                vi: true,
                mouse: true,
                scrollbar: {
                    ch: " ",
                    track: {
                        bg: "yellow"
                    },
                    style: {
                        inverse: true
                    }
                }
            });

            this.debugLog.toggle = function () {
                if (self.debugLog.hidden) {
                    self.saveFocus();
                    self.debugLog.show();
                    self.debugLog.setFront();
                    self.debugLog.focus();
                } else {
                    self.debugLog.hide();
                    self.restoreFocus();
                }
                self.render();
            };

            this.debugLog.key(["q", "escape"], self.debugLog.toggle);
            this.key("f12", self.debugLog.toggle);
        }

        if (this.options.warnings) {
            this.on("warning", (text) => {
                const warning = new adone.terminal.widget.Element({
                    screen: self,
                    parent: self,
                    left: "center",
                    top: "center",
                    width: "shrink",
                    padding: 1,
                    height: "shrink",
                    align: "center",
                    valign: "middle",
                    border: "line",
                    label: " {red-fg}{bold}WARNING{/} ",
                    content: `{bold}${text}{/bold}`,
                    tags: true
                });
                self.render();
                const timeout = setTimeout(() => {
                    warning.destroy();
                    self.render();
                }, 1500);
                if (timeout.unref) {
                    timeout.unref();
                }
            });
        }
    }

    destroy() {
        this._devNull.unpipe();
        this._devNull.end();
        Object.defineProperty(process, "stderr", {
            get: this._oldStderrGetter
        });
        Object.defineProperty(process, "stdout", {
            get: this._oldStdoutGetter
        });
        this.leave();

        const index = Screen.instances.indexOf(this);
        if (~index) {
            Screen.instances.splice(index, 1);
            Screen.total--;

            Screen.global = Screen.instances[0];

            if (Screen.total === 0) {
                Screen.global = null;

                process.removeListener("uncaughtException", Screen._exceptionHandler);
                process.removeListener("SIGTERM", Screen._sigtermHandler);
                process.removeListener("SIGINT", Screen._sigintHandler);
                process.removeListener("SIGQUIT", Screen._sigquitHandler);
                process.removeListener("exit", Screen._exitHandler);
                delete Screen._exceptionHandler;
                delete Screen._sigtermHandler;
                delete Screen._sigintHandler;
                delete Screen._sigquitHandler;
                delete Screen._exitHandler;

                delete Screen._bound;
            }

            this.destroyed = true;
            this.emit("destroy");
            super.destroy();
        }

        this.terminal.destroy();
    }

    log() {
        return this.terminal.log.apply(this.terminal, arguments);
    }

    debug() {
        if (this.debugLog) {
            this.debugLog.log.apply(this.debugLog, arguments);
        }
        return this.terminal.debug.apply(this.terminal, arguments);
    }

    _listenMouse(el) {
        if (el && !~this.clickable.indexOf(el)) {
            el.clickable = true;
            this.clickable.push(el);
        }

        if (this._listenedMouse) {
            return;
        }
        this._listenedMouse = true;

        this.terminal.enableMouse();
        if (this.options.sendFocus) {
            this.terminal.setMouse({ sendFocus: true }, true);
        }

        this.on("render", () => {
            this._needsClickableSort = true;
        });

        this.terminal.on("mouse", (data) => {
            if (this.lockKeys) {
                return;
            }

            if (this._needsClickableSort) {
                this.clickable = helpers.hsort(this.clickable);
                this._needsClickableSort = false;
            }

            let el;
            let set;
            let pos;

            for (let i = 0; i < this.clickable.length; i++) {
                el = this.clickable[i];

                if (el.detached || !el.visible) {
                    continue;
                }

                // if (self.grabMouse && self.focused !== el
                //     && !el.hasAncestor(self.focused)) continue;

                pos = el.lpos;
                if (!pos) {
                    continue;
                }

                if (data.x >= pos.xi && data.x < pos.xl && data.y >= pos.yi && data.y < pos.yl) {
                    el.emit("mouse", data);
                    if (data.action === "mousedown") {
                        this.mouseDown = el;
                    } else if (data.action === "mouseup") {
                        (this.mouseDown || el).emit("click", data);
                        this.mouseDown = null;
                    } else if (data.action === "mousemove") {
                        if (this.hover && el.index > this.hover.index) {
                            set = false;
                        }
                        if (this.hover !== el && !set) {
                            if (this.hover) {
                                this.hover.emit("mouseout", data);
                            }
                            el.emit("mouseover", data);
                            this.hover = el;
                        }
                        set = true;
                    }
                    el.emit(data.action, data);
                    break;
                }
            }

            // Just mouseover?
            if ((data.action === "mousemove" || data.action === "mousedown" || data.action === "mouseup") && this.hover && !set) {
                this.hover.emit("mouseout", data);
                this.hover = null;
            }

            this.emit("mouse", data);
            this.emit(data.action, data);
        });

        // Autofocus highest element.
        // this.on('element click', function(el, data) {
        //   var target;
        //   do {
        //     if (el.clickable === true && el.options.autoFocus !== false) {
        //       target = el;
        //     }
        //   } while (el = el.parent);
        //   if (target) target.focus();
        // });

        // Autofocus elements with the appropriate option.
        this.on("element click", (el) => {
            if (el.clickable === true && el.options.autoFocus !== false) {
                el.focus();
            }
        });
    }

    enableMouse(el) {
        this._listenMouse(el);
    }

    _listenKeys(el) {
        if (el && !~this.keyable.indexOf(el)) {
            el.keyable = true;
            this.keyable.push(el);
        }

        if (this._listenedKeys) {
            return;
        }
        this._listenedKeys = true;

        // NOTE: The event emissions used to be reversed:
        // element + screen
        // They are now:
        // screen + element
        // After the first keypress emitted, the handler checks to make sure grabKeys, lockKeys, and focused weren't changed, and handles those situations appropriately.
        this.terminal.on("keypress", (ch, key) => {
            if (this.lockKeys && !~this.ignoreLocked.indexOf(key.full)) {
                return;
            }

            const focused = this.focused;
            const grabKeys = this.grabKeys;

            if (!grabKeys || ~this.ignoreLocked.indexOf(key.full)) {
                this.emit("keypress", ch, key);
                this.emit(`key ${key.full}`, ch, key);
            }

            // If something changed from the screen key handler, stop.
            if (this.grabKeys !== grabKeys || this.lockKeys) {
                return;
            }

            if (focused && focused.keyable) {
                focused.emit("keypress", ch, key);
                focused.emit(`key ${key.full}`, ch, key);
            }
        });
    }

    enableKeys(el) {
        this._listenKeys(el);
    }

    enableInput(el) {
        this._listenMouse(el);
        this._listenKeys(el);
    }

    _initHover() {
        const self = this;

        if (this._hoverText) {
            return;
        }

        this._hoverText = new adone.terminal.widget.Element({
            screen: this,
            left: 0,
            top: 0,
            tags: false,
            height: "shrink",
            width: "shrink",
            border: "line",
            style: {
                border: {
                    fg: "default"
                },
                bg: "default",
                fg: "default"
            }
        });

        this.on("mousemove", (data) => {
            if (self._hoverText.detached) {
                return;
            }
            self._hoverText.rleft = data.x + 1;
            self._hoverText.rtop = data.y;
            self.render();
        });

        this.on("element mouseover", (el, data) => {
            if (!el._hoverOptions) {
                return;
            }
            self._hoverText.parseTags = el.parseTags;
            self._hoverText.setContent(el._hoverOptions.text);
            self.append(self._hoverText);
            self._hoverText.rleft = data.x + 1;
            self._hoverText.rtop = data.y;
            self.render();
        });

        this.on("element mouseout", () => {
            if (self._hoverText.detached) {
                return;
            }
            self._hoverText.detach();
            self.render();
        });

        // XXX This can cause problems if the
        // terminal does not support allMotion.
        // Workaround: check to see if content is set.
        this.on("element mouseup", (el) => {
            if (!self._hoverText.getContent()) {
                return;
            }
            if (!el._hoverOptions) {
                return;
            }
            self.append(self._hoverText);
            self.render();
        });
    }

    alloc(dirty) {
        let x;
        let y;

        this.lines = [];
        for (y = 0; y < this.rows; y++) {
            this.lines[y] = [];
            for (x = 0; x < this.cols; x++) {
                this.lines[y][x] = [this.dattr, " "];
            }
            this.lines[y].dirty = Boolean(dirty);
        }

        this.olines = [];
        for (y = 0; y < this.rows; y++) {
            this.olines[y] = [];
            for (x = 0; x < this.cols; x++) {
                this.olines[y][x] = [this.dattr, " "];
            }
        }

        this.terminal.clear();
    }

    realloc() {
        return this.alloc(true);
    }

    render() {
        if (this.destroyed) {
            return;
        }

        this.emit("prerender");

        this._borderStops = {};

        // TODO: Possibly get rid of .dirty altogether.
        // TODO: Could possibly drop .dirty and just clear the `lines` buffer every
        // time before a screen.render. This way clearRegion doesn't have to be
        // called in arbitrary places for the sake of clearing a spot where an
        // element used to be (e.g. when an element moves or is hidden). There could
        // be some overhead though.
        // this.screen.clearRegion(0, this.cols, 0, this.rows);
        this._ci = 0;
        this.children.forEach((el) => {
            el.index = this._ci++;
            //el._rendering = true;
            el.render();
            //el._rendering = false;
        });
        this._ci = -1;

        if (this.screen.dockBorders) {
            this._dockBorders();
        }

        this.draw(0, this.lines.length - 1);

        // XXX Workaround to deal with cursor pos before the screen has rendered and
        // lpos is not reliable (stale).
        if (this.focused && this.focused._updateCursor) {
            this.focused._updateCursor(true);
        }

        this.renders++;

        this.emit("render");
    }

    blankLine(ch, dirty) {
        const out = [];
        for (let x = 0; x < this.cols; x++) {
            out[x] = [this.dattr, ch || " "];
        }
        out.dirty = dirty;
        return out;
    }

    insertLine(n, y, top, bottom) {
        // if (y === top) return this.insertLineNC(n, y, top, bottom);
        if (!this.terminfo.strings.change_scroll_region || !this.terminfo.strings.delete_line || !this.terminfo.strings.insert_line) {
            return;
        }

        this._buf += this.terminfo.setScrollRegion(top, bottom);
        this._buf += this.terminfo.moveTo(y + 1, 1);
        this._buf += this.terminfo.insertLine(n);
        this._buf += this.terminfo.setScrollRegion(0, this.height - 1);

        const j = bottom + 1;

        while (n--) {
            this.lines.splice(y, 0, this.blankLine());
            this.lines.splice(j, 1);
            this.olines.splice(y, 0, this.blankLine());
            this.olines.splice(j, 1);
        }
    }

    deleteLine(n, y, top, bottom) {
        // if (y === top) return this.deleteLineNC(n, y, top, bottom);

        if (!this.terminfo.strings.change_scroll_region || !this.terminfo.strings.delete_line || !this.terminfo.strings.insert_line) {
            return;
        }

        this._buf += this.terminfo.setScrollRegion(top, bottom);
        this._buf += this.terminfo.moveTo(y + 1, 1);
        this._buf += this.terminfo.deleteLine(n);
        this._buf += this.terminfo.setScrollRegion(0, this.height - 1);

        const j = bottom + 1;

        while (n--) {
            this.lines.splice(j, 0, this.blankLine());
            this.lines.splice(y, 1);
            this.olines.splice(j, 0, this.blankLine());
            this.olines.splice(y, 1);
        }
    }

    // This is how ncurses does it.
    // Scroll down (up cursor-wise).
    // This will only work for top line deletion as opposed to arbitrary lines.
    insertLineNC(n, y, top, bottom) {
        if (!this.terminfo.strings.change_scroll_region || !this.terminfo.strings.delete_line) {
            return;
        }

        this._buf += this.terminfo.setScrollRegion(top, bottom);
        this._buf += this.terminfo.moveTo(top + 1, 1);
        this._buf += this.terminfo.deleteLine(n);
        this._buf += this.terminfo.setScrollRegion(0, this.height - 1);

        const j = bottom + 1;

        while (n--) {
            this.lines.splice(j, 0, this.blankLine());
            this.lines.splice(y, 1);
            this.olines.splice(j, 0, this.blankLine());
            this.olines.splice(y, 1);
        }
    }

    // This is how ncurses does it.
    // Scroll up (down cursor-wise).
    // This will only work for bottom line deletion as opposed to arbitrary lines.
    deleteLineNC(n, y, top, bottom) {
        if (!this.terminfo.strings.change_scroll_region || !this.terminfo.strings.delete_line) {
            return;
        }

        this._buf += this.terminfo.setScrollRegion(top, bottom);
        this._buf += this.terminfo.moveTo(bottom + 1, 1);
        this._buf += Array(n + 1).join("\n");
        this._buf += this.terminfo.setScrollRegion(0, this.height - 1);

        const j = bottom + 1;

        while (n--) {
            this.lines.splice(j, 0, this.blankLine());
            this.lines.splice(y, 1);
            this.olines.splice(j, 0, this.blankLine());
            this.olines.splice(y, 1);
        }
    }

    insertBottom(top, bottom) {
        return this.deleteLine(1, top, top, bottom);
    }

    insertTop(top, bottom) {
        return this.insertLine(1, top, top, bottom);
    }

    deleteBottom(top, bottom) {
        return this.clearRegion(0, this.width, bottom, bottom);
    }

    deleteTop(top, bottom) {
        // Same as: return this.insertBottom(top, bottom);
        return this.deleteLine(1, top, top, bottom);
    }

    // Parse the sides of an element to determine
    // whether an element has uniform cells on
    // both sides. If it does, we can use CSR to
    // optimize scrolling on a scrollable element.
    // Not exactly sure how worthwile this is.
    // This will cause a performance/cpu-usage hit,
    // but will it be less or greater than the
    // performance hit of slow-rendering scrollable
    // boxes with clean sides?
    cleanSides(el) {
        const pos = el.lpos;

        if (!pos) {
            return false;
        }

        if (pos._cleanSides != null) {
            return pos._cleanSides;
        }

        if (pos.xi <= 0 && pos.xl >= this.width) {
            return pos._cleanSides = true;
        }

        if (this.options.fastCSR) {
            // Maybe just do this instead of parsing.
            if (pos.yi < 0) {
                return pos._cleanSides = false;
            }
            if (pos.yl > this.height) {
                return pos._cleanSides = false;
            }
            if (this.width - (pos.xl - pos.xi) < 40) {
                return pos._cleanSides = true;
            }
            return pos._cleanSides = false;
        }

        if (!this.options.smartCSR) {
            return false;
        }

        // The scrollbar can't update properly, and there's also a
        // chance that the scrollbar may get moved around senselessly.
        // NOTE: In pratice, this doesn't seem to be the case.
        // if (this.scrollbar) {
        //   return pos._cleanSides = false;
        // }

        // Doesn't matter if we're only a height of 1.
        // if ((pos.yl - el.ibottom) - (pos.yi + el.itop) <= 1) {
        //   return pos._cleanSides = false;
        // }

        const yi = pos.yi + el.itop;
        const yl = pos.yl - el.ibottom;
        let first;
        let ch;
        let x;
        let y;

        if (pos.yi < 0) {
            return pos._cleanSides = false;
        }
        if (pos.yl > this.height) {
            return pos._cleanSides = false;
        }
        if (pos.xi - 1 < 0) {
            return pos._cleanSides = true;
        }
        if (pos.xl > this.width) {
            return pos._cleanSides = true;
        }

        for (x = pos.xi - 1; x >= 0; x--) {
            if (!this.olines[yi]) {
                break;
            }
            first = this.olines[yi][x];
            for (y = yi; y < yl; y++) {
                if (!this.olines[y] || !this.olines[y][x]) {
                    break;
                }
                ch = this.olines[y][x];
                if (ch[0] !== first[0] || ch[1] !== first[1]) {
                    return pos._cleanSides = false;
                }
            }
        }

        for (x = pos.xl; x < this.width; x++) {
            if (!this.olines[yi]) {
                break;
            }
            first = this.olines[yi][x];
            for (y = yi; y < yl; y++) {
                if (!this.olines[y] || !this.olines[y][x]) {
                    break;
                }
                ch = this.olines[y][x];
                if (ch[0] !== first[0] || ch[1] !== first[1]) {
                    return pos._cleanSides = false;
                }
            }
        }

        return pos._cleanSides = true;
    }

    _dockBorders() {
        const lines = this.lines;
        let stops = this._borderStops;
        let i;
        let y;
        let x;
        let ch;

        // var keys, stop;
        //
        // keys = Object.keys(this._borderStops)
        //   .map(function(k) { return +k; })
        //   .sort(function(a, b) { return a - b; });
        //
        // for (i = 0; i < keys.length; i++) {
        //   y = keys[i];
        //   if (!lines[y]) continue;
        //   stop = this._borderStops[y];
        //   for (x = stop.xi; x < stop.xl; x++) {

        stops = Object.keys(stops).map((k) => {
            return Number(k);
        }).sort((a, b) => {
            return a - b;
        });

        for (i = 0; i < stops.length; i++) {
            y = stops[i];
            if (!lines[y]) {
                continue;
            }
            for (x = 0; x < this.width; x++) {
                ch = lines[y][x][1];
                if (angles[ch]) {
                    lines[y][x][1] = this._getAngle(lines, x, y);
                    lines[y].dirty = true;
                }
            }
        }
    }

    _getAngle(lines, x, y) {
        let angle = 0;
        const attr = lines[y][x][0];
        const ch = lines[y][x][1];

        if (lines[y][x - 1] && langles[lines[y][x - 1][1]]) {
            if (!this.options.ignoreDockContrast) {
                if (lines[y][x - 1][0] !== attr) {
                    return ch;
                }
            }
            angle |= 1 << 3;
        }

        if (lines[y - 1] && uangles[lines[y - 1][x][1]]) {
            if (!this.options.ignoreDockContrast) {
                if (lines[y - 1][x][0] !== attr) {
                    return ch;
                }
            }
            angle |= 1 << 2;
        }

        if (lines[y][x + 1] && rangles[lines[y][x + 1][1]]) {
            if (!this.options.ignoreDockContrast) {
                if (lines[y][x + 1][0] !== attr) {
                    return ch;
                }
            }
            angle |= 1 << 1;
        }

        if (lines[y + 1] && dangles[lines[y + 1][x][1]]) {
            if (!this.options.ignoreDockContrast) {
                if (lines[y + 1][x][0] !== attr) {
                    return ch;
                }
            }
            angle |= 1 << 0;
        }

        // Experimental: fixes this situation:
        // +----------+
        //            | <-- empty space here, should be a T angle
        // +-------+  |
        // |       |  |
        // +-------+  |
        // |          |
        // +----------+
        // if (uangles[lines[y][x][1]]) {
        //   if (lines[y + 1] && cdangles[lines[y + 1][x][1]]) {
        //     if (!this.options.ignoreDockContrast) {
        //       if (lines[y + 1][x][0] !== attr) return ch;
        //     }
        //     angle |= 1 << 0;
        //   }
        // }

        return angleTable[angle] || ch;
    }

    draw(start, end) {
        // this.emit('predraw');

        let x;
        let y;
        let line;
        let out;
        let ch;
        let data;
        let attr;
        let fg;
        let bg;
        let flags;

        let main = "";
        let pre;
        let post;

        let clr;
        let neq;
        let xx;

        let lx = -1;
        let ly = -1;
        let o;

        let acs;

        if (this._buf) {
            main += this._buf;
            this._buf = "";
        }

        for (y = start; y <= end; y++) {
            line = this.lines[y];
            o = this.olines[y];

            if (!line.dirty && !(this.cursor.artificial && y === this.terminal.y)) {
                continue;
            }
            line.dirty = false;

            out = "";
            attr = this.dattr;

            for (x = 0; x < line.length; x++) {
                data = line[x][0];
                ch = line[x][1];

                // Render the artificial cursor.
                if (this.cursor.artificial && !this.cursor._hidden && this.cursor._state && x === this.terminal.x && y === this.terminal.y) {
                    const cattr = this._cursorAttr(this.cursor, data);
                    if (cattr.ch) {
                        ch = cattr.ch;
                    }
                    data = cattr.attr;
                }

                // Take advantage of xterm's back_color_erase feature by using a
                // lookahead. Stop spitting out so many damn spaces. NOTE: Is checking
                // the bg for non BCE terminals worth the overhead?
                if (this.options.useBCE && ch === " " && (this.terminfo.bools.back_color_erase || (data & 0x1ff) === (this.dattr & 0x1ff)) && ((data >> 18) & 8) === ((this.dattr >> 18) & 8)) {
                    clr = true;
                    neq = false;

                    for (xx = x; xx < line.length; xx++) {
                        if (line[xx][0] !== data || line[xx][1] !== " ") {
                            clr = false;
                            break;
                        }
                        if (line[xx][0] !== o[xx][0] || line[xx][1] !== o[xx][1]) {
                            neq = true;
                        }
                    }

                    if (clr && neq) {
                        lx = -1, ly = -1;
                        if (data !== attr) {
                            out += this.codeAttr(data);
                            attr = data;
                        }
                        out += this.terminfo.moveTo(y + 1, x + 1);
                        out += this.terminfo.eraseLineAfter();
                        for (xx = x; xx < line.length; xx++) {
                            o[xx][0] = data;
                            o[xx][1] = " ";
                        }
                        break;
                    }

                    // If there's more than 10 spaces, use EL regardless
                    // and start over drawing the rest of line. Might
                    // not be worth it. Try to use ECH if the terminal
                    // supports it. Maybe only try to use ECH here.
                    // //if (this.terminfo.strings.erase_chars)
                    // if (!clr && neq && (xx - x) > 10) {
                    //   lx = -1, ly = -1;
                    //   if (data !== attr) {
                    //     out += this.codeAttr(data);
                    //     attr = data;
                    //   }
                    //   out += this.terminfo.cursorPos(y, x);
                    //   if (this.terminfo.strings.erase_chars) {
                    //     // Use erase_chars to avoid erasing the whole line.
                    //     out += this.terminfo.ech(xx - x);
                    //   } else {
                    //     out += this.terminfo.eraseLineAfter();
                    //   }
                    //   if (this.terminfo.strings.parm_right_cursor) {
                    //     out += this.terminfo.right(xx - x);
                    //   } else {
                    //     out += this.terminfo.cursorPos(y, xx);
                    //   }
                    //   this.fillRegion(data, ' ',
                    //     x, this.terminfo.strings.erase_chars ? xx : line.length,
                    //     y, y + 1);
                    //   x = xx - 1;
                    //   continue;
                    // }

                    // Skip to the next line if the
                    // rest of the line is already drawn.
                    // if (!neq) {
                    //   for (; xx < line.length; xx++) {
                    //     if (line[xx][0] !== o[xx][0] || line[xx][1] !== o[xx][1]) {
                    //       neq = true;
                    //       break;
                    //     }
                    //   }
                    //   if (!neq) {
                    //     attr = data;
                    //     break;
                    //   }
                    // }
                }

                // Optimize by comparing the real output
                // buffer to the pending output buffer.
                if (data === o[x][0] && ch === o[x][1]) {
                    if (lx === -1) {
                        lx = x;
                        ly = y;
                    }
                    continue;
                } else if (lx !== -1) {
                    out += (y === ly ? this.terminfo.right(x - lx) : this.terminfo.moveTo(y + 1, x + 1));
                    lx = -1, ly = -1;
                }
                o[x][0] = data;
                o[x][1] = ch;

                if (data !== attr) {
                    if (attr !== this.dattr) {
                        out += "\x1b[m";
                    }
                    if (data !== this.dattr) {
                        out += "\x1b[";

                        bg = data & 0x1ff;
                        fg = (data >> 9) & 0x1ff;
                        flags = data >> 18;

                        // bold
                        if (flags & 1) {
                            out += "1;";
                        }

                        // underline
                        if (flags & 2) {
                            out += "4;";
                        }

                        // blink
                        if (flags & 4) {
                            out += "5;";
                        }

                        // inverse
                        if (flags & 8) {
                            out += "7;";
                        }

                        // invisible
                        if (flags & 16) {
                            out += "8;";
                        }

                        if (bg !== 0x1ff) {
                            bg = this._reduceColor(bg);
                            if (bg < 16) {
                                if (bg < 8) {
                                    bg += 40;
                                } else if (bg < 16) {
                                    bg -= 8;
                                    bg += 100;
                                }
                                out += `${bg};`;
                            } else {
                                out += `48;5;${bg};`;
                            }
                        }

                        if (fg !== 0x1ff) {
                            fg = this._reduceColor(fg);
                            if (fg < 16) {
                                if (fg < 8) {
                                    fg += 30;
                                } else if (fg < 16) {
                                    fg -= 8;
                                    fg += 90;
                                }
                                out += `${fg};`;
                            } else {
                                out += `38;5;${fg};`;
                            }
                        }

                        if (out[out.length - 1] === ";") {
                            out = out.slice(0, -1);
                        }

                        out += "m";
                    }
                }

                // If we find a double-width char, eat the next character which should be
                // a space due to parseContent's behavior.
                if (this.fullUnicode) {
                    // If this is a surrogate pair double-width char, we can ignore it
                    // because parseContent already counted it as length=2.
                    if (unicode.charWidth(line[x][1]) === 2) {
                        // NOTE: At cols=44, the bug that is avoided
                        // by the angles check occurs in widget-unicode:
                        // Might also need: `line[x + 1][0] !== line[x][0]`
                        // for borderless boxes?
                        if (x === line.length - 1 || angles[line[x + 1][1]]) {
                            // If we're at the end, we don't have enough space for a
                            // double-width. Overwrite it with a space and ignore.
                            ch = " ";
                            o[x][1] = "\0";
                        } else {
                            // ALWAYS refresh double-width chars because this special cursor
                            // behavior is needed. There may be a more efficient way of doing
                            // this. See above.
                            o[x][1] = "\0";
                            // Eat the next character by moving forward and marking as a
                            // space (which it is).
                            o[++x][1] = "\0";
                        }
                    }
                }

                // Attempt to use ACS for supported characters.
                // This is not ideal, but it's how ncurses works.
                // There are a lot of terminals that support ACS
                // *and UTF8, but do not declare U8. So ACS ends
                // up being used (slower than utf8). Terminals
                // that do not support ACS and do not explicitly
                // support UTF8 get their unicode characters
                // replaced with really ugly ascii characters.
                // It is possible there is a terminal out there
                // somewhere that does not support ACS, but
                // supports UTF8, but I imagine it's unlikely.
                // Maybe remove !this.terminfo.unicode check, however,
                // this seems to be the way ncurses does it.
                if (this.terminfo.strings.enter_alt_charset_mode && !this.terminfo.brokenACS && (this.terminfo.acscr[ch] || acs)) {
                    // Fun fact: even if this.terminfo.brokenACS wasn't checked here,
                    // the linux console would still work fine because the acs
                    // table would fail the check of: this.terminfo.acscr[ch]
                    if (this.terminfo.acscr[ch]) {
                        if (acs) {
                            ch = this.terminfo.acscr[ch];
                        } else {
                            ch = this.terminfo.alternateCharsetMode(true) + this.terminfo.acscr[ch];
                            acs = true;
                        }
                    } else if (acs) {
                        ch = this.terminfo.alternateCharsetMode(false) + ch;
                        acs = false;
                    }
                } else {
                    // U8 is not consistently correct. Some terminfo's
                    // terminals that do not declare it may actually
                    // support utf8 (e.g. urxvt), but if the terminal
                    // does not declare support for ACS (and U8), chances
                    // are it does not support UTF8. This is probably
                    // the "safest" way to do this. Should fix things
                    // like sun-color.
                    // NOTE: It could be the case that the $LANG
                    // is all that matters in some cases:
                    // if (!this.terminfo.unicode && ch > '~') {
                    if (!this.terminfo.unicode && this.terminfo.numbers.U8 !== 1 && ch > "~") {
                        ch = this.terminfo.utoa[ch] || "?";
                    }
                }

                out += ch;
                attr = data;
            }

            if (attr !== this.dattr) {
                out += "\x1b[m";
            }

            if (out) {
                main += this.terminfo.moveTo(y + 1, 1) + out;
            }
        }

        if (acs) {
            main += this.terminfo.alternateCharsetMode(false);
            acs = false;
        }

        if (main) {
            pre = "";
            post = "";

            pre += this.terminfo.saveCursor();
            post += this.terminfo.restoreCursor();

            if (!this.terminal.cursorHidden) {
                pre += this.terminfo.hideCursor(true);
                post += this.terminfo.hideCursor(false);
            }

            // this.terminal.flush();
            // this.terminal._owrite(pre + main + post);
            this.terminal.write(pre + main + post);
        }

        // this.emit('draw');
    }

    _reduceColor(color) {
        return colors.reduce(color, this.terminfo.colors);
    }

    // Convert an SGR string to our own attribute format.
    attrCode(code, cur, def) {
        let flags = (cur >> 18) & 0x1ff;
        let fg = (cur >> 9) & 0x1ff;
        let bg = cur & 0x1ff;
        let c;
        let i;

        code = code.slice(2, -1).split(";");
        if (!code[0]) {
            code[0] = "0";
        }

        for (i = 0; i < code.length; i++) {
            c = Number(code[i]) || 0;
            switch (c) {
                case 0: // normal
                    bg = def & 0x1ff;
                    fg = (def >> 9) & 0x1ff;
                    flags = (def >> 18) & 0x1ff;
                    break;
                case 1: // bold
                    flags |= 1;
                    break;
                case 22:
                    flags = (def >> 18) & 0x1ff;
                    break;
                case 4: // underline
                    flags |= 2;
                    break;
                case 24:
                    flags = (def >> 18) & 0x1ff;
                    break;
                case 5: // blink
                    flags |= 4;
                    break;
                case 25:
                    flags = (def >> 18) & 0x1ff;
                    break;
                case 7: // inverse
                    flags |= 8;
                    break;
                case 27:
                    flags = (def >> 18) & 0x1ff;
                    break;
                case 8: // invisible
                    flags |= 16;
                    break;
                case 28:
                    flags = (def >> 18) & 0x1ff;
                    break;
                case 39: // default fg
                    fg = (def >> 9) & 0x1ff;
                    break;
                case 49: // default bg
                    bg = def & 0x1ff;
                    break;
                case 100: // default fg/bg
                    fg = (def >> 9) & 0x1ff;
                    bg = def & 0x1ff;
                    break;
                default: // color
                    if (c === 48 && Number(code[i + 1]) === 5) {
                        i += 2;
                        bg = Number(code[i]);
                        break;
                    } else if (c === 48 && Number(code[i + 1]) === 2) {
                        i += 2;
                        bg = colors.match(Number(code[i]), Number(code[i + 1]), Number(code[i + 2]));
                        if (bg === -1) {
                            bg = def & 0x1ff;
                        }
                        i += 2;
                        break;
                    } else if (c === 38 && Number(code[i + 1]) === 5) {
                        i += 2;
                        fg = Number(code[i]);
                        break;
                    } else if (c === 38 && Number(code[i + 1]) === 2) {
                        i += 2;
                        fg = colors.match(Number(code[i]), Number(code[i + 1]), Number(code[i + 2]));
                        if (fg === -1) {
                            fg = (def >> 9) & 0x1ff;
                        }
                        i += 2;
                        break;
                    }
                    if (c >= 40 && c <= 47) {
                        bg = c - 40;
                    } else if (c >= 100 && c <= 107) {
                        bg = c - 100;
                        bg += 8;
                    } else if (c === 49) {
                        bg = def & 0x1ff;
                    } else if (c >= 30 && c <= 37) {
                        fg = c - 30;
                    } else if (c >= 90 && c <= 97) {
                        fg = c - 90;
                        fg += 8;
                    } else if (c === 39) {
                        fg = (def >> 9) & 0x1ff;
                    } else if (c === 100) {
                        fg = (def >> 9) & 0x1ff;
                        bg = def & 0x1ff;
                    }
                    break;
            }
        }

        return (flags << 18) | (fg << 9) | bg;
    }

    // Convert our own attribute format to an SGR string.
    codeAttr(code) {
        const flags = (code >> 18) & 0x1ff;
        let fg = (code >> 9) & 0x1ff;
        let bg = code & 0x1ff;
        let out = "";

        // bold
        if (flags & 1) {
            out += "1;";
        }

        // underline
        if (flags & 2) {
            out += "4;";
        }

        // blink
        if (flags & 4) {
            out += "5;";
        }

        // inverse
        if (flags & 8) {
            out += "7;";
        }

        // invisible
        if (flags & 16) {
            out += "8;";
        }

        if (bg !== 0x1ff) {
            bg = this._reduceColor(bg);
            if (bg < 16) {
                if (bg < 8) {
                    bg += 40;
                } else if (bg < 16) {
                    bg -= 8;
                    bg += 100;
                }
                out += `${bg};`;
            } else {
                out += `48;5;${bg};`;
            }
        }

        if (fg !== 0x1ff) {
            fg = this._reduceColor(fg);
            if (fg < 16) {
                if (fg < 8) {
                    fg += 30;
                } else if (fg < 16) {
                    fg -= 8;
                    fg += 90;
                }
                out += `${fg};`;
            } else {
                out += `38;5;${fg};`;
            }
        }

        if (out[out.length - 1] === ";") {
            out = out.slice(0, -1);
        }

        return `\x1b[${out}m`;
    }

    focusOffset(offset) {
        const shown = this.keyable.filter((el) => !el.detached && el.visible).length;

        if (!shown || !offset) {
            return;
        }

        let i = this.keyable.indexOf(this.focused);
        if (!~i) {
            return;
        }

        if (offset > 0) {
            while (offset--) {
                if (++i >= this.keyable.length) {
                    i = 0;
                }
                if (this.keyable[i].detached || !this.keyable[i].visible || !this.keyable[i].focusable) {
                    offset++;
                }
            }
        } else {
            offset = -offset;
            while (offset--) {
                if (--i < 0) {
                    i = this.keyable.length - 1;
                }
                if (this.keyable[i].detached || !this.keyable[i].visible || !this.keyable[i].focusable) {
                    offset++;
                }
            }
        }

        return this.keyable[i].focus();
    }

    focusPrevious() {
        return this.focusOffset(-1);
    }

    focusNext() {
        return this.focusOffset(1);
    }

    focusPush(el) {
        if (!el) {
            return;
        }
        const old = this.history[this.history.length - 1];
        if (this.history.length === 10) {
            this.history.shift();
        }
        this.history.push(el);
        this._focus(el, old);
    }

    focusPop() {
        const old = this.history.pop();
        if (this.history.length) {
            this._focus(this.history[this.history.length - 1], old);
        }
        return old;
    }

    saveFocus() {
        return this._savedFocus = this.focused;
    }

    restoreFocus() {
        if (!this._savedFocus) {
            return;
        }
        this._savedFocus.focus();
        delete this._savedFocus;
        return this.focused;
    }

    rewindFocus() {
        const old = this.history.pop();
        let el;

        while (this.history.length) {
            el = this.history.pop();
            if (!el.detached && el.visible) {
                this.history.push(el);
                this._focus(el, old);
                return el;
            }
        }

        if (old) {
            old.emit("blur");
        }
    }

    _focus(self, old) {
        // Find a scrollable ancestor if we have one.
        let el = self;
        while (el = el.parent) {
            if (el.scrollable) {
                break;
            }
        }

        // If we're in a scrollable element,
        // automatically scroll to the focused element.
        if (el && !el.detached) {
            // NOTE: This is different from the other "visible" values - it needs the
            // visible height of the scrolling element itself, not the element within
            // it.
            const visible = self.screen.height - el.atop - el.itop - el.abottom - el.ibottom;
            if (self.rtop < el.childBase) {
                el.setScroll(self.rtop);
                self.screen.render();
            } else if (self.rtop + self.height - self.ibottom > el.childBase + visible) {
                // Explanation for el.itop here: takes into account scrollable elements
                // with borders otherwise the element gets covered by the bottom border:
                el.setScroll(self.rtop - (el.height - self.height) + el.itop, true);
                self.screen.render();
            }
        }

        if (old) {
            old.emit("blur", self);
        }

        self.emit("focus", old);
    }

    clearRegion(xi, xl, yi, yl, override) {
        return this.fillRegion(this.dattr, " ", xi, xl, yi, yl, override);
    }

    fillRegion(attr, ch, xi, xl, yi, yl, override) {
        const lines = this.lines;
        let cell;
        let xx;

        if (xi < 0) {
            xi = 0;
        }
        if (yi < 0) {
            yi = 0;
        }

        for (; yi < yl; yi++) {
            if (!lines[yi]) {
                break;
            }
            for (xx = xi; xx < xl; xx++) {
                cell = lines[yi][xx];
                if (!cell) {
                    break;
                }
                if (override || attr !== cell[0] || ch !== cell[1]) {
                    lines[yi][xx][0] = attr;
                    lines[yi][xx][1] = ch;
                    lines[yi].dirty = true;
                }
            }
        }
    }

    key() {
        return this.terminal.key.apply(this, arguments);
    }

    onceKey() {
        return this.terminal.onceKey.apply(this, arguments);
    }

    unkey() {
        return this.terminal.unkey.apply(this, arguments);
    }

    spawn(file, args, options) {
        if (!Array.isArray(args)) {
            options = args;
            args = [];
        }

        const screen = this;
        const terminal = screen.terminal;
        const spawn = adone.std.child_process.spawn;
        const mouse = terminal.mouseEnabled;
        let ps;

        options = options || {};

        options.stdio = options.stdio || "inherit";

        terminal.lsaveCursor("spawn");
        // terminal.setScrollRegion(0, terminal.rows - 1);
        terminal.alternateScreenBuffer(false);
        terminal.showCursor();
        if (mouse) {
            terminal.disableMouse();
        }

        const write = terminal.output.write;
        terminal.output.write = function () { };
        terminal.input.pause();
        if (terminal.input.setRawMode) {
            terminal.input.setRawMode(false);
        }

        var resume = function () {
            if (resume.done) {
                return;
            }
            resume.done = true;

            if (terminal.input.setRawMode) {
                terminal.input.setRawMode(true);
            }
            terminal.input.resume();
            terminal.output.write = write;

            terminal.alternateScreenBuffer(true);
            // terminal.setScrollRegion(0, terminal.rows - 1);
            if (mouse) {
                terminal.enableMouse();
                if (screen.options.sendFocus) {
                    screen.terminal.setMouse({ sendFocus: true }, true);
                }
            }

            screen.alloc();
            screen.render();

            screen.terminal.lrestoreCursor("spawn", true);
        };

        ps = spawn(file, args, options);

        ps.on("error", resume);

        ps.on("exit", resume);

        return ps;
    }

    exec(file, args, options, callback) {
        const ps = this.spawn(file, args, options);

        ps.on("error", (err) => {
            if (!callback) {
                return;
            }
            return callback(err, false);
        });

        ps.on("exit", (code) => {
            if (!callback) {
                return;
            }
            return callback(null, code === 0);
        });

        return ps;
    }

    readEditor(options, callback) {
        if (typeof options === "string") {
            options = { editor: options };
        }

        if (!callback) {
            callback = options;
            options = null;
        }

        if (!callback) {
            callback = function () { };
        }

        options = options || {};

        const self = this;
        const editor = options.editor || process.env.EDITOR || "vi";
        const name = options.name || process.title || "blessed";
        const rnd = Math.random().toString(36).split(".").pop();
        const file = `/tmp/${name}.${rnd}`;
        const args = [file];
        let opt;

        opt = {
            stdio: "inherit",
            env: process.env,
            cwd: process.env.HOME
        };

        function writeFile(callback) {
            if (!options.value) {
                return callback();
            }
            return adone.std.fs.writeFile(file, options.value, callback);
        }

        return writeFile((err) => {
            if (err) {
                return callback(err);
            }
            return self.exec(editor, args, opt, (err, success) => {
                if (err) {
                    return callback(err);
                }
                return adone.std.fs.readFile(file, "utf8", (err, data) => {
                    return adone.std.fs.unlink(file, () => {
                        if (!success) {
                            return callback(new Error("Unsuccessful."));
                        }
                        if (err) {
                            return callback(err);
                        }
                        return callback(null, data);
                    });
                });
            });
        });
    }

    displayImage(file, callback) {
        if (!file) {
            if (!callback) {
                return;
            }
            return callback(new Error("No image."));
        }

        file = adone.std.path.resolve(process.cwd(), file);

        if (!~file.indexOf("://")) {
            file = `file://${file}`;
        }

        const args = ["w3m", "-T", "text/html"];

        const input = `<title>press q to exit</title><img align="center" src="${file}">`;

        const opt = {
            stdio: ["pipe", 1, 2],
            env: process.env,
            cwd: process.env.HOME
        };

        const ps = this.spawn(args[0], args.slice(1), opt);

        ps.on("error", (err) => {
            if (!callback) {
                return;
            }
            return callback(err);
        });

        ps.on("exit", (code) => {
            if (!callback) {
                return;
            }
            if (code !== 0) {
                return callback(new Error(`Exit Code: ${code}`));
            }
            return callback(null, code === 0);
        });

        ps.stdin.write(`${input}\n`);
        ps.stdin.end();
    }

    setEffects(el, fel, over, out, effects, temp) {
        if (!effects) {
            return;
        }

        const tmp = {};
        if (temp) {
            el[temp] = tmp;
        }

        if (typeof el !== "function") {
            const _el = el;
            el = () => _el;
        }

        fel.on(over, () => {
            const element = el();
            Object.keys(effects).forEach((key) => {
                const val = effects[key];
                if (val !== null && typeof val === "object") {
                    tmp[key] = tmp[key] || {};
                    // element.style[key] = element.style[key] || {};
                    Object.keys(val).forEach((k) => {
                        const v = val[k];
                        tmp[key][k] = element.style[key][k];
                        element.style[key][k] = v;
                    });
                    return;
                }
                tmp[key] = element.style[key];
                element.style[key] = val;
            });
            element.screen.render();
        });

        fel.on(out, () => {
            const element = el();
            Object.keys(effects).forEach((key) => {
                const val = effects[key];
                if (val !== null && typeof val === "object") {
                    tmp[key] = tmp[key] || {};
                    // element.style[key] = element.style[key] || {};
                    Object.keys(val).forEach((k) => {
                        if (tmp[key].hasOwnProperty(k)) {
                            element.style[key][k] = tmp[key][k];
                        }
                    });
                    return;
                }
                if (tmp.hasOwnProperty(key)) {
                    element.style[key] = tmp[key];
                }
            });
            element.screen.render();
        });
    }

    sigtstp(callback) {
        this.terminal.sigtstp(() => {
            this.alloc();
            this.render();
            this.terminal.lrestoreCursor("pause", true);
            if (callback) {
                callback();
            }
        });
    }

    copyToClipboard(text) {
        return this.terminal.copyToClipboard(text);
    }

    cursorShape(shape, blink) {
        const self = this;

        this.cursor.shape = shape || "block";
        this.cursor.blink = blink || false;
        this.cursor._set = true;

        if (this.cursor.artificial) {
            if (!this.terminal.hideCursor_old) {
                const hideCursor = this.terminal.hideCursor;
                this.terminal.hideCursor_old = this.terminal.hideCursor;
                this.terminal.hideCursor = function () {
                    hideCursor.call(self.terminal);
                    self.cursor._hidden = true;
                    if (self.renders) {
                        self.render();
                    }
                };
            }
            if (!this.terminal.showCursor_old) {
                const showCursor = this.terminal.showCursor;
                this.terminal.showCursor_old = this.terminal.showCursor;
                this.terminal.showCursor = function () {
                    self.cursor._hidden = false;
                    if (self.terminal._exiting) {
                        showCursor.call(self.terminal);
                    }
                    if (self.renders) {
                        self.render();
                    }
                };
            }
            if (!this._cursorBlink) {
                this._cursorBlink = setInterval(() => {
                    if (!self.cursor.blink) {
                        return;
                    }
                    self.cursor._state ^= 1;
                    if (self.renders) {
                        self.render();
                    }
                }, 500);
                if (this._cursorBlink.unref) {
                    this._cursorBlink.unref();
                }
            }
            return true;
        }

        return this.terminal.cursorShape(this.cursor.shape, this.cursor.blink);
    }

    cursorColor(color) {
        this.cursor.color = color != null ? colors.convert(color) : null;
        this.cursor._set = true;

        if (this.cursor.artificial) {
            return true;
        }

        return this.terminal.cursorColor(colors.ncolors[this.cursor.color]);
    }

    cursorReset() {
        this.cursor.shape = "block";
        this.cursor.blink = false;
        this.cursor.color = null;
        this.cursor._set = false;

        if (this.cursor.artificial) {
            this.cursor.artificial = false;
            if (this.terminal.hideCursor_old) {
                this.terminal.hideCursor = this.terminal.hideCursor_old;
                delete this.terminal.hideCursor_old;
            }
            if (this.terminal.showCursor_old) {
                this.terminal.showCursor = this.terminal.showCursor_old;
                delete this.terminal.showCursor_old;
            }
            if (this._cursorBlink) {
                clearInterval(this._cursorBlink);
                delete this._cursorBlink;
            }
            return true;
        }

        return this.terminal.cursorReset();
    }

    _cursorAttr(cursor, dattr) {
        let attr = dattr || this.dattr;
        let cattr;
        let ch;

        if (cursor.shape === "line") {
            attr &= ~(0x1ff << 9);
            attr |= 7 << 9;
            ch = "\u2502";
        } else if (cursor.shape === "underline") {
            attr &= ~(0x1ff << 9);
            attr |= 7 << 9;
            attr |= 2 << 18;
        } else if (cursor.shape === "block") {
            attr &= ~(0x1ff << 9);
            attr |= 7 << 9;
            attr |= 8 << 18;
        } else if (typeof cursor.shape === "object" && cursor.shape) {
            cattr = adone.terminal.widget.Element.prototype.sattr.call(cursor, cursor.shape);

            if (cursor.shape.bold || cursor.shape.underline
                || cursor.shape.blink || cursor.shape.inverse
                || cursor.shape.invisible) {
                attr &= ~(0x1ff << 18);
                attr |= ((cattr >> 18) & 0x1ff) << 18;
            }

            if (cursor.shape.fg) {
                attr &= ~(0x1ff << 9);
                attr |= ((cattr >> 9) & 0x1ff) << 9;
            }

            if (cursor.shape.bg) {
                attr &= ~(0x1ff << 0);
                attr |= cattr & 0x1ff;
            }

            if (cursor.shape.ch) {
                ch = cursor.shape.ch;
            }
        }

        if (cursor.color != null) {
            attr &= ~(0x1ff << 9);
            attr |= cursor.color << 9;
        }

        return { ch, attr };
    }

    screenshot(xi, xl, yi, yl, term) {
        if (xi == null) {
            xi = 0;
        }
        if (xl == null) {
            xl = this.cols;
        }
        if (yi == null) {
            yi = 0;
        }
        if (yl == null) {
            yl = this.rows;
        }

        if (xi < 0) {
            xi = 0;
        }
        if (yi < 0) {
            yi = 0;
        }

        let x;
        let y;
        let line;
        let out;
        let ch;
        let data;
        let attr;

        const sdattr = this.dattr;

        if (term) {
            this.dattr = term.defAttr;
        }

        let main = "";

        for (y = yi; y < yl; y++) {
            line = term ? term.lines[y] : this.lines[y];

            if (!line) {
                break;
            }

            out = "";
            attr = this.dattr;

            for (x = xi; x < xl; x++) {
                if (!line[x]) {
                    break;
                }

                data = line[x][0];
                ch = line[x][1];

                if (data !== attr) {
                    if (attr !== this.dattr) {
                        out += "\x1b[m";
                    }
                    if (data !== this.dattr) {
                        let _data = data;
                        if (term) {
                            if (((_data >> 9) & 0x1ff) === 257) {
                                _data |= 0x1ff << 9;
                            }
                            if ((_data & 0x1ff) === 256) {
                                _data |= 0x1ff;
                            }
                        }
                        out += this.codeAttr(_data);
                    }
                }

                if (this.fullUnicode) {
                    if (unicode.charWidth(line[x][1]) === 2) {
                        if (x === xl - 1) {
                            ch = " ";
                        } else {
                            x++;
                        }
                    }
                }

                out += ch;
                attr = data;
            }

            if (attr !== this.dattr) {
                out += "\x1b[m";
            }

            if (out) {
                main += (y > 0 ? "\n" : "") + out;
            }
        }

        main = `${main.replace(/(?:\s*\x1b\[40m\s*\x1b\[m\s*)*$/, "")}\n`;

        if (term) {
            this.dattr = sdattr;
        }

        return main;
    }

    /**
     * Positioning
     */
    _getPos() {
        return this;
    }

    static bind(screen) {
        if (!Screen.global) {
            Screen.global = screen;
        }

        if (!~Screen.instances.indexOf(screen)) {
            Screen.instances.push(screen);
            screen.index = Screen.total;
            Screen.total++;
        }

        if (Screen._bound) {
            return;
        }
        Screen._bound = true;

        process.on("uncaughtException", Screen._exceptionHandler = function (err) {
            if (process.listeners("uncaughtException").length > 1) {
                return;
            }
            Screen.instances.slice().forEach((screen) => {
                screen.destroy();
            });
            err = err || new Error("Uncaught Exception.");
            console.error(err.stack ? `${err.stack}` : `${err}`);
            process.nextTick(() => {
                process.exit(1);
            });
        });

        ["SIGTERM", "SIGINT", "SIGQUIT"].forEach((signal) => {
            const name = `_${signal.toLowerCase()}Handler`;
            process.on(signal, Screen[name] = function () {
                if (process.listeners(signal).length > 1) {
                    return;
                }
                process.nextTick(() => {
                    process.exit(0);
                });
            });
        });

        process.on("exit", Screen._exitHandler = function () {
            Screen.instances.slice().forEach((screen) => {
                screen.destroy();
            });
        });
    }
}
Screen.global = null;
Screen.total = 0;
Screen.instances = [];
Screen.prototype.type = "screen";
