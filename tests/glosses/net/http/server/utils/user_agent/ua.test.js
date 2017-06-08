describe("net", "http", "server", "util", "user agent", "_", () => {
    const { net: { http: { server: { util: { userAgent } } } }, fs } = adone;
    const { _: { UA, PartialParser } } = userAgent;

    describe("UA", () => {
        it("UA constructor with no arguments", () => {
            const ua = new UA();
            assert.strictEqual(ua.family, "Other");
            assert.strictEqual(ua.major, null);
            assert.strictEqual(ua.minor, null);
            assert.strictEqual(ua.patch, null);
        });

        it("UA constructor with valid arguments", () => {
            const ua = new UA("Firefox", "16", "3", "beta");
            assert.strictEqual(ua.family, "Firefox");
            assert.strictEqual(ua.major, "16");
            assert.strictEqual(ua.minor, "3");
            assert.strictEqual(ua.patch, "beta");
            assert.ok(!("patchMinor" in ua));
            assert.ok(!("type" in ua));
        });

        it("UA constructor with valid arguments and type", () => {
            const ua = new UA("Firefox", "16", "3", "beta", "", "browser");
            assert.strictEqual(ua.family, "Firefox");
            assert.strictEqual(ua.major, "16");
            assert.strictEqual(ua.minor, "3");
            assert.strictEqual(ua.patch, "beta");
            assert.strictEqual(ua.type, "browser");
        });

        it("UA#toVersionString with only numerical args", () => {
            assert.strictEqual(new UA("Firefox", "16", "3", "2").toVersionString(), "16.3.2");
        });

        it("UA#toVersionString with non numerical patch version", () => {
            assert.strictEqual(new UA("Firefox", "16", "3", "beta").toVersionString(), "16.3beta");
        });

        it("UA#toString for known UA", () => {
            assert.strictEqual(new UA("Firefox", "16", "3", "2").toString(), "Firefox 16.3.2");
        });

        it("UA#toString for unknown UA", () => {
            assert.strictEqual(new UA().toString(), "Other");
        });
    });

    describe("UA parser", () => {
        it("createParser returns a function", () => {
            assert.equal(typeof new PartialParser([]).parse, "function");
        });

        it("Parser returns an instance of UA when unsuccessful at parsing", () => {
            const parser = new PartialParser([]);
            assert.ok(parser.parse("bar") instanceof UA);
        });

        it("Parser returns an instance of UA when sucessful", () => {
            const parser = new PartialParser([{ regex: "foo" }]);
            assert.ok(parser.parse("foo") instanceof UA);
        });

        it("Parser correctly identifies UA name", () => {
            const parser = new PartialParser([{ regex: "(foo)" }]);
            assert.strictEqual(parser.parse("foo").family, "foo");
        });

        it("Parser correctly identifies version numbers", () => {
            const parser = new PartialParser([{ regex: "(foo) (\\d)\\.(\\d)\\.(\\d)" }]);
            const ua = parser.parse("foo 1.2.3");
            assert.strictEqual(ua.family, "foo");
            assert.strictEqual(ua.major, "1");
            assert.strictEqual(ua.minor, "2");
            assert.strictEqual(ua.patch, "3");
        });

        it("Parser correctly processes replacements", () => {
            const parser = new PartialParser([{
                regex: "(foo) (\\d)\\.(\\d).(\\d)",
                family: "$1bar",
                v1: "a",
                v2: "b",
                v3: "c"
            }]);
            const ua = parser.parse("foo 1.2.3");
            assert.strictEqual(ua.family, "foobar");
            assert.strictEqual(ua.major, "a");
            assert.strictEqual(ua.minor, "b");
            assert.strictEqual(ua.patch, "c");
        });

        it("Parser correctly processes replacements with curly brackets", () => {
            const parser = new PartialParser([{
                regex: "(foo) (\\d)\\.(\\d).(\\d) (?:(a)|(b)|(c)|(d)|(e)|(f)|(g)|(h)|(i)|(j)|(k)|(l)|(m)|(n)|(o)|(p)|(q)|(r)|(s)|(t)|(u)|(v)|(w)|(x)|(y)|(z))",
                family: "$1bar",
                v1: "$1$2$3$4$5$6$7$8$9$10$11$12$13$14$15$16$17$18$19$20$21$22$23$24$25$26$27$28$29$30",
                v2: "$100a", // this matches $100 which is not present
                v3: '${1}00' // eslint-disable-line
                // match $1
            }]);

            const ua = parser.parse("foo 1.2.3 z");
            assert.strictEqual(ua.family, "foobar");
            assert.strictEqual(ua.major, "foo123z");
            assert.strictEqual(ua.minor, "a");
            assert.strictEqual(ua.patch, "foo00");
        });
    });

    describe("UA parser groups", () => {
        let parse = null;

        before(async () => {
            const file = new fs.File(__dirname, "fixtures", "ua", "group.yml");
            const regexes = adone.data.yaml.safeLoad(await file.content());
            const { rules, pattern } = regexes;
            const parser = new PartialParser(rules, { pattern });
            parse = parser.parse.bind(parser);
        });

        it('Parser correctly processes groups matching "foo"', () => {
            const ua = parse("foo 1.2.3");
            assert.strictEqual(ua.family, "foobar");
            assert.strictEqual(ua.major, "a");
            assert.strictEqual(ua.minor, "b");
            assert.strictEqual(ua.patch, "c");
        });

        it('Parser correctly processes groups matching "FOO"', () => {
            const ua = parse("FOO 1.2.3");
            assert.strictEqual(ua.family, "FOObar");
            assert.strictEqual(ua.major, "a");
            assert.strictEqual(ua.minor, "b");
            assert.strictEqual(ua.patch, "c");
        });

        it('Parser correctly processes groups matching "Fooooo"', () => {
            const ua = parse("Fooooo 1.2.3");
            assert.strictEqual(ua.family, "Fooooobar");
            assert.strictEqual(ua.major, "a3");
            assert.strictEqual(ua.minor, "b2");
            assert.strictEqual(ua.patch, "c1");
        });

        it('Parser correctly processes groups not matching "foo browser" within group "foo"', () => {
            const ua = parse("foo browser 1.2.3");
            assert.strictEqual(ua.family, "browser");
            assert.strictEqual(ua.major, "foo 1");
            assert.strictEqual(ua.minor, "foo 2");
            assert.strictEqual(ua.patch, "foo 3");
        });

        it('Parser correctly processes groups matching "bbar" within group "bar"', () => {
            const ua = parse("bbar 1.2.3");
            assert.strictEqual(ua.family, "foobar");
            assert.strictEqual(ua.major, "bar12a");
            assert.strictEqual(ua.minor, "bar12b");
            assert.strictEqual(ua.patch, "bar12c");
        });

        it('Parser correctly processes groups matching "bbar" within group "bar"', () => {
            const ua = parse("bbar 1.2.3");
            assert.strictEqual(ua.family, "foobar");
            assert.strictEqual(ua.major, "bar12a");
            assert.strictEqual(ua.minor, "bar12b");
            assert.strictEqual(ua.patch, "bar12c");
        });

        it('Parser correctly processes groups not matching "Bar"', () => {
            const ua = parse("Bar 1.2.3");
            assert.strictEqual(ua.family, "Other");
            assert.strictEqual(ua.major, null);
            assert.strictEqual(ua.minor, null);
            assert.strictEqual(ua.patch, null);
        });

        it('Parser correctly processes groups matching "other browser" outside groups', () => {
            const ua = parse("other browser 1.2.3");
            assert.strictEqual(ua.family, "browser");
            assert.strictEqual(ua.major, "a other 1");
            assert.strictEqual(ua.minor, "b other 2");
            assert.strictEqual(ua.patch, "c other 3");
        });

        it("Parser correctly processes preset", () => {
            const ua = parse("kitti foo 4.5.6");
            assert.deepEqual(ua, { family: "foobar", major: "a", minor: "b", patch: "c", type: "app::kitti" });
        });
    });
});


