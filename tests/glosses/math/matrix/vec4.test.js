import equality from "./equality";
const { vec3, vec4 } = adone.math.matrix;

describe("math", "matrix", "vec4", () => {
    let out;
    let vecA;
    let vecB;
    let result;

    beforeEach(() => {
        vecA = [1, 2, 3, 4]; vecB = [5, 6, 7, 8]; out = [0, 0, 0, 0];
    });

    describe("create", () => {
        beforeEach(() => {
            result = vec4.create();
        });
        it("should return a 4 element array initialized to 0s", () => {
            equality(result, [0, 0, 0, 0]);
        });
    });

    describe("clone", () => {
        beforeEach(() => {
            result = vec4.clone(vecA);
        });
        it("should return a 4 element array initialized to the values in vecA", () => {
            equality(result, vecA);
        });
    });

    describe("fromValues", () => {
        beforeEach(() => {
            result = vec4.fromValues(1, 2, 3, 4);
        });
        it("should return a 4 element array initialized to the values passed", () => {
            equality(result, [1, 2, 3, 4]);
        });
    });

    describe("copy", () => {
        beforeEach(() => {
            result = vec4.copy(out, vecA);
        });
        it("should place values into out", () => {
            equality(out, [1, 2, 3, 4]);
        });
        it("should return out", () => {
            assert.equal(result, out);
        });
    });

    describe("set", () => {
        beforeEach(() => {
            result = vec4.set(out, 1, 2, 3, 4);
        });
        it("should place values into out", () => {
            equality(out, [1, 2, 3, 4]);
        });
        it("should return out", () => {
            assert.equal(result, out);
        });
    });

    describe("add", () => {
        describe("with a separate output vector", () => {
            beforeEach(() => {
                result = vec4.add(out, vecA, vecB);
            });

            it("should place values into out", () => {
                equality(out, [6, 8, 10, 12]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify vecA", () => {
                equality(vecA, [1, 2, 3, 4]);
            });
            it("should not modify vecB", () => {
                equality(vecB, [5, 6, 7, 8]);
            });
        });

        describe("when vecA is the output vector", () => {
            beforeEach(() => {
                result = vec4.add(vecA, vecA, vecB);
            });

            it("should place values into vecA", () => {
                equality(vecA, [6, 8, 10, 12]);
            });
            it("should return vecA", () => {
                assert.equal(result, vecA);
            });
            it("should not modify vecB", () => {
                equality(vecB, [5, 6, 7, 8]);
            });
        });

        describe("when vecB is the output vector", () => {
            beforeEach(() => {
                result = vec4.add(vecB, vecA, vecB);
            });

            it("should place values into vecB", () => {
                equality(vecB, [6, 8, 10, 12]);
            });
            it("should return vecB", () => {
                assert.equal(result, vecB);
            });
            it("should not modify vecA", () => {
                equality(vecA, [1, 2, 3, 4]);
            });
        });
    });

    describe("subtract", () => {
        it("should have an alias called 'sub'", () => {
            assert.equal(vec4.sub, vec4.subtract);
        });

        describe("with a separate output vector", () => {
            beforeEach(() => {
                result = vec4.subtract(out, vecA, vecB);
            });

            it("should place values into out", () => {
                equality(out, [-4, -4, -4, -4]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify vecA", () => {
                equality(vecA, [1, 2, 3, 4]);
            });
            it("should not modify vecB", () => {
                equality(vecB, [5, 6, 7, 8]);
            });
        });

        describe("when vecA is the output vector", () => {
            beforeEach(() => {
                result = vec4.subtract(vecA, vecA, vecB);
            });

            it("should place values into vecA", () => {
                equality(vecA, [-4, -4, -4, -4]);
            });
            it("should return vecA", () => {
                assert.equal(result, vecA);
            });
            it("should not modify vecB", () => {
                equality(vecB, [5, 6, 7, 8]);
            });
        });

        describe("when vecB is the output vector", () => {
            beforeEach(() => {
                result = vec4.subtract(vecB, vecA, vecB);
            });

            it("should place values into vecB", () => {
                equality(vecB, [-4, -4, -4, -4]);
            });
            it("should return vecB", () => {
                assert.equal(result, vecB);
            });
            it("should not modify vecA", () => {
                equality(vecA, [1, 2, 3, 4]);
            });
        });
    });

    describe("multiply", () => {
        it("should have an alias called 'mul'", () => {
            assert.equal(vec4.mul, vec4.multiply);
        });

        describe("with a separate output vector", () => {
            beforeEach(() => {
                result = vec4.multiply(out, vecA, vecB);
            });

            it("should place values into out", () => {
                equality(out, [5, 12, 21, 32]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify vecA", () => {
                equality(vecA, [1, 2, 3, 4]);
            });
            it("should not modify vecB", () => {
                equality(vecB, [5, 6, 7, 8]);
            });
        });

        describe("when vecA is the output vector", () => {
            beforeEach(() => {
                result = vec4.multiply(vecA, vecA, vecB);
            });

            it("should place values into vecA", () => {
                equality(vecA, [5, 12, 21, 32]);
            });
            it("should return vecA", () => {
                assert.equal(result, vecA);
            });
            it("should not modify vecB", () => {
                equality(vecB, [5, 6, 7, 8]);
            });
        });

        describe("when vecB is the output vector", () => {
            beforeEach(() => {
                result = vec4.multiply(vecB, vecA, vecB);
            });

            it("should place values into vecB", () => {
                equality(vecB, [5, 12, 21, 32]);
            });
            it("should return vecB", () => {
                assert.equal(result, vecB);
            });
            it("should not modify vecA", () => {
                equality(vecA, [1, 2, 3, 4]);
            });
        });
    });

    describe("divide", () => {
        it("should have an alias called 'div'", () => {
            assert.equal(vec4.div, vec4.divide);
        });

        describe("with a separate output vector", () => {
            beforeEach(() => {
                result = vec4.divide(out, vecA, vecB);
            });

            it("should place values into out", () => {
                equality(out, [0.2, 0.333333, 0.428571, 0.5]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify vecA", () => {
                equality(vecA, [1, 2, 3, 4]);
            });
            it("should not modify vecB", () => {
                equality(vecB, [5, 6, 7, 8]);
            });
        });

        describe("when vecA is the output vector", () => {
            beforeEach(() => {
                result = vec4.divide(vecA, vecA, vecB);
            });

            it("should place values into vecA", () => {
                equality(vecA, [0.2, 0.333333, 0.428571, 0.5]);
            });
            it("should return vecA", () => {
                assert.equal(result, vecA);
            });
            it("should not modify vecB", () => {
                equality(vecB, [5, 6, 7, 8]);
            });
        });

        describe("when vecB is the output vector", () => {
            beforeEach(() => {
                result = vec4.divide(vecB, vecA, vecB);
            });

            it("should place values into vecB", () => {
                equality(vecB, [0.2, 0.333333, 0.428571, 0.5]);
            });
            it("should return vecB", () => {
                assert.equal(result, vecB);
            });
            it("should not modify vecA", () => {
                equality(vecA, [1, 2, 3, 4]);
            });
        });
    });

    describe("ceil", () => {
        beforeEach(() => {
            vecA = [Math.E, Math.PI, Math.SQRT2, Math.SQRT1_2];
        });

        describe("with a separate output vector", () => {
            beforeEach(() => {
                result = vec4.ceil(out, vecA);
            });

            it("should place values into out", () => {
                equality(out, [3, 4, 2, 1]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify vecA", () => {
                equality(vecA, [Math.E, Math.PI, Math.SQRT2, Math.SQRT1_2]);
            });
        });

        describe("when vecA is the output vector", () => {
            beforeEach(() => {
                result = vec4.ceil(vecA, vecA);
            });

            it("should place values into vecA", () => {
                equality(vecA, [3, 4, 2, 1]);
            });
            it("should return vecA", () => {
                assert.equal(result, vecA);
            });
        });
    });

    describe("floor", () => {
        beforeEach(() => {
            vecA = [Math.E, Math.PI, Math.SQRT2, Math.SQRT1_2];
        });

        describe("with a separate output vector", () => {
            beforeEach(() => {
                result = vec4.floor(out, vecA);
            });

            it("should place values into out", () => {
                equality(out, [2, 3, 1, 0]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify vecA", () => {
                equality(vecA, [Math.E, Math.PI, Math.SQRT2, Math.SQRT1_2]);
            });
        });

        describe("when vecA is the output vector", () => {
            beforeEach(() => {
                result = vec4.floor(vecA, vecA);
            });

            it("should place values into vecA", () => {
                equality(vecA, [2, 3, 1, 0]);
            });
            it("should return vecA", () => {
                assert.equal(result, vecA);
            });
        });
    });

    describe("min", () => {
        beforeEach(() => {
            vecA = [1, 3, 1, 3]; vecB = [3, 1, 3, 1];
        });

        describe("with a separate output vector", () => {
            beforeEach(() => {
                result = vec4.min(out, vecA, vecB);
            });

            it("should place values into out", () => {
                equality(out, [1, 1, 1, 1]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify vecA", () => {
                equality(vecA, [1, 3, 1, 3]);
            });
            it("should not modify vecB", () => {
                equality(vecB, [3, 1, 3, 1]);
            });
        });

        describe("when vecA is the output vector", () => {
            beforeEach(() => {
                result = vec4.min(vecA, vecA, vecB);
            });

            it("should place values into vecA", () => {
                equality(vecA, [1, 1, 1, 1]);
            });
            it("should return vecA", () => {
                assert.equal(result, vecA);
            });
            it("should not modify vecB", () => {
                equality(vecB, [3, 1, 3, 1]);
            });
        });

        describe("when vecB is the output vector", () => {
            beforeEach(() => {
                result = vec4.min(vecB, vecA, vecB);
            });

            it("should place values into vecB", () => {
                equality(vecB, [1, 1, 1, 1]);
            });
            it("should return vecB", () => {
                assert.equal(result, vecB);
            });
            it("should not modify vecA", () => {
                equality(vecA, [1, 3, 1, 3]);
            });
        });
    });

    describe("max", () => {
        beforeEach(() => {
            vecA = [1, 3, 1, 3]; vecB = [3, 1, 3, 1];
        });

        describe("with a separate output vector", () => {
            beforeEach(() => {
                result = vec4.max(out, vecA, vecB);
            });

            it("should place values into out", () => {
                equality(out, [3, 3, 3, 3]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify vecA", () => {
                equality(vecA, [1, 3, 1, 3]);
            });
            it("should not modify vecB", () => {
                equality(vecB, [3, 1, 3, 1]);
            });
        });

        describe("when vecA is the output vector", () => {
            beforeEach(() => {
                result = vec4.max(vecA, vecA, vecB);
            });

            it("should place values into vecA", () => {
                equality(vecA, [3, 3, 3, 3]);
            });
            it("should return vecA", () => {
                assert.equal(result, vecA);
            });
            it("should not modify vecB", () => {
                equality(vecB, [3, 1, 3, 1]);
            });
        });

        describe("when vecB is the output vector", () => {
            beforeEach(() => {
                result = vec4.max(vecB, vecA, vecB);
            });

            it("should place values into vecB", () => {
                equality(vecB, [3, 3, 3, 3]);
            });
            it("should return vecB", () => {
                assert.equal(result, vecB);
            });
            it("should not modify vecA", () => {
                equality(vecA, [1, 3, 1, 3]);
            });
        });
    });

    describe("round", () => {
        beforeEach(() => {
            vecA = [Math.E, Math.PI, Math.SQRT2, Math.SQRT1_2];
        });

        describe("with a separate output vector", () => {
            beforeEach(() => {
                result = vec4.round(out, vecA);
            });

            it("should place values into out", () => {
                equality(out, [3, 3, 1, 1]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify vecA", () => {
                equality(vecA, [Math.E, Math.PI, Math.SQRT2, Math.SQRT1_2]);
            });
        });

        describe("when vecA is the output vector", () => {
            beforeEach(() => {
                result = vec4.round(vecA, vecA);
            });

            it("should place values into vecA", () => {
                equality(vecA, [3, 3, 1, 1]);
            });
            it("should return vecA", () => {
                assert.equal(result, vecA);
            });
        });
    });

    describe("scale", () => {
        describe("with a separate output vector", () => {
            beforeEach(() => {
                result = vec4.scale(out, vecA, 2);
            });

            it("should place values into out", () => {
                equality(out, [2, 4, 6, 8]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify vecA", () => {
                equality(vecA, [1, 2, 3, 4]);
            });
        });

        describe("when vecA is the output vector", () => {
            beforeEach(() => {
                result = vec4.scale(vecA, vecA, 2);
            });

            it("should place values into vecA", () => {
                equality(vecA, [2, 4, 6, 8]);
            });
            it("should return vecA", () => {
                assert.equal(result, vecA);
            });
        });
    });

    describe("scaleAndAdd", () => {
        describe("with a separate output vector", () => {
            beforeEach(() => {
                result = vec4.scaleAndAdd(out, vecA, vecB, 0.5);
            });

            it("should place values into out", () => {
                equality(out, [3.5, 5, 6.5, 8]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify vecA", () => {
                equality(vecA, [1, 2, 3, 4]);
            });
            it("should not modify vecB", () => {
                equality(vecB, [5, 6, 7, 8]);
            });
        });

        describe("when vecA is the output vector", () => {
            beforeEach(() => {
                result = vec4.scaleAndAdd(vecA, vecA, vecB, 0.5);
            });

            it("should place values into vecA", () => {
                equality(vecA, [3.5, 5, 6.5, 8]);
            });
            it("should return vecA", () => {
                assert.equal(result, vecA);
            });
            it("should not modify vecB", () => {
                equality(vecB, [5, 6, 7, 8]);
            });
        });

        describe("when vecB is the output vector", () => {
            beforeEach(() => {
                result = vec4.scaleAndAdd(vecB, vecA, vecB, 0.5);
            });

            it("should place values into vecB", () => {
                equality(vecB, [3.5, 5, 6.5, 8]);
            });
            it("should return vecB", () => {
                assert.equal(result, vecB);
            });
            it("should not modify vecA", () => {
                equality(vecA, [1, 2, 3, 4]);
            });
        });
    });

    describe("distance", () => {
        it("should have an alias called 'dist'", () => {
            assert.equal(vec4.dist, vec4.distance);
        });

        beforeEach(() => {
            result = vec4.distance(vecA, vecB);
        });

        it("should return the distance", () => {
            assert.closeTo(result, 8, 0.1);
        });
    });

    describe("squaredDistance", () => {
        it("should have an alias called 'sqrDist'", () => {
            assert.equal(vec4.sqrDist, vec4.squaredDistance);
        });

        beforeEach(() => {
            result = vec4.squaredDistance(vecA, vecB);
        });

        it("should return the squared distance", () => {
            assert.equal(result, 64);
        });
    });

    describe("length", () => {
        it("should have an alias called 'len'", () => {
            assert.equal(vec4.len, vec4.length);
        });

        beforeEach(() => {
            result = vec4.length(vecA);
        });

        it("should return the length", () => {
            assert.closeTo(result, 5.477225, 0.000001);
        });
    });

    describe("squaredLength", () => {
        it("should have an alias called 'sqrLen'", () => {
            assert.equal(vec4.sqrLen, vec4.squaredLength);
        });

        beforeEach(() => {
            result = vec4.squaredLength(vecA);
        });

        it("should return the squared length", () => {
            assert.equal(result, 30);
        });
    });

    describe("negate", () => {
        describe("with a separate output vector", () => {
            beforeEach(() => {
                result = vec4.negate(out, vecA);
            });

            it("should place values into out", () => {
                equality(out, [-1, -2, -3, -4]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify vecA", () => {
                equality(vecA, [1, 2, 3, 4]);
            });
        });

        describe("when vecA is the output vector", () => {
            beforeEach(() => {
                result = vec4.negate(vecA, vecA);
            });

            it("should place values into vecA", () => {
                equality(vecA, [-1, -2, -3, -4]);
            });
            it("should return vecA", () => {
                assert.equal(result, vecA);
            });
        });
    });

    describe("normalize", () => {
        beforeEach(() => {
            vecA = [5, 0, 0, 0];
        });

        describe("with a separate output vector", () => {
            beforeEach(() => {
                result = vec4.normalize(out, vecA);
            });

            it("should place values into out", () => {
                equality(out, [1, 0, 0, 0]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify vecA", () => {
                equality(vecA, [5, 0, 0, 0]);
            });
        });

        describe("when vecA is the output vector", () => {
            beforeEach(() => {
                result = vec4.normalize(vecA, vecA);
            });

            it("should place values into vecA", () => {
                equality(vecA, [1, 0, 0, 0]);
            });
            it("should return vecA", () => {
                assert.equal(result, vecA);
            });
        });
    });

    describe("dot", () => {
        beforeEach(() => {
            result = vec4.dot(vecA, vecB);
        });

        it("should return the dot product", () => {
            assert.equal(result, 70);
        });
        it("should not modify vecA", () => {
            equality(vecA, [1, 2, 3, 4]);
        });
        it("should not modify vecB", () => {
            equality(vecB, [5, 6, 7, 8]);
        });
    });

    describe("lerp", () => {
        describe("with a separate output vector", () => {
            beforeEach(() => {
                result = vec4.lerp(out, vecA, vecB, 0.5);
            });

            it("should place values into out", () => {
                equality(out, [3, 4, 5, 6]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify vecA", () => {
                equality(vecA, [1, 2, 3, 4]);
            });
            it("should not modify vecB", () => {
                equality(vecB, [5, 6, 7, 8]);
            });
        });

        describe("when vecA is the output vector", () => {
            beforeEach(() => {
                result = vec4.lerp(vecA, vecA, vecB, 0.5);
            });

            it("should place values into vecA", () => {
                equality(vecA, [3, 4, 5, 6]);
            });
            it("should return vecA", () => {
                assert.equal(result, vecA);
            });
            it("should not modify vecB", () => {
                equality(vecB, [5, 6, 7, 8]);
            });
        });

        describe("when vecB is the output vector", () => {
            beforeEach(() => {
                result = vec4.lerp(vecB, vecA, vecB, 0.5);
            });

            it("should place values into vecB", () => {
                equality(vecB, [3, 4, 5, 6]);
            });
            it("should return vecB", () => {
                assert.equal(result, vecB);
            });
            it("should not modify vecA", () => {
                equality(vecA, [1, 2, 3, 4]);
            });
        });
    });

    describe("random", () => {
        describe("with no scale", () => {
            beforeEach(() => {
                result = vec4.random(out);
            });

            it("should result in a unit length vector", () => {
                assert.closeTo(vec4.length(out), 1.0, 0.1);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
        });

        describe("with a scale", () => {
            beforeEach(() => {
                result = vec4.random(out, 5.0);
            });

            it("should result in a unit length vector", () => {
                assert.closeTo(vec4.length(out), 5.0, 0.1);
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
                1, 2, 3, 4,
                5, 6, 7, 8,
                0, 0, 0, 0
            ];
        });

        describe("when performing operations that take no extra arguments", () => {
            beforeEach(() => {
                result = vec4.forEach(vecArray, 0, 0, 0, vec4.normalize);
            });

            it("should update all values", () => {
                equality(vecArray, [
                    0.182574, 0.365148, 0.547722, 0.730296,
                    0.379049, 0.454858, 0.530668, 0.606478,
                    0, 0, 0, 0
                ]);
            });
            it("should return vecArray", () => {
                assert.equal(result, vecArray);
            });
        });

        describe("when performing operations that takes one extra arguments", () => {
            beforeEach(() => {
                result = vec4.forEach(vecArray, 0, 0, 0, vec4.add, vecA);
            });

            it("should update all values", () => {
                equality(vecArray, [
                    2, 4, 6, 8,
                    6, 8, 10, 12,
                    1, 2, 3, 4
                ]);
            });
            it("should return vecArray", () => {
                assert.equal(result, vecArray);
            });
            it("should not modify vecA", () => {
                equality(vecA, [1, 2, 3, 4]);
            });
        });

        describe("when specifying an offset", () => {
            beforeEach(() => {
                result = vec4.forEach(vecArray, 0, 4, 0, vec4.add, vecA);
            });

            it("should update all values except the first vector", () => {
                equality(vecArray, [
                    1, 2, 3, 4,
                    6, 8, 10, 12,
                    1, 2, 3, 4
                ]);
            });
            it("should return vecArray", () => {
                assert.equal(result, vecArray);
            });
            it("should not modify vecA", () => {
                equality(vecA, [1, 2, 3, 4]);
            });
        });

        describe("when specifying a count", () => {
            beforeEach(() => {
                result = vec4.forEach(vecArray, 0, 0, 2, vec4.add, vecA);
            });

            it("should update all values except the last vector", () => {
                equality(vecArray, [
                    2, 4, 6, 8,
                    6, 8, 10, 12,
                    0, 0, 0, 0
                ]);
            });
            it("should return vecArray", () => {
                assert.equal(result, vecArray);
            });
            it("should not modify vecA", () => {
                equality(vecA, [1, 2, 3, 4]);
            });
        });

        describe("when specifying a stride", () => {
            beforeEach(() => {
                result = vec4.forEach(vecArray, 8, 0, 0, vec4.add, vecA);
            });

            it("should update all values except the second vector", () => {
                equality(vecArray, [
                    2, 4, 6, 8,
                    5, 6, 7, 8,
                    1, 2, 3, 4
                ]);
            });
            it("should return vecArray", () => {
                assert.equal(result, vecArray);
            });
            it("should not modify vecA", () => {
                equality(vecA, [1, 2, 3, 4]);
            });
        });

        describe("when calling a function that does not modify the out variable", () => {
            beforeEach(() => {
                result = vec3.forEach(vecArray, 0, 0, 0, (out, vec) => { });
            });

            it("values should remain unchanged", () => {
                equality(vecArray, [
                    1, 2, 3, 4,
                    5, 6, 7, 8,
                    0, 0, 0, 0
                ]);
            });
            it("should return vecArray", () => {
                assert.equal(result, vecArray);
            });
        });
    });

    describe("str", () => {
        beforeEach(() => {
            result = vec4.str(vecA);
        });

        it("should return a string representation of the vector", () => {
            assert.equal(result, "vec4(1, 2, 3, 4)");
        });
    });

    describe("exactEquals", () => {
        let vecC, r0, r1;
        beforeEach(() => {
            vecA = [0, 1, 2, 3];
            vecB = [0, 1, 2, 3];
            vecC = [1, 2, 3, 4];
            r0 = vec4.exactEquals(vecA, vecB);
            r1 = vec4.exactEquals(vecA, vecC);
        });

        it("should return true for identical vectors", () => {
            assert.isTrue(r0);
        });
        it("should return false for different vectors", () => {
            assert.isFalse(r1);
        });
        it("should not modify vecA", () => {
            equality(vecA, [0, 1, 2, 3]);
        });
        it("should not modify vecB", () => {
            equality(vecB, [0, 1, 2, 3]);
        });
    });

    describe("equals", () => {
        let vecC, vecD, r0, r1, r2;
        beforeEach(() => {
            vecA = [0, 1, 2, 3];
            vecB = [0, 1, 2, 3];
            vecC = [1, 2, 3, 4];
            vecD = [1e-16, 1, 2, 3];
            r0 = vec4.equals(vecA, vecB);
            r1 = vec4.equals(vecA, vecC);
            r2 = vec4.equals(vecA, vecD);
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
            equality(vecA, [0, 1, 2, 3]);
        });
        it("should not modify vecB", () => {
            equality(vecB, [0, 1, 2, 3]);
        });
    });
});
