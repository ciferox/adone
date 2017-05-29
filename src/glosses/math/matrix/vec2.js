export const create = () => {
    const out = new Float32Array(2);
    out[0] = 0;
    out[1] = 0;
    return out;
};

export const clone = (a) => {
    const out = new Float32Array(2);
    out[0] = a[0];
    out[1] = a[1];
    return out;
};

export const fromValues = (x, y) => {
    const out = new Float32Array(2);
    out[0] = x;
    out[1] = y;
    return out;
};

export const copy = (out, a) => {
    out[0] = a[0];
    out[1] = a[1];
    return out;
};

export const set = (out, x, y) => {
    out[0] = x;
    out[1] = y;
    return out;
};

export const add = (out, a, b) => {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    return out;
};

export const subtract = (out, a, b) => {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    return out;
};

export const sub = subtract;

export const multiply = (out, a, b) => {
    out[0] = a[0] * b[0];
    out[1] = a[1] * b[1];
    return out;
};

export const mul = multiply;

export const divide = (out, a, b) => {
    out[0] = a[0] / b[0];
    out[1] = a[1] / b[1];
    return out;
};

export const div = divide;

export const ceil = (out, a) => {
    out[0] = Math.ceil(a[0]);
    out[1] = Math.ceil(a[1]);
    return out;
};

export const floor = (out, a) => {
    out[0] = Math.floor(a[0]);
    out[1] = Math.floor(a[1]);
    return out;
};

export const min = (out, a, b) => {
    out[0] = Math.min(a[0], b[0]);
    out[1] = Math.min(a[1], b[1]);
    return out;
};

export const max = (out, a, b) => {
    out[0] = Math.max(a[0], b[0]);
    out[1] = Math.max(a[1], b[1]);
    return out;
};

export const round = (out, a) => {
    out[0] = Math.round(a[0]);
    out[1] = Math.round(a[1]);
    return out;
};

export const scale = (out, a, b) => {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    return out;
};

export const scaleAndAdd = (out, a, b, scale) => {
    out[0] = a[0] + (b[0] * scale);
    out[1] = a[1] + (b[1] * scale);
    return out;
};

export const distance = (a, b) => {
    const x = b[0] - a[0];
    const y = b[1] - a[1];
    return Math.sqrt(x * x + y * y);
};

export const dist = distance;

export const squaredDistance = (a, b) => {
    const x = b[0] - a[0];
    const y = b[1] - a[1];
    return x * x + y * y;
};

export const sqrDist = squaredDistance;

export const length = (a) => {
    const x = a[0];
    const y = a[1];
    return Math.sqrt(x * x + y * y);
};

export const len = length;

export const squaredLength = (a) => {
    const x = a[0];
    const y = a[1];
    return x * x + y * y;
};

export const sqrLen = squaredLength;

export const negate = (out, a) => {
    out[0] = -a[0];
    out[1] = -a[1];
    return out;
};

export const inverse = (out, a) => {
    out[0] = 1.0 / a[0];
    out[1] = 1.0 / a[1];
    return out;
};

export const normalize = (out, a) => {
    const x = a[0];
    const y = a[1];
    let len = x * x + y * y;
    if (len > 0) {
        //TODO: evaluate use of glm_invsqrt here?
        len = 1 / Math.sqrt(len);
        out[0] = a[0] * len;
        out[1] = a[1] * len;
    }
    return out;
};

export const dot = (a, b) => {
    return a[0] * b[0] + a[1] * b[1];
};

export const cross = (out, a, b) => {
    const z = a[0] * b[1] - a[1] * b[0];
    out[0] = out[1] = 0;
    out[2] = z;
    return out;
};

export const lerp = (out, a, b, t) => {
    const ax = a[0];
    const ay = a[1];
    out[0] = ax + t * (b[0] - ax);
    out[1] = ay + t * (b[1] - ay);
    return out;
};

export const random = (out, scale) => {
    scale = scale || 1.0;
    const r = Math.random() * 2.0 * Math.PI;
    out[0] = Math.cos(r) * scale;
    out[1] = Math.sin(r) * scale;
    return out;
};

export const transformMat2 = (out, a, m) => {
    const x = a[0];
    const y = a[1];
    out[0] = m[0] * x + m[2] * y;
    out[1] = m[1] * x + m[3] * y;
    return out;
};

export const transformMat2d = (out, a, m) => {
    const x = a[0];
    const y = a[1];
    out[0] = m[0] * x + m[2] * y + m[4];
    out[1] = m[1] * x + m[3] * y + m[5];
    return out;
};

export const transformMat3 = (out, a, m) => {
    const x = a[0];
    const y = a[1];
    out[0] = m[0] * x + m[3] * y + m[6];
    out[1] = m[1] * x + m[4] * y + m[7];
    return out;
};

export const transformMat4 = (out, a, m) => {
    const x = a[0];
    const y = a[1];
    out[0] = m[0] * x + m[4] * y + m[12];
    out[1] = m[1] * x + m[5] * y + m[13];
    return out;
};

export const forEach = (function () {
    const vec = create();

    return function (a, stride, offset, count, fn, arg) {
        let i;
        let l;
        if (!stride) {
            stride = 2;
        }

        if (!offset) {
            offset = 0;
        }

        if (count) {
            l = Math.min((count * stride) + offset, a.length);
        } else {
            l = a.length;
        }

        for (i = offset; i < l; i += stride) {
            vec[0] = a[i]; vec[1] = a[i + 1];
            fn(vec, vec, arg);
            a[i] = vec[0]; a[i + 1] = vec[1];
        }

        return a;
    };
})();

export const str = (a) => {
    return `vec2(${a[0]}, ${a[1]})`;
};

export const exactEquals = (a, b) => {
    return a[0] === b[0] && a[1] === b[1];
};

export const equals = (a, b) => {
    const a0 = a[0];
    const a1 = a[1];
    const b0 = b[0];
    const b1 = b[1];
    return (Math.abs(a0 - b0) <= adone.math.matrix.EPSILON * Math.max(1.0, Math.abs(a0), Math.abs(b0)) &&
        Math.abs(a1 - b1) <= adone.math.matrix.EPSILON * Math.max(1.0, Math.abs(a1), Math.abs(b1)));
};
