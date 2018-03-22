describe("util", "debounce", () => {
    const {
        util: { debounce },
        promise: { delay }
    } = adone;

    it("should debounce invokation", async () => {
        const s = spy();
        const f = debounce(s, 1000);
        f();
        expect(s).to.have.not.been.called();
        await delay(100);
        expect(s).to.have.not.been.called();
        f();
        expect(s).to.have.not.been.called();
        await delay(100);
        f();
        expect(s).to.have.not.been.called();
        await delay(100);
        expect(s).to.have.not.been.called();
        await delay(700);
        expect(s).to.have.not.been.called();
        await delay(300);
        expect(s).to.have.been.calledOnce();
    });

    it("should invoke immediately", async () => {
        const s = spy();
        const f = debounce(s, 1000, { leading: true });
        f();
        expect(s).to.have.been.calledOnce();
        await delay(100);
        expect(s).to.have.been.calledOnce();
        f();
        expect(s).to.have.been.calledOnce();
        await delay(100);
        f();
        expect(s).to.have.been.calledOnce();
        await delay(100);
        expect(s).to.have.been.calledOnce();
        await delay(700);
        expect(s).to.have.been.calledOnce();
        await delay(300);
        expect(s).to.have.been.calledOnce();
    });

    it("should call immediately and after timeout", async () => {
        const s = spy();
        const f = debounce(s, 1000, { leading: true, trailing: true });
        f();
        expect(s).to.have.been.calledOnce();
        await delay(100);
        expect(s).to.have.been.calledOnce();
        f();
        expect(s).to.have.been.calledOnce();
        await delay(100);
        f();
        expect(s).to.have.been.calledOnce();
        await delay(100);
        expect(s).to.have.been.calledOnce();
        await delay(700);
        expect(s).to.have.been.calledOnce();
        await delay(300);
        expect(s).to.have.been.calledTwice();
    });

    it("should not call after timeout if that was called only once", async () => {
        const s = spy();
        const f = debounce(s, 500, { leading: true, trailing: true });
        f();
        expect(s).to.have.been.calledOnce();
        await delay(600);
        expect(s).to.have.been.calledOnce();
    });

    it("should provide counter of ignored calls", async () => {
        const s = stub().callsFake(() => {
            // eslint-disable-next-line no-use-before-define
            expect(f.ignored).to.be.equal(2);
        });
        const f = debounce(s, 500);
        f();
        expect(f.ignored).to.be.equal(0);
        f();
        expect(f.ignored).to.be.equal(1);
        await delay(100);
        f();
        expect(f.ignored).to.be.equal(2);
        await delay(500);
        expect(s).to.have.been.calledOnce();
        expect(f.ignored).to.be.equal(0);
    });

    it("should return the result of the last invokation", async () => {
        const s = stub().callsFake(() => {
            // eslint-disable-next-line no-use-before-define
            return f.ignored;
        });
        let f = debounce(s, 100);
        expect(f()).to.be.undefined();
        expect(f()).to.be.undefined();
        expect(f()).to.be.undefined();
        await delay(120);
        expect(f()).to.be.equal(2);
        f = debounce(s, 100, { leading: true });
        expect(f()).to.be.equal(0);
        expect(f()).to.be.equal(0);
        await delay(120);
        expect(f()).to.be.equal(1);
    });

    it("should cancel a scheduled call via cancel", async () => {
        const s = spy();
        const f = debounce(s, 100);
        f();
        f.cancel();
        await adone.promise.delay(500);
        expect(s).to.have.not.been.called();
        f();
        await adone.promise.delay(10);
        f.cancel();
        expect(s).to.have.not.been.called();
    });
});
