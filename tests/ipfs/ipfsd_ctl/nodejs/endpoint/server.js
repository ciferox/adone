const {
    std: { path }
} = adone;

const Server = require(adone.getPath("lib/ipfs/ipfsd_ctl/endpoint/server"));
const portUsed = require("detect-port");

describe("endpoint server", () => {
    let server;

    it(".start", function (done) {
        this.timeout(10 * 1000);
        server = new Server({ port: 12345 });

        server.start((err) => {
            expect(err).to.not.exist();
            portUsed(12345, (err, port) => {
                expect(err).to.not.exist();
                expect(port).to.not.equal(12345);
                done();
            });
        });
    });

    it(".stop", async () => {
        await server.stop();
    });
});
