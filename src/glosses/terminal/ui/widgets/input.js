import adone from "adone";

export default class Input extends adone.terminal.widget.Element {
    constructor(options = { }) {
        super(options);
    }
}
Input.prototype.type = "input";