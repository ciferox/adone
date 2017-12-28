const {
    crypto: { asn1 }
} = adone;

const {
    util
} = adone.private(asn1);

export default class Choice {
    /**
	 * Constructor for "Choice" class
	 * @param {Object} [parameters={}]
	 * @property {Array} [value] Array of ASN.1 types for make a choice from
	 * @property {boolean} [optional]
	 */
    constructor(parameters = {}) {
        this.value = util.getParametersValue(parameters, "value", []);
        this.optional = util.getParametersValue(parameters, "optional", false);
    }
}
