

export default class Text extends adone.cui.widget.Element {
    constructor(options = { }) {
        options.shrink = true;
        super(options);
    }
}
Text.prototype.type = "text";
