const srcPath = (...args) => adone.getPath("src/glosses/streams/pull/ws2", ...args);

const wsurl = require(srcPath("ws-url"));

it("map from a relative url to one for this domain", () => {
    const location = {
        protocol: "http",
        host: "foo.com",
        pathname: "/whatever",
        search: "?okay=true"
    };

    assert.equal(
        wsurl("//bar.com", location),
        "ws://bar.com"
    );
    assert.equal(
        wsurl("/this", location),
        "ws://foo.com/this"
    );
});

it("same path works on dev and deployed", () => {
    const location = {
        protocol: "http",
        host: "localhost:8000"
    };

    assert.equal(
        wsurl("/", {
            protocol: "http",
            host: "localhost:8000"
        }),
        "ws://localhost:8000/"
    );
    assert.equal(
        wsurl("/", {
            protocol: "http",
            host: "server.com:8000"
        }),
        "ws://server.com:8000/"
    );
});

it("universal url still works", () => {
    assert.equal(
        wsurl("ws://what.com/okay", {
            protocol: "http",
            host: "localhost:8000"
        }),
        "ws://what.com/okay"
    );
    assert.equal(
        wsurl("wss://localhost/", {
            protocol: "https",
            host: "localhost:8000"
        }),
        "wss://localhost/"
    );
});


