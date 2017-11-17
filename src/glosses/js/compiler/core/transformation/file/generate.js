// @flow

import type { PluginPasses } from "../../config";
// import convertSourceMap, { type SourceMap } from "convert-source-map";
// import sourceMap from "source-map";
// import generate from "@babel/generator";

import type File from "./file";

const {
  js: { compiler: { generate } },
  sourcemap
} = adone;

export default function generateCode(
  pluginPasses: PluginPasses,
  file: File,
): {
  outputCode: string,
  outputMap: SourceMap | null,
} {
  const { opts, ast, shebang, code, inputMap } = file;

  const results = [];
  for (const plugins of pluginPasses) {
    for (const plugin of plugins) {
      const { generatorOverride } = plugin;
      if (generatorOverride) {
        const result = generatorOverride(
          ast,
          opts.generatorOpts,
          code,
          generate,
        );

        if (result !== undefined) results.push(result);
      }
    }
  }

  let result;
  if (results.length === 0) {
    result = generate(ast, opts.generatorOpts, code);
  } else if (results.length === 1) {
    result = results[0];

    if (typeof result.then === "function") {
      throw new Error(
        `You appear to be using an async parser plugin, ` +
          `which your current version of Babel does not support. ` +
          `If you're using a published plugin, ` +
          `you may need to upgrade your @babel/core version.`,
      );
    }
  } else {
    throw new Error("More than one plugin attempted to override codegen.");
  }

  let { code: outputCode, map: outputMap } = result;

  if (shebang) {
    // add back shebang
    outputCode = `${shebang}\n${outputCode}`;
  }

  if (outputMap && inputMap) {
    outputMap = mergeSourceMap(inputMap.toObject(), outputMap);
  }

  if (opts.sourceMaps === "inline" || opts.sourceMaps === "both") {
    outputCode += "\n" + sourcemap.convert.fromObject(outputMap).toComment();
  }

  if (opts.sourceMaps === "inline") {
    outputMap = null;
  }

  return { outputCode, outputMap };
}

function mergeSourceMap(inputMap: SourceMap, map: SourceMap): SourceMap {
  const inputMapConsumer = sourcemap.createConsumer(inputMap);
  const outputMapConsumer = sourcemap.createConsumer(map);

  const mergedGenerator = sourcemap.createGenerator({
    file: inputMapConsumer.file,
    sourceRoot: inputMapConsumer.sourceRoot,
  });

  // This assumes the output map always has a single source, since Babel always compiles a
  // single source file to a single output file.
  const source = outputMapConsumer.sources[0];

  inputMapConsumer.eachMapping(function(mapping) {
    const generatedPosition = outputMapConsumer.generatedPositionFor({
      line: mapping.generatedLine,
      column: mapping.generatedColumn,
      source: source,
    });
    if (generatedPosition.column != null) {
      mergedGenerator.addMapping({
        source: mapping.source,

        original:
          mapping.source == null
            ? null
            : {
                line: mapping.originalLine,
                column: mapping.originalColumn,
              },

        generated: generatedPosition,

        name: mapping.name,
      });
    }
  });

  const mergedMap = mergedGenerator.toJSON();
  inputMap.mappings = mergedMap.mappings;
  return inputMap;
}
