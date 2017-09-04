

export default class GaugeList extends adone.terminal.ui.widget.Canvas {
    constructor(options) {
        super(options, adone.terminal.ui.canvas.Canvas2);
        options = options || {};
        this.options = options;
        this.options.stroke = options.stroke || "magenta";
        this.options.fill = options.fill || "white";
        this.options.data = options.data || [];
        this.options.showLabel = options.showLabel !== false;
        this.options.gaugeSpacing = options.gaugeSpacing || 0;
        this.options.gaugeHeight = options.gaugeHeight || 1;


        this.on("attach", () => {
            const gauges = this.gauges = this.options.gauges;
            this.setGauges(gauges);
        });
    }

    calcSize() {
        this.canvasSize = { width: this.width - 2, height: this.height };
    }

    setData() {
    }

    setGauges(gauges) {
        if (!this.ctx) {
            throw "error: canvas context does not exist. setData() for gauges must be called after the gauge has been added to the screen via screen.append()";
        }

        const c = this.ctx;
        c.clearRect(0, 0, this.canvasSize.width, this.canvasSize.height);

        for (let i = 0; i < gauges.length; i++) {
            this.setSingleGauge(gauges[i], i);
        }
    }

    setSingleGauge(gauge, offset) {
        const colors = ["green", "magenta", "cyan", "red", "blue"];
        const stack = gauge.stack;

        const c = this.ctx;
        let leftStart = 3;
        let textLeft = 5;

        c.strokeStyle = "normal";
        c.fillStyle = "white";
        c.fillText(offset.toString(), 0, offset * (this.options.gaugeHeight + this.options.gaugeSpacing));

        for (let i = 0; i < stack.length; i++) {
            const currentStack = stack[i];

            if (typeof (currentStack) === typeof ({})) {
                var percent = currentStack.percent; 
            } else {
                var percent = currentStack;
            }

            c.strokeStyle = currentStack.stroke || colors[(i % colors.length)]; // use specified or choose from the array of colors
            c.fillStyle = this.options.fill;//'white'

            textLeft = 5;

            const width = percent / 100 * (this.canvasSize.width - 5);

            c.fillRect(leftStart, offset * (this.options.gaugeHeight + this.options.gaugeSpacing), width, this.options.gaugeHeight - 1);

            textLeft = (width / 2) - 1;
            // if (textLeft)
            const textX = leftStart + textLeft;

            if ((leftStart + width) < textX) {
                c.strokeStyle = "normal";
            }
            if (gauge.showLabel) {
                c.fillText(`${percent}%`, textX, 3);
            }

            leftStart += width;
        }
    }

    getOptionsPrototype() {
        return { percent: 10 };
    }
}
GaugeList.prototype.type = "gauge";
