/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

// @flow



export default adone.lazify({
    SourceMapGenerator: ["./source-map-generator", (mod) => mod.SourceMapGenerator],
    SourceMapConsumer: ["./source-map-consumer", (mod) => mod.SourceMapConsumer],
    SourceNode: ["./source-node", (mod) => mod.SourceNode],
    convert: "./convert"
}, null, require);
