const fs = require("fs");
const http = require("http");
const https = require("https");
const { gyp: { command: { install } } } = adone;

it("download over http", () => {
    const server = http.createServer((req, res) => {
        assert.strictEqual(req.headers["user-agent"],
            `node-gyp v42 (node ${process.version})`);
        res.end("ok");
        server.close();
    });

    const host = "127.0.0.1";
    server.listen(0, host, function () {
        const port = this.address().port;
        const gyp = {
            opts: {},
            version: "42"
        };
        const url = `http://${host}:${port}`;
        const req = install.test.download(gyp, {}, url);
        req.on("response", (res) => {
            let body = "";
            res.setEncoding("utf8");
            res.on("data", (data) => {
                body += data;
            });
            res.on("end", () => {
                assert.strictEqual(body, "ok");
            });
        });
    });
});

it("download over https with custom ca", () => {
    const cert = fs.readFileSync(`${__dirname}/fixtures/server.crt`, "utf8");
    const key = fs.readFileSync(`${__dirname}/fixtures/server.key`, "utf8");

    const cafile = `${__dirname}/fixtures/ca.crt`;
    const ca = install.test.readCAFile(cafile);
    assert.strictEqual(ca.length, 1);

    const options = { ca, cert, key };
    const server = https.createServer(options, (req, res) => {
        assert.strictEqual(req.headers["user-agent"],
            `node-gyp v42 (node ${process.version})`);
        res.end("ok");
        server.close();
    });

    server.on("clientError", (err) => {
        throw err;
    });

    const host = "127.0.0.1";
    server.listen(8000, host, function () {
        const port = this.address().port;
        const gyp = {
            opts: { cafile },
            version: "42"
        };
        const url = `https://${host}:${port}`;
        const req = install.test.download(gyp, {}, url);
        req.on("response", (res) => {
            let body = "";
            res.setEncoding("utf8");
            res.on("data", (data) => {
                body += data;
            });
            res.on("end", () => {
                assert.strictEqual(body, "ok");
            });
        });
    });
});

it("download with missing cafile", () => {
    const gyp = {
        opts: { cafile: "no.such.file" }
    };
    try {
        install.test.download(gyp, {}, "http://bad/");
    } catch (e) {
        assert.ok(/no.such.file/.test(e.message));
    }
});

it("check certificate splitting", () => {
    const cas = install.test.readCAFile(`${__dirname}/fixtures/ca-bundle.crt`);
    assert.strictEqual(cas.length, 2);
    assert.notStrictEqual(cas[0], cas[1]);
});
