import adone from "adone";

export default class Message extends adone.terminal.widget.Element {
    constructor(options = { }) {
        options.tags = true;
        super(options);
    }

    display(text, time = Infinity) {
        return new Promise((resolve) => {
            if (this.scrollable) {
                this.screen.saveFocus();
                this.focus();
                this.setScroll(0);
            }

            this.show();
            this.setContent(text);
            this.screen.render();

            if (time === Infinity || time === -1 || time === 0) {
                const end = () => {
                    if (end.done) return;
                    end.done = true;
                    if (this.scrollable) {
                        try {
                            this.screen.restoreFocus();
                        } catch (e) { }
                    }
                    this.hide();
                    this.detach();
                    this.screen.render();
                    resolve();
                };

                setTimeout(() => {
                    let fn;
                    this.onScreenEvent("keypress", fn = (ch, key) => {
                        if (key.name === "mouse") return;
                        if (this.scrollable) {
                            if ((key.name === "up" || (this.options.vi && key.name === "k"))
                                || (key.name === "down" || (this.options.vi && key.name === "j"))
                                || (this.options.vi && key.name === "u" && key.ctrl)
                                || (this.options.vi && key.name === "d" && key.ctrl)
                                || (this.options.vi && key.name === "b" && key.ctrl)
                                || (this.options.vi && key.name === "f" && key.ctrl)
                                || (this.options.vi && key.name === "g" && !key.shift)
                                || (this.options.vi && key.name === "g" && key.shift)) {
                                return;
                            }
                        }
                        if (this.options.ignoreKeys && ~this.options.ignoreKeys.indexOf(key.name)) {
                            return;
                        }
                        this.removeScreenEvent("keypress", fn);
                        end();
                    });
                    // XXX May be affected by new element.options.mouse option.
                    if (!this.options.mouse) return;
                    let mouseFn;
                    this.onScreenEvent("mouse", mouseFn = (data) => {
                        if (data.action === "mousemove") return;
                        this.removeScreenEvent("mouse", mouseFn);
                        end();
                    });
                }, 10);

                return;
            }

            setTimeout(() => {
                this.hide();
                this.detach();
                this.screen.render();
                resolve();
            }, time * 1000);
        });
    }

    error(text, time, callback) {
        return this.display("{red-fg}Error: " + text + "{/red-fg}", time, callback);
    }
}
Message.prototype.type = "message";