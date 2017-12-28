const {
    is
} = adone;

const asn1 = adone.lazify({
    Any: "./any",
    BaseBlock: "./base_block",
    BitString: "./bit_string",
    BmpString: "./bmp_string",
    Boolean: "./boolean",
    CharacterString: "./character_string",
    Choice: "./choice",
    Constructed: "./constructed",
    DATE: "./date",
    DateTime: "./datetime",
    Duration: "./duration",
    EndOfContent: "./end_of_content",
    Enumerated: "./enumerated",
    GeneralString: "./general_string",
    GeneralizedTime: "./generalized_time",
    IA5String: "./ia5_string",
    Integer: "./integer",
    Null: "./null",
    NumericString: "./numeric_string",
    ObjectIdentifier: "./object_identifier",
    OctetString: "./octet_string",
    Primitive: "./primitive",
    PrintableString: "./printable_string",
    RawData: "./raw_data",
    Repeated: "./repeated",
    Sequence: "./sequence",
    Set: "./set",
    TeletexString: "./teletex_string",
    TimeOfDay: "./time_of_day",
    TIME: "./time",
    UniversalString: "./universal_string",
    UTCTime: "./utc_time",
    Utf8String: "./utf8_string",
    VideotexString: "./videotex_string",
    VisibleString: "./visible_string"
}, exports, require);

adone.lazifyPrivate({
    LocalBaseBlock: "./__/local_base_block",
    LocalBitStringValueBlock: "./__/local_bit_string_value_block",
    LocalBmpStringValueBlock: "./__/local_bmp_string_value_block",
    LocalBooleanValueBlock: "./__/local_boolean_value_block",
    LocalConstructedValueBlock: "./__/local_constructed_value_block",
    LocalEndOfContentValueBlock: "./__/local_end_of_content_value_block",
    LocalHexBlock: "./__/local_hex_block",
    LocalIdentificationBlock: "./__/local_identification_block",
    LocalIntegerValueBlock: "./__/local_integer_value_block",
    LocalLengthBlock: "./__/local_length_block",
    LocalObjectIdentifierValueBlock: "./__/local_object_identifier_value_block",
    LocalOctetStringValueBlock: "./__/local_octet_string_value_block",
    LocalPrimitiveValueBlock: "./__/local_primitive_value_block",
    LocalSidValueBlock: "./__/local_sid_value_block",
    LocalSimpleStringBlock: "./__/local_simple_string_block",
    LocalSimpleStringValueBlock: "./__/local_simple_string_value_block",
    LocalUniversalStringValueBlock: "./__/local_universal_string_value_block",
    LocalUtf8StringValueBlock: "./__/local_utf8_string_value_block",
    LocalValueBlock: "./__/local_value_block",
    util: "./__/util"
}, exports, require);

const __ = adone.private(asn1);

/**
 * Major function for decoding ASN.1 BER array into internal library structuries
 * @param {!ArrayBuffer} inputBuffer ASN.1 BER encoded array of bytes
 */
export const fromBER = (inputBuffer) => {
    if (inputBuffer.byteLength === 0) {
        const result = new asn1.BaseBlock({}, Object);
        result.error = "Input buffer has zero length";

        return {
            offset: -1,
            result
        };
    }

    return __.util.LocalFromBER(inputBuffer, 0, inputBuffer.byteLength);
};

/**
 * Major scheme verification function
 * Compare of two ASN.1 object trees
 * @param {!Object} root Root of input ASN.1 object tree
 * @param {!Object} inputData Input ASN.1 object tree
 * @param {!Object} inputSchema Input ASN.1 schema to compare with
 * @return {{verified: boolean}|{verified:boolean, result: Object}}
 */
export const compareSchema = (root, inputData, inputSchema) => {
    //region Special case for Choice schema element type
    if (inputSchema instanceof asn1.Choice) {
        const choiceResult = false;

        for (let j = 0; j < inputSchema.value.length; j++) {
            const result = compareSchema(root, inputData, inputSchema.value[j]);
            if (result.verified === true) {
                return {
                    verified: true,
                    result: root
                };
            }
        }

        if (choiceResult === false) {
            const _result = {
                verified: false,
                result: {
                    error: "Wrong values for Choice type"
                }
            };

            if (inputSchema.hasOwnProperty("name")) {
                _result.name = inputSchema.name;
            }

            return _result;
        }
    }
    //endregion

    //region Special case for Any schema element type
    if (inputSchema instanceof asn1.Any) {
        //region Add named component of ASN.1 schema
        if (inputSchema.hasOwnProperty("name")) {
            root[inputSchema.name] = inputData;
        }
        //endregion

        return {
            verified: true,
            result: root
        };
    }
    //endregion

    //region Initial check
    if ((root instanceof Object) === false) {
        return {
            verified: false,
            result: { error: "Wrong root object" }
        };
    }

    if ((inputData instanceof Object) === false) {
        return {
            verified: false,
            result: { error: "Wrong ASN.1 data" }
        };
    }

    if ((inputSchema instanceof Object) === false) {
        return {
            verified: false,
            result: { error: "Wrong ASN.1 schema" }
        };
    }

    if (("idBlock" in inputSchema) === false) {
        return {
            verified: false,
            result: { error: "Wrong ASN.1 schema" }
        };
    }
    //endregion

    //region Comparing idBlock properties in ASN.1 data and ASN.1 schema
    //region Encode and decode ASN.1 schema idBlock
    /// <remarks>This encoding/decoding is neccessary because could be an errors in schema definition</remarks>
    if (("fromBER" in inputSchema.idBlock) === false) {
        return {
            verified: false,
            result: { error: "Wrong ASN.1 schema" }
        };
    }

    if (("toBER" in inputSchema.idBlock) === false) {
        return {
            verified: false,
            result: { error: "Wrong ASN.1 schema" }
        };
    }

    const encodedId = inputSchema.idBlock.toBER(false);
    if (encodedId.byteLength === 0) {
        return {
            verified: false,
            result: { error: "Error encoding idBlock for ASN.1 schema" }
        };
    }

    const decodedOffset = inputSchema.idBlock.fromBER(encodedId, 0, encodedId.byteLength);
    if (decodedOffset === -1) {
        return {
            verified: false,
            result: { error: "Error decoding idBlock for ASN.1 schema" }
        };
    }
    //endregion

    //region tagClass
    if (inputSchema.idBlock.hasOwnProperty("tagClass") === false) {
        return {
            verified: false,
            result: { error: "Wrong ASN.1 schema" }
        };
    }

    if (inputSchema.idBlock.tagClass !== inputData.idBlock.tagClass) {
        return {
            verified: false,
            result: root
        };
    }
    //endregion
    //region tagNumber
    if (inputSchema.idBlock.hasOwnProperty("tagNumber") === false) {
        return {
            verified: false,
            result: { error: "Wrong ASN.1 schema" }
        };
    }

    if (inputSchema.idBlock.tagNumber !== inputData.idBlock.tagNumber) {
        return {
            verified: false,
            result: root
        };
    }
    //endregion
    //region isConstructed
    if (inputSchema.idBlock.hasOwnProperty("isConstructed") === false) {
        return {
            verified: false,
            result: { error: "Wrong ASN.1 schema" }
        };
    }

    if (inputSchema.idBlock.isConstructed !== inputData.idBlock.isConstructed) {
        return {
            verified: false,
            result: root
        };
    }
    //endregion
    //region isHexOnly
    if (("isHexOnly" in inputSchema.idBlock) === false) {
        // Since 'isHexOnly' is an inhirited property
        return {
            verified: false,
            result: { error: "Wrong ASN.1 schema" }
        };
    }

    if (inputSchema.idBlock.isHexOnly !== inputData.idBlock.isHexOnly) {
        return {
            verified: false,
            result: root
        };
    }
    //endregion
    //region valueHex
    if (inputSchema.idBlock.isHexOnly === true) {
        if (("valueHex" in inputSchema.idBlock) === false) {
            // Since 'valueHex' is an inhirited property
            return {
                verified: false,
                result: { error: "Wrong ASN.1 schema" }
            };
        }

        const schemaView = new Uint8Array(inputSchema.idBlock.valueHex);
        const asn1View = new Uint8Array(inputData.idBlock.valueHex);

        if (schemaView.length !== asn1View.length) {
            return {
                verified: false,
                result: root
            };
        }

        for (let i = 0; i < schemaView.length; i++) {
            if (schemaView[i] !== asn1View[1]) {
                return {
                    verified: false,
                    result: root
                };
            }
        }
    }
    //endregion
    //endregion

    //region Add named component of ASN.1 schema
    if (inputSchema.hasOwnProperty("name")) {
        inputSchema.name = inputSchema.name.replace(/^\s+|\s+$/g, "");
        if (inputSchema.name !== "") {
            root[inputSchema.name] = inputData;
        }
    }
    //endregion

    //region Getting next ASN.1 block for comparition
    if (inputSchema.idBlock.isConstructed === true) {
        let admission = 0;
        let result = { verified: false };

        let maxLength = inputSchema.valueBlock.value.length;

        if (maxLength > 0) {
            if (inputSchema.valueBlock.value[0] instanceof asn1.Repeated) {
                maxLength = inputData.valueBlock.value.length;
            }
        }

        //region Special case when constructive value has no elements
        if (maxLength === 0) {
            return {
                verified: true,
                result: root
            };
        }
        //endregion

        //region Special case when "inputData" has no values and "inputSchema" has all optional values
        if ((inputData.valueBlock.value.length === 0) &&
			(inputSchema.valueBlock.value.length !== 0)) {
            let _optional = true;

            for (let i = 0; i < inputSchema.valueBlock.value.length; i++) {
                _optional = _optional && (inputSchema.valueBlock.value[i].optional || false);
            }

            if (_optional === true) {
                return {
                    verified: true,
                    result: root
                };
            }

            //region Delete early added name of block
            if (inputSchema.hasOwnProperty("name")) {
                inputSchema.name = inputSchema.name.replace(/^\s+|\s+$/g, "");
                if (inputSchema.name !== "") {
                    delete root[inputSchema.name];
                }
            }
            //endregion

            root.error = "Inconsistent object length";

            return {
                verified: false,
                result: root
            };
        }
        //endregion

        for (let i = 0; i < maxLength; i++) {
            //region Special case when there is an "optional" element of ASN.1 schema at the end
            if ((i - admission) >= inputData.valueBlock.value.length) {
                if (inputSchema.valueBlock.value[i].optional === false) {
                    const _result = {
                        verified: false,
                        result: root
                    };

                    root.error = "Inconsistent length between ASN.1 data and schema";

                    //region Delete early added name of block
                    if (inputSchema.hasOwnProperty("name")) {
                        inputSchema.name = inputSchema.name.replace(/^\s+|\s+$/g, "");
                        if (inputSchema.name !== "") {
                            delete root[inputSchema.name];
                            _result.name = inputSchema.name;
                        }
                    }
                    //endregion

                    return _result;
                }
            } else {
                //region Special case for Repeated type of ASN.1 schema element
                if (inputSchema.valueBlock.value[0] instanceof asn1.Repeated) {
                    result = compareSchema(root, inputData.valueBlock.value[i], inputSchema.valueBlock.value[0].value);
                    if (result.verified === false) {
                        if (inputSchema.valueBlock.value[0].optional === true) {
                            admission++;
                        } else {
                            //region Delete early added name of block
                            if (inputSchema.hasOwnProperty("name")) {
                                inputSchema.name = inputSchema.name.replace(/^\s+|\s+$/g, "");
                                if (inputSchema.name !== "") {
                                    delete root[inputSchema.name];
                                }
                            }
                            //endregion

                            return result;
                        }
                    }

                    if (("name" in inputSchema.valueBlock.value[0]) && (inputSchema.valueBlock.value[0].name.length > 0)) {
                        let arrayRoot = {};

                        if (("local" in inputSchema.valueBlock.value[0]) && (inputSchema.valueBlock.value[0].local === true)) {
                            arrayRoot = inputData;
                        } else {
                            arrayRoot = root;
                        }

                        if (is.undefined(arrayRoot[inputSchema.valueBlock.value[0].name])) {
                            arrayRoot[inputSchema.valueBlock.value[0].name] = [];
                        }

                        arrayRoot[inputSchema.valueBlock.value[0].name].push(inputData.valueBlock.value[i]);
                    }
                } else {
                    result = compareSchema(root, inputData.valueBlock.value[i - admission], inputSchema.valueBlock.value[i]);
                    if (result.verified === false) {
                        if (inputSchema.valueBlock.value[i].optional === true) {
                            admission++;
                        } else {
                            //region Delete early added name of block
                            if (inputSchema.hasOwnProperty("name")) {
                                inputSchema.name = inputSchema.name.replace(/^\s+|\s+$/g, "");
                                if (inputSchema.name !== "") {
                                    delete root[inputSchema.name];
                                }
                            }
                            //endregion

                            return result;
                        }
                    }
                }
            }
        }

        if (result.verified === false) {
            // The situation may take place if last element is "optional" and verification failed
            const _result = {
                verified: false,
                result: root
            };

            //region Delete early added name of block
            if (inputSchema.hasOwnProperty("name")) {
                inputSchema.name = inputSchema.name.replace(/^\s+|\s+$/g, "");
                if (inputSchema.name !== "") {
                    delete root[inputSchema.name];
                    _result.name = inputSchema.name;
                }
            }
            //endregion

            return _result;
        }

        return {
            verified: true,
            result: root
        };
    }
    //endregion
    //region Ability to parse internal value for primitive-encoded value (value of OctetString, for example)
    if (("primitiveSchema" in inputSchema) &&
		("valueHex" in inputData.valueBlock)) {
        //region Decoding of raw ASN.1 data
        const asn1 = fromBER(inputData.valueBlock.valueHex);
        if (asn1.offset === -1) {
            const _result = {
                verified: false,
                result: asn1.result
            };

            //region Delete early added name of block
            if (inputSchema.hasOwnProperty("name")) {
                inputSchema.name = inputSchema.name.replace(/^\s+|\s+$/g, "");
                if (inputSchema.name !== "") {
                    delete root[inputSchema.name];
                    _result.name = inputSchema.name;
                }
            }
            //endregion

            return _result;
        }
        //endregion

        return compareSchema(root, asn1.result, inputSchema.primitiveSchema);
    }

    return {
        verified: true,
        result: root
    };
    //endregion
};

/**
 * ASN.1 schema verification for ArrayBuffer data
 * @param {!ArrayBuffer} inputBuffer Input BER-encoded ASN.1 data
 * @param {!Object} inputSchema Input ASN.1 schema to verify against to
 * @return {{verified: boolean}|{verified:boolean, result: Object}}
 */
export const verifySchema = (inputBuffer, inputSchema) => {
    //region Initial check
    if ((inputSchema instanceof Object) === false) {
        return {
            verified: false,
            result: { error: "Wrong ASN.1 schema type" }
        };
    }
    //endregion

    //region Decoding of raw ASN.1 data
    const asn1 = fromBER(inputBuffer);
    if (asn1.offset === -1) {
        return {
            verified: false,
            result: asn1.result
        };
    }
    //endregion

    //region Compare ASN.1 struct with input schema
    return compareSchema(asn1.result, asn1.result, inputSchema);
    //endregion
};

/**
 * Converting from JSON to ASN.1 objects
 * @param {string|Object} json JSON string or object to convert to ASN.1 objects
 */
export const fromJSON = (json) => {
    // TODO Implement
};
