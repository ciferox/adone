const {
    crypto: { asn1 }
} = adone;

const {
    util
} = adone.private(asn1);

export default class Any {
    /**
     * Constructor for "Any" class
     * @param {Object} [parameters={}]
     * @property {string} [name]
     * @property {boolean} [optional]
     */
    constructor(parameters = {}) {
        this.name = util.getParametersValue(parameters, "name", "");
        this.optional = util.getParametersValue(parameters, "optional", false);
    }
}
