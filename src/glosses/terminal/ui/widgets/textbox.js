

export default class Textbox extends adone.terminal.widget.TextArea {
    constructor(options = { }) {
        options.scrollable = false;
        super(options);

        this.secret = options.secret;
        this.censor = options.censor;
    }

    setValue(value) {
        let visible;
        let val;
        if (value == null) {
            value = this.value;
        }
        if (this._value !== value) {
            value = value.replace(/\n/g, "");
            this.value = value;
            this._value = value;
            if (this.secret) {
                this.setContent("");
            } else if (this.censor) {
                this.setContent(Array(this.value.length + 1).join("*"));
            } else {
                visible = -(this.width - this.iwidth - 1);
                val = this.value.replace(/\t/g, this.screen.tabc);
                this.setContent(val.slice(visible));
            }
            this._updateCursor();
        }
    }

    submit() {
        if (!this.__listener) return;
        return this.__listener("\r", { name: "enter" });
    }
}
Textbox.prototype.type = "textbox";

Textbox.prototype.__olistener = Textbox.prototype._listener;
Textbox.prototype._listener = function(ch, key) {
    if (key.name === "enter") {
        this._done(null, this.value);
        return;
    }
    return this.__olistener(ch, key);
};