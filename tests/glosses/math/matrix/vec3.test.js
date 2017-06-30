import equality from "./equality";
const { mat4, mat3, vec3 } = adone.math.matrix;

describe("math", "matrix", "vec3", () => {
    let out;
    let vecA;
    let vecB;
    let result;

    beforeEach(() => {
        vecA = [1, 2, 3]; vecB = [4, 5, 6]; out = [0, 0, 0];
    });

    describe("rotateX", () => {
        describe("rotation around world origin [0, 0, 0]", () => {
            beforeEach(() => {
                vecA = [0, 1, 0]; vecB = [0, 0, 0];
                result = vec3.rotateX(out, vecA, vecB, Math.PI);
            });
            it("should return the rotated vector", () => {
                equality(result, [0, -1, 0]);
            });
        });
        describe("rotation around an arbitrary origin", () => {
            beforeEach(() => {
                vecA = [2, 7, 0]; vecB = [2, 5, 0];
                result = vec3.rotateX(out, vecA, vecB, Math.PI);
            });
            it("should return the rotated vector", () => {
                equality(result, [2, 3, 0]);
            });
        });
    });

    describe("rotateY", () => {
        describe("rotation around world origin [0, 0, 0]", () => {
            beforeEach(() => {
                vecA = [1, 0, 0]; vecB = [0, 0, 0];
                result = vec3.rotateY(out, vecA, vecB, Math.PI);
            });
            it("should return the rotated vector", () => {
                equality(result, [-1, 0, 0]);
            });
        });
        describe("rotation around an arbitrary origin", () => {
            beforeEach(() => {
                vecA = [-2, 3, 10]; vecB = [-4, 3, 10];
                result = vec3.rotateY(out, vecA, vecB, Math.PI);
            });
            it("should return the rotated vector", () => {
                equality(result, [-6, 3, 10]);
            });
        });
    });

    describe("rotateZ", () => {
        describe("rotation around world origin [0, 0, 0]", () => {
            beforeEach(() => {
                vecA = [0, 1, 0]; vecB = [0, 0, 0]; result = vec3.rotateZ(out, vecA, vecB, Math.PI);
            });
            it("should return the rotated vector", () => {
                equality(result, [0, -1, 0]);
            });
        });
        describe("rotation around an arbitrary origin", () => {
            beforeEach(() => {
                vecA = [0, 6, -5]; vecB = [0, 0, -5]; result = vec3.rotateZ(out, vecA, vecB, Math.PI);
            });
            it("should return the rotated vector", () => {
                equality(result, [0, -6, -5]);
            });
        });
    });

    describe("transformMat4", () => {
        let matr;
        describe("with an identity", () => {
            beforeEach(() => {
                matr = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
            });

            beforeEach(() => {
                result = vec3.transformMat4(out, vecA, matr);
            });

            it("should produce the input", () => {
                equality(out, [1, 2, 3]);
            });

            it("should return out", () => {
                assert.equal(result, out);
            });
        });

        describe("with a lookAt", () => {
            beforeEach(() => {
                matr = mat4.lookAt(mat4.create(), [5, 6, 7], [2, 6, 7], [0, 1, 0]);
            });

            beforeEach(() => {
                result = vec3.transformMat4(out, vecA, matr);
            });

            it("should rotate and translate the input", () => {
                equality(out, [4, -4, -4]);
            });

            it("should return out", () => {
                assert.equal(result, out);
            });
        });

        describe("with a perspective matrix (#92)", () => {
            it("should transform a point from perspective(pi/2, 4/3, 1, 100)", () => {
                matr = [0.750, 0, 0, 0,
                    0, 1, 0, 0,
                    0, 0, -1.02, -1,
                    0, 0, -2.02, 0];
                result = vec3.transformMat4([], [10, 20, 30], matr);
                equality(result, [-0.25, -0.666666, 1.087333]);
            });
        });

    });

    describe("transformMat3", () => {
        let matr;
        describe("with an identity", () => {
            beforeEach(() => {
                matr = [1, 0, 0, 0, 1, 0, 0, 0, 1];
            });

            beforeEach(() => {
                result = vec3.transformMat3(out, vecA, matr);
            });

            it("should produce the input", () => {
                equality(out, [1, 2, 3]);
            });

            it("should return out", () => {
                assert.equal(result, out);
            });
        });

        describe("with 90deg about X", () => {
            beforeEach(() => {
                result = vec3.transformMat3(out, [0, 1, 0], [1, 0, 0, 0, 0, 1, 0, -1, 0]);
            });

            it("should produce correct output", () => {
                equality(out, [0, 0, 1]);
            });
        });

        describe("with 90deg about Y", () => {
            beforeEach(() => {
                result = vec3.transformMat3(out, [1, 0, 0], [0, 0, -1, 0, 1, 0, 1, 0, 0]);
            });

            it("should produce correct output", () => {
                equality(out, [0, 0, -1]);
            });
        });

        describe("with 90deg about Z", () => {
            beforeEach(() => {
                result = vec3.transformMat3(out, [1, 0, 0], [0, 1, 0, -1, 0, 0, 0, 0, 1]);
            });

            it("should produce correct output", () => {
                equality(out, [0, 1, 0]);
            });
        });

        describe("with a lookAt normal matrix", () => {
            beforeEach(() => {
                matr = mat4.lookAt(mat4.create(), [5, 6, 7], [2, 6, 7], [0, 1, 0]);
                const n = mat3.create();
                matr = mat3.transpose(n, mat3.invert(n, mat3.fromMat4(n, matr)));
            });

            beforeEach(() => {
                result = vec3.transformMat3(out, [1, 0, 0], matr);
            });

            it("should rotate the input", () => {
                equality(out, [0, 0, 1]);
            });

            it("should return out", () => {
                assert.equal(result, out);
            });
        });
    });

    describe("create", () => {
        beforeEach(() => {
            result = vec3.create();
        });
        it("should return a 3 element array initialized to 0s", () => {
            equality(result, [0, 0, 0]);
        });
    });

    describe("clone", () => {
        beforeEach(() => {
            result = vec3.clone(vecA);
        });
        it("should return a 3 element array initialized to the values in vecA", () => {
            equality(result, vecA);
        });
    });

    describe("fromValues", () => {
        beforeEach(() => {
            result = vec3.fromValues(1, 2, 3);
        });
        it("should return a 3 element array initialized to the values passed", () => {
            equality(result, [1, 2, 3]);
        });
    });

    describe("copy", () => {
        beforeEach(() => {
            result = vec3.copy(out, vecA);
        });
        it("should place values into out", () => {
            equality(out, [1, 2, 3]);
        });
        it("should return out", () => {
            assert.equal(result, out);
        });
    });

    describe("set", () => {
        beforeEach(() => {
            result = vec3.set(out, 1, 2, 3);
        });
        it("should place values into out", () => {
            equality(out, [1, 2, 3]);
        });
        it("should return out", () => {
            assert.equal(result, out);
        });
    });

    describe("add", () => {
        describe("with a separate output vector", () => {
            beforeEach(() => {
                result = vec3.add(out, vecA, vecB);
            });

            it("should place values into out", () => {
                equality(out, [5, 7, 9]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify vecA", () => {
                equality(vecA, [1, 2, 3]);
            });
            it("should not modify vecB", () => {
                equality(vecB, [4, 5, 6]);
            });
        });

        describe("when vecA is the output vector", () => {
            beforeEach(() => {
                result = vec3.add(vecA, vecA, vecB);
            });

            it("should place values into vecA", () => {
                equality(vecA, [5, 7, 9]);
            });
            it("should return vecA", () => {
                assert.equal(result, vecA);
            });
            it("should not modify vecB", () => {
                equality(vecB, [4, 5, 6]);
            });
        });

        describe("when vecB is the output vector", () => {
            beforeEach(() => {
                result = vec3.add(vecB, vecA, vecB);
            });

            it("should place values into vecB", () => {
                equality(vecB, [5, 7, 9]);
            });
            it("should return vecB", () => {
                assert.equal(result, vecB);
            });
            it("should not modify vecA", () => {
                equality(vecA, [1, 2, 3]);
            });
        });
    });

    describe("subtract", () => {
        it("should have an alias called 'sub'", () => {
            assert.equal(vec3.sub, vec3.subtract);
        });

        describe("with a separate output vector", () => {
            beforeEach(() => {
                result = vec3.subtract(out, vecA, vecB);
            });

            it("should place values into out", () => {
                equality(out, [-3, -3, -3]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify vecA", () => {
                equality(vecA, [1, 2, 3]);
            });
            it("should not modify vecB", () => {
                equality(vecB, [4, 5, 6]);
            });
        });

        describe("when vecA is the output vector", () => {
            beforeEach(() => {
                result = vec3.subtract(vecA, vecA, vecB);
            });

            it("should place values into vecA", () => {
                equality(vecA, [-3, -3, -3]);
            });
            it("should return vecA", () => {
                assert.equal(result, vecA);
            });
            it("should not modify vecB", () => {
                equality(vecB, [4, 5, 6]);
            });
        });

        describe("when vecB is the output vector", () => {
            beforeEach(() => {
                result = vec3.subtract(vecB, vecA, vecB);
            });

            it("should place values into vecB", () => {
                equality(vecB, [-3, -3, -3]);
            });
            it("should return vecB", () => {
                assert.equal(result, vecB);
            });
            it("should not modify vecA", () => {
                equality(vecA, [1, 2, 3]);
            });
        });
    });

    describe("multiply", () => {
        it("should have an alias called 'mul'", () => {
            assert.equal(vec3.mul, vec3.multiply);
        });

        describe("with a separate output vector", () => {
            beforeEach(() => {
                result = vec3.multiply(out, vecA, vecB);
            });

            it("should place values into out", () => {
                equality(out, [4, 10, 18]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify vecA", () => {
                equality(vecA, [1, 2, 3]);
            });
            it("should not modify vecB", () => {
                equality(vecB, [4, 5, 6]);
            });
        });

        describe("when vecA is the output vector", () => {
            beforeEach(() => {
                result = vec3.multiply(vecA, vecA, vecB);
            });

            it("should place values into vecA", () => {
                equality(vecA, [4, 10, 18]);
            });
            it("should return vecA", () => {
                assert.equal(result, vecA);
            });
            it("should not modify vecB", () => {
                equality(vecB, [4, 5, 6]);
            });
        });

        describe("when vecB is the output vector", () => {
            beforeEach(() => {
                result = vec3.multiply(vecB, vecA, vecB);
            });

            it("should place values into vecB", () => {
                equality(vecB, [4, 10, 18]);
            });
            it("should return vecB", () => {
                assert.equal(result, vecB);
            });
            it("should not modify vecA", () => {
                equality(vecA, [1, 2, 3]);
            });
        });
    });

    describe("divide", () => {
        it("should have an alias called 'div'", () => {
            assert.equal(vec3.div, vec3.divide);
        });

        describe("with a separate output vector", () => {
            beforeEach(() => {
                result = vec3.divide(out, vecA, vecB);
            });

            it("should place values into out", () => {
                equality(out, [0.25, 0.4, 0.5]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify vecA", () => {
                equality(vecA, [1, 2, 3]);
            });
            it("should not modify vecB", () => {
                equality(vecB, [4, 5, 6]);
            });
        });

        describe("when vecA is the output vector", () => {
            beforeEach(() => {
                result = vec3.divide(vecA, vecA, vecB);
            });

            it("should place values into vecA", () => {
                equality(vecA, [0.25, 0.4, 0.5]);
            });
            it("should return vecA", () => {
                assert.equal(result, vecA);
            });
            it("should not modify vecB", () => {
                equality(vecB, [4, 5, 6]);
            });
        });

        describe("when vecB is the output vector", () => {
            beforeEach(() => {
                result = vec3.divide(vecB, vecA, vecB);
            });

            it("should place values into vecB", () => {
                equality(vecB, [0.25, 0.4, 0.5]);
            });
            it("should return vecB", () => {
                assert.equal(result, vecB);
            });
            it("should not modify vecA", () => {
                equality(vecA, [1, 2, 3]);
            });
        });
    });

    describe("ceil", () => {
        beforeEach(() => {
            vecA = [Math.E, Math.PI, Math.SQRT2];
        });

        describe("with a separate output vector", () => {
            beforeEach(() => {
                result = vec3.ceil(out, vecA);
            });

            it("should place values into out", () => {
                equality(out, [3, 4, 2]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify vecA", () => {
                equality(vecA, [Math.E, Math.PI, Math.SQRT2]);
            });
        });

        describe("when vecA is the output vector", () => {
            beforeEach(() => {
                result = vec3.ceil(vecA, vecA);
            });

            it("should place values into vecA", () => {
                equality(vecA, [3, 4, 2]);
            });
            it("should return vecA", () => {
                assert.equal(result, vecA);
            });
        });
    });

    describe("floor", () => {
        beforeEach(() => {
            vecA = [Math.E, Math.PI, Math.SQRT2];
        });

        describe("with a separate output vector", () => {
            beforeEach(() => {
                result = vec3.floor(out, vecA);
            });

            it("should place values into out", () => {
                equality(out, [2, 3, 1]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify vecA", () => {
                equality(vecA, [Math.E, Math.PI, Math.SQRT2]);
            });
        });

        describe("when vecA is the output vector", () => {
            beforeEach(() => {
                result = vec3.floor(vecA, vecA);
            });

            it("should place values into vecA", () => {
                equality(vecA, [2, 3, 1]);
            });
            it("should return vecA", () => {
                assert.equal(result, vecA);
            });
        });
    });

    describe("min", () => {
        beforeEach(() => {
            vecA = [1, 3, 1]; vecB = [3, 1, 3];
        });

        describe("with a separate output vector", () => {
            beforeEach(() => {
                result = vec3.min(out, vecA, vecB);
            });

            it("should place values into out", () => {
                equality(out, [1, 1, 1]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify vecA", () => {
                equality(vecA, [1, 3, 1]);
            });
            it("should not modify vecB", () => {
                equality(vecB, [3, 1, 3]);
            });
        });

        describe("when vecA is the output vector", () => {
            beforeEach(() => {
                result = vec3.min(vecA, vecA, vecB);
            });

            it("should place values into vecA", () => {
                equality(vecA, [1, 1, 1]);
            });
            it("should return vecA", () => {
                assert.equal(result, vecA);
            });
            it("should not modify vecB", () => {
                equality(vecB, [3, 1, 3]);
            });
        });

        describe("when vecB is the output vector", () => {
            beforeEach(() => {
                result = vec3.min(vecB, vecA, vecB);
            });

            it("should place values into vecB", () => {
                equality(vecB, [1, 1, 1]);
            });
            it("should return vecB", () => {
                assert.equal(result, vecB);
            });
            it("should not modify vecA", () => {
                equality(vecA, [1, 3, 1]);
            });
        });
    });

    describe("max", () => {
        beforeEach(() => {
            vecA = [1, 3, 1]; vecB = [3, 1, 3];
        });

        describe("with a separate output vector", () => {
            beforeEach(() => {
                result = vec3.max(out, vecA, vecB);
            });

            it("should place values into out", () => {
                equality(out, [3, 3, 3]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify vecA", () => {
                equality(vecA, [1, 3, 1]);
            });
            it("should not modify vecB", () => {
                equality(vecB, [3, 1, 3]);
            });
        });

        describe("when vecA is the output vector", () => {
            beforeEach(() => {
                result = vec3.max(vecA, vecA, vecB);
            });

            it("should place values into vecA", () => {
                equality(vecA, [3, 3, 3]);
            });
            it("should return vecA", () => {
                assert.equal(result, vecA);
            });
            it("should not modify vecB", () => {
                equality(vecB, [3, 1, 3]);
            });
        });

        describe("when vecB is the output vector", () => {
            beforeEach(() => {
                result = vec3.max(vecB, vecA, vecB);
            });

            it("should place values into vecB", () => {
                equality(vecB, [3, 3, 3]);
            });
            it("should return vecB", () => {
                assert.equal(result, vecB);
            });
            it("should not modify vecA", () => {
                equality(vecA, [1, 3, 1]);
            });
        });
    });

    describe("round", () => {
        beforeEach(() => {
            vecA = [Math.E, Math.PI, Math.SQRT2];
        });

        describe("with a separate output vector", () => {
            beforeEach(() => {
                result = vec3.round(out, vecA);
            });

            it("should place values into out", () => {
                equality(out, [3, 3, 1]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify vecA", () => {
                equality(vecA, [Math.E, Math.PI, Math.SQRT2]);
            });
        });

        describe("when vecA is the output vector", () => {
            beforeEach(() => {
                result = vec3.round(vecA, vecA);
            });

            it("should place values into vecA", () => {
                equality(vecA, [3, 3, 1]);
            });
            it("should return vecA", () => {
                assert.equal(result, vecA);
            });
        });
    });

    describe("scale", () => {
        describe("with a separate output vector", () => {
            beforeEach(() => {
                result = vec3.scale(out, vecA, 2);
            });

            it("should place values into out", () => {
                equality(out, [2, 4, 6]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify vecA", () => {
                equality(vecA, [1, 2, 3]);
            });
        });

        describe("when vecA is the output vector", () => {
            beforeEach(() => {
                result = vec3.scale(vecA, vecA, 2);
            });

            it("should place values into vecA", () => {
                equality(vecA, [2, 4, 6]);
            });
            it("should return vecA", () => {
                assert.equal(result, vecA);
            });
        });
    });

    describe("scaleAndAdd", () => {
        describe("with a separate output vector", () => {
            beforeEach(() => {
                result = vec3.scaleAndAdd(out, vecA, vecB, 0.5);
            });

            it("should place values into out", () => {
                equality(out, [3, 4.5, 6]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify vecA", () => {
                equality(vecA, [1, 2, 3]);
            });
            it("should not modify vecB", () => {
                equality(vecB, [4, 5, 6]);
            });
        });

        describe("when vecA is the output vector", () => {
            beforeEach(() => {
                result = vec3.scaleAndAdd(vecA, vecA, vecB, 0.5);
            });

            it("should place values into vecA", () => {
                equality(vecA, [3, 4.5, 6]);
            });
            it("should return vecA", () => {
                assert.equal(result, vecA);
            });
            it("should not modify vecB", () => {
                equality(vecB, [4, 5, 6]);
            });
        });

        describe("when vecB is the output vector", () => {
            beforeEach(() => {
                result = vec3.scaleAndAdd(vecB, vecA, vecB, 0.5);
            });

            it("should place values into vecB", () => {
                equality(vecB, [3, 4.5, 6]);
            });
            it("should return vecB", () => {
                assert.equal(result, vecB);
            });
            it("should not modify vecA", () => {
                equality(vecA, [1, 2, 3]);
            });
        });
    });

    describe("distance", () => {
        it("should have an alias called 'dist'", () => {
            assert.equal(vec3.dist, vec3.distance);
        });

        beforeEach(() => {
            result = vec3.distance(vecA, vecB);
        });

        it("should return the distance", () => {
            assert.closeTo(result, 5.196152, 0.000001);
        });
    });

    describe("squaredDistance", () => {
        it("should have an alias called 'sqrDist'", () => {
            assert.equal(vec3.sqrDist, vec3.squaredDistance);
        });

        beforeEach(() => {
            result = vec3.squaredDistance(vecA, vecB);
        });

        it("should return the squared distance", () => {
            assert.equal(result, 27);
        });
    });

    describe("length", () => {
        it("should have an alias called 'len'", () => {
            assert.equal(vec3.len, vec3.length);
        });

        beforeEach(() => {
            result = vec3.length(vecA);
        });

        it("should return the length", () => {
            assert.closeTo(result, 3.741657, 0.000001);
        });
    });

    describe("squaredLength", () => {
        it("should have an alias called 'sqrLen'", () => {
            assert.equal(vec3.sqrLen, vec3.squaredLength);
        });

        beforeEach(() => {
            result = vec3.squaredLength(vecA);
        });

        it("should return the squared length", () => {
            assert.equal(result, 14);
        });
    });

    describe("negate", () => {
        describe("with a separate output vector", () => {
            beforeEach(() => {
                result = vec3.negate(out, vecA);
            });

            it("should place values into out", () => {
                equality(out, [-1, -2, -3]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify vecA", () => {
                equality(vecA, [1, 2, 3]);
            });
        });

        describe("when vecA is the output vector", () => {
            beforeEach(() => {
                result = vec3.negate(vecA, vecA);
            });

            it("should place values into vecA", () => {
                equality(vecA, [-1, -2, -3]);
            });
            it("should return vecA", () => {
                assert.equal(result, vecA);
            });
        });
    });

    describe("normalize", () => {
        beforeEach(() => {
            vecA = [5, 0, 0];
        });

        describe("with a separate output vector", () => {
            beforeEach(() => {
                result = vec3.normalize(out, vecA);
            });

            it("should place values into out", () => {
                equality(out, [1, 0, 0]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify vecA", () => {
                equality(vecA, [5, 0, 0]);
            });
        });

        describe("when vecA is the output vector", () => {
            beforeEach(() => {
                result = vec3.normalize(vecA, vecA);
            });

            it("should place values into vecA", () => {
                equality(vecA, [1, 0, 0]);
            });
            it("should return vecA", () => {
                assert.equal(result, vecA);
            });
        });
    });

    describe("dot", () => {
        beforeEach(() => {
            result = vec3.dot(vecA, vecB);
        });

        it("should return the dot product", () => {
            assert.equal(result, 32);
        });
        it("should not modify vecA", () => {
            equality(vecA, [1, 2, 3]);
        });
        it("should not modify vecB", () => {
            equality(vecB, [4, 5, 6]);
        });
    });

    describe("cross", () => {
        describe("with a separate output vector", () => {
            beforeEach(() => {
                result = vec3.cross(out, vecA, vecB);
            });

            it("should place values into out", () => {
                equality(out, [-3, 6, -3]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify vecA", () => {
                equality(vecA, [1, 2, 3]);
            });
            it("should not modify vecB", () => {
                equality(vecB, [4, 5, 6]);
            });
        });

        describe("when vecA is the output vector", () => {
            beforeEach(() => {
                result = vec3.cross(vecA, vecA, vecB);
            });

            it("should place values into vecA", () => {
                equality(vecA, [-3, 6, -3]);
            });
            it("should return vecA", () => {
                assert.equal(result, vecA);
            });
            it("should not modify vecB", () => {
                equality(vecB, [4, 5, 6]);
            });
        });

        describe("when vecB is the output vector", () => {
            beforeEach(() => {
                result = vec3.cross(vecB, vecA, vecB);
            });

            it("should place values into vecB", () => {
                equality(vecB, [-3, 6, -3]);
            });
            it("should return vecB", () => {
                assert.equal(result, vecB);
            });
            it("should not modify vecA", () => {
                equality(vecA, [1, 2, 3]);
            });
        });
    });

    describe("lerp", () => {
        describe("with a separate output vector", () => {
            beforeEach(() => {
                result = vec3.lerp(out, vecA, vecB, 0.5);
            });

            it("should place values into out", () => {
                equality(out, [2.5, 3.5, 4.5]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify vecA", () => {
                equality(vecA, [1, 2, 3]);
            });
            it("should not modify vecB", () => {
                equality(vecB, [4, 5, 6]);
            });
        });

        describe("when vecA is the output vector", () => {
            beforeEach(() => {
                result = vec3.lerp(vecA, vecA, vecB, 0.5);
            });

            it("should place values into vecA", () => {
                equality(vecA, [2.5, 3.5, 4.5]);
            });
            it("should return vecA", () => {
                assert.equal(result, vecA);
            });
            it("should not modify vecB", () => {
                equality(vecB, [4, 5, 6]);
            });
        });

        describe("when vecB is the output vector", () => {
            beforeEach(() => {
                result = vec3.lerp(vecB, vecA, vecB, 0.5);
            });

            it("should place values into vecB", () => {
                equality(vecB, [2.5, 3.5, 4.5]);
            });
            it("should return vecB", () => {
                assert.equal(result, vecB);
            });
            it("should not modify vecA", () => {
                equality(vecA, [1, 2, 3]);
            });
        });
    });

    describe("random", () => {
        describe("with no scale", () => {
            beforeEach(() => {
                result = vec3.random(out);
            });

            it("should result in a unit length vector", () => {
                assert.closeTo(vec3.length(out), 1.0, 0.1);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
        });

        describe("with a scale", () => {
            beforeEach(() => {
                result = vec3.random(out, 5.0);
            });

            it("should result in a unit length vector", () => {
                assert.closeTo(vec3.length(out), 5.0, 0.1);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
        });
    });

    describe("forEach", () => {
        let vecArray;

        beforeEach(() => {
            vecArray = [
                1, 2, 3,
                4, 5, 6,
                0, 0, 0
            ];
        });

        describe("when performing operations that take no extra arguments", () => {
            beforeEach(() => {
                result = vec3.forEach(vecArray, 0, 0, 0, vec3.normalize);
            });

            it("should update all values", () => {
                equality(vecArray, [
                    0.267261, 0.534522, 0.801783,
                    0.455842, 0.569802, 0.683763,
                    0, 0, 0
                ]);
            });
            it("should return vecArray", () => {
                assert.equal(result, vecArray);
            });
        });

        describe("when performing operations that takes one extra arguments", () => {
            beforeEach(() => {
                result = vec3.forEach(vecArray, 0, 0, 0, vec3.add, vecA);
            });

            it("should update all values", () => {
                equality(vecArray, [
                    2, 4, 6,
                    5, 7, 9,
                    1, 2, 3
                ]);
            });
            it("should return vecArray", () => {
                assert.equal(result, vecArray);
            });
            it("should not modify vecA", () => {
                equality(vecA, [1, 2, 3]);
            });
        });

        describe("when specifying an offset", () => {
            beforeEach(() => {
                result = vec3.forEach(vecArray, 0, 3, 0, vec3.add, vecA);
            });

            it("should update all values except the first vector", () => {
                equality(vecArray, [
                    1, 2, 3,
                    5, 7, 9,
                    1, 2, 3
                ]);
            });
            it("should return vecArray", () => {
                assert.equal(result, vecArray);
            });
            it("should not modify vecA", () => {
                equality(vecA, [1, 2, 3]);
            });
        });

        describe("when specifying a count", () => {
            beforeEach(() => {
                result = vec3.forEach(vecArray, 0, 0, 2, vec3.add, vecA);
            });

            it("should update all values except the last vector", () => {
                equality(vecArray, [
                    2, 4, 6,
                    5, 7, 9,
                    0, 0, 0
                ]);
            });
            it("should return vecArray", () => {
                assert.equal(result, vecArray);
            });
            it("should not modify vecA", () => {
                equality(vecA, [1, 2, 3]);
            });
        });

        describe("when specifying a stride", () => {
            beforeEach(() => {
                result = vec3.forEach(vecArray, 6, 0, 0, vec3.add, vecA);
            });

            it("should update all values except the second vector", () => {
                equality(vecArray, [
                    2, 4, 6,
                    4, 5, 6,
                    1, 2, 3
                ]);
            });
            it("should return vecArray", () => {
                assert.equal(result, vecArray);
            });
            it("should not modify vecA", () => {
                equality(vecA, [1, 2, 3]);
            });
        });

        describe("when calling a function that does not modify the out variable", () => {
            beforeEach(() => {
                result = vec3.forEach(vecArray, 0, 0, 0, (out, vec) => { });
            });

            it("values should remain unchanged", () => {
                equality(vecArray, [
                    1, 2, 3,
                    4, 5, 6,
                    0, 0, 0
                ]);
            });
            it("should return vecArray", () => {
                assert.equal(result, vecArray);
            });
        });
    });

    describe("angle", () => {
        beforeEach(() => {
            result = vec3.angle(vecA, vecB);
        });

        it("should return the angle", () => {
            equality(result, 0.225726);
        });
        it("should not modify vecA", () => {
            equality(vecA, [1, 2, 3]);
        });
        it("should not modify vecB", () => {
            equality(vecB, [4, 5, 6]);
        });
    });

    describe("str", () => {
        beforeEach(() => {
            result = vec3.str(vecA);
        });

        it("should return a string representation of the vector", () => {
            assert.equal(result, "vec3(1, 2, 3)");
        });
    });

    describe("exactEquals", () => {
        let vecC, r0, r1;
        beforeEach(() => {
            vecA = [0, 1, 2];
            vecB = [0, 1, 2];
            vecC = [1, 2, 3];
            r0 = vec3.exactEquals(vecA, vecB);
            r1 = vec3.exactEquals(vecA, vecC);
        });

        it("should return true for identical vectors", () => {
            assert.isTrue(r0);
        });
        it("should return false for different vectors", () => {
            assert.isFalse(r1);
        });
        it("should not modify vecA", () => {
            equality(vecA, [0, 1, 2]);
        });
        it("should not modify vecB", () => {
            equality(vecB, [0, 1, 2]);
        });
    });

    describe("equals", () => {
        let vecC, vecD, r0, r1, r2;
        beforeEach(() => {
            vecA = [0, 1, 2];
            vecB = [0, 1, 2];
            vecC = [1, 2, 3];
            vecD = [1e-16, 1, 2];
            r0 = vec3.equals(vecA, vecB);
            r1 = vec3.equals(vecA, vecC);
            r2 = vec3.equals(vecA, vecD);
        });
        it("should return true for identical vectors", () => {
            assert.isTrue(r0);
        });
        it("should return false for different vectors", () => {
            assert.isFalse(r1);
        });
        it("should return true for close but not identical vectors", () => {
            assert.isTrue(r2);
        });
        it("should not modify vecA", () => {
            equality(vecA, [0, 1, 2]);
        });
        it("should not modify vecB", () => {
            equality(vecB, [0, 1, 2]);
        });
    });
});
