describe("submit", function () {
    const {
        FormData,
        fixtures,
        defaultTypeValue,
        createServer,
        submit,
        checkFields,
        populateFields
    } = this;

    const {
        fs,
        net: {
            mime
        }
    } = adone;

    it("should work", async () => {
        const fixture = fixtures.getFile("unicycle.jpg").path();
        const FIELDS = {
            my_field: {
                value: "my_value"
            },
            my_buffer: {
                type: FormData.DEFAULT_CONTENT_TYPE,
                value: defaultTypeValue
            },
            my_file: {
                type: mime.lookup(fixture),
                value() {
                    return fs.createReadStream(fixture);
                }
            }
        };

        const app = createServer();

        app.use(async (ctx) => {
            const { fields } = await ctx.request.multipart();
            checkFields(fields, FIELDS);
            ctx.body = "OK";
        });

        await app.bind();

        const form = new FormData();

        populateFields(form, FIELDS);

        expect(await submit(app, form)).to.include({
            data: "OK"
        });
    });

    it("should support custom headers", async () => {
        const fixture = fixtures.getFile("unicycle.jpg").path();

        const FIELDS = {
            my_field: {
                value: "my_value"
            },
            my_buffer: {
                type: FormData.DEFAULT_CONTENT_TYPE,
                value: defaultTypeValue
            },
            my_file: {
                type: mime.lookup(fixture),
                value() {
                    return fs.createReadStream(fixture);
                }
            }
        };

        const app = createServer();

        app.use(async (ctx) => {
            expect(ctx.headers["x-test-header"]).to.be.equal("test-header-value");

            const { fields } = await ctx.request.multipart();

            checkFields(fields, FIELDS);

            ctx.body = "OK";
        });

        await app.bind();


        const form = new FormData();

        populateFields(form, FIELDS);

        expect(await submit(app, form, {
            headers: {
                "x-test-header": "test-header-value"
            }
        })).to.include({
            data: "OK"
        });
    });

    it("should support https", async () => {
        const app = createServer();

        app.use(async (ctx) => {
            const { fields } = await ctx.request.multipart();
            expect(fields.field).to.be.equal("value");
            ctx.append("x-success", "ok");
            ctx.body = "OK";
        });

        await app.bind(this.httpsOpts);

        const form = new FormData();
        form.append("field", "value");
        const res = await submit(app, form, {
            ca: this.httpsOpts.cert
        });
        expect(res.data).to.be.equal("OK");
        expect(res.headers).to.include({
            "x-success": "ok"
        });
    });
});
