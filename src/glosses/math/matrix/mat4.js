export const scalar = {};
export const simd = {};

export const create = () => {
    const out = new Float32Array(16);
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
};

export const clone = (a) => {
    const out = new Float32Array(16);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
};

export const copy = (out, a) => {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
};

export const fromValues = (m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33) => {
    const out = new Float32Array(16);
    out[0] = m00;
    out[1] = m01;
    out[2] = m02;
    out[3] = m03;
    out[4] = m10;
    out[5] = m11;
    out[6] = m12;
    out[7] = m13;
    out[8] = m20;
    out[9] = m21;
    out[10] = m22;
    out[11] = m23;
    out[12] = m30;
    out[13] = m31;
    out[14] = m32;
    out[15] = m33;
    return out;
};

export const set = (out, m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33) => {
    out[0] = m00;
    out[1] = m01;
    out[2] = m02;
    out[3] = m03;
    out[4] = m10;
    out[5] = m11;
    out[6] = m12;
    out[7] = m13;
    out[8] = m20;
    out[9] = m21;
    out[10] = m22;
    out[11] = m23;
    out[12] = m30;
    out[13] = m31;
    out[14] = m32;
    out[15] = m33;
    return out;
};


export const identity = (out) => {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
};

scalar.transpose = (out, a) => {
    // If we are transposing ourselves we can skip a few steps but have to cache some values
    if (out === a) {
        const a01 = a[1];
        const a02 = a[2];
        const a03 = a[3];
        const a12 = a[6];
        const a13 = a[7];
        const a23 = a[11];

        out[1] = a[4];
        out[2] = a[8];
        out[3] = a[12];
        out[4] = a01;
        out[6] = a[9];
        out[7] = a[13];
        out[8] = a02;
        out[9] = a12;
        out[11] = a[14];
        out[12] = a03;
        out[13] = a13;
        out[14] = a23;
    } else {
        out[0] = a[0];
        out[1] = a[4];
        out[2] = a[8];
        out[3] = a[12];
        out[4] = a[1];
        out[5] = a[5];
        out[6] = a[9];
        out[7] = a[13];
        out[8] = a[2];
        out[9] = a[6];
        out[10] = a[10];
        out[11] = a[14];
        out[12] = a[3];
        out[13] = a[7];
        out[14] = a[11];
        out[15] = a[15];
    }

    return out;
};

simd.transpose = (out, a) => {
    const a0 = adone.math.simd.Float32x4.load(a, 0);
    const a1 = adone.math.simd.Float32x4.load(a, 4);
    const a2 = adone.math.simd.Float32x4.load(a, 8);
    const a3 = adone.math.simd.Float32x4.load(a, 12);

    let tmp01 = adone.math.simd.Float32x4.shuffle(a0, a1, 0, 1, 4, 5);
    let tmp23 = adone.math.simd.Float32x4.shuffle(a2, a3, 0, 1, 4, 5);
    const out0 = adone.math.simd.Float32x4.shuffle(tmp01, tmp23, 0, 2, 4, 6);
    const out1 = adone.math.simd.Float32x4.shuffle(tmp01, tmp23, 1, 3, 5, 7);
    adone.math.simd.Float32x4.store(out, 0, out0);
    adone.math.simd.Float32x4.store(out, 4, out1);

    tmp01 = adone.math.simd.Float32x4.shuffle(a0, a1, 2, 3, 6, 7);
    tmp23 = adone.math.simd.Float32x4.shuffle(a2, a3, 2, 3, 6, 7);
    const out2 = adone.math.simd.Float32x4.shuffle(tmp01, tmp23, 0, 2, 4, 6);
    const out3 = adone.math.simd.Float32x4.shuffle(tmp01, tmp23, 1, 3, 5, 7);
    adone.math.simd.Float32x4.store(out, 8, out2);
    adone.math.simd.Float32x4.store(out, 12, out3);

    return out;
};

export const transpose = simd.transpose;

scalar.invert = (out, a) => {
    const a00 = a[0];
    const a01 = a[1];
    const a02 = a[2];
    const a03 = a[3];
    const a10 = a[4];
    const a11 = a[5];
    const a12 = a[6];
    const a13 = a[7];
    const a20 = a[8];
    const a21 = a[9];
    const a22 = a[10];
    const a23 = a[11];
    const a30 = a[12];
    const a31 = a[13];
    const a32 = a[14];
    const a33 = a[15];

    const b00 = a00 * a11 - a01 * a10;
    const b01 = a00 * a12 - a02 * a10;
    const b02 = a00 * a13 - a03 * a10;
    const b03 = a01 * a12 - a02 * a11;
    const b04 = a01 * a13 - a03 * a11;
    const b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30;
    const b07 = a20 * a32 - a22 * a30;
    const b08 = a20 * a33 - a23 * a30;
    const b09 = a21 * a32 - a22 * a31;
    const b10 = a21 * a33 - a23 * a31;
    const b11 = a22 * a33 - a23 * a32;

    // Calculate the determinant
    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

    if (!det) {
        return null;
    }
    det = 1.0 / det;

    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

    return out;
};

simd.invert = (out, a) => {
    const a0 = adone.math.simd.Float32x4.load(a, 0);
    const a1 = adone.math.simd.Float32x4.load(a, 4);
    const a2 = adone.math.simd.Float32x4.load(a, 8);
    const a3 = adone.math.simd.Float32x4.load(a, 12);

    // Compute matrix adjugate
    let tmp1 = adone.math.simd.Float32x4.shuffle(a0, a1, 0, 1, 4, 5);
    let row1 = adone.math.simd.Float32x4.shuffle(a2, a3, 0, 1, 4, 5);
    const row0 = adone.math.simd.Float32x4.shuffle(tmp1, row1, 0, 2, 4, 6);
    row1 = adone.math.simd.Float32x4.shuffle(row1, tmp1, 1, 3, 5, 7);
    tmp1 = adone.math.simd.Float32x4.shuffle(a0, a1, 2, 3, 6, 7);
    let row3 = adone.math.simd.Float32x4.shuffle(a2, a3, 2, 3, 6, 7);
    let row2 = adone.math.simd.Float32x4.shuffle(tmp1, row3, 0, 2, 4, 6);
    row3 = adone.math.simd.Float32x4.shuffle(row3, tmp1, 1, 3, 5, 7);

    tmp1 = adone.math.simd.Float32x4.mul(row2, row3);
    tmp1 = adone.math.simd.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
    let minor0 = adone.math.simd.Float32x4.mul(row1, tmp1);
    let minor1 = adone.math.simd.Float32x4.mul(row0, tmp1);
    tmp1 = adone.math.simd.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
    minor0 = adone.math.simd.Float32x4.sub(adone.math.simd.Float32x4.mul(row1, tmp1), minor0);
    minor1 = adone.math.simd.Float32x4.sub(adone.math.simd.Float32x4.mul(row0, tmp1), minor1);
    minor1 = adone.math.simd.Float32x4.swizzle(minor1, 2, 3, 0, 1);

    tmp1 = adone.math.simd.Float32x4.mul(row1, row2);
    tmp1 = adone.math.simd.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
    minor0 = adone.math.simd.Float32x4.add(adone.math.simd.Float32x4.mul(row3, tmp1), minor0);
    let minor3 = adone.math.simd.Float32x4.mul(row0, tmp1);
    tmp1 = adone.math.simd.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
    minor0 = adone.math.simd.Float32x4.sub(minor0, adone.math.simd.Float32x4.mul(row3, tmp1));
    minor3 = adone.math.simd.Float32x4.sub(adone.math.simd.Float32x4.mul(row0, tmp1), minor3);
    minor3 = adone.math.simd.Float32x4.swizzle(minor3, 2, 3, 0, 1);

    tmp1 = adone.math.simd.Float32x4.mul(adone.math.simd.Float32x4.swizzle(row1, 2, 3, 0, 1), row3);
    tmp1 = adone.math.simd.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
    row2 = adone.math.simd.Float32x4.swizzle(row2, 2, 3, 0, 1);
    minor0 = adone.math.simd.Float32x4.add(adone.math.simd.Float32x4.mul(row2, tmp1), minor0);
    let minor2 = adone.math.simd.Float32x4.mul(row0, tmp1);
    tmp1 = adone.math.simd.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
    minor0 = adone.math.simd.Float32x4.sub(minor0, adone.math.simd.Float32x4.mul(row2, tmp1));
    minor2 = adone.math.simd.Float32x4.sub(adone.math.simd.Float32x4.mul(row0, tmp1), minor2);
    minor2 = adone.math.simd.Float32x4.swizzle(minor2, 2, 3, 0, 1);

    tmp1 = adone.math.simd.Float32x4.mul(row0, row1);
    tmp1 = adone.math.simd.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
    minor2 = adone.math.simd.Float32x4.add(adone.math.simd.Float32x4.mul(row3, tmp1), minor2);
    minor3 = adone.math.simd.Float32x4.sub(adone.math.simd.Float32x4.mul(row2, tmp1), minor3);
    tmp1 = adone.math.simd.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
    minor2 = adone.math.simd.Float32x4.sub(adone.math.simd.Float32x4.mul(row3, tmp1), minor2);
    minor3 = adone.math.simd.Float32x4.sub(minor3, adone.math.simd.Float32x4.mul(row2, tmp1));

    tmp1 = adone.math.simd.Float32x4.mul(row0, row3);
    tmp1 = adone.math.simd.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
    minor1 = adone.math.simd.Float32x4.sub(minor1, adone.math.simd.Float32x4.mul(row2, tmp1));
    minor2 = adone.math.simd.Float32x4.add(adone.math.simd.Float32x4.mul(row1, tmp1), minor2);
    tmp1 = adone.math.simd.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
    minor1 = adone.math.simd.Float32x4.add(adone.math.simd.Float32x4.mul(row2, tmp1), minor1);
    minor2 = adone.math.simd.Float32x4.sub(minor2, adone.math.simd.Float32x4.mul(row1, tmp1));

    tmp1 = adone.math.simd.Float32x4.mul(row0, row2);
    tmp1 = adone.math.simd.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
    minor1 = adone.math.simd.Float32x4.add(adone.math.simd.Float32x4.mul(row3, tmp1), minor1);
    minor3 = adone.math.simd.Float32x4.sub(minor3, adone.math.simd.Float32x4.mul(row1, tmp1));
    tmp1 = adone.math.simd.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
    minor1 = adone.math.simd.Float32x4.sub(minor1, adone.math.simd.Float32x4.mul(row3, tmp1));
    minor3 = adone.math.simd.Float32x4.add(adone.math.simd.Float32x4.mul(row1, tmp1), minor3);

    // Compute matrix determinant
    let det = adone.math.simd.Float32x4.mul(row0, minor0);
    det = adone.math.simd.Float32x4.add(adone.math.simd.Float32x4.swizzle(det, 2, 3, 0, 1), det);
    det = adone.math.simd.Float32x4.add(adone.math.simd.Float32x4.swizzle(det, 1, 0, 3, 2), det);
    tmp1 = adone.math.simd.Float32x4.reciprocalApproximation(det);
    det = adone.math.simd.Float32x4.sub(adone.math.simd.Float32x4.add(tmp1, tmp1), adone.math.simd.Float32x4.mul(det, adone.math.simd.Float32x4.mul(tmp1, tmp1)));
    det = adone.math.simd.Float32x4.swizzle(det, 0, 0, 0, 0);
    if (!det) {
        return null;
    }

    // Compute matrix inverse
    adone.math.simd.Float32x4.store(out, 0, adone.math.simd.Float32x4.mul(det, minor0));
    adone.math.simd.Float32x4.store(out, 4, adone.math.simd.Float32x4.mul(det, minor1));
    adone.math.simd.Float32x4.store(out, 8, adone.math.simd.Float32x4.mul(det, minor2));
    adone.math.simd.Float32x4.store(out, 12, adone.math.simd.Float32x4.mul(det, minor3));
    return out;
};

export const invert = simd.invert;

scalar.adjoint = (out, a) => {
    const a00 = a[0];
    const a01 = a[1];
    const a02 = a[2];
    const a03 = a[3];
    const a10 = a[4];
    const a11 = a[5];
    const a12 = a[6];
    const a13 = a[7];
    const a20 = a[8];
    const a21 = a[9];
    const a22 = a[10];
    const a23 = a[11];
    const a30 = a[12];
    const a31 = a[13];
    const a32 = a[14];
    const a33 = a[15];

    out[0] = (a11 * (a22 * a33 - a23 * a32) - a21 * (a12 * a33 - a13 * a32) + a31 * (a12 * a23 - a13 * a22));
    out[1] = -(a01 * (a22 * a33 - a23 * a32) - a21 * (a02 * a33 - a03 * a32) + a31 * (a02 * a23 - a03 * a22));
    out[2] = (a01 * (a12 * a33 - a13 * a32) - a11 * (a02 * a33 - a03 * a32) + a31 * (a02 * a13 - a03 * a12));
    out[3] = -(a01 * (a12 * a23 - a13 * a22) - a11 * (a02 * a23 - a03 * a22) + a21 * (a02 * a13 - a03 * a12));
    out[4] = -(a10 * (a22 * a33 - a23 * a32) - a20 * (a12 * a33 - a13 * a32) + a30 * (a12 * a23 - a13 * a22));
    out[5] = (a00 * (a22 * a33 - a23 * a32) - a20 * (a02 * a33 - a03 * a32) + a30 * (a02 * a23 - a03 * a22));
    out[6] = -(a00 * (a12 * a33 - a13 * a32) - a10 * (a02 * a33 - a03 * a32) + a30 * (a02 * a13 - a03 * a12));
    out[7] = (a00 * (a12 * a23 - a13 * a22) - a10 * (a02 * a23 - a03 * a22) + a20 * (a02 * a13 - a03 * a12));
    out[8] = (a10 * (a21 * a33 - a23 * a31) - a20 * (a11 * a33 - a13 * a31) + a30 * (a11 * a23 - a13 * a21));
    out[9] = -(a00 * (a21 * a33 - a23 * a31) - a20 * (a01 * a33 - a03 * a31) + a30 * (a01 * a23 - a03 * a21));
    out[10] = (a00 * (a11 * a33 - a13 * a31) - a10 * (a01 * a33 - a03 * a31) + a30 * (a01 * a13 - a03 * a11));
    out[11] = -(a00 * (a11 * a23 - a13 * a21) - a10 * (a01 * a23 - a03 * a21) + a20 * (a01 * a13 - a03 * a11));
    out[12] = -(a10 * (a21 * a32 - a22 * a31) - a20 * (a11 * a32 - a12 * a31) + a30 * (a11 * a22 - a12 * a21));
    out[13] = (a00 * (a21 * a32 - a22 * a31) - a20 * (a01 * a32 - a02 * a31) + a30 * (a01 * a22 - a02 * a21));
    out[14] = -(a00 * (a11 * a32 - a12 * a31) - a10 * (a01 * a32 - a02 * a31) + a30 * (a01 * a12 - a02 * a11));
    out[15] = (a00 * (a11 * a22 - a12 * a21) - a10 * (a01 * a22 - a02 * a21) + a20 * (a01 * a12 - a02 * a11));
    return out;
};

simd.adjoint = (out, a) => {
    const a0 = adone.math.simd.Float32x4.load(a, 0);
    const a1 = adone.math.simd.Float32x4.load(a, 4);
    const a2 = adone.math.simd.Float32x4.load(a, 8);
    const a3 = adone.math.simd.Float32x4.load(a, 12);

    // Transpose the source matrix.  Sort of.  Not a true transpose operation
    let tmp1 = adone.math.simd.Float32x4.shuffle(a0, a1, 0, 1, 4, 5);
    let row1 = adone.math.simd.Float32x4.shuffle(a2, a3, 0, 1, 4, 5);
    const row0 = adone.math.simd.Float32x4.shuffle(tmp1, row1, 0, 2, 4, 6);
    row1 = adone.math.simd.Float32x4.shuffle(row1, tmp1, 1, 3, 5, 7);

    tmp1 = adone.math.simd.Float32x4.shuffle(a0, a1, 2, 3, 6, 7);
    let row3 = adone.math.simd.Float32x4.shuffle(a2, a3, 2, 3, 6, 7);
    let row2 = adone.math.simd.Float32x4.shuffle(tmp1, row3, 0, 2, 4, 6);
    row3 = adone.math.simd.Float32x4.shuffle(row3, tmp1, 1, 3, 5, 7);

    tmp1 = adone.math.simd.Float32x4.mul(row2, row3);
    tmp1 = adone.math.simd.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
    let minor0 = adone.math.simd.Float32x4.mul(row1, tmp1);
    let minor1 = adone.math.simd.Float32x4.mul(row0, tmp1);
    tmp1 = adone.math.simd.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
    minor0 = adone.math.simd.Float32x4.sub(adone.math.simd.Float32x4.mul(row1, tmp1), minor0);
    minor1 = adone.math.simd.Float32x4.sub(adone.math.simd.Float32x4.mul(row0, tmp1), minor1);
    minor1 = adone.math.simd.Float32x4.swizzle(minor1, 2, 3, 0, 1);

    tmp1 = adone.math.simd.Float32x4.mul(row1, row2);
    tmp1 = adone.math.simd.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
    minor0 = adone.math.simd.Float32x4.add(adone.math.simd.Float32x4.mul(row3, tmp1), minor0);
    let minor3 = adone.math.simd.Float32x4.mul(row0, tmp1);
    tmp1 = adone.math.simd.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
    minor0 = adone.math.simd.Float32x4.sub(minor0, adone.math.simd.Float32x4.mul(row3, tmp1));
    minor3 = adone.math.simd.Float32x4.sub(adone.math.simd.Float32x4.mul(row0, tmp1), minor3);
    minor3 = adone.math.simd.Float32x4.swizzle(minor3, 2, 3, 0, 1);

    tmp1 = adone.math.simd.Float32x4.mul(adone.math.simd.Float32x4.swizzle(row1, 2, 3, 0, 1), row3);
    tmp1 = adone.math.simd.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
    row2 = adone.math.simd.Float32x4.swizzle(row2, 2, 3, 0, 1);
    minor0 = adone.math.simd.Float32x4.add(adone.math.simd.Float32x4.mul(row2, tmp1), minor0);
    let minor2 = adone.math.simd.Float32x4.mul(row0, tmp1);
    tmp1 = adone.math.simd.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
    minor0 = adone.math.simd.Float32x4.sub(minor0, adone.math.simd.Float32x4.mul(row2, tmp1));
    minor2 = adone.math.simd.Float32x4.sub(adone.math.simd.Float32x4.mul(row0, tmp1), minor2);
    minor2 = adone.math.simd.Float32x4.swizzle(minor2, 2, 3, 0, 1);

    tmp1 = adone.math.simd.Float32x4.mul(row0, row1);
    tmp1 = adone.math.simd.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
    minor2 = adone.math.simd.Float32x4.add(adone.math.simd.Float32x4.mul(row3, tmp1), minor2);
    minor3 = adone.math.simd.Float32x4.sub(adone.math.simd.Float32x4.mul(row2, tmp1), minor3);
    tmp1 = adone.math.simd.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
    minor2 = adone.math.simd.Float32x4.sub(adone.math.simd.Float32x4.mul(row3, tmp1), minor2);
    minor3 = adone.math.simd.Float32x4.sub(minor3, adone.math.simd.Float32x4.mul(row2, tmp1));

    tmp1 = adone.math.simd.Float32x4.mul(row0, row3);
    tmp1 = adone.math.simd.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
    minor1 = adone.math.simd.Float32x4.sub(minor1, adone.math.simd.Float32x4.mul(row2, tmp1));
    minor2 = adone.math.simd.Float32x4.add(adone.math.simd.Float32x4.mul(row1, tmp1), minor2);
    tmp1 = adone.math.simd.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
    minor1 = adone.math.simd.Float32x4.add(adone.math.simd.Float32x4.mul(row2, tmp1), minor1);
    minor2 = adone.math.simd.Float32x4.sub(minor2, adone.math.simd.Float32x4.mul(row1, tmp1));

    tmp1 = adone.math.simd.Float32x4.mul(row0, row2);
    tmp1 = adone.math.simd.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
    minor1 = adone.math.simd.Float32x4.add(adone.math.simd.Float32x4.mul(row3, tmp1), minor1);
    minor3 = adone.math.simd.Float32x4.sub(minor3, adone.math.simd.Float32x4.mul(row1, tmp1));
    tmp1 = adone.math.simd.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
    minor1 = adone.math.simd.Float32x4.sub(minor1, adone.math.simd.Float32x4.mul(row3, tmp1));
    minor3 = adone.math.simd.Float32x4.add(adone.math.simd.Float32x4.mul(row1, tmp1), minor3);

    adone.math.simd.Float32x4.store(out, 0, minor0);
    adone.math.simd.Float32x4.store(out, 4, minor1);
    adone.math.simd.Float32x4.store(out, 8, minor2);
    adone.math.simd.Float32x4.store(out, 12, minor3);
    return out;
};

export const adjoint = simd.adjoint;

export const determinant = (a) => {
    const a00 = a[0];
    const a01 = a[1];
    const a02 = a[2];
    const a03 = a[3];
    const a10 = a[4];
    const a11 = a[5];
    const a12 = a[6];
    const a13 = a[7];
    const a20 = a[8];
    const a21 = a[9];
    const a22 = a[10];
    const a23 = a[11];
    const a30 = a[12];
    const a31 = a[13];
    const a32 = a[14];
    const a33 = a[15];

    const b00 = a00 * a11 - a01 * a10;
    const b01 = a00 * a12 - a02 * a10;
    const b02 = a00 * a13 - a03 * a10;
    const b03 = a01 * a12 - a02 * a11;
    const b04 = a01 * a13 - a03 * a11;
    const b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30;
    const b07 = a20 * a32 - a22 * a30;
    const b08 = a20 * a33 - a23 * a30;
    const b09 = a21 * a32 - a22 * a31;
    const b10 = a21 * a33 - a23 * a31;
    const b11 = a22 * a33 - a23 * a32;

    // Calculate the determinant
    return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
};

simd.multiply = (out, a, b) => {
    const a0 = adone.math.simd.Float32x4.load(a, 0);
    const a1 = adone.math.simd.Float32x4.load(a, 4);
    const a2 = adone.math.simd.Float32x4.load(a, 8);
    const a3 = adone.math.simd.Float32x4.load(a, 12);

    const b0 = adone.math.simd.Float32x4.load(b, 0);
    const out0 = adone.math.simd.Float32x4.add(
        adone.math.simd.Float32x4.mul(adone.math.simd.Float32x4.swizzle(b0, 0, 0, 0, 0), a0),
        adone.math.simd.Float32x4.add(
            adone.math.simd.Float32x4.mul(adone.math.simd.Float32x4.swizzle(b0, 1, 1, 1, 1), a1),
            adone.math.simd.Float32x4.add(
                adone.math.simd.Float32x4.mul(adone.math.simd.Float32x4.swizzle(b0, 2, 2, 2, 2), a2),
                adone.math.simd.Float32x4.mul(adone.math.simd.Float32x4.swizzle(b0, 3, 3, 3, 3), a3))));
    adone.math.simd.Float32x4.store(out, 0, out0);

    const b1 = adone.math.simd.Float32x4.load(b, 4);
    const out1 = adone.math.simd.Float32x4.add(
        adone.math.simd.Float32x4.mul(adone.math.simd.Float32x4.swizzle(b1, 0, 0, 0, 0), a0),
        adone.math.simd.Float32x4.add(
            adone.math.simd.Float32x4.mul(adone.math.simd.Float32x4.swizzle(b1, 1, 1, 1, 1), a1),
            adone.math.simd.Float32x4.add(
                adone.math.simd.Float32x4.mul(adone.math.simd.Float32x4.swizzle(b1, 2, 2, 2, 2), a2),
                adone.math.simd.Float32x4.mul(adone.math.simd.Float32x4.swizzle(b1, 3, 3, 3, 3), a3))));
    adone.math.simd.Float32x4.store(out, 4, out1);

    const b2 = adone.math.simd.Float32x4.load(b, 8);
    const out2 = adone.math.simd.Float32x4.add(
        adone.math.simd.Float32x4.mul(adone.math.simd.Float32x4.swizzle(b2, 0, 0, 0, 0), a0),
        adone.math.simd.Float32x4.add(
            adone.math.simd.Float32x4.mul(adone.math.simd.Float32x4.swizzle(b2, 1, 1, 1, 1), a1),
            adone.math.simd.Float32x4.add(
                adone.math.simd.Float32x4.mul(adone.math.simd.Float32x4.swizzle(b2, 2, 2, 2, 2), a2),
                adone.math.simd.Float32x4.mul(adone.math.simd.Float32x4.swizzle(b2, 3, 3, 3, 3), a3))));
    adone.math.simd.Float32x4.store(out, 8, out2);

    const b3 = adone.math.simd.Float32x4.load(b, 12);
    const out3 = adone.math.simd.Float32x4.add(
        adone.math.simd.Float32x4.mul(adone.math.simd.Float32x4.swizzle(b3, 0, 0, 0, 0), a0),
        adone.math.simd.Float32x4.add(
            adone.math.simd.Float32x4.mul(adone.math.simd.Float32x4.swizzle(b3, 1, 1, 1, 1), a1),
            adone.math.simd.Float32x4.add(
                adone.math.simd.Float32x4.mul(adone.math.simd.Float32x4.swizzle(b3, 2, 2, 2, 2), a2),
                adone.math.simd.Float32x4.mul(adone.math.simd.Float32x4.swizzle(b3, 3, 3, 3, 3), a3))));
    adone.math.simd.Float32x4.store(out, 12, out3);

    return out;
};

scalar.multiply = (out, a, b) => {
    const a00 = a[0];
    const a01 = a[1];
    const a02 = a[2];
    const a03 = a[3];
    const a10 = a[4];
    const a11 = a[5];
    const a12 = a[6];
    const a13 = a[7];
    const a20 = a[8];
    const a21 = a[9];
    const a22 = a[10];
    const a23 = a[11];
    const a30 = a[12];
    const a31 = a[13];
    const a32 = a[14];
    const a33 = a[15];

    // Cache only the current line of the second matrix
    let b0 = b[0];
    let b1 = b[1];
    let b2 = b[2];
    let b3 = b[3];

    out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

    b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
    out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

    b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
    out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

    b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
    out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    return out;
};

export const multiply = simd.multiply;

export const mul = multiply;

scalar.translate = (out, a, v) => {
    const x = v[0];
    const y = v[1];
    const z = v[2];

    if (a === out) {
        out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
        out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
        out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
        out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
    } else {
        const a00 = a[0];
        const a01 = a[1];
        const a02 = a[2];
        const a03 = a[3];
        const a10 = a[4];
        const a11 = a[5];
        const a12 = a[6];
        const a13 = a[7];
        const a20 = a[8];
        const a21 = a[9];
        const a22 = a[10];
        const a23 = a[11];

        out[0] = a00; out[1] = a01; out[2] = a02; out[3] = a03;
        out[4] = a10; out[5] = a11; out[6] = a12; out[7] = a13;
        out[8] = a20; out[9] = a21; out[10] = a22; out[11] = a23;

        out[12] = a00 * x + a10 * y + a20 * z + a[12];
        out[13] = a01 * x + a11 * y + a21 * z + a[13];
        out[14] = a02 * x + a12 * y + a22 * z + a[14];
        out[15] = a03 * x + a13 * y + a23 * z + a[15];
    }

    return out;
};

simd.translate = (out, a, v) => {
    let a0 = adone.math.simd.Float32x4.load(a, 0);
    let a1 = adone.math.simd.Float32x4.load(a, 4);
    let a2 = adone.math.simd.Float32x4.load(a, 8);
    const a3 = adone.math.simd.Float32x4.load(a, 12);
    const vec = adone.math.simd.Float32x4(v[0], v[1], v[2], 0);

    if (a !== out) {
        out[0] = a[0]; out[1] = a[1]; out[2] = a[2]; out[3] = a[3];
        out[4] = a[4]; out[5] = a[5]; out[6] = a[6]; out[7] = a[7];
        out[8] = a[8]; out[9] = a[9]; out[10] = a[10]; out[11] = a[11];
    }

    a0 = adone.math.simd.Float32x4.mul(a0, adone.math.simd.Float32x4.swizzle(vec, 0, 0, 0, 0));
    a1 = adone.math.simd.Float32x4.mul(a1, adone.math.simd.Float32x4.swizzle(vec, 1, 1, 1, 1));
    a2 = adone.math.simd.Float32x4.mul(a2, adone.math.simd.Float32x4.swizzle(vec, 2, 2, 2, 2));

    const t0 = adone.math.simd.Float32x4.add(a0, adone.math.simd.Float32x4.add(a1, adone.math.simd.Float32x4.add(a2, a3)));
    adone.math.simd.Float32x4.store(out, 12, t0);

    return out;
};

export const translate = simd.translate;

scalar.scale = (out, a, v) => {
    const x = v[0];
    const y = v[1];
    const z = v[2];

    out[0] = a[0] * x;
    out[1] = a[1] * x;
    out[2] = a[2] * x;
    out[3] = a[3] * x;
    out[4] = a[4] * y;
    out[5] = a[5] * y;
    out[6] = a[6] * y;
    out[7] = a[7] * y;
    out[8] = a[8] * z;
    out[9] = a[9] * z;
    out[10] = a[10] * z;
    out[11] = a[11] * z;
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
};

simd.scale = (out, a, v) => {
    const vec = adone.math.simd.Float32x4(v[0], v[1], v[2], 0);

    const a0 = adone.math.simd.Float32x4.load(a, 0);
    adone.math.simd.Float32x4.store(out, 0, adone.math.simd.Float32x4.mul(a0, adone.math.simd.Float32x4.swizzle(vec, 0, 0, 0, 0)));

    const a1 = adone.math.simd.Float32x4.load(a, 4);
    adone.math.simd.Float32x4.store(out, 4, adone.math.simd.Float32x4.mul(a1, adone.math.simd.Float32x4.swizzle(vec, 1, 1, 1, 1)));

    const a2 = adone.math.simd.Float32x4.load(a, 8);
    adone.math.simd.Float32x4.store(out, 8, adone.math.simd.Float32x4.mul(a2, adone.math.simd.Float32x4.swizzle(vec, 2, 2, 2, 2)));

    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
};

export const scale = simd.scale;

export const rotate = (out, a, rad, axis) => {
    let x = axis[0];
    let y = axis[1];
    let z = axis[2];
    let len = Math.sqrt(x * x + y * y + z * z);

    if (Math.abs(len) < adone.math.matrix.EPSILON) {
        return null;
    }

    len = 1 / len;
    x *= len;
    y *= len;
    z *= len;

    const s = Math.sin(rad);
    const c = Math.cos(rad);
    const t = 1 - c;

    const a00 = a[0];
    const a01 = a[1];
    const a02 = a[2];
    const a03 = a[3];
    const a10 = a[4];
    const a11 = a[5];
    const a12 = a[6];
    const a13 = a[7];
    const a20 = a[8];
    const a21 = a[9];
    const a22 = a[10];
    const a23 = a[11];

    // Construct the elements of the rotation matrix
    const b00 = x * x * t + c;
    const b01 = y * x * t + z * s;
    const b02 = z * x * t - y * s;
    const b10 = x * y * t - z * s;
    const b11 = y * y * t + c;
    const b12 = z * y * t + x * s;
    const b20 = x * z * t + y * s;
    const b21 = y * z * t - x * s;
    const b22 = z * z * t + c;

    // Perform rotation-specific matrix multiplication
    out[0] = a00 * b00 + a10 * b01 + a20 * b02;
    out[1] = a01 * b00 + a11 * b01 + a21 * b02;
    out[2] = a02 * b00 + a12 * b01 + a22 * b02;
    out[3] = a03 * b00 + a13 * b01 + a23 * b02;
    out[4] = a00 * b10 + a10 * b11 + a20 * b12;
    out[5] = a01 * b10 + a11 * b11 + a21 * b12;
    out[6] = a02 * b10 + a12 * b11 + a22 * b12;
    out[7] = a03 * b10 + a13 * b11 + a23 * b12;
    out[8] = a00 * b20 + a10 * b21 + a20 * b22;
    out[9] = a01 * b20 + a11 * b21 + a21 * b22;
    out[10] = a02 * b20 + a12 * b21 + a22 * b22;
    out[11] = a03 * b20 + a13 * b21 + a23 * b22;

    if (a !== out) { // If the source and destination differ, copy the unchanged last row
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }
    return out;
};

scalar.rotateX = (out, a, rad) => {
    const s = Math.sin(rad);
    const c = Math.cos(rad);
    const a10 = a[4];
    const a11 = a[5];
    const a12 = a[6];
    const a13 = a[7];
    const a20 = a[8];
    const a21 = a[9];
    const a22 = a[10];
    const a23 = a[11];

    if (a !== out) { // If the source and destination differ, copy the unchanged rows
        out[0] = a[0];
        out[1] = a[1];
        out[2] = a[2];
        out[3] = a[3];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }

    // Perform axis-specific matrix multiplication
    out[4] = a10 * c + a20 * s;
    out[5] = a11 * c + a21 * s;
    out[6] = a12 * c + a22 * s;
    out[7] = a13 * c + a23 * s;
    out[8] = a20 * c - a10 * s;
    out[9] = a21 * c - a11 * s;
    out[10] = a22 * c - a12 * s;
    out[11] = a23 * c - a13 * s;
    return out;
};

simd.rotateX = (out, a, rad) => {
    const s = adone.math.simd.Float32x4.splat(Math.sin(rad));
    const c = adone.math.simd.Float32x4.splat(Math.cos(rad));

    if (a !== out) { // If the source and destination differ, copy the unchanged rows
        out[0] = a[0];
        out[1] = a[1];
        out[2] = a[2];
        out[3] = a[3];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }

    // Perform axis-specific matrix multiplication
    const a1 = adone.math.simd.Float32x4.load(a, 4);
    const a2 = adone.math.simd.Float32x4.load(a, 8);
    adone.math.simd.Float32x4.store(out, 4, adone.math.simd.Float32x4.add(adone.math.simd.Float32x4.mul(a1, c), adone.math.simd.Float32x4.mul(a2, s)));
    adone.math.simd.Float32x4.store(out, 8, adone.math.simd.Float32x4.sub(adone.math.simd.Float32x4.mul(a2, c), adone.math.simd.Float32x4.mul(a1, s)));
    return out;
};

export const rotateX = simd.rotateX;

scalar.rotateY = (out, a, rad) => {
    const s = Math.sin(rad);
    const c = Math.cos(rad);
    const a00 = a[0];
    const a01 = a[1];
    const a02 = a[2];
    const a03 = a[3];
    const a20 = a[8];
    const a21 = a[9];
    const a22 = a[10];
    const a23 = a[11];

    if (a !== out) { // If the source and destination differ, copy the unchanged rows
        out[4] = a[4];
        out[5] = a[5];
        out[6] = a[6];
        out[7] = a[7];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }

    // Perform axis-specific matrix multiplication
    out[0] = a00 * c - a20 * s;
    out[1] = a01 * c - a21 * s;
    out[2] = a02 * c - a22 * s;
    out[3] = a03 * c - a23 * s;
    out[8] = a00 * s + a20 * c;
    out[9] = a01 * s + a21 * c;
    out[10] = a02 * s + a22 * c;
    out[11] = a03 * s + a23 * c;
    return out;
};

simd.rotateY = (out, a, rad) => {
    const s = adone.math.simd.Float32x4.splat(Math.sin(rad));
    const c = adone.math.simd.Float32x4.splat(Math.cos(rad));

    if (a !== out) { // If the source and destination differ, copy the unchanged rows
        out[4] = a[4];
        out[5] = a[5];
        out[6] = a[6];
        out[7] = a[7];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }

    // Perform axis-specific matrix multiplication
    const a0 = adone.math.simd.Float32x4.load(a, 0);
    const a2 = adone.math.simd.Float32x4.load(a, 8);
    adone.math.simd.Float32x4.store(out, 0, adone.math.simd.Float32x4.sub(adone.math.simd.Float32x4.mul(a0, c), adone.math.simd.Float32x4.mul(a2, s)));
    adone.math.simd.Float32x4.store(out, 8, adone.math.simd.Float32x4.add(adone.math.simd.Float32x4.mul(a0, s), adone.math.simd.Float32x4.mul(a2, c)));
    return out;
};

export const rotateY = simd.rotateY;

scalar.rotateZ = (out, a, rad) => {
    const s = Math.sin(rad);
    const c = Math.cos(rad);
    const a00 = a[0];
    const a01 = a[1];
    const a02 = a[2];
    const a03 = a[3];
    const a10 = a[4];
    const a11 = a[5];
    const a12 = a[6];
    const a13 = a[7];

    if (a !== out) { // If the source and destination differ, copy the unchanged last row
        out[8] = a[8];
        out[9] = a[9];
        out[10] = a[10];
        out[11] = a[11];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }

    // Perform axis-specific matrix multiplication
    out[0] = a00 * c + a10 * s;
    out[1] = a01 * c + a11 * s;
    out[2] = a02 * c + a12 * s;
    out[3] = a03 * c + a13 * s;
    out[4] = a10 * c - a00 * s;
    out[5] = a11 * c - a01 * s;
    out[6] = a12 * c - a02 * s;
    out[7] = a13 * c - a03 * s;
    return out;
};

simd.rotateZ = (out, a, rad) => {
    const s = adone.math.simd.Float32x4.splat(Math.sin(rad));
    const c = adone.math.simd.Float32x4.splat(Math.cos(rad));

    if (a !== out) { // If the source and destination differ, copy the unchanged last row
        out[8] = a[8];
        out[9] = a[9];
        out[10] = a[10];
        out[11] = a[11];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }

    // Perform axis-specific matrix multiplication
    const a0 = adone.math.simd.Float32x4.load(a, 0);
    const a1 = adone.math.simd.Float32x4.load(a, 4);
    adone.math.simd.Float32x4.store(out, 0, adone.math.simd.Float32x4.add(adone.math.simd.Float32x4.mul(a0, c), adone.math.simd.Float32x4.mul(a1, s)));
    adone.math.simd.Float32x4.store(out, 4, adone.math.simd.Float32x4.sub(adone.math.simd.Float32x4.mul(a1, c), adone.math.simd.Float32x4.mul(a0, s)));
    return out;
};

export const rotateZ = simd.rotateZ;

export const fromTranslation = (out, v) => {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = v[0];
    out[13] = v[1];
    out[14] = v[2];
    out[15] = 1;
    return out;
};

export const fromScaling = (out, v) => {
    out[0] = v[0];
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = v[1];
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = v[2];
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
};

export const fromRotation = (out, rad, axis) => {
    let x = axis[0];
    let y = axis[1];
    let z = axis[2];
    let len = Math.sqrt(x * x + y * y + z * z);

    if (Math.abs(len) < adone.math.matrix.EPSILON) {
        return null;
    }

    len = 1 / len;
    x *= len;
    y *= len;
    z *= len;

    const s = Math.sin(rad);
    const c = Math.cos(rad);
    const t = 1 - c;

    // Perform rotation-specific matrix multiplication
    out[0] = x * x * t + c;
    out[1] = y * x * t + z * s;
    out[2] = z * x * t - y * s;
    out[3] = 0;
    out[4] = x * y * t - z * s;
    out[5] = y * y * t + c;
    out[6] = z * y * t + x * s;
    out[7] = 0;
    out[8] = x * z * t + y * s;
    out[9] = y * z * t - x * s;
    out[10] = z * z * t + c;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
};

export const fromXRotation = (out, rad) => {
    const s = Math.sin(rad);
    const c = Math.cos(rad);

    // Perform axis-specific matrix multiplication
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = c;
    out[6] = s;
    out[7] = 0;
    out[8] = 0;
    out[9] = -s;
    out[10] = c;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
};

export const fromYRotation = (out, rad) => {
    const s = Math.sin(rad);
    const c = Math.cos(rad);

    // Perform axis-specific matrix multiplication
    out[0] = c;
    out[1] = 0;
    out[2] = -s;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = s;
    out[9] = 0;
    out[10] = c;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
};

export const fromZRotation = (out, rad) => {
    const s = Math.sin(rad);
    const c = Math.cos(rad);

    // Perform axis-specific matrix multiplication
    out[0] = c;
    out[1] = s;
    out[2] = 0;
    out[3] = 0;
    out[4] = -s;
    out[5] = c;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
};

export const fromRotationTranslation = (out, q, v) => {
    // Quaternion math
    const x = q[0];
    const y = q[1];
    const z = q[2];
    const w = q[3];
    const x2 = x + x;
    const y2 = y + y;
    const z2 = z + z;

    const xx = x * x2;
    const xy = x * y2;
    const xz = x * z2;
    const yy = y * y2;
    const yz = y * z2;
    const zz = z * z2;
    const wx = w * x2;
    const wy = w * y2;
    const wz = w * z2;

    out[0] = 1 - (yy + zz);
    out[1] = xy + wz;
    out[2] = xz - wy;
    out[3] = 0;
    out[4] = xy - wz;
    out[5] = 1 - (xx + zz);
    out[6] = yz + wx;
    out[7] = 0;
    out[8] = xz + wy;
    out[9] = yz - wx;
    out[10] = 1 - (xx + yy);
    out[11] = 0;
    out[12] = v[0];
    out[13] = v[1];
    out[14] = v[2];
    out[15] = 1;

    return out;
};

export const getTranslation = (out, mat) => {
    out[0] = mat[12];
    out[1] = mat[13];
    out[2] = mat[14];

    return out;
};

export const getScaling = (out, mat) => {
    const m11 = mat[0];
    const m12 = mat[1];
    const m13 = mat[2];
    const m21 = mat[4];
    const m22 = mat[5];
    const m23 = mat[6];
    const m31 = mat[8];
    const m32 = mat[9];
    const m33 = mat[10];

    out[0] = Math.sqrt(m11 * m11 + m12 * m12 + m13 * m13);
    out[1] = Math.sqrt(m21 * m21 + m22 * m22 + m23 * m23);
    out[2] = Math.sqrt(m31 * m31 + m32 * m32 + m33 * m33);

    return out;
};

export const getRotation = (out, mat) => {
    // Algorithm taken from http://www.euclideanspace.com/maths/geometry/rotations/conversions/matrixToQuaternion/index.htm
    const trace = mat[0] + mat[5] + mat[10];
    let S = 0;

    if (trace > 0) {
        S = Math.sqrt(trace + 1.0) * 2;
        out[3] = 0.25 * S;
        out[0] = (mat[6] - mat[9]) / S;
        out[1] = (mat[8] - mat[2]) / S;
        out[2] = (mat[1] - mat[4]) / S;
    } else if ((mat[0] > mat[5]) & (mat[0] > mat[10])) {
        S = Math.sqrt(1.0 + mat[0] - mat[5] - mat[10]) * 2;
        out[3] = (mat[6] - mat[9]) / S;
        out[0] = 0.25 * S;
        out[1] = (mat[1] + mat[4]) / S;
        out[2] = (mat[8] + mat[2]) / S;
    } else if (mat[5] > mat[10]) {
        S = Math.sqrt(1.0 + mat[5] - mat[0] - mat[10]) * 2;
        out[3] = (mat[8] - mat[2]) / S;
        out[0] = (mat[1] + mat[4]) / S;
        out[1] = 0.25 * S;
        out[2] = (mat[6] + mat[9]) / S;
    } else {
        S = Math.sqrt(1.0 + mat[10] - mat[0] - mat[5]) * 2;
        out[3] = (mat[1] - mat[4]) / S;
        out[0] = (mat[8] + mat[2]) / S;
        out[1] = (mat[6] + mat[9]) / S;
        out[2] = 0.25 * S;
    }

    return out;
};

export const fromRotationTranslationScale = (out, q, v, s) => {
    // Quaternion math
    const x = q[0];
    const y = q[1];
    const z = q[2];
    const w = q[3];
    const x2 = x + x;
    const y2 = y + y;
    const z2 = z + z;

    const xx = x * x2;
    const xy = x * y2;
    const xz = x * z2;
    const yy = y * y2;
    const yz = y * z2;
    const zz = z * z2;
    const wx = w * x2;
    const wy = w * y2;
    const wz = w * z2;
    const sx = s[0];
    const sy = s[1];
    const sz = s[2];

    out[0] = (1 - (yy + zz)) * sx;
    out[1] = (xy + wz) * sx;
    out[2] = (xz - wy) * sx;
    out[3] = 0;
    out[4] = (xy - wz) * sy;
    out[5] = (1 - (xx + zz)) * sy;
    out[6] = (yz + wx) * sy;
    out[7] = 0;
    out[8] = (xz + wy) * sz;
    out[9] = (yz - wx) * sz;
    out[10] = (1 - (xx + yy)) * sz;
    out[11] = 0;
    out[12] = v[0];
    out[13] = v[1];
    out[14] = v[2];
    out[15] = 1;

    return out;
};

export const fromRotationTranslationScaleOrigin = (out, q, v, s, o) => {
    // Quaternion math
    const x = q[0];
    const y = q[1];
    const z = q[2];
    const w = q[3];
    const x2 = x + x;
    const y2 = y + y;
    const z2 = z + z;

    const xx = x * x2;
    const xy = x * y2;
    const xz = x * z2;
    const yy = y * y2;
    const yz = y * z2;
    const zz = z * z2;
    const wx = w * x2;
    const wy = w * y2;
    const wz = w * z2;

    const sx = s[0];
    const sy = s[1];
    const sz = s[2];

    const ox = o[0];
    const oy = o[1];
    const oz = o[2];

    out[0] = (1 - (yy + zz)) * sx;
    out[1] = (xy + wz) * sx;
    out[2] = (xz - wy) * sx;
    out[3] = 0;
    out[4] = (xy - wz) * sy;
    out[5] = (1 - (xx + zz)) * sy;
    out[6] = (yz + wx) * sy;
    out[7] = 0;
    out[8] = (xz + wy) * sz;
    out[9] = (yz - wx) * sz;
    out[10] = (1 - (xx + yy)) * sz;
    out[11] = 0;
    out[12] = v[0] + ox - (out[0] * ox + out[4] * oy + out[8] * oz);
    out[13] = v[1] + oy - (out[1] * ox + out[5] * oy + out[9] * oz);
    out[14] = v[2] + oz - (out[2] * ox + out[6] * oy + out[10] * oz);
    out[15] = 1;

    return out;
};

export const fromQuat = (out, q) => {
    const x = q[0];
    const y = q[1];
    const z = q[2];
    const w = q[3];
    const x2 = x + x;
    const y2 = y + y;
    const z2 = z + z;

    const xx = x * x2;
    const yx = y * x2;
    const yy = y * y2;
    const zx = z * x2;
    const zy = z * y2;
    const zz = z * z2;
    const wx = w * x2;
    const wy = w * y2;
    const wz = w * z2;

    out[0] = 1 - yy - zz;
    out[1] = yx + wz;
    out[2] = zx - wy;
    out[3] = 0;

    out[4] = yx - wz;
    out[5] = 1 - xx - zz;
    out[6] = zy + wx;
    out[7] = 0;

    out[8] = zx + wy;
    out[9] = zy - wx;
    out[10] = 1 - xx - yy;
    out[11] = 0;

    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;

    return out;
};

export const frustum = (out, left, right, bottom, top, near, far) => {
    const rl = 1 / (right - left);
    const tb = 1 / (top - bottom);
    const nf = 1 / (near - far);

    out[0] = (near * 2) * rl;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = (near * 2) * tb;
    out[6] = 0;
    out[7] = 0;
    out[8] = (right + left) * rl;
    out[9] = (top + bottom) * tb;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = (far * near * 2) * nf;
    out[15] = 0;
    return out;
};

export const perspective = (out, fovy, aspect, near, far) => {
    const f = 1.0 / Math.tan(fovy / 2);
    const nf = 1 / (near - far);
    out[0] = f / aspect;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = f;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = (2 * far * near) * nf;
    out[15] = 0;
    return out;
};

export const perspectiveFromFieldOfView = (out, fov, near, far) => {
    const upTan = Math.tan(fov.upDegrees * Math.PI / 180.0);
    const downTan = Math.tan(fov.downDegrees * Math.PI / 180.0);
    const leftTan = Math.tan(fov.leftDegrees * Math.PI / 180.0);
    const rightTan = Math.tan(fov.rightDegrees * Math.PI / 180.0);
    const xScale = 2.0 / (leftTan + rightTan);
    const yScale = 2.0 / (upTan + downTan);

    out[0] = xScale;
    out[1] = 0.0;
    out[2] = 0.0;
    out[3] = 0.0;
    out[4] = 0.0;
    out[5] = yScale;
    out[6] = 0.0;
    out[7] = 0.0;
    out[8] = -((leftTan - rightTan) * xScale * 0.5);
    out[9] = ((upTan - downTan) * yScale * 0.5);
    out[10] = far / (near - far);
    out[11] = -1.0;
    out[12] = 0.0;
    out[13] = 0.0;
    out[14] = (far * near) / (near - far);
    out[15] = 0.0;
    return out;
};

export const ortho = (out, left, right, bottom, top, near, far) => {
    const lr = 1 / (left - right);
    const bt = 1 / (bottom - top);
    const nf = 1 / (near - far);

    out[0] = -2 * lr;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = -2 * bt;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 2 * nf;
    out[11] = 0;
    out[12] = (left + right) * lr;
    out[13] = (top + bottom) * bt;
    out[14] = (far + near) * nf;
    out[15] = 1;
    return out;
};

export const lookAt = (out, eye, center, up) => {
    let x0;
    let x1;
    let x2;
    let y0;
    let y1;
    let y2;
    let z0;
    let z1;
    let z2;
    let len;

    const eyex = eye[0];
    const eyey = eye[1];
    const eyez = eye[2];
    const upx = up[0];
    const upy = up[1];
    const upz = up[2];
    const centerx = center[0];
    const centery = center[1];
    const centerz = center[2];

    if (Math.abs(eyex - centerx) < adone.math.matrix.EPSILON &&
        Math.abs(eyey - centery) < adone.math.matrix.EPSILON &&
        Math.abs(eyez - centerz) < adone.math.matrix.EPSILON) {
        return identity(out);
    }

    z0 = eyex - centerx;
    z1 = eyey - centery;
    z2 = eyez - centerz;

    len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
    z0 *= len;
    z1 *= len;
    z2 *= len;

    x0 = upy * z2 - upz * z1;
    x1 = upz * z0 - upx * z2;
    x2 = upx * z1 - upy * z0;
    len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
    if (!len) {
        x0 = 0;
        x1 = 0;
        x2 = 0;
    } else {
        len = 1 / len;
        x0 *= len;
        x1 *= len;
        x2 *= len;
    }

    y0 = z1 * x2 - z2 * x1;
    y1 = z2 * x0 - z0 * x2;
    y2 = z0 * x1 - z1 * x0;

    len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
    if (!len) {
        y0 = 0;
        y1 = 0;
        y2 = 0;
    } else {
        len = 1 / len;
        y0 *= len;
        y1 *= len;
        y2 *= len;
    }

    out[0] = x0;
    out[1] = y0;
    out[2] = z0;
    out[3] = 0;
    out[4] = x1;
    out[5] = y1;
    out[6] = z1;
    out[7] = 0;
    out[8] = x2;
    out[9] = y2;
    out[10] = z2;
    out[11] = 0;
    out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
    out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
    out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
    out[15] = 1;

    return out;
};

export const str = (a) => {
    return `mat4(${a[0]}, ${a[1]}, ${a[2]}, ${a[3]}, ${a[4]}, ${a[5]}, ${a[6]}, ${a[7]}, ${a[8]}, ${a[9]}, ${a[10]}, ${a[11]}, ${a[12]}, ${a[13]}, ${a[14]}, ${a[15]})`;
};

export const frob = (a) => {
    return (Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2) + Math.pow(a[3], 2) + Math.pow(a[4], 2) + Math.pow(a[5], 2) + Math.pow(a[6], 2) + Math.pow(a[7], 2) + Math.pow(a[8], 2) + Math.pow(a[9], 2) + Math.pow(a[10], 2) + Math.pow(a[11], 2) + Math.pow(a[12], 2) + Math.pow(a[13], 2) + Math.pow(a[14], 2) + Math.pow(a[15], 2)));
};

export const add = (out, a, b) => {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    out[3] = a[3] + b[3];
    out[4] = a[4] + b[4];
    out[5] = a[5] + b[5];
    out[6] = a[6] + b[6];
    out[7] = a[7] + b[7];
    out[8] = a[8] + b[8];
    out[9] = a[9] + b[9];
    out[10] = a[10] + b[10];
    out[11] = a[11] + b[11];
    out[12] = a[12] + b[12];
    out[13] = a[13] + b[13];
    out[14] = a[14] + b[14];
    out[15] = a[15] + b[15];
    return out;
};

export const subtract = (out, a, b) => {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    out[3] = a[3] - b[3];
    out[4] = a[4] - b[4];
    out[5] = a[5] - b[5];
    out[6] = a[6] - b[6];
    out[7] = a[7] - b[7];
    out[8] = a[8] - b[8];
    out[9] = a[9] - b[9];
    out[10] = a[10] - b[10];
    out[11] = a[11] - b[11];
    out[12] = a[12] - b[12];
    out[13] = a[13] - b[13];
    out[14] = a[14] - b[14];
    out[15] = a[15] - b[15];
    return out;
};

export const sub = subtract;

export const multiplyScalar = (out, a, b) => {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    out[2] = a[2] * b;
    out[3] = a[3] * b;
    out[4] = a[4] * b;
    out[5] = a[5] * b;
    out[6] = a[6] * b;
    out[7] = a[7] * b;
    out[8] = a[8] * b;
    out[9] = a[9] * b;
    out[10] = a[10] * b;
    out[11] = a[11] * b;
    out[12] = a[12] * b;
    out[13] = a[13] * b;
    out[14] = a[14] * b;
    out[15] = a[15] * b;
    return out;
};

export const multiplyScalarAndAdd = (out, a, b, scale) => {
    out[0] = a[0] + (b[0] * scale);
    out[1] = a[1] + (b[1] * scale);
    out[2] = a[2] + (b[2] * scale);
    out[3] = a[3] + (b[3] * scale);
    out[4] = a[4] + (b[4] * scale);
    out[5] = a[5] + (b[5] * scale);
    out[6] = a[6] + (b[6] * scale);
    out[7] = a[7] + (b[7] * scale);
    out[8] = a[8] + (b[8] * scale);
    out[9] = a[9] + (b[9] * scale);
    out[10] = a[10] + (b[10] * scale);
    out[11] = a[11] + (b[11] * scale);
    out[12] = a[12] + (b[12] * scale);
    out[13] = a[13] + (b[13] * scale);
    out[14] = a[14] + (b[14] * scale);
    out[15] = a[15] + (b[15] * scale);
    return out;
};

export const exactEquals = (a, b) => {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3] &&
        a[4] === b[4] && a[5] === b[5] && a[6] === b[6] && a[7] === b[7] &&
        a[8] === b[8] && a[9] === b[9] && a[10] === b[10] && a[11] === b[11] &&
        a[12] === b[12] && a[13] === b[13] && a[14] === b[14] && a[15] === b[15];
};

export const equals = (a, b) => {
    const a0 = a[0];
    const a1 = a[1];
    const a2 = a[2];
    const a3 = a[3];
    const a4 = a[4];
    const a5 = a[5];
    const a6 = a[6];
    const a7 = a[7];
    const a8 = a[8];
    const a9 = a[9];
    const a10 = a[10];
    const a11 = a[11];
    const a12 = a[12];
    const a13 = a[13];
    const a14 = a[14];
    const a15 = a[15];

    const b0 = b[0];
    const b1 = b[1];
    const b2 = b[2];
    const b3 = b[3];
    const b4 = b[4];
    const b5 = b[5];
    const b6 = b[6];
    const b7 = b[7];
    const b8 = b[8];
    const b9 = b[9];
    const b10 = b[10];
    const b11 = b[11];
    const b12 = b[12];
    const b13 = b[13];
    const b14 = b[14];
    const b15 = b[15];

    return (Math.abs(a0 - b0) <= adone.math.matrix.EPSILON * Math.max(1.0, Math.abs(a0), Math.abs(b0)) &&
        Math.abs(a1 - b1) <= adone.math.matrix.EPSILON * Math.max(1.0, Math.abs(a1), Math.abs(b1)) &&
        Math.abs(a2 - b2) <= adone.math.matrix.EPSILON * Math.max(1.0, Math.abs(a2), Math.abs(b2)) &&
        Math.abs(a3 - b3) <= adone.math.matrix.EPSILON * Math.max(1.0, Math.abs(a3), Math.abs(b3)) &&
        Math.abs(a4 - b4) <= adone.math.matrix.EPSILON * Math.max(1.0, Math.abs(a4), Math.abs(b4)) &&
        Math.abs(a5 - b5) <= adone.math.matrix.EPSILON * Math.max(1.0, Math.abs(a5), Math.abs(b5)) &&
        Math.abs(a6 - b6) <= adone.math.matrix.EPSILON * Math.max(1.0, Math.abs(a6), Math.abs(b6)) &&
        Math.abs(a7 - b7) <= adone.math.matrix.EPSILON * Math.max(1.0, Math.abs(a7), Math.abs(b7)) &&
        Math.abs(a8 - b8) <= adone.math.matrix.EPSILON * Math.max(1.0, Math.abs(a8), Math.abs(b8)) &&
        Math.abs(a9 - b9) <= adone.math.matrix.EPSILON * Math.max(1.0, Math.abs(a9), Math.abs(b9)) &&
        Math.abs(a10 - b10) <= adone.math.matrix.EPSILON * Math.max(1.0, Math.abs(a10), Math.abs(b10)) &&
        Math.abs(a11 - b11) <= adone.math.matrix.EPSILON * Math.max(1.0, Math.abs(a11), Math.abs(b11)) &&
        Math.abs(a12 - b12) <= adone.math.matrix.EPSILON * Math.max(1.0, Math.abs(a12), Math.abs(b12)) &&
        Math.abs(a13 - b13) <= adone.math.matrix.EPSILON * Math.max(1.0, Math.abs(a13), Math.abs(b13)) &&
        Math.abs(a14 - b14) <= adone.math.matrix.EPSILON * Math.max(1.0, Math.abs(a14), Math.abs(b14)) &&
        Math.abs(a15 - b15) <= adone.math.matrix.EPSILON * Math.max(1.0, Math.abs(a15), Math.abs(b15)));
};
