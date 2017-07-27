require("./node.setup");

const adapters = ["http", "local"];


adapters.forEach((adapter) => {

    describe(`test.ajax.js-${  adapter}`, () => {

        it("#5061 ajax returns ETIMEDOUT error on timeout", function (done) {
            this.timeout(240000);
            testUtils.ajax({
                method: "GET",
                url: "http://192.0.2.1/",
                timeout: 10
            }, (err, res) => {
                // here's the test, we should get an 'err' response
                assert.exists(err);
                if (err.code) { // xhr
                    assert.match(err.code, /(ESOCKETTIMEDOUT|ETIMEDOUT|ENETUNREACH|EAGAIN|ECONNREFUSED)/);
                } else { // fetch
                    assert.equal(err.status, 500);
                }
                assert.isUndefined(res);
                done();
            });
        });
    });
});

