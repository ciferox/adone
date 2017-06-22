describe("connection string", function () {
    if (this.topology !== "single") {
        return;
    }

    const { fs, database: { mongo } } = adone;

    const specs = new fs.Directory(__dirname, "connection_string_specs").filesSync();

    for (const spec of specs) {
        it(spec.stem(), async () => {
            const content = await spec.content();
            const data = JSON.parse(content);
            for (const { auth, description, hosts, options, uri, valid, warning } of data.tests) {
                let success = true;
                try {
                    mongo.__.parseUrl(uri);
                    if (valid === false) {
                        success = false;
                    }
                } catch (err) {
                    if (valid === true) {
                        success = false;
                    }
                }

                if (!success) {
                    throw new Error(description);
                }
            }
        });
    }
});
