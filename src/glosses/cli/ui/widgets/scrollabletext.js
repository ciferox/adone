

export default class ScrollableText extends adone.cli.ui.widget.Element {
    constructor(options = { }) {
        options.scrollable = true;
        options.alwaysScroll = true;
        super(options);
    }
}
ScrollableText.prototype.type = "scrollable-text";
