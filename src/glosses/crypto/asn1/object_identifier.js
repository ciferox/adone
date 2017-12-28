const {
    crypto: { asn1 }
} = adone;

const {
    BaseBlock
} = asn1;

const __ = adone.private(asn1);

export default class ObjectIdentifier extends BaseBlock {
    /**
	 * Constructor for "ObjectIdentifier" class
	 * @param {Object} [parameters={}]
	 * @property {ArrayBuffer} [valueHex]
	 */
    constructor(parameters = {}) {
        super(parameters, __.LocalObjectIdentifierValueBlock);

        this.idBlock.tagClass = 1; // UNIVERSAL
        this.idBlock.tagNumber = 6; // OBJECT IDENTIFIER
    }

    /**
	 * Aux function, need to get a block name. Need to have it here for inhiritence
	 * @returns {string}
	 */
    static blockName() {
        return "ObjectIdentifier";
    }
}
