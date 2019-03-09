

export default class Log extends adone.terminal.ui.widget.ScrollableText {
    constructor(options = { }) {
        super(options);

        this.scrollback = !is.nil(options.scrollback) ? options.scrollback : Infinity;
        this.scrollOnInput = options.scrollOnInput;

        this.on("set content", () => {
            if (!this._userScrolled || this.scrollOnInput) {
                process.nextTick(() => {
                    this.setScrollPerc(100);
                    this._userScrolled = false;
                    this.screen.render();
                });
            }
        });
    }

    log() {
        const args = Array.prototype.slice.call(arguments);
        if (typeof args[0] === "object") {
            args[0] = adone.std.util.inspect(args[0], true, 20, true);
        }
        const text = adone.std.util.format.apply(adone.std.util, args);
        this.emit("log", text);
        const ret = this.pushLine(text);
        if (this._clines.fake.length > this.scrollback) {
            this.shiftLine((this.scrollback / 3) | 0);
        }
        return ret;
    }

    scroll(offset, always) {
        if (offset === 0) {
            return super.scroll(offset, always);
        }
        this._userScrolled = true;
        const ret = super.scroll(offset, always);
        if (this.getScrollPerc() === 100) {
            this._userScrolled = false;
        }
        return ret;
    }
}
Log.prototype.type = "log";
