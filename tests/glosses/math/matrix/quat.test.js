import assertEquality from "./assert_equality";
const { mat3, mat4, quat, vec3 } = adone.math.matrix;

describe("math", "matrix", "quat", () => {
    let out;
    let quatA;
    let quatB;
    let result;
    let vec;
    let id;
    let deg90;

    beforeEach(() => {
        quatA = [1, 2, 3, 4];
        quatB = [5, 6, 7, 8];
        out = [0, 0, 0, 0];
        vec = [1, 1, -1];
        id = [0, 0, 0, 1];
        deg90 = Math.PI / 2;
    });

    describe("slerp", () => {
        describe("the normal case", () => {
            beforeEach(() => {
                result = quat.slerp(out, [0, 0, 0, 1], [0, 1, 0, 0], 0.5);
            });

            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should calculate proper quat", () => {
                assertEquality(result, [0, 0.707106, 0, 0.707106]);
            });
        });

        describe("where a == b", () => {
            beforeEach(() => {
                result = quat.slerp(out, [0, 0, 0, 1], [0, 0, 0, 1], 0.5);
            });

            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should calculate proper quat", () => {
                assertEquality(result, [0, 0, 0, 1]);
            });
        });

        describe("where theta == 180deg", () => {
            beforeEach(() => {
                quat.rotateX(quatA, [1, 0, 0, 0], Math.PI); // 180 deg
                result = quat.slerp(out, [1, 0, 0, 0], quatA, 1);
            });

            it("should calculate proper quat", () => {
                assertEquality(result, [0, 0, 0, -1]);
            });
        });

        describe("where a == -b", () => {
            beforeEach(() => {
                result = quat.slerp(out, [1, 0, 0, 0], [-1, 0, 0, 0], 0.5);
            });

            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should calculate proper quat", () => {
                assertEquality(result, [1, 0, 0, 0]);
            });
        });
    });

    describe("rotateX", () => {
        beforeEach(() => {
            result = quat.rotateX(out, id, deg90);
        });

        it("should return out", () => {
            assert.equal(result, out);
        });
        it("should transform vec accordingly", () => {
            vec3.transformQuat(vec, [0, 0, -1], out);
            assertEquality(vec, [0, 1, 0]);
        });
    });

    describe("rotateY", () => {
        beforeEach(() => {
            result = quat.rotateY(out, id, deg90);
        });

        it("should return out", () => {
            assert.equal(result, out);
        });
        it("should transform vec accordingly", () => {
            vec3.transformQuat(vec, [0, 0, -1], out);
            assertEquality(vec, [-1, 0, 0]);
        });
    });

    describe("rotateZ", () => {
        beforeEach(() => {
            result = quat.rotateZ(out, id, deg90);
        });

        it("should return out", () => {
            assert.equal(result, out);
        });
        it("should transform vec accordingly", () => {
            vec3.transformQuat(vec, [0, 1, 0], out);
            assertEquality(vec, [-1, 0, 0]);
        });
    });

    describe("fromMat3", () => {
        let matr;

        describe("legacy", () => {
            beforeEach(() => {
                matr = [1, 0, 0,
                    0, 0, -1,
                    0, 1, 0];
                result = quat.fromMat3(out, matr);
            });

            it("should set dest to the correct value", () => {
                assertEquality(result, [-0.707106, 0, 0, 0.707106]);
            });
        });

        describe("where trace > 0", () => {
            beforeEach(() => {
                matr = [1, 0, 0,
                    0, 0, -1,
                    0, 1, 0];
                result = quat.fromMat3(out, matr);
            });

            it("should return out", () => {
                assert.equal(result, out);
            });

            it("should produce the correct transformation", () => {
                assertEquality(vec3.transformQuat([], [0, 1, 0], out), [0, 0, -1]);
            });
        });

        describe("from a normal matrix looking 'backward'", () => {
            beforeEach(() => {
                matr = mat3.create();
                mat3.transpose(matr, mat3.invert(matr, mat3.fromMat4(matr, mat4.lookAt(mat4.create(), [0, 0, 0], [0, 0, 1], [0, 1, 0]))));
                result = quat.fromMat3(out, matr);
            });

            it("should return out", () => {
                assert.equal(result, out);
            });

            it("should produce the same transformation as the given matrix", () => {
                assertEquality(vec3.transformQuat([], [3, 2, -1], quat.normalize(out, out)), vec3.transformMat3([], [3, 2, -1], matr));
            });
        });

        describe("from a normal matrix looking 'left' and 'upside down'", () => {
            beforeEach(() => {
                matr = mat3.create();
                mat3.transpose(matr, mat3.invert(matr, mat3.fromMat4(matr, mat4.lookAt(mat4.create(), [0, 0, 0], [-1, 0, 0], [0, -1, 0]))));
                result = quat.fromMat3(out, matr);
            });

            it("should return out", () => {
                assert.equal(result, out);
            });

            it("should produce the same transformation as the given matrix", () => {
                assertEquality(vec3.transformQuat([], [3, 2, -1], quat.normalize(out, out)), vec3.transformMat3([], [3, 2, -1], matr));
            });
        });

        describe("from a normal matrix looking 'upside down'", () => {
            beforeEach(() => {
                matr = mat3.create();
                mat3.transpose(matr, mat3.invert(matr, mat3.fromMat4(matr, mat4.lookAt(mat4.create(), [0, 0, 0], [0, 0, -1], [0, -1, 0]))));
                result = quat.fromMat3(out, matr);
            });

            it("should return out", () => {
                assert.equal(result, out);
            });

            it("should produce the same transformation as the given matrix", () => {
                assertEquality(vec3.transformQuat([], [3, 2, -1], quat.normalize(out, out)), vec3.transformMat3([], [3, 2, -1], matr));
            });
        });
    });

    describe("fromEuler", () => {
        describe("legacy", () => {
            beforeEach(() => {
                result = quat.fromEuler(out, -90, 0, 0);
            });

            it("should set dest to the correct value", () => {
                assertEquality(result, [-0.707106, 0, 0, 0.707106]);
            });
        });

        describe("where trace > 0", () => {
            beforeEach(() => {
                result = quat.fromEuler(out, -90, 0, 0);
            });

            it("should return out", () => {
                expect(result).to.be.equal(out);
            });

            it("should produce the correct transformation", () => {
                assertEquality(vec3.transformQuat([], [0, 1, 0], out), [0, 0, -1]);
            });
        });
    });


    describe("setAxes", () => {
        let r;
        beforeEach(() => {
            r = vec3.create();
        });

        describe("looking left", () => {
            let view, up, right;
            beforeEach(() => {
                view = [-1, 0, 0];
                up = [0, 1, 0];
                right = [0, 0, -1];
                result = quat.setAxes([], view, right, up);
            });

            it("should transform local view into world left", () => {
                r = vec3.transformQuat([], [0, 0, -1], result);
                assertEquality(r, [1, 0, 0]);
            });

            it("should transform local right into world front", () => {
                r = vec3.transformQuat([], [1, 0, 0], result);
                assertEquality(r, [0, 0, 1]);
            });
        });

        describe("given opengl defaults", () => {
            let view, up, right;
            beforeEach(() => {
                view = [0, 0, -1];
                up = [0, 1, 0];
                right = [1, 0, 0];
                result = quat.setAxes(out, view, right, up);
            });

            it("should return out", () => {
                assert.equal(result, out);
            });

            it("should produce identity", () => {
                assertEquality(out, [0, 0, 0, 1]);
            });
        });

        describe.skip("legacy example", () => {
            let view, up, right;
            beforeEach(() => {
                right = [1, 0, 0];
                up = [0, 0, 1];
                view = [0, -1, 0];
                result = quat.setAxes(out, view, right, up);
            });

            it("should set correct quat4 values", () => {
                assertEquality(result, [0.707106, 0, 0, 0.707106]);
            });
        });
    });

    describe("rotationTo", () => {
        let r;
        beforeEach(() => {
            r = vec3.create();
        });

        describe("at right angle", () => {
            beforeEach(() => {
                result = quat.rotationTo(out, [0, 1, 0], [1, 0, 0]);
            });

            it("should return out", () => {
                assert.equal(result, out);
            });

            it("should calculate proper quaternion", () => {
                assertEquality(out, [0, 0, -0.707106, 0.707106]);
            });
        });

        describe("when vectors are parallel", () => {
            beforeEach(() => {
                result = quat.rotationTo(out, [0, 1, 0], [0, 1, 0]);
            });

            it("should return out", () => {
                assert.equal(result, out);
            });

            it("multiplying A should produce B", () => {
                assertEquality(vec3.transformQuat(r, [0, 1, 0], out), [0, 1, 0]);
            });
        });

        describe("when vectors are opposed X", () => {
            beforeEach(() => {
                result = quat.rotationTo(out, [1, 0, 0], [-1, 0, 0]);
            });

            it("should return out", () => {
                assert.equal(result, out);
            });

            it("multiplying A should produce B", () => {
                assertEquality(vec3.transformQuat(r, [1, 0, 0], out), [-1, 0, 0]);
            });
        });

        describe("when vectors are opposed Y", () => {
            beforeEach(() => {
                result = quat.rotationTo(out, [0, 1, 0], [0, -1, 0]);
            });

            it("should return out", () => {
                assert.equal(result, out);
            });

            it("multiplying A should produce B", () => {
                assertEquality(vec3.transformQuat(r, [0, 1, 0], out), [0, -1, 0]);
            });
        });

        describe("when vectors are opposed Z", () => {
            beforeEach(() => {
                result = quat.rotationTo(out, [0, 0, 1], [0, 0, -1]);
            });

            it("should return out", () => {
                assert.equal(result, out);
            });

            it("multiplying A should produce B", () => {
                assertEquality(vec3.transformQuat(r, [0, 0, 1], out), [0, 0, -1]);
            });
        });
    });

    describe("create", () => {
        beforeEach(() => {
            result = quat.create();
        });
        it("should return a 4 element array initialized to an identity quaternion", () => {
            assertEquality(result, [0, 0, 0, 1]);
        });
    });

    describe("clone", () => {
        beforeEach(() => {
            result = quat.clone(quatA);
        });
        it("should return a 4 element array initialized to the values in quatA", () => {
            assertEquality(result, quatA);
        });
    });

    describe("fromValues", () => {
        beforeEach(() => {
            result = quat.fromValues(1, 2, 3, 4);
        });
        it("should return a 4 element array initialized to the values passed", () => {
            assertEquality(result, [1, 2, 3, 4]);
        });
    });

    describe("copy", () => {
        beforeEach(() => {
            result = quat.copy(out, quatA);
        });
        it("should place values into out", () => {
            assertEquality(out, [1, 2, 3, 4]);
        });
        it("should return out", () => {
            assert.equal(result, out);
        });
    });

    describe("set", () => {
        beforeEach(() => {
            result = quat.set(out, 1, 2, 3, 4);
        });
        it("should place values into out", () => {
            assertEquality(out, [1, 2, 3, 4]);
        });
        it("should return out", () => {
            assert.equal(result, out);
        });
    });

    describe("identity", () => {
        beforeEach(() => {
            result = quat.identity(out);
        });
        it("should place values into out", () => {
            assertEquality(result, [0, 0, 0, 1]);
        });
        it("should return out", () => {
            assert.equal(result, out);
        });
    });

    describe("setAxisAngle", () => {
        beforeEach(() => {
            result = quat.setAxisAngle(out, [1, 0, 0], Math.PI * 0.5);
        });
        it("should place values into out", () => {
            assertEquality(result, [0.707106, 0, 0, 0.707106]);
        });
        it("should return out", () => {
            assert.equal(result, out);
        });
    });

    describe("getAxisAngle", () => {
        describe("for a quaternion representing no rotation", () => {
            beforeEach(() => {
                result = quat.setAxisAngle(out, [0, 1, 0], 0.0); deg90 = quat.getAxisAngle(vec, out);
            });
            it("should return a multiple of 2*PI as the angle component", () => {
                assertEquality(deg90 % (Math.PI * 2.0), 0.0);
            });
        });

        describe("for a simple rotation about X axis", () => {
            beforeEach(() => {
                result = quat.setAxisAngle(out, [1, 0, 0], 0.7778); deg90 = quat.getAxisAngle(vec, out);
            });
            it("should return the same provided angle", () => {
                assertEquality(deg90, 0.7778);
            });
            it("should return the X axis as the angle", () => {
                assertEquality(vec, [1, 0, 0]);
            });
        });

        describe("for a simple rotation about Y axis", () => {
            beforeEach(() => {
                result = quat.setAxisAngle(out, [0, 1, 0], 0.879546); deg90 = quat.getAxisAngle(vec, out);
            });
            it("should return the same provided angle", () => {
                assertEquality(deg90, 0.879546);
            });
            it("should return the X axis as the angle", () => {
                assertEquality(vec, [0, 1, 0]);
            });
        });

        describe("for a simple rotation about Z axis", () => {
            beforeEach(() => {
                result = quat.setAxisAngle(out, [0, 0, 1], 0.123456); deg90 = quat.getAxisAngle(vec, out);
            });
            it("should return the same provided angle", () => {
                assertEquality(deg90, 0.123456);
            });
            it("should return the X axis as the angle", () => {
                assertEquality(vec, [0, 0, 1]);
            });
        });

        describe("for a slightly irregular axis and right angle", () => {
            beforeEach(() => {
                result = quat.setAxisAngle(out, [0.707106, 0, 0.707106], Math.PI * 0.5); deg90 = quat.getAxisAngle(vec, out);
            });
            it("should place values into vec", () => {
                assertEquality(vec, [0.707106, 0, 0.707106]);
            });
            it("should return a numeric angle", () => {
                assertEquality(deg90, Math.PI * 0.5);
            });
        });

        describe("for a very irregular axis and negative input angle", () => {
            beforeEach(() => {
                quatA = quat.setAxisAngle(quatA, [0.65538555, 0.49153915, 0.57346237], 8.8888);
                deg90 = quat.getAxisAngle(vec, quatA);
                quatB = quat.setAxisAngle(quatB, vec, deg90);
            });
            it("should return an angle between 0 and 2*PI", () => {
                assert.isAbove(deg90, 0.0);
                assert.isBelow(deg90, Math.PI * 2.0);
            });
            it("should create the same quaternion from axis and angle extracted", () => {
                assertEquality(quatA, quatB);
            });
        });
    });

    describe("add", () => {
        describe("with a separate output quaternion", () => {
            beforeEach(() => {
                result = quat.add(out, quatA, quatB);
            });

            it("should place values into out", () => {
                assertEquality(out, [6, 8, 10, 12]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify quatA", () => {
                assertEquality(quatA, [1, 2, 3, 4]);
            });
            it("should not modify quatB", () => {
                assertEquality(quatB, [5, 6, 7, 8]);
            });
        });

        describe("when quatA is the output quaternion", () => {
            beforeEach(() => {
                result = quat.add(quatA, quatA, quatB);
            });

            it("should place values into quatA", () => {
                assertEquality(quatA, [6, 8, 10, 12]);
            });
            it("should return quatA", () => {
                assert.equal(result, quatA);
            });
            it("should not modify quatB", () => {
                assertEquality(quatB, [5, 6, 7, 8]);
            });
        });

        describe("when quatB is the output quaternion", () => {
            beforeEach(() => {
                result = quat.add(quatB, quatA, quatB);
            });

            it("should place values into quatB", () => {
                assertEquality(quatB, [6, 8, 10, 12]);
            });
            it("should return quatB", () => {
                assert.equal(result, quatB);
            });
            it("should not modify quatA", () => {
                assertEquality(quatA, [1, 2, 3, 4]);
            });
        });
    });

    describe("multiply", () => {
        it("should have an alias called 'mul'", () => {
            assert.equal(quat.mul, quat.multiply);
        });

        describe("with a separate output quaternion", () => {
            beforeEach(() => {
                result = quat.multiply(out, quatA, quatB);
            });

            it("should place values into out", () => {
                assertEquality(out, [24, 48, 48, -6]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify quatA", () => {
                assertEquality(quatA, [1, 2, 3, 4]);
            });
            it("should not modify quatB", () => {
                assertEquality(quatB, [5, 6, 7, 8]);
            });
        });

        describe("when quatA is the output quaternion", () => {
            beforeEach(() => {
                result = quat.multiply(quatA, quatA, quatB);
            });

            it("should place values into quatA", () => {
                assertEquality(quatA, [24, 48, 48, -6]);
            });
            it("should return quatA", () => {
                assert.equal(result, quatA);
            });
            it("should not modify quatB", () => {
                assertEquality(quatB, [5, 6, 7, 8]);
            });
        });

        describe("when quatB is the output quaternion", () => {
            beforeEach(() => {
                result = quat.multiply(quatB, quatA, quatB);
            });

            it("should place values into quatB", () => {
                assertEquality(quatB, [24, 48, 48, -6]);
            });
            it("should return quatB", () => {
                assert.equal(result, quatB);
            });
            it("should not modify quatA", () => {
                assertEquality(quatA, [1, 2, 3, 4]);
            });
        });
    });

    describe("scale", () => {
        describe("with a separate output quaternion", () => {
            beforeEach(() => {
                result = quat.scale(out, quatA, 2);
            });

            it("should place values into out", () => {
                assertEquality(out, [2, 4, 6, 8]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify quatA", () => {
                assertEquality(quatA, [1, 2, 3, 4]);
            });
        });

        describe("when quatA is the output quaternion", () => {
            beforeEach(() => {
                result = quat.scale(quatA, quatA, 2);
            });

            it("should place values into quatA", () => {
                assertEquality(quatA, [2, 4, 6, 8]);
            });
            it("should return quatA", () => {
                assert.equal(result, quatA);
            });
        });
    });

    describe("length", () => {
        it("should have an alias called 'len'", () => {
            assert.equal(quat.len, quat.length);
        });

        beforeEach(() => {
            result = quat.len(quatA);
        });

        it("should return the length", () => {
            assert.closeTo(result, 5.477225, 0.000001);
        });
    });

    describe("squaredLength", () => {
        it("should have an alias called 'sqrLen'", () => {
            assert.equal(quat.sqrLen, quat.squaredLength);
        });

        beforeEach(() => {
            result = quat.squaredLength(quatA);
        });

        it("should return the squared length", () => {
            assert.equal(result, 30);
        });
    });

    describe("normalize", () => {
        beforeEach(() => {
            quatA = [5, 0, 0, 0];
        });

        describe("with a separate output quaternion", () => {
            beforeEach(() => {
                result = quat.normalize(out, quatA);
            });

            it("should place values into out", () => {
                assertEquality(out, [1, 0, 0, 0]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify quatA", () => {
                assertEquality(quatA, [5, 0, 0, 0]);
            });
        });

        describe("when quatA is the output quaternion", () => {
            beforeEach(() => {
                result = quat.normalize(quatA, quatA);
            });

            it("should place values into quatA", () => {
                assertEquality(quatA, [1, 0, 0, 0]);
            });
            it("should return quatA", () => {
                assert.equal(result, quatA);
            });
        });
    });

    describe("lerp", () => {
        describe("with a separate output quaternion", () => {
            beforeEach(() => {
                result = quat.lerp(out, quatA, quatB, 0.5);
            });

            it("should place values into out", () => {
                assertEquality(out, [3, 4, 5, 6]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify quatA", () => {
                assertEquality(quatA, [1, 2, 3, 4]);
            });
            it("should not modify quatB", () => {
                assertEquality(quatB, [5, 6, 7, 8]);
            });
        });

        describe("when quatA is the output quaternion", () => {
            beforeEach(() => {
                result = quat.lerp(quatA, quatA, quatB, 0.5);
            });

            it("should place values into quatA", () => {
                assertEquality(quatA, [3, 4, 5, 6]);
            });
            it("should return quatA", () => {
                assert.equal(result, quatA);
            });
            it("should not modify quatB", () => {
                assertEquality(quatB, [5, 6, 7, 8]);
            });
        });

        describe("when quatB is the output quaternion", () => {
            beforeEach(() => {
                result = quat.lerp(quatB, quatA, quatB, 0.5);
            });

            it("should place values into quatB", () => {
                assertEquality(quatB, [3, 4, 5, 6]);
            });
            it("should return quatB", () => {
                assert.equal(result, quatB);
            });
            it("should not modify quatA", () => {
                assertEquality(quatA, [1, 2, 3, 4]);
            });
        });
    });

    /*describe("slerp", function() {
        describe("with a separate output quaternion", function() {
            beforeEach(function() { result = quat.slerp(out, quatA, quatB, 0.5); });

            it("should place values into out", function() { expect(out, [3, 4, 5, 6]); });
            it("should return out", function() { expect(result, out); });
            it("should not modify quatA", function() { expect(quatA, [1, 2, 3, 4]); });
            it("should not modify quatB", function() { expect(quatB, [5, 6, 7, 8]); });
        });

        describe("when quatA is the output quaternion", function() {
            beforeEach(function() { result = quat.slerp(quatA, quatA, quatB, 0.5); });

            it("should place values into quatA", function() { expect(quatA, [3, 4, 5, 6]); });
            it("should return quatA", function() { expect(result, quatA); });
            it("should not modify quatB", function() { expect(quatB, [5, 6, 7, 8]); });
        });

        describe("when quatB is the output quaternion", function() {
            beforeEach(function() { result = quat.slerp(quatB, quatA, quatB, 0.5); });

            it("should place values into quatB", function() { expect(quatB, [3, 4, 5, 6]); });
            it("should return quatB", function() { expect(result, quatB); });
            it("should not modify quatA", function() { expect(quatA, [1, 2, 3, 4]); });
        });
    });*/

    // TODO: slerp, calcuateW, rotateX, rotateY, rotateZ

    describe("invert", () => {
        describe("with a separate output quaternion", () => {
            beforeEach(() => {
                result = quat.invert(out, quatA);
            });

            it("should place values into out", () => {
                assertEquality(out, [-0.033333, -0.066666, -0.1, 0.133333]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify quatA", () => {
                assertEquality(quatA, [1, 2, 3, 4]);
            });
        });

        describe("when quatA is the output quaternion", () => {
            beforeEach(() => {
                result = quat.invert(quatA, quatA);
            });

            it("should place values into quatA", () => {
                assertEquality(quatA, [-0.033333, -0.066666, -0.1, 0.133333]);
            });
            it("should return quatA", () => {
                assert.equal(result, quatA);
            });
        });
    });

    describe("conjugate", () => {
        describe("with a separate output quaternion", () => {
            beforeEach(() => {
                result = quat.conjugate(out, quatA);
            });

            it("should place values into out", () => {
                assertEquality(out, [-1, -2, -3, 4]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify quatA", () => {
                assertEquality(quatA, [1, 2, 3, 4]);
            });
        });

        describe("when quatA is the output quaternion", () => {
            beforeEach(() => {
                result = quat.conjugate(quatA, quatA);
            });

            it("should place values into quatA", () => {
                assertEquality(quatA, [-1, -2, -3, 4]);
            });
            it("should return quatA", () => {
                assert.equal(result, quatA);
            });
        });
    });

    describe("str", () => {
        beforeEach(() => {
            result = quat.str(quatA);
        });

        it("should return a string representation of the quaternion", () => {
            assert.equal(result, "quat(1, 2, 3, 4)");
        });
    });

    describe("exactEquals", () => {
        let quatC, r0, r1;
        beforeEach(() => {
            quatA = [0, 1, 2, 3];
            quatB = [0, 1, 2, 3];
            quatC = [1, 2, 3, 4];
            r0 = quat.exactEquals(quatA, quatB);
            r1 = quat.exactEquals(quatA, quatC);
        });

        it("should return true for identical quaternions", () => {
            assert.isTrue(r0);
        });
        it("should return false for different quaternions", () => {
            assert.isFalse(r1);
        });
        it("should not modify quatA", () => {
            assertEquality(quatA, [0, 1, 2, 3]);
        });
        it("should not modify quatB", () => {
            assertEquality(quatB, [0, 1, 2, 3]);
        });
    });

    describe("equals", () => {
        let quatC, quatD, r0, r1, r2;
        beforeEach(() => {
            quatA = [0, 1, 2, 3];
            quatB = [0, 1, 2, 3];
            quatC = [1, 2, 3, 4];
            quatD = [1e-16, 1, 2, 3];
            r0 = quat.equals(quatA, quatB);
            r1 = quat.equals(quatA, quatC);
            r2 = quat.equals(quatA, quatD);
        });
        it("should return true for identical quaternions", () => {
            assert.isTrue(r0);
        });
        it("should return false for different quaternions", () => {
            assert.isFalse(r1);
        });
        it("should return true for close but not identical quaternions", () => {
            assert.isTrue(r2);
        });
        it("should not modify quatA", () => {
            assertEquality(quatA, [0, 1, 2, 3]);
        });
        it("should not modify quatB", () => {
            assertEquality(quatB, [0, 1, 2, 3]);
        });
    });
});
