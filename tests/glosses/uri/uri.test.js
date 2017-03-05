/* global describe it */




describe("URI", function()  {

    describe("Components", function()  {
        it("default protocol", () => {
            let u = new adone.URI("http://example.org/foo.html");
            assert.equal(u.protocol(), "http");
            assert.equal(u.toString(), "http://example.org/foo.html");
            u = new adone.URI("http://example.org/foo.html", { defaultProtocol: "file" });
            assert.equal(u.protocol(), "http");
            assert.equal(u.toString(), "http://example.org/foo.html");
            u = new adone.URI("/path/to/a/file");
            assert.equal(u.protocol(), null);
            assert.equal(u.toString(), "/path/to/a/file");
            u = new adone.URI("/path/to/a/file", { defaultProtocol: "file" });
            assert.equal(u.protocol(), "file");
            assert.equal(u.toString(), "file:///path/to/a/file");
        });

        it("protocol", function() {
            let u = new adone.URI("http://example.org/foo.html", { defaultProtocol: "file" });
            assert.equal(u.protocol(), "http", "protocol parsing");

            u.protocol("ftp");
            assert.equal(u.protocol(), "ftp", "ftp protocol");
            assert.equal(u.toString(), "ftp://example.org/foo.html", "ftp url");

            u.protocol("");
            // assert.equal(u.protocol(), 'file', 'relative protocol');
            assert.equal(u.toString(), "file://example.org/foo.html", "relative-scheme url");

            u.protocol("f.t-p+0");
            assert.equal(u.protocol(), "f.t-p+0", "character profile");

            try {
                u.protocol("f:t");
                assert.ok(false, "do not accept invalid protocol");
            } catch(e) {
                // 
            }

            u.protocol(null);
            assert.equal(u.protocol(), "file", "missing protocol");
            assert.equal(u.toString(), "file://example.org/foo.html", "missing-scheme url");
        });

        it("port", function() {
            let u = new adone.URI("http://example.com:8104/file.txt");
            assert.equal(u.port(), "8104", "port parsing");
            u.port(8080);
            assert.equal(u.port(), "8080", "simple port change");
            u.port("2350").port("5555");
            assert.equal(u.port(), "5555", "chained port change");
            u.port("");
            assert.equal(u.port(), "", "port wiping");
            u.port(0);
            assert.equal(u.port(), "", "port wiping with zero");
        });

        it("hostname", function() {
            let u = new adone.URI("http://example.com/file.txt");
            assert.equal(u.hostname(), "example.com", "hostname parsing");
            u.hostname("example2.net");
            assert.equal(u.hostname(), "example2.net", "simple hostname change");
            u.hostname("example3.org").hostname("example4.org");
            assert.equal(u.hostname(), "example4.org", "chained hostname change");
            u.hostname("");
            assert.equal(u.hostname(), "", "hostname wiping");
        });

        it("username and passwords", function() {
            let u = new adone.URI("http://user:pass@example.com/");
            assert.equal(u.username(), "user", "username parsing");
            assert.equal(u.password(), "pass", "password parsing");

            u.username("user2");
            u.password("pass2");
            assert.equal(u.username(), "user2", "simple username change");
            assert.equal(u.password(), "pass2", "simple password change");

            u.username("user3").username("user4");
            u.password("pass3").password("pass4");
            assert.equal(u.username(), "user4", "chained username change");
            assert.equal(u.password(), "pass4", "chained password change");

            u.username("");
            u.password("");
            assert.equal(u.username(), "", "username wiping");
            assert.equal(u.password(), "", "password wiping");
            assert.equal(u.toString(), "http://example.com/", "username and password wiping");

            u = new adone.URI("http://:password@example.com/");
            assert.equal(u.username(), "", "empty username parsing");
            assert.equal(u.password(), "password", "empty username parsing");
        });

        it("origin", function() {
            let u = new adone.URI("http://user:pass@example.com/dir/file.txt");
            assert.equal(u.origin(), "http://user:pass@example.com", "parsing");

            u.origin("https://hello:world@www.example.com:8080");
            assert.equal(u.toString(), "https://hello:world@www.example.com:8080/dir/file.txt", "change");

            u.origin("ftp://example.com").origin("ssh://www.example.net");
            assert.equal(u.toString(), "ssh://www.example.net/dir/file.txt", "chained change");
        });

        it("host", function() {
            let u = new adone.URI("http://example.com:8080/dir/file.txt");
            assert.equal(u.host(), "example.com:8080");

            u.host("www.example.net:1055");
            assert.equal(u.toString(), "http://www.example.net:1055/dir/file.txt");
        });

        it("authority", function() {
            let u = new adone.URI("http://admin:sobaka@example.com:8080/file.txt#here");
            assert.equal(u.authority(), "admin:sobaka@example.com:8080", "authority parsing");

            u.authority("user:pass@example.org:80");
            assert.equal(u.username(), "user", "username changed");
            assert.equal(u.password(), "pass", "password changed");
            assert.equal(u.hostname(), "example.org", "hostname changed");
            assert.equal(u.port(), "80", "port changed");

            u.authority("user:pass@example.org:80").authority("hello.com");
            assert.equal(u.authority(), "hello.com", "chained change");
        });

        it("userinfo", function() {
            let u = new adone.URI("http://user:pass@example.com");
            assert.equal(u.userinfo(), "user:pass", "parsing");

            u.userinfo("user");
            assert.equal(u.password(), "", "only user");

            u.userinfo(":pass");
            assert.equal(u.username(), "", "only password");

            u.userinfo("admin:hello");
            assert.equal(u.toString(), "http://admin:hello@example.com/", "username and password");

            u.userinfo("user:user").userinfo("");
            assert.equal(u.userinfo(), "", "chained + wiping");
        });

        it("resource", function() {
            let u = new adone.URI("http://example.com/foo.html?hello#world");

            assert.equal(u.resource(), "/foo.html?hello#world", "get resource");

            u.resource("/foo.html?hello#world");
            assert.equal(u.href(), "http://example.com/foo.html?hello#world", "set resource");

            u.resource("/world.html");
            assert.equal(u.href(), "http://example.com/world.html", "set resource path");
            assert.equal(u.resource(), "/world.html", "get resource path");

            u.resource("?query");
            assert.equal(u.href(), "http://example.com/?query", "set resource query");
            assert.equal(u.resource(), "/?query", "get resource query");

            u.resource("#fragment");
            assert.equal(u.href(), "http://example.com/#fragment", "set resource fragment");
            assert.equal(u.resource(), "/#fragment", "get resource fragment");

            u.resource("?hello#world");
            assert.equal(u.href(), "http://example.com/?hello#world", "set resource query+fragment");
            assert.equal(u.resource(), "/?hello#world", "get resource query+fragment");

            u.resource("/mars.txt?planet=123");
            assert.equal(u.href(), "http://example.com/mars.txt?planet=123", "set resource path+query");
            assert.equal(u.resource(), "/mars.txt?planet=123", "get resource path+query");

            u.resource("/neptune.txt#foo");
            assert.equal(u.href(), "http://example.com/neptune.txt#foo", "set resource path+fragment");
        });

        it("subdomain", function() {
            let u = new adone.URI("http://www.example.org/foo.html");
            u.subdomain("foo.bar");
            assert.equal(u.hostname(), "foo.bar.example.org", "changed subdomain foo.bar");
            assert.equal(u.toString(), "http://foo.bar.example.org/foo.html", "changed url foo.bar");

            u.subdomain("");
            assert.equal(u.hostname(), "example.org", "changed subdomain \"\"");
            assert.equal(u.toString(), "http://example.org/foo.html", "changed url \"\"");

            u.subdomain("foo.");
            assert.equal(u.hostname(), "foo.example.org", "changed subdomain foo.");
            assert.equal(u.toString(), "http://foo.example.org/foo.html", "changed url foo.");
        });

        it("domain", function() {
            let u = new adone.URI("http://www.example.org/foo.html");
            u.domain("foo.bar");
            assert.equal(u.hostname(), "www.foo.bar", "changed hostname foo.bar");
            assert.equal(u.toString(), "http://www.foo.bar/foo.html", "changed url foo.bar");

            u.hostname("www.example.co.uk");
            assert.equal(u.domain(), "example.co.uk", "domain after changed hostname www.example.co.uk");
            assert.equal(u.toString(), "http://www.example.co.uk/foo.html", "url after changed hostname www.example.co.uk");
            assert.equal(u.domain(true), "co.uk", "domain after changed hostname www.example.co.uk (TLD of SLD)");

            u.domain("example.org");
            assert.equal(u.domain(), "example.org", "domain after changed domain example.org");
            assert.equal(u.toString(), "http://www.example.org/foo.html", "url after changed domain example.org");

            u.domain("example.co.uk");
            assert.equal(u.domain(), "example.co.uk", "domain after changed domain example.co.uk");
            assert.equal(u.toString(), "http://www.example.co.uk/foo.html", "url after changed domain example.co.uk");

            u.href("http://test/");
            assert.equal(u.domain(), "test", "domain (dot-less)");
            assert.equal(u.subdomain(), "", "subdomain (dot-less)");

            u.subdomain("foo");
            assert.equal(u.href(), "http://foo.test/", "subdomain set on (dot-less)");
        });

        it("tld", function() {
            let u = new adone.URI("http://www.example.org/foo.html");
            assert.equal(u.tld(), "org", "tld changed");
            u.tld("mine");
            assert.equal(u.tld(), "mine", "tld changed");
            assert.equal(u.toString(), "http://www.example.mine/foo.html", "changed url mine");

            assert.throws(function() {
                u.tld("");
            });

            assert.throws(function() {
                u.tld("foo.bar");
            });

            u.tld("co.uk");
            assert.equal(u.tld(), "co.uk", "tld changed to sld");
            assert.equal(u.toString(), "http://www.example.co.uk/foo.html", "changed url to sld");
            assert.equal(u.tld(true), "uk", "TLD of SLD");

            u.tld("org");
            assert.equal(u.tld(), "org", "sld changed to tld");
            assert.equal(u.toString(), "http://www.example.org/foo.html", "changed url to tld");

            u.hostname("www.examplet.se");
            assert.equal(u.tld(), "se", "se tld");
        });

        it("directory", function() {
            let u = new adone.URI("http://www.example.org/some/directory/foo.html");
            assert.equal(u.directory(), "/some/directory", "directory parsing");

            u.directory("/");
            assert.equal(u.path(), "/foo.html", "changed path "/"");
            assert.equal(u.toString(), "http://www.example.org/foo.html", "changed url "/"");

            u.directory("");
            assert.equal(u.path(), "/foo.html", "changed path \"\"");
            assert.equal(u.toString(), "http://www.example.org/foo.html", "changed url \"\"");

            u.directory("/bar");
            assert.equal(u.path(), "/bar/foo.html", "changed path \"/bar\"");
            assert.equal(u.toString(), "http://www.example.org/bar/foo.html", "changed url \"/bar\"");

            u.directory("baz");
            assert.equal(u.path(), "/baz/foo.html", "changed path \"baz\"");
            assert.equal(u.toString(), "http://www.example.org/baz/foo.html", "changed url \"baz\"");

            // relative paths
            u = new adone.URI("../some/directory/foo.html");
            u.directory("../other/");
            assert.equal(u.path(), "../other/foo.html", "changed path \"../other/\"");
            assert.equal(u.toString(), "../other/foo.html", "changed url \"../other/\"");

            u.directory("mine");
            assert.equal(u.path(), "mine/foo.html", "changed path \"mine\"");
            assert.equal(u.toString(), "mine/foo.html", "changed url \"mine\"");

            u.directory("/");
            assert.equal(u.path(), "/foo.html", "changed path \"/\"");
            assert.equal(u.toString(), "/foo.html", "changed url \"/\"");

            u.directory("");
            assert.equal(u.path(), "foo.html", "changed path \"\"");
            assert.equal(u.toString(), "foo.html", "changed url \"\"");

            u.directory("../blubb");
            assert.equal(u.path(), "../blubb/foo.html", "changed path \"../blubb\"");
            assert.equal(u.toString(), "../blubb/foo.html", "changed url \"../blubb\"");

            // encoding
            u.path("/some/directory/foo.html");
            u.directory("/~userhome/@mine;is %2F and/");
            assert.equal(u.path(), "/~userhome/@mine;is%20%2F%20and/foo.html", "directory encoding");
            assert.equal(u.directory(true), "/~userhome/@mine;is %2F and", "directory decoded");

            // adone.URI as argument
            u.path("/some/directory/foo.html");
            u.directory(new adone.URI("/foo/bar"));
            assert.equal(u.path(), "/foo/bar/foo.html", "adone.URI as argument");
        });

        it("filename", function() {
            let u = new adone.URI("http://www.example.org/some/directory/foo.html");
            assert.equal(u.filename(), "foo.html", "filename parsing");

            u.filename("hello.world");
            assert.equal(u.path(), "/some/directory/hello.world", "changed path \"hello.world\"");
            assert.equal(u.toString(), "http://www.example.org/some/directory/hello.world", "changed url \"hello.world\"");

            u.filename("hello");
            assert.equal(u.path(), "/some/directory/hello", "changed path \"hello\"");
            assert.equal(u.toString(), "http://www.example.org/some/directory/hello", "changed url \"hello\"");

            u.filename("");
            assert.equal(u.path(), "/some/directory/", "changed path \"\"");
            assert.equal(u.toString(), "http://www.example.org/some/directory/", "changed url \"\"");

            u.filename("world");
            assert.equal(u.path(), "/some/directory/world", "changed path \"world\"");
            assert.equal(u.toString(), "http://www.example.org/some/directory/world", "changed url \"world\"");

            // encoding
            u.path("/some/directory/foo.html");
            u.filename("hällo wörld.html");
            assert.equal(u.path(), "/some/directory/h%C3%A4llo%20w%C3%B6rld.html", "filename encoding");
            assert.equal(u.filename(), "h%C3%A4llo%20w%C3%B6rld.html", "filename encoded");
            assert.equal(u.filename(true), "hällo wörld.html", "filename decoded");
        });

        it("suffix", function() {
            let u = new adone.URI("http://www.example.org/some/directory/foo.html");
            u.suffix("xml");
            assert.equal(u.path(), "/some/directory/foo.xml", "changed path \"xml\"");
            assert.equal(u.toString(), "http://www.example.org/some/directory/foo.xml", "changed url \"xml\"");

            u.suffix("");
            assert.equal(u.path(), "/some/directory/foo", "changed path \"\"");
            assert.equal(u.toString(), "http://www.example.org/some/directory/foo", "changed url \"\"");

            u.suffix("html");
            assert.equal(u.path(), "/some/directory/foo.html", "changed path \"html\"");
            assert.equal(u.toString(), "http://www.example.org/some/directory/foo.html", "changed url \"html\"");

            // encoding
            u.suffix("cört");
            assert.equal(u.path(), "/some/directory/foo.c%C3%B6rt", "suffix encoding");
            assert.equal(u.suffix(), "c%C3%B6rt", "suffix encoded"); // suffix is expected to be alnum!
            assert.equal(u.suffix(true), "cört", "suffix decoded"); // suffix is expected to be alnum!
        });

        it("segment", function() {
            let u = new adone.URI("http://www.example.org/some/directory/foo.html");
            let s = u.segment();
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
            assert.equal(u.path(), "/goodbye/world/bar.html/zapp", "segment del 3 \"\"");
            u.segment(3, null);
            assert.equal(u.path(), "/goodbye/world/bar.html", "segment del 3 null");

            u = new adone.URI("http://www.example.org/some/directory/foo.html");
            assert.equal(u.segment(-1), "foo.html", "segment get -1");
            u.segment(-1, "world.html");
            assert.equal(u.path(), "/some/directory/world.html", "segment set -1");

            u = new adone.URI("someurn:foo:bar:baz");
            assert.equal(u.segment().join("||"), "foo||bar||baz", "segment get array URN");
            u.segment(1, "mars");
            assert.equal(u.path(), "foo:mars:baz", "segment set 1 URN");
            assert.equal(u.toString(), "someurn:foo:mars:baz", "segment set 1 URN");

            u = new adone.URI("/foo/");
            assert.equal(u.segment().join("||"), "foo||", "segment get array trailing empty");

            u.segment("test");
            assert.equal(u.path(), "/foo/test", "segment append trailing empty");

            u.segment("");
            assert.equal(u.path(), "/foo/test/", "segment append empty trailing");
            u.segment("");
            assert.equal(u.path(), "/foo/test/", "segment append empty trailing unchanged");

            u.segment(["", "", "foo", "", "", "bar", "", ""]);
            assert.equal(u.path(), "/foo/bar/", "segment collapsing empty parts");

            u = new adone.URI("https://google.com");
            u.segment("//font.ttf//");
            assert.equal(u.path(), "/font.ttf", "segment removes trailing and leading slashes");

            u.segment(["/hello", "/world/", "//foo.html"]);
            assert.equal(u.path(), "/hello/world/foo.html", "segment set array trimming slashes");

            u.segment(1, "/mars/");
            assert.equal(u.path(), "/hello/mars/foo.html", "segment set index trimming slashes");
        });

        it("segmentCoded", function() {
            let u = new adone.URI("http://www.example.org/some%20thing/directory/foo.html");
            let s = u.segmentCoded();
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
            assert.equal(u.path(), "/hello%20world/mars/zapp%20zerapp", "segmentCoded del 3 \"\"");
            u.segmentCoded(2, null);
            assert.equal(u.path(), "/hello%20world/mars", "segmentCoded del 3 null");

            u.segmentCoded("");
            assert.equal(u.path(), "/hello%20world/mars/", "segmentCoded append empty trailing");
            u.segmentCoded("");
            assert.equal(u.path(), "/hello%20world/mars/", "segmentCoded append empty trailing unchanged");
        });

        it("fragment", function() {
            let u = new adone.URI("http://example.com/file.txt#here");
            assert.equal(u.fragment(), "here", "fragment parsing");

            u.fragment("a");
            assert.equal(u.fragment(), "a", "simple fragment change");

            u.fragment("ab").fragment("cd");
            assert.equal(u.fragment(), "cd", "chained fragment change");

            u.fragment("");
            assert.equal(u.fragment(), "", "fragment wiping");
        });

        it("query", function() {
            let u = new adone.URI("http://example.com/file.txt?hello=world");
            assert.equal(u.query(), "hello=world", "query parsing");

            u.query("a=b");
            assert.equal(u.query(), "a=b", "string query change");

            u.query("c=d").query("e=f");
            assert.equal(u.query(), "e=f", "chained query change");

            u.query({ foo: "bar", hello: ["world", "mars"] });
            assert.equal(u.query(), "foo=bar&hello=world&hello=mars", "query from object");

            u.query(() => ({ hello: "world" }));
            assert.equal(u.query(), "hello=world", "query from callback");

            u.query("");
            assert.equal(u.query(), "", "query wiping");
        });

        it("setQuery", function() {
            let u = new adone.URI("?foo=bar");
            u.setQuery("foo", "bam");
            assert.equal(u.query(), "foo=bam", "set name, value");

            u.setQuery("array", ["one", "two"]);
            assert.equal(u.query(), "foo=bam&array=one&array=two", "set name, array");

            u.query("?foo=bar");
            u.setQuery({"obj": "bam", foo: "baz"});
            assert.equal(u.query(), "foo=baz&obj=bam", "set {name: value}");

            u.setQuery({"foo": "foo", bar: ["1", "2"]});
            assert.equal(u.query(), "foo=foo&obj=bam&bar=1&bar=2", "set {name: array}");

            u.query("?foo=bar");
            u.setQuery({"bam": null, "baz": ""});
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

        it("addQuery", function() {
            let u = new adone.URI("?foo=bar");
            u.addQuery("baz", "bam");
            assert.equal(u.query(), "foo=bar&baz=bam", "add name, value");

            u.addQuery("array", ["one", "two"]);
            assert.equal(u.query(), "foo=bar&baz=bam&array=one&array=two", "add name, array");

            u.query("?foo=bar");
            u.addQuery({"obj": "bam", foo: "baz"});
            assert.equal(u.query(), "foo=bar&foo=baz&obj=bam", "add {name: value}");

            u.addQuery({"foo": "bam", bar: ["1", "2"]});
            assert.equal(u.query(), "foo=bar&foo=baz&foo=bam&obj=bam&bar=1&bar=2", "add {name: array}");

            u.query("?foo=bar");
            u.addQuery({"bam": null, "baz": ""});
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

        it("removeQuery", function() {
            let u = new adone.URI("?foo=bar&foo=baz&foo=bam&obj=bam&bar=1&bar=2&bar=3");

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
            u.removeQuery({foo: "bar", obj: undefined, bar: ["1", "2"]});
            assert.equal(u.query(), "foo=baz&foo=bam&bar=3", "removing object");

            u.query("?foo=bar&foo=baz&foo=bam&obj=bam&bar=1&bar=2&bar=3");
            u.removeQuery(/^bar/);
            assert.equal(u.query(), "foo=bar&foo=baz&foo=bam&obj=bam", "removing by RegExp");

            u.query("?foo=bar&foo=baz&foo=bam&obj=bam&bar=bar&bar=baz&bar=bam");
            u.removeQuery("foo", /[rz]$/);
            assert.equal(u.query(), "foo=bam&obj=bam&bar=bar&bar=baz&bar=bam", "removing by value RegExp");
        });

        it("duplicateQueryParameters", function() {
            let u = new adone.URI("?bar=1&bar=1&bar=1");

            u.normalizeQuery();
            assert.equal(u.toString(), "?bar=1", "parameters de-duplicated");

            u = new adone.URI("?bar=1&bar=1&bar=1");
            u.duplicateQueryParameters(true);
            assert.ok(u._parts.duplicateQueryParameters, "duplicateQueryParameters enabled");
            u.normalizeQuery();
            assert.equal(u.toString(), "?bar=1&bar=1&bar=1", "parameters NOT de-duplicated");
            assert.ok(u._parts.duplicateQueryParameters, "duplicateQueryParameters still enabled after normalizeQuery()");

            u.duplicateQueryParameters(false);
            u.normalizeQuery();
            assert.equal(u.toString(), "?bar=1", "parameters de-duplicated again");
            assert.ok(!u._parts.duplicateQueryParameters, "duplicateQueryParameters still disabled after normalizeQuery()");

            // it cloning
            u = new adone.URI("?bar=1&bar=1&bar=1");
            u = u.duplicateQueryParameters(true).clone();
            assert.ok(u._parts.duplicateQueryParameters, "duplicateQueryParameters still enabled after clone()");
            u.normalizeQuery();
            assert.equal(u.toString(), "?bar=1&bar=1&bar=1", "parameters NOT de-duplicated");

            // it adding
            u = new adone.URI("?bar=1&bar=1&bar=1");
            u.duplicateQueryParameters(true);
            u.addQuery("bar", 1);
            assert.equal(u.toString(), "?bar=1&bar=1&bar=1&bar=1", "parameters NOT de-duplicated after addQuery()");
        });

        it("escapeQuerySpace", function() {
            let u = new adone.URI("?bar=foo+bar&bam+baz=foo");
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

            u = new adone.URI("?bar=foo+bar&bam+baz=foo");
            u.escapeQuerySpace(false);
            data = u.query(true);
            assert.equal(data.bar, "foo+bar", "value not un-spac-escaped by default");
            assert.equal(data["bam+baz"], "foo", "name not un-spac-escaped by default");

            // reset
            adone.URI.escapeQuerySpace = true;
        });

        it("hasQuery", function() {
            let u = new adone.URI("?string=bar&list=one&list=two&number=123&null&empty=&nested[one]=1&nested[two]=2");

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
            assert.equal(u.hasQuery(/^lis/, ["one"]), false, "RegExp name and array check - failing incomplete list");
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
            assert.equal(u.hasQuery("string", function(value, name, data) {
                assert.equal(value, "bar", "Function check - param value");
                assert.equal(name, "string", "Function check - param name");
                assert.equal(typeof data, "object", "Function check - param data");
                return true;
            }), true, "Function check - passing true");
            assert.equal(u.hasQuery("string", function() {
                return false;
            }), false, "Function check - passing false");
        });

        it("path", function() {
            let u = new adone.URI("http://example.org/foobar.html?query=string");
            u.path("/some/path/file.suffix");
            assert.equal(u.path(), "/some/path/file.suffix", "changing path \"/some/path/file.suffix\"");
            assert.equal(u.toString(), "http://example.org/some/path/file.suffix?query=string", "changing url \"/some/path/file.suffix\"");

            u.path("");
            assert.equal(u.path(), "/", "changing path \"\"");
            assert.equal(u.toString(), "http://example.org/?query=string", "changing url \"\"");

            u.path("/~userhome/@mine;is %2F and/");
            assert.equal(u.path(), "/~userhome/@mine;is%20%2F%20and/", "path encoding");
            assert.equal(u.path(true), "/~userhome/@mine;is %2F and/", "path decoded");

            u = new adone.URI("/a/b/c/").relativeTo("/a/b/c/");
            assert.equal(u.path(), "", "empty relative path");
            assert.equal(u.toString(), "", "empty relative path to string");

            u.path("/");
            assert.equal(u.path(), "/", "empty absolute path");
            assert.equal(u.toString(), "/", "empty absolute path to string");

            u.path(new adone.URI("/foo/bar.html"));
            assert.equal(u.path(), "/foo/bar.html", "adone.URI as argument");
            assert.equal(u.toString(), "/foo/bar.html", "adone.URI as argument");
        });

        it("URN paths", function() {
            let u = new adone.URI("urn:uuid:6e8bc430-9c3a-11d9-9669-0800200c9a66?foo=bar");
            u.path("uuid:de305d54-75b4-431b-adb2-eb6b9e546013");
            assert.equal(u.path(), "uuid:de305d54-75b4-431b-adb2-eb6b9e546013");
            assert.equal(u.toString(), "urn:uuid:de305d54-75b4-431b-adb2-eb6b9e546013?foo=bar");

            u.path("");
            assert.equal(u.path(), "", "changing path \"\"");
            assert.equal(u.toString(), "urn:?foo=bar", "changing url \"\"");

            u.path("music:classical:Béla Bártok%3a Concerto for Orchestra");
            assert.equal(u.path(), "music:classical:B%C3%A9la%20B%C3%A1rtok%3A%20Concerto%20for%20Orchestra", "path encoding");
            assert.equal(u.path(true), "music:classical:Béla Bártok%3A Concerto for Orchestra", "path decoded");
        });

        it("href", function() {
            let u = new adone.URI("http://foo.bar/foo.html", { defaultProtocol: "file" });

            u.href("ftp://u:p@example.org:123/directory/file.suffix?query=string#fragment");
            assert.equal(u.protocol(), "ftp", "href changed protocol");
            assert.equal(u.username(), "u", "href changed username");
            assert.equal(u.password(), "p", "href changed password");
            assert.equal(u.hostname(), "example.org", "href changed hostname");
            assert.equal(u.port(), "123", "href changed port");
            assert.equal(u.path(), "/directory/file.suffix", "href changed pathname");
            assert.equal(u.query(), "query=string", "href changed search");
            assert.equal(u.fragment(), "fragment", "href changed hash");
            assert.equal(u.href(), "ftp://u:p@example.org:123/directory/file.suffix?query=string#fragment", "href removed url");

            u.href("../path/index.html");
            assert.equal(u.protocol(), "file", "href removed protocol");
            assert.equal(u.username(), "", "href removed username");
            assert.equal(u.password(), "", "href removed password");
            assert.equal(u.hostname(), "", "href removed hostname");
            assert.equal(u.port(), "", "href removed port");
            assert.equal(u.path(), "../path/index.html", "href removed pathname");
            assert.equal(u.query(), "", "href removed search");
            assert.equal(u.fragment(), "", "href removed hash");
            assert.equal(u.href(), "file://../path/index.html", "href removed url");
        });
    });

    describe("Normalizing", function()  {
        it("normalize", function() {
            let u = new adone.URI("http://www.exämple.org:80/food/woo/.././../baz.html?&foo=bar&&baz=bam&&baz=bau&#");
            u.normalize();
            assert.equal(u.toString(), "http://www.xn--exmple-cua.org/baz.html?foo=bar&baz=bam&baz=bau", "fully normalized URL");
        });

        it("normalizeProtocol", function() {
            let u = new adone.URI("hTTp://example.org/foobar.html");
            u.normalizeProtocol();
            assert.equal(u.toString(), "http://example.org/foobar.html", "lowercase http");
        });

        it("normalizeHost", function() {
            let u;

            u = new adone.URI("http://exämple.org/foobar.html");
            u.normalizeHostname();
            assert.equal(u.toString(), "http://xn--exmple-cua.org/foobar.html", "converting IDN to punycode");

            u = new adone.URI("http://[fe80:0000:0000:0000:0204:61ff:fe9d:f156]/foobar.html");
            u.normalizeHostname();
            assert.equal(u.toString(), "http://[fe80::204:61ff:fe9d:f156]/foobar.html", "best IPv6 representation");

            u = new adone.URI("http://[::1]/foobar.html");
            u.normalizeHostname();
            assert.equal(u.toString(), "http://[::1]/foobar.html", "best IPv6 representation");

            u = new adone.URI("http://wWw.eXamplE.Org/foobar.html");
            u.normalizeHostname();
            assert.equal(u.toString(), "http://www.example.org/foobar.html", "lower case hostname");
        });

        it("normalizePort", function() {
            let u = new adone.URI("http://example.org:80/foobar.html");
            u.normalizePort();
            assert.equal(u.toString(), "http://example.org/foobar.html", "dropping port 80 for http");

            u = new adone.URI("ftp://example.org:80/foobar.html");
            u.normalizePort();
            assert.equal(u.toString(), "ftp://example.org:80/foobar.html", "keeping port 80 for ftp");

        });

        it("normalizePath", function() {
            // relative URL
            let u = new adone.URI("/food/bar/baz.html");

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
            u = new adone.URI("http://example.org/foo/bar/baz.html");
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
            assert.equal(u.path(), "/~userhome/@mine;is%20%2F%20and/", "path encoding");

            // relative URL
            u = new adone.URI("/.").normalizePath();
            assert.equal(u.path(), "/", "root /.");

            u = new adone.URI("/..").normalizePath();
            assert.equal(u.path(), "/", "root /..");

            u = new adone.URI("/foo/.").normalizePath();
            assert.equal(u.path(), "/foo/", "root /foo/.");

            u = new adone.URI("/foo/..").normalizePath();
            assert.equal(u.path(), "/", "root /foo/..");

            u = new adone.URI("/foo/.bar").normalizePath();
            assert.equal(u.path(), "/foo/.bar", "root /foo/.bar");

            u = new adone.URI("/foo/..bar").normalizePath();
            assert.equal(u.path(), "/foo/..bar", "root /foo/..bar");

            // Percent Encoding normalization has to happen before dot segment normalization
            u = new adone.URI("/foo/%2E%2E").normalizePath();
            assert.equal(u.path(), "/", "root /foo/%2E%2E");

            u = new adone.URI("/foo/%2E").normalizePath();
            assert.equal(u.path(), "/foo/", "root /foo/%2E");

            u = new adone.URI("/foo/%2E%2E%2Fbar").normalizePath();
            assert.equal(u.path(), "/foo/..%2Fbar", "root /foo/%2E%2E%2Fbar");

            u = new adone.URI("../../../../../www/common/js/app/../../../../www_it/common/js/app/views/view-it.html");
            u.normalize();
            assert.equal(u.path(), "../../../../../www_it/common/js/app/views/view-it.html", "parent relative");

            u = new adone.URI("/../../../../../www/common/js/app/../../../../www_it/common/js/app/views/view-it.html");
            u.normalize();
            assert.equal(u.path(), "/www_it/common/js/app/views/view-it.html", "parent absolute");

            // URNs
            u = new adone.URI("urn:people:authors:poets:Shel Silverstein");
            u.normalize();
            assert.equal(u.path(), "people:authors:poets:Shel%20Silverstein");

            u = new adone.URI("urn:people:authors:philosophers:Søren Kierkegaard");
            u.normalize();
            assert.equal(u.path(), "people:authors:philosophers:S%C3%B8ren%20Kierkegaard");

            // URNs path separator preserved
            u = new adone.URI("urn:games:cards:Magic%3A the Gathering");
            u.normalize();
            assert.equal(u.path(), "games:cards:Magic%3A%20the%20Gathering");
        });

        it("normalizeQuery", function() {
            let u = new adone.URI("http://example.org/foobar.html?");
            u.normalizeQuery();
            assert.equal(u.toString(), "http://example.org/foobar.html", "dropping empty query sign");

            u.query("?&foo=bar&&baz=bam&").normalizeQuery();
            assert.equal(u.query(), "foo=bar&baz=bam", "bad query resolution");

            u.query("?&foo=bar&&baz=bam&&baz=bau&").normalizeQuery();
            assert.equal(u.query(), "foo=bar&baz=bam&baz=bau", "bad query resolution");

            u.query("?&foo=bar&foo=bar").normalizeQuery();
            assert.equal(u.query(), "foo=bar", "duplicate key=value resolution");
        });

        it("normalizeFragment", function() {
            let u = new adone.URI("http://example.org/foobar.html#");
            u.normalizeFragment();
            assert.equal(u.toString(), "http://example.org/foobar.html", "dropping empty fragment sign");
        });

        it("readable", function() {
            let u = new adone.URI("http://foo:bar@www.xn--exmple-cua.org/hello%20world/ä.html?foo%5B%5D=b+är#fragment");
            assert.equal(u.readable(), "http://www.exämple.org/hello world/ä.html?foo[]=b är#fragment", "readable URL");
        });
    });

    describe("Resolving URLs", function()  {
        it("absoluteTo", function() {
            // this being '../bar/baz.html?foo=bar'
            // base being 'http://example.org/foo/other/file.html'
            // return being http://example.org/foo/bar/baz.html?foo=bar'
            let its = [{
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
                name: "base query string",
                url: "#hash3",
                base: "/path/to/file?some=query#hash",
                result: "/path/to/file?some=query#hash3"
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
                name: "file paths - urljoin",
                url: "anotherFile",
                base: "aFile",
                result: "anotherFile"
            }];

            for (let i = 0, t; (t = its[i]); i++) {
                let u = new adone.URI(t.url);
                let r = u.absoluteTo(t.base);

                assert.equal(r.toString(), t.result, t.name);
            }
        });
        it("absoluteTo - RFC3986 reference resolution", function() {
            // http://tools.ietf.org/html/rfc3986#section-5.4
            let base = "http://a/b/c/d;p?q";
            let map = {
                // normal
                // 'g:h'             :    'g:h', // identified as URN
                "g": "http://a/b/c/g",
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

            for (let key in map) {
                let u = new adone.URI(key);
                let r = u.absoluteTo(base);

                assert.equal(r.toString(), map[key], "resolution \"" + key + "\"");
            }
        });
        it("relativeTo", function() {
            let its = [{
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
                "throws": true
            }, {
                name: "relative base",
                url: "/foo/bar",
                base: "foo/",
                "throws": true
            }];

            for (let i = 0, t; (t = its[i]); i++) {
                let u = new adone.URI(t.url);
                let b = new adone.URI(t.base);
                let caught = false;
                let r;

                try {
                    r = u.relativeTo(b);
                } catch (e) {
                    caught = true;
                }
                /*jshint sub:true */
                if (t["throws"]) {
                /*jshint sub:false */
                    assert.ok(caught, t.name + " should throw exception");
                } else {
                    assert.ok(!caught, t.name + " should not throw exception");
                    assert.equal(r.toString(), t.result, t.name);

                    let a = r.absoluteTo(t.base);
                    let n = u.clone().normalize();
                    assert.equal(a.toString(), n.toString(), t.name + " reversed");
                }
            }

            assert.equal("b/c",
                new adone.URI("http://example.org/a/b/c")
                    .protocol("")
                    .authority("")
                    .relativeTo("/a/")
                    .toString(),
                "bug #103");

            assert.equal("b/c",
                new adone.URI("//example.org/a/b/c")
                    .authority("")
                    .relativeTo("/a/")
                    .toString(),
                "bug #103 (2)");
        });
    });

    describe("Path functional", function()  {
        it("join", function() {
            let result;

            result = adone.URI.join("/a/b", "/c", "d", "/e").toString();
            assert.equal(result, "/a/b/c/d/e", "absolute paths");

            result = adone.URI.join("a/b", "http://example.com/c", new adone.URI("d/"), "/e").toString();
            assert.equal(result, "a/b/c/d/e", "relative path");

            result = adone.URI.join("/a/").toString();
            assert.equal(result, "/a/", "single absolute directory");

            result = adone.URI.join("/a").toString();
            assert.equal(result, "/a", "single absolute segment");

            result = adone.URI.join("a").toString();
            assert.equal(result, "a", "single relative segment");

            result = adone.URI.join("").toString();
            assert.equal(result, "", "empty string");

            result = adone.URI.join().toString();
            assert.equal(result, "", "no argument");

            result = adone.URI.join("", "a", "", "", "b").toString();
            assert.equal(result, "/a/b", "leading empty segment");

            result = adone.URI.join("a", "", "", "b", "", "").toString();
            assert.equal(result, "a/b/", "trailing empty segment");

            result = adone.URI.join("a", new adone.URI("b")).toString();
            assert.equal(result, "a/b", "adone.URI as argument");

            result = adone.URI.join("a", "", "", "b", new adone.URI(""), "").toString();
            assert.equal(result, "a/b/", "trailing empty adone.URI segment");
        });

        it("delimiter and sep", function() {
            if (process.platform == "win32"){
                assert.equal(adone.URI.delimiter, ";");
                assert.equal(adone.URI.sep, "\\");
            } else {
                assert.equal(adone.URI.delimiter, ":");
                assert.equal(adone.URI.sep, "/");
            }
        });

        it("relative", function(){
            let result = adone.URI.relative("/data/orandea/test/aaa/", "/data/orandea/impl/bbb/").toString();
            assert.equal(result, "../../impl/bbb/");
        });

        it("isAbsolute", function(){
            assert.equal(adone.URI.isAbsolute("/a/b"), true);
            assert.equal(adone.URI.isAbsolute("a/b"), false);
            assert.equal(adone.URI.isAbsolute(new adone.URI("/a/b")), true, "accept adone.URI");
        });

        it("resolve", function(){
            let result;

            result = adone.URI.resolve();
            assert.equal(result, process.cwd(), "without args should return current path");

            result = adone.URI.resolve("/foo/bar", "./baz");
            assert.equal(result, "/foo/bar/baz");

            result = adone.URI.resolve("/foo/bar", "/tmp/dir/");
            assert.equal(result, "/tmp/dir/");

            result = adone.URI.resolve("wwwroot", "static_files/png/", "../gif/image.gif");
            assert.equal(result, process.cwd()+adone.URI.sep+"wwwroot/static_files/gif/image.gif");

            result = adone.URI.resolve("/a", new adone.URI("b"));
            assert.equal(result, "/a/b");
        });
    });

    it("URL compare", function() {
        let u = new adone.URI("http://example.org/foo/bar.html?foo=bar&hello=world&hello=mars#fragment");
        let e = [
            "http://example.org/foo/../foo/bar.html?foo=bar&hello=world&hello=mars#fragment",
            "http://exAmple.org/foo/bar.html?foo=bar&hello=world&hello=mars#fragment",
            "http://exAmple.org:80/foo/bar.html?foo=bar&hello=world&hello=mars#fragment",
            "http://example.org/foo/bar.html?foo=bar&hello=mars&hello=world#fragment",
            "http://example.org/foo/bar.html?hello=mars&hello=world&foo=bar&#fragment"
        ];
        let d = [
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
            assert.equal(u.equals(c), true, "assert.equality " + i);
        }

        for (i = 0; (c = d[i]); i++) {
            assert.equal(u.equals(c), false, "different " + i);
        }
    });

    it("Empty URI", function() {
        let u = new adone.URI("://:@:0");
        assert.equal(u.username(), "");
        assert.equal(u.password(), "");
        assert.equal(u.hostname(), "");
        assert.equal(u.port(), "");
    });

    it("Asterisks", function() {
        let u = new adone.URI("http://***wild:***wild@example.com");
        assert.equal(u.username(), "***wild");
        assert.equal(u.password(), "***wild");
        assert.equal(u.hostname(), "example.com");
    });

    it("Email in username", function() {
        let u = new adone.URI("http://email@example.com:195{saoj   @hostname.com");
        assert.equal(u.username(), "email@example.com");
        assert.equal(u.password(), "195{saoj   ");
        assert.equal(u.hostname(), "hostname.com");
    });

    it("Simple HTTP parse", function() {
        let u = new adone.URI("http://user:pass@sub.example.com:8080/path/to/file.txt?hello=world#fragment");
        assert.equal(u.protocol(), "http");
        assert.equal(u.subdomain(), "sub");
        assert.equal(u.hostname(), "sub.example.com");
        assert.equal(u.port(), 8080);
        assert.equal(u.username(), "user");
        assert.equal(u.password(), "pass");
        assert.equal(u.path(), "/path/to/file.txt");
        assert.equal(u.query(), "hello=world");
    });

    it("Filesystem path", function() {
        let u = new adone.URI("/home/user/file.txt", { defaultProtocol: "file" });
        assert.equal(u.protocol(), "file");
        assert.equal(u.path(), "/home/user/file.txt");
        assert.equal(u.toString(), "file:///home/user/file.txt", "do not modify filesystem path");
    });
});
