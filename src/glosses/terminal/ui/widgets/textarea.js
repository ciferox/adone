
const unicode = require("../unicode");

export default class TextArea extends adone.terminal.widget.Input {
    constructor(options = {}) {
        options.scrollable = options.scrollable !== false;
        super(options);

        this.screen._listenKeys(this);

        this.value = options.value || "";

        this.__updateCursor = this._updateCursor.bind(this);
        this.on("resize", this.__updateCursor);
        this.on("move", this.__updateCursor);

        if (options.inputOnFocus) {
            this.on("focus", this.readInput.bind(this, null));
        }

        if (!options.inputOnFocus && options.keys) {
            this.on("keypress", (ch, key) => {
                if (this._reading) {
                    return;
                }
                if (key.name === "enter" || (options.vi && key.name === "i")) {
                    return this.readInput();
                }
                if (key.name === "e") {
                    return this.readEditor();
                }
            });
        }

        if (options.mouse) {
            this.on("click", (data) => {
                if (this._reading) {
                    return;
                }
                if (data.button !== "right") {
                    return;
                }
                this.readEditor();
            });
        }
    }

    _updateCursor(get) {
        if (this.screen.focused !== this) {
            return;
        }

        const lpos = get ? this.lpos : this._getCoords();
        if (!lpos) {
            return;
        }

        let last = this._clines[this._clines.length - 1];
        const terminal = this.screen.terminal;
        let line;

        // Stop a situation where the textarea begins scrolling
        // and the last cline appears to always be empty from the
        // _typeScroll `+ '\n'` thing.
        // Maybe not necessary anymore?
        if (last === "" && this.value[this.value.length - 1] !== "\n") {
            last = this._clines[this._clines.length - 2] || "";
        }

        line = Math.min(
            this._clines.length - 1 - (this.childBase || 0),
            (lpos.yl - lpos.yi) - this.iheight - 1);

        // When calling clearValue() on a full textarea with a border, the first
        // argument in the above Math.min call ends up being -2. Make sure we stay
        // positive.
        line = Math.max(0, line);

        const cy = lpos.yi + this.itop + line;
        const cx = lpos.xi + this.ileft + this.strWidth(last);

        // XXX Not sure, but this may still sometimes
        // cause problems when leaving editor.
        if (cy === terminal.y && cx === terminal.x) {
            return;
        }

        if (cy === terminal.y) {
            if (cx > terminal.x) {
                terminal.right(cx - terminal.x);
            } else if (cx < terminal.x) {
                terminal.left(terminal.x - cx);
            }
        } else if (cx === terminal.x) {
            if (cy > terminal.y) {
                terminal.down(cy - terminal.y);
            } else if (cy < terminal.y) {
                terminal.up(terminal.y - cy);
            }
        } else {
            terminal.moveTo(cy, cx);
        }
    }

    readInput(callback) {
        const self = this;
        const focused = this.screen.focused === this;

        if (this._reading) {
            return;
        }
        this._reading = true;

        this._callback = callback;

        if (!focused) {
            this.screen.saveFocus();
            this.focus();
        }

        this.screen.grabKeys = true;

        this._updateCursor();
        this.screen.terminal.showCursor();

        this._done = function fn(err) {
            if (!self._reading) {
                return;
            }

            if (fn.done) {
                return;
            }
            fn.done = true;

            self._reading = false;

            delete self._callback;
            delete self._done;

            self.removeListener("keypress", self.__listener);
            delete self.__listener;

            self.removeListener("blur", self.__done);
            delete self.__done;

            self.screen.terminal.hideCursor();
            self.screen.grabKeys = false;

            if (!focused) {
                self.screen.restoreFocus();
            }

            if (self.options.inputOnFocus) {
                self.screen.rewindFocus();
            }

            // Ugly
            if (err === "stop") {
                return;
            }

            const value = self.value;

            if (err) {
                self.emit("error", err);
            } else if (value != null) {
                self.emit("submit", value);
            } else {
                self.emit("cancel", value);
            }
            self.emit("action", value);

            if (!callback) {
                return;
            }

            return err
                ? callback(err)
                : callback(null, value);
        };

        // Put this in a nextTick so the current key event doesn't trigger any keys input.
        process.nextTick(() => {
            self.__listener = self._listener.bind(self);
            self.on("keypress", self.__listener);
        });

        // this.__done = this._done.bind(this);
        this.on("blur", this.__done);
    }

    _listener(ch, key) {
        const done = this._done;
        const value = this.value;

        if (key.name === "return") {
            return;
        }
        if (key.name === "enter") {
            ch = "\n";
        }

        // TODO: Handle directional keys.
        if (key.name === "left" || key.name === "right"
            || key.name === "up" || key.name === "down") {

        }

        if (this.options.keys && key.ctrl && key.name === "e") {
            return this.readEditor();
        }

        // TODO: Optimize typing by writing directly
        // to the screen and screen buffer here.
        if (key.name === "escape") {
            done(null, null);
        } else if (key.name === "backspace") {
            if (this.value.length) {
                if (this.screen.fullUnicode) {
                    if (unicode.isSurrogate(this.value, this.value.length - 2)) {
                        // || unicode.isCombining(this.value, this.value.length - 1)) {
                        this.value = this.value.slice(0, -2);
                    } else {
                        this.value = this.value.slice(0, -1);
                    }
                } else {
                    this.value = this.value.slice(0, -1);
                }
            }
        } else if (ch) {
            if (!/^[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f]$/.test(ch)) {
                this.value += ch;
            }
        }

        if (this.value !== value) {
            this.screen.render();
        }
    }

    _typeScroll() {
        // XXX Workaround
        const height = this.height - this.iheight;
        if (this._clines.length - this.childBase > height) {
            this.scroll(this._clines.length);
        }
    }

    getValue() {
        return this.value;
    }

    setValue(value) {
        if (value == null) {
            value = this.value;
        }
        if (this._value !== value) {
            this.value = value;
            this._value = value;
            this.setContent(this.value);
            this._typeScroll();
            this._updateCursor();
        }
    }

    clearInput() {
        return this.setValue("");
    }

    submit() {
        if (!this.__listener) {
            return;
        }
        return this.__listener("\x1b", { name: "escape" });
    }

    cancel() {
        if (!this.__listener) {
            return;
        }
        return this.__listener("\x1b", { name: "escape" });
    }

    render() {
        this.setValue();
        return super.render();
    }

    readEditor(callback) {
        const self = this;

        if (this._reading) {
            const _cb = this._callback;
            const cb = callback;

            this._done("stop");

            callback = function (err, value) {
                if (_cb) {
                    _cb(err, value);
                }
                if (cb) {
                    cb(err, value);
                }
            };
        }

        if (!callback) {
            callback = function () { };
        }

        return this.screen.readEditor({ value: this.value }, (err, value) => {
            if (err) {
                if (err.message === "Unsuccessful.") {
                    self.screen.render();
                    return self.readInput(callback);
                }
                self.screen.render();
                self.readInput(callback);
                return callback(err);
            }
            self.setValue(value);
            self.screen.render();
            return self.readInput(callback);
        });
    }
}
TextArea.prototype.type = "textarea";
