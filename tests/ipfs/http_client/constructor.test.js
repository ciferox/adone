const multiaddr = require("multiaddr");

const f = require("./utils/factory");
const {
    is,
    ipfs: { httpClient }
} = adone;


const clientWorks = function (client, done) {
    client.id((err, id) => {
        expect(err).to.not.exist();

        expect(id).to.have.a.property("id");
        expect(id).to.have.a.property("publicKey");
        done();
    });
};

const expectConfig = function (ipfs, { host, port, protocol, apiPath }) {
    const conf = ipfs.util.getEndpointConfig();
    expect(conf.host).to.equal(host || "localhost");
    expect(conf.port).to.equal(port || "5001");
    expect(conf.protocol).to.equal(protocol || "http");
    expect(conf["api-path"]).to.equal(apiPath || "/api/v0/");
};


describe("ipfs-http-client constructor tests", () => {
    describe("parameter permuations", () => {
        it("none", () => {
            const ipfs = httpClient();
            if (typeof self !== "undefined") {
                const { hostname, port } = self.location;
                expectConfig(ipfs, { host: hostname, port });
            } else {
                expectConfig(ipfs, {});
            }
        });

        it("opts", () => {
            const host = "wizard.world";
            const port = "999";
            const protocol = "https";
            const ipfs = httpClient({ host, port, protocol });
            expectConfig(ipfs, { host, port, protocol });
        });

        it("mutliaddr dns4 string, opts", () => {
            const host = "foo.com";
            const port = "1001";
            const protocol = "https";
            const addr = `/dns4/${host}/tcp/${port}`;
            const ipfs = httpClient(addr, { protocol });
            expectConfig(ipfs, { host, port, protocol });
        });

        it("mutliaddr ipv4 string", () => {
            const host = "101.101.101.101";
            const port = "1001";
            const addr = `/ip4/${host}/tcp/${port}`;
            const ipfs = httpClient(addr);
            expectConfig(ipfs, { host, port });
        });

        it("mutliaddr instance", () => {
            const host = "ace.place";
            const port = "1001";
            const addr = multiaddr(`/dns4/${host}/tcp/${port}`);
            const ipfs = httpClient(addr);
            expectConfig(ipfs, { host, port });
        });

        it("host and port strings", () => {
            const host = "1.1.1.1";
            const port = "9999";
            const ipfs = httpClient(host, port);
            expectConfig(ipfs, { host, port });
        });

        it("host, port and api path", () => {
            const host = "10.100.100.255";
            const port = "9999";
            const apiPath = "/future/api/v1/";
            const ipfs = httpClient(host, port, { "api-path": apiPath });
            expectConfig(ipfs, { host, port, apiPath });
        });

        it("throws on invalid mutliaddr", () => {
            expect(() => httpClient("/dns4")).to.throw("invalid address");
            expect(() => httpClient("/hello")).to.throw("no protocol with name");
            expect(() => httpClient("/dns4/ipfs.io")).to.throw("multiaddr must have a valid format");
        });
    });

    describe("integration", () => {
        let apiAddr;
        let ipfsd;

        before(function (done) {
            this.timeout(60 * 1000); // slow CI

            f.spawn({ initOptions: { bits: 1024, profile: "test" } }, (err, node) => {
                expect(err).to.not.exist();
                ipfsd = node;
                apiAddr = node.apiAddr.toString();
                done();
            });
        });

        after((done) => {
            if (!ipfsd) {
                return done();
            }
            ipfsd.stop(done);
        });

        it("can connect to an ipfs http api", (done) => {
            clientWorks(httpClient(apiAddr), done);
        });
    });
});
