

export default class RadioSet extends adone.terminal.widget.Element {
    constructor(options = { }) {
        // Possibly inherit parent's style.
        // options.style = this.parent.style;
        super(options);
    }
}
RadioSet.prototype.type = "radio-set";