const { math: { matrix: { mat2d, vec2 } } } = adone;

const bresenham = (x0, y0, x1, y1, fn) => {
    const arr = [];
    if (!fn) {
        fn = (x, y) => arr.push({ x, y });
    }
    const dx = x1 - x0;
    const dy = y1 - y0;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    let eps = 0;
    const sx = dx > 0 ? 1 : -1;
    const sy = dy > 0 ? 1 : -1;
    if (adx > ady) {
        for (let x = x0, y = y0; sx < 0 ? x >= x1 : x <= x1; x += sx) {
            fn(x, y);
            eps += ady;
            if ((eps << 1) >= adx) {
                y += sy;
                eps -= adx;
            }
        }
    } else {
        for (let x = x0, y = y0; sy < 0 ? y >= y1 : y <= y1; y += sy) {
            fn(x, y);
            eps += adx;
            if ((eps << 1) >= ady) {
                x += sx;
                eps -= ady;
            }
        }
    }
    return arr;
};


const br = (p1, p2) => bresenham(Math.floor(p1[0]), Math.floor(p1[1]), Math.floor(p2[0]), Math.floor(p2[1]));

const triangle = (pa, pb, pc, f) => {
    const a = br(pb, pc);
    const b = br(pa, pc);
    const c = br(pa, pb);
    const s = a.concat(b).concat(c).sort((a, b) => {
        if (a.y === b.y) {
            return a.x - b.x;
        }
        return a.y - b.y;
    });
    for (let i = 0; i < s.length - 1; i++) {
        const cur = s[i];
        const nex = s[i + 1];
        if (cur.y === nex.y) {
            for (let j = cur.x; j <= nex.x; j++) {
                f(j, cur.y);
            }
        } else {
            f(cur.x, cur.y);
        }
    }
};

const quad = (m, x, y, w, h, f) => {
    const p1 = vec2.transformMat2d(vec2.create(), vec2.fromValues(x, y), m);
    const p2 = vec2.transformMat2d(vec2.create(), vec2.fromValues(x + w, y), m);
    const p3 = vec2.transformMat2d(vec2.create(), vec2.fromValues(x, y + h), m);
    const p4 = vec2.transformMat2d(vec2.create(), vec2.fromValues(x + w, y + h), m);
    triangle(p1, p2, p3, f);
    triangle(p3, p2, p4, f);
};

const addPoint = (m, p, x, y, s) => {
    const v = vec2.transformMat2d(vec2.create(), vec2.fromValues(x, y), m);
    p.push({
        point: [Math.floor(v[0]), Math.floor(v[1])],
        stroke: s
    });
};






class Context {
    constructor(width, height, BaseCanvas) {
        this._canvas = new BaseCanvas(width, height);
        this._matrix = mat2d.create();
        this._stack = [];
        this._currentPath = [];
    }

    set fillStyle(val) {
        this._canvas.fontFg = val;
    }

    set strokeStyle(val) {
        this._canvas.color = val;
        //this._canvas.fontBg = val
    }

    clearRect(x, y, w, h) {
        quad(this._matrix, x, y, w, h, this._canvas.unset.bind(this._canvas));
    }

    fillRect(x, y, w, h) {
        quad(this._matrix, x, y, w, h, this._canvas.set.bind(this._canvas));
    }

    save() {
        this._stack.push(mat2d.clone(mat2d.create(), this._matrix));
    }

    restore() {
        const top = this._stack.pop();
        if (!top) {
            return;
        }
        this._matrix = top;
    }

    translate(x, y) {
        mat2d.translate(this._matrix, this._matrix, vec2.fromValues(x, y));
    }

    rotate(a) {
        mat2d.rotate(this._matrix, this._matrix, a / 180 * Math.PI);
    }

    scale(x, y) {
        mat2d.scale(this._matrix, this._matrix, vec2.fromValues(x, y));
    }

    beginPath() {
        this._currentPath = [];
    }

    closePath() {
        /*
        this._currentPath.push({
        point: this._currentPath[0].point,
        stroke: false
        });*/
    }

    stroke() {
        if (this.lineWidth === 0) {
            return;
        }

        const set = this._canvas.set.bind(this._canvas);
        for (let i = 0; i < this._currentPath.length - 1; i++) {
            const cur = this._currentPath[i];
            const nex = this._currentPath[i + 1];
            if (nex.stroke) {
                bresenham(cur.point[0], cur.point[1], nex.point[0], nex.point[1], set);
            }
        }
    }

    moveTo(x, y) {
        addPoint(this._matrix, this._currentPath, x, y, false);
    }

    lineTo(x, y) {
        addPoint(this._matrix, this._currentPath, x, y, true);
    }

    fillText(str, x, y) {
        const v = vec2.transformMat2d(vec2.create(), vec2.fromValues(x, y), this._matrix);
        this._canvas.writeText(str, Math.floor(v[0]), Math.floor(v[1]));
    }

    measureText(str) {
        return this._canvas.measureText(str);
    }
}

const methods = [
    "transform",
    "setTransform",
    "resetTransform",
    "createLinearGradient",
    "createRadialGradient",
    "createPattern",
    "strokeRect",
    "fill",
    "drawFocusIfNeeded",
    "clip",
    "isPointInPath",
    "isPointInStroke",
    "strokeText",
    "drawImage",
    "createImageData",
    "getImageData",
    "putImageData",
    "getContextAttributes",
    "setLineDash",
    "getLineDash",
    "setAlpha",
    "setCompositeOperation",
    "setLineWidth",
    "setLineCap",
    "setLineJoin",
    "setMiterLimit",
    "clearShadow",
    "setStrokeColor",
    "setFillColor",
    "drawImageFromRect",
    "setShadow",
    "quadraticCurveTo",
    "bezierCurveTo",
    "arcTo",
    "rect",
    "arc",
    "ellipse"
];

methods.forEach((name) => {
    Context.prototype[name] = function () { };
});

const InnerCanvas = function (width, height, SomeCanvas) {
    let ctx;
    this.getContext = function () {
        return ctx = ctx || new Context(width, height, SomeCanvas);
    };
};


export default class Canvas extends adone.cui.widget.Element {
    constructor(options, BaseCanvas) {
        options = options || {};
        super(options);

        this.on("attach", () => {
            this.calcSize();
            this._canvas = new InnerCanvas(this.canvasSize.width, this.canvasSize.height, BaseCanvas);
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
