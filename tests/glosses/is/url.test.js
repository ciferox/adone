import { test } from "./helpers";

describe("is", "url", () => {
    const testUrl = (opts) => test("url", opts);

    it("should validate URLs", () => {
        testUrl({
            valid: [
                "foobar.com",
                "www.foobar.com",
                "foobar.com/",
                "valid.au",
                "http://www.foobar.com/",
                "http://www.foobar.com:23/",
                "http://www.foobar.com:65535/",
                "http://www.foobar.com:5/",
                "https://www.foobar.com/",
                "ftp://www.foobar.com/",
                "http://www.foobar.com/~foobar",
                "http://user:pass@www.foobar.com/",
                "http://user:@www.foobar.com/",
                "http://127.0.0.1/",
                "http://10.0.0.0/",
                "http://189.123.14.13/",
                "http://duckduckgo.com/?q=%2F",
                "http://foobar.com/t$-_.+!*'(),",
                "http://foobar.com/?foo=bar#baz=qux",
                "http://foobar.com?foo=bar",
                "http://foobar.com#baz=qux",
                "http://www.xn--froschgrn-x9a.net/",
                "http://xn--froschgrn-x9a.com/",
                "http://foo--bar.com",
                "http://høyfjellet.no",
                "http://xn--j1aac5a4g.xn--j1amh",
                "http://xn------eddceddeftq7bvv7c4ke4c.xn--p1ai",
                "http://кулік.укр",
                "test.com?ref=http://test2.com",
                "http://[FEDC:BA98:7654:3210:FEDC:BA98:7654:3210]:80/index.html",
                "http://[1080:0:0:0:8:800:200C:417A]/index.html",
                "http://[3ffe:2a00:100:7031::1]",
                "http://[1080::8:800:200C:417A]/foo",
                "http://[::192.9.5.5]/ipng",
                "http://[::FFFF:129.144.52.38]:80/index.html",
                "http://[2010:836B:4179::836B:4179]"
            ],
            invalid: [
                "http://localhost:3000/",
                "xyz://foobar.com",
                "invalid/",
                "invalid.x",
                "invalid.",
                ".com",
                "http://com/",
                "http://300.0.0.1/",
                "mailto:foo@bar.com",
                "rtmp://foobar.com",
                "http://www.xn--.com/",
                "http://xn--.com/",
                "http://www.foobar.com:0/",
                "http://www.foobar.com:70000/",
                "http://www.foobar.com:99999/",
                "http://www.-foobar.com/",
                "http://www.foobar-.com/",
                "http://foobar/# lol",
                "http://foobar/? lol",
                "http://foobar/ lol/",
                "http://lol @foobar.com/",
                "http://lol:lol @foobar.com/",
                "http://lol:lol:lol@foobar.com/",
                "http://lol: @foobar.com/",
                "http://www.foo_bar.com/",
                "http://www.foobar.com/\t",
                "http://\n@www.foobar.com/",
                "",
                `http://foobar.com/${"f".repeat(2082)}`,
                "http://*.foo.com",
                "*.foo.com",
                "!.foo.com",
                "http://example.com.",
                "http://localhost:61500this is an invalid url!!!!",
                "////foobar.com",
                "http:////foobar.com",
                "https://example.com/foo/<script>alert('XSS')</script>/"
            ]
        });
    });

    it("should validate URLs with custom protocols", () => {
        testUrl({
            args: [{
                protocols: ["rtmp"]
            }],
            valid: [
                "rtmp://foobar.com"
            ],
            invalid: [
                "http://foobar.com"
            ]
        });
    });

    it("should validate file URLs without a host", () => {
        testUrl({
            args: [{
                protocols: ["file"],
                requireHost: false,
                requireTld: false
            }],
            valid: [
                "file://localhost/foo.txt",
                "file:///foo.txt",
                "file:///"
            ],
            invalid: [
                "http://foobar.com",
                "file://"
            ]
        });
    });

    it("should validate URLs with any protocol", () => {
        testUrl({
            args: [{
                requireValidProtocol: false
            }],
            valid: [
                "rtmp://foobar.com",
                "http://foobar.com",
                "test://foobar.com"
            ],
            invalid: [
                "mailto:test@example.com"
            ]
        });
    });

    it("should validate URLs with underscores", () => {
        testUrl({
            args: [{
                allowUnderscores: true
            }],
            valid: [
                "http://foo_bar.com",
                "http://pr.example_com.294.example.com/",
                "http://foo__bar.com"
            ],
            invalid: []
        });
    });

    it("should validate URLs that do not have a TLD", () => {
        testUrl({
            args: [{
                requireTld: false
            }],
            valid: [
                "http://foobar.com/",
                "http://foobar/",
                "http://localhost/",
                "foobar/",
                "foobar"
            ],
            invalid: []
        });
    });

    it("should validate URLs with a trailing dot option", () => {
        testUrl({
            args: [{
                allowTrailingDot: true,
                requireTld: false
            }],
            valid: [
                "http://example.com.",
                "foobar."
            ]
        });
    });

    it("should validate protocol relative URLs", () => {
        testUrl({
            args: [{
                allowProtocolRelativeUrls: true
            }],
            valid: [
                "//foobar.com",
                "http://foobar.com",
                "foobar.com"
            ],
            invalid: [
                "://foobar.com",
                "/foobar.com",
                "////foobar.com",
                "http:////foobar.com"
            ]
        });
    });

    it("should not validate protocol relative URLs when require protocol is true", () => {
        testUrl({
            args: [{
                allowProtocolRelativeUrls: true,
                requireProtocol: true
            }],
            valid: [
                "http://foobar.com"
            ],
            invalid: [
                "//foobar.com",
                "://foobar.com",
                "/foobar.com",
                "foobar.com"
            ]
        });
    });

    it("should let users specify whether URLs require a protocol", () => {
        testUrl({
            args: [{
                requireProtocol: true
            }],
            valid: [
                "http://foobar.com/"
            ],
            invalid: [
                "http://localhost/",
                "foobar.com",
                "foobar"
            ]
        });
    });

    it("should let users specify a host whitelist", () => {
        testUrl({
            args: [{
                hostWhitelist: ["foo.com", "bar.com"]
            }],
            valid: [
                "http://bar.com/",
                "http://foo.com/"
            ],
            invalid: [
                "http://foobar.com",
                "http://foo.bar.com/",
                "http://qux.com"
            ]
        });
    });

    it("should allow regular expressions in the host whitelist", () => {
        testUrl({
            args: [{
                hostWhitelist: ["bar.com", "foo.com", /\.foo\.com$/]
            }],
            valid: [
                "http://bar.com/",
                "http://foo.com/",
                "http://images.foo.com/",
                "http://cdn.foo.com/",
                "http://a.b.c.foo.com/"
            ],
            invalid: [
                "http://foobar.com",
                "http://foo.bar.com/",
                "http://qux.com"
            ]
        });
    });

    it("should let users specify a host blacklist", () => {
        testUrl({
            args: [{
                hostBlacklist: ["foo.com", "bar.com"]
            }],
            valid: [
                "http://foobar.com",
                "http://foo.bar.com/",
                "http://qux.com"
            ],
            invalid: [
                "http://bar.com/",
                "http://foo.com/"
            ]
        });
    });

    it("should allow regular expressions in the host blacklist", () => {
        testUrl({
            args: [{
                hostBlacklist: ["bar.com", "foo.com", /\.foo\.com$/]
            }],
            valid: [
                "http://foobar.com",
                "http://foo.bar.com/",
                "http://qux.com"
            ],
            invalid: [
                "http://bar.com/",
                "http://foo.com/",
                "http://images.foo.com/",
                "http://cdn.foo.com/",
                "http://a.b.c.foo.com/"
            ]
        });
    });
});
