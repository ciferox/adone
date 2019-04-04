const __ = adone.lazify({
    SourceMapGenerator: "./source_map_generator",
    SourceMapConsumer: ["./source_map_consumer", (mod) => mod.SourceMapConsumer],
    BasicSourceMapConsumer: ["./source_map_consumer", (mod) => mod.BasicSourceMapConsumer],
    IndexedSourceMapConsumer: ["./source_map_consumer", (mod) => mod.IndexedSourceMapConsumer],
    SourceNode: "./source_node",
    convert: "./convert",
    inline: "./inline",
    support: "./support"
}, adone.asNamespace(exports), require);

const {
    is
} = adone;

export const createConsumer = (sourceMap) => {
    if (is.string(sourceMap)) {
        sourceMap = JSON.parse(sourceMap.replace(/^\)\]\}'/, ""));
    }

    return is.nil(sourceMap.sections)
        ? new __.BasicSourceMapConsumer(sourceMap)
        : new __.IndexedSourceMapConsumer(sourceMap);
};
