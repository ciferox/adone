const {
    is,
    multiformat: { multihash: mh }
} = adone;

const CIDUtil = {
    /**
   * Test if the given input is a valid CID object.
   * Returns an error message if it is not.
   * Returns undefined if it is a valid CID.
   *
   * @param {any} other
   * @returns {string}
   */
    checkCIDComponents(other) {
        if (is.nil(other)) {
            return "null values are not valid CIDs";
        }

        if (!(other.version === 0 || other.version === 1)) {
            return "Invalid version, must be a number equal to 1 or 0";
        }

        if (!is.string(other.codec)) {
            return "codec must be string";
        }

        if (!is.buffer(other.multihash)) {
            return "multihash must be a Buffer";
        }

        try {
            mh.validate(other.multihash);
        } catch (err) {
            let errorMsg = err.message;
            if (!errorMsg) { // Just in case mh.validate() throws an error with empty error message
                errorMsg = "Multihash validation failed";
            }
            return errorMsg;
        }
    }
};

module.exports = CIDUtil;
