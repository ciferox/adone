import adone from "adone";

export default class ScrollableText extends adone.terminal.widget.Element {
    constructor(options = { }) {
        options.scrollable = true;
        options.alwaysScroll = true;
        super(options);
    }
}
ScrollableText.prototype.type = "scrollable-text";