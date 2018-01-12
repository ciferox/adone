const {
    is
} = adone;

export default (ctx) => {
    ctx.prefix("net", "http", "FormData");

    ctx.runtime.fixtures = new adone.fs.Directory(__dirname, "fixtures");
    ctx.runtime.httpsOpts = {
        cert: ctx.runtime.fixtures.getFile("cert.pem").contentsSync(),
        key: ctx.runtime.fixtures.getFile("key.pem").contentsSync()
    };
    ctx.runtime.FormData = adone.net.http.FormData;
    ctx.runtime.defaultTypeValue = () => Buffer.from([1, 2, 3]);
    ctx.runtime.getUrl = (app, opts) => {
        return Object.assign(adone.std.url.parse(`http://localhost:${app.address().port}/`), opts);
    };

    ctx.runtime.submit = (app, form, opts) => {
        return new Promise((resolve, reject) => {
            form.submit(ctx.runtime.getUrl(app, opts), (err, res) => {
                if (res.statusCode !== 200) {
                    reject(new Error(`Failed with ${res.statusCode} status`));
                } else {
                    res.resume();
                    const chunks = [];
                    res.on("data", (chunk) => {
                        chunks.push(chunk);
                    });
                    res.on("end", () => {
                        resolve({
                            data: Buffer.concat(chunks).toString(),
                            headers: res.headers
                        });
                    });
                }
            });
        });
    };

    ctx.runtime.checkFields = (actualFields, testFields) => {
        assert.sameMembers(Object.keys(actualFields), Object.keys(testFields));
        for (const name of Object.keys(actualFields)) {
            const aField = actualFields[name];
            const tField = testFields[name];
            if (is.array(aField)) { // this is a file
                expect(aField).to.have.length(1);
                expect(aField[0].type).to.be.equal(tField.type);
            } else { // value
                let eValue = tField.eValue;
                if (is.function(eValue)) {
                    eValue = eValue();
                }
                if (is.buffer(eValue)) {
                    eValue = eValue.toString("binary");
                }
                expect(aField.value).to.be.equal(eValue);
            }
        }
    };

    ctx.runtime.populateFields = (form, fields) => {
        for (const [name, field] of Object.entries(fields)) {
            let { value } = field;
            if (is.function(value)) {
                value = value();
            }
            form.append(name, value);
        }
    };

    let servers = [];

    ctx.runtime.createServer = (opts) => {
        const server = new adone.net.http.server.Server(opts);
        servers.push(server);
        return server;
    };

    ctx.afterEach(async () => {
        await Promise.all(servers.map((x) => x.unbind()));
        servers = [];
    });
};
