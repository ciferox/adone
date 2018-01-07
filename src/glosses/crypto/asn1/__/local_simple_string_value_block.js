const {
    crypto: { asn1 }
} = adone;

const {
    LocalBaseBlock,
    LocalHexBlock
} = adone.private(asn1);

export default class LocalSimpleStringValueBlock extends LocalHexBlock(LocalBaseBlock) {
    /**
     * Constructor for "LocalSimpleStringValueBlock" class
     * @param {Object} [parameters={}]
     */
    constructor(parameters = {}) {
        super(parameters);

        this.value = "";
        this.isHexOnly = true;
    }

    /**
     * Aux function, need to get a block name. Need to have it here for inhiritence
     * @returns {string}
     */
    static blockName() {
        return "SimpleStringValueBlock";
    }

    /**
     * Convertion for the block to JSON object
     * @returns {Object}
     */
    toJSON() {
        let object = {};

        //region Seems at the moment (Sep 2016) there is no way how to check method is supported in "super" object
        try {
            object = super.toJSON();
        } catch (ex) {
            //
        }
        //endregion

        object.value = this.value;

        return object;
    }
}
