describe("errors", function () {
    const {
        FormData,
        fixtures
    } = this;

    const {
        std: {
            path,
            fs,
            http
        }
    } = adone;

    it("does not support arrays", async () => {
        // TODO: they must be asynchronous

        const form = new FormData();

        const s = spy();

        form.on("error", s);

        const p = s.waitForCall();

        form.append("my_array", ["bird", "cute"]);

        expect(s).to.have.been.calledOnce;
        const { args: [err] } = await p;
        expect(err.message).to.be.equal("Arrays are not supported.");
    });

    it("cannot calculate proper length synchronously for streams", async () => {
        const fixture = fixtures.getFile("unicycle.jpg");
        const fields = [
            {
                name: "my_string",
                value: "Test 123"
            },
            {
                name: "my_image",
                value: fixture.contentsStream("buffer")
            }
        ];

        const form = new FormData();
        let expectedLength = 0;

        fields.forEach((field) => {
            form.append(field.name, field.value);
            if (field.value.path) {
                const stat = fs.statSync(field.value.path);
                expectedLength += stat.size;
            } else {
                expectedLength += field.value.length;
            }
        });
        expectedLength += form._overheadLength + form._lastBoundary().length;

        const s = spy();
        form.on("error", s);

        const p = s.waitForCall();

        const calculatedLength = form.getLengthSync();

        // getLengthSync DOESN'T calculate streams length
        assert.ok(expectedLength > calculatedLength);

        const { args: [err] } = await p;

        expect(err.message).to.be.equal("Cannot calculate proper length in synchronous way.");
    });

    specify("stream error", (done) => {
        let req;
        const form = new FormData();
        // make it windows friendly
        const fakePath = path.resolve("/why/u/no/exists");
        const src = fs.createReadStream(fakePath);
        const server = http.createServer();

        form.append("fake-stream", src);

        form.on("error", (err) => {
            assert.equal(err.code, "ENOENT");
            assert.equal(err.path, fakePath);
            req.on("error", () => {});
            server.close(done);
        });

        server.listen(0, () => {
            req = form.submit(`http://localhost:${server.address().port}`);
        });
    });
});
