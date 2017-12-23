describe("stream", "pull", "defer", "source", () => {
    const { stream: { pull } } = adone;
    const { defer: { source } } = pull;

    it("defer", (done) => {

        const deferred = source();

        pull(
            deferred,
            pull.map((e) => {
                return e * 5;
            }),
            pull.collect((err, ary) => {
                if (err) {
                    throw err;
                }
                assert.deepEqual(ary, [5, 10, 15, 20, 25]);
                done();
            })
        );

        deferred.resolve(pull.values([1, 2, 3, 4, 5]));


    });


    it("defer - resolve early", (done) => {

        const deferred = source();

        deferred.resolve(pull.values([1, 2, 3, 4, 5]));

        pull(
            deferred,
            pull.map((e) => {
                return e * 5;
            }),
            pull.collect((err, ary) => {
                if (err) {
                    throw err;
                }
                assert.deepEqual(ary, [5, 10, 15, 20, 25]);
                done();
            })
        );

    });

    it("defer, abort before connecting", (done) => {


        const deferred = source();

        const s = spy();
        //abort the deferred stream immediately.
        deferred(true, s);

        deferred.resolve(pull.values([1, 2, 3], () => {
            expect(s).to.have.been.calledOnce;
            done();
        }));

    });

    it("defer, read and abort before connecting", (done) => {


        const deferred = source();

        const t = spy();

        //queue a read immediately

        const s = stub().callsFake((end, data) => {
            expect(t).to.have.not.been.called;
            assert.equal(data, 1);
        });

        deferred(null, s);

        //abort the deferred stream immediately.
        deferred(true, t);

        deferred.resolve(pull.values([1, 2, 3], () => {
            expect(s).to.have.been.calledOnce;
            expect(t).to.have.been.calledOnce;
            done();
        }));

    });
});
