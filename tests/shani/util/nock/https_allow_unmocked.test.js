describe("shani", "util", "nock", "http allowUnmocked", () => {
    const {
        shani: {
            util: { nock }
        },
        net: {
            http: {
                client: { request },
                server: { Server }
            }
        }
    } = adone;

    beforeEach(() => {
        nock.cleanAll();
        nock.restore();
        nock.activate();
    });

    after(() => {
        nock.cleanAll();
        nock.restore();
    });

    const fixtures = new adone.fs.Directory(__dirname, "fixtures");
    const privateKey = fixtures.getFile("key", "private.key");
    const certificate = fixtures.getFile("key", "certificate.crt");

    it("allowUnmocked for https", async () => {
        const serv = new Server();
        await serv.bind({
            secure: {
                key: await privateKey.contents(),
                cert: await certificate.contents()
            }
        });
        const { port } = serv.address();

        serv.use((ctx) => {
            ctx.body = "heeey";
        });

        nock.enableNetConnect();
        nock(`https://localhost:${port}/`, { allowUnmocked: true })
            .get("/pathneverhit")
            .reply(200, { foo: "bar" });
        {
            const resp = await request.get(`https://localhost:${port}`, { rejectUnauthorized: false });
            expect(resp.data).to.be.equal("heeey");
        }
        {
            const resp = await request.get(`https://localhost:${port}/pathneverhit`);
            expect(resp.data).to.be.deep.equal({ foo: "bar" });
        }
        await serv.unbind();
    });
});
