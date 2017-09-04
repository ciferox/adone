

export default class Text extends adone.terminal.ui.widget.Element {
    constructor(options = { }) {
        options.shrink = true;
        super(options);
    }
}
Text.prototype.type = "text";
