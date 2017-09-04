

export default class CheckBox extends adone.terminal.ui.widget.Input {
    constructor(options = { }) {
        super(options);

        this.text = options.content || options.text || "";
        this.checked = this.value = options.checked || false;

        this.on("keypress", (ch, key) => {
            if (key.name === "enter" || key.name === "space") {
                this.toggle();
                this.screen.render();
            }
        });

        if (options.mouse) {
            this.on("click", () => {
                this.toggle();
                this.screen.render();
            });
        }

        this.on("focus", () => {
            const lpos = this.lpos;
            if (!lpos) {
                return; 
            }
            this.screen.terminal.lsaveCursor("checkbox");
            this.screen.terminal.moveTo(lpos.yi, lpos.xi + 1);
            this.screen.terminal.showCursor();
        });

        this.on("blur", () => {
            this.screen.terminal.lrestoreCursor("checkbox", true);
        });
    }

    render() {
        this.clearPos(true);
        this.setContent(`[${this.checked ? "x" : " "}] ${this.text}`, true);
        return super.render();
    }

    check() {
        if (this.checked) {
            return; 
        }
        this.checked = this.value = true;
        this.emit("check");
    }

    uncheck() {
        if (!this.checked) {
            return; 
        }
        this.checked = this.value = false;
        this.emit("uncheck");
    }

    toggle() {
        return this.checked ? this.uncheck() : this.check();
    }
}
CheckBox.prototype.type = "checkbox";
