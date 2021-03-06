export default class Bar extends adone.cli.ui.widget.Canvas {
    constructor(options) {
        super(options, adone.cli.ui.canvas.Canvas2);

        this.options.barWidth = this.options.barWidth || 6;
        this.options.barSpacing = this.options.barSpacing || 9;

        if ((this.options.barSpacing - this.options.barWidth) < 3) {
            this.options.barSpacing = this.options.barWidth + 3;
        }

        this.options.xOffset = is.nil(this.options.xOffset) ? 5 : this.options.xOffset;
        if (this.options.showText === false) {
            this.options.showText = false;
        } else {
            this.options.showText = true;
        }

        this.on("attach", () => {
            if (this.options.data) {
                this.setData(this.options.data);
            }
        });
    }

    calcSize() {
        this.canvasSize = { width: this.width - 2, height: this.height };
    }

    setData(bar) {
        if (!this.ctx) {
            throw new Error("Canvas context does not exist. setData() for bar charts must be called after the chart has been added to the screen via screen.append()");
        }

        this.clear();

        const c = this.ctx;
        let max = Math.max.apply(Math, bar.data);
        max = Math.max(max, this.options.maxHeight);
        let x = this.options.xOffset;
        const barY = this.canvasSize.height - 5;

        for (let i = 0; i < bar.data.length; i++) {
            const h = Math.round(barY * (bar.data[i] / max));

            if (bar.data[i] > 0) {
                c.strokeStyle = "blue";
                if (this.options.barBgColor) {
                    c.strokeStyle = this.options.barBgColor;
                }
                c.fillRect(x, barY - h + 1, this.options.barWidth, h);
            } else {
                c.strokeStyle = "normal";
            }

            c.fillStyle = "white";
            if (this.options.barFgColor) {
                c.fillStyle = this.options.barFgColor;
            }
            if (this.options.showText) {
                c.fillText(bar.data[i].toString(), x + 1, this.canvasSize.height - 4);
            }
            c.strokeStyle = "normal";
            c.fillStyle = "white";
            if (this.options.labelColor) {
                c.fillStyle = this.options.labelColor;
            }
            if (this.options.showText) {
                c.fillText(bar.titles[i], x + 1, this.canvasSize.height - 3);
            }

            x += this.options.barSpacing;
        }
    }

    getOptionsPrototype() {
        return {
            barWidth: 1,
            barSpacing: 1,
            xOffset: 1,
            maxHeight: 1,
            data: {
                titles: ["s"],
                data: [1]
            }
        };
    }
}
Bar.prototype.type = "bar";
