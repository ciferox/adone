

export default class Button extends adone.terminal.widget.Input {
    constructor(options = { }) {
        if (options.autoFocus == null) {
            options.autoFocus = false;
        }
        super(options);

        this.on("keypress", (ch, key) => {
            if (key.name === "enter" || key.name === "space") {
                return this.press();
            }
        });

        if (this.options.mouse) {
            this.on("click", () => {
                return this.press();
            });
        }
    }

    press() {
        this.focus();
        this.value = true;
        var result = this.emit("press");
        delete this.value;
        return result;
    }
}
Button.prototype.type = "button";