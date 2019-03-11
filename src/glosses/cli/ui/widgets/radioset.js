

export default class RadioSet extends adone.cli.ui.widget.Element {
    constructor(options = { }) {
        // Possibly inherit parent's style.
        // options.style = this.parent.style;
        super(options);
    }
}
RadioSet.prototype.type = "radio-set";
