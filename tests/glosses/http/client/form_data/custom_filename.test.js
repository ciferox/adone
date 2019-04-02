describe("custom filename", function () {
    const {
        FormData,
        createServer,
        fixtures,
        submit
    } = this;

    const {
        fs,
        std: {
            path
        },
        net: {
            mime
        }
    } = adone;

    it("works", async () => {
        const knownFile = fixtures.getFile("unicycle.jpg").path();
        const unknownFile = fixtures.getFile("unknown_file_type").path();
        const relativeFile = path.relative(path.join(knownFile, "..", ".."), knownFile);
        const options = {
            filename: "test.png",
            contentType: "image/gif"
        };

        const app = createServer();
        app.use(async (ctx) => {
            const { fields } = await ctx.request.multipart();
            assert("custom_everything" in fields);
            assert.strictEqual(fields.custom_everything[0].name, options.filename, "Expects custom filename");
            assert.strictEqual(fields.custom_everything[0].type, options.contentType, "Expects custom content-type");

            assert("custom_filename" in fields);
            assert.strictEqual(fields.custom_filename[0].name, options.filename, "Expects custom filename");
            assert.strictEqual(fields.custom_filename[0].type, mime.lookup(knownFile), "Expects original content-type");

            assert("custom_filepath" in fields);
            assert.strictEqual(fields.custom_filepath[0].name, relativeFile.replace(/\\/g, "/"), "Expects custom filepath");
            assert.strictEqual(fields.custom_filepath[0].type, mime.lookup(knownFile), "Expects original content-type");

            assert("unknown_with_filename" in fields);
            assert.strictEqual(fields.unknown_with_filename[0].name, options.filename, "Expects custom filename");
            assert.strictEqual(fields.unknown_with_filename[0].type, mime.lookup(options.filename), "Expects filename-derived content-type");

            assert("unknown_with_filename_as_object" in fields);
            assert.strictEqual(fields.unknown_with_filename_as_object[0].name, options.filename, "Expects custom filename");
            assert.strictEqual(fields.unknown_with_filename_as_object[0].type, mime.lookup(options.filename), "Expects filename-derived content-type");

            assert("unknown_with_name_prop" in fields);
            assert.strictEqual(fields.unknown_with_name_prop[0].name, options.filename, "Expects custom filename");
            assert.strictEqual(fields.unknown_with_name_prop[0].type, mime.lookup(options.filename), "Expects filename-derived content-type");

            assert("unknown_everything" in fields);
            assert.strictEqual(fields.unknown_everything[0].type, FormData.DEFAULT_CONTENT_TYPE, "Expects default content-type");

            ctx.body = "OK";
        });

        await app.bind();

        const form = new FormData();
        // Explicit contentType and filename.
        form.append("custom_everything", fs.createReadStream(knownFile), options);
        // Filename only with real file
        form.append("custom_filename", fs.createReadStream(knownFile), options.filename);
        // Filename only with unknown file
        form.append("unknown_with_filename", fs.createReadStream(unknownFile), options.filename);
        // Filename only with unknown file
        form.append("unknown_with_filename_as_object", fs.createReadStream(unknownFile), { filename: options.filename });
        // Filename with relative path
        form.append("custom_filepath", fs.createReadStream(knownFile), { filepath: relativeFile });
        // No options or implicit file type from extension on name property.
        const customNameStream = fs.createReadStream(unknownFile);
        customNameStream.name = options.filename;
        form.append("unknown_with_name_prop", customNameStream);
        // No options or implicit file type from extension.
        form.append("unknown_everything", fs.createReadStream(unknownFile));

        expect(await submit(app, form)).to.include({
            data: "OK"
        });
    });
});
