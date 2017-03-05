import adone from "adone";

export default class Text extends adone.terminal.widget.Element {
    constructor(options = { }) {
        options.shrink = true;
        super(options);
    }
}
Text.prototype.type = "text";
