const {
    is,
    exception
} = adone;

class TestApp extends adone.application.Application {
    main() {
        const getters = ["name", "parent", "root", "state"];
        let counter = 0;
        for (const getter of getters) {
            try {
                this[getter] = null;
            } catch (err) {
                if (err instanceof exception.NotAllowed) {
                    counter++;
                } else {
                    adone.log(err);
                }
            }
        }

        const props = [];
        for (const [name, value] of adone.util.entries(this, { followProto: true })) {
            if (is.function(value)) {
                continue;
            }
            props.push(name);
        }

        adone.log(counter === getters.length && props.length === 0);

        return 0;
    }
}

adone.application.run(TestApp);
