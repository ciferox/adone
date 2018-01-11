const { xz } = adone.compressor;

const lzma = {
    asyncCodeAvailable: xz.asyncCodeAvailable,
    versionNumber: xz.versionNumber,
    versionString: xz.versionString,
    checkIsSupported: xz.checkIsSupported,
    checkSize: xz.checkSize,
    filterEncoderIsSupported: xz.filterEncoderIsSupported,
    filterDecoderIsSupported: xz.filterDecoderIsSupported,
    mfIsSupported: xz.mfIsSupported,
    modeIsSupported: xz.modeIsSupported,
    rawEncoderMemusage: xz.rawEncoderMemusage,
    rawDecoderMemusage: xz.rawDecoderMemusage,
    easyEncoderMemusage: xz.easyEncoderMemusage,
    easyDecoderMemusage: xz.easyDecoderMemusage,

    createStream: xz.createStream,

    CHECK_CRC32: xz.CHECK_CRC32,
    CHECK_CRC64: xz.CHECK_CRC64,
    CHECK_NONE: xz.CHECK_NONE,
    CHECK_SHA256: xz.CHECK_SHA256,

    LZMA_TELL_NO_CHECK: xz.LZMA_TELL_NO_CHECK,
    LZMA_TELL_UNSUPPORTED_CHECK: xz.LZMA_TELL_UNSUPPORTED_CHECK,
    LZMA_TELL_ANY_CHECK: xz.LZMA_TELL_ANY_CHECK,
    LZMA_CONCATENATED: xz.LZMA_CONCATENATED,

    FILTERS_MAX: xz.FILTERS_MAX,
    FILTER_ARM: xz.FILTER_ARM,
    FILTER_ARMTHUMB: xz.FILTER_ARMTHUMB,
    FILTER_IA64: xz.FILTER_IA64,
    FILTER_POWERPC: xz.FILTER_POWERPC,
    FILTER_SPARC: xz.FILTER_SPARC,
    FILTER_X86: xz.FILTER_X86,
    FILTER_DELTA: xz.FILTER_DELTA,
    FILTER_LZMA1: xz.FILTER_LZMA1,
    FILTER_LZMA2: xz.FILTER_LZMA2,

    PRESET_EXTREME: xz.PRESET_EXTREME,
    PRESET_DEFAULT: xz.PRESET_DEFAULT,
    PRESET_LEVEL_MASK: xz.PRESET_LEVEL_MASK,

    MF_HC3: xz.MF_HC3,
    MF_HC4: xz.MF_HC4,
    MF_BT2: xz.MF_BT2,
    MF_BT3: xz.MF_BT3,
    MF_BT4: xz.MF_BT4,

    MODE_FAST: xz.MODE_FAST,
    MODE_NORMAL: xz.MODE_NORMAL,

    STREAM_HEADER_SIZE: xz.STREAM_HEADER_SIZE,

    compress: (buf, options = {}) => {
        return xz.singleStringCoding(lzma.compressStream(options), buf);
    },
    compressStream: (options = {}) => {
        return xz.createStream("aloneEncoder", options);
    },
    compressSync: (/*buf, options = {}*/) => {
        throw new adone.x.NotImplemented();
    },
    decompress: (buf, options = {}) => {
        return xz.singleStringCoding(lzma.decompressStream(options), buf);
    },
    decompressStream: (options = {}) => {
        return xz.createStream("aloneDecoder", options);
    },
    decompressSync: (/*buf, options = {}*/) => {
        throw new adone.x.NotImplemented();
    }
};

export default adone.asNamespace(lzma);
