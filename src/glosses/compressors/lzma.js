import { createStream, singleStringCoding, native } from "./xz";

const lzma = {
    asyncCodeAvailable: native.asyncCodeAvailable,
    versionNumber: native.versionNumber,
    versionString: native.versionString,
    checkIsSupported: native.checkIsSupported,
    checkSize: native.checkSize,
    filterEncoderIsSupported: native.filterEncoderIsSupported,
    filterDecoderIsSupported: native.filterDecoderIsSupported,
    mfIsSupported: native.mfIsSupported,
    modeIsSupported: native.modeIsSupported,
    rawEncoderMemusage: native.rawEncoderMemusage,
    rawDecoderMemusage: native.rawDecoderMemusage,
    easyEncoderMemusage: native.easyEncoderMemusage,
    easyDecoderMemusage: native.easyDecoderMemusage,

    createStream,

    CHECK_CRC32: native.CHECK_CRC32,
    CHECK_CRC64: native.CHECK_CRC64,
    CHECK_NONE: native.CHECK_NONE,
    CHECK_SHA256: native.CHECK_SHA256,

    LZMA_TELL_NO_CHECK: native.LZMA_TELL_NO_CHECK,
    LZMA_TELL_UNSUPPORTED_CHECK: native.LZMA_TELL_UNSUPPORTED_CHECK,
    LZMA_TELL_ANY_CHECK: native.LZMA_TELL_ANY_CHECK,
    LZMA_CONCATENATED: native.LZMA_CONCATENATED,

    FILTERS_MAX: native.FILTERS_MAX,
    FILTER_ARM: native.FILTER_ARM,
    FILTER_ARMTHUMB: native.FILTER_ARMTHUMB,
    FILTER_IA64: native.FILTER_IA64,
    FILTER_POWERPC: native.FILTER_POWERPC,
    FILTER_SPARC: native.FILTER_SPARC,
    FILTER_X86: native.FILTER_X86,
    FILTER_DELTA: native.FILTER_DELTA,
    FILTER_LZMA1: native.FILTER_LZMA1,
    FILTER_LZMA2: native.FILTER_LZMA2,

    PRESET_EXTREME: native.PRESET_EXTREME,
    PRESET_DEFAULT: native.PRESET_DEFAULT,
    PRESET_LEVEL_MASK: native.PRESET_LEVEL_MASK,

    MF_HC3: native.MF_HC3,
    MF_HC4: native.MF_HC4,
    MF_BT2: native.MF_BT2,
    MF_BT3: native.MF_BT3,
    MF_BT4: native.MF_BT4,

    MODE_FAST: native.MODE_FAST,
    MODE_NORMAL: native.MODE_NORMAL,

    STREAM_HEADER_SIZE: native.STREAM_HEADER_SIZE
};

lzma.compress = (buf, options = {}) => {
    return singleStringCoding(lzma.compress.stream(options), buf);
};

lzma.compress.stream = (options = {}) => {
    return createStream("aloneEncoder", options);
};

// eslint-disable-next-line no-unused-vars
lzma.compress.sync = (buf, options = {}) => {
    throw new adone.x.NotImplemented();
};

lzma.decompress = (buf, options = {}) => {
    return singleStringCoding(lzma.decompress.stream(options), buf);
};

lzma.decompress.stream = (options = {}) => {
    return createStream("aloneDecoder", options);
};

// eslint-disable-next-line no-unused-vars
lzma.decompress.sync = (buf, options = {}) => {
    throw new adone.x.NotImplemented();
};

export default lzma;
