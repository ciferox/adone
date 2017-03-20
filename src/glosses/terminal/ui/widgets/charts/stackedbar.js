
const utils = require("../../utils.js");

export default class StackedBar extends adone.terminal.widget.Canvas {
    constructor(options) {
        super(options, require("ansi-term"));

        this.options.barWidth = this.options.barWidth || 6;
        this.options.barSpacing = this.options.barSpacing || 9;

        if ((this.options.barSpacing - this.options.barWidth) < 3) {
            this.options.barSpacing = this.options.barWidth + 3;
        }

        this.options.xOffset = this.options.xOffset == null ? 5 : this.options.xOffset;
        if (this.options.showText === false) {
            this.options.showText = false;
        } else {
            this.options.showText = true;
        }

        this.options.legend = this.options.legend || {};
        if (this.options.showLegend === false) {
            this.options.showLegend = false;
        } else {
            this.options.showLegend = true;
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

    getSummedBars(bars) {
        const res = [];
        bars.forEach((stackedValues) => {
            const sum = stackedValues.reduce((a, b) => {
                return a + b;
            }, 0);
            res.push(sum);
        });
        return res;
    }

    setData(bars) {
        if (!this.ctx) {
            throw "error: canvas context does not exist. setData() for bar charts must be called after the chart has been added to the screen via screen.append()";
        }

        this.clear();

        const summedBars = this.getSummedBars(bars.data);
        let maxBarValue = Math.max.apply(Math, summedBars);
        if (this.options.maxValue) {
            maxBarValue = Math.max(maxBarValue, this.options.maxValue);
        }
        let x = this.options.xOffset;
        for (let i = 0; i < bars.data.length; i++) {
            this.renderBar(x, bars.data[i], summedBars[i], maxBarValue, bars.barCategory[i]);
            x += this.options.barSpacing;
        }

        this.addLegend(bars, x);
    }

    renderBar(x, bar, curBarSummedValue, maxBarValue, category) {
        /*
        var c = this.ctx
        c.strokeStyle = 'red';
        c.fillRect(0,7,4,0)
        c.strokeStyle = 'blue';
        c.fillRect(0,4,4,1)
        c.strokeStyle = 'green';
        c.fillRect(5,7,4,2)
        return
        */
        const c = this.ctx;
        c.strokeStyle = "normal";
        c.fillStyle = "white";
        if (this.options.labelColor) {
            c.fillStyle = this.options.labelColor;
        }
        if (this.options.showText) {
            c.fillText(category, x + 1, this.canvasSize.height - 1);
        }

        if (curBarSummedValue < 0) {
            return;
        }
        //first line is for label
        const BUFFER_FROM_TOP = 2;
        const BUFFER_FROM_BOTTOM = 1;
        const maxBarHeight = this.canvasSize.height - BUFFER_FROM_TOP - BUFFER_FROM_BOTTOM;
        const currentBarHeight = Math.round(maxBarHeight * (curBarSummedValue / maxBarValue));
        //start painting from bottom of bar, section by section
        let y = maxBarHeight + BUFFER_FROM_TOP;
        let availableBarHeight = currentBarHeight;
        for (let i = 0; i < bar.length; i++) {
            const currStackHeight = this.renderBarSection(
                x,
                y,
                bar[i],
                curBarSummedValue,
                currentBarHeight,
                availableBarHeight,
                this.options.barBgColor[i]);
            y -= currStackHeight;
            availableBarHeight -= currStackHeight;
        }
    }

    renderBarSection(x, y, data, curBarSummedValue, currentBarHeight, availableBarHeight, bg) {
        const c = this.ctx;

        const currStackHeight = currentBarHeight <= 0 ?
            0 :
            Math.min(
                availableBarHeight, //round() can make total stacks excceed curr bar height so we limit it
                Math.round(currentBarHeight * (data / curBarSummedValue))
            );
        c.strokeStyle = bg;

        if (currStackHeight > 0) {
            const calcY = y - currStackHeight;
            /*fillRect starts from the point bottom of start point so we compensate*/
            const calcHeight = Math.max(0, currStackHeight - 1);
            c.fillRect(
                x,
                calcY,
                this.options.barWidth,
                calcHeight
            );

            c.fillStyle = "white";
            if (this.options.barFgColor) {
                c.fillStyle = this.options.barFgColor;
            }
            if (this.options.showText) {
                const str = utils.abbreviateNumber(data.toString());
                c.fillText(
                    str,
                    Math.floor(x + this.options.barWidth / 2 + str.length / 2),
                    calcY + Math.round(calcHeight / 2));
            }
        }

        return currStackHeight;
    }

    getOptionsPrototype() {
        return {
            barWidth: 1
            , barSpacing: 1
            , xOffset: 1
            , maxValue: 1
            , barBgColor: "s"
            , data: {
                barCategory: ["s"]
                , stackedCategory: ["s"]
                , data: [[1]]
            }
        };
    }

    addLegend(bars, x) {
        if (!this.options.showLegend) {
            return;
        }
        if (this.legend) {
            this.remove(this.legend);
        }
        const legendWidth = this.options.legend.width || 15;
        this.legend = new adone.terminal.widget.Element({
            height: bars.stackedCategory.length + 2,
            top: 1,
            width: legendWidth,
            left: x,
            content: "",
            fg: "green",
            tags: true,
            border: {
                type: "line",
                fg: "black"
            },
            style: {
                fg: "blue"
            },
            screen: this.screen
        });

        let legandText = "";
        const maxChars = legendWidth - 2;
        for (let i = 0; i < bars.stackedCategory.length; i++) {
            const color = utils.getColorCode(this.options.barBgColor[i]);
            legandText += `{${color}-fg}${bars.stackedCategory[i].substring(0, maxChars)}{/${color}-fg}\r\n`;
        }
        this.legend.setContent(legandText);
        this.append(this.legend);
    }
}
StackedBar.prototype.type = "bar";
