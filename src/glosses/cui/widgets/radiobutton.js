

export default class RadioButton extends adone.cui.widget.CheckBox {
    constructor(options = { }) {
        super(options);

        this.on("check", () => {
            let el = this;
            while (el = el.parent) {
                if (el.type === "radio-set" || el.type === "form") break;
            }
            el = el || this.parent;
            el.forDescendants((el) => {
                if (el.type !== "radio-button" || el === this) {
                    return;
                }
                el.uncheck();
            });
        });
    }

    render() {
        this.clearPos(true);
        this.setContent("(" + (this.checked ? "*" : " ") + ") " + this.text, true);
        return super.render();
    }
}
RadioButton.prototype.type = "radio-button";
RadioButton.prototype.toggle = RadioButton.prototype.check;