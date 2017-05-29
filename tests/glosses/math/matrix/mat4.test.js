import equality from "./equality";
const { mat4, vec3, quat } = adone.math.matrix;

const buildMat4Tests = (useSIMD) => {
    let out;
    let matA;
    let matB;
    let identity;
    let result;

    mat4.TEST_PATH = useSIMD ? mat4.simd : mat4.scalar;

    return function () {
        beforeEach(() => {
            // Attempting to portray a semi-realistic transform matrix
            matA = Float32Array.from([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 2, 3, 1]);

            matB = Float32Array.from([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 4, 5, 6, 1]);

            out = Float32Array.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

            identity = Float32Array.from([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
        });

        describe("create", () => {
            beforeEach(() => {
                result = mat4.create();
            });
            it("should return a 16 element array initialized to a 4x4 identity matrix", () => {
                equality(result, identity);
            });
        });

        describe("clone", () => {
            beforeEach(() => {
                result = mat4.clone(matA);
            });
            it("should return a 16 element array initialized to the values in matA", () => {
                equality(result, matA);
            });
        });

        describe("copy", () => {
            beforeEach(() => {
                result = mat4.copy(out, matA);
            });
            it("should place values into out", () => {
                equality(out, matA);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
        });

        describe("identity", () => {
            beforeEach(() => {
                result = mat4.identity(out);
            });
            it("should place values into out", () => {
                equality(result, identity);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
        });

        describe("transpose", () => {
            describe("with a separate output matrix", () => {
                beforeEach(() => {
                    result = mat4.TEST_PATH.transpose(out, matA);
                });

                it("should place values into out", () => {
                    equality(out, [1, 0, 0, 1, 0, 1, 0, 2, 0, 0, 1, 3, 0, 0, 0, 1]);
                });
                it("should return out", () => {
                    assert.equal(result, out);
                });
                it("should not modify matA", () => {
                    equality(matA, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 2, 3, 1]);
                });
            });

            describe("when matA is the output matrix", () => {
                beforeEach(() => {
                    result = mat4.TEST_PATH.transpose(matA, matA);
                });

                it("should place values into matA", () => {
                    equality(matA, [
                        1, 0, 0, 1,
                        0, 1, 0, 2,
                        0, 0, 1, 3,
                        0, 0, 0, 1
                    ]);
                });
                it("should return matA", () => {
                    assert.equal(result, matA);
                });
            });
        });

        describe("invert", () => {
            describe("with a separate output matrix", () => {
                beforeEach(() => {
                    result = mat4.TEST_PATH.invert(out, matA);
                });

                it("should place values into out", () => {
                    equality(out, [
                        1, 0, 0, 0,
                        0, 1, 0, 0,
                        0, 0, 1, 0,
                        -1, -2, -3, 1
                    ]);
                });
                it("should return out", () => {
                    assert.equal(result, out);
                });
                it("should not modify matA", () => {
                    equality(matA, [
                        1, 0, 0, 0,
                        0, 1, 0, 0,
                        0, 0, 1, 0,
                        1, 2, 3, 1
                    ]);
                });
            });

            describe("when matA is the output matrix", () => {
                beforeEach(() => {
                    result = mat4.TEST_PATH.invert(matA, matA);
                });

                it("should place values into matA", () => {
                    equality(matA, [
                        1, 0, 0, 0,
                        0, 1, 0, 0,
                        0, 0, 1, 0,
                        -1, -2, -3, 1
                    ]);
                });
                it("should return matA", () => {
                    assert.equal(result, matA);
                });
            });
        });

        describe("adjoint", () => {
            describe("with a separate output matrix", () => {
                beforeEach(() => {
                    result = mat4.TEST_PATH.adjoint(out, matA);
                });

                it("should place values into out", () => {
                    equality(out, [
                        1, 0, 0, 0,
                        0, 1, 0, 0,
                        0, 0, 1, 0,
                        -1, -2, -3, 1
                    ]);
                });
                it("should return out", () => {
                    assert.equal(result, out);
                });
                it("should not modify matA", () => {
                    equality(matA, [
                        1, 0, 0, 0,
                        0, 1, 0, 0,
                        0, 0, 1, 0,
                        1, 2, 3, 1
                    ]);
                });
            });

            describe("when matA is the output matrix", () => {
                beforeEach(() => {
                    result = mat4.TEST_PATH.adjoint(matA, matA);
                });

                it("should place values into matA", () => {
                    equality(matA, [
                        1, 0, 0, 0,
                        0, 1, 0, 0,
                        0, 0, 1, 0,
                        -1, -2, -3, 1
                    ]);
                });
                it("should return matA", () => {
                    assert.equal(result, matA);
                });
            });
        });

        describe("determinant", () => {
            beforeEach(() => {
                result = mat4.determinant(matA);
            });

            it("should return the determinant", () => {
                assert.equal(result, 1);
            });
        });

        describe("multiply", () => {
            it("should have an alias called 'mul'", () => {
                assert.equal(mat4.mul, mat4.multiply);
            });

            describe("with a separate output matrix", () => {
                beforeEach(() => {
                    result = mat4.TEST_PATH.multiply(out, matA, matB);
                });

                it("should place values into out", () => {
                    equality(out, [
                        1, 0, 0, 0,
                        0, 1, 0, 0,
                        0, 0, 1, 0,
                        5, 7, 9, 1
                    ]);
                });
                it("should return out", () => {
                    assert.equal(result, out);
                });
                it("should not modify matA", () => {
                    equality(matA, [
                        1, 0, 0, 0,
                        0, 1, 0, 0,
                        0, 0, 1, 0,
                        1, 2, 3, 1
                    ]);
                });
                it("should not modify matB", () => {
                    equality(matB, [
                        1, 0, 0, 0,
                        0, 1, 0, 0,
                        0, 0, 1, 0,
                        4, 5, 6, 1
                    ]);
                });
            });

            describe("when matA is the output matrix", () => {
                beforeEach(() => {
                    result = mat4.TEST_PATH.multiply(matA, matA, matB);
                });

                it("should place values into matA", () => {
                    equality(matA, [
                        1, 0, 0, 0,
                        0, 1, 0, 0,
                        0, 0, 1, 0,
                        5, 7, 9, 1
                    ]);
                });
                it("should return matA", () => {
                    assert.equal(result, matA);
                });
                it("should not modify matB", () => {
                    equality(matB, [
                        1, 0, 0, 0,
                        0, 1, 0, 0,
                        0, 0, 1, 0,
                        4, 5, 6, 1
                    ]);
                });
            });

            describe("when matB is the output matrix", () => {
                beforeEach(() => {
                    result = mat4.TEST_PATH.multiply(matB, matA, matB);
                });

                it("should place values into matB", () => {
                    equality(matB, [
                        1, 0, 0, 0,
                        0, 1, 0, 0,
                        0, 0, 1, 0,
                        5, 7, 9, 1
                    ]);
                });
                it("should return matB", () => {
                    assert.equal(result, matB);
                });
                it("should not modify matA", () => {
                    equality(matA, [
                        1, 0, 0, 0,
                        0, 1, 0, 0,
                        0, 0, 1, 0,
                        1, 2, 3, 1
                    ]);
                });
            });
        });

        describe("translate", () => {
            describe("with a separate output matrix", () => {
                beforeEach(() => {
                    result = mat4.TEST_PATH.translate(out, matA, [4, 5, 6]);
                });

                it("should place values into out", () => {
                    equality(out, [
                        1, 0, 0, 0,
                        0, 1, 0, 0,
                        0, 0, 1, 0,
                        5, 7, 9, 1
                    ]);
                });
                it("should return out", () => {
                    assert.equal(result, out);
                });
                it("should not modify matA", () => {
                    equality(matA, [
                        1, 0, 0, 0,
                        0, 1, 0, 0,
                        0, 0, 1, 0,
                        1, 2, 3, 1
                    ]);
                });
            });

            describe("when matA is the output matrix", () => {
                beforeEach(() => {
                    result = mat4.TEST_PATH.translate(matA, matA, [4, 5, 6]);
                });

                it("should place values into matA", () => {
                    equality(matA, [
                        1, 0, 0, 0,
                        0, 1, 0, 0,
                        0, 0, 1, 0,
                        5, 7, 9, 1
                    ]);
                });
                it("should return matA", () => {
                    assert.equal(result, matA);
                });
            });
        });

        describe("scale", () => {
            describe("with a separate output matrix", () => {
                beforeEach(() => {
                    result = mat4.TEST_PATH.scale(out, matA, [4, 5, 6]);
                });

                it("should place values into out", () => {
                    equality(out, [
                        4, 0, 0, 0,
                        0, 5, 0, 0,
                        0, 0, 6, 0,
                        1, 2, 3, 1
                    ]);
                });
                it("should return out", () => {
                    assert.equal(result, out);
                });
                it("should not modify matA", () => {
                    equality(matA, [
                        1, 0, 0, 0,
                        0, 1, 0, 0,
                        0, 0, 1, 0,
                        1, 2, 3, 1
                    ]);
                });
            });

            describe("when matA is the output matrix", () => {
                beforeEach(() => {
                    result = mat4.TEST_PATH.scale(matA, matA, [4, 5, 6]);
                });

                it("should place values into matA", () => {
                    equality(matA, [
                        4, 0, 0, 0,
                        0, 5, 0, 0,
                        0, 0, 6, 0,
                        1, 2, 3, 1
                    ]);
                });
                it("should return matA", () => {
                    assert.equal(result, matA);
                });
            });
        });

        describe("rotate", () => {
            const rad = Math.PI * 0.5;
            const axis = [1, 0, 0];

            describe("with a separate output matrix", () => {
                beforeEach(() => {
                    result = mat4.rotate(out, matA, rad, axis);
                });

                it("should place values into out", () => {
                    equality(out, [
                        1, 0, 0, 0,
                        0, Math.cos(rad), Math.sin(rad), 0,
                        0, -Math.sin(rad), Math.cos(rad), 0,
                        1, 2, 3, 1
                    ]);
                });
                it("should return out", () => {
                    assert.equal(result, out);
                });
                it("should not modify matA", () => {
                    equality(matA, [
                        1, 0, 0, 0,
                        0, 1, 0, 0,
                        0, 0, 1, 0,
                        1, 2, 3, 1
                    ]);
                });
            });

            describe("when matA is the output matrix", () => {
                beforeEach(() => {
                    result = mat4.rotate(matA, matA, rad, axis);
                });

                it("should place values into matA", () => {
                    equality(matA, [
                        1, 0, 0, 0,
                        0, Math.cos(rad), Math.sin(rad), 0,
                        0, -Math.sin(rad), Math.cos(rad), 0,
                        1, 2, 3, 1
                    ]);
                });
                it("should return matA", () => {
                    assert.equal(result, matA);
                });
            });
        });

        describe("rotateX", () => {
            const rad = Math.PI * 0.5;

            describe("with a separate output matrix", () => {
                beforeEach(() => {
                    result = mat4.TEST_PATH.rotateX(out, matA, rad);
                });

                it("should place values into out", () => {
                    equality(out, [
                        1, 0, 0, 0,
                        0, Math.cos(rad), Math.sin(rad), 0,
                        0, -Math.sin(rad), Math.cos(rad), 0,
                        1, 2, 3, 1
                    ]);
                });
                it("should return out", () => {
                    assert.equal(result, out);
                });
                it("should not modify matA", () => {
                    equality(matA, [
                        1, 0, 0, 0,
                        0, 1, 0, 0,
                        0, 0, 1, 0,
                        1, 2, 3, 1
                    ]);
                });
            });

            describe("when matA is the output matrix", () => {
                beforeEach(() => {
                    result = mat4.TEST_PATH.rotateX(matA, matA, rad);
                });

                it("should place values into matA", () => {
                    equality(matA, [
                        1, 0, 0, 0,
                        0, Math.cos(rad), Math.sin(rad), 0,
                        0, -Math.sin(rad), Math.cos(rad), 0,
                        1, 2, 3, 1
                    ]);
                });
                it("should return matA", () => {
                    assert.equal(result, matA);
                });
            });
        });

        describe("rotateY", () => {
            const rad = Math.PI * 0.5;

            describe("with a separate output matrix", () => {
                beforeEach(() => {
                    result = mat4.TEST_PATH.rotateY(out, matA, rad);
                });

                it("should place values into out", () => {
                    equality(out, [
                        Math.cos(rad), 0, -Math.sin(rad), 0,
                        0, 1, 0, 0,
                        Math.sin(rad), 0, Math.cos(rad), 0,
                        1, 2, 3, 1
                    ]);
                });
                it("should return out", () => {
                    assert.equal(result, out);
                });
                it("should not modify matA", () => {
                    equality(matA, [
                        1, 0, 0, 0,
                        0, 1, 0, 0,
                        0, 0, 1, 0,
                        1, 2, 3, 1
                    ]);
                });
            });

            describe("when matA is the output matrix", () => {
                beforeEach(() => {
                    result = mat4.TEST_PATH.rotateY(matA, matA, rad);
                });

                it("should place values into matA", () => {
                    equality(matA, [
                        Math.cos(rad), 0, -Math.sin(rad), 0,
                        0, 1, 0, 0,
                        Math.sin(rad), 0, Math.cos(rad), 0,
                        1, 2, 3, 1
                    ]);
                });
                it("should return matA", () => {
                    assert.equal(result, matA);
                });
            });
        });

        describe("rotateZ", () => {
            const rad = Math.PI * 0.5;

            describe("with a separate output matrix", () => {
                beforeEach(() => {
                    result = mat4.TEST_PATH.rotateZ(out, matA, rad);
                });

                it("should place values into out", () => {
                    equality(out, [
                        Math.cos(rad), Math.sin(rad), 0, 0,
                        -Math.sin(rad), Math.cos(rad), 0, 0,
                        0, 0, 1, 0,
                        1, 2, 3, 1
                    ]);
                });
                it("should return out", () => {
                    assert.equal(result, out);
                });
                it("should not modify matA", () => {
                    equality(matA, [
                        1, 0, 0, 0,
                        0, 1, 0, 0,
                        0, 0, 1, 0,
                        1, 2, 3, 1
                    ]);
                });
            });

            describe("when matA is the output matrix", () => {
                beforeEach(() => {
                    result = mat4.TEST_PATH.rotateZ(matA, matA, rad);
                });

                it("should place values into matA", () => {
                    equality(matA, [
                        Math.cos(rad), Math.sin(rad), 0, 0,
                        -Math.sin(rad), Math.cos(rad), 0, 0,
                        0, 0, 1, 0,
                        1, 2, 3, 1
                    ]);
                });
                it("should return matA", () => {
                    assert.equal(result, matA);
                });
            });
        });

        // TODO: fromRotationTranslation

        describe("getTranslation", () => {
            describe("from the identity matrix", () => {
                beforeEach(() => {
                    result = vec3.fromValues(1, 2, 3);
                    out = vec3.fromValues(1, 2, 3);
                    result = mat4.getTranslation(out, identity);
                });
                it("should place result both in result and out", () => {
                    assert.equal(result, out);
                });
                it("should return the zero vector", () => {
                    equality(result, [0, 0, 0]);
                });
            });

            describe("from a translation-only matrix", () => {
                beforeEach(() => {
                    result = vec3.fromValues(1, 2, 3);
                    out = vec3.fromValues(1, 2, 3);
                    result = mat4.getTranslation(out, matB);
                });
                it("should return translation vector", () => {
                    equality(out, [4, 5, 6]);
                });
            });

            describe("from a translation and rotation matrix", () => {
                beforeEach(() => {
                    let q = quat.create();
                    const v = vec3.fromValues(5, 6, 7);
                    q = quat.setAxisAngle(q, [0.26726124, 0.534522474, 0.8017837], 0.55);
                    mat4.fromRotationTranslation(out, q, v);

                    result = vec3.create();
                    mat4.getTranslation(result, out);
                });
                it("should keep the same translation vector, regardless of rotation", () => {
                    equality(result, [5, 6, 7]);
                });
            });
        });

        describe("getScaling", () => {
            describe("from the identity matrix", () => {
                beforeEach(() => {
                    result = vec3.fromValues(1, 2, 3);
                    out = vec3.fromValues(1, 2, 3);
                    result = mat4.getScaling(out, identity);
                });
                it("should place result both in result and out", () => {
                    assert.equal(result, out);
                });
                it("should return the identity vector", () => {
                    equality(result, [1, 1, 1]);
                });
            });

            describe("from a scale-only matrix", () => {
                beforeEach(() => {
                    const v = vec3.fromValues(4, 5, 6);
                    result = vec3.fromValues(1, 2, 3);
                    out = vec3.fromValues(1, 2, 3);
                    mat4.fromScaling(matA, v);
                    result = mat4.getScaling(out, matA);
                });
                it("should return translation vector", () => {
                    equality(out, [4, 5, 6]);
                });
            });

            describe("from a translation and rotation matrix", () => {
                beforeEach(() => {
                    let q = quat.create();
                    const v = vec3.fromValues(5, 6, 7);
                    q = quat.setAxisAngle(q, [1, 0, 0], 0.5);
                    mat4.fromRotationTranslation(out, q, v);

                    result = vec3.fromValues(1, 2, 3);
                    mat4.getScaling(result, out);
                });
                it("should return the identity vector", () => {
                    equality(result, [1, 1, 1]);
                });
            });

            describe("from a translation, rotation and scale matrix", () => {
                beforeEach(() => {
                    let q = quat.create();
                    const t = vec3.fromValues(1, 2, 3);
                    const s = vec3.fromValues(5, 6, 7);
                    q = quat.setAxisAngle(q, [0, 1, 0], 0.7);
                    mat4.fromRotationTranslationScale(out, q, t, s);
                    result = vec3.fromValues(5, 6, 7);
                    mat4.getScaling(result, out);
                });
                it("should return the same scaling factor when created", () => {
                    equality(result, [5, 6, 7]);
                });
            });

        });

        describe("getRotation", () => {
            describe("from the identity matrix", () => {
                beforeEach(() => {
                    result = quat.fromValues(1, 2, 3, 4);
                    out = quat.fromValues(1, 2, 3, 4);
                    result = mat4.getRotation(out, identity);
                });
                it("should place result both in result and out", () => {
                    assert.equal(result, out);
                });
                it("should return the unit quaternion", () => {
                    const unitQuat = quat.create();
                    quat.identity(unitQuat);
                    equality(result, unitQuat);
                });
            });

            describe("from a translation-only matrix", () => {
                beforeEach(() => {
                    result = quat.fromValues(1, 2, 3, 4);
                    out = quat.fromValues(1, 2, 3, 4);
                    result = mat4.getRotation(out, matB);
                });
                it("should return the unit quaternion", () => {
                    const unitQuat = quat.create();
                    quat.identity(unitQuat);
                    equality(result, unitQuat);
                });
            });

            describe("from a translation and rotation matrix", () => {
                it("should keep the same rotation as when created", () => {
                    let q = quat.create();
                    const outVec = vec3.fromValues(5, 6, 7);
                    const testVec = vec3.fromValues(1, 5, 2);
                    const ang = 0.78972;

                    vec3.normalize(testVec, testVec);
                    q = quat.setAxisAngle(q, testVec, ang);
                    mat4.fromRotationTranslation(out, q, outVec);

                    result = quat.fromValues(2, 3, 4, 6);
                    mat4.getRotation(result, out);
                    const outaxis = vec3.create();
                    const outangle = quat.getAxisAngle(outaxis, result);

                    equality(outaxis, testVec);
                    equality(outangle, ang);
                });
            });
        });

        describe("frustum", () => {
            beforeEach(() => {
                result = mat4.frustum(out, -1, 1, -1, 1, -1, 1);
            });
            it("should place values into out", () => {
                equality(result, [
                    -1, 0, 0, 0,
                    0, -1, 0, 0,
                    0, 0, 0, -1,
                    0, 0, 1, 0
                ]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
        });

        describe("perspective", () => {
            const fovy = Math.PI * 0.5;
            beforeEach(() => {
                result = mat4.perspective(out, fovy, 1, 0, 1);
            });
            it("should place values into out", () => {
                equality(result, [
                    1, 0, 0, 0,
                    0, 1, 0, 0,
                    0, 0, -1, -1,
                    0, 0, 0, 0
                ]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });

            describe("with nonzero near, 45deg fovy, and realistic aspect ratio", () => {
                beforeEach(() => {
                    result = mat4.perspective(out, 45 * Math.PI / 180.0, 640 / 480, 0.1, 200);
                });
                it("should calculate correct matrix", () => {
                    equality(result, [
                        1.81066, 0, 0, 0,
                        0, 2.414213, 0, 0,
                        0, 0, -1.001, -1,
                        0, 0, -0.2001, 0
                    ]);
                });
            });
        });

        describe("ortho", () => {
            beforeEach(() => {
                result = mat4.ortho(out, -1, 1, -1, 1, -1, 1);
            });
            it("should place values into out", () => {
                equality(result, [
                    1, 0, 0, 0,
                    0, 1, 0, 0,
                    0, 0, -1, 0,
                    0, 0, 0, 1
                ]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
        });

        describe("lookAt", () => {
            let eye = new Float32Array([0, 0, 1]);
            let center = new Float32Array([0, 0, -1]);
            let up = new Float32Array([0, 1, 0]);
            let view;
            let right;

            describe("looking down", () => {
                beforeEach(() => {
                    view = new Float32Array([0, -1, 0]);
                    up = new Float32Array([0, 0, -1]);
                    right = new Float32Array([1, 0, 0]);
                    result = mat4.lookAt(out, [0, 0, 0], view, up);
                });

                it("should transform view into local -Z", () => {
                    result = vec3.transformMat4(new Float32Array(3), view, out);
                    equality(result, [0, 0, -1]);
                });

                it("should transform up into local +Y", () => {
                    result = vec3.transformMat4(new Float32Array(3), up, out);
                    equality(result, [0, 1, 0]);
                });

                it("should transform right into local +X", () => {
                    result = vec3.transformMat4(new Float32Array(3), right, out);
                    equality(result, [1, 0, 0]);
                });

                it("should return out", () => {
                    assert.equal(result, out);
                });
            });

            describe("#74", () => {
                beforeEach(() => {
                    mat4.lookAt(out,
                        new Float32Array([0, 2, 0]),
                        new Float32Array([0, 0.6, 0]),
                        new Float32Array([0, 0, -1]));
                });

                it("should transform a point 'above' into local +Y", () => {
                    result = vec3.transformMat4(new Float32Array(3), [0, 2, -1], out);
                    equality(result, [0, 1, 0]);
                });

                it("should transform a point 'right of' into local +X", () => {
                    result = vec3.transformMat4(new Float32Array(3), [1, 2, 0], out);
                    equality(result, [1, 0, 0]);
                });

                it("should transform a point 'in front of' into local -Z", () => {
                    result = vec3.transformMat4(new Float32Array(3), [0, 1, 0], out);
                    equality(result, [0, 0, -1]);
                });
            });

            beforeEach(() => {
                eye = new Float32Array([0, 0, 1]);
                center = new Float32Array([0, 0, -1]);
                up = new Float32Array([0, 1, 0]);
                result = mat4.lookAt(out, eye, center, up);
            });
            it("should place values into out", () => {
                equality(result, [
                    1, 0, 0, 0,
                    0, 1, 0, 0,
                    0, 0, 1, 0,
                    0, 0, -1, 1
                ]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
        });

        describe("str", () => {
            beforeEach(() => {
                result = mat4.str(matA);
            });

            it("should return a string representation of the matrix", () => {
                assert.equal(result, "mat4(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 2, 3, 1)");
            });
        });

        describe("frob", () => {
            beforeEach(() => {
                result = mat4.frob(matA);
            });
            it("should return the Frobenius Norm of the matrix", () => {
                assert.equal(result, Math.sqrt(Math.pow(1, 2) + Math.pow(1, 2) + Math.pow(1, 2) + Math.pow(1, 2) + Math.pow(1, 2) + Math.pow(2, 2) + Math.pow(3, 2)));
            });
        });


        describe("add", () => {
            beforeEach(() => {
                matA = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
                matB = [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];
            });
            describe("with a separate output matrix", () => {
                beforeEach(() => {
                    result = mat4.add(out, matA, matB);
                });

                it("should place values into out", () => {
                    equality(out, [18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48]);
                });
                it("should return out", () => {
                    equality(result, out);
                });
                it("should not modify matA", () => {
                    equality(matA, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
                });
                it("should not modify matB", () => {
                    equality(matB, [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]);
                });
            });

            describe("when matA is the output matrix", () => {
                beforeEach(() => {
                    result = mat4.add(matA, matA, matB);
                });

                it("should place values into matA", () => {
                    equality(matA, [18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48]);
                });
                it("should return matA", () => {
                    equality(result, matA);
                });
                it("should not modify matB", () => {
                    equality(matB, [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]);
                });
            });

            describe("when matB is the output matrix", () => {
                beforeEach(() => {
                    result = mat4.add(matB, matA, matB);
                });

                it("should place values into matB", () => {
                    equality(matB, [18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48]);
                });
                it("should return matB", () => {
                    equality(result, matB);
                });
                it("should not modify matA", () => {
                    equality(matA, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
                });
            });
        });

        describe("subtract", () => {
            beforeEach(() => {
                matA = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
                matB = [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];
            });
            it("should have an alias called 'sub'", () => {
                assert.equal(mat4.sub, mat4.subtract);
            });

            describe("with a separate output matrix", () => {
                beforeEach(() => {
                    result = mat4.subtract(out, matA, matB);
                });

                it("should place values into out", () => {
                    equality(out, [-16, -16, -16, -16, -16, -16, -16, -16, -16, -16, -16, -16, -16, -16, -16, -16]);
                });
                it("should return out", () => {
                    equality(result, out);
                });
                it("should not modify matA", () => {
                    equality(matA, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
                });
                it("should not modify matB", () => {
                    equality(matB, [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]);
                });
            });

            describe("when matA is the output matrix", () => {
                beforeEach(() => {
                    result = mat4.subtract(matA, matA, matB);
                });

                it("should place values into matA", () => {
                    equality(matA, [-16, -16, -16, -16, -16, -16, -16, -16, -16, -16, -16, -16, -16, -16, -16, -16]);
                });
                it("should return matA", () => {
                    equality(result, matA);
                });
                it("should not modify matB", () => {
                    equality(matB, [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]);
                });
            });

            describe("when matB is the output matrix", () => {
                beforeEach(() => {
                    result = mat4.subtract(matB, matA, matB);
                });

                it("should place values into matB", () => {
                    equality(matB, [-16, -16, -16, -16, -16, -16, -16, -16, -16, -16, -16, -16, -16, -16, -16, -16]);
                });
                it("should return matB", () => {
                    equality(result, matB);
                });
                it("should not modify matA", () => {
                    equality(matA, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
                });
            });
        });

        describe("fromValues", () => {
            beforeEach(() => {
                result = mat4.fromValues(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16);
            });
            it("should return a 16 element array initialized to the values passed", () => {
                equality(result, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
            });
        });

        describe("set", () => {
            beforeEach(() => {
                result = mat4.set(out, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16);
            });
            it("should place values into out", () => {
                equality(out, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
            });
            it("should return out", () => {
                equality(result, out);
            });
        });

        describe("multiplyScalar", () => {
            beforeEach(() => {
                matA = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
            });
            describe("with a separate output matrix", () => {
                beforeEach(() => {
                    result = mat4.multiplyScalar(out, matA, 2);
                });

                it("should place values into out", () => {
                    equality(out, [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32]);
                });
                it("should return out", () => {
                    equality(result, out);
                });
                it("should not modify matA", () => {
                    equality(matA, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
                });
            });

            describe("when matA is the output matrix", () => {
                beforeEach(() => {
                    result = mat4.multiplyScalar(matA, matA, 2);
                });

                it("should place values into matA", () => {
                    equality(matA, [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32]);
                });
                it("should return matA", () => {
                    equality(result, matA);
                });
            });
        });

        describe("multiplyScalarAndAdd", () => {
            beforeEach(() => {
                matA = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
                matB = [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];
            });
            describe("with a separate output matrix", () => {
                beforeEach(() => {
                    result = mat4.multiplyScalarAndAdd(out, matA, matB, 0.5);
                });

                it("should place values into out", () => {
                    equality(out, [9.5, 11, 12.5, 14, 15.5, 17, 18.5, 20, 21.5, 23, 24.5, 26, 27.5, 29, 30.5, 32]);
                });
                it("should return out", () => {
                    equality(result, out);
                });
                it("should not modify matA", () => {
                    equality(matA, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
                });
                it("should not modify matB", () => {
                    equality(matB, [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]);
                });
            });

            describe("when matA is the output matrix", () => {
                beforeEach(() => {
                    result = mat4.multiplyScalarAndAdd(matA, matA, matB, 0.5);
                });

                it("should place values into matA", () => {
                    equality(matA, [9.5, 11, 12.5, 14, 15.5, 17, 18.5, 20, 21.5, 23, 24.5, 26, 27.5, 29, 30.5, 32]);
                });
                it("should return matA", () => {
                    equality(result, matA);
                });
                it("should not modify matB", () => {
                    equality(matB, [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]);
                });
            });

            describe("when matB is the output matrix", () => {
                beforeEach(() => {
                    result = mat4.multiplyScalarAndAdd(matB, matA, matB, 0.5);
                });

                it("should place values into matB", () => {
                    equality(matB, [9.5, 11, 12.5, 14, 15.5, 17, 18.5, 20, 21.5, 23, 24.5, 26, 27.5, 29, 30.5, 32]);
                });
                it("should return matB", () => {
                    equality(result, matB);
                });
                it("should not modify matA", () => {
                    equality(matA, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
                });
            });
        });

        describe("exactEquals", () => {
            let matC;
            let r0;
            let r1;
            beforeEach(() => {
                matA = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
                matB = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
                matC = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
                r0 = mat4.exactEquals(matA, matB);
                r1 = mat4.exactEquals(matA, matC);
            });

            it("should return true for identical matrices", () => {
                assert.isTrue(r0);
            });
            it("should return false for different matrices", () => {
                assert.isFalse(r1);
            });
            it("should not modify matA", () => {
                equality(matA, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
            });
            it("should not modify matB", () => {
                equality(matB, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
            });
        });

        describe("equals", () => {
            let matC;
            let matD;
            let r0;
            let r1;
            let r2;
            beforeEach(() => {
                matA = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
                matB = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
                matC = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
                matD = [1e-16, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
                r0 = mat4.equals(matA, matB);
                r1 = mat4.equals(matA, matC);
                r2 = mat4.equals(matA, matD);
            });
            it("should return true for identical matrices", () => {
                assert.isTrue(r0);
            });
            it("should return false for different matrices", () => {
                assert.isFalse(r1);
            });
            it("should return true for close but not identical matrices", () => {
                assert.isTrue(r2);
            });
            it("should not modify matA", () => {
                equality(matA, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
            });
            it("should not modify matB", () => {
                equality(matB, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
            });
        });
    };
};

describe("math", "matrix", "mat4 (SISD)", buildMat4Tests(false));
describe("math", "matrix", "mat4 (SIMD)", buildMat4Tests(true));
