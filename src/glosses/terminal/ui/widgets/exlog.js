

export default class ExLog extends adone.terminal.ui.widget.List {
    constructor(options = { }) {
        options.bufferLength = options.bufferLength || 30;
        super(options);

        this.logLines = [];
        this.interactive = false;
    }

    log(str) {
        this.logLines.push(str);
        if (this.logLines.length > this.options.bufferLength) {
            this.logLines.shift();
        }
        this.setItems(this.logLines);
        this.setScroll(this.logLines.length);
    }
}
ExLog.prototype.type = "exlog";
