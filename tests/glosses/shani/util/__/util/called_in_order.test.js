describe("shani", "util", "__", "util", "calledInOrder", () => {
    const {
        __: { util: { calledInOrder } },
        stub: sstub
    } = adone.shani.util;

    const testObject1 = { someFunction() {} };
    const testObject2 = { otherFunction() {} };
    const testObject3 = { thirdFunction() {} };

    const testMethod = () => {
        testObject1.someFunction();
        testObject2.otherFunction();
        testObject3.thirdFunction();
    };

    beforeEach(() => {
        sstub(testObject1, "someFunction");
        sstub(testObject2, "otherFunction");
        sstub(testObject3, "thirdFunction");
        testMethod();
    });
    afterEach(() => {
        testObject1.someFunction.restore();
        testObject2.otherFunction.restore();
        testObject3.thirdFunction.restore();
    });

    describe("With array parameter given", () => {

        it("returns true, if stubs were called in given order", () => {
            assert(calledInOrder([testObject1.someFunction, testObject2.otherFunction]));
            assert(calledInOrder([testObject1.someFunction, testObject2.otherFunction,
                testObject3.thirdFunction]));
        });

        it("returns false, if stubs were called in wrong order", () => {
            assert(!calledInOrder([testObject2.otherFunction, testObject1.someFunction]));
            assert(!calledInOrder([testObject2.otherFunction, testObject1.someFunction,
                testObject3.thirdFunction]));
        });
    });

    describe("With multiple parameters given", () => {

        it("returns true, if stubs were called in given order", () => {
            assert(calledInOrder(testObject1.someFunction, testObject2.otherFunction));
            assert(calledInOrder(testObject1.someFunction, testObject2.otherFunction,
                testObject3.thirdFunction));
        });

        it("returns false, if stubs were called in wrong order", () => {
            assert(!calledInOrder(testObject2.otherFunction, testObject1.someFunction));
            assert(!calledInOrder(testObject2.otherFunction, testObject1.someFunction,
                testObject3.thirdFunction));
        });
    });
});
