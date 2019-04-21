const {
    crypto: { asn1 }
} = adone;

const {
    LocalSimpleStringBlock
} = adone.getPrivate(asn1);

export default class CharacterString extends LocalSimpleStringBlock {
    /**
     * Constructor for "CharacterString" class
     * @param {Object} [parameters={}]
     */
    constructor(parameters = {}) {
        super(parameters);

        this.idBlock.tagClass = 1; // UNIVERSAL
        this.idBlock.tagNumber = 29; // CharacterString
    }

    /**
     * Aux function, need to get a block name. Need to have it here for inhiritence
     * @returns {string}
     */
    static blockName() {
        return "CharacterString";
    }
}
