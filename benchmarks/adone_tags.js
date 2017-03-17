const { is, application: { Application } } = adone;

const SYM_TAG = Symbol();

function hasSymbolTag(obj, tag) {
    if (obj != null && typeof obj === "object") {
        for ( ; (obj = obj.__proto__) != null; ) {
            if (obj[tag] === 1) {
                return true;
            }
        }
    }
    return false;
}

Application.prototype[SYM_TAG] = 1;
class TestApp extends Application {
}

const testApp = new TestApp();

const isApp = (obj) => {
    return hasSymbolTag(obj, SYM_TAG);
};

export default {
    "Positive": {
        "instanceof"() {
            return testApp instanceof Application;
        },
        "numeric tag"() {
            return is.application(testApp);
        },
        "symbol tag"() {
            return isApp(testApp);
        }
    },
    "Negative (object)": {
        "instanceof"() {
            return console instanceof Application;
        },
        "numeric tag"() {
            return is.application(console);
        },
        "symbol tag"() {
            return isApp(console);
        }
    },
    "Negative (primitive)": {
        "instanceof"() {
            return 8 instanceof Application;
        },
        "numeric tag"() {
            return is.application(8);
        },
        "symbol tag"() {
            return isApp(8);
        }
    }
};
