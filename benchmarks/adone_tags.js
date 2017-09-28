const { is, application: { Application } } = adone;

class TestApp extends Application {
}

const testApp = new TestApp();

export default {
    Positive: {
        "instanceof"() {
            return testApp instanceof Application;
        },
        "adone"() {
            return is.application(testApp);
        }
    },
    "Negative (object)": {
        "instanceof"() {
            return console instanceof Application;
        },
        "adone"() {
            return is.application(console);
        }
    },
    "Negative (primitive)": {
        "instanceof"() {
            return 8 instanceof Application;
        },
        "adone"() {
            return is.application(8);
        }
    }
};
