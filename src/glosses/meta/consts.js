export const namespaces = [
    {
        name: "global",
        description: "Global namespace",
        paths: []
    },
    {
        name: "adone",
        description: "Adone root namespace",
        paths: [
            "index"
        ]
    },
    {
        name: "adone.assertion",
        description: "Assertion utilites",
        paths: [
            "glosses/assertion/index"
        ]
    },
    {
        name: "adone.application",
        description: "Complete application framework",
        paths: [
            "glosses/application/index"
        ]
    },
    {
        name: "adone.collection",
        description: "Implementations of common collections",
        paths: [
            "glosses/collections/index"
        ]
    },
    {
        name: "adone.compressor",
        description: "",
        paths: [
            "glosses/compressors/index"
        ]
    },
    {
        name: "adone.compressor.gz",
        description: "Implementation of gzip compressor",
        paths: [
            "glosses/compressors/gzip"
        ]
    },
    {
        name: "adone.compressor.deflate",
        description: "Implementation of deflate compressor",
        paths: [
            "glosses/compressors/deflate"
        ]
    },
    {
        name: "adone.compressor.brotli",
        description: "Implementation of brotli compressor",
        paths: [
            "glosses/compressors/brotli"
        ]
    },
    {
        name: "adone.compressor.lzma",
        description: "Implementation of lzma compressor",
        paths: [
            "glosses/compressors/lzma"
        ]
    },
    {
        name: "adone.compressor.xz",
        description: "Implementation of xz compressor",
        paths: [
            "glosses/compressors/xz"
        ]
    },
    {
        name: "adone.compressor.snappy",
        description: "Implementation of snappy compressor",
        paths: [
            "glosses/compressors/snappy"
        ]
    },
    {
        name: "adone.archive",
        description: "",
        paths: [
            "glosses/archives/index"
        ]
    },
    {
        name: "adone.configuration",
        description: "",
        paths: [
            "glosses/configurations/index"
        ]
    },
    {
        name: "adone.crypto",
        description: "Common cryptographic utilites",
        paths: [
            "glosses/crypto"
        ]
    },
    {
        name: "adone.crypto.password",
        description: "Password-specific utilites",
        paths: [
            "glosses/crypto/password"
        ]
    },
    {
        name: "adone.cui",
        description: "Console user interface",
        paths: [
            "glosses/cui/index"
        ]
    },
    {
        name: "adone.cui.widget",
        description: "Implementations of CUI widgets",
        paths: [
            "glosses/cui/widgets"
        ]
    },
    {
        name: "adone.data",
        description: "",
        paths: [
            "glosses/data/index"
        ]
    },
    {
        name: "adone.data.base64",
        description: "Implementation of BASE64 serializer",
        paths: [
            "glosses/data/base64"
        ]
    },
    {
        name: "adone.data.json5",
        description: "Implementation of JSON5 serializer",
        paths: [
            "glosses/data/json5"
        ]
    },  
    {
        name: "adone.data.mpak",
        description: "Implementation of MessagePack serializer",
        paths: [
            "glosses/data/mpak"
        ]
    },
    {
        name: "adone.data.bson",
        description: "Implementation of BSON serializer",
        paths: [
            "glosses/data/bson/index"
        ]
    },
    {
        name: "adone.data.yaml",
        description: "Implementation of YAML serializer",
        paths: [
            "glosses/data/yaml/index"
        ]
    },
    {
        name: "adone.database",
        description: "",
        paths: [
            "glosses/databases/index"
        ]
    },
    {
        name: "adone.datetime",
        description: "",
        paths: [
            "glosses/date/exdate"
        ]
    },
    {
        name: "adone.fast",
        description: "File automation streaming templates/transforms",
        paths: [
            "glosses/fast/index"
        ]
    },
    {
        name: "adone.fs",
        description: "",
        paths: [
            "glosses/fs"
        ]
    },
    {
        name: "adone.is",
        description: "Implementation of common predicates",
        paths: [
            "glosses/common/is"
        ]
    },
    {
        name: "adone.js",
        description: "",
        paths: [
            "glosses/js"
        ]
    },
    {
        name: "adone.js.compiler",
        description: "",
        paths: [
            "glosses/js/compiler"
        ]
    },
    {
        name: "adone.js.compiler.core",
        description: "",
        paths: []
    },
    {
        name: "adone.math",
        description: "Implementation of common math classes and primitives",
        paths: [
            "glosses/math/index"
        ]
    },
    {
        name: "adone.meta",
        description: "Meta utilites and implementation of adone-specific inspection",
        paths: [
            "glosses/meta"
        ]
    },
    {
        name: "adone.meta.code",
        description: "Implementation of code analysis and modification toolkit",
        paths: [
            "glosses/meta/code"
        ]
    },
    {
        name: "adone.meta.reflect",
        description: "Metadata reflection",
        paths: [
            "glosses/meta/reflect"
        ]
    },
    {
        name: "adone.metrics",
        description: "Different metrics",
        paths: [
            "glosses/metrics/index"
        ]
    },
    {
        name: "adone.net",
        description: "Implementation of different network abstractions, protocols and associated stuff",
        paths: [
            "glosses/net"
        ]
    },
    {
        name: "adone.net.util",
        description: "Different net utilites",
        paths: [
            "glosses/net/utils"
        ]
    },
    {
        name: "adone.net.http",
        description: "Implementation of http client/server",
        paths: [
            "glosses/net/http"
        ]
    },
    {
        name: "adone.net.ws",
        description: "Implementation of websocket client/server",
        paths: [
            "glosses/net/ws/index"
        ]
    },
    {
        name: "adone.netron",
        description: "Implementation of Netron",
        paths: [
            "glosses/netron/index"
        ]
    },
    {
        name: "adone.netron.decorator",
        description: "",
        paths: [
            "glosses/netron/decorators"
        ]
    },
    {
        name: "adone.netron.ws",
        description: "WebSocket adapter and implementation of netron/peer",
        paths: [
            "glosses/netron/ws"
        ]
    },
    {
        name: "adone.omnitron",
        description: "Omnitron",
        paths: [
            "omnitron"
        ]
    },
    {
        name: "adone.package",
        description: "Adone package",
        paths: [
            "../package.json"
        ]
    },
    {
        name: "adone.promise",
        description: "Promise utilites",
        paths: [
            "glosses/promise"
        ]
    },
    {
        name: "adone.shani",
        description: "Testing framework",
        paths: [
            "glosses/shani/index"
        ]
    },
    {
        name: "adone.semver",
        description: "Semantic version parser",
        paths: [
            "glosses/semver"
        ]
    },
    {
        name: "adone.shell",
        description: "Implementation of some shell utilites",
        paths: [
            "glosses/shell/index"
        ]
    },
    {
        name: "adone.sourcemap",
        description: "Sourcemaps",
        paths: [
            "glosses/sourcemap/index"
        ]
    },
    {
        name: "adone.stream",
        description: "Different streams and stream utilites",
        paths: [
            "glosses/streams/index"
        ]
    },
    {
        name: "adone.tag",
        description: "",
        paths: []
    },
    {
        name: "adone.transform",
        description: "",
        paths: []
    },
    {
        name: "adone.templating",
        description: "Template engines",
        paths: [
            "glosses/templating/index"
        ]
    },
    {
        name: "adone.util",
        description: "",
        paths: [
            "glosses/utils/index"
        ]
    },
    {
        name: "adone.diff",
        description: "Text differencing",
        paths: [
            "glosses/diff/index"
        ]
    },
    {
        name: "adone.util.uuid",
        description: "UUID v1/v4",
        paths: [
            "glosses/utils/uuid"
        ]
    },
    {
        name: "adone.vendor",
        description: "",
        paths: [
            "glosses/vendor"
        ]
    },
    {
        name: "adone.vendor.lodash",
        description: "",
        paths: [
            "glosses/vendor/lodash"
        ]
    },
    {
        name: "adone.x",
        description: "Exceptions and helpers",
        paths: [
            "glosses/common/x"
        ]
    },
    {
        name: "adone.specter",
        description: "SPECification TERm",
        paths: [
            "glosses/specter/index"
        ]
    },
    {
        name: "adone.std",
        description: "References to nodejs modules",
        paths: []
    },
    {
        name: "adone.text",
        description: "Text utilites",
        paths: [
            "glosses/text/index"
        ]
    },
    {
        name: "adone.text.ansi",
        description: "Common ansi utilites",
        paths: [
            "glosses/text/index"
        ]
    },
    {
        name: "adone.text.pretty",
        description: "Implementation of pretty-printers",
        paths: [
            "glosses/text/pretties"
        ]
    },
    {
        name: "adone.text.unicode",
        description: "Common unicode utilites",
        paths: [
            "glosses/text/unicode"
        ]
    },
    {
        name: "adone.text.unicode.symbol",
        description: "Set of useful unicode symbols",
        paths: [
            "glosses/text/unicode"
        ]
    },
    {
        name: "adone.text.spinner",
        description: "Text spinners",
        paths: [
            "glosses/text/spinners"
        ]
    },
    {
        name: "adone.text.table",
        description: "Implementation of cli table",
        paths: [
            "glosses/text/table"
        ]
    },
    {
        name: "adone.virt",
        description: "Some stuff for virtualization",
        paths: [
            "glosses/virt/index"
        ]
    },
    {
        name: "adone.vault",
        description: "Vault",
        paths: [
            "glosses/vault/index"
        ]
    }
];
