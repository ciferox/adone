const Canvas = require("./basecanvas");
const glMatrix = require("./gl-matrix");
const x256 = require("x256");
const mat2d = glMatrix.mat2d;
const vec2 = glMatrix.vec2;
const bresenham = function (x0, y0, x1, y1, fn) {
    if (!fn) {
        var arr = [];
        fn = function (x, y) {
            arr.push({ x, y });
        };
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

function Context(width, height, canvasClass) { 
    canvasClass = canvasClass || Canvas;
    this._canvas = new canvasClass(width, height);  
    this.canvas = this._canvas; //compatability  
    this._matrix = mat2d.create();
    this._stack = [];
    this._currentPath = [];
}

exports.colors = {
    black: 0,
    red: 1,
    green: 2,
    yellow: 3,
    blue: 4,
    magenta: 5,
    cyan: 6,
    white: 7
};

const methods = ["save", "restore", "scale", "rotate", "translate", "transform", "setTransform", "resetTransform", "createLinearGradient", "createRadialGradient", "createPattern", "clearRect", "fillRect", "strokeRect", "beginPath", "fill", "stroke", "drawFocusIfNeeded", "clip", "isPointInPath", "isPointInStroke", "fillText", "strokeText", "measureText", "drawImage", "createImageData", "getImageData", "putImageData", "getContextAttributes", "setLineDash", "getLineDash", "setAlpha", "setCompositeOperation", "setLineWidth", "setLineCap", "setLineJoin", "setMiterLimit", "clearShadow", "setStrokeColor", "setFillColor", "drawImageFromRect", "setShadow", "closePath", "moveTo", "lineTo", "quadraticCurveTo", "bezierCurveTo", "arcTo", "rect", "arc", "ellipse"];

methods.forEach((name) => {
    Context.prototype[name] = function () {};
});

function getFgCode(color) {
    if (typeof color === "string" && color != "normal") { // String Value
        return `\x1B[3${exports.colors[color]}m`;
    } else if (Array.isArray(color) && color.length == 3) { // RGB Value
        return `\x1B[38;5;${x256(color[0], color[1], color[2])}m`;
    } else if (typeof color === "number") { // Number
        return `\x1B[38;5;${color}m`;
    }  // Default
    return "\x1B[39m";
    
}

function getBgCode(color) {
    if (typeof color === "string" && color != "normal") { // String Value
        return `\x1B[4${exports.colors[color]}m`;
    } else if (Array.isArray(color) && color.length == 3) { // RGB Value
        return `\x1B[48;5;${x256(color[0], color[1], color[2])}m`;
    } else if (typeof color === "number") { // Number
        return `\x1B[48;5;${color}m`;
    }  // Default
    return "\x1B[49m";
    
}

function br(p1, p2) {
    return bresenham(
    Math.floor(p1[0]),
    Math.floor(p1[1]),
    Math.floor(p2[0]),
    Math.floor(p2[1])
  );
}

function triangle(pa, pb, pc, f) {
    const a = br(pb, pc);
    const b = br(pa, pc);
    const c = br(pa, pb);
    const s = a.concat(b).concat(c).sort((a, b) => {
        if (a.y == b.y) {
            return a.x - b.x;
        }
        return a.y - b.y;
    });
    for (let i = 0; i < s.length - 1; i++) {
        const cur = s[i];
        const nex = s[i + 1];
        if (cur.y == nex.y) {
            for (let j = cur.x; j <= nex.x; j++) {
                f(j, cur.y);
            }
        } else {
            f(cur.x, cur.y);
        }
    }
}

function quad(m, x, y, w, h, f) {
    const p1 = vec2.transformMat2d(vec2.create(), vec2.fromValues(x, y), m);
    const p2 = vec2.transformMat2d(vec2.create(), vec2.fromValues(x + w, y), m);
    const p3 = vec2.transformMat2d(vec2.create(), vec2.fromValues(x, y + h), m);
    const p4 = vec2.transformMat2d(vec2.create(), vec2.fromValues(x + w, y + h), m);
    triangle(p1, p2, p3, f);
    triangle(p3, p2, p4, f);
}

Context.prototype.__defineSetter__("fillStyle", function (val) {
    this._canvas.fontFg = val;
});

Context.prototype.__defineSetter__("strokeStyle", function (val) {
    this._canvas.color = val;
  //this._canvas.fontBg = val
});

Context.prototype.clearRect = function (x, y, w, h) {
    quad(this._matrix, x, y, w, h, this._canvas.unset.bind(this._canvas));  
};

Context.prototype.fillRect = function (x, y, w, h) {
    quad(this._matrix, x, y, w, h, this._canvas.set.bind(this._canvas));
};

Context.prototype.save = function save() {
    this._stack.push(mat2d.clone(mat2d.create(), this._matrix));
};

Context.prototype.restore = function restore() {
    const top = this._stack.pop();
    if (!top) {
        return;
    }
    this._matrix = top;
};

Context.prototype.translate = function translate(x, y) {  
    mat2d.translate(this._matrix, this._matrix, vec2.fromValues(x, y));
};

Context.prototype.rotate = function rotate(a) {
    mat2d.rotate(this._matrix, this._matrix, a / 180 * Math.PI);
};

Context.prototype.scale = function scale(x, y) {
    mat2d.scale(this._matrix, this._matrix, vec2.fromValues(x, y));
};

Context.prototype.beginPath = function beginPath() {
    this._currentPath = [];
};

Context.prototype.closePath = function closePath() {
  /*
  this._currentPath.push({
    point: this._currentPath[0].point,
    stroke: false
  });*/
};

Context.prototype.stroke = function stroke() {
  
    if (this.lineWidth == 0) {
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
};

function addPoint(m, p, x, y, s) {
    const v = vec2.transformMat2d(vec2.create(), vec2.fromValues(x, y), m);
    p.push({
        point: [Math.floor(v[0]), Math.floor(v[1])],
        stroke: s
    });
}

Context.prototype.moveTo = function moveTo(x, y) {
    addPoint(this._matrix, this._currentPath, x, y, false);
};

Context.prototype.lineTo = function lineTo(x, y) {
    addPoint(this._matrix, this._currentPath, x, y, true);
};

Context.prototype.fillText = function lineTo(str, x, y) {
    const v = vec2.transformMat2d(vec2.create(), vec2.fromValues(x, y), this._matrix);
    this._canvas.writeText(str, Math.floor(v[0]), Math.floor(v[1]));
};

Context.prototype.measureText = function measureText(str) {
    return this._canvas.measureText(str);
};

Canvas.prototype.writeText = function (str, x, y) {  
    const coord = this.getCoord(x, y);
    for (let i = 0; i < str.length; i++) {    
        this.chars[coord + i] = str[i];
    }

    const bg = getBgCode(this.fontBg);
    const fg = getFgCode(this.fontFg);

    this.chars[coord] = fg + bg + this.chars[coord];
    this.chars[coord + str.length - 1] += "\x1B[39m\x1B[49m";
};

const map = [
  [0x1, 0x8],
  [0x2, 0x10],
  [0x4, 0x20],
  [0x40, 0x80]
];

Canvas.prototype.set = function (x, y) {
    if (!(x >= 0 && x < this.width && y >= 0 && y < this.height)) {
        return;
    }
    
    const coord = this.getCoord(x, y);
    const mask = map[y % 4][x % 2];

    this.content[coord] |= mask;
    this.colors[coord] = getFgCode(this.color);
    this.chars[coord] = null;
};


Canvas.prototype.frame = function frame(delimiter) {
    delimiter = delimiter || "\n";
    const result = [];

    for (let i = 0, j = 0; i < this.content.length; i++, j++) {
        if (j == this.width / 2) {
            result.push(delimiter);
            j = 0;
        }
        if (this.chars[i]) {
            result.push(this.chars[i]);
        } else if (this.content[i] == 0) {
            result.push(" ");
        } else {   
            const colorCode = this.colors[i];
            result.push(`${colorCode + String.fromCharCode(0x2800 + this.content[i])}\x1B[39m`);      
      //result.push(String.fromCharCode(0x2800 + this.content[i]))      
        }
    }
    result.push(delimiter);
    return result.join("");
};

module.exports = Context;
module.exports.Canvas = function (width, height, canvasClass) {
    let ctx;
    this.getContext = function () {
        return ctx = ctx || new Context(width, height, canvasClass);
    };
};
