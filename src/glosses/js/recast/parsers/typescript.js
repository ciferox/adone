import { parser } from "./babel";
import getBabelOptions from "./_babel_options";
// This module is suitable for passing as options.parser when calling
// recast.parse to process TypeScript code:
//
//   const ast = recast.parse(source, {
//     parser: require("recast/parsers/typescript")
//   });
//
export function parse(source, options) {
    const babelOptions = getBabelOptions(options);
    babelOptions.plugins.push("typescript");
    return parser.parse(source, babelOptions);
}
;
