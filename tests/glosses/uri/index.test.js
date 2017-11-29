import urls from "./urls";

const {
    is,
    uri
} = adone;

const {
    URI
} = uri;

describe("uri", () => {
    describe("constructing", () => {
        it("URI(undefined)", () => {
            assert.throws(() => {
                URI(undefined);
            }, TypeError);
        });
        it("URI(null)", () => {
            assert.throws(() => {
                URI(null);
            }, TypeError);
        });
        it("new URI(string)", () => {
            const u = new URI("http://example.org/");
            assert.isOk(u instanceof URI, "instanceof URI");
            assert.isOk(!is.undefined(u._parts.hostname), "host undefined");
        });
        it("new URI(object)", () => {
            const u = new URI({ protocol: "http", hostname: "example.org" });
            assert.isOk(u instanceof URI, "instanceof URI");
            assert.isOk(!is.undefined(u._parts.hostname), "host undefined");
        });

        it("new URI(URI)", () => {
            const u = new URI(new URI({ protocol: "http", hostname: "example.org" }));
            assert.isOk(u instanceof URI, "instanceof URI");
            assert.isOk(!is.undefined(u._parts.hostname), "host undefined");
        });
        it("new URI(new Date())", () => {
            assert.throws(() => {
                new URI(new Date());
            }, TypeError);
        });
        it("new URI(undefined)", () => {
            assert.throws(() => {
                new URI(undefined);
            }, TypeError);
        });
        it("function URI(string)", () => {
            const u = new URI("http://example.org/");
            assert.isOk(u instanceof URI, "instanceof URI");
            assert.isOk(!is.undefined(u._parts.hostname), "host undefined");
        });
        it('function URI(string) with invalid port "port" throws', () => {
            assert.throws(() => {
                new URI("http://example.org:port");
            }, TypeError);
        });
        it('function URI(string) with invalid port "0" throws', () => {
            assert.throws(() => {
                new URI("http://example.org:0");
            }, TypeError);
        });
        it('function URI(string) with invalid port "65536" throws', () => {
            assert.throws(() => {
                new URI("http://example.org:65536");
            }, TypeError);
        });
        it("function URI(string) with protocol and without hostname should throw", () => {
            new URI("http://");

            URI.preventInvalidHostname = true;
            assert.throws(() => {
                new URI("http://");
            }, TypeError);

            URI.preventInvalidHostname = false;
            new URI("http://");
        });
        it("new URI(string, string)", () => {
            // see http://dvcs.w3.org/hg/url/raw-file/tip/Overview.html#constructor
            const u = new URI("../foobar.html", "http://example.org/hello/world.html");
            assert.equal(String(u), "http://example.org/foobar.html", "resolve on construct");
        });
    });

    describe("parsing", () => {
        // [].forEach() no IE, lacking interest in polyfilling this...
        for (let i = 0, t; (t = urls[i]); i++) {
            (function (t) {
                it(`parse ${t.name}`, () => {
                    const u = new URI(t.url);
                    let key;

                    // test URL built from parts
                    assert.equal(String(u), t._url || t.url, "toString");

                    // test parsed parts
                    for (key in t.parts) {
                        if (Object.hasOwnProperty.call(t.parts, key)) {
                            assert.equal(u._parts[key], t.parts[key], `part: ${key}`);
                        }
                    }

                    // test accessors
                    for (key in t.accessors) {
                        if (Object.hasOwnProperty.call(t.accessors, key)) {
                            assert.equal(u[key](), t.accessors[key], `accessor: ${key}`);
                        }
                    }

                    // test is()
                    for (key in t.is) {
                        if (Object.hasOwnProperty.call(t.is, key)) {
                            assert.equal(u.is(key), t.is[key], `is: ${key}`);
                        }
                    }
                });
            })(t);
        }
    });

    describe("mutating basics", () => {
        it("protocol", () => {
            const u = new URI("http://example.org/foo.html");
            u.protocol("ftp");
            assert.equal(u.protocol(), "ftp", "ftp protocol");
            assert.equal(`${u}`, "ftp://example.org/foo.html", "ftp url");

            u.protocol("");
            assert.equal(u.protocol(), "", "relative protocol");
            assert.equal(`${u}`, "//example.org/foo.html", "relative-scheme url");

            u.protocol("f.t-p+0");
            assert.equal(u.protocol(), "f.t-p+0", "character profile");

            try {
                u.protocol("f:t");
                assert.isOk(false, "do not accept invalid protocol");
            } catch (e) {
                //
            }

            u.protocol(null);
            assert.equal(u.protocol(), "", "missing protocol");
            assert.equal(String(u), "//example.org/foo.html", "missing-scheme url");
        });

        it("username", () => {
            const u = new URI("http://example.org/foo.html");
            u.username("hello");
            assert.equal(u.username(), "hello", "changed username hello");
            assert.equal(u.password(), "", "changed passowrd hello");
            assert.equal(`${u}`, "http://hello@example.org/foo.html", "changed url hello");

            u.username("");
            assert.equal(u.username(), "", 'changed username ""');
            assert.equal(u.password(), "", 'changed passowrd ""');
            assert.equal(String(u), "http://example.org/foo.html", 'changed url ""');
        });

        it("password", () => {
            const u = new URI("http://hello@example.org/foo.html");
            u.password("world");
            assert.equal(u.username(), "hello", "changed username world");
            assert.equal(u.password(), "world", "changed passowrd world");
            assert.equal(String(u), "http://hello:world@example.org/foo.html", "changed url world");

            u.password("");
            assert.equal(u.username(), "hello", 'changed username ""');
            assert.equal(u.password(), "", 'changed passowrd ""');
            assert.equal(String(u), "http://hello@example.org/foo.html", 'changed url ""');

            u.username("").password("hahaha");
            assert.equal(u.username(), "", "changed username - password without username");
            assert.equal(u.password(), "hahaha", "changed password - password without username");
            assert.equal(String(u), "http://:hahaha@example.org/foo.html", "changed url - password without username");
        });

        it("hostname", () => {
            const u = new URI("http://example.org/foo.html");
            u.hostname("abc.foobar.lala");
            assert.equal(u.hostname(), "abc.foobar.lala", "hostname changed");
            assert.equal(String(u), "http://abc.foobar.lala/foo.html", "hostname changed url");

            u.hostname("some_where.exa_mple.org");
            assert.equal(u.hostname(), "some_where.exa_mple.org", "hostname changed");
            assert.equal(String(u), "http://some_where.exa_mple.org/foo.html", "hostname changed url");

            assert.throws(() => {
                u.hostname("foo\\bar.com");
            }, TypeError);

            // instance does not fall back to global setting
            URI.preventInvalidHostname = true;
            u.hostname("");
            u.hostname(null);
            URI.preventInvalidHostname = false;

            u.preventInvalidHostname(true);
            assert.throws(() => {
                u.hostname("");
            }, TypeError);

            assert.throws(() => {
                u.hostname(null);
            }, TypeError);
        });

        it("port", () => {
            const u = new URI("http://example.org/foo.html");
            u.port("80");
            assert.equal(u.port(), "80", "changing port 80");
            assert.equal(String(u), "http://example.org:80/foo.html", "changing url 80");

            u.port("");
            assert.equal(u.port(), "", 'changing port ""');
            assert.equal(String(u), "http://example.org/foo.html", 'changing url ""');
        });

        it("path", () => {
            let u = new URI("http://example.org/foobar.html?query=string");
            u.pathname("/some/path/file.suffix");
            assert.equal(u.pathname(), "/some/path/file.suffix", 'changing pathname "/some/path/file.suffix"');
            assert.equal(`${u}`, "http://example.org/some/path/file.suffix?query=string", 'changing url "/some/path/file.suffix"');

            u.pathname("");
            assert.equal(u.pathname(), "/", 'changing pathname ""');
            assert.equal(String(u), "http://example.org/?query=string", 'changing url ""');

            u.pathname("/~userhome/@mine;is %2F and/");
            assert.equal(u.pathname(), "/~userhome/@mine;is%20%2F%20and/", "path encoding");
            assert.equal(u.pathname(true), "/~userhome/@mine;is %2F and/", "path decoded");

            u = new URI("/a/b/c/").relativeTo("/a/b/c/");
            assert.equal(u.pathname(), "", "empty relative path");
            assert.equal(u.toString(), "", "empty relative path to string");

            u.pathname("/");
            assert.equal(u.pathname(), "/", "empty absolute path");
            assert.equal(u.toString(), "/", "empty absolute path to string");
        });

        it("URN paths", () => {
            const u = new URI("urn:uuid:6e8bc430-9c3a-11d9-9669-0800200c9a66?foo=bar");
            u.pathname("uuid:de305d54-75b4-431b-adb2-eb6b9e546013");
            assert.equal(u.pathname(), "uuid:de305d54-75b4-431b-adb2-eb6b9e546013");
            assert.equal(String(u), "urn:uuid:de305d54-75b4-431b-adb2-eb6b9e546013?foo=bar");

            u.pathname("");
            assert.equal(u.pathname(), "", 'changing pathname ""');
            assert.equal(`${u}`, "urn:?foo=bar", 'changing url ""');

            u.pathname("music:classical:Béla Bártok%3a Concerto for Orchestra");
            assert.equal(u.pathname(), "music:classical:B%C3%A9la%20B%C3%A1rtok%3A%20Concerto%20for%20Orchestra", "path encoding");
            assert.equal(u.pathname(true), "music:classical:Béla Bártok%3A Concerto for Orchestra", "path decoded");
        });

        it("query", () => {
            const u = new URI("http://example.org/foo.html");
            u.query("foo=bar=foo");
            assert.equal(u.query(), "foo=bar=foo", "query: foo=bar=foo");
            assert.equal(u.search(), "?foo=bar=foo", "query: foo=bar=foo - search");

            u.query("?bar=foo");
            assert.equal(u.query(), "bar=foo", "query: ?bar=foo");
            assert.equal(u.search(), "?bar=foo", "query: ?bar=foo - search");

            u.query("");
            assert.equal(u.query(), "", 'query: ""');
            assert.equal(u.search(), "", 'query: "" - search');
            assert.equal(u.toString(), "http://example.org/foo.html");

            u.search("foo=bar=foo");
            assert.equal(u.query(), "foo=bar=foo", "search: foo=bar=foo");
            assert.equal(u.search(), "?foo=bar=foo", "search: foo=bar=foo - query");

            u.search("?bar=foo");
            assert.equal(u.query(), "bar=foo", "search: ?bar=foo");
            assert.equal(u.search(), "?bar=foo", "search: ?bar=foo - query");

            u.search("");
            assert.equal(u.query(), "", 'search: ""');
            assert.equal(u.search(), "", 'search: "" - query');

            u.query("?foo");
            assert.equal(u.query(), "foo", 'search: ""');
            assert.equal(u.search(), "?foo", 'search: "" - query');

            u.search("foo=&foo=bar");
            assert.equal(u.query(), "foo=&foo=bar", "search: foo=&foo=bar");
            assert.equal(JSON.stringify(u.query(true)), JSON.stringify({ foo: ["", "bar"] }), 'parsed query: {foo:["", "bar"]}');

            u.search("foo=bar&foo=");
            assert.equal(u.query(), "foo=bar&foo=", "search: foo=bar&foo=");
            assert.equal(JSON.stringify(u.query(true)), JSON.stringify({ foo: ["bar", ""] }), 'parsed query: {foo:["bar", ""]}');

            u.search("foo=bar&foo");
            assert.equal(u.query(), "foo=bar&foo", "search: foo=bar&foo");
            assert.equal(JSON.stringify(u.query(true)), JSON.stringify({ foo: ["bar", null] }), 'parsed query: {foo:["bar", null]}');

            u.search("foo&foo=bar");
            assert.equal(u.query(), "foo&foo=bar", "search: foo&foo=bar");
            assert.equal(JSON.stringify(u.query(true)), JSON.stringify({ foo: [null, "bar"] }), 'parsed query: {foo:[null, "bar"]}');

            // parsing empty query
            let t;
            t = u.query("?").query(true);
            t = u.query("").query(true);
            t = u.href("http://example.org").query(true);
        });

        it("fragment", () => {
            const u = new URI("http://example.org/foo.html");
            u.fragment("foo");
            assert.equal(u.fragment(), "foo", "fragment: foo");
            assert.equal(u.hash(), "#foo", "fragment: foo - hash");

            u.fragment("#bar");
            assert.equal(u.fragment(), "bar", "fragment: #bar");
            assert.equal(u.hash(), "#bar", "fragment: #bar - hash");

            u.fragment("");
            assert.equal(u.fragment(), "", 'fragment: ""');
            assert.equal(u.hash(), "", 'fragment: "" - hash');
            assert.equal(u.toString(), "http://example.org/foo.html");

            u.hash("foo");
            assert.equal(u.fragment(), "foo", "hash: foo");
            assert.equal(u.hash(), "#foo", "hash: foo - fragment");

            u.hash("#bar");
            assert.equal(u.fragment(), "bar", "hash: #bar");
            assert.equal(u.hash(), "#bar", "hash: #bar - fragment");

            u.hash("");
            assert.equal(u.fragment(), "", 'hash: ""');
            assert.equal(u.hash(), "", 'hash: "" - fragment');
        });
    });

    describe("mutating compounds", () => {
        it("host", () => {
            const u = new URI("http://foo.bar/foo.html");

            u.host("example.org:80");
            assert.equal(u.hostname(), "example.org", "host changed hostname");
            assert.equal(u.port(), "80", "host changed port");
            assert.equal(String(u), "http://example.org:80/foo.html", "host changed url");

            u.host("some-domain.com");
            assert.equal(u.hostname(), "some-domain.com", "host modified hostname");
            assert.equal(u.port(), "", "host removed port");
            assert.equal(`${u}`, "http://some-domain.com/foo.html", "host modified url");

            u.host("some_where.exa_mple.org:44");
            assert.equal(u.hostname(), "some_where.exa_mple.org", "host modified hostname #2");
            assert.equal(u.port(), "44", "port restored");
            assert.equal(String(u), "http://some_where.exa_mple.org:44/foo.html", "host modified url #2");

            assert.throws(() => {
                u.host("foo\\bar.com");
            }, TypeError);
        });
        it("origin", () => {
            const u = new URI("http://foo.bar/foo.html");
            assert.equal(u.origin(), "http://foo.bar", "invalid origin");

            u.origin("http://bar.foo/bar.html");
            assert.equal(u.origin(), "http://bar.foo", "origin didnt change");
            assert.equal(String(u), "http://bar.foo/foo.html", "origin path changed");
        });
        it("authority", () => {
            const u = new URI("http://foo.bar/foo.html");

            u.authority("username:password@example.org:80");
            assert.equal(u.username(), "username", "authority changed username");
            assert.equal(u.password(), "password", "authority changed password");
            assert.equal(u.hostname(), "example.org", "authority changed hostname");
            assert.equal(u.port(), "80", "authority changed port");
            assert.equal(String(u), "http://username:password@example.org:80/foo.html", "authority changed url");

            u.authority("some-domain.com");
            assert.equal(u.username(), "", "authority removed username");
            assert.equal(u.password(), "", "authority removed password");
            assert.equal(u.hostname(), "some-domain.com", "authority modified hostname");
            assert.equal(u.port(), "", "authority removed port");
            assert.equal(String(u), "http://some-domain.com/foo.html", "authority modified url");

            assert.throws(() => {
                u.authority("username:password@foo\\bar.com:80");
            }, TypeError);
        });
        it("userinfo", () => {
            const u = new URI("http://foo.bar/foo.html");

            u.userinfo("username:password");
            assert.equal(u.username(), "username", "userinfo changed username-only");
            assert.equal(u.password(), "password", "userinfo changed password");
            assert.equal(`${u}`, "http://username:password@foo.bar/foo.html", "userinfo changed url");

            u.userinfo("walter");
            assert.equal(u.username(), "walter", "userinfo removed password");
            assert.equal(u.password(), "", "userinfo removed password");
            assert.equal(`${u}`, "http://walter@foo.bar/foo.html", "userinfo changed url");

            u.userinfo("");
            assert.equal(u.username(), "", "userinfo removed username");
            assert.equal(u.password(), "", "userinfo removed password");
            assert.equal(String(u), "http://foo.bar/foo.html", "userinfo changed url");
        });
        it("href", () => {
            const u = new URI("http://foo.bar/foo.html");

            u.href("ftp://u:p@example.org:123/directory/file.suffix?query=string#fragment");
            assert.equal(u.protocol(), "ftp", "href changed protocol");
            assert.equal(u.username(), "u", "href changed username");
            assert.equal(u.password(), "p", "href changed password");
            assert.equal(u.hostname(), "example.org", "href changed hostname");
            assert.equal(u.port(), "123", "href changed port");
            assert.equal(u.pathname(), "/directory/file.suffix", "href changed pathname");
            assert.equal(u.search(), "?query=string", "href changed search");
            assert.equal(u.hash(), "#fragment", "href changed hash");
            assert.equal(u.href(), "ftp://u:p@example.org:123/directory/file.suffix?query=string#fragment", "href removed url");

            u.href("../path/index.html");
            assert.equal(u.protocol(), "", "href removed protocol");
            assert.equal(u.username(), "", "href removed username");
            assert.equal(u.password(), "", "href removed password");
            assert.equal(u.hostname(), "", "href removed hostname");
            assert.equal(u.port(), "", "href removed port");
            assert.equal(u.pathname(), "../path/index.html", "href removed pathname");
            assert.equal(u.search(), "", "href removed search");
            assert.equal(u.hash(), "", "href removed hash");
            assert.equal(u.href(), "../path/index.html", "href removed url");

            /*jshint -W053 */
            u.href(new String("/narf"));
            /*jshint +W053 */
            assert.equal(u.pathname(), "/narf", "href from String instance");
        });
        it("resource", () => {
            const u = new URI("http://foo.bar/foo.html?hello#world");

            assert.equal(u.resource(), "/foo.html?hello#world", "get resource");

            u.resource("/foo.html?hello#world");
            assert.equal(u.href(), "http://foo.bar/foo.html?hello#world", "set resource");

            u.resource("/world.html");
            assert.equal(u.href(), "http://foo.bar/world.html", "set resource path");
            assert.equal(u.resource(), "/world.html", "get resource path");

            u.resource("?query");
            assert.equal(u.href(), "http://foo.bar/?query", "set resource query");
            assert.equal(u.resource(), "/?query", "get resource query");

            u.resource("#fragment");
            assert.equal(u.href(), "http://foo.bar/#fragment", "set resource fragment");
            assert.equal(u.resource(), "/#fragment", "get resource fragment");

            u.resource("?hello#world");
            assert.equal(u.href(), "http://foo.bar/?hello#world", "set resource query+fragment");
            assert.equal(u.resource(), "/?hello#world", "get resource query+fragment");

            u.resource("/mars.txt?planet=123");
            assert.equal(u.href(), "http://foo.bar/mars.txt?planet=123", "set resource path+query");
            assert.equal(u.resource(), "/mars.txt?planet=123", "get resource path+query");

            u.resource("/neptune.txt#foo");
            assert.equal(u.href(), "http://foo.bar/neptune.txt#foo", "set resource path+fragment");
            assert.equal(u.resource(), "/neptune.txt#foo", "get resource path+fragment");
        });
    });

    describe("mutating fractions", () => {
        it("subdomain", () => {
            const u = new URI("http://www.example.org/foo.html");
            u.subdomain("foo.bar");
            assert.equal(u.hostname(), "foo.bar.example.org", "changed subdomain foo.bar");
            assert.equal(String(u), "http://foo.bar.example.org/foo.html", "changed url foo.bar");

            u.subdomain("");
            assert.equal(u.hostname(), "example.org", 'changed subdomain ""');
            assert.equal(String(u), "http://example.org/foo.html", 'changed url ""');

            u.subdomain("foo.");
            assert.equal(u.hostname(), "foo.example.org", "changed subdomain foo.");
            assert.equal(`${u}`, "http://foo.example.org/foo.html", "changed url foo.");

            u.subdomain("foo_bar");
            assert.equal(u.hostname(), "foo_bar.example.org", "changed subdomain foo_bar");
            assert.equal(`${u}`, "http://foo_bar.example.org/foo.html", "changed url foo_bar");
        });
        it("domain", () => {
            const u = new URI("http://www.example.org/foo.html");
            u.domain("foo.bar");
            assert.equal(u.hostname(), "www.foo.bar", "changed hostname foo.bar");
            assert.equal(`${u}`, "http://www.foo.bar/foo.html", "changed url foo.bar");

            assert.throws(() => {
                u.domain("");
            }, TypeError);

            u.hostname("www.example.co.uk");
            assert.equal(u.domain(), "example.co.uk", "domain after changed hostname www.example.co.uk");
            assert.equal(`${u}`, "http://www.example.co.uk/foo.html", "url after changed hostname www.example.co.uk");
            assert.equal(u.domain(true), "co.uk", "domain after changed hostname www.example.co.uk (TLD of SLD)");

            u.domain("example.org");
            assert.equal(u.domain(), "example.org", "domain after changed domain example.org");
            assert.equal(`${u}`, "http://www.example.org/foo.html", "url after changed domain example.org");

            u.domain("example.co.uk");
            assert.equal(u.domain(), "example.co.uk", "domain after changed domain example.co.uk");
            assert.equal(String(u), "http://www.example.co.uk/foo.html", "url after changed domain example.co.uk");

            u.href("http://test/");
            assert.equal(u.domain(), "test", "domain (dot-less)");
            assert.equal(u.subdomain(), "", "subdomain (dot-less)");

            u.subdomain("foo");
            assert.equal(u.href(), "http://foo.test/", "subdomain set on (dot-less)");

            u.subdomain("bar");
            assert.equal(u.href(), "http://bar.foo.test/", "subdomain set on foo.test");

            u.domain("exam_ple.org");
            assert.equal(u.domain(), "exam_ple.org", "domain after changed domain exam_ple.org");
            assert.equal(`${u}`, "http://bar.exam_ple.org/", "url after changed domain exam_ple.org");
        });
        it("tld", () => {
            const u = new URI("http://www.example.org/foo.html");
            u.tld("mine");
            assert.equal(u.tld(), "mine", "tld changed");
            assert.equal(String(u), "http://www.example.mine/foo.html", "changed url mine");

            assert.throws(() => {
                u.tld("");
            }, TypeError);

            assert.throws(() => {
                u.tld("foo.bar");
            }, TypeError);

            u.tld("co.uk");
            assert.equal(u.tld(), "co.uk", "tld changed to sld");
            assert.equal(String(u), "http://www.example.co.uk/foo.html", "changed url to sld");
            assert.equal(u.tld(true), "uk", "TLD of SLD");

            u.tld("org");
            assert.equal(u.tld(), "org", "sld changed to tld");
            assert.equal(`${u}`, "http://www.example.org/foo.html", "changed url to tld");

            u.hostname("www.examplet.se");
            assert.equal(u.tld(), "se", "se tld");

        });
        it("sld", () => {
            let u = new URI("http://www.example.ch/foo.html");
            assert.equal(u.is("sld"), false, "is() www.example.ch");
            assert.equal(u.domain(), "example.ch", "domain() www.example.ch");
            assert.equal(u.subdomain(), "www", "subdomain() www.example.ch");

            u = new URI("http://www.example.com/foo.html");
            assert.equal(u.is("sld"), false, "is() www.example.com");
            assert.equal(u.domain(), "example.com", "domain() www.example.com");
            assert.equal(u.subdomain(), "www", "subdomain() www.example.com");

            u = new URI("http://www.example.eu.com/foo.html");
            assert.equal(u.is("sld"), true, "is() www.example.eu.com");
            assert.equal(u.domain(), "example.eu.com", "domain() www.example.eu.com");
            assert.equal(u.subdomain(), "www", "subdomain() www.example.eu.com");
        });
        it("directory", () => {
            let u = new URI("http://www.example.org/some/directory/foo.html");
            u.directory("/");
            assert.equal(u.path(), "/foo.html", "changed path " / "");
            assert.equal(`${u}`, "http://www.example.org/foo.html", "changed url " / "");

            u.directory("");
            assert.equal(u.path(), "/foo.html", 'changed path ""');
            assert.equal(String(u), "http://www.example.org/foo.html", 'changed url ""');

            u.directory("/bar");
            assert.equal(u.path(), "/bar/foo.html", 'changed path "/bar"');
            assert.equal(`${u}`, "http://www.example.org/bar/foo.html", 'changed url "/bar"');

            u.directory("baz");
            assert.equal(u.path(), "/baz/foo.html", 'changed path "baz"');
            assert.equal(String(u), "http://www.example.org/baz/foo.html", 'changed url "baz"');

            // relative paths
            u = new URI("../some/directory/foo.html");
            u.directory("../other/");
            assert.equal(u.path(), "../other/foo.html", 'changed path "../other/"');
            assert.equal(`${u}`, "../other/foo.html", 'changed url "../other/"');

            u.directory("mine");
            assert.equal(u.path(), "mine/foo.html", 'changed path "mine"');
            assert.equal(String(u), "mine/foo.html", 'changed url "mine"');

            u.directory("/");
            assert.equal(u.path(), "/foo.html", 'changed path "/"');
            assert.equal(`${u}`, "/foo.html", 'changed url "/"');

            u.directory("");
            assert.equal(u.path(), "foo.html", 'changed path ""');
            assert.equal(`${u}`, "foo.html", 'changed url ""');

            u.directory("../blubb");
            assert.equal(u.path(), "../blubb/foo.html", 'changed path "../blubb"');
            assert.equal(`${u}`, "../blubb/foo.html", 'changed url "../blubb"');

            // encoding
            u.path("/some/directory/foo.html");
            u.directory("/~userhome/@mine;is %2F and/");
            assert.equal(u.path(), "/~userhome/@mine;is%20%2F%20and/foo.html", "directory encoding");
            assert.equal(u.directory(true), "/~userhome/@mine;is %2F and", "directory decoded");
        });
        it("filename", () => {
            const u = new URI("http://www.example.org/some/directory/foo.html");
            u.filename("hello.world");
            assert.equal(u.path(), "/some/directory/hello.world", 'changed path "hello.world"');
            assert.equal(`${u}`, "http://www.example.org/some/directory/hello.world", 'changed url "hello.world"');

            u.filename("hello");
            assert.equal(u.path(), "/some/directory/hello", 'changed path "hello"');
            assert.equal(`${u}`, "http://www.example.org/some/directory/hello", 'changed url "hello"');

            u.filename("");
            assert.equal(u.path(), "/some/directory/", 'changed path ""');
            assert.equal(String(u), "http://www.example.org/some/directory/", 'changed url ""');

            u.filename("world");
            assert.equal(u.path(), "/some/directory/world", 'changed path "world"');
            assert.equal(`${u}`, "http://www.example.org/some/directory/world", 'changed url "world"');

            // encoding
            u.path("/some/directory/foo.html");
            u.filename("hällo wörld.html");
            assert.equal(u.path(), "/some/directory/h%C3%A4llo%20w%C3%B6rld.html", "filename encoding");
            assert.equal(u.filename(true), "hällo wörld.html", "filename decoded");
        });
        it("suffix", () => {
            const u = new URI("http://www.example.org/some/directory/foo.html");
            u.suffix("xml");
            assert.equal(u.path(), "/some/directory/foo.xml", 'changed path "xml"');
            assert.equal(String(u), "http://www.example.org/some/directory/foo.xml", 'changed url "xml"');

            u.suffix("");
            assert.equal(u.path(), "/some/directory/foo", 'changed path ""');
            assert.equal(`${u}`, "http://www.example.org/some/directory/foo", 'changed url ""');

            u.suffix("html");
            assert.equal(u.path(), "/some/directory/foo.html", 'changed path "html"');
            assert.equal(String(u), "http://www.example.org/some/directory/foo.html", 'changed url "html"');

            // encoding
            u.suffix("cört");
            assert.equal(u.path(), "/some/directory/foo.c%C3%B6rt", "suffix encoding");
            assert.equal(u.suffix(), "c%C3%B6rt", "suffix encoded"); // suffix is expected to be alnum!
            assert.equal(u.suffix(true), "cört", "suffix decoded"); // suffix is expected to be alnum!
        });
        it("segment", () => {
            let u = new URI("http://www.example.org/some/directory/foo.html");
            const s = u.segment();

            assert.equal(s.join("||"), "some||directory||foo.html", "segment get array");

            u.segment(["hello", "world", "foo.html"]);
            assert.equal(u.path(), "/hello/world/foo.html", "segment set array");

            assert.equal(u.segment(0), "hello", "segment get 0");
            assert.equal(u.segment(2), "foo.html", "segment get 2");
            assert.equal(u.segment(3), undefined, "segment get 3");

            u.segment(0, "goodbye");
            assert.equal(u.path(), "/goodbye/world/foo.html", "segment set 0");
            u.segment(2, "bar.html");
            assert.equal(u.path(), "/goodbye/world/bar.html", "segment set 2");
            u.segment(3, "zupp");
            assert.equal(u.path(), "/goodbye/world/bar.html/zupp", "segment set 3");
            u.segment("zapp");
            assert.equal(u.path(), "/goodbye/world/bar.html/zupp/zapp", "segment append");

            u.segment(3, "");
            assert.equal(u.path(), "/goodbye/world/bar.html/zapp", 'segment del 3 ""');
            u.segment(3, null);
            assert.equal(u.path(), "/goodbye/world/bar.html", "segment del 3 null");

            u = new URI("http://www.example.org/some/directory/foo.html");
            assert.equal(u.segment(-1), "foo.html", "segment get -1");
            u.segment(-1, "world.html");
            assert.equal(u.path(), "/some/directory/world.html", "segment set -1");

            u = new URI("someurn:foo:bar:baz");
            assert.equal(u.segment().join("||"), "foo||bar||baz", "segment get array URN");
            u.segment(1, "mars");
            assert.equal(u.path(), "foo:mars:baz", "segment set 1 URN");
            assert.equal(u.toString(), "someurn:foo:mars:baz", "segment set 1 URN");

            u = new URI("/foo/");
            assert.equal(u.segment().join("||"), "foo||", "segment get array trailing empty");

            u.segment("test");
            assert.equal(u.path(), "/foo/test", "segment append trailing empty");

            u.segment("");
            assert.equal(u.path(), "/foo/test/", "segment append empty trailing");
            u.segment("");
            assert.equal(u.path(), "/foo/test/", "segment append empty trailing unchanged");

            u.segment(["", "", "foo", "", "", "bar", "", ""]);
            assert.equal(u.path(), "/foo/bar/", "segment collapsing empty parts");

            u = new URI("https://google.com");
            u.segment("//font.ttf//");
            assert.equal(u.path(), "/font.ttf", "segment removes trailing and leading slashes");

            u.segment(["/hello", "/world/", "//foo.html"]);
            assert.equal(u.path(), "/hello/world/foo.html", "segment set array trimming slashes");

            u.segment(1, "/mars/");
            assert.equal(u.path(), "/hello/mars/foo.html", "segment set index trimming slashes");
        });
        it("segmentCoded", () => {
            const u = new URI("http://www.example.org/some%20thing/directory/foo.html");
            const s = u.segmentCoded();

            assert.equal(s.join("||"), "some thing||directory||foo.html", "segmentCoded get array");

            u.segmentCoded(["hello/world"]);
            assert.equal(u.path(), "/hello%2Fworld", "escape in array");

            u.segmentCoded("hello/world");
            assert.equal(u.path(), "/hello%2Fworld/hello%2Fworld", "escape appended value");

            u.segmentCoded(["hello world", "mars", "foo.html"]);
            assert.equal(u.path(), "/hello%20world/mars/foo.html", "segmentCoded set array");

            assert.equal(u.segmentCoded(0), "hello world", "segmentCoded get 0");
            assert.equal(u.segmentCoded(2), "foo.html", "segmentCoded get 2");
            assert.equal(u.segmentCoded(3), undefined, "segmentCoded get 3");

            u.segmentCoded("zapp zerapp");
            assert.equal(u.path(), "/hello%20world/mars/foo.html/zapp%20zerapp", "segmentCoded append");

            u.segmentCoded(2, "");
            assert.equal(u.path(), "/hello%20world/mars/zapp%20zerapp", 'segmentCoded del 3 ""');
            u.segmentCoded(2, null);
            assert.equal(u.path(), "/hello%20world/mars", "segmentCoded del 3 null");

            u.segmentCoded("");
            assert.equal(u.path(), "/hello%20world/mars/", "segmentCoded append empty trailing");
            u.segmentCoded("");
            assert.equal(u.path(), "/hello%20world/mars/", "segmentCoded append empty trailing unchanged");
        });
    });

    describe("mutating query strings", () => {
        it("mutating object", () => {
            const u = new URI("?foo=bar&baz=bam&baz=bau");
            const q = u.query(true);

            q.something = ["new", "and", "funky"];
            u.query(q);
            assert.equal(u.query(), "foo=bar&baz=bam&baz=bau&something=new&something=and&something=funky", "adding array");

            q.foo = undefined;
            u.query(q);
            assert.equal(u.query(), "baz=bam&baz=bau&something=new&something=and&something=funky", "removing field");

            q.baz = undefined;
            u.query(q);
            assert.equal(u.query(), "something=new&something=and&something=funky", "removing array");
        });
        it("query callback", () => {
            const u = new URI("?foo=bar");
            u.query((data) => {
                data.foo = "bam";
            });
            assert.equal(u.query(), "foo=bam", "augment argument");

            u.query(() => {
                return {
                    bla: "blubb"
                };
            });
            assert.equal(u.query(), "bla=blubb", "overwrite returned value");
        });
        it("setQuery", () => {
            const u = new URI("?foo=bar");
            u.setQuery("foo", "bam");
            assert.equal(u.query(), "foo=bam", "set name, value");

            u.setQuery("array", ["one", "two"]);
            assert.equal(u.query(), "foo=bam&array=one&array=two", "set name, array");

            u.query("?foo=bar");
            u.setQuery({ obj: "bam", foo: "baz" });
            assert.equal(u.query(), "foo=baz&obj=bam", "set {name: value}");

            u.setQuery({ foo: "foo", bar: ["1", "2"] });
            assert.equal(u.query(), "foo=foo&obj=bam&bar=1&bar=2", "set {name: array}");

            u.query("?foo=bar");
            u.setQuery({ bam: null, baz: "" });
            assert.equal(u.query(), "foo=bar&bam&baz=", "set {name: null}");

            u.query("?foo=bar");
            u.setQuery("empty");
            assert.equal(u.query(), "foo=bar&empty", "set undefined");

            u.query("?foo=bar");
            u.setQuery("empty", "");
            assert.equal(u.query(), "foo=bar&empty=", "set empty string");

            u.query("");
            u.setQuery("some value", "must be encoded because of = and ? and #");
            assert.equal(u.query(), "some+value=must+be+encoded+because+of+%3D+and+%3F+and+%23", "encoding");
            assert.equal(u.query(true)["some value"], "must be encoded because of = and ? and #", "decoding");
        });
        it("addQuery", () => {
            const u = new URI("?foo=bar");
            u.addQuery("baz", "bam");
            assert.equal(u.query(), "foo=bar&baz=bam", "add name, value");

            u.addQuery("array", ["one", "two"]);
            assert.equal(u.query(), "foo=bar&baz=bam&array=one&array=two", "add name, array");

            u.query("?foo=bar");
            u.addQuery({ obj: "bam", foo: "baz" });
            assert.equal(u.query(), "foo=bar&foo=baz&obj=bam", "add {name: value}");

            u.addQuery({ foo: "bam", bar: ["1", "2"] });
            assert.equal(u.query(), "foo=bar&foo=baz&foo=bam&obj=bam&bar=1&bar=2", "add {name: array}");

            u.query("?foo=bar");
            u.addQuery({ bam: null, baz: "" });
            assert.equal(u.query(), "foo=bar&bam&baz=", "add {name: null}");

            u.query("?foo=bar");
            u.addQuery("empty");
            assert.equal(u.query(), "foo=bar&empty", "add undefined");

            u.query("?foo=bar");
            u.addQuery("empty", "");
            assert.equal(u.query(), "foo=bar&empty=", "add empty string");

            u.query("?foo");
            u.addQuery("foo", "bar");
            assert.equal(u.query(), "foo=bar", "add to null value");

            u.query("");
            u.addQuery("some value", "must be encoded because of = and ? and #");
            assert.equal(u.query(), "some+value=must+be+encoded+because+of+%3D+and+%3F+and+%23", "encoding");
            assert.equal(u.query(true)["some value"], "must be encoded because of = and ? and #", "decoding");
        });
        it("removeQuery", () => {
            const u = new URI("?foo=bar&foo=baz&foo=bam&obj=bam&bar=1&bar=2&bar=3");

            u.removeQuery("foo", "bar");
            assert.equal(u.query(), "foo=baz&foo=bam&obj=bam&bar=1&bar=2&bar=3", "removing name, value");

            u.removeQuery("foo");
            assert.equal(u.query(), "obj=bam&bar=1&bar=2&bar=3", "removing name");

            u.removeQuery("bar", ["1", "3"]);
            assert.equal(u.query(), "obj=bam&bar=2", "removing name, array");

            u.query("?obj=bam&bar=1&bar=2");
            u.removeQuery("bar", ["2"]);
            assert.equal(u.query(), "obj=bam&bar=1", "removing name, singleton array");

            u.removeQuery("bar", ["1"]);
            assert.equal(u.query(), "obj=bam", "removing the last value via name, singleton array");

            u.query("?foo=one&foo=two").removeQuery("foo", ["one", "two"]);
            assert.equal(u.query(), "", "removing name, array, finishes empty");

            u.query("?foo=one,two").removeQuery("foo", ["one", "two"]);
            assert.equal(u.query(), "foo=one%2Ctwo", "not removing name, array");

            u.query("?foo=one,two").removeQuery("foo", ["one,two"]);
            assert.equal(u.query(), "", "removing name, singleton array with comma in value");

            u.query("?foo=bar&foo=baz&foo=bam&obj=bam&bar=1&bar=2&bar=3");
            u.removeQuery(["foo", "bar"]);
            assert.equal(u.query(), "obj=bam", "removing array");

            u.query("?bar=1&bar=2");
            u.removeQuery({ bar: 1 });
            assert.equal(u.query(), "bar=2", "removing non-string value from array");

            u.removeQuery({ bar: 2 });
            assert.equal(u.query(), "", "removing a non-string value");

            u.query("?foo=bar&foo=baz&foo=bam&obj=bam&bar=1&bar=2&bar=3");
            u.removeQuery({ foo: "bar", obj: undefined, bar: ["1", "2"] });
            assert.equal(u.query(), "foo=baz&foo=bam&bar=3", "removing object");

            u.query("?foo=bar&foo=baz&foo=bam&obj=bam&bar=1&bar=2&bar=3");
            u.removeQuery(/^bar/);
            assert.equal(u.query(), "foo=bar&foo=baz&foo=bam&obj=bam", "removing by RegExp");

            u.query("?foo=bar&foo=baz&foo=bam&obj=bam&bar=bar&bar=baz&bar=bam");
            u.removeQuery("foo", /[rz]$/);
            assert.equal(u.query(), "foo=bam&obj=bam&bar=bar&bar=baz&bar=bam", "removing by value RegExp");
        });
        it("duplicateQueryParameters", () => {
            let u = new URI("?bar=1&bar=1&bar=1");

            u.normalizeQuery();
            assert.equal(u.toString(), "?bar=1", "parameters de-duplicated");

            u = new URI("?bar=1&bar=1&bar=1");
            u.duplicateQueryParameters(true);
            assert.isOk(u._parts.duplicateQueryParameters, "duplicateQueryParameters enabled");
            u.normalizeQuery();
            assert.equal(u.toString(), "?bar=1&bar=1&bar=1", "parameters NOT de-duplicated");
            assert.isOk(u._parts.duplicateQueryParameters, "duplicateQueryParameters still enabled after normalizeQuery()");

            u.duplicateQueryParameters(false);
            u.normalizeQuery();
            assert.equal(u.toString(), "?bar=1", "parameters de-duplicated again");
            assert.isOk(!u._parts.duplicateQueryParameters, "duplicateQueryParameters still disabled after normalizeQuery()");

            URI.duplicateQueryParameters = true;
            u = new URI("?bar=1&bar=1&bar=1");
            u.normalizeQuery();
            assert.equal(u.toString(), "?bar=1&bar=1&bar=1", "global configuration");

            URI.duplicateQueryParameters = false;

            // test cloning
            u = new URI("?bar=1&bar=1&bar=1");
            u = u.duplicateQueryParameters(true).clone();
            assert.isOk(u._parts.duplicateQueryParameters, "duplicateQueryParameters still enabled after clone()");
            u.normalizeQuery();
            assert.equal(u.toString(), "?bar=1&bar=1&bar=1", "parameters NOT de-duplicated");

            // test adding
            u = new URI("?bar=1&bar=1&bar=1");
            u.duplicateQueryParameters(true);
            u.addQuery("bar", 1);
            assert.equal(u.toString(), "?bar=1&bar=1&bar=1&bar=1", "parameters NOT de-duplicated after addQuery()");
        });
        it("escapeQuerySpace", () => {
            let u = new URI("?bar=foo+bar&bam+baz=foo");
            let data = u.query(true);

            assert.equal(data.bar, "foo bar", "value un-spac-escaped");
            assert.equal(data["bam baz"], "foo", "name un-spac-escaped");

            u.escapeQuerySpace(false);
            data = u.query(true);
            assert.equal(data.bar, "foo+bar", "value not un-spac-escaped");
            assert.equal(data["bam+baz"], "foo", "name not un-spac-escaped");

            u.escapeQuerySpace(true);
            data = u.query(true);

            assert.equal(data.bar, "foo bar", "value un-spac-escaped again");
            assert.equal(data["bam baz"], "foo", "name un-spac-escaped again");

            u.escapeQuerySpace(false);

            u.addQuery("alpha bravo", "charlie delta");
            assert.equal(u.toString(), "?bar=foo%2Bbar&bam%2Bbaz=foo&alpha%20bravo=charlie%20delta", "serialized un/escaped space");

            URI.escapeQuerySpace = false;
            u = new URI("?bar=foo+bar&bam+baz=foo");
            data = u.query(true);
            assert.equal(data.bar, "foo+bar", "value not un-spac-escaped by default");
            assert.equal(data["bam+baz"], "foo", "name not un-spac-escaped by default");

            // reset
            URI.escapeQuerySpace = true;
        });
        it("hasQuery", () => {
            const u = new URI("?string=bar&list=one&list=two&number=123&null&empty=&nested[one]=1&nested[two]=2");

            // exists
            assert.equal(u.hasQuery("string"), true, "simple exists check - passing");
            assert.equal(u.hasQuery("nono"), false, "simple exists check - failing");

            // truthy value
            assert.equal(u.hasQuery("string", true), true, "has truthy value check - passing string");
            assert.equal(u.hasQuery("number", true), true, "has truthy value check - passing number");
            assert.equal(u.hasQuery("list", true), true, "has truthy value check - passing list");
            assert.equal(u.hasQuery("empty", true), false, "has truthy value check - failing empty");
            assert.equal(u.hasQuery("null", true), false, "has truthy value check - failing null");

            // falsy value
            assert.equal(u.hasQuery("string", false), false, "has falsy value check - failing string");
            assert.equal(u.hasQuery("number", false), false, "has falsy value check - failing number");
            assert.equal(u.hasQuery("list", false), false, "has falsy value check - failing list");
            assert.equal(u.hasQuery("empty", false), true, "has falsy value check - passing empty");
            assert.equal(u.hasQuery("null", false), true, "has falsy value check - passing null");

            // match value
            assert.equal(u.hasQuery("string", "bar"), true, "value check - passing string");
            assert.equal(u.hasQuery("number", 123), true, "value check - passing number");
            assert.equal(u.hasQuery("number", "123"), true, "value check - passing number as string");
            assert.equal(u.hasQuery("list", "one"), false, "value check - failing list");
            assert.equal(u.hasQuery("empty", ""), true, "value check - passing empty");
            assert.equal(u.hasQuery("null", ""), false, "value check - failing null");

            // matching RegExp
            assert.equal(u.hasQuery("string", /ar$/), true, "RegExp check - passing string");
            assert.equal(u.hasQuery("number", /2/), true, "RegExp check - passing number");
            assert.equal(u.hasQuery("string", /nono/), false, "RegExp check - failing string");
            assert.equal(u.hasQuery("number", /999/), false, "RegExp check - failing number");
            assert.equal(u.hasQuery(/^nested/), true, "RegExp name check - passing");
            assert.equal(u.hasQuery(/^nested/, 2), true, "RegExp name and value - passing number");
            assert.equal(u.hasQuery(/^nested/, "2"), true, "RegExp name and value - passing number as string");
            assert.equal(u.hasQuery(/^nested/, "nono"), false, "RegExp name and value - failing string");
            assert.equal(u.hasQuery(/^nested/, /2/), true, "RegExp name and value - passing RegExp number");
            assert.equal(u.hasQuery(/^nested/, /3/), false, "RegExp name and value exists check - failing");
            assert.equal(u.hasQuery(/^lis/, ["one"]), false, "RegExp name andarray check - failing incomplete list");
            assert.equal(u.hasQuery(/^lis/, ["one", "two"]), true, "RegExp name and array check - passing list");

            // matching array
            assert.equal(u.hasQuery("string", ["one"]), false, "array check - failing string");
            assert.equal(u.hasQuery("list", ["one"]), false, "array check - failing incomplete list");
            assert.equal(u.hasQuery("list", ["one", "two"]), true, "array check - passing list");
            assert.equal(u.hasQuery("list", ["two", "one"]), true, "array check - passing unsorted list");

            // matching part of array
            assert.equal(u.hasQuery("string", ["one"], true), false, "in array check - failing string");
            assert.equal(u.hasQuery("list", "one", true), true, "in array check - passing value");
            assert.equal(u.hasQuery("list", ["one"], true), true, "in array check - passing incomplete list");
            assert.equal(u.hasQuery("list", ["one", "two"], true), true, "in array check - passing list");
            assert.equal(u.hasQuery("list", ["two", "one"], true), true, "in array check - passing unsorted list");
            assert.equal(u.hasQuery("list", /ne$/, true), true, "in array check - passing RegExp");
            assert.equal(u.hasQuery("list", [/ne$/], true), true, "in array check - passing RegExp list");

            // comparison function
            assert.equal(u.hasQuery("string", (value, name, data) => {
                assert.equal(value, "bar", "Function check - param value");
                assert.equal(name, "string", "Function check - param name");
                assert.equal(typeof data, "object", "Function check - param data");
                return true;
            }), true, "Function check - passing true");
            assert.equal(u.hasQuery("string", () => {
                return false;
            }), false, "Function check - passing false");
        });
    });

    describe("normalizing", () => {
        it("normalize", () => {
            const u = new URI("http://www.exämple.org:80/food/woo/.././../baz.html?&foo=bar&&baz=bam&&baz=bau&#");
            u.normalize();
            assert.equal(`${u}`, "http://www.xn--exmple-cua.org/baz.html?foo=bar&baz=bam&baz=bau", "fully normalized URL");
        });
        it("normalizeProtocol", () => {
            const u = new URI("hTTp://example.org/foobar.html");
            u.normalizeProtocol();
            assert.equal(String(u), "http://example.org/foobar.html", "lowercase http");
        });
        it("normalizeHost", () => {
            let u;

            u = new URI("http://exämple.org/foobar.html");
            u.normalizeHostname();
            assert.equal(`${u}`, "http://xn--exmple-cua.org/foobar.html", "converting IDN to punycode");

            u = new URI("http://[fe80:0000:0000:0000:0204:61ff:fe9d:f156]/foobar.html");
            u.normalizeHostname();
            assert.equal(`${u}`, "http://[fe80::204:61ff:fe9d:f156]/foobar.html", "best IPv6 representation");

            u = new URI("http://[::1]/foobar.html");
            u.normalizeHostname();
            assert.equal(`${u}`, "http://[::1]/foobar.html", "best IPv6 representation");

            u = new URI("http://wWw.eXamplE.Org/foobar.html");
            u.normalizeHostname();
            assert.equal(String(u), "http://www.example.org/foobar.html", "lower case hostname");
        });
        it("normalizePort", () => {
            let u = new URI("http://example.org:80/foobar.html");
            u.normalizePort();
            assert.equal(String(u), "http://example.org/foobar.html", "dropping port 80 for http");

            u = new URI("ftp://example.org:80/foobar.html");
            u.normalizePort();
            assert.equal(`${u}`, "ftp://example.org:80/foobar.html", "keeping port 80 for ftp");

        });
        it("normalizePath", () => {
            // relative URL
            let u = new URI("/food/bar/baz.html");

            u.normalizePath();
            assert.equal(u.path(), "/food/bar/baz.html", "absolute path without change");

            u.path("food/bar/baz.html").normalizePath();
            assert.equal(u.path(), "food/bar/baz.html", "relative path without change");

            u.path("/food/../bar/baz.html").normalizePath();
            assert.equal(u.path(), "/bar/baz.html", "single parent");

            u.path("/food/woo/../../bar/baz.html").normalizePath();
            assert.equal(u.path(), "/bar/baz.html", "double parent");

            u.path("/food/woo/../bar/../baz.html").normalizePath();
            assert.equal(u.path(), "/food/baz.html", "split double parent");

            u.path("/food/woo/.././../baz.html").normalizePath();
            assert.equal(u.path(), "/baz.html", "cwd-split double parent");

            u.path("food/woo/../bar/baz.html").normalizePath();
            assert.equal(u.path(), "food/bar/baz.html", "relative parent");

            u.path("./food/woo/../bar/baz.html").normalizePath();
            assert.equal(u.path(), "food/bar/baz.html", "dot-relative parent");

            // absolute URL
            u = new URI("http://example.org/foo/bar/baz.html");
            u.normalizePath();
            assert.equal(u.path(), "/foo/bar/baz.html", "URL: absolute path without change");

            u.path("foo/bar/baz.html").normalizePath();
            assert.equal(u.path(), "/foo/bar/baz.html", "URL: relative path without change");

            u.path("/foo/../bar/baz.html").normalizePath();
            assert.equal(u.path(), "/bar/baz.html", "URL: single parent");

            u.path("/foo/woo/../../bar/baz.html").normalizePath();
            assert.equal(u.path(), "/bar/baz.html", "URL: double parent");

            u.path("/foo/woo/../bar/../baz.html").normalizePath();
            assert.equal(u.path(), "/foo/baz.html", "URL: split double parent");

            u.path("/foo/woo/.././../baz.html").normalizePath();
            assert.equal(u.path(), "/baz.html", "URL: cwd-split double parent");

            u.path("foo/woo/../bar/baz.html").normalizePath();
            assert.equal(u.path(), "/foo/bar/baz.html", "URL: relative parent");

            u.path("./foo/woo/../bar/baz.html").normalizePath();
            assert.equal(u.path(), "/foo/bar/baz.html", "URL: dot-relative parent");

            u.path("/.//").normalizePath();
            assert.equal(u.path(), "/", "root /.//");

            // encoding
            u._parts.path = "/~userhome/@mine;is %2F and/";
            u.normalize();
            assert.equal(u.pathname(), "/~userhome/@mine;is%20%2F%20and/", "path encoding");

            // relative URL
            u = new URI("/.").normalizePath();
            assert.equal(u.path(), "/", "root /.");

            u = new URI("/..").normalizePath();
            assert.equal(u.path(), "/", "root /..");

            u = new URI("/foo/.").normalizePath();
            assert.equal(u.path(), "/foo/", "root /foo/.");

            u = new URI("/foo/..").normalizePath();
            assert.equal(u.path(), "/", "root /foo/..");

            u = new URI("/foo/.bar").normalizePath();
            assert.equal(u.path(), "/foo/.bar", "root /foo/.bar");

            u = new URI("/foo/..bar").normalizePath();
            assert.equal(u.path(), "/foo/..bar", "root /foo/..bar");

            // Percent Encoding normalization has to happen before dot segment normalization
            u = new URI("/foo/%2E%2E").normalizePath();
            assert.equal(u.path(), "/", "root /foo/%2E%2E");

            u = new URI("/foo/%2E").normalizePath();
            assert.equal(u.path(), "/foo/", "root /foo/%2E");

            u = new URI("/foo/%2E%2E%2Fbar").normalizePath();
            assert.equal(u.path(), "/foo/..%2Fbar", "root /foo/%2E%2E%2Fbar");

            u = new URI("../../../../../www/common/js/app/../../../../www_test/common/js/app/views/view-test.html");
            u.normalize();
            assert.equal(u.path(), "../../../../../www_test/common/js/app/views/view-test.html", "parent relative");

            u = new URI("/../../../../../www/common/js/app/../../../../www_test/common/js/app/views/view-test.html");
            u.normalize();
            assert.equal(u.path(), "/www_test/common/js/app/views/view-test.html", "parent absolute");

            // URNs
            u = new URI("urn:people:authors:poets:Shel Silverstein");
            u.normalize();
            assert.equal(u.path(), "people:authors:poets:Shel%20Silverstein");

            u = new URI("urn:people:authors:philosophers:Søren Kierkegaard");
            u.normalize();
            assert.equal(u.path(), "people:authors:philosophers:S%C3%B8ren%20Kierkegaard");

            // URNs path separator preserved
            u = new URI("urn:games:cards:Magic%3A the Gathering");
            u.normalize();
            assert.equal(u.path(), "games:cards:Magic%3A%20the%20Gathering");
        });
        it("normalizeQuery", () => {
            const u = new URI("http://example.org/foobar.html?");
            u.normalizeQuery();
            assert.equal(`${u}`, "http://example.org/foobar.html", "dropping empty query sign");

            u.query("?&foo=bar&&baz=bam&").normalizeQuery();
            assert.equal(u.query(), "foo=bar&baz=bam", "bad query resolution");

            u.query("?&foo=bar&&baz=bam&&baz=bau&").normalizeQuery();
            assert.equal(u.query(), "foo=bar&baz=bam&baz=bau", "bad query resolution");

            u.query("?&foo=bar&foo=bar").normalizeQuery();
            assert.equal(u.query(), "foo=bar", "duplicate key=value resolution");
        });
        it("normalizeFragment", () => {
            const u = new URI("http://example.org/foobar.html#");
            u.normalizeFragment();
            assert.equal(`${u}`, "http://example.org/foobar.html", "dropping empty fragment sign");
        });
        it("readable", () => {
            const u = new URI("http://foo:bar@www.xn--exmple-cua.org/hello%20world/ä.html?foo%5B%5D=b+är#fragment");
            assert.equal(u.readable(), "http://www.exämple.org/hello world/ä.html?foo[]=b är#fragment", "readable URL");
        });
    });

    describe("resolving URLs", () => {
        it("absoluteTo", () => {
            // this being '../bar/baz.html?foo=bar'
            // base being 'http://example.org/foo/other/file.html'
            // return being http://example.org/foo/bar/baz.html?foo=bar'
            const tests = [{
                name: "relative resolve",
                url: "relative/path?blubber=1#hash1",
                base: "http://www.example.org/path/to/file?some=query#hash",
                result: "http://www.example.org/path/to/relative/path?blubber=1#hash1"
            }, {
                name: "absolute resolve",
                url: "/absolute/path?blubber=1#hash1",
                base: "http://www.example.org/path/to/file?some=query#hash",
                result: "http://www.example.org/absolute/path?blubber=1#hash1"
            }, {
                name: "relative resolve full URL",
                url: "relative/path?blubber=1#hash3",
                base: "http://user:pass@www.example.org:1234/path/to/file?some=query#hash",
                result: "http://user:pass@www.example.org:1234/path/to/relative/path?blubber=1#hash3"
            }, {
                name: "absolute resolve full URL",
                url: "/absolute/path?blubber=1#hash3",
                base: "http://user:pass@www.example.org:1234/path/to/file?some=query#hash",
                result: "http://user:pass@www.example.org:1234/absolute/path?blubber=1#hash3"
            }, {
                name: "absolute resolve full URL without scheme",
                url: "//user:pass@www.example.org:1234/path/to/file?some=query#hash",
                base: "proto://user:pass@www.example.org:1234/path/to/file?some=query#hash",
                result: "proto://user:pass@www.example.org:1234/path/to/file?some=query#hash"
            }, {
                name: "path-relative resolve",
                url: "./relative/path?blubber=1#hash3",
                base: "http://user:pass@www.example.org:1234/path/to/file?some=query#hash",
                result: "http://user:pass@www.example.org:1234/path/to/relative/path?blubber=1#hash3"
            }, {
                name: "path-relative parent resolve",
                url: "../relative/path?blubber=1#hash3",
                base: "http://user:pass@www.example.org:1234/path/to/file?some=query#hash",
                result: "http://user:pass@www.example.org:1234/path/relative/path?blubber=1#hash3"
            }, {
                name: "path-relative path resolve",
                url: "./relative/path?blubber=1#hash3",
                base: "/path/to/file?some=query#hash",
                result: "/path/to/relative/path?blubber=1#hash3"
            }, {
                name: "path-relative path resolve 2",
                url: "tofile",
                base: "/path/to/file",
                result: "/path/to/tofile"
            }, {
                name: "path-relative path-root resolve",
                url: "tofile",
                base: "/file",
                result: "/tofile"
            }, {
                name: "path-relative parent path resolve",
                url: "../relative/path?blubber=1#hash3",
                base: "/path/to/file?some=query#hash",
                result: "/path/relative/path?blubber=1#hash3"
            }, {
                name: "fragment absolute url",
                url: "#hash3",
                base: "/path/to/file?some=query#hash",
                result: "/path/to/file?some=query#hash3"
            }, {
                name: "fragment relative url",
                url: "#hash3",
                base: "path/to/file",
                result: "path/to/file#hash3"
            }, {
                name: "relative path - urljoin",
                url: "the_relative_url",
                base: "rel/path/",
                result: "rel/path/the_relative_url"
            }, {
                name: "relative path file - urljoin",
                url: "the_relative_url",
                base: "rel/path/something",
                result: "rel/path/the_relative_url"
            }, {
                name: "relative parent path file - urljoin",
                url: "../the_relative_url",
                base: "rel/path/",
                result: "rel/the_relative_url"
            }, {
                name: "relative root path file - urljoin",
                url: "/the_relative_url",
                base: "rel/path/",
                result: "/the_relative_url"
            }, {
                name: "relative root file - urljoin",
                url: "/the_relative_url",
                base: "http://example.com/rel/path/",
                result: "http://example.com/the_relative_url"
            }, {
                name: "absolute passthru - urljoin",
                url: "http://github.com//the_relative_url",
                base: "http://example.com/foo/bar",
                result: "http://github.com//the_relative_url"
            }, {
                name: "absolute passthru - file:/// - urljoin (#328)",
                url: "file:///C:/skyclan/snipkit",
                base: "http://example.com/foo/bar",
                result: "file:///C:/skyclan/snipkit"
            }, {
                name: "file paths - urljoin",
                url: "anotherFile",
                base: "aFile",
                result: "anotherFile"
            }
            ];

            for (var i = 0, t; (t = tests[i]); i++) {
                let u = new URI(t.url),
                    r = u.absoluteTo(t.base);

                assert.equal(`${r}`, t.result, t.name);
            }
        });
        it("absoluteTo - RFC3986 reference resolution", () => {
            // http://tools.ietf.org/html/rfc3986#section-5.4
            const base = "http://a/b/c/d;p?q";
            const map = {
                // normal
                // 'g:h'       :  'g:h', // identified as URN
                g: "http://a/b/c/g",
                "./g": "http://a/b/c/g",
                "g/": "http://a/b/c/g/",
                "/g": "http://a/g",
                "//g": "http://g/", // added trailing /
                "?y": "http://a/b/c/d;p?y",
                "g?y": "http://a/b/c/g?y",
                "#s": "http://a/b/c/d;p?q#s",
                "g#s": "http://a/b/c/g#s",
                "g?y#s": "http://a/b/c/g?y#s",
                ";x": "http://a/b/c/;x",
                "g;x": "http://a/b/c/g;x",
                "g;x?y#s": "http://a/b/c/g;x?y#s",
                "": "http://a/b/c/d;p?q",
                ".": "http://a/b/c/",
                "./": "http://a/b/c/",
                "..": "http://a/b/",
                "../": "http://a/b/",
                "../g": "http://a/b/g",
                "../..": "http://a/",
                "../../": "http://a/",
                "../../g": "http://a/g",
                // abnormal
                "../../../g": "http://a/g",
                "../../../../g": "http://a/g"
            };

            for (const key in map) {
                let u = new URI(key),
                    r = u.absoluteTo(base);

                assert.equal(String(r), map[key], `resolution "${key}"`);
            }
        });
        it("relativeTo", () => {
            const tests = [{
                name: "same parent",
                url: "/relative/path?blubber=1#hash1",
                base: "/relative/file?some=query#hash",
                result: "path?blubber=1#hash1"
            }, {
                name: "direct parent",
                url: "/relative/path?blubber=1#hash1",
                base: "/relative/sub/file?some=query#hash",
                result: "../path?blubber=1#hash1"
            }, {
                name: "second parent",
                url: "/relative/path?blubber=1#hash1",
                base: "/relative/sub/sub/file?some=query#hash",
                result: "../../path?blubber=1#hash1"
            }, {
                name: "third parent",
                url: "/relative/path?blubber=1#hash1",
                base: "/relative/sub/foo/sub/file?some=query#hash",
                result: "../../../path?blubber=1#hash1"
            }, {
                name: "parent top level",
                url: "/relative/path?blubber=1#hash1",
                base: "/path/to/file?some=query#hash",
                result: "../../relative/path?blubber=1#hash1"
            }, {
                name: "descendant",
                url: "/base/path/with/subdir/inner.html",
                base: "/base/path/top.html",
                result: "with/subdir/inner.html"
            }, {
                name: "same directory",
                url: "/path/",
                base: "/path/top.html",
                result: "./"
            }, {
                name: "absolute /",
                url: "http://example.org/foo/bar/bat",
                base: "http://example.org/",
                result: "foo/bar/bat"
            }, {
                name: "absolute /foo",
                url: "http://example.org/foo/bar/bat",
                base: "http://example.org/foo",
                result: "foo/bar/bat"
            }, {
                name: "absolute /foo/",
                url: "http://example.org/foo/bar/bat",
                base: "http://example.org/foo/",
                result: "bar/bat"
            }, {
                name: "same scheme",
                url: "http://example.org/foo/bar/bat",
                base: "http://example.com/foo/",
                result: "//example.org/foo/bar/bat"
            }, {
                name: "different scheme",
                url: "http://example.org/foo/bar",
                base: "https://example.org/foo/",
                result: "http://example.org/foo/bar"
            }, {
                name: "base with no scheme or host",
                url: "http://example.org/foo/bar",
                base: "/foo/",
                result: "http://example.org/foo/bar"
            }, {
                name: "base with no scheme",
                url: "http://example.org/foo/bar",
                base: "//example.org/foo/bar",
                result: "http://example.org/foo/bar"
            }, {
                name: "denormalized base",
                url: "/foo/bar/bat",
                base: "/foo/./bar/",
                result: "bat"
            }, {
                name: "denormalized url",
                url: "/foo//bar/bat",
                base: "/foo/bar/",
                result: "bat"
            }, {
                name: "credentials",
                url: "http://user:pass@example.org/foo/bar",
                base: "http://example.org/foo/",
                result: "//user:pass@example.org/foo/bar"
            }, {
                name: "base credentials",
                url: "http://example.org/foo/bar",
                base: "http://user:pass@example.org/foo/bar",
                result: "//example.org/foo/bar"
            }, {
                name: "same credentials different host",
                url: "http://user:pass@example.org/foo/bar",
                base: "http://user:pass@example.com/foo/bar",
                result: "//user:pass@example.org/foo/bar"
            }, {
                name: "different port 1",
                url: "http://example.org/foo/bar",
                base: "http://example.org:8080/foo/bar",
                result: "//example.org/foo/bar"
            }, {
                name: "different port 2",
                url: "http://example.org:8081/foo/bar",
                base: "http://example.org:8080/foo/bar",
                result: "//example.org:8081/foo/bar"
            }, {
                name: "different port 3",
                url: "http://example.org:8081/foo/bar",
                base: "http://example.org/foo/bar",
                result: "//example.org:8081/foo/bar"
            }, {
                name: "same path - fragment",
                url: "http://www.example.com:8080/dir/file#abcd",
                base: "http://www.example.com:8080/dir/file",
                result: "#abcd"
            }, {
                name: "same path - query",
                url: "http://www.example.com:8080/dir/file?abcd=123",
                base: "http://www.example.com:8080/dir/file",
                result: "?abcd=123"
            }, {
                name: "same path - query and fragment",
                url: "http://www.example.com:8080/dir/file?abcd=123#alpha",
                base: "http://www.example.com:8080/dir/file",
                result: "?abcd=123#alpha"
            }, {
                name: "already relative",
                url: "foo/bar",
                base: "/foo/",
                throws: true
            }, {
                name: "relative base",
                url: "/foo/bar",
                base: "foo/",
                throws: true
            }
            ];

            for (let i = 0, t; (t = tests[i]); i++) {
                const u = new URI(t.url);
                const b = new URI(t.base);
                let caught = false;
                let r;

                try {
                    r = u.relativeTo(b);
                } catch (e) {
                    caught = true;
                }

                if (t.throws) {
                    /*jshint sub:false */
                    assert.isOk(caught, `${t.name} should throw exception`);
                } else {
                    assert.isOk(!caught, `${t.name} should not throw exception`);
                    assert.equal(String(r), t.result, t.name);

                    const a = r.absoluteTo(t.base);
                    const n = u.clone().normalize();
                    assert.equal(a.toString(), n.toString(), `${t.name} reversed`);
                }
            }

            assert.equal("b/c",
                new URI("http://example.org/a/b/c")
                    .scheme("")
                    .authority("")
                    .relativeTo("/a/")
                    .toString(),
                "bug #103");

            assert.equal("b/c",
                new URI("//example.org/a/b/c")
                    .authority("")
                    .relativeTo("/a/")
                    .toString(),
                "bug #103 (2)");
        });
    });

    describe("static helpers", () => {
        it("withinString", () => {
            /*jshint laxbreak: true */
            const source = "Hello www.example.com,\n"
                + "http://google.com is a search engine, like http://www.bing.com\n"
                + "http://exämple.org/foo.html?baz=la#bumm is an IDN URL,\n"
                + "http://123.123.123.123/foo.html is IPv4 and http://fe80:0000:0000:0000:0204:61ff:fe9d:f156/foobar.html is IPv6.\n"
                + "links can also be in parens (http://example.org) or quotes »http://example.org«, "
                + "yet https://example.com/with_(balanced_parentheses) and https://example.com/with_(balanced_parentheses).txt contain the closing parens, but "
                + "https://example.com/with_unbalanced_parentheses) does not.\n"
                + "Note that www. is not a URL and neither is http://.";
            const expected = "Hello <a>www.example.com</a>,\n"
                + "<a>http://google.com</a> is a search engine, like <a>http://www.bing.com</a>\n"
                + "<a>http://exämple.org/foo.html?baz=la#bumm</a> is an IDN URL,\n"
                + "<a>http://123.123.123.123/foo.html</a> is IPv4 and <a>http://fe80:0000:0000:0000:0204:61ff:fe9d:f156/foobar.html</a> is IPv6.\n"
                + "links can also be in parens (<a>http://example.org</a>) or quotes »<a>http://example.org</a>«, "
                + "yet <a>https://example.com/with_(balanced_parentheses)</a> and <a>https://example.com/with_(balanced_parentheses).txt</a> contain the closing parens, but "
                + "<a>https://example.com/with_unbalanced_parentheses</a>) does not.\n"
                + "Note that www. is not a URL and neither is http://.";
            /*jshint laxbreak: false */
            const result = uri.withinString(source, (url) => {
                return `<a>${url}</a>`;
            });

            assert.equal(result, expected, "in string URI identification");
        });
        it("withinString - ignore", () => {
            const decorate = function (url) {
                return `<a>${url}</a>`;
            };
            /*jshint laxbreak: true */
            const source = "Hello www.example.com,\n"
                + "proto://example.org/foo.html?baz=la#bumm is an URL.\n";
            const expected = "Hello <a>www.example.com</a>,\n"
                + "proto://example.org/foo.html?baz=la#bumm is an URL.\n";
            /*jshint laxbreak: false */
            const result = uri.withinString(source, decorate, { ignore: /^proto:/i });

            assert.equal(result, expected, "filtered in string URI identification");
        });
        it("withinString - ignoreHtml", () => {
            const decorate = function (url) {
                return `<a>${url}</a>`;
            };
            /*jshint laxbreak: true */
            const source = "Hello www.example.com,\n"
                + "<a href=http://example.org/foo.html?baz=la#bumm is an URL</a>.\n"
                + '<a href="http://example.org/foo.html?baz=la#bumm> is an URL</a>.\n'
                + "<a href='http://example.org/foo.html?baz=la#bumm'> is an URL</a>.\n";
            const expected = "Hello <a>www.example.com</a>,\n"
                + "<a href=http://example.org/foo.html?baz=la#bumm is an URL</a>.\n"
                + '<a href="http://example.org/foo.html?baz=la#bumm> is an URL</a>.\n'
                + "<a href='http://example.org/foo.html?baz=la#bumm'> is an URL</a>.\n";
            /*jshint laxbreak: false */
            const result = uri.withinString(source, decorate, { ignoreHtml: true });

            assert.equal(result, expected, "filtered in string URI identification");
        });
        it("withinString - capture only", () => {
            /*jshint laxbreak: true */
            const source = "Hello www.example.com,\n"
                + "http://google.com is a search engine, like http://www.bing.com\n"
                + "http://exämple.org/foo.html?baz=la#bumm is an IDN URL,\n"
                + "http://123.123.123.123/foo.html is IPv4 and http://fe80:0000:0000:0000:0204:61ff:fe9d:f156/foobar.html is IPv6.\n"
                + "links can also be in parens (http://example.org) or quotes »http://example.org«.";
            const expected = [
                "www.example.com",
                "http://google.com",
                "http://www.bing.com",
                "http://exämple.org/foo.html?baz=la#bumm",
                "http://123.123.123.123/foo.html",
                "http://fe80:0000:0000:0000:0204:61ff:fe9d:f156/foobar.html",
                "http://example.org",
                "http://example.org"
            ];

            /*jshint laxbreak: false */
            const links = [];
            const result = uri.withinString(source, (url) => {
                links.push(url);
            });

            assert.deepEqual(links, expected, "urls extracted");
            assert.equal(result, source, "source not modified");
        });
        it("ensureValidPort", () => {
            const testPort = (value) => {
                let result = true;
                try {
                    uri.ensureValidPort(value);
                } catch (e) {
                    result = false;
                }

                return result;
            };

            assert.equal(testPort(8000), true);
            assert.equal(testPort("8080"), true);

            assert.equal(testPort(0), true);
            assert.equal(testPort(1), true);

            assert.equal(testPort(65535), true);
            assert.equal(testPort(65536), false);

            assert.equal(testPort(-8080), false);
            assert.equal(testPort("-8080"), false);

            assert.equal(testPort("aaa8080"), false);
            assert.equal(testPort("8080a"), false);

            assert.equal(testPort(8080.2), false);
        });

        it("joinPaths", () => {
            let result;

            result = uri.joinPaths("/a/b", "/c", "d", "/e").toString();
            assert.equal(result, "/a/b/c/d/e", "absolute paths");

            result = uri.joinPaths("a/b", "http://example.com/c", new URI("d/"), "/e").toString();
            assert.equal(result, "a/b/c/d/e", "relative path");

            result = uri.joinPaths("/a/").toString();
            assert.equal(result, "/a/", "single absolute directory");

            result = uri.joinPaths("/a").toString();
            assert.equal(result, "/a", "single absolute segment");

            result = uri.joinPaths("a").toString();
            assert.equal(result, "a", "single relative segment");

            result = uri.joinPaths("").toString();
            assert.equal(result, "", "empty string");

            result = uri.joinPaths().toString();
            assert.equal(result, "", "no argument");

            result = uri.joinPaths("", "a", "", "", "b").toString();
            assert.equal(result, "/a/b", "leading empty segment");

            result = uri.joinPaths("a", "", "", "b", "", "").toString();
            assert.equal(result, "a/b/", "trailing empty segment");
        });
        it("setQuery", () => {
            let o = { foo: "bar" };

            uri.setQuery(o, "foo", "bam");
            assert.deepEqual(o, { foo: "bam" }, "set name, value");

            uri.setQuery(o, "array", ["one", "two"]);
            assert.deepEqual(o, { foo: "bam", array: ["one", "two"] }, "set name, array");

            uri.setQuery(o, "foo", "qux");
            assert.deepEqual(o, { foo: "qux", array: ["one", "two"] }, "override name, value");

            o = { foo: "bar" };
            uri.setQuery(o, { baz: "qux" });
            assert.deepEqual(o, { foo: "bar", baz: "qux" }, "set {name: value}");

            uri.setQuery(o, { bar: ["1", "2"] });
            assert.deepEqual(o, { foo: "bar", bar: ["1", "2"], baz: "qux" }, "set {name: array}");

            uri.setQuery(o, { foo: "qux" });
            assert.deepEqual(o, { foo: "qux", bar: ["1", "2"], baz: "qux" }, "override {name: value}");

            o = { foo: "bar" };
            uri.setQuery(o, { bam: null, baz: "" });
            assert.deepEqual(o, { foo: "bar", bam: null, baz: "" }, "set {name: null}");

            o = { foo: "bar" };
            uri.setQuery(o, "empty");
            assert.deepEqual(o, { foo: "bar", empty: null }, "set undefined");

            o = { foo: "bar" };
            uri.setQuery(o, "empty", "");
            assert.deepEqual(o, { foo: "bar", empty: "" }, "set empty string");

            o = {};
            uri.setQuery(o, "some value", "must be encoded because of = and ? and #");
            assert.deepEqual(o, { "some value": "must be encoded because of = and ? and #" }, "encoding");
        });
    });

    describe("comparing URLs", () => {
        it("equals", () => {
            const u = new URI("http://example.org/foo/bar.html?foo=bar&hello=world&hello=mars#fragment");
            const e = [
                "http://example.org/foo/../foo/bar.html?foo=bar&hello=world&hello=mars#fragment",
                "http://exAmple.org/foo/bar.html?foo=bar&hello=world&hello=mars#fragment",
                "http://exAmple.org:80/foo/bar.html?foo=bar&hello=world&hello=mars#fragment",
                "http://example.org/foo/bar.html?foo=bar&hello=mars&hello=world#fragment",
                "http://example.org/foo/bar.html?hello=mars&hello=world&foo=bar&#fragment"
            ];
            const d = [
                "http://example.org/foo/../bar.html?foo=bar&hello=world&hello=mars#fragment",
                "http://example.org/foo/bar.html?foo=bar&hello=world&hello=mars#frAgment",
                "http://example.org/foo/bar.html?foo=bar&hello=world&hello=mArs#fragment",
                "http://example.org/foo/bar.hTml?foo=bar&hello=world&hello=mars#fragment",
                "http://example.org:8080/foo/bar.html?foo=bar&hello=world&hello=mars#fragment",
                "http://user:pass@example.org/foo/bar.html?foo=bar&hello=world&hello=mars#fragment",
                "ftp://example.org/foo/bar.html?foo=bar&hello=world&hello=mars#fragment",
                "http://example.org/foo/bar.html?foo=bar&hello=world&hello=mars&hello=jupiter#fragment"
            ];
            let i;
            let c;

            for (i = 0; (c = e[i]); i++) {
                assert.equal(u.equals(c), true, `equality ${i}`);
            }

            for (i = 0; (c = d[i]); i++) {
                assert.equal(u.equals(c), false, `different ${i}`);
            }
        });
    });

    describe("Charset", () => {
        it("iso8859", () => {
            let u = new URI("/ä.html");
            u.normalizePath();
            assert.equal(u.path(), "/%C3%A4.html", "Unicode");

            URI.iso8859();
            u = new URI("/ä.html");
            u.normalizePath();
            assert.equal(u.path(), "/%E4.html", "ISO8859");
            u.path("/ö.html");
            assert.equal(u.path(), "/%F6.html", "ISO8859");

            URI.unicode();
            u = new URI("/ä.html");
            u.normalizePath();
            assert.equal(u.path(), "/%C3%A4.html", "Unicode again");

            u = new URI("/ä.html");
            u.normalizePath();
            assert.equal(u.path(), "/%C3%A4.html", "convert unicode start");
            u.iso8859();
            assert.equal(u.path(), "/%E4.html", "convert iso8859");
            u.unicode();
            assert.equal(u.path(), "/%C3%A4.html", "convert unicode");
        });

        it("bad charset in QueryString", () => {
            const uri = new URI("http://www.google.com.hk/search?q=pennytel%20downloads&sa=%20%CB%D1%20%CB%F7%20&forid=1&prog=aff&ie=GB2312&oe=GB2312&safe=active&source=sdo_sb_html&hl=zh-CN");
            let data = uri.query(true);

            assert.equal(data.sa, "%20%CB%D1%20%CB%F7%20", "undecodable value returned");
            assert.equal(data.forid, "1", "decodable value returned");

            uri.normalizeQuery();
            data = uri.query(true);
            assert.equal(data.sa, "%20%CB%D1%20%CB%F7%20", "undecodable value returned");
            assert.equal(data.forid, "1", "decodable value returned");
        });
    });

    describe("Encoding", () => {
        it("decode malformed URI", () => {
            try {
                decodeURIComponent("%%20");
                assert.isOk(false, "decodeURIComponent() must throw URIError: URI malformed");
            } catch (e) {
                //
            }

            try {
                uri.decode("%%20");
                assert.isOk(false, "uri.decode() must throw URIError: URI malformed");
            } catch (e) {
                //
            }

            assert.equal(uri.decodeQuery("%%20"), "%%20", "malformed URI component returned");
            assert.equal(uri.decodePathSegment("%%20"), "%%20", "malformed URI component returned");
            assert.equal(uri.decodeUrnPathSegment("%%20"), "%%20", "malformed URN component returned");
        });
        it("encodeQuery", () => {
            const escapeQuerySpace = URI.escapeQuerySpace;

            URI.escapeQuerySpace = true;
            assert.equal(uri.encodeQuery(" "), "+");
            assert.equal(uri.encode(" "), "%20");

            URI.escapeQuerySpace = false;
            assert.equal(uri.encodeQuery(" "), "%20");
            assert.equal(uri.encode(" "), "%20");

            URI.escapeQuerySpace = escapeQuerySpace;
        });
        it("decodeQuery", () => {
            const escapeQuerySpace = URI.escapeQuerySpace;

            URI.escapeQuerySpace = true;
            assert.equal(uri.decodeQuery("+"), " ");
            assert.equal(uri.decodeQuery("%20"), " ");
            assert.equal(uri.decode("%20"), " ");
            assert.equal(uri.decode("+"), "+");

            URI.escapeQuerySpace = false;
            assert.equal(uri.decodeQuery("+"), "+");
            assert.equal(uri.decodeQuery("%20"), " ");
            assert.equal(uri.decode("%20"), " ");
            assert.equal(uri.decode("+"), "+");

            URI.escapeQuerySpace = escapeQuerySpace;
        });
        it("encodeReserved", () => {
            assert.equal(uri.encodeReserved("ä:/?#[]@!$&'()*+,;="), "%C3%A4:/?#[]@!$&'()*+,;=");
        });
    });

    // describe("SecondLevelDomains", () => {
    //     it("SecondLevelDomains.get()", () => {
    //         assert.equal(SecondLevelDomains.get("www.example.ch"), null, "www.example.ch");
    //         assert.equal(SecondLevelDomains.get("www.example.com"), null, "www.example.com");
    //         assert.equal(SecondLevelDomains.get("www.example.eu.com"), "eu.com", "www.example.eu.com");
    //         assert.equal(SecondLevelDomains.get("www.example.co.uk"), "co.uk", "www.example.co.uk");
    //     });

    //     it("SecondLevelDomains.has()", () => {
    //         assert.equal(SecondLevelDomains.has("www.example.ch"), false, "www.example.ch");
    //         assert.equal(SecondLevelDomains.has("www.example.com"), false, "www.example.com");
    //         assert.equal(SecondLevelDomains.has("www.example.eu.com"), true, "www.example.eu.com");
    //         assert.equal(SecondLevelDomains.has("www.example.co.uk"), true, "www.example.co.uk");
    //     });

    //     it("SecondLevelDomains.is()", () => {
    //         assert.equal(SecondLevelDomains.is("ch"), false, "ch");
    //         assert.equal(SecondLevelDomains.is("example.ch"), false, "example.ch");

    //         assert.equal(SecondLevelDomains.is("com"), false, "com");
    //         assert.equal(SecondLevelDomains.is("eu.com"), true, "eu.com");
    //         assert.equal(SecondLevelDomains.is("example.com"), false, "example.com");

    //         assert.equal(SecondLevelDomains.is("uk"), false, "uk");
    //         assert.equal(SecondLevelDomains.is("co.uk"), true, "co.uk");
    //     });
    // });

    describe.skip("fragmentURI", () => {
        it("storing URLs in fragment", () => {
            let u = new URI("http://example.org");

            // var uri = new URI('http://example.org/#!/foo/bar/baz.html');
            // var furi = uri.fragment(true);
            // furi.pathname() === '/foo/bar/baz.html';
            // furi.pathname('/hello.html');
            // uri.toString() === 'http://example.org/#!/hello.html'

            assert.isOk(u.fragment(true) instanceof URI, "URI instance for missing fragment");

            u = new URI("http://example.org/#");
            assert.isOk(u.fragment(true) instanceof URI, "URI instance for empty fragment");

            u = new URI("http://example.org/#!/foo/bar/baz.html");
            const f = u.fragment(true);
            assert.equal(f.pathname(), "/foo/bar/baz.html", "reading path of FragmentURI");
            assert.equal(f.filename(), "baz.html", "reading filename of FragmentURI");

            f.filename("foobar.txt");
            assert.equal(f.pathname(), "/foo/bar/foobar.txt", "modifying filename of FragmentURI");
            assert.equal(u.fragment(), "!/foo/bar/foobar.txt", "modifying fragment() through FragmentURI on original");
            assert.equal(u.toString(), "http://example.org/#!/foo/bar/foobar.txt", "modifying filename of FragmentURI on original");
        });
        it("fragmentPrefix", () => {
            URI.fragmentPrefix = "?";
            const u = new URI("http://example.org");
            assert.equal(u._parts.fragmentPrefix, "?", "init using global property");

            u.fragment("#!/foo/bar/baz.html");
            assert.equal(u.fragment(), "!/foo/bar/baz.html", "unparsed ?");
            assert.isOk(u.fragment(true) instanceof URI, "parsing ? prefix - is URI");
            assert.equal(u.fragment(true).toString(), "", "parsing ? prefix - result");

            u.fragment("#?/foo/bar/baz.html");
            assert.equal(u.fragment(), "?/foo/bar/baz.html", "unparsed ?");
            assert.isOk(u.fragment(true) instanceof URI, "parsing ? prefix - is URI");
            assert.equal(u.fragment(true).toString(), "/foo/bar/baz.html", "parsing ? prefix - result");

            u.fragmentPrefix("§");
            assert.equal(u.fragment(), "?/foo/bar/baz.html", "unparsed §");
            assert.isOk(u.fragment(true) instanceof URI, "parsing § prefix - is URI");
            assert.equal(u.fragment(true).toString(), "", "parsing § prefix - result");

            u.fragment("#§/foo/bar/baz.html");
            assert.equal(u.fragment(), "§/foo/bar/baz.html", "unparsed §");
            assert.isOk(u.fragment(true) instanceof URI, "parsing § prefix - is URI");
            assert.equal(u.fragment(true).toString(), "/foo/bar/baz.html", "parsing § prefix - result");

            URI.fragmentPrefix = "!";
        });
    });

    describe.skip("fragmentQuery", () => {
        it("storing query-data in fragment", () => {
            let u = new URI("http://example.org");

            assert.deepEqual(u.fragment(true), {}, "empty map for missing fragment");

            u = new URI("http://example.org/#");
            assert.deepEqual(u.fragment(true), {}, "empty map for empty fragment");

            u = new URI("http://example.org/#?hello=world");
            assert.deepEqual(u.fragment(true), { hello: "world" }, "reading data object");

            u.fragment({ bar: "foo" });
            assert.deepEqual(u.fragment(true), { bar: "foo" }, "setting data object");
            assert.equal(u.toString(), "http://example.org/#?bar=foo", "setting data object serialized");

            u.addFragment("name", "value");
            assert.deepEqual(u.fragment(true), { bar: "foo", name: "value" }, "adding value");
            assert.equal(u.toString(), "http://example.org/#?bar=foo&name=value", "adding value serialized");

            u.removeFragment("bar");
            assert.deepEqual(u.fragment(true), { name: "value" }, "removing value bar");
            assert.equal(u.toString(), "http://example.org/#?name=value", "removing value bar serialized");

            u.removeFragment("name");
            assert.deepEqual(u.fragment(true), {}, "removing value name");
            assert.equal(u.toString(), "http://example.org/#?", "removing value name serialized");

            u.setFragment("name", "value1");
            assert.deepEqual(u.fragment(true), { name: "value1" }, "setting name to value1");
            assert.equal(u.toString(), "http://example.org/#?name=value1", "setting name to value1 serialized");

            u.setFragment("name", "value2");
            assert.deepEqual(u.fragment(true), { name: "value2" }, "setting name to value2");
            assert.equal(u.toString(), "http://example.org/#?name=value2", "setting name to value2 serialized");
        });
        it("fragmentPrefix", () => {
            URI.fragmentPrefix = "!";
            const u = new URI("http://example.org");
            assert.equal(u._parts.fragmentPrefix, "!", "init using global property");

            u.fragment("#?hello=world");
            assert.equal(u.fragment(), "?hello=world", "unparsed ?");
            assert.deepEqual(u.fragment(true), {}, "parsing ? prefix");

            u.fragment("#!hello=world");
            assert.equal(u.fragment(), "!hello=world", "unparsed !");
            assert.deepEqual(u.fragment(true), { hello: "world" }, "parsing ! prefix");

            u.fragmentPrefix("§");
            assert.equal(u.fragment(), "!hello=world", "unparsed §");
            assert.deepEqual(u.fragment(true), {}, "parsing § prefix");

            u.fragment("#Â§hello=world");
            assert.equal(u.fragment(), "Â§hello=world", "unparsed §");
            assert.deepEqual(u.fragment(true), { hello: "world" }, "parsing § prefix");

            URI.fragmentPrefix = "?";
        });
    });

    describe("injection", () => {
        it("protocol", () => {
            const u = new URI("http://example.com/dir1/dir2/?query1=value1&query2=value2#hash");
            assert.throws(() => {
                u.protocol("ftp://example.org");
            }, TypeError);

            u.protocol("ftp:");
            assert.equal(u.protocol(), "ftp", "protocol() has set invalid protocoll!");
            assert.equal(u.hostname(), "example.com", "protocol() has changed the hostname");
        });
        it("port", () => {
            const u = new URI("http://example.com/dir1/dir2/?query1=value1&query2=value2#hash");
            assert.throws(() => {
                u.port("99:example.org");
            }, TypeError);

            u.port(":99");
            assert.equal(u.hostname(), "example.com", "port() has modified hostname");
            assert.equal(u.port(), 99, "port() has set an invalid port");

            u.port(false);
            assert.equal(u.port(), "", "port() has set an invalid port");

            // RFC 3986 says nothing about "16-bit unsigned" http://tools.ietf.org/html/rfc3986#section-3.2.3
            // u.href(new URI("http://example.com/"))
            // u.port(65536);
            // notEqual(u.port(), "65536", "port() has set to an non-valid value (A port number is a 16-bit unsigned integer)");

            assert.throws(() => {
                u.port("-99");
            }, TypeError);
        });
        it("domain", () => {
            const u = new URI("http://example.com/dir1/dir2/?query1=value1&query2=value2#hash");

            assert.throws(() => {
                u.domain("example.org/dir0/");
            }, TypeError);

            assert.throws(() => {
                u.domain("example.org:80");
            }, TypeError);

            assert.throws(() => {
                u.domain("foo@example.org");
            }, TypeError);
        });
        it("subdomain", () => {
            const u = new URI("http://example.com/dir1/dir2/?query1=value1&query2=value2#hash");

            assert.throws(() => {
                u.subdomain("example.org/dir0/");
            }, TypeError);

            assert.throws(() => {
                u.subdomain("example.org:80");
            }, TypeError);

            assert.throws(() => {
                u.subdomain("foo@example.org");
            }, TypeError);
        });
        it("tld", () => {
            const u = new URI("http://example.com/dir1/dir2/?query1=value1&query2=value2#hash");

            assert.throws(() => {
                u.tld("foo/bar.html");
            }, TypeError);
        });
        it("path", () => {
            const u = new URI("http://example.com/dir1/dir2/?query1=value1&query2=value2#hash");
            u.path("/dir3/?query3=value3#fragment");
            assert.equal(u.hostname(), "example.com", "path() has modified hostname");
            assert.equal(u.path(), "/dir3/%3Fquery3=value3%23fragment", "path() has set invalid path");
            assert.equal(u.query(), "query1=value1&query2=value2", "path() has modified query");
            assert.equal(u.fragment(), "hash", "path() has modified fragment");
        });
        it("filename", () => {
            const u = new URI("http://example.com/dir1/dir2/?query1=value1&query2=value2#hash");

            u.filename("name.html?query");
            assert.equal(u.filename(), "name.html%3Fquery", "filename() has set invalid filename");
            assert.equal(u.query(), "query1=value1&query2=value2", "filename() has modified query");

            // allowed!
            u.filename("../name.html?query");
            assert.equal(u.filename(), "name.html%3Fquery", "filename() has set invalid filename");
            assert.equal(u.directory(), "/dir1", "filename() has not altered directory properly");

            u.filename(null);
            assert.equal(u.filename(), "name.html%3Fquery", "filename() has set invalid filename");
            assert.equal(u.directory(), "/dir1", "filename() has not altered directory properly");

            u.filename(false);
            assert.equal(u.filename(), "name.html%3Fquery", "filename() has set invalid filename");
            assert.equal(u.directory(), "/dir1", "filename() has not altered directory properly");

            u.filename(0);
            assert.equal(u.filename(), "name.html%3Fquery", "filename() has set invalid filename");
            assert.equal(u.directory(), "/dir1", "filename() has not altered directory properly");
        });
        it("addQuery", () => {
            const u = new URI("http://example.com/dir1/dir2/?query1=value1&query2=value2#hash");
            u.addQuery("query3", "value3#got");
            assert.equal(u.query(), "query1=value1&query2=value2&query3=value3%23got", "addQuery() has set invalid query");
            assert.equal(u.fragment(), "hash", "addQuery() has modified fragment");
        });
    });
});
