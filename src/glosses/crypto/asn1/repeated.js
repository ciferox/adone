const {
    crypto: { asn1 }
} = adone;

const {
    util
} = adone.private(asn1);

export default class Repeated {
    /**
	 * Constructor for "Repeated" class
	 * @param {Object} [parameters={}]
	 * @property {string} [name]
	 * @property {boolean} [optional]
	 */
    constructor(parameters = {}) {
        this.name = util.getParametersValue(parameters, "name", "");
        this.optional = util.getParametersValue(parameters, "optional", false);
        this.value = util.getParametersValue(parameters, "value", new asn1.Any());
        this.local = util.getParametersValue(parameters, "local", false); // Could local or global array to store elements
    }
}
