const {
    is
} = adone;

// BSON MAX VALUES
export const BSON_INT32_MAX = 0x7fffffff;
export const BSON_INT32_MIN = -0x80000000;

export const BSON_INT64_MAX = Math.pow(2, 63) - 1;
export const BSON_INT64_MIN = -Math.pow(2, 63);

// JS MAX PRECISE VALUES
export const JS_INT_MAX = 0x20000000000000; // Any integer up to 2^53 can be precisely represented by a double.
export const JS_INT_MIN = -0x20000000000000; // Any integer down to -2^53 can be precisely represented by a double.

/**
 * Number BSON Type
 *
 * @classconstant BSON_DATA_NUMBER
 **/
export const BSON_DATA_NUMBER = 1;

/**
 * String BSON Type
 *
 * @classconstant BSON_DATA_STRING
 **/
export const BSON_DATA_STRING = 2;

/**
 * Object BSON Type
 *
 * @classconstant BSON_DATA_OBJECT
 **/
export const BSON_DATA_OBJECT = 3;

/**
 * Array BSON Type
 *
 * @classconstant BSON_DATA_ARRAY
 **/
export const BSON_DATA_ARRAY = 4;

/**
 * Binary BSON Type
 *
 * @classconstant BSON_DATA_BINARY
 **/
export const BSON_DATA_BINARY = 5;

/**
 * Binary BSON Type
 *
 * @classconstant BSON_DATA_UNDEFINED
 **/
export const BSON_DATA_UNDEFINED = 6;

/**
 * ObjectId BSON Type
 *
 * @classconstant BSON_DATA_OID
 **/
export const BSON_DATA_OID = 7;

/**
 * Boolean BSON Type
 *
 * @classconstant BSON_DATA_BOOLEAN
 **/
export const BSON_DATA_BOOLEAN = 8;

/**
 * Date BSON Type
 *
 * @classconstant BSON_DATA_DATE
 **/
export const BSON_DATA_DATE = 9;

/**
 * null BSON Type
 *
 * @classconstant BSON_DATA_NULL
 **/
export const BSON_DATA_NULL = 10;

/**
 * RegExp BSON Type
 *
 * @classconstant BSON_DATA_REGEXP
 **/
export const BSON_DATA_REGEXP = 11;

/**
 * Code BSON Type
 *
 * @classconstant BSON_DATA_DBPOINTER
 **/
export const BSON_DATA_DBPOINTER = 12;

/**
 * Code BSON Type
 *
 * @classconstant BSON_DATA_CODE
 **/
export const BSON_DATA_CODE = 13;

/**
 * Symbol BSON Type
 *
 * @classconstant BSON_DATA_SYMBOL
 **/
export const BSON_DATA_SYMBOL = 14;

/**
 * Code with Scope BSON Type
 *
 * @classconstant BSON_DATA_CODE_W_SCOPE
 **/
export const BSON_DATA_CODE_W_SCOPE = 15;

/**
 * 32 bit Integer BSON Type
 *
 * @classconstant BSON_DATA_INT
 **/
export const BSON_DATA_INT = 16;

/**
 * Timestamp BSON Type
 *
 * @classconstant BSON_DATA_TIMESTAMP
 **/
export const BSON_DATA_TIMESTAMP = 17;

/**
 * Long BSON Type
 *
 * @classconstant BSON_DATA_LONG
 **/
export const BSON_DATA_LONG = 18;

/**
 * Long BSON Type
 *
 * @classconstant BSON_DATA_DECIMAL128
 **/
export const BSON_DATA_DECIMAL128 = 19;

/**
 * MinKey BSON Type
 *
 * @classconstant BSON_DATA_MIN_KEY
 **/
export const BSON_DATA_MIN_KEY = 0xff;

/**
 * MaxKey BSON Type
 *
 * @classconstant BSON_DATA_MAX_KEY
 **/
export const BSON_DATA_MAX_KEY = 0x7f;

/**
 * Binary Default Type
 *
 * @classconstant BSON_BINARY_SUBTYPE_DEFAULT
 **/
export const BSON_BINARY_SUBTYPE_DEFAULT = 0;

/**
 * Binary Function Type
 *
 * @classconstant BSON_BINARY_SUBTYPE_FUNCTION
 **/
export const BSON_BINARY_SUBTYPE_FUNCTION = 1;

/**
 * Binary Byte Array Type
 *
 * @classconstant BSON_BINARY_SUBTYPE_BYTE_ARRAY
 **/
export const SON_BINARY_SUBTYPE_BYTE_ARRAY = 2;

/**
 * Binary UUID Type
 *
 * @classconstant BSON_BINARY_SUBTYPE_UUID
 **/
export const BSON_BINARY_SUBTYPE_UUID = 3;

/**
 * Binary MD5 Type
 *
 * @classconstant BSON_BINARY_SUBTYPE_MD5
 **/
export const BSON_BINARY_SUBTYPE_MD5 = 4;

/**
 * Binary User Defined Type
 *
 * @classconstant BSON_BINARY_SUBTYPE_USER_DEFINED
 **/
export const BSON_BINARY_SUBTYPE_USER_DEFINED = 128;

adone.lazify({
    Map: () => Map,
    Long: "./long",
    Double: "./double",
    Timestamp: "./timestamp",
    ObjectId: "./objectid",
    BSONRegExp: "./regexp",
    Symbol: "./symbol",
    Int32: "./int_32",
    Code: "./code",
    Decimal128: "./decimal128",
    MinKey: "./min_key",
    MaxKey: "./max_key",
    DBRef: "./db_ref",
    Binary: "./binary"
}, adone.asNamespace(exports), require);

const __ = adone.lazifyPrivate({
    ensureBuffer: "./ensure_buffer",
    fnv1a: "./fnv1a",
    serialize: "./parser/serializer",
    deserialize: "./parser/deserializer",
    calculateSize: "./parser/calculate_size"
}, exports, require);

/**
 * @ignore
 * @api private
 */
// Default Max Size
const MAXSIZE = 1024 * 1024 * 17;

// Current Internal Temporary Serialization Buffer
let buffer = Buffer.alloc(MAXSIZE);

/**
 * Sets the size of the internal serialization buffer.
 *
 * @param {number} size The desired size for the internal serialization buffer
 */
export const setInternalBufferSize = function (size) {
    // Resize the internal serialization buffer if needed
    if (buffer.length < size) {
        buffer = Buffer.alloc(size);
    }
};

/**
 * Serialize a Javascript object.
 *
 * @param {Object} object the Javascript object to serialize.
 * @param {Boolean} [options.checkKeys] the serializer will check if keys are valid.
 * @param {Boolean} [options.serializeFunctions=false] serialize the javascript functions **(default:false)**.
 * @param {Boolean} [options.ignoreUndefined=true] ignore undefined fields **(default:true)**.
 * @return {Buffer} returns the Buffer object containing the serialized object.
 * @api public
 */
export const encode = function (object, options) {
    options = options || {};
    // Unpack the options
    const checkKeys = is.boolean(options.checkKeys) ? options.checkKeys : false;
    const serializeFunctions =
        is.boolean(options.serializeFunctions) ? options.serializeFunctions : false;
    const ignoreUndefined =
        is.boolean(options.ignoreUndefined) ? options.ignoreUndefined : true;
    const minInternalBufferSize =
        is.number(options.minInternalBufferSize) ? options.minInternalBufferSize : MAXSIZE;

    // Resize the internal serialization buffer if needed
    if (buffer.length < minInternalBufferSize) {
        buffer = Buffer.alloc(minInternalBufferSize);
    }

    // Attempt to serialize
    const serializationIndex = __.serialize(
        buffer,
        object,
        checkKeys,
        0,
        0,
        serializeFunctions,
        ignoreUndefined,
        []
    );

    // Create the final buffer
    const finishedBuffer = Buffer.alloc(serializationIndex);

    // Copy into the finished buffer
    buffer.copy(finishedBuffer, 0, 0, finishedBuffer.length);

    // Return the buffer
    return finishedBuffer;
};

/**
 * Serialize a Javascript object using a predefined Buffer and index into the buffer, useful when pre-allocating the space for serialization.
 *
 * @param {Object} object the Javascript object to serialize.
 * @param {Buffer} buffer the Buffer you pre-allocated to store the serialized BSON object.
 * @param {Boolean} [options.checkKeys] the serializer will check if keys are valid.
 * @param {Boolean} [options.serializeFunctions=false] serialize the javascript functions **(default:false)**.
 * @param {Boolean} [options.ignoreUndefined=true] ignore undefined fields **(default:true)**.
 * @param {Number} [options.index] the index in the buffer where we wish to start serializing into.
 * @return {Number} returns the index pointing to the last written byte in the buffer.
 * @api public
 */
export const encodeWithBufferAndIndex = function (object, finalBuffer, options) {
    options = options || {};
    // Unpack the options
    const checkKeys = is.boolean(options.checkKeys) ? options.checkKeys : false;
    const serializeFunctions =
        is.boolean(options.serializeFunctions) ? options.serializeFunctions : false;
    const ignoreUndefined =
        is.boolean(options.ignoreUndefined) ? options.ignoreUndefined : true;
    const startIndex = is.number(options.index) ? options.index : 0;

    // Attempt to serialize
    const serializationIndex = __.serialize(
        buffer,
        object,
        checkKeys,
        0,
        0,
        serializeFunctions,
        ignoreUndefined
    );
    buffer.copy(finalBuffer, startIndex, 0, serializationIndex);

    // Return the index
    return startIndex + serializationIndex - 1;
};

/**
 * Deserialize data as BSON.
 *
 * @param {Buffer} buffer the buffer containing the serialized set of BSON documents.
 * @param {Object} [options.evalFunctions=false] evaluate functions in the BSON document scoped to the object deserialized.
 * @param {Object} [options.cacheFunctions=false] cache evaluated functions for reuse.
 * @param {Object} [options.cacheFunctionsCrc32=false] use a crc32 code for caching, otherwise use the string of the function.
 * @param {Object} [options.promoteLongs=true] when deserializing a Long will fit it into a Number if it's smaller than 53 bits
 * @param {Object} [options.promoteBuffers=false] when deserializing a Binary will return it as a node.js Buffer instance.
 * @param {Object} [options.promoteValues=false] when deserializing will promote BSON values to their Node.js closest equivalent types.
 * @param {Object} [options.fieldsAsRaw=null] allow to specify if there what fields we wish to return as unserialized raw buffer.
 * @param {Object} [options.bsonRegExp=false] return BSON regular expressions as BSONRegExp instances.
 * @param {boolean} [options.allowObjectSmallerThanBufferSize=false] allows the buffer to be larger than the parsed BSON object
 * @return {Object} returns the deserialized Javascript Object.
 * @api public
 */
export const decode = function (buffer, options) {
    buffer = __.ensureBuffer(buffer);
    return __.deserialize(buffer, options);
};

/**
 * Calculate the bson size for a passed in Javascript object.
 *
 * @param {Object} object the Javascript object to calculate the BSON byte size for.
 * @param {Boolean} [options.serializeFunctions=false] serialize the javascript functions **(default:false)**.
 * @param {Boolean} [options.ignoreUndefined=true] ignore undefined fields **(default:true)**.
 * @return {Number} returns the number of bytes the BSON object will take up.
 * @api public
 */
export const calculateObjectSize = function (object, options) {
    options = options || {};

    const serializeFunctions = is.boolean(options.serializeFunctions) ? options.serializeFunctions : false;
    const ignoreUndefined = is.boolean(options.ignoreUndefined) ? options.ignoreUndefined : true;

    return __.calculateSize(object, serializeFunctions, ignoreUndefined);
};

/**
 * Deserialize stream data as BSON documents.
 *
 * @param {Buffer} data the buffer containing the serialized set of BSON documents.
 * @param {Number} startIndex the start index in the data Buffer where the deserialization is to start.
 * @param {Number} numberOfDocuments number of documents to deserialize.
 * @param {Array} documents an array where to store the deserialized documents.
 * @param {Number} docStartIndex the index in the documents array from where to start inserting documents.
 * @param {Object} [options] additional options used for the deserialization.
 * @param {Object} [options.evalFunctions=false] evaluate functions in the BSON document scoped to the object deserialized.
 * @param {Object} [options.cacheFunctions=false] cache evaluated functions for reuse.
 * @param {Object} [options.cacheFunctionsCrc32=false] use a crc32 code for caching, otherwise use the string of the function.
 * @param {Object} [options.promoteLongs=true] when deserializing a Long will fit it into a Number if it's smaller than 53 bits
 * @param {Object} [options.promoteBuffers=false] when deserializing a Binary will return it as a node.js Buffer instance.
 * @param {Object} [options.promoteValues=false] when deserializing will promote BSON values to their Node.js closest equivalent types.
 * @param {Object} [options.fieldsAsRaw=null] allow to specify if there what fields we wish to return as unserialized raw buffer.
 * @param {Object} [options.bsonRegExp=false] return BSON regular expressions as BSONRegExp instances.
 * @return {Number} returns the next index in the buffer after deserialization **x** numbers of documents.
 * @api public
 */
export const decodeStream = function (data, startIndex, numberOfDocuments, documents, docStartIndex, options) {
    options = Object.assign({ allowObjectSmallerThanBufferSize: true }, options);
    data = __.ensureBuffer(data);

    let index = startIndex;
    // Loop over all documents
    for (let i = 0; i < numberOfDocuments; i++) {
        // Find size of the document
        const size =
            data[index] | (data[index + 1] << 8) | (data[index + 2] << 16) | (data[index + 3] << 24);
        // Update options with index
        options.index = index;
        // Parse the document at this point
        documents[docStartIndex + i] = __.deserialize(data, options);
        // Adjust index by the document size
        index = index + size;
    }

    // Return object containing end index of parsing and list of documents
    return index;
};
