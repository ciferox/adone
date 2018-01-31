describe("assertion", "mock interface", "regressions", () => {
    specify("GH-19: functions with `proxy` properties", () => {
        const func = () => {
            // Contents don't matter
        };
        func.proxy = 5;

        const s = spy(func);
        s();

        expect(() => {
            expect(s).to.have.been.called();
        }).not.to.throw();
    });

    specify("GH-94: assertions on calls", () => {
        const func = () => {
            // Contents don't matter
        };
        const s = spy(func);

        s(1, 2, 3);
        s(4, 5, 6);

        expect(() => {
            expect(s.lastCall).to.have.been.calledWith(4, 5, 6);
        }).not.to.throw();
    });
});
