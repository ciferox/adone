const adone = require(process.env.ADONE_ROOT_PATH).adone;

const {
    is
} = adone;

class TestApp extends adone.application.Application {
    main() {
        const props = [];

        for (const [name, value] of adone.util.entries(this, { followProto: true })) {
            if (is.function(value)) {
                continue;
            }
            props.push(name);
        }
        adone.log(props.join(";"));
        return 0;
    }
}

adone.application.run(TestApp);
