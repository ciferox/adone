const path = require("path");
const {
    module: { resolve }
} = adone;

it("filter", () => {
    const dir = path.join(__dirname, "resolver");
    let packageFilterArgs;
    const res = resolve("./baz", {
        basedir: dir,
        packageFilter(pkg, pkgfile, dir) {
            pkg.main = "doom";
            packageFilterArgs = [pkg, pkgfile, dir];
            return pkg;
        }
    });

    assert.equal(res, path.join(dir, "baz/doom.js"), 'changing the package "main" works');

    const packageData = packageFilterArgs[0];
    assert.equal(packageData.main, "doom", 'package "main" was altered');

    const packageFile = packageFilterArgs[1];
    assert.equal(
        packageFile,
        path.join(dir, "baz/package.json"),
        'second packageFilter argument is "pkgfile"'
    );

    const packageFileDir = packageFilterArgs[2];
    assert.equal(packageFileDir, path.join(dir, "baz"), 'third packageFilter argument is "dir"');
});
