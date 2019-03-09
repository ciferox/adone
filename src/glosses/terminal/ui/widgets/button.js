

export default class Button extends adone.terminal.ui.widget.Input {
    constructor(options = { }) {
        if (is.nil(options.autoFocus)) {
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
        const result = this.emit("press");
        delete this.value;
        return result;
    }
}
Button.prototype.type = "button";
