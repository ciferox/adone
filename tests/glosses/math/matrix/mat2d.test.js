import equality from "./equality";
const { mat2d } = adone.math.matrix;

describe("math", "matrix", "mat2d", () => {
    let out;
    let matA;
    let oldA;
    let oldB;
    let matB;
    let identity;
    let result;

    beforeEach(() => {
        matA = [1, 2, 3, 4, 5, 6];

        oldA = [1, 2, 3, 4, 5, 6];

        matB = [7, 8, 9, 10, 11, 12];

        oldB = [7, 8, 9, 10, 11, 12];

        out = [0, 0, 0, 0, 0, 0];

        identity = [1, 0, 0, 1, 0, 0];
    });

    describe("create", () => {
        beforeEach(() => {
            result = mat2d.create();
        });
        it("should return a 6 element array initialized to a 2x3 identity matrix", () => {
            equality(result, identity);
        });
    });

    describe("clone", () => {
        beforeEach(() => {
            result = mat2d.clone(matA);
        });
        it("should return a 6 element array initialized to the values in matA", () => {
            equality(result, matA);
        });
    });

    describe("copy", () => {
        beforeEach(() => {
            result = mat2d.copy(out, matA);
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
            result = mat2d.identity(out);
        });
        it("should place values into out", () => {
            equality(result, identity);
        });
        it("should return out", () => {
            assert.equal(result, out);
        });
    });

    describe("invert", () => {
        describe("with a separate output matrix", () => {
            beforeEach(() => {
                result = mat2d.invert(out, matA);
            });

            it("should place values into out", () => {
                equality(out, [-2, 1, 1.5, -0.5, 1, -2]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify matA", () => {
                equality(matA, oldA);
            });
        });

        describe("when matA is the output matrix", () => {
            beforeEach(() => {
                result = mat2d.invert(matA, matA);
            });

            it("should place values into matA", () => {
                equality(matA, [-2, 1, 1.5, -0.5, 1, -2]);
            });
            it("should return matA", () => {
                assert.equal(result, matA);
            });
        });
    });

    describe("determinant", () => {
        beforeEach(() => {
            result = mat2d.determinant(matA);
        });

        it("should return the determinant", () => {
            assert.equal(result, -2);
        });
    });

    describe("multiply", () => {
        it("should have an alias called 'mul'", () => {
            assert.equal(mat2d.mul, mat2d.multiply);
        });

        describe("with a separate output matrix", () => {
            beforeEach(() => {
                result = mat2d.multiply(out, matA, matB);
            });

            it("should place values into out", () => {
                equality(out, [31, 46, 39, 58, 52, 76]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify matA", () => {
                equality(matA, oldA);
            });
            it("should not modify matB", () => {
                equality(matB, oldB);
            });
        });

        describe("when matA is the output matrix", () => {
            beforeEach(() => {
                result = mat2d.multiply(matA, matA, matB);
            });

            it("should place values into matA", () => {
                equality(matA, [31, 46, 39, 58, 52, 76]);
            });
            it("should return matA", () => {
                assert.equal(result, matA);
            });
            it("should not modify matB", () => {
                equality(matB, oldB);
            });
        });

        describe("when matB is the output matrix", () => {
            beforeEach(() => {
                result = mat2d.multiply(matB, matA, matB);
            });

            it("should place values into matB", () => {
                equality(matB, [31, 46, 39, 58, 52, 76]);
            });
            it("should return matB", () => {
                assert.equal(result, matB);
            });
            it("should not modify matA", () => {
                equality(matA, oldA);
            });
        });
    });

    describe("rotate", () => {
        describe("with a separate output matrix", () => {
            beforeEach(() => {
                result = mat2d.rotate(out, matA, Math.PI * 0.5);
            });

            it("should place values into out", () => {
                equality(out, [3, 4, -1, -2, 5, 6]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify matA", () => {
                equality(matA, oldA);
            });
        });

        describe("when matA is the output matrix", () => {
            beforeEach(() => {
                result = mat2d.rotate(matA, matA, Math.PI * 0.5);
            });

            it("should place values into matA", () => {
                equality(matA, [3, 4, -1, -2, 5, 6]);
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
                result = mat2d.scale(out, matA, vecA);
            });

            it("should place values into out", () => {
                equality(out, [2, 4, 9, 12, 5, 6]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify matA", () => {
                equality(matA, oldA);
            });
        });

        describe("when matA is the output matrix", () => {
            beforeEach(() => {
                result = mat2d.scale(matA, matA, vecA);
            });

            it("should place values into matA", () => {
                equality(matA, [2, 4, 9, 12, 5, 6]);
            });
            it("should return matA", () => {
                assert.equal(result, matA);
            });
        });
    });

    describe("translate", () => {
        let vecA;
        beforeEach(() => {
            vecA = [2, 3];
        });

        describe("with a separate output matrix", () => {
            beforeEach(() => {
                result = mat2d.translate(out, matA, vecA);
            });

            it("should place values into out", () => {
                equality(out, [1, 2, 3, 4, 16, 22]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify matA", () => {
                equality(matA, oldA);
            });
        });

        describe("when matA is the output matrix", () => {
            beforeEach(() => {
                result = mat2d.translate(matA, matA, vecA);
            });

            it("should place values into matA", () => {
                equality(matA, [1, 2, 3, 4, 16, 22]);
            });
            it("should return matA", () => {
                assert.equal(result, matA);
            });
        });
    });

    describe("str", () => {
        beforeEach(() => {
            result = mat2d.str(matA);
        });

        it("should return a string representation of the matrix", () => {
            assert.equal(result, "mat2d(1, 2, 3, 4, 5, 6)");
        });
    });

    describe("frob", () => {
        beforeEach(() => {
            result = mat2d.frob(matA);
        });
        it("should return the Frobenius Norm of the matrix", () => {
            assert.equal(result, Math.sqrt(Math.pow(1, 2) + Math.pow(2, 2) + Math.pow(3, 2) + Math.pow(4, 2) + Math.pow(5, 2) + Math.pow(6, 2) + 1));
        });
    });

    describe("add", () => {
        describe("with a separate output matrix", () => {
            beforeEach(() => {
                result = mat2d.add(out, matA, matB);
            });

            it("should place values into out", () => {
                equality(out, [8, 10, 12, 14, 16, 18]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify matA", () => {
                equality(matA, oldA);
            });
            it("should not modify matB", () => {
                equality(matB, oldB);
            });
        });

        describe("when matA is the output matrix", () => {
            beforeEach(() => {
                result = mat2d.add(matA, matA, matB);
            });

            it("should place values into matA", () => {
                equality(matA, [8, 10, 12, 14, 16, 18]);
            });
            it("should return matA", () => {
                assert.equal(result, matA);
            });
            it("should not modify matB", () => {
                equality(matB, oldB);
            });
        });

        describe("when matB is the output matrix", () => {
            beforeEach(() => {
                result = mat2d.add(matB, matA, matB);
            });

            it("should place values into matB", () => {
                equality(matB, [8, 10, 12, 14, 16, 18]);
            });
            it("should return matB", () => {
                assert.equal(result, matB);
            });
            it("should not modify matA", () => {
                equality(matA, oldA);
            });
        });
    });

    describe("subtract", () => {
        it("should have an alias called 'sub'", () => {
            assert.equal(mat2d.sub, mat2d.subtract);
        });

        describe("with a separate output matrix", () => {
            beforeEach(() => {
                result = mat2d.subtract(out, matA, matB);
            });

            it("should place values into out", () => {
                equality(out, [-6, -6, -6, -6, -6, -6]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify matA", () => {
                equality(matA, oldA);
            });
            it("should not modify matB", () => {
                equality(matB, oldB);
            });
        });

        describe("when matA is the output matrix", () => {
            beforeEach(() => {
                result = mat2d.subtract(matA, matA, matB);
            });

            it("should place values into matA", () => {
                equality(matA, [-6, -6, -6, -6, -6, -6]);
            });
            it("should return matA", () => {
                assert.equal(result, matA);
            });
            it("should not modify matB", () => {
                equality(matB, oldB);
            });
        });

        describe("when matB is the output matrix", () => {
            beforeEach(() => {
                result = mat2d.subtract(matB, matA, matB);
            });

            it("should place values into matB", () => {
                equality(matB, [-6, -6, -6, -6, -6, -6]);
            });
            it("should return matB", () => {
                assert.equal(result, matB);
            });
            it("should not modify matA", () => {
                equality(matA, oldA);
            });
        });
    });

    describe("fromValues", () => {
        beforeEach(() => {
            result = mat2d.fromValues(1, 2, 3, 4, 5, 6);
        });
        it("should return a 6 element array initialized to the values passed", () => {
            equality(result, [1, 2, 3, 4, 5, 6]);
        });
    });

    describe("set", () => {
        beforeEach(() => {
            result = mat2d.set(out, 1, 2, 3, 4, 5, 6);
        });
        it("should place values into out", () => {
            equality(out, [1, 2, 3, 4, 5, 6]);
        });
        it("should return out", () => {
            assert.equal(result, out);
        });
    });

    describe("multiplyScalar", () => {
        describe("with a separate output matrix", () => {
            beforeEach(() => {
                result = mat2d.multiplyScalar(out, matA, 2);
            });

            it("should place values into out", () => {
                equality(out, [2, 4, 6, 8, 10, 12]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify matA", () => {
                equality(matA, [1, 2, 3, 4, 5, 6]);
            });
        });

        describe("when matA is the output matrix", () => {
            beforeEach(() => {
                result = mat2d.multiplyScalar(matA, matA, 2);
            });

            it("should place values into matA", () => {
                equality(matA, [2, 4, 6, 8, 10, 12]);
            });
            it("should return matA", () => {
                assert.equal(result, matA);
            });
        });
    });

    describe("multiplyScalarAndAdd", () => {
        describe("with a separate output matrix", () => {
            beforeEach(() => {
                result = mat2d.multiplyScalarAndAdd(out, matA, matB, 0.5);
            });

            it("should place values into out", () => {
                equality(out, [4.5, 6, 7.5, 9, 10.5, 12]);
            });
            it("should return out", () => {
                assert.equal(result, out);
            });
            it("should not modify matA", () => {
                equality(matA, [1, 2, 3, 4, 5, 6]);
            });
            it("should not modify matB", () => {
                equality(matB, [7, 8, 9, 10, 11, 12]);
            });
        });

        describe("when matA is the output matrix", () => {
            beforeEach(() => {
                result = mat2d.multiplyScalarAndAdd(matA, matA, matB, 0.5);
            });

            it("should place values into matA", () => {
                equality(matA, [4.5, 6, 7.5, 9, 10.5, 12]);
            });
            it("should return matA", () => {
                assert.equal(result, matA);
            });
            it("should not modify matB", () => {
                equality(matB, [7, 8, 9, 10, 11, 12]);
            });
        });

        describe("when matB is the output matrix", () => {
            beforeEach(() => {
                result = mat2d.multiplyScalarAndAdd(matB, matA, matB, 0.5);
            });

            it("should place values into matB", () => {
                equality(matB, [4.5, 6, 7.5, 9, 10.5, 12]);
            });
            it("should return matB", () => {
                assert.equal(result, matB);
            });
            it("should not modify matA", () => {
                equality(matA, [1, 2, 3, 4, 5, 6]);
            });
        });
    });

    describe("exactEquals", () => {
        let matC;
        let r0;
        let r1;
        beforeEach(() => {
            matA = [0, 1, 2, 3, 4, 5];
            matB = [0, 1, 2, 3, 4, 5];
            matC = [1, 2, 3, 4, 5, 6];
            r0 = mat2d.exactEquals(matA, matB);
            r1 = mat2d.exactEquals(matA, matC);
        });

        it("should return true for identical matrices", () => {
            assert.equal(r0, true);
        });
        it("should return false for different matrices", () => {
            assert.equal(r1, false);
        });
        it("should not modify matA", () => {
            equality(matA, [0, 1, 2, 3, 4, 5]);
        });
        it("should not modify matB", () => {
            equality(matB, [0, 1, 2, 3, 4, 5]);
        });
    });

    describe("equals", () => {
        let matC;
        let matD;
        let r0;
        let r1;
        let r2;

        beforeEach(() => {
            matA = [0, 1, 2, 3, 4, 5];
            matB = [0, 1, 2, 3, 4, 5];
            matC = [1, 2, 3, 4, 5, 6];
            matD = [1e-16, 1, 2, 3, 4, 5];
            r0 = mat2d.equals(matA, matB);
            r1 = mat2d.equals(matA, matC);
            r2 = mat2d.equals(matA, matD);
        });
        it("should return true for identical matrices", () => {
            assert.equal(r0, true);
        });
        it("should return false for different matrices", () => {
            assert.equal(r1, false);
        });
        it("should return true for close but not identical matrices", () => {
            assert.equal(r2, true);
        });
        it("should not modify matA", () => {
            equality(matA, [0, 1, 2, 3, 4, 5]);
        });
        it("should not modify matB", () => {
            equality(matB, [0, 1, 2, 3, 4, 5]);
        });
    });
});
