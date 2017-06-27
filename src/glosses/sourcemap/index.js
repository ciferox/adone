adone.lazify({
    convert: "./convert",
    support: "./support",
    createConsumer: ["./consumer", (x) => x.createConsumer],
    Consumer: ["./consumer", (x) => x.SourceMapConsumer],
    IndexedConsumer: ["./consumer", (x) => x.IndexedSourceMapConsumer],
    BasicConsumer: ["./consumer", (x) => x.BasicSourceMapConsumer],
    createGenerator: ["./generator", (x) => x.createGenerator],
    Generator: ["./generator", (x) => x.SourceMapGenerator],
    Node: "./node",
    MappingList: "./mapping_list",
    util: "./util",
    inline: "./inline"
}, exports, require);
