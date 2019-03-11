

export default class Text extends adone.cli.ui.widget.Element {
    constructor(options = { }) {
        options.shrink = true;
        super(options);
    }
}
Text.prototype.type = "text";
