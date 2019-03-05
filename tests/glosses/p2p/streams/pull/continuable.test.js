const {
    p2p: { stream: { pull } }
} = adone;

const srcPath = (...args) => adone.std.path.join(adone.ROOT_PATH, "lib", "glosses", "p2p", "streams", "pull", ...args);
const count = require(srcPath("sources/count"));
const error = require(srcPath("sources/error"));
const map = require(srcPath("throughs/map"));

it("continuable stream", (done) => {
    expect(2).checks(done);

    const continuable = function (read) {
        return function (cb) {
            read(null, function next(end, data) {
                if (end === true) {
                    return cb(null); 
                }
                if (end) {
                    return cb(end); 
                }
                read(end, next);
            });
        };
    };

    // With values:
    pull(
        count(5),
        map((item) => {
            return item * 2;
        }),
        continuable
    )((err) => {
        expect(err).not.exist.mark();
    });

    // With error:
    pull(
        error(new Error("test error")),
        continuable
    )((err) => {
        expect(err.message).to.equal("test error").mark();
    });
});
