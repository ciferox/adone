const {
    semver
} = adone;

const {
    eq,
    gt,
    lt,
    neq,
    cmp,
    gte,
    lte,
    satisfies,
    validRange,
    inc,
    diff,
    toComparators,
    SemVer,
    Range,
    Comparator
} = semver;



describe("semver", () => {
    it("comparison tests", () => {
        // [version1, version2]
        // version1 should be greater than version2
        [
            ["0.0.0", "0.0.0-foo"],
            ["0.0.1", "0.0.0"],
            ["1.0.0", "0.9.9"],
            ["0.10.0", "0.9.0"],
            ["0.99.0", "0.10.0", {}],
            ["2.0.0", "1.2.3", { loose: false }],
            ["v0.0.0", "0.0.0-foo", true],
            ["v0.0.1", "0.0.0", { loose: true }],
            ["v1.0.0", "0.9.9", true],
            ["v0.10.0", "0.9.0", true],
            ["v0.99.0", "0.10.0", true],
            ["v2.0.0", "1.2.3", true],
            ["0.0.0", "v0.0.0-foo", true],
            ["0.0.1", "v0.0.0", true],
            ["1.0.0", "v0.9.9", true],
            ["0.10.0", "v0.9.0", true],
            ["0.99.0", "v0.10.0", true],
            ["2.0.0", "v1.2.3", true],
            ["1.2.3", "1.2.3-asdf"],
            ["1.2.3", "1.2.3-4"],
            ["1.2.3", "1.2.3-4-foo"],
            ["1.2.3-5-foo", "1.2.3-5"],
            ["1.2.3-5", "1.2.3-4"],
            ["1.2.3-5-foo", "1.2.3-5-Foo"],
            ["3.0.0", "2.7.2+asdf"],
            ["1.2.3-a.10", "1.2.3-a.5"],
            ["1.2.3-a.b", "1.2.3-a.5"],
            ["1.2.3-a.b", "1.2.3-a"],
            ["1.2.3-a.b.c.10.d.5", "1.2.3-a.b.c.5.d.100"],
            ["1.2.3-r2", "1.2.3-r100"],
            ["1.2.3-r100", "1.2.3-R2"]
        ].forEach((v) => {
            const v0 = v[0];
            const v1 = v[1];
            const loose = v[2];
            assert.ok(gt(v0, v1, loose), `gt('${v0}', '${v1}')`);
            assert.ok(lt(v1, v0, loose), `lt('${v1}', '${v0}')`);
            assert.ok(!gt(v1, v0, loose), `!gt('${v1}', '${v0}')`);
            assert.ok(!lt(v0, v1, loose), `!lt('${v0}', '${v1}')`);
            assert.ok(eq(v0, v0, loose), `eq('${v0}', '${v0}')`);
            assert.ok(eq(v1, v1, loose), `eq('${v1}', '${v1}')`);
            assert.ok(neq(v0, v1, loose), `neq('${v0}', '${v1}')`);
            assert.ok(cmp(v1, "==", v1, loose), `cmp('${v1}' == '${v1}')`);
            assert.ok(cmp(v0, ">=", v1, loose), `cmp('${v0}' >= '${v1}')`);
            assert.ok(cmp(v1, "<=", v0, loose), `cmp('${v1}' <= '${v0}')`);
            assert.ok(cmp(v0, "!=", v1, loose), `cmp('${v0}' != '${v1}')`);
        });
    });

    it("equality tests", () => {
        // [version1, version2]
        // version1 should be equivalent to version2
        [
            ["1.2.3", "v1.2.3", true],
            ["1.2.3", "=1.2.3", true],
            ["1.2.3", "v 1.2.3", true],
            ["1.2.3", "= 1.2.3", true],
            ["1.2.3", " v1.2.3", true],
            ["1.2.3", " =1.2.3", true],
            ["1.2.3", " v 1.2.3", true],
            ["1.2.3", " = 1.2.3", true],
            ["1.2.3-0", "v1.2.3-0", true],
            ["1.2.3-0", "=1.2.3-0", true],
            ["1.2.3-0", "v 1.2.3-0", true],
            ["1.2.3-0", "= 1.2.3-0", true],
            ["1.2.3-0", " v1.2.3-0", true],
            ["1.2.3-0", " =1.2.3-0", true],
            ["1.2.3-0", " v 1.2.3-0", true],
            ["1.2.3-0", " = 1.2.3-0", true],
            ["1.2.3-1", "v1.2.3-1", true],
            ["1.2.3-1", "=1.2.3-1", true],
            ["1.2.3-1", "v 1.2.3-1", true],
            ["1.2.3-1", "= 1.2.3-1", true],
            ["1.2.3-1", " v1.2.3-1", true],
            ["1.2.3-1", " =1.2.3-1", true],
            ["1.2.3-1", " v 1.2.3-1", true],
            ["1.2.3-1", " = 1.2.3-1", true],
            ["1.2.3-beta", "v1.2.3-beta", true],
            ["1.2.3-beta", "=1.2.3-beta", true],
            ["1.2.3-beta", "v 1.2.3-beta", true],
            ["1.2.3-beta", "= 1.2.3-beta", true],
            ["1.2.3-beta", " v1.2.3-beta", true],
            ["1.2.3-beta", " =1.2.3-beta", true],
            ["1.2.3-beta", " v 1.2.3-beta", true],
            ["1.2.3-beta", " = 1.2.3-beta", true],
            ["1.2.3-beta+build", " = 1.2.3-beta+otherbuild", true],
            ["1.2.3+build", " = 1.2.3+otherbuild", true],
            ["1.2.3-beta+build", "1.2.3-beta+otherbuild"],
            ["1.2.3+build", "1.2.3+otherbuild"],
            ["  v1.2.3+build", "1.2.3+otherbuild"]
        ].forEach((v) => {
            const v0 = v[0];
            const v1 = v[1];
            const loose = v[2];
            assert.ok(eq(v0, v1, loose), `eq('${v0}', '${v1}')`);
            assert.ok(!neq(v0, v1, loose), `!neq('${v0}', '${v1}')`);
            assert.ok(cmp(v0, "==", v1, loose), `cmp(${v0}==${v1})`);
            assert.ok(!cmp(v0, "!=", v1, loose), `!cmp(${v0}!=${v1})`);
            assert.ok(!cmp(v0, "===", v1, loose), `!cmp(${v0}===${v1})`);
            assert.ok(cmp(v0, "!==", v1, loose), `cmp(${v0}!==${v1})`);
            // also test with an object. they are === because obj.version matches
            assert.ok(cmp(new SemVer(v0, { loose }), "===", new SemVer(v1, { loose })), `!cmp(${v0}===${v1}) object`);
            assert.ok(cmp(v0, "!==", v1, loose), `cmp(${v0}!==${v1})`);
            assert.ok(!cmp(new SemVer(v0, loose), "!==", new SemVer(v1, loose)), `cmp(${v0}!==${v1}) object`);

            assert.ok(!gt(v0, v1, loose), `!gt('${v0}', '${v1}')`);
            assert.ok(gte(v0, v1, loose), `gte('${v0}', '${v1}')`);
            assert.ok(!lt(v0, v1, loose), `!lt('${v0}', '${v1}')`);
            assert.ok(lte(v0, v1, loose), `lte('${v0}', '${v1}')`);
        });
    });

    it("range tests", () => {
        // [range, version]
        // version should be included by range
        [
            ["1.0.0 - 2.0.0", "1.2.3"],
            ["^1.2.3+build", "1.2.3"],
            ["^1.2.3+build", "1.3.0"],
            ["1.2.3-pre+asdf - 2.4.3-pre+asdf", "1.2.3"],
            ["1.2.3pre+asdf - 2.4.3-pre+asdf", "1.2.3", true],
            ["1.2.3-pre+asdf - 2.4.3pre+asdf", "1.2.3", true],
            ["1.2.3pre+asdf - 2.4.3pre+asdf", "1.2.3", true],
            ["1.2.3-pre+asdf - 2.4.3-pre+asdf", "1.2.3-pre.2"],
            ["1.2.3-pre+asdf - 2.4.3-pre+asdf", "2.4.3-alpha"],
            ["1.2.3+asdf - 2.4.3+asdf", "1.2.3"],
            ["1.0.0", "1.0.0"],
            [">=*", "0.2.4"],
            ["", "1.0.0"],
            ["*", "1.2.3", {}],
            ["*", "v1.2.3", { loose: 123 }],
            [">=1.0.0", "1.0.0", /asdf/],
            [">=1.0.0", "1.0.1", { loose: null }],
            [">=1.0.0", "1.1.0", { loose: 0 }],
            [">1.0.0", "1.0.1", { loose: undefined }],
            [">1.0.0", "1.1.0"],
            ["<=2.0.0", "2.0.0"],
            ["<=2.0.0", "1.9999.9999"],
            ["<=2.0.0", "0.2.9"],
            ["<2.0.0", "1.9999.9999"],
            ["<2.0.0", "0.2.9"],
            [">= 1.0.0", "1.0.0"],
            [">=  1.0.0", "1.0.1"],
            [">=   1.0.0", "1.1.0"],
            ["> 1.0.0", "1.0.1"],
            [">  1.0.0", "1.1.0"],
            ["<=   2.0.0", "2.0.0"],
            ["<= 2.0.0", "1.9999.9999"],
            ["<=  2.0.0", "0.2.9"],
            ["<    2.0.0", "1.9999.9999"],
            ["<\t2.0.0", "0.2.9"],
            [">=0.1.97", "v0.1.97", true],
            [">=0.1.97", "0.1.97"],
            ["0.1.20 || 1.2.4", "1.2.4"],
            [">=0.2.3 || <0.0.1", "0.0.0"],
            [">=0.2.3 || <0.0.1", "0.2.3"],
            [">=0.2.3 || <0.0.1", "0.2.4"],
            ["||", "1.3.4"],
            ["2.x.x", "2.1.3"],
            ["1.2.x", "1.2.3"],
            ["1.2.x || 2.x", "2.1.3"],
            ["1.2.x || 2.x", "1.2.3"],
            ["x", "1.2.3"],
            ["2.*.*", "2.1.3"],
            ["1.2.*", "1.2.3"],
            ["1.2.* || 2.*", "2.1.3"],
            ["1.2.* || 2.*", "1.2.3"],
            ["*", "1.2.3"],
            ["2", "2.1.2"],
            ["2.3", "2.3.1"],
            ["~x", "0.0.9"], // >=2.4.0 <2.5.0
            ["~2", "2.0.9"], // >=2.4.0 <2.5.0
            ["~2.4", "2.4.0"], // >=2.4.0 <2.5.0
            ["~2.4", "2.4.5"],
            ["~>3.2.1", "3.2.2"], // >=3.2.1 <3.3.0,
            ["~1", "1.2.3"], // >=1.0.0 <2.0.0
            ["~>1", "1.2.3"],
            ["~> 1", "1.2.3"],
            ["~1.0", "1.0.2"], // >=1.0.0 <1.1.0,
            ["~ 1.0", "1.0.2"],
            ["~ 1.0.3", "1.0.12"],
            ["~ 1.0.3alpha", "1.0.12", { loose: true }],
            [">=1", "1.0.0"],
            [">= 1", "1.0.0"],
            ["<1.2", "1.1.1"],
            ["< 1.2", "1.1.1"],
            ["~v0.5.4-pre", "0.5.5"],
            ["~v0.5.4-pre", "0.5.4"],
            ["=0.7.x", "0.7.2"],
            ["<=0.7.x", "0.7.2"],
            [">=0.7.x", "0.7.2"],
            ["<=0.7.x", "0.6.2"],
            ["~1.2.1 >=1.2.3", "1.2.3"],
            ["~1.2.1 =1.2.3", "1.2.3"],
            ["~1.2.1 1.2.3", "1.2.3"],
            ["~1.2.1 >=1.2.3 1.2.3", "1.2.3"],
            ["~1.2.1 1.2.3 >=1.2.3", "1.2.3"],
            ["~1.2.1 1.2.3", "1.2.3"],
            [">=1.2.1 1.2.3", "1.2.3"],
            ["1.2.3 >=1.2.1", "1.2.3"],
            [">=1.2.3 >=1.2.1", "1.2.3"],
            [">=1.2.1 >=1.2.3", "1.2.3"],
            [">=1.2", "1.2.8"],
            ["^1.2.3", "1.8.1"],
            ["^0.1.2", "0.1.2"],
            ["^0.1", "0.1.2"],
            ["^0.0.1", "0.0.1"],
            ["^1.2", "1.4.2"],
            ["^1.2 ^1", "1.4.2"],
            ["^1.2.3-alpha", "1.2.3-pre"],
            ["^1.2.0-alpha", "1.2.0-pre"],
            ["^0.0.1-alpha", "0.0.1-beta"],
            ["^0.1.1-alpha", "0.1.1-beta"],
            ["^x", "1.2.3"],
            ["x - 1.0.0", "0.9.7"],
            ["x - 1.x", "0.9.7"],
            ["1.0.0 - x", "1.9.7"],
            ["1.x - x", "1.9.7"],
            ["<=7.x", "7.9.9"]
        ].forEach((v) => {
            const range = v[0];
            const ver = v[1];
            const loose = v[2];
            assert.ok(satisfies(ver, range, loose), `${range} satisfied by ${ver}`);
        });
    });

    it("negative range tests", () => {
        // [range, version]
        // version should not be included by range
        [
            ["1.0.0 - 2.0.0", "2.2.3"],
            ["1.2.3+asdf - 2.4.3+asdf", "1.2.3-pre.2"],
            ["1.2.3+asdf - 2.4.3+asdf", "2.4.3-alpha"],
            ["^1.2.3+build", "2.0.0"],
            ["^1.2.3+build", "1.2.0"],
            ["^1.2.3", "1.2.3-pre"],
            ["^1.2", "1.2.0-pre"],
            [">1.2", "1.3.0-beta"],
            ["<=1.2.3", "1.2.3-beta"],
            ["^1.2.3", "1.2.3-beta"],
            ["=0.7.x", "0.7.0-asdf"],
            [">=0.7.x", "0.7.0-asdf"],
            ["1", "1.0.0beta", { loose: 420 }],
            ["<1", "1.0.0beta", true],
            ["< 1", "1.0.0beta", true],
            ["1.0.0", "1.0.1"],
            [">=1.0.0", "0.0.0"],
            [">=1.0.0", "0.0.1"],
            [">=1.0.0", "0.1.0"],
            [">1.0.0", "0.0.1"],
            [">1.0.0", "0.1.0"],
            ["<=2.0.0", "3.0.0"],
            ["<=2.0.0", "2.9999.9999"],
            ["<=2.0.0", "2.2.9"],
            ["<2.0.0", "2.9999.9999"],
            ["<2.0.0", "2.2.9"],
            [">=0.1.97", "v0.1.93", true],
            [">=0.1.97", "0.1.93"],
            ["0.1.20 || 1.2.4", "1.2.3"],
            [">=0.2.3 || <0.0.1", "0.0.3"],
            [">=0.2.3 || <0.0.1", "0.2.2"],
            ["2.x.x", "1.1.3", { loose: NaN }],
            ["2.x.x", "3.1.3"],
            ["1.2.x", "1.3.3"],
            ["1.2.x || 2.x", "3.1.3"],
            ["1.2.x || 2.x", "1.1.3"],
            ["2.*.*", "1.1.3"],
            ["2.*.*", "3.1.3"],
            ["1.2.*", "1.3.3"],
            ["1.2.* || 2.*", "3.1.3"],
            ["1.2.* || 2.*", "1.1.3"],
            ["2", "1.1.2"],
            ["2.3", "2.4.1"],
            ["~2.4", "2.5.0"], // >=2.4.0 <2.5.0
            ["~2.4", "2.3.9"],
            ["~>3.2.1", "3.3.2"], // >=3.2.1 <3.3.0
            ["~>3.2.1", "3.2.0"], // >=3.2.1 <3.3.0
            ["~1", "0.2.3"], // >=1.0.0 <2.0.0
            ["~>1", "2.2.3"],
            ["~1.0", "1.1.0"], // >=1.0.0 <1.1.0
            ["<1", "1.0.0"],
            [">=1.2", "1.1.1"],
            ["1", "2.0.0beta", true],
            ["~v0.5.4-beta", "0.5.4-alpha"],
            ["=0.7.x", "0.8.2"],
            [">=0.7.x", "0.6.2"],
            ["<0.7.x", "0.7.2"],
            ["<1.2.3", "1.2.3-beta"],
            ["=1.2.3", "1.2.3-beta"],
            [">1.2", "1.2.8"],
            ["^0.0.1", "0.0.2"],
            ["^1.2.3", "2.0.0-alpha"],
            ["^1.2.3", "1.2.2"],
            ["^1.2", "1.1.9"],
            ["*", "v1.2.3-foo", true],
            // invalid ranges never satisfied!
            ["blerg", "1.2.3"],
            ["git+https://user:password0123@github.com/foo", "123.0.0", true],
            ["^1.2.3", "2.0.0-pre"],
            ["^1.2.3", false]
        ].forEach((v) => {
            const range = v[0];
            const ver = v[1];
            const loose = v[2];
            const found = satisfies(ver, range, loose);
            assert.ok(!found, `${ver} not satisfied by ${range}`);
        });
    });

    it("unlocked prerelease range tests", () => {
        // [range, version]
        // version should be included by range
        [
            ["*", "1.0.0-rc1"],
            ["^1.0.0", "2.0.0-rc1"],
            ["^1.0.0-0", "1.0.1-rc1"],
            ["^1.0.0-rc2", "1.0.1-rc1"],
            ["^1.0.0", "1.0.1-rc1"],
            ["^1.0.0", "1.1.0-rc1"]
        ].forEach((v) => {
            const range = v[0];
            const ver = v[1];
            const options = { includePrerelease: true };
            assert.ok(satisfies(ver, range, options), `${range} satisfied by ${ver}`);
        });
    });

    it("negative unlocked prerelease range tests", () => {
        // [range, version]
        // version should not be included by range
        [
            ["^1.0.0", "1.0.0-rc1"],
            ["^1.2.3-rc2", "2.0.0"]
        ].forEach((v) => {
            const range = v[0];
            const ver = v[1];
            const options = { includePrerelease: true };
            const found = satisfies(ver, range, options);
            assert.ok(!found, `${ver} not satisfied by ${range}`);
        });
    });

    it("increment versions test", () => {
        //  [version, inc, result, identifier]
        //  inc(version, inc) -> result
        [
            ["1.2.3", "major", "2.0.0"],
            ["1.2.3", "minor", "1.3.0"],
            ["1.2.3", "patch", "1.2.4"],
            ["1.2.3tag", "major", "2.0.0", true],
            ["1.2.3-tag", "major", "2.0.0"],
            ["1.2.3", "fake", null],
            ["1.2.0-0", "patch", "1.2.0"],
            ["fake", "major", null],
            ["1.2.3-4", "major", "2.0.0"],
            ["1.2.3-4", "minor", "1.3.0"],
            ["1.2.3-4", "patch", "1.2.3"],
            ["1.2.3-alpha.0.beta", "major", "2.0.0"],
            ["1.2.3-alpha.0.beta", "minor", "1.3.0"],
            ["1.2.3-alpha.0.beta", "patch", "1.2.3"],
            ["1.2.4", "prerelease", "1.2.5-0"],
            ["1.2.3-0", "prerelease", "1.2.3-1"],
            ["1.2.3-alpha.0", "prerelease", "1.2.3-alpha.1"],
            ["1.2.3-alpha.1", "prerelease", "1.2.3-alpha.2"],
            ["1.2.3-alpha.2", "prerelease", "1.2.3-alpha.3"],
            ["1.2.3-alpha.0.beta", "prerelease", "1.2.3-alpha.1.beta"],
            ["1.2.3-alpha.1.beta", "prerelease", "1.2.3-alpha.2.beta"],
            ["1.2.3-alpha.2.beta", "prerelease", "1.2.3-alpha.3.beta"],
            ["1.2.3-alpha.10.0.beta", "prerelease", "1.2.3-alpha.10.1.beta"],
            ["1.2.3-alpha.10.1.beta", "prerelease", "1.2.3-alpha.10.2.beta"],
            ["1.2.3-alpha.10.2.beta", "prerelease", "1.2.3-alpha.10.3.beta"],
            ["1.2.3-alpha.10.beta.0", "prerelease", "1.2.3-alpha.10.beta.1"],
            ["1.2.3-alpha.10.beta.1", "prerelease", "1.2.3-alpha.10.beta.2"],
            ["1.2.3-alpha.10.beta.2", "prerelease", "1.2.3-alpha.10.beta.3"],
            ["1.2.3-alpha.9.beta", "prerelease", "1.2.3-alpha.10.beta"],
            ["1.2.3-alpha.10.beta", "prerelease", "1.2.3-alpha.11.beta"],
            ["1.2.3-alpha.11.beta", "prerelease", "1.2.3-alpha.12.beta"],
            ["1.2.0", "prepatch", "1.2.1-0"],
            ["1.2.0-1", "prepatch", "1.2.1-0"],
            ["1.2.0", "preminor", "1.3.0-0"],
            ["1.2.3-1", "preminor", "1.3.0-0"],
            ["1.2.0", "premajor", "2.0.0-0"],
            ["1.2.3-1", "premajor", "2.0.0-0"],
            ["1.2.0-1", "minor", "1.2.0"],
            ["1.0.0-1", "major", "1.0.0"],

            ["1.2.3", "major", "2.0.0", false, "dev"],
            ["1.2.3", "minor", "1.3.0", false, "dev"],
            ["1.2.3", "patch", "1.2.4", false, "dev"],
            ["1.2.3tag", "major", "2.0.0", true, "dev"],
            ["1.2.3-tag", "major", "2.0.0", false, "dev"],
            ["1.2.3", "fake", null, false, "dev"],
            ["1.2.0-0", "patch", "1.2.0", false, "dev"],
            ["fake", "major", null, false, "dev"],
            ["1.2.3-4", "major", "2.0.0", false, "dev"],
            ["1.2.3-4", "minor", "1.3.0", false, "dev"],
            ["1.2.3-4", "patch", "1.2.3", false, "dev"],
            ["1.2.3-alpha.0.beta", "major", "2.0.0", false, "dev"],
            ["1.2.3-alpha.0.beta", "minor", "1.3.0", false, "dev"],
            ["1.2.3-alpha.0.beta", "patch", "1.2.3", false, "dev"],
            ["1.2.4", "prerelease", "1.2.5-dev.0", false, "dev"],
            ["1.2.3-0", "prerelease", "1.2.3-dev.0", false, "dev"],
            ["1.2.3-alpha.0", "prerelease", "1.2.3-dev.0", false, "dev"],
            ["1.2.3-alpha.0", "prerelease", "1.2.3-alpha.1", false, "alpha"],
            ["1.2.3-alpha.0.beta", "prerelease", "1.2.3-dev.0", false, "dev"],
            ["1.2.3-alpha.0.beta", "prerelease", "1.2.3-alpha.1.beta", false, "alpha"],
            ["1.2.3-alpha.10.0.beta", "prerelease", "1.2.3-dev.0", false, "dev"],
            ["1.2.3-alpha.10.0.beta", "prerelease", "1.2.3-alpha.10.1.beta", false, "alpha"],
            ["1.2.3-alpha.10.1.beta", "prerelease", "1.2.3-alpha.10.2.beta", false, "alpha"],
            ["1.2.3-alpha.10.2.beta", "prerelease", "1.2.3-alpha.10.3.beta", false, "alpha"],
            ["1.2.3-alpha.10.beta.0", "prerelease", "1.2.3-dev.0", false, "dev"],
            ["1.2.3-alpha.10.beta.0", "prerelease", "1.2.3-alpha.10.beta.1", false, "alpha"],
            ["1.2.3-alpha.10.beta.1", "prerelease", "1.2.3-alpha.10.beta.2", false, "alpha"],
            ["1.2.3-alpha.10.beta.2", "prerelease", "1.2.3-alpha.10.beta.3", false, "alpha"],
            ["1.2.3-alpha.9.beta", "prerelease", "1.2.3-dev.0", false, "dev"],
            ["1.2.3-alpha.9.beta", "prerelease", "1.2.3-alpha.10.beta", false, "alpha"],
            ["1.2.3-alpha.10.beta", "prerelease", "1.2.3-alpha.11.beta", false, "alpha"],
            ["1.2.3-alpha.11.beta", "prerelease", "1.2.3-alpha.12.beta", false, "alpha"],
            ["1.2.0", "prepatch", "1.2.1-dev.0", false, "dev"],
            ["1.2.0-1", "prepatch", "1.2.1-dev.0", false, "dev"],
            ["1.2.0", "preminor", "1.3.0-dev.0", false, "dev"],
            ["1.2.3-1", "preminor", "1.3.0-dev.0", false, "dev"],
            ["1.2.0", "premajor", "2.0.0-dev.0", false, "dev"],
            ["1.2.3-1", "premajor", "2.0.0-dev.0", false, "dev"],
            ["1.2.0-1", "minor", "1.2.0", false, "dev"],
            ["1.0.0-1", "major", "1.0.0", "dev"],
            ["1.2.3-dev.bar", "prerelease", "1.2.3-dev.0", false, "dev"]

        ].forEach((v) => {
            const pre = v[0];
            const what = v[1];
            const wanted = v[2];
            const loose = v[3];
            const id = v[4];
            const found = inc(pre, what, loose, id);
            const cmd = `inc(${pre}, ${what}, ${id})`;
            assert.equal(found, wanted, `${cmd} === ${wanted}`);

            const parsed = semver.parse(pre, loose);
            if (wanted) {
                parsed.inc(what, id);
                assert.equal(parsed.version, wanted, `${cmd} object version updated`);
                assert.equal(parsed.raw, wanted, `${cmd} object raw field updated`);
            } else if (parsed) {
                assert.throws(() => {
                    parsed.inc(what, id);
                });
            } else {
                assert.equal(parsed, null);
            }
        });
    });

    it("diff versions test", () => {
        //  [version1, version2, result]
        //  diff(version1, version2) -> result
        [
            ["1.2.3", "0.2.3", "major"],
            ["1.4.5", "0.2.3", "major"],
            ["1.2.3", "2.0.0-pre", "premajor"],
            ["1.2.3", "1.3.3", "minor"],
            ["1.0.1", "1.1.0-pre", "preminor"],
            ["1.2.3", "1.2.4", "patch"],
            ["1.2.3", "1.2.4-pre", "prepatch"],
            ["0.0.1", "0.0.1-pre", "prerelease"],
            ["0.0.1", "0.0.1-pre-2", "prerelease"],
            ["1.1.0", "1.1.0-pre", "prerelease"],
            ["1.1.0-pre-1", "1.1.0-pre-2", "prerelease"],
            ["1.0.0", "1.0.0", null]

        ].forEach((v) => {
            const version1 = v[0];
            const version2 = v[1];
            const wanted = v[2];
            const found = diff(version1, version2);
            const cmd = `diff(${version1}, ${version2})`;
            assert.equal(found, wanted, `${cmd} === ${wanted}`);
        });
    });

    it("minimum version in range tests", () => {
        // [range, minimum, loose]
        [
            // Stars
            ["*", "0.0.0"],
            ["* || >=2", "0.0.0"],
            [">=2 || *", "0.0.0"],
            [">2 || *", "0.0.0"],

            // equal
            ["1.0.0", "1.0.0"],
            ["1.0", "1.0.0"],
            ["1.0.x", "1.0.0"],
            ["1.0.*", "1.0.0"],
            ["1", "1.0.0"],
            ["1.x.x", "1.0.0"],
            ["1.x.x", "1.0.0"],
            ["1.*.x", "1.0.0"],
            ["1.x.*", "1.0.0"],
            ["1.x", "1.0.0"],
            ["1.*", "1.0.0"],
            ["=1.0.0", "1.0.0"],

            // Tilde
            ["~1.1.1", "1.1.1"],
            ["~1.1.1-beta", "1.1.1-beta"],
            ["~1.1.1 || >=2", "1.1.1"],

            // Carot
            ["^1.1.1", "1.1.1"],
            ["^1.1.1-beta", "1.1.1-beta"],
            ["^1.1.1 || >=2", "1.1.1"],

            // '-' operator
            ["1.1.1 - 1.8.0", "1.1.1"],
            ["1.1 - 1.8.0", "1.1.0"],

            // Less / less or equal
            ["<2", "0.0.0"],
            ["<0.0.0-beta", "0.0.0-0"],
            ["<0.0.1-beta", "0.0.0"],
            ["<2 || >4", "0.0.0"],
            [">4 || <2", "0.0.0"],
            ["<=2 || >=4", "0.0.0"],
            [">=4 || <=2", "0.0.0"],
            ["<0.0.0-beta >0.0.0-alpha", "0.0.0-alpha.0"],
            [">0.0.0-alpha <0.0.0-beta", "0.0.0-alpha.0"],

            // Greater than or equal
            [">=1.1.1 <2 || >=2.2.2 <2", "1.1.1"],
            [">=2.2.2 <2 || >=1.1.1 <2", "1.1.1"],

            // Greater than but not equal
            [">1.0.0", "1.0.1"],
            [">1.0.0-0", "1.0.0-0.0"],
            [">1.0.0-beta", "1.0.0-beta.0"],
            [">2 || >1.0.0", "1.0.1"],
            [">2 || >1.0.0-0", "1.0.0-0.0"],
            [">2 || >1.0.0-beta", "1.0.0-beta.0"],

            // Impossible range
            [">4 <3", null]
        ].forEach((tuple) => {
            const range = tuple[0];
            const version = tuple[1];
            const loose = tuple[2] || false;
            const msg = `minVersion(${range}, ${loose}) = ${version}`;
            const min = semver.minVersion(range, loose);
            assert.ok(min === version || (min && min.version === version), msg);
        });
    });

    it("valid range test", () => {
        // [range, result]
        // validRange(range) -> result
        // translate ranges into their canonical form
        [
            ["1.0.0 - 2.0.0", ">=1.0.0 <=2.0.0"],
            ["1.0.0", "1.0.0"],
            [">=*", "*"],
            ["", "*"],
            ["*", "*"],
            ["*", "*"],
            [">=1.0.0", ">=1.0.0"],
            [">1.0.0", ">1.0.0"],
            ["<=2.0.0", "<=2.0.0"],
            ["1", ">=1.0.0 <2.0.0"],
            ["<=2.0.0", "<=2.0.0"],
            ["<=2.0.0", "<=2.0.0"],
            ["<2.0.0", "<2.0.0"],
            ["<2.0.0", "<2.0.0"],
            [">= 1.0.0", ">=1.0.0"],
            [">=  1.0.0", ">=1.0.0"],
            [">=   1.0.0", ">=1.0.0"],
            ["> 1.0.0", ">1.0.0"],
            [">  1.0.0", ">1.0.0"],
            ["<=   2.0.0", "<=2.0.0"],
            ["<= 2.0.0", "<=2.0.0"],
            ["<=  2.0.0", "<=2.0.0"],
            ["<    2.0.0", "<2.0.0"],
            ["<\t2.0.0", "<2.0.0"],
            [">=0.1.97", ">=0.1.97"],
            [">=0.1.97", ">=0.1.97"],
            ["0.1.20 || 1.2.4", "0.1.20||1.2.4"],
            [">=0.2.3 || <0.0.1", ">=0.2.3||<0.0.1"],
            [">=0.2.3 || <0.0.1", ">=0.2.3||<0.0.1"],
            [">=0.2.3 || <0.0.1", ">=0.2.3||<0.0.1"],
            ["||", "||"],
            ["2.x.x", ">=2.0.0 <3.0.0"],
            ["1.2.x", ">=1.2.0 <1.3.0"],
            ["1.2.x || 2.x", ">=1.2.0 <1.3.0||>=2.0.0 <3.0.0"],
            ["1.2.x || 2.x", ">=1.2.0 <1.3.0||>=2.0.0 <3.0.0"],
            ["x", "*"],
            ["2.*.*", ">=2.0.0 <3.0.0"],
            ["1.2.*", ">=1.2.0 <1.3.0"],
            ["1.2.* || 2.*", ">=1.2.0 <1.3.0||>=2.0.0 <3.0.0"],
            ["*", "*"],
            ["2", ">=2.0.0 <3.0.0"],
            ["2.3", ">=2.3.0 <2.4.0"],
            ["~2.4", ">=2.4.0 <2.5.0"],
            ["~2.4", ">=2.4.0 <2.5.0"],
            ["~>3.2.1", ">=3.2.1 <3.3.0"],
            ["~1", ">=1.0.0 <2.0.0"],
            ["~>1", ">=1.0.0 <2.0.0"],
            ["~> 1", ">=1.0.0 <2.0.0"],
            ["~1.0", ">=1.0.0 <1.1.0"],
            ["~ 1.0", ">=1.0.0 <1.1.0"],
            ["^0", ">=0.0.0 <1.0.0"],
            ["^ 1", ">=1.0.0 <2.0.0"],
            ["^0.1", ">=0.1.0 <0.2.0"],
            ["^1.0", ">=1.0.0 <2.0.0"],
            ["^1.2", ">=1.2.0 <2.0.0"],
            ["^0.0.1", ">=0.0.1 <0.0.2"],
            ["^0.0.1-beta", ">=0.0.1-beta <0.0.2"],
            ["^0.1.2", ">=0.1.2 <0.2.0"],
            ["^1.2.3", ">=1.2.3 <2.0.0"],
            ["^1.2.3-beta.4", ">=1.2.3-beta.4 <2.0.0"],
            ["<1", "<1.0.0"],
            ["< 1", "<1.0.0"],
            [">=1", ">=1.0.0"],
            [">= 1", ">=1.0.0"],
            ["<1.2", "<1.2.0"],
            ["< 1.2", "<1.2.0"],
            ["1", ">=1.0.0 <2.0.0"],
            [">01.02.03", ">1.2.3", true],
            [">01.02.03", null],
            ["~1.2.3beta", ">=1.2.3-beta <1.3.0", true],
            ["~1.2.3beta", null],
            ["^ 1.2 ^ 1", ">=1.2.0 <2.0.0 >=1.0.0 <2.0.0"]
        ].forEach((v) => {
            const pre = v[0];
            const wanted = v[1];
            const loose = v[2];
            const found = validRange(pre, loose);

            assert.equal(found, wanted, `validRange(${pre}) === ${wanted}`);
        });
    });

    it("comparators test", () => {
        // [range, comparators]
        // turn range into a set of individual comparators
        [
            ["1.0.0 - 2.0.0", [[">=1.0.0", "<=2.0.0"]]],
            ["1.0.0", [["1.0.0"]]],
            [">=*", [[""]]],
            ["", [[""]]],
            ["*", [[""]]],
            ["*", [[""]]],
            [">=1.0.0", [[">=1.0.0"]]],
            [">=1.0.0", [[">=1.0.0"]]],
            [">=1.0.0", [[">=1.0.0"]]],
            [">1.0.0", [[">1.0.0"]]],
            [">1.0.0", [[">1.0.0"]]],
            ["<=2.0.0", [["<=2.0.0"]]],
            ["1", [[">=1.0.0", "<2.0.0"]]],
            ["<=2.0.0", [["<=2.0.0"]]],
            ["<=2.0.0", [["<=2.0.0"]]],
            ["<2.0.0", [["<2.0.0"]]],
            ["<2.0.0", [["<2.0.0"]]],
            [">= 1.0.0", [[">=1.0.0"]]],
            [">=  1.0.0", [[">=1.0.0"]]],
            [">=   1.0.0", [[">=1.0.0"]]],
            ["> 1.0.0", [[">1.0.0"]]],
            [">  1.0.0", [[">1.0.0"]]],
            ["<=   2.0.0", [["<=2.0.0"]]],
            ["<= 2.0.0", [["<=2.0.0"]]],
            ["<=  2.0.0", [["<=2.0.0"]]],
            ["<    2.0.0", [["<2.0.0"]]],
            ["<\t2.0.0", [["<2.0.0"]]],
            [">=0.1.97", [[">=0.1.97"]]],
            [">=0.1.97", [[">=0.1.97"]]],
            ["0.1.20 || 1.2.4", [["0.1.20"], ["1.2.4"]]],
            [">=0.2.3 || <0.0.1", [[">=0.2.3"], ["<0.0.1"]]],
            [">=0.2.3 || <0.0.1", [[">=0.2.3"], ["<0.0.1"]]],
            [">=0.2.3 || <0.0.1", [[">=0.2.3"], ["<0.0.1"]]],
            ["||", [[""], [""]]],
            ["2.x.x", [[">=2.0.0", "<3.0.0"]]],
            ["1.2.x", [[">=1.2.0", "<1.3.0"]]],
            ["1.2.x || 2.x", [[">=1.2.0", "<1.3.0"], [">=2.0.0", "<3.0.0"]]],
            ["1.2.x || 2.x", [[">=1.2.0", "<1.3.0"], [">=2.0.0", "<3.0.0"]]],
            ["x", [[""]]],
            ["2.*.*", [[">=2.0.0", "<3.0.0"]]],
            ["1.2.*", [[">=1.2.0", "<1.3.0"]]],
            ["1.2.* || 2.*", [[">=1.2.0", "<1.3.0"], [">=2.0.0", "<3.0.0"]]],
            ["1.2.* || 2.*", [[">=1.2.0", "<1.3.0"], [">=2.0.0", "<3.0.0"]]],
            ["*", [[""]]],
            ["2", [[">=2.0.0", "<3.0.0"]]],
            ["2.3", [[">=2.3.0", "<2.4.0"]]],
            ["~2.4", [[">=2.4.0", "<2.5.0"]]],
            ["~2.4", [[">=2.4.0", "<2.5.0"]]],
            ["~>3.2.1", [[">=3.2.1", "<3.3.0"]]],
            ["~1", [[">=1.0.0", "<2.0.0"]]],
            ["~>1", [[">=1.0.0", "<2.0.0"]]],
            ["~> 1", [[">=1.0.0", "<2.0.0"]]],
            ["~1.0", [[">=1.0.0", "<1.1.0"]]],
            ["~ 1.0", [[">=1.0.0", "<1.1.0"]]],
            ["~ 1.0.3", [[">=1.0.3", "<1.1.0"]]],
            ["~> 1.0.3", [[">=1.0.3", "<1.1.0"]]],
            ["<1", [["<1.0.0"]]],
            ["< 1", [["<1.0.0"]]],
            [">=1", [[">=1.0.0"]]],
            [">= 1", [[">=1.0.0"]]],
            ["<1.2", [["<1.2.0"]]],
            ["< 1.2", [["<1.2.0"]]],
            ["1", [[">=1.0.0", "<2.0.0"]]],
            ["1 2", [[">=1.0.0", "<2.0.0", ">=2.0.0", "<3.0.0"]]],
            ["1.2 - 3.4.5", [[">=1.2.0", "<=3.4.5"]]],
            ["1.2.3 - 3.4", [[">=1.2.3", "<3.5.0"]]],
            ["1.2.3 - 3", [[">=1.2.3", "<4.0.0"]]],
            [">*", [["<0.0.0"]]],
            ["<*", [["<0.0.0"]]]
        ].forEach((v) => {
            const pre = v[0];
            const wanted = v[1];
            const found = toComparators(v[0]);
            const jw = JSON.stringify(wanted);
            assert.deepEqual(found, wanted, `toComparators(${pre}) === ${jw}`);
        });
    });

    it("invalid version numbers", () => {
        ["1.2.3.4",
            "NOT VALID",
            1.2,
            null,
            "Infinity.NaN.Infinity"
        ].forEach((v) => {
            const err = assert.throws(() => {
                new SemVer(v); // eslint-disable-line no-new
            });
            assert.instanceOf(err, TypeError);
            assert.equal(err.message, `Invalid Version: ${v}`);
        });
    });

    it("strict vs loose version numbers", () => {
        [
            ["=1.2.3", "1.2.3"],
            ["01.02.03", "1.2.3"],
            ["1.2.3-beta.01", "1.2.3-beta.1"],
            ["   =1.2.3", "1.2.3"],
            ["1.2.3foo", "1.2.3-foo"]
        ].forEach((v) => {
            const loose = v[0];
            const strict = v[1];
            assert.throws(() => {
                new SemVer(loose); // eslint-disable-line no-new
            });
            const lv = new SemVer(loose, true);
            assert.equal(lv.version, strict);
            assert.ok(eq(loose, strict, true));
            assert.throws(() => {
                eq(loose, strict);
            });
            assert.throws(() => {
                new SemVer(strict).compare(loose);
            });
            assert.equal(semver.compareLoose(v[0], v[1]), 0);
        });
    });

    it("compare main vs pre", () => {
        const s = new SemVer("1.2.3");
        assert.equal(s.compareMain("2.3.4"), -1);
        assert.equal(s.compareMain("1.2.4"), -1);
        assert.equal(s.compareMain("0.1.2"), 1);
        assert.equal(s.compareMain("1.2.2"), 1);
        assert.equal(s.compareMain("1.2.3-pre"), 0);

        const p = new SemVer("1.2.3-alpha.0.pr.1");
        assert.equal(p.comparePre("9.9.9-alpha.0.pr.1"), 0);
        assert.equal(p.comparePre("1.2.3"), -1);
        assert.equal(p.comparePre("1.2.3-alpha.0.pr.2"), -1);
        assert.equal(p.comparePre("1.2.3-alpha.0.2"), 1);
    });

    it("rcompareIdentifiers and compareIdentifiers", () => {
        const set = [
            ["1", "2"],
            ["alpha", "beta"],
            ["0", "beta"]
        ];
        set.forEach((ab) => {
            const a = ab[0];
            const b = ab[1];
            assert.equal(semver.compareIdentifiers(a, b), -1);
            assert.equal(semver.rcompareIdentifiers(a, b), 1);
        });
        assert.equal(semver.compareIdentifiers("0", "0"), 0);
        assert.equal(semver.rcompareIdentifiers("0", "0"), 0);
    });

    it("strict vs loose ranges", () => {
        [
            [">=01.02.03", ">=1.2.3"],
            ["~1.02.03beta", ">=1.2.3-beta <1.3.0"]
        ].forEach((v) => {
            const loose = v[0];
            const comps = v[1];
            assert.throws(() => {
                new Range(loose); // eslint-disable-line no-new
            });
            assert.equal(new Range(loose, true).range, comps);
        });
    });

    it("max satisfying", () => {
        [
            [["1.2.3", "1.2.4"], "1.2", "1.2.4"],
            [["1.2.4", "1.2.3"], "1.2", "1.2.4"],
            [["1.2.3", "1.2.4", "1.2.5", "1.2.6"], "~1.2.3", "1.2.6"],
            [["1.1.0", "1.2.0", "1.2.1", "1.3.0", "2.0.0b1", "2.0.0b2", "2.0.0b3", "2.0.0", "2.1.0"], "~2.0.0", "2.0.0", true]
        ].forEach((v) => {
            const versions = v[0];
            const range = v[1];
            const expect = v[2];
            const loose = v[3];
            const actual = semver.maxSatisfying(versions, range, loose);
            assert.equal(actual, expect);
        });
    });

    it("min satisfying", () => {
        [
            [["1.2.3", "1.2.4"], "1.2", "1.2.3"],
            [["1.2.4", "1.2.3"], "1.2", "1.2.3"],
            [["1.2.3", "1.2.4", "1.2.5", "1.2.6"], "~1.2.3", "1.2.3"],
            [["1.1.0", "1.2.0", "1.2.1", "1.3.0", "2.0.0b1", "2.0.0b2", "2.0.0b3", "2.0.0", "2.1.0"], "~2.0.0", "2.0.0", true]
        ].forEach((v) => {
            const versions = v[0];
            const range = v[1];
            const expect = v[2];
            const loose = v[3];
            const actual = semver.minSatisfying(versions, range, loose);
            assert.equal(actual, expect);
        });
    });

    it("intersect comparators", () => {
        [
            // One is a Version
            ["1.3.0", ">=1.3.0", true],
            ["1.3.0", ">1.3.0", false],
            [">=1.3.0", "1.3.0", true],
            [">1.3.0", "1.3.0", false],
            // Same direction increasing
            [">1.3.0", ">1.2.0", true],
            [">1.2.0", ">1.3.0", true],
            [">=1.2.0", ">1.3.0", true],
            [">1.2.0", ">=1.3.0", true],
            // Same direction decreasing
            ["<1.3.0", "<1.2.0", true],
            ["<1.2.0", "<1.3.0", true],
            ["<=1.2.0", "<1.3.0", true],
            ["<1.2.0", "<=1.3.0", true],
            // Different directions, same semver and inclusive operator
            [">=1.3.0", "<=1.3.0", true],
            [">=v1.3.0", "<=1.3.0", true],
            [">=1.3.0", ">=1.3.0", true],
            ["<=1.3.0", "<=1.3.0", true],
            ["<=1.3.0", "<=v1.3.0", true],
            [">1.3.0", "<=1.3.0", false],
            [">=1.3.0", "<1.3.0", false],
            // Opposite matching directions
            [">1.0.0", "<2.0.0", true],
            [">=1.0.0", "<2.0.0", true],
            [">=1.0.0", "<=2.0.0", true],
            [">1.0.0", "<=2.0.0", true],
            ["<=2.0.0", ">1.0.0", true],
            ["<=1.0.0", ">=2.0.0", false]
        ].forEach((v) => {
            const comparator1 = new Comparator(v[0]);
            const comparator2 = new Comparator(v[1]);
            const expect = v[2];

            let actual1 = comparator1.intersects(comparator2);
            let actual2 = comparator2.intersects(comparator1);
            actual1 = comparator1.intersects(comparator2, false);
            actual2 = comparator2.intersects(comparator1, { loose: false });
            const actual3 = semver.intersects(comparator1, comparator2);
            const actual4 = semver.intersects(comparator2, comparator1);
            const actual5 = semver.intersects(comparator1, comparator2, true);
            const actual6 = semver.intersects(comparator2, comparator1, true);
            const actual7 = semver.intersects(v[0], v[1]);
            const actual8 = semver.intersects(v[1], v[0]);
            const actual9 = semver.intersects(v[0], v[1], true);
            const actual10 = semver.intersects(v[1], v[0], true);
            assert.equal(actual1, expect);
            assert.equal(actual2, expect);
            assert.equal(actual3, expect);
            assert.equal(actual4, expect);
            assert.equal(actual5, expect);
            assert.equal(actual6, expect);
            assert.equal(actual7, expect);
            assert.equal(actual8, expect);
            assert.equal(actual9, expect);
            assert.equal(actual10, expect);
        });
    });

    it("missing comparator parameter in intersect comparators", () => {
        const err = assert.throws(() => {
            new Comparator(">1.0.0").intersects();
        });
        assert.instanceOf(err, TypeError);
        assert.equal(err.message, "a Comparator is required");
    });

    it("ranges intersect", () => {
        [
            ["1.3.0 || <1.0.0 >2.0.0", "1.3.0 || <1.0.0 >2.0.0", true],
            ["<1.0.0 >2.0.0", ">0.0.0", false],
            [">0.0.0", "<1.0.0 >2.0.0", false],
            ["<1.0.0 >2.0.0", ">1.4.0 <1.6.0", false],
            ["<1.0.0 >2.0.0", ">1.4.0 <1.6.0 || 2.0.0", false],
            [">1.0.0 <=2.0.0", "2.0.0", true],
            ["<1.0.0 >=2.0.0", "2.1.0", false],
            ["<1.0.0 >=2.0.0", ">1.4.0 <1.6.0 || 2.0.0", false],
            ["1.5.x", "<1.5.0 || >=1.6.0", false],
            ["<1.5.0 || >=1.6.0", "1.5.x", false],
            ["<1.6.16 || >=1.7.0 <1.7.11 || >=1.8.0 <1.8.2", ">=1.6.16 <1.7.0 || >=1.7.11 <1.8.0 || >=1.8.2", false],
            ["<=1.6.16 || >=1.7.0 <1.7.11 || >=1.8.0 <1.8.2", ">=1.6.16 <1.7.0 || >=1.7.11 <1.8.0 || >=1.8.2", true],
            [">=1.0.0", "<=1.0.0", true],
            [">1.0.0 <1.0.0", "<=0.0.0", false]
        ].forEach((v) => {
            const range1 = new Range(v[0]);
            const range2 = new Range(v[1]);
            const expect = v[2];
            const actual1 = range1.intersects(range2);
            const actual2 = range2.intersects(range1);
            const actual3 = semver.intersects(v[1], v[0]);
            const actual4 = semver.intersects(v[0], v[1]);
            const actual5 = semver.intersects(v[1], v[0], true);
            const actual6 = semver.intersects(v[0], v[1], true);
            const actual7 = semver.intersects(range1, range2);
            const actual8 = semver.intersects(range2, range1);
            const actual9 = semver.intersects(range1, range2, true);
            const actual0 = semver.intersects(range2, range1, true);
            assert.equal(actual1, expect);
            assert.equal(actual2, expect);
            assert.equal(actual3, expect);
            assert.equal(actual4, expect);
            assert.equal(actual5, expect);
            assert.equal(actual6, expect);
            assert.equal(actual7, expect);
            assert.equal(actual8, expect);
            assert.equal(actual9, expect);
            assert.equal(actual0, expect);
        });
    });

    it("missing range parameter in range intersect", () => {
        const err = assert.throws(() => {
            new Range("1.0.0").intersects();
        });
        assert.instanceOf(err, TypeError);
        assert.equal(err.message, "a Range is required");
    });

    it("really big numeric prerelease value", () => {
        const r = new SemVer(`1.2.3-beta.${Number.MAX_SAFE_INTEGER}0`);
        assert.sameMembers(r.prerelease, ["beta", "90071992547409910"]);
    });

    it("outside with bad hilo throws", () => {
        const err = assert.throws(() => {
            semver.outside("1.2.3", ">1.5.0", "blerg", true);
        });
        assert.instanceOf(err, TypeError);
        assert.equal(err.message, 'Must provide a hilo val of "<" or ">"');
    });

    it("comparator testing", () => {
        const c = new Comparator(">=1.2.3");
        assert.ok(c.test("1.2.4"));
        const c2 = new Comparator(c);
        assert.ok(c2.test("1.2.4"));
        const c3 = new Comparator(c, true);
        assert.ok(c3.test("1.2.4"));
    });

    it("tostrings", () => {
        assert.equal(new Range(">= v1.2.3").toString(), ">=1.2.3");
        assert.equal(new Comparator(">= v1.2.3").toString(), ">=1.2.3");
    });

    it("invalid cmp usage", () => {
        const err = assert.throws(() => {
            cmp("1.2.3", "a frog", "4.5.6");
        });
        assert.instanceOf(err, TypeError);
        assert.equal(err.message, "Invalid operator: a frog");
    });

    it("sorting", () => {
        const list = [
            "1.2.3",
            "5.9.6",
            "0.1.2"
        ];
        const sorted = [
            "0.1.2",
            "1.2.3",
            "5.9.6"
        ];
        const rsorted = [
            "5.9.6",
            "1.2.3",
            "0.1.2"
        ];
        assert.sameMembers(semver.sort(list), sorted);
        assert.sameMembers(semver.rsort(list), rsorted);
    });

    it("bad ranges in max/min satisfying", () => {
        const r = "some frogs and sneks-v2.5.6";
        assert.equal(semver.maxSatisfying([], r), null);
        assert.equal(semver.minSatisfying([], r), null);
    });
});
