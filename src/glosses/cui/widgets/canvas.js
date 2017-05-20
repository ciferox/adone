

const InnerCanvas = require("../graphics/canvas").Canvas;

export default class Canvas extends adone.cui.widget.Element {
    constructor(options, canvasType) {
        options = options || { };
        super(options);

        this.on("attach", () => {
            this.calcSize();
            this._canvas = new InnerCanvas(this.canvasSize.width, this.canvasSize.height, canvasType);
            this.ctx = this._canvas.getContext();
            if (this.options.data) {
                this.setData(this.options.data);
            }
        });
    }

    calcSize() {
        this.canvasSize = { width: this.width * 2 - 12, height: this.height * 4 };
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvasSize.width, this.canvasSize.height);
    }

    render() {

        this.clearPos(true);
        const inner = this.ctx._canvas.frame();
        this.setContent(inner);
        return super.render();
    }
}
Canvas.prototype.type = "canvas";
