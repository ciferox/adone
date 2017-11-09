const { mat3, vec3, vec4 } = adone.math.matrix;

export const create = () => {
    const out = new Float32Array(4);
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    return out;
};

export const identity = (out) => {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    return out;
};

export const setAxisAngle = (out, axis, rad) => {
    rad = rad * 0.5;
    const s = Math.sin(rad);
    out[0] = s * axis[0];
    out[1] = s * axis[1];
    out[2] = s * axis[2];
    out[3] = Math.cos(rad);
    return out;
};

export const getAxisAngle = (outAxis, q) => {
    const rad = Math.acos(q[3]) * 2.0;
    const s = Math.sin(rad / 2.0);
    if (s != 0.0) {
        outAxis[0] = q[0] / s;
        outAxis[1] = q[1] / s;
        outAxis[2] = q[2] / s;
    } else {
        // If s is zero, return any axis (no rotation - axis does not matter)
        outAxis[0] = 1;
        outAxis[1] = 0;
        outAxis[2] = 0;
    }
    return rad;
};

export const multiply = (out, a, b) => {
    const ax = a[0];
    const ay = a[1];
    const az = a[2];
    const aw = a[3];
    const bx = b[0];
    const by = b[1];
    const bz = b[2];
    const bw = b[3];

    out[0] = ax * bw + aw * bx + ay * bz - az * by;
    out[1] = ay * bw + aw * by + az * bx - ax * bz;
    out[2] = az * bw + aw * bz + ax * by - ay * bx;
    out[3] = aw * bw - ax * bx - ay * by - az * bz;
    return out;
};

export const rotateX = (out, a, rad) => {
    rad *= 0.5;

    const ax = a[0];
    const ay = a[1];
    const az = a[2];
    const aw = a[3];
    const bx = Math.sin(rad);
    const bw = Math.cos(rad);

    out[0] = ax * bw + aw * bx;
    out[1] = ay * bw + az * bx;
    out[2] = az * bw - ay * bx;
    out[3] = aw * bw - ax * bx;
    return out;
};

export const rotateY = (out, a, rad) => {
    rad *= 0.5;

    const ax = a[0];
    const ay = a[1];
    const az = a[2];
    const aw = a[3];
    const by = Math.sin(rad);
    const bw = Math.cos(rad);

    out[0] = ax * bw - az * by;
    out[1] = ay * bw + aw * by;
    out[2] = az * bw + ax * by;
    out[3] = aw * bw - ay * by;
    return out;
};

export const rotateZ = (out, a, rad) => {
    rad *= 0.5;

    const ax = a[0];
    const ay = a[1];
    const az = a[2];
    const aw = a[3];
    const bz = Math.sin(rad);
    const bw = Math.cos(rad);

    out[0] = ax * bw + ay * bz;
    out[1] = ay * bw - ax * bz;
    out[2] = az * bw + aw * bz;
    out[3] = aw * bw - az * bz;
    return out;
};

export const calculateW = (out, a) => {
    const x = a[0];
    const y = a[1];
    const z = a[2];

    out[0] = x;
    out[1] = y;
    out[2] = z;
    out[3] = Math.sqrt(Math.abs(1.0 - x * x - y * y - z * z));
    return out;
};

export const slerp = (out, a, b, t) => {
    // benchmarks:
    //    http://jsperf.com/quaternion-slerp-implementations

    const ax = a[0];
    const ay = a[1];
    const az = a[2];
    const aw = a[3];
    let bx = b[0];
    let by = b[1];
    let bz = b[2];
    let bw = b[3];

    let omega;
    let cosom;
    let sinom;
    let scale0;
    let scale1;

    // calc cosine
    cosom = ax * bx + ay * by + az * bz + aw * bw;
    // adjust signs (if necessary)
    if (cosom < 0.0) {
        cosom = -cosom;
        bx = - bx;
        by = - by;
        bz = - bz;
        bw = - bw;
    }
    // calculate coefficients
    if ((1.0 - cosom) > 0.000001) {
        // standard case (slerp)
        omega = Math.acos(cosom);
        sinom = Math.sin(omega);
        scale0 = Math.sin((1.0 - t) * omega) / sinom;
        scale1 = Math.sin(t * omega) / sinom;
    } else {
        // "from" and "to" quaternions are very close
        //  ... so we can do a linear interpolation
        scale0 = 1.0 - t;
        scale1 = t;
    }
    // calculate final values
    out[0] = scale0 * ax + scale1 * bx;
    out[1] = scale0 * ay + scale1 * by;
    out[2] = scale0 * az + scale1 * bz;
    out[3] = scale0 * aw + scale1 * bw;

    return out;
};

export const invert = (out, a) => {
    const a0 = a[0];
    const a1 = a[1];
    const a2 = a[2];
    const a3 = a[3];
    const dot = a0 * a0 + a1 * a1 + a2 * a2 + a3 * a3;
    const invDot = dot ? 1.0 / dot : 0;

    // TODO: Would be faster to return [0,0,0,0] immediately if dot == 0

    out[0] = -a0 * invDot;
    out[1] = -a1 * invDot;
    out[2] = -a2 * invDot;
    out[3] = a3 * invDot;
    return out;
};

export const conjugate = (out, a) => {
    out[0] = -a[0];
    out[1] = -a[1];
    out[2] = -a[2];
    out[3] = a[3];
    return out;
};

export const fromMat3 = (out, m) => {
    // Algorithm in Ken Shoemake's article in 1987 SIGGRAPH course notes
    // article "Quaternion Calculus and Fast Animation".
    const fTrace = m[0] + m[4] + m[8];
    let fRoot;

    if (fTrace > 0.0) {
        // |w| > 1/2, may as well choose w > 1/2
        fRoot = Math.sqrt(fTrace + 1.0); // 2w
        out[3] = 0.5 * fRoot;
        fRoot = 0.5 / fRoot; // 1/(4w)
        out[0] = (m[5] - m[7]) * fRoot;
        out[1] = (m[6] - m[2]) * fRoot;
        out[2] = (m[1] - m[3]) * fRoot;
    } else {
        // |w| <= 1/2
        let i = 0;
        if (m[4] > m[0]) {
            i = 1;
        }
        if (m[8] > m[i * 3 + i]) {
            i = 2;
        }
        const j = (i + 1) % 3;
        const k = (i + 2) % 3;

        fRoot = Math.sqrt(m[i * 3 + i] - m[j * 3 + j] - m[k * 3 + k] + 1.0);
        out[i] = 0.5 * fRoot;
        fRoot = 0.5 / fRoot;
        out[3] = (m[j * 3 + k] - m[k * 3 + j]) * fRoot;
        out[j] = (m[j * 3 + i] + m[i * 3 + j]) * fRoot;
        out[k] = (m[k * 3 + i] + m[i * 3 + k]) * fRoot;
    }

    return out;
};

export const fromEuler = (out, x, y, z) => {
    const halfToRad = 0.5 * Math.PI / 180.0;
    x *= halfToRad;
    y *= halfToRad;
    z *= halfToRad;

    const sx = Math.sin(x);
    const cx = Math.cos(x);
    const sy = Math.sin(y);
    const cy = Math.cos(y);
    const sz = Math.sin(z);
    const cz = Math.cos(z);

    out[0] = sx * cy * cz - cx * sy * sz;
    out[1] = cx * sy * cz + sx * cy * sz;
    out[2] = cx * cy * sz - sx * sy * cz;
    out[3] = cx * cy * cz + sx * sy * sz;

    return out;
};

export const str = (a) => {
    return `quat(${a[0]}, ${a[1]}, ${a[2]}, ${a[3]})`;
};

export const clone = vec4.clone;

export const fromValues = vec4.fromValues;

export const copy = vec4.copy;

export const set = vec4.set;

export const add = vec4.add;

export const mul = multiply;

export const scale = vec4.scale;

export const dot = vec4.dot;

export const lerp = vec4.lerp;

export const length = vec4.length;

export const len = length;

export const squaredLength = vec4.squaredLength;

export const sqrLen = squaredLength;

export const normalize = vec4.normalize;

export const exactEquals = vec4.exactEquals;

export const equals = vec4.equals;

export const rotationTo = (function () {
    const tmpvec3 = vec3.create();
    const xUnitVec3 = vec3.fromValues(1, 0, 0);
    const yUnitVec3 = vec3.fromValues(0, 1, 0);

    return function (out, a, b) {
        const dot = vec3.dot(a, b);
        if (dot < -0.999999) {
            vec3.cross(tmpvec3, xUnitVec3, a);
            if (vec3.len(tmpvec3) < 0.000001) {
                vec3.cross(tmpvec3, yUnitVec3, a);
            }
            vec3.normalize(tmpvec3, tmpvec3);
            setAxisAngle(out, tmpvec3, Math.PI);
            return out;
        } else if (dot > 0.999999) {
            out[0] = 0;
            out[1] = 0;
            out[2] = 0;
            out[3] = 1;
            return out;
        }
        vec3.cross(tmpvec3, a, b);
        out[0] = tmpvec3[0];
        out[1] = tmpvec3[1];
        out[2] = tmpvec3[2];
        out[3] = 1 + dot;
        return normalize(out, out);

    };
})();

export const sqlerp = (function () {
    const temp1 = create();
    const temp2 = create();

    return function (out, a, b, c, d, t) {
        slerp(temp1, a, d, t);
        slerp(temp2, b, c, t);
        slerp(out, temp1, temp2, 2 * t * (1 - t));

        return out;
    };
}());

export const setAxes = (function () {
    const matr = mat3.create();

    return function (out, view, right, up) {
        matr[0] = right[0];
        matr[3] = right[1];
        matr[6] = right[2];

        matr[1] = up[0];
        matr[4] = up[1];
        matr[7] = up[2];

        matr[2] = -view[0];
        matr[5] = -view[1];
        matr[8] = -view[2];

        return normalize(out, fromMat3(out, matr));
    };
})();
