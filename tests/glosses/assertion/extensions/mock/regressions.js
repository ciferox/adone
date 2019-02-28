const sinon = require("sinon");
const { assertion } = adone;
const { expect } = assertion;

describe("Regressions", () => {
    specify("GH-19: functions with `proxy` properties", () => {
        function func() {
            // Contents don't matter
        }
        func.proxy = 5;

        const spy = sinon.spy(func);
        spy();

        expect(() => {
            expect(spy).to.have.been.called;
        }).to.not.throw();
    });

    specify("GH-94: assertions on calls", () => {
        function func() {
            // Contents don't matter
        }
        const spy = sinon.spy(func);

        spy(1, 2, 3);
        spy(4, 5, 6);

        expect(() => {
            expect(spy.lastCall).to.have.been.calledWith(4, 5, 6);
        }).to.not.throw();
    });
});
