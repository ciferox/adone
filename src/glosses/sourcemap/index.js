const __ = adone.lazify({
    SourceMapGenerator: "./source_map_generator",
    SourceMapConsumer: ["./source_map_consumer", "SourceMapConsumer"],
    BasicSourceMapConsumer: ["./source_map_consumer", "BasicSourceMapConsumer"],
    IndexedSourceMapConsumer: ["./source_map_consumer", "IndexedSourceMapConsumer"],
    SourceNode: "./source_node",
    codec: "./codec",
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
