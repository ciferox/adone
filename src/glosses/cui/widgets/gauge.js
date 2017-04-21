

export default class Gauge extends adone.cui.widget.Canvas {
    constructor(options = {}) {
        super(options, require("ansi-term"));
        this.options = options;
        this.options.stroke = options.stroke || "magenta";
        this.options.fill = options.fill || "white";
        this.options.data = options.data || [];
        this.options.showLabel = options.showLabel !== false;


        this.on("attach", () => {
            if (this.options.stack) {
                var stack = this.stack = this.options.stack;
                this.setStack(stack);
            } else {
                var percent = this.percent = this.options.percent || 0;
                this.setData(percent);
            }
        });
    }

    calcSize() {
        this.canvasSize = { width: this.width - 2, height: this.height };
    }

    setData(data) {
        if (typeof (data) == typeof ([]) && data.length > 0) {
            this.setStack(data);
        } else if (typeof (data) == typeof (1)) {
            this.setPercent(data);
        } else if (typeof (data) == null) {
        }
    }

    setPercent(percent) {
        if (!this.ctx) {
            throw "error: canvas context does not exist. setData() for gauges must be called after the gauge has been added to the screen via screen.append()";
        }

        var c = this.ctx;

        c.strokeStyle = this.options.stroke;//'magenta'
        c.fillStyle = this.options.fill;//'white'

        c.clearRect(0, 0, this.canvasSize.width, this.canvasSize.height);
        if (percent < 1.001) {
            percent = percent * 100;
        }
        var width = percent / 100 * (this.canvasSize.width - 3);
        c.fillRect(1, 2, width, 2);

        var textX = 7;
        if (width < textX) {
            c.strokeStyle = "normal";
        }

        if (this.options.showLabel) c.fillText(percent + "%", textX, 3);
    }

    setStack(stack) {
        var colors = ["green", "magenta", "cyan", "red", "blue"];

        if (!this.ctx) {
            throw "error: canvas context does not exist. setData() for gauges must be called after the gauge has been added to the screen via screen.append()";
        }

        var c = this.ctx;
        var leftStart = 1;
        var textLeft = 5;
        c.clearRect(0, 0, this.canvasSize.width, this.canvasSize.height);

        for (var i = 0; i < stack.length; i++) {
            var currentStack = stack[i];
            let percent;
            if (typeof (currentStack) == typeof ({}))
                percent = currentStack.percent;
            else
                percent = currentStack;

            c.strokeStyle = currentStack.stroke || colors[(i % colors.length)]; // use specified or choose from the array of colors
            c.fillStyle = this.options.fill;//'white'

            textLeft = 5;
            if (percent < 1.001) {
                percent = percent * 100;
            }
            var width = percent / 100 * (this.canvasSize.width - 3);

            c.fillRect(leftStart, 2, width, 2);

            textLeft = (width / 2) - 1;
            // if (textLeft)
            var textX = leftStart + textLeft;

            if ((leftStart + width) < textX) {
                c.strokeStyle = "normal";
            }
            if (this.options.showLabel) c.fillText(percent + "%", textX, 3);

            leftStart += width;
        }
    }

    getOptionsPrototype() {
        return { percent: 10 };
    }
}
Gauge.prototype.type = "gauge";