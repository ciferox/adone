describe("ranged filestream", function () {
    const {
        FormData,
        createServer,
        fixtures,
        submit
    } = this;

    const {
        fs
    } = adone;

    it("should work", async () => {
        const testSubjects = {
            a_file: {
                file: "veggies.txt",
                start: 8,
                end: 18
            },
            b_file: {
                file: "veggies.txt",
                start: 6
            },
            c_file: {
                file: "veggies.txt",
                end: 16
            },
            d_file: {
                file: "veggies.txt",
                start: 0,
                end: 16
            },
            e_file: {
                file: "veggies.txt",
                start: 0,
                end: 0
            }
        };

        const app = createServer();

        app.use(async (ctx) => {
            let requestBodyLength = 0;
            ctx.request.req.on("data", (chunk) => {
                requestBodyLength += chunk.length;
            });
            const { fields } = await ctx.request.multipart();
            for (const [name, [file]] of Object.entries(fields)) {
                expect(file.size).to.be.equal(testSubjects[name].readSize);
            }
            expect(ctx.request.length).to.be.equal(requestBodyLength);
            ctx.body = "OK";
        });

        await app.bind();

        const form = new FormData();

        const readSizeAccumulator = function (data) {
            this.readSize += data.length;
        };

        // add test subjects to the form
        for (const name of Object.keys(testSubjects)) {
            if (!testSubjects.hasOwnProperty(name)) {
                continue;
            }

            const options = { encoding: "utf8" };

            if (testSubjects[name].start) {
                options.start = testSubjects[name].start;
            }
            if (testSubjects[name].end) {
                options.end = testSubjects[name].end;
            }

            form.append(name, testSubjects[name].fsStream = fs.createReadStream(fixtures.getFile(testSubjects[name].file).path(), options));

            // calculate data size
            testSubjects[name].readSize = 0;
            testSubjects[name].fsStream.on("data", readSizeAccumulator.bind(testSubjects[name]));
        }

        expect(await submit(app, form)).to.include({
            data: "OK"
        });
    });
});
