describe("custom content type", function () {
    const {
        FormData,
        defaultTypeValue,
        createServer,
        submit
    } = this;

    /**
     * @type {adone.fs.Directory]}
     */
    const fixtures = this.fixtures;

    const {
        is,
        net: {
            mime
        }
    } = adone;

    it("works", async () => {
        const fixture = fixtures.getFile("unicycle.jpg");
        const FIELDS = {
            no_type: {
                value: "my_value"
            },
            custom_type: {
                value: "my_value",
                expectedType: "image/png",
                options: {
                    contentType: "image/png"
                }
            },
            default_type: {
                expectedType: FormData.DEFAULT_CONTENT_TYPE,
                value: defaultTypeValue
            },
            implicit_type: {
                expectedType: mime.lookup(fixture.path()),
                value() {
                    return fixture.contentsStream("buffer");
                }
            },
            overridden_type: {
                expectedType: "image/png",
                options: {
                    contentType: "image/png"
                },
                value() {
                    return fixture.contentsStream("buffer");
                }
            }
        };

        const fieldNames = Object.keys(FIELDS);

        const app = createServer();

        app.use(async (ctx) => {
            const boundary = ctx.headers["content-type"].split("boundary=").pop();
            const body = await ctx.request.text();
            const fields = body.split(boundary).slice(1, -1);
            assert.equal(fields.length, fieldNames.length);
            for (let i = 0; i < fieldNames.length; i++) {
                assert.include(fields[i], `name="${fieldNames[i]}"`);

                if (!FIELDS[fieldNames[i]].expectedType) {
                    assert.notInclude(fields[i], "Content-Type", `Expecting ${fieldNames[i]} not to have Content-Type`);
                } else {
                    assert.include(fields[i], `Content-Type: ${FIELDS[fieldNames[i]].expectedType}`, `Expecting ${fieldNames[i]} to have Content-Type ${FIELDS[fieldNames[i]].expectedType}`);
                }
            }
            ctx.body = "OK";
        });

        await app.bind();

        const form = new FormData();

        for (const [name, field] of Object.entries(FIELDS)) {
            // important to append ReadStreams within the same tick
            if ((is.function(field.value))) {
                field.value = field.value();
            }
            form.append(name, field.value, field.options);
        }

        expect(await submit(app, form)).to.include({
            data: "OK"
        });
    });
});
