describe("getLength", function () {
    const {
        FormData,
        fixtures
    } = this;
    const {
        is,
        std
    } = adone;

    describe("sync", () => {
        it("should be possible to get length synchronously", () => {
            const fields = [
                {
                    name: "my_number",
                    value: 123
                },
                {
                    name: "my_string",
                    value: "Test 123"
                },
                {
                    name: "my_buffer",
                    value: Buffer.from("123")
                }
            ];

            const form = new FormData();
            let expectedLength = 0;

            fields.forEach((field) => {
                form.append(field.name, field.value);
                expectedLength += (`${field.value}`).length;
            });

            expectedLength += form._overheadLength + form._lastBoundary().length;
            const calculatedLength = form.getLengthSync();

            assert.equal(expectedLength, calculatedLength);
        });

        it("should work when stream with known length", async () => {
            const fields = [
                {
                    name: "my_number",
                    value: 123
                },
                {
                    name: "my_string",
                    value: "Test 123"
                },
                {
                    name: "my_buffer",
                    value: Buffer.from("123")
                },
                {
                    name: "my_image",
                    value: new adone.std.stream.Readable(),
                    options: { knownLength: 100500 }
                }
            ];

            const form = new FormData();
            let expectedLength = 0;

            fields.forEach((field) => {
                form.append(field.name, field.value, field.options);
                if (is.stream(field.value)) {
                    expectedLength += 100500;
                } else {
                    expectedLength += (`${field.value}`).length;
                }
            });
            expectedLength += form._overheadLength + form._lastBoundary().length;

            const calculatedLength = form.getLengthSync();

            assert.equal(expectedLength, calculatedLength);
        });
    });

    describe("async", () => {
        it("should be zero for empty stream", (done) => {
            const form = new FormData();

            form.getLength((err, res) => {
                if (err) {
                    return done(err);
                }
                assert.equal(res, 0);
                done();
            });
        });

        it("should work for utf8 strings", (done) => {
            const FIELD = "my_field";
            const VALUE = "May the € be with you";

            const form = new FormData();
            form.append(FIELD, VALUE);

            const expectedLength = form._overheadLength + Buffer.byteLength(VALUE) + form._lastBoundary().length;

            form.getLength((err, res) => {
                if (err) {
                    return done(err);
                }
                assert.equal(res, expectedLength);
                done();
            });
        });

        it("should work for buffers", (done) => {
            const FIELD = "my_field";
            const VALUE = Buffer.alloc(23);

            const form = new FormData();
            form.append(FIELD, VALUE);

            const expectedLength = form._overheadLength + VALUE.length + form._lastBoundary().length;

            form.getLength((err, res) => {
                if (err) {
                    return done(err);
                }
                assert.equal(res, expectedLength);
                done();
            });
        });

        it("should work for stream, buffer and string", (done) => {
            const fixture1 = fixtures.getFile("unicycle.jpg");
            const fixture2 = fixtures.getFile("veggies.txt");
            const fields = [
                {
                    name: "my_field",
                    value: "Test 123"
                },
                {
                    name: "my_image",
                    value: fixture1.contentsStream("buffer")
                },
                {
                    name: "my_buffer",
                    value: Buffer.from("123")
                },
                {
                    name: "my_txt",
                    value: fixture2.contentsStream("buffer")
                }
            ];

            const form = new FormData();
            let expectedLength = 0;

            fields.forEach((field) => {
                form.append(field.name, field.value);
                if (field.value.path) {
                    expectedLength += std.fs.statSync(field.value.path).size;
                } else {
                    expectedLength += field.value.length;
                }
            });

            expectedLength += form._overheadLength + form._lastBoundary().length;

            form.getLength((err, res) => {
                if (err) {
                    return done(err);
                }
                assert.equal(res, expectedLength);
                done();
            });
        });
    });
});
