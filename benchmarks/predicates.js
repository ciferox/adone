export default {
    undefined: {
        "a === undefined"() {
            return global.adone === undefined;
        },
        "is.undefined(a)"() {
            return adone.is.undefined(global.adone);
        }
    },
    null: {
        "a === null"() {
            return global.adone === null;
        },
        "is.null(a)"() {
            return adone.is.null(global.adone);
        }
    },
    nil: {
        "a == null"() {
            return global.adone == null;
        },
        "is.nil(a)"() {
            return adone.is.nil(global.adone);
        }
    },
    string: {
        "typeof === 'string'"() {
            return typeof(global.adone) === "string";
        },
        "is.string(a)"() {
            return adone.is.string(global.adone);
        }
    }
};
