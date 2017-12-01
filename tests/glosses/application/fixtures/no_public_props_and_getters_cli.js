const {
    is
} = adone;

class TestApp extends adone.application.CliApplication {
    main() {
        const getters = ["name", "parent", "root", "state"];
        let counter = 0;
        for (const getter of getters) {
            try {
                this[getter] = null;
            } catch (err) {
                if (err instanceof TypeError && /Cannot set property /.test(err.message)) {
                    counter++;
                } else {
                    adone.log(err);
                }
            }
        }

        const expected = ["argv"];
        let isOk = true;
        for (const [name, value] of adone.util.entries(this, { followProto: true })) {
            if (is.function(value)) {
                continue;
            }
            if (!expected.includes(name)) {
                isOk = false;
                break;
            }
        }

        adone.log(counter === getters.length && isOk);

        return 0;
    }
}

adone.application.runCli(TestApp);
