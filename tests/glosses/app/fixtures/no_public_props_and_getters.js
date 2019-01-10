const {
    is,
    error
} = adone;

class TestApp extends adone.app.Application {
    main() {
        const getters = ["name", "parent", "root", "state"];
        let counter = 0;
        for (const getter of getters) {
            try {
                this[getter] = null;
            } catch (err) {
                if (err instanceof error.NotAllowed) {
                    counter++;
                } else {
                    console.log(err);
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

        console.log(counter === getters.length && props.length === 0);

        return 0;
    }
}

adone.app.run(TestApp);
