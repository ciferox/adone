export default function (lib, util) {
    const { expect, Assertion } = lib;

    const check = function (done) {
        const total = util.flag(this, "object");
        let count = 0;
        expect(total).a("number").above(0, "Provide a count to check");
        if (done) {
            expect(done).a("function", "Provide a function for check");
        }

        const chain = function () {
            expect(count).below(total, "Target checkmarks already reached");
        };

        const mark = function (incValue = 1) {
            count += incValue;
            if (count === total && done) {
                setImmediate(done, 0);
            }
            return adone.noop;
        };
        mark.getCount = function () {
            return count;
        };

        Assertion.addChainableMethod("mark", mark, chain);
        return mark;
    };

    Assertion.addMethod("check", check);
    Assertion.addMethod("checks", check);
}
