import assertEquality from "./assert_equality";
const { vec2 } = adone.math.matrix;

describe("math", "matrix", "vec2", () => {
    let out;
    let vecA;
    let vecB;
    let result;

    beforeEach(() => {
        vecA = [1, 2]; vecB = [3, 4]; out = [0, 0];
    });

    describe("create", () => {
        beforeEach(() => {
            result = vec2.create();
        });
        it("should return a 2 element array initialized to 0s", () => {
            assertEquality(result, [0, 0]);
        });
    });

    describe("clone", () => {
        beforeEach(() => {
            result = vec2.clone(vecA);
        });
        it("should return a 2 element array initialized to the values in vecA", () => {
            assertEquality(result, vecA);
        });
    });

    describe("fromValues", () => {
        beforeEach(() => {
            result = vec2.fromValues(1, 2);
        });
        it("should return a 2 element array initialized to the values passed", () => {
            assertEquality(result, [1, 2]);
        });
    });

    describe("copy", () => {
        beforeEach(() => {
            result = vec2.copy(out, vecA);
        });
        it("should place values into out", () => {
            assertEquality(out, [1, 2]);
        });
        it("should return out", () => {
            assert.equal(result, out);
        });
    });

    describe("set", () => {
        beforeEach(() => {
            result = vec2.set(out, 1, 2);
        });
        it("should place values into out", () => {
            assertEquality(out, [1, 2]);
        });
        it("should return out", () => {
            assert.equal(result, out);
        });
    });

    describe("add", () => {
        describe("with a separate output vector", () => {
            beforeEach(() => {
                result = vec2.add(out, vecA, vecB);
            });

            it("should place values into out", () => {
                assertEquality(out, [4, 6]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify vecA", () => {
                assertEquality(vecA, [1, 2]);
            });
            it("should not modify vecB", () => {
                assertEquality(vecB, [3, 4]);
            });
        });

        describe("when vecA is the output vector", () => {
            beforeEach(() => {
                result = vec2.add(vecA, vecA, vecB);
            });

            it("should place values into vecA", () => {
                assertEquality(vecA, [4, 6]);
            });
            it("should return vecA", () => {
                assert.equal(result, vecA);
            });
            it("should not modify vecB", () => {
                assertEquality(vecB, [3, 4]);
            });
        });

        describe("when vecB is the output vector", () => {
            beforeEach(() => {
                result = vec2.add(vecB, vecA, vecB);
            });

            it("should place values into vecB", () => {
                assertEquality(vecB, [4, 6]);
            });
            it("should return vecB", () => {
                assert.equal(result, vecB);
            });
            it("should not modify vecA", () => {
                assertEquality(vecA, [1, 2]);
            });
        });
    });

    describe("subtract", () => {
        it("should have an alias called 'sub'", () => {
            assert.equal(vec2.sub, vec2.subtract);
        });

        describe("with a separate output vector", () => {
            beforeEach(() => {
                result = vec2.subtract(out, vecA, vecB);
            });

            it("should place values into out", () => {
                assertEquality(out, [-2, -2]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify vecA", () => {
                assertEquality(vecA, [1, 2]);
            });
            it("should not modify vecB", () => {
                assertEquality(vecB, [3, 4]);
            });
        });

        describe("when vecA is the output vector", () => {
            beforeEach(() => {
                result = vec2.subtract(vecA, vecA, vecB);
            });

            it("should place values into vecA", () => {
                assertEquality(vecA, [-2, -2]);
            });
            it("should return vecA", () => {
                assert.equal(result, vecA);
            });
            it("should not modify vecB", () => {
                assertEquality(vecB, [3, 4]);
            });
        });

        describe("when vecB is the output vector", () => {
            beforeEach(() => {
                result = vec2.subtract(vecB, vecA, vecB);
            });

            it("should place values into vecB", () => {
                assertEquality(vecB, [-2, -2]);
            });
            it("should return vecB", () => {
                assert.equal(result, vecB);
            });
            it("should not modify vecA", () => {
                assertEquality(vecA, [1, 2]);
            });
        });
    });

    describe("multiply", () => {
        it("should have an alias called 'mul'", () => {
            assert.equal(vec2.mul, vec2.multiply);
        });

        describe("with a separate output vector", () => {
            beforeEach(() => {
                result = vec2.multiply(out, vecA, vecB);
            });

            it("should place values into out", () => {
                assertEquality(out, [3, 8]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify vecA", () => {
                assertEquality(vecA, [1, 2]);
            });
            it("should not modify vecB", () => {
                assertEquality(vecB, [3, 4]);
            });
        });

        describe("when vecA is the output vector", () => {
            beforeEach(() => {
                result = vec2.multiply(vecA, vecA, vecB);
            });

            it("should place values into vecA", () => {
                assertEquality(vecA, [3, 8]);
            });
            it("should return vecA", () => {
                assert.equal(result, vecA);
            });
            it("should not modify vecB", () => {
                assertEquality(vecB, [3, 4]);
            });
        });

        describe("when vecB is the output vector", () => {
            beforeEach(() => {
                result = vec2.multiply(vecB, vecA, vecB);
            });

            it("should place values into vecB", () => {
                assertEquality(vecB, [3, 8]);
            });
            it("should return vecB", () => {
                assert.equal(result, vecB);
            });
            it("should not modify vecA", () => {
                assertEquality(vecA, [1, 2]);
            });
        });
    });

    describe("divide", () => {
        it("should have an alias called 'div'", () => {
            assert.equal(vec2.div, vec2.divide);
        });

        describe("with a separate output vector", () => {
            beforeEach(() => {
                result = vec2.divide(out, vecA, vecB);
            });

            it("should place values into out", () => {
                assertEquality(out, [0.3333333, 0.5]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify vecA", () => {
                assertEquality(vecA, [1, 2]);
            });
            it("should not modify vecB", () => {
                assertEquality(vecB, [3, 4]);
            });
        });

        describe("when vecA is the output vector", () => {
            beforeEach(() => {
                result = vec2.divide(vecA, vecA, vecB);
            });

            it("should place values into vecA", () => {
                assertEquality(vecA, [0.3333333, 0.5]);
            });
            it("should return vecA", () => {
                assert.equal(result, vecA);
            });
            it("should not modify vecB", () => {
                assertEquality(vecB, [3, 4]);
            });
        });

        describe("when vecB is the output vector", () => {
            beforeEach(() => {
                result = vec2.divide(vecB, vecA, vecB);
            });

            it("should place values into vecB", () => {
                assertEquality(vecB, [0.3333333, 0.5]);
            });
            it("should return vecB", () => {
                assert.equal(result, vecB);
            });
            it("should not modify vecA", () => {
                assertEquality(vecA, [1, 2]);
            });
        });
    });

    describe("ceil", () => {
        beforeEach(() => {
            vecA = [Math.E, Math.PI];
        });

        describe("with a separate output vector", () => {
            beforeEach(() => {
                result = vec2.ceil(out, vecA);
            });

            it("should place values into out", () => {
                assertEquality(out, [3, 4]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify vecA", () => {
                assertEquality(vecA, [Math.E, Math.PI]);
            });
        });

        describe("when vecA is the output vector", () => {
            beforeEach(() => {
                result = vec2.ceil(vecA, vecA);
            });

            it("should place values into vecA", () => {
                assertEquality(vecA, [3, 4]);
            });
            it("should return vecA", () => {
                assert.equal(result, vecA);
            });
        });
    });

    describe("floor", () => {
        beforeEach(() => {
            vecA = [Math.E, Math.PI];
        });

        describe("with a separate output vector", () => {
            beforeEach(() => {
                result = vec2.floor(out, vecA);
            });

            it("should place values into out", () => {
                assertEquality(out, [2, 3]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify vecA", () => {
                assertEquality(vecA, [Math.E, Math.PI]);
            });
        });

        describe("when vecA is the output vector", () => {
            beforeEach(() => {
                result = vec2.floor(vecA, vecA);
            });

            it("should place values into vecA", () => {
                assertEquality(vecA, [2, 3]);
            });
            it("should return vecA", () => {
                assert.equal(result, vecA);
            });
        });
    });

    describe("min", () => {
        beforeEach(() => {
            vecA = [1, 4]; vecB = [3, 2];
        });

        describe("with a separate output vector", () => {
            beforeEach(() => {
                result = vec2.min(out, vecA, vecB);
            });

            it("should place values into out", () => {
                assertEquality(out, [1, 2]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify vecA", () => {
                assertEquality(vecA, [1, 4]);
            });
            it("should not modify vecB", () => {
                assertEquality(vecB, [3, 2]);
            });
        });

        describe("when vecA is the output vector", () => {
            beforeEach(() => {
                result = vec2.min(vecA, vecA, vecB);
            });

            it("should place values into vecA", () => {
                assertEquality(vecA, [1, 2]);
            });
            it("should return vecA", () => {
                assert.equal(result, vecA);
            });
            it("should not modify vecB", () => {
                assertEquality(vecB, [3, 2]);
            });
        });

        describe("when vecB is the output vector", () => {
            beforeEach(() => {
                result = vec2.min(vecB, vecA, vecB);
            });

            it("should place values into vecB", () => {
                assertEquality(vecB, [1, 2]);
            });
            it("should return vecB", () => {
                assert.equal(result, vecB);
            });
            it("should not modify vecA", () => {
                assertEquality(vecA, [1, 4]);
            });
        });
    });

    describe("max", () => {
        beforeEach(() => {
            vecA = [1, 4]; vecB = [3, 2];
        });

        describe("with a separate output vector", () => {
            beforeEach(() => {
                result = vec2.max(out, vecA, vecB);
            });

            it("should place values into out", () => {
                assertEquality(out, [3, 4]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify vecA", () => {
                assertEquality(vecA, [1, 4]);
            });
            it("should not modify vecB", () => {
                assertEquality(vecB, [3, 2]);
            });
        });

        describe("when vecA is the output vector", () => {
            beforeEach(() => {
                result = vec2.max(vecA, vecA, vecB);
            });

            it("should place values into vecA", () => {
                assertEquality(vecA, [3, 4]);
            });
            it("should return vecA", () => {
                assert.equal(result, vecA);
            });
            it("should not modify vecB", () => {
                assertEquality(vecB, [3, 2]);
            });
        });

        describe("when vecB is the output vector", () => {
            beforeEach(() => {
                result = vec2.max(vecB, vecA, vecB);
            });

            it("should place values into vecB", () => {
                assertEquality(vecB, [3, 4]);
            });
            it("should return vecB", () => {
                assert.equal(result, vecB);
            });
            it("should not modify vecA", () => {
                assertEquality(vecA, [1, 4]);
            });
        });
    });

    describe("round", () => {
        beforeEach(() => {
            vecA = [Math.E, Math.PI];
        });

        describe("with a separate output vector", () => {
            beforeEach(() => {
                result = vec2.round(out, vecA);
            });

            it("should place values into out", () => {
                assertEquality(out, [3, 3]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify vecA", () => {
                assertEquality(vecA, [Math.E, Math.PI]);
            });
        });

        describe("when vecA is the output vector", () => {
            beforeEach(() => {
                result = vec2.round(vecA, vecA);
            });

            it("should place values into vecA", () => {
                assertEquality(vecA, [3, 3]);
            });
            it("should return vecA", () => {
                assert.equal(result, vecA);
            });
        });
    });

    describe("scale", () => {
        describe("with a separate output vector", () => {
            beforeEach(() => {
                result = vec2.scale(out, vecA, 2);
            });

            it("should place values into out", () => {
                assertEquality(out, [2, 4]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify vecA", () => {
                assertEquality(vecA, [1, 2]);
            });
        });

        describe("when vecA is the output vector", () => {
            beforeEach(() => {
                result = vec2.scale(vecA, vecA, 2);
            });

            it("should place values into vecA", () => {
                assertEquality(vecA, [2, 4]);
            });
            it("should return vecA", () => {
                assert.equal(result, vecA);
            });
        });
    });

    describe("scaleAndAdd", () => {
        describe("with a separate output vector", () => {
            beforeEach(() => {
                result = vec2.scaleAndAdd(out, vecA, vecB, 0.5);
            });

            it("should place values into out", () => {
                assertEquality(out, [2.5, 4]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify vecA", () => {
                assertEquality(vecA, [1, 2]);
            });
            it("should not modify vecB", () => {
                assertEquality(vecB, [3, 4]);
            });
        });

        describe("when vecA is the output vector", () => {
            beforeEach(() => {
                result = vec2.scaleAndAdd(vecA, vecA, vecB, 0.5);
            });

            it("should place values into vecA", () => {
                assertEquality(vecA, [2.5, 4]);
            });
            it("should return vecA", () => {
                assert.equal(result, vecA);
            });
            it("should not modify vecB", () => {
                assertEquality(vecB, [3, 4]);
            });
        });

        describe("when vecB is the output vector", () => {
            beforeEach(() => {
                result = vec2.scaleAndAdd(vecB, vecA, vecB, 0.5);
            });

            it("should place values into vecB", () => {
                assertEquality(vecB, [2.5, 4]);
            });
            it("should return vecB", () => {
                assert.equal(result, vecB);
            });
            it("should not modify vecA", () => {
                assertEquality(vecA, [1, 2]);
            });
        });
    });

    describe("distance", () => {
        it("should have an alias called 'dist'", () => {
            assert.equal(vec2.dist, vec2.distance);
        });

        beforeEach(() => {
            result = vec2.distance(vecA, vecB);
        });

        it("should return the distance", () => {
            assert.closeTo(result, 2.828427, 0.000001);
        });
    });

    describe("squaredDistance", () => {
        it("should have an alias called 'sqrDist'", () => {
            assert.equal(vec2.sqrDist, vec2.squaredDistance);
        });

        beforeEach(() => {
            result = vec2.squaredDistance(vecA, vecB);
        });

        it("should return the squared distance", () => {
            assert.equal(result, 8);
        });
    });

    describe("length", () => {
        it("should have an alias called 'len'", () => {
            assert.equal(vec2.len, vec2.length);
        });

        beforeEach(() => {
            result = vec2.len(vecA);
        });

        it("should return the length", () => {
            assert.closeTo(result, 2.236067, 0.000001);
        });
    });

    describe("squaredLength", () => {
        it("should have an alias called 'sqrLen'", () => {
            assert.equal(vec2.sqrLen, vec2.squaredLength);
        });

        beforeEach(() => {
            result = vec2.squaredLength(vecA);
        });

        it("should return the squared length", () => {
            assert.equal(result, 5);
        });
    });

    describe("negate", () => {
        describe("with a separate output vector", () => {
            beforeEach(() => {
                result = vec2.negate(out, vecA);
            });

            it("should place values into out", () => {
                assertEquality(out, [-1, -2]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify vecA", () => {
                assertEquality(vecA, [1, 2]);
            });
        });

        describe("when vecA is the output vector", () => {
            beforeEach(() => {
                result = vec2.negate(vecA, vecA);
            });

            it("should place values into vecA", () => {
                assertEquality(vecA, [-1, -2]);
            });
            it("should return vecA", () => {
                assert.equal(result, vecA);
            });
        });
    });

    describe("normalize", () => {
        beforeEach(() => {
            vecA = [5, 0];
        });

        describe("with a separate output vector", () => {
            beforeEach(() => {
                result = vec2.normalize(out, vecA);
            });

            it("should place values into out", () => {
                assertEquality(out, [1, 0]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify vecA", () => {
                assertEquality(vecA, [5, 0]);
            });
        });

        describe("when vecA is the output vector", () => {
            beforeEach(() => {
                result = vec2.normalize(vecA, vecA);
            });

            it("should place values into vecA", () => {
                assertEquality(vecA, [1, 0]);
            });
            it("should return vecA", () => {
                assert.equal(result, vecA);
            });
        });
    });

    describe("dot", () => {
        beforeEach(() => {
            result = vec2.dot(vecA, vecB);
        });

        it("should return the dot product", () => {
            assert.equal(result, 11);
        });
        it("should not modify vecA", () => {
            assertEquality(vecA, [1, 2]);
        });
        it("should not modify vecB", () => {
            assertEquality(vecB, [3, 4]);
        });
    });

    describe("cross", () => {
        let out3;

        beforeEach(() => {
            out3 = [0, 0, 0];
            result = vec2.cross(out3, vecA, vecB);
        });

        it("should place values into out", () => {
            assertEquality(out3, [0, 0, -2]);
        });
        it("should return out", () => {
            assert.equal(result, out3);
        });
        it("should not modify vecA", () => {
            assertEquality(vecA, [1, 2]);
        });
        it("should not modify vecB", () => {
            assertEquality(vecB, [3, 4]);
        });
    });

    describe("lerp", () => {
        describe("with a separate output vector", () => {
            beforeEach(() => {
                result = vec2.lerp(out, vecA, vecB, 0.5);
            });

            it("should place values into out", () => {
                assertEquality(out, [2, 3]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify vecA", () => {
                assertEquality(vecA, [1, 2]);
            });
            it("should not modify vecB", () => {
                assertEquality(vecB, [3, 4]);
            });
        });

        describe("when vecA is the output vector", () => {
            beforeEach(() => {
                result = vec2.lerp(vecA, vecA, vecB, 0.5);
            });

            it("should place values into vecA", () => {
                assertEquality(vecA, [2, 3]);
            });
            it("should return vecA", () => {
                assert.equal(result, vecA);
            });
            it("should not modify vecB", () => {
                assertEquality(vecB, [3, 4]);
            });
        });

        describe("when vecB is the output vector", () => {
            beforeEach(() => {
                result = vec2.lerp(vecB, vecA, vecB, 0.5);
            });

            it("should place values into vecB", () => {
                assertEquality(vecB, [2, 3]);
            });
            it("should return vecB", () => {
                assert.equal(result, vecB);
            });
            it("should not modify vecA", () => {
                assertEquality(vecA, [1, 2]);
            });
        });
    });

    describe("random", () => {
        describe("with no scale", () => {
            beforeEach(() => {
                result = vec2.random(out);
            });

            it("should result in a unit length vector", () => {
                assert.closeTo(vec2.len(out), 1.0, 0.1);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
        });

        describe("with a scale", () => {
            beforeEach(() => {
                result = vec2.random(out, 5.0);
            });

            it("should result in a unit length vector", () => {
                assert.closeTo(vec2.len(out), 5.0, 0.1);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
        });
    });

    describe("transformMat2", () => {
        let matA;
        beforeEach(() => {
            matA = [1, 2, 3, 4];
        });

        describe("with a separate output vector", () => {
            beforeEach(() => {
                result = vec2.transformMat2(out, vecA, matA);
            });

            it("should place values into out", () => {
                assertEquality(out, [7, 10]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify vecA", () => {
                assertEquality(vecA, [1, 2]);
            });
            it("should not modify matA", () => {
                assertEquality(matA, [1, 2, 3, 4]);
            });
        });

        describe("when vecA is the output vector", () => {
            beforeEach(() => {
                result = vec2.transformMat2(vecA, vecA, matA);
            });

            it("should place values into vecA", () => {
                assertEquality(vecA, [7, 10]);
            });
            it("should return vecA", () => {
                assert.equal(result, vecA);
            });
            it("should not modify matA", () => {
                assertEquality(matA, [1, 2, 3, 4]);
            });
        });
    });

    describe("transformMat2d", () => {
        let matA;
        beforeEach(() => {
            matA = [1, 2, 3, 4, 5, 6];
        });

        describe("with a separate output vector", () => {
            beforeEach(() => {
                result = vec2.transformMat2d(out, vecA, matA);
            });

            it("should place values into out", () => {
                assertEquality(out, [12, 16]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify vecA", () => {
                assertEquality(vecA, [1, 2]);
            });
            it("should not modify matA", () => {
                assertEquality(matA, [1, 2, 3, 4, 5, 6]);
            });
        });

        describe("when vecA is the output vector", () => {
            beforeEach(() => {
                result = vec2.transformMat2d(vecA, vecA, matA);
            });

            it("should place values into vecA", () => {
                assertEquality(vecA, [12, 16]);
            });
            it("should return vecA", () => {
                assert.equal(result, vecA);
            });
            it("should not modify matA", () => {
                assertEquality(matA, [1, 2, 3, 4, 5, 6]);
            });
        });
    });

    describe("forEach", () => {
        let vecArray;

        beforeEach(() => {
            vecArray = [
                1, 2,
                3, 4,
                0, 0
            ];
        });

        describe("when performing operations that take no extra arguments", () => {
            beforeEach(() => {
                result = vec2.forEach(vecArray, 0, 0, 0, vec2.normalize);
            });

            it("should update all values", () => {
                assertEquality(vecArray, [
                    0.447214, 0.894427,
                    0.6, 0.8,
                    0, 0
                ]);
            });
            it("should return vecArray", () => {
                assert.equal(result, vecArray);
            });
        });

        describe("when performing operations that takes one extra arguments", () => {
            beforeEach(() => {
                result = vec2.forEach(vecArray, 0, 0, 0, vec2.add, vecA);
            });

            it("should update all values", () => {
                assertEquality(vecArray, [
                    2, 4,
                    4, 6,
                    1, 2
                ]);
            });
            it("should return vecArray", () => {
                assert.equal(result, vecArray);
            });
            it("should not modify vecA", () => {
                assertEquality(vecA, [1, 2]);
            });
        });

        describe("when specifying an offset", () => {
            beforeEach(() => {
                result = vec2.forEach(vecArray, 0, 2, 0, vec2.add, vecA);
            });

            it("should update all values except the first vector", () => {
                assertEquality(vecArray, [
                    1, 2,
                    4, 6,
                    1, 2
                ]);
            });
            it("should return vecArray", () => {
                assert.equal(result, vecArray);
            });
            it("should not modify vecA", () => {
                assertEquality(vecA, [1, 2]);
            });
        });

        describe("when specifying a count", () => {
            beforeEach(() => {
                result = vec2.forEach(vecArray, 0, 0, 2, vec2.add, vecA);
            });

            it("should update all values except the last vector", () => {
                assertEquality(vecArray, [
                    2, 4,
                    4, 6,
                    0, 0
                ]);
            });
            it("should return vecArray", () => {
                assert.equal(result, vecArray);
            });
            it("should not modify vecA", () => {
                assertEquality(vecA, [1, 2]);
            });
        });

        describe("when specifying a stride", () => {
            beforeEach(() => {
                result = vec2.forEach(vecArray, 4, 0, 0, vec2.add, vecA);
            });

            it("should update all values except the second vector", () => {
                assertEquality(vecArray, [
                    2, 4,
                    3, 4,
                    1, 2
                ]);
            });
            it("should return vecArray", () => {
                assert.equal(result, vecArray);
            });
            it("should not modify vecA", () => {
                assertEquality(vecA, [1, 2]);
            });
        });

        describe("when calling a function that does not modify the out variable", () => {
            beforeEach(() => {
                result = vec2.forEach(vecArray, 0, 0, 0, (out, vec) => { });
            });

            it("values should remain unchanged", () => {
                assertEquality(vecArray, [
                    1, 2,
                    3, 4,
                    0, 0
                ]);
            });
            it("should return vecArray", () => {
                assert.equal(result, vecArray);
            });
        });
    });

    describe("str", () => {
        beforeEach(() => {
            result = vec2.str(vecA);
        });

        it("should return a string representation of the vector", () => {
            assert.equal(result, "vec2(1, 2)");
        });
    });

    describe("exactEquals", () => {
        let vecC;
        let r0;
        let r1;
        beforeEach(() => {
            vecA = [0, 1];
            vecB = [0, 1];
            vecC = [1, 2];
            r0 = vec2.exactEquals(vecA, vecB);
            r1 = vec2.exactEquals(vecA, vecC);
        });

        it("should return true for identical vectors", () => {
            assert.isTrue(r0);
        });
        it("should return false for different vectors", () => {
            assert.isFalse(r1);
        });
        it("should not modify vecA", () => {
            assertEquality(vecA, [0, 1]);
        });
        it("should not modify vecB", () => {
            assertEquality(vecB, [0, 1]);
        });
    });

    describe("equals", () => {
        let vecC;
        let vecD;
        let r0;
        let r1;
        let r2;
        beforeEach(() => {
            vecA = [0, 1];
            vecB = [0, 1];
            vecC = [1, 2];
            vecD = [1e-16, 1];
            r0 = vec2.equals(vecA, vecB);
            r1 = vec2.equals(vecA, vecC);
            r2 = vec2.equals(vecA, vecD);
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
            assertEquality(vecA, [0, 1]);
        });
        it("should not modify vecB", () => {
            assertEquality(vecB, [0, 1]);
        });
    });
});
