import assertEquality from "./assert_equality";
const { mat2 } = adone.math.matrix;

describe("math", "matrix", "mat2", () => {
    let out;
    let matA;
    let matB;
    let identity;
    let result;

    beforeEach(() => {
        matA = [1, 2, 3, 4];

        matB = [5, 6, 7, 8];

        out = [0, 0, 0, 0];

        identity = [1, 0, 0, 1];
    });

    describe("create", () => {
        beforeEach(() => {
            result = mat2.create();
        });
        it("should return a 4 element array initialized to a 2x2 identity matrix", () => {
            assertEquality(result, identity);
        });
    });

    describe("clone", () => {
        beforeEach(() => {
            result = mat2.clone(matA);
        });
        it("should return a 4 element array initialized to the values in matA", () => {
            assertEquality(result, matA);
        });
    });

    describe("copy", () => {
        beforeEach(() => {
            result = mat2.copy(out, matA);
        });
        it("should place values into out", () => {
            assertEquality(out, matA);
        });
        it("should return out", () => {
            assert.equal(result, out);
        });
    });

    describe("identity", () => {
        beforeEach(() => {
            result = mat2.identity(out);
        });
        it("should place values into out", () => {
            assertEquality(result, identity);
        });
        it("should return out", () => {
            assert.equal(result, out);
        });
    });

    describe("transpose", () => {
        describe("with a separate output matrix", () => {
            beforeEach(() => {
                result = mat2.transpose(out, matA);
            });

            it("should place values into out", () => {
                assertEquality(out, [1, 3, 2, 4]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify matA", () => {
                assertEquality(matA, [1, 2, 3, 4]);
            });
        });

        describe("when matA is the output matrix", () => {
            beforeEach(() => {
                result = mat2.transpose(matA, matA);
            });

            it("should place values into matA", () => {
                assertEquality(matA, [1, 3, 2, 4]);
            });
            it("should return matA", () => {
                assert.equal(result, matA);
            });
        });
    });

    describe("invert", () => {
        describe("with a separate output matrix", () => {
            beforeEach(() => {
                result = mat2.invert(out, matA);
            });

            it("should place values into out", () => {
                assertEquality(out, [-2, 1, 1.5, -0.5]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify matA", () => {
                assertEquality(matA, [1, 2, 3, 4]);
            });
        });

        describe("when matA is the output matrix", () => {
            beforeEach(() => {
                result = mat2.invert(matA, matA);
            });

            it("should place values into matA", () => {
                assertEquality(matA, [-2, 1, 1.5, -0.5]);
            });
            it("should return matA", () => {
                assert.equal(result, matA);
            });
        });
    });

    describe("adjoint", () => {
        describe("with a separate output matrix", () => {
            beforeEach(() => {
                result = mat2.adjoint(out, matA);
            });

            it("should place values into out", () => {
                assertEquality(out, [4, -2, -3, 1]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify matA", () => {
                assertEquality(matA, [1, 2, 3, 4]);
            });
        });

        describe("when matA is the output matrix", () => {
            beforeEach(() => {
                result = mat2.adjoint(matA, matA);
            });

            it("should place values into matA", () => {
                assertEquality(matA, [4, -2, -3, 1]);
            });
            it("should return matA", () => {
                assert.equal(result, matA);
            });
        });
    });

    describe("determinant", () => {
        beforeEach(() => {
            result = mat2.determinant(matA);
        });

        it("should return the determinant", () => {
            assert.equal(result, -2);
        });
    });

    describe("multiply", () => {
        it("should have an alias called 'mul'", () => {
            assert.equal(mat2.mul, mat2.multiply);
        });

        describe("with a separate output matrix", () => {
            beforeEach(() => {
                result = mat2.multiply(out, matA, matB);
            });

            it("should place values into out", () => {
                assertEquality(out, [23, 34, 31, 46]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify matA", () => {
                assertEquality(matA, [1, 2, 3, 4]);
            });
            it("should not modify matB", () => {
                assertEquality(matB, [5, 6, 7, 8]);
            });
        });

        describe("when matA is the output matrix", () => {
            beforeEach(() => {
                result = mat2.multiply(matA, matA, matB);
            });

            it("should place values into matA", () => {
                assertEquality(matA, [23, 34, 31, 46]);
            });
            it("should return matA", () => {
                assert.equal(result, matA);
            });
            it("should not modify matB", () => {
                assertEquality(matB, [5, 6, 7, 8]);
            });
        });

        describe("when matB is the output matrix", () => {
            beforeEach(() => {
                result = mat2.multiply(matB, matA, matB);
            });

            it("should place values into matB", () => {
                assertEquality(matB, [23, 34, 31, 46]);
            });
            it("should return matB", () => {
                assert.equal(result, matB);
            });
            it("should not modify matA", () => {
                assertEquality(matA, [1, 2, 3, 4]);
            });
        });
    });

    describe("rotate", () => {
        describe("with a separate output matrix", () => {
            beforeEach(() => {
                result = mat2.rotate(out, matA, Math.PI * 0.5);
            });

            it("should place values into out", () => {
                assertEquality(out, [3, 4, -1, -2]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify matA", () => {
                assertEquality(matA, [1, 2, 3, 4]);
            });
        });

        describe("when matA is the output matrix", () => {
            beforeEach(() => {
                result = mat2.rotate(matA, matA, Math.PI * 0.5);
            });

            it("should place values into matA", () => {
                assertEquality(matA, [3, 4, -1, -2]);
            });
            it("should return matA", () => {
                assert.equal(result, matA);
            });
        });
    });

    describe("scale", () => {
        let vecA;
        beforeEach(() => {
            vecA = [2, 3];
        });

        describe("with a separate output matrix", () => {
            beforeEach(() => {
                result = mat2.scale(out, matA, vecA);
            });

            it("should place values into out", () => {
                assertEquality(out, [2, 4, 9, 12]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify matA", () => {
                assertEquality(matA, [1, 2, 3, 4]);
            });
        });

        describe("when matA is the output matrix", () => {
            beforeEach(() => {
                result = mat2.scale(matA, matA, vecA);
            });

            it("should place values into matA", () => {
                assertEquality(matA, [2, 4, 9, 12]);
            });
            it("should return matA", () => {
                assert.equal(result, matA);
            });
        });
    });

    describe("str", () => {
        beforeEach(() => {
            result = mat2.str(matA);
        });

        it("should return a string representation of the matrix", () => {
            assert.equal(result, "mat2(1, 2, 3, 4)");
        });
    });

    describe("frob", () => {
        beforeEach(() => {
            result = mat2.frob(matA);
        });
        it("should return the Frobenius Norm of the matrix", () => {
            assert.equal(result, Math.sqrt(Math.pow(1, 2) + Math.pow(2, 2) + Math.pow(3, 2) + Math.pow(4, 2)));
        });
    });

    describe("LDU", () => {
        let L_result;
        let D_result;
        let U_result;


        beforeEach(() => {
            const L = mat2.create();
            const D = mat2.create();
            const U = mat2.create();

            result = mat2.LDU(L, D, U, [4, 3, 6, 3]);

            L_result = mat2.create();
            L_result[2] = 1.5;

            D_result = mat2.create();

            U_result = mat2.create();

            U_result[0] = 4;
            U_result[1] = 3;
            U_result[3] = -1.5;
        });
        it("should return a lower triangular, a diagonal and an upper triangular matrix", () => {
            assertEquality(result[0], L_result);
            assertEquality(result[1], D_result);
            assertEquality(result[2], U_result);
        });
    });

    describe("add", () => {
        describe("with a separate output matrix", () => {
            beforeEach(() => {
                result = mat2.add(out, matA, matB);
            });

            it("should place values into out", () => {
                assertEquality(out, [6, 8, 10, 12]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify matA", () => {
                assertEquality(matA, [1, 2, 3, 4]);
            });
            it("should not modify matB", () => {
                assertEquality(matB, [5, 6, 7, 8]);
            });
        });

        describe("when matA is the output matrix", () => {
            beforeEach(() => {
                result = mat2.add(matA, matA, matB);
            });

            it("should place values into matA", () => {
                assertEquality(matA, [6, 8, 10, 12]);
            });
            it("should return matA", () => {
                assert.equal(result, matA);
            });
            it("should not modify matB", () => {
                assertEquality(matB, [5, 6, 7, 8]);
            });
        });

        describe("when matB is the output matrix", () => {
            beforeEach(() => {
                result = mat2.add(matB, matA, matB);
            });

            it("should place values into matB", () => {
                assertEquality(matB, [6, 8, 10, 12]);
            });
            it("should return matB", () => {
                assert.equal(result, matB);
            });
            it("should not modify matA", () => {
                assertEquality(matA, [1, 2, 3, 4]);
            });
        });
    });

    describe("subtract", () => {
        it("should have an alias called 'sub'", () => {
            assert.equal(mat2.sub, mat2.subtract);
        });

        describe("with a separate output matrix", () => {
            beforeEach(() => {
                result = mat2.subtract(out, matA, matB);
            });

            it("should place values into out", () => {
                assertEquality(out, [-4, -4, -4, -4]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify matA", () => {
                assertEquality(matA, [1, 2, 3, 4]);
            });
            it("should not modify matB", () => {
                assertEquality(matB, [5, 6, 7, 8]);
            });
        });

        describe("when matA is the output matrix", () => {
            beforeEach(() => {
                result = mat2.subtract(matA, matA, matB);
            });

            it("should place values into matA", () => {
                assertEquality(matA, [-4, -4, -4, -4]);
            });
            it("should return matA", () => {
                assert.equal(result, matA);
            });
            it("should not modify matB", () => {
                assertEquality(matB, [5, 6, 7, 8]);
            });
        });

        describe("when matB is the output matrix", () => {
            beforeEach(() => {
                result = mat2.subtract(matB, matA, matB);
            });

            it("should place values into matB", () => {
                assertEquality(matB, [-4, -4, -4, -4]);
            });
            it("should return matB", () => {
                assert.equal(result, matB);
            });
            it("should not modify matA", () => {
                assertEquality(matA, [1, 2, 3, 4]);
            });
        });
    });

    describe("fromValues", () => {
        beforeEach(() => {
            result = mat2.fromValues(1, 2, 3, 4);
        });
        it("should return a 4 element array initialized to the values passed", () => {
            assertEquality(result, [1, 2, 3, 4]);
        });
    });

    describe("set", () => {
        beforeEach(() => {
            result = mat2.set(out, 1, 2, 3, 4);
        });
        it("should place values into out", () => {
            assertEquality(out, [1, 2, 3, 4]);
        });
        it("should return out", () => {
            assert.equal(result, out);
        });
    });

    describe("multiplyScalar", () => {
        describe("with a separate output matrix", () => {
            beforeEach(() => {
                result = mat2.multiplyScalar(out, matA, 2);
            });

            it("should place values into out", () => {
                assertEquality(out, [2, 4, 6, 8]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify matA", () => {
                assertEquality(matA, [1, 2, 3, 4]);
            });
        });

        describe("when matA is the output matrix", () => {
            beforeEach(() => {
                result = mat2.multiplyScalar(matA, matA, 2);
            });

            it("should place values into matA", () => {
                assertEquality(matA, [2, 4, 6, 8]);
            });
            it("should return matA", () => {
                assert.equal(result, matA);
            });
        });
    });

    describe("multiplyScalarAndAdd", () => {
        describe("with a separate output matrix", () => {
            beforeEach(() => {
                result = mat2.multiplyScalarAndAdd(out, matA, matB, 0.5);
            });

            it("should place values into out", () => {
                assertEquality(out, [3.5, 5, 6.5, 8]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify matA", () => {
                assertEquality(matA, [1, 2, 3, 4]);
            });
            it("should not modify matB", () => {
                assertEquality(matB, [5, 6, 7, 8]);
            });
        });

        describe("when matA is the output matrix", () => {
            beforeEach(() => {
                result = mat2.multiplyScalarAndAdd(matA, matA, matB, 0.5);
            });

            it("should place values into matA", () => {
                assertEquality(matA, [3.5, 5, 6.5, 8]);
            });
            it("should return matA", () => {
                assert.equal(result, matA);
            });
            it("should not modify matB", () => {
                assertEquality(matB, [5, 6, 7, 8]);
            });
        });

        describe("when matB is the output matrix", () => {
            beforeEach(() => {
                result = mat2.multiplyScalarAndAdd(matB, matA, matB, 0.5);
            });

            it("should place values into matB", () => {
                assertEquality(matB, [3.5, 5, 6.5, 8]);
            });
            it("should return matB", () => {
                assert.equal(result, matB);
            });
            it("should not modify matA", () => {
                assertEquality(matA, [1, 2, 3, 4]);
            });
        });
    });

    describe("exactEquals", () => {
        let matC;
        let r0;
        let r1;

        beforeEach(() => {
            matA = [0, 1, 2, 3];
            matB = [0, 1, 2, 3];
            matC = [1, 2, 3, 4];
            r0 = mat2.exactEquals(matA, matB);
            r1 = mat2.exactEquals(matA, matC);
        });
        it("should return true for identical matrices", () => {
            assert.isTrue(r0);
        });
        it("should return false for different matrices", () => {
            assert.isFalse(r1);
        });
        it("should not modify matA", () => {
            assertEquality(matA, [0, 1, 2, 3]);
        });
        it("should not modify matB", () => {
            assertEquality(matB, [0, 1, 2, 3]);
        });
    });

    describe("equals", () => {
        let matC;
        let matD;
        let r0;
        let r1;
        let r2;

        beforeEach(() => {
            matA = [0, 1, 2, 3];
            matB = [0, 1, 2, 3];
            matC = [1, 2, 3, 4];
            matD = [1e-16, 1, 2, 3];
            r0 = mat2.equals(matA, matB);
            r1 = mat2.equals(matA, matC);
            r2 = mat2.equals(matA, matD);
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
            assertEquality(matA, [0, 1, 2, 3]);
        });
        it("should not modify matB", () => {
            assertEquality(matB, [0, 1, 2, 3]);
        });
    });
});
