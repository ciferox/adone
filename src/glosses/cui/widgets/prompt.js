

export default class Prompt extends adone.cui.widget.Element {
    constructor(options = { }) {
        options.hidden = true;
        super(options);

        this._.input = new adone.cui.widget.TextBox({
            parent: this,
            top: 3,
            height: 1,
            left: 2,
            right: 2,
            bg: "black"
        });

        this._.okay = new adone.cui.widget.Button({
            parent: this,
            top: 5,
            height: 1,
            left: 2,
            width: 6,
            content: "Okay",
            align: "center",
            bg: "black",
            hoverBg: "blue",
            autoFocus: false,
            mouse: true
        });

        this._.cancel = new adone.cui.widget.Button({
            parent: this,
            top: 5,
            height: 1,
            shrink: true,
            left: 10,
            width: 8,
            content: "Cancel",
            align: "center",
            bg: "black",
            hoverBg: "blue",
            autoFocus: false,
            mouse: true
        });
    }

    readInput(text, value, callback) {
        let okay;
        let cancel;

        if (!callback) {
            callback = value;
            value = "";
        }

        // Keep above:
        // var parent = this.parent;
        // this.detach();
        // parent.append(this);

        this.show();
        this.setContent(" " + text);

        this._.input.value = value;

        this.screen.saveFocus();

        this._.okay.on("press", okay = () => {
            this._.input.submit();
        });

        this._.cancel.on("press", cancel = () => {
            this._.input.cancel();
        });

        this._.input.readInput((err, data) => {
            this.hide();
            this.screen.restoreFocus();
            this._.okay.removeListener("press", okay);
            this._.cancel.removeListener("press", cancel);
            return callback(err, data);
        });

        this.screen.render();
    }
}
Prompt.prototype.type = "prompt";