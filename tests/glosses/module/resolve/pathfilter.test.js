
const {
    module: { resolve }
} = adone;
const path = require("path");

it("synchronous pathfilter", () => {
    let res;
    const resolverDir = `${__dirname}/pathfilter/deep_ref`;
    const pathFilter = function (pkg, x, remainder) {
        assert.equal(pkg.version, "1.2.3");
        assert.equal(x, path.join(resolverDir, "node_modules", "deep", "ref"));
        assert.equal(remainder, "ref");
        return "alt";
    };

    res = resolve("deep/ref", { basedir: resolverDir });
    assert.equal(res, path.join(resolverDir, "node_modules", "deep", "ref.js"));

    res = resolve("deep/deeper/ref", { basedir: resolverDir });
    assert.equal(res, path.join(resolverDir, "node_modules", "deep", "deeper", "ref.js"));

    res = resolve("deep/ref", { basedir: resolverDir, pathFilter });
    assert.equal(res, path.join(resolverDir, "node_modules", "deep", "alt.js"));
});
