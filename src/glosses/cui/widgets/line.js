

export default class Line extends adone.cui.widget.Element {
    constructor(options = { }) {
        const orientation = options.orientation || "vertical";
        delete options.orientation;
        if (orientation === "vertical") {
            options.width = 1;
        } else {
            options.height = 1;
        }
        super(options);

        this.ch = !options.type || options.type === "line" ? orientation === "horizontal" ? "─" : "│" : options.ch || " ";

        this.border = {
            type: "bg",
            __proto__: this
        };

        this.style.border = this.style;
    }
}
Line.prototype.type = "line";
