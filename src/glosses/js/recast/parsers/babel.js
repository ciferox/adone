import getBabelOptions from "./_babel_options";
// Prefer the new @babel/parser package, but fall back to babylon if
// that's what's available.
export const parser = function () {
    try {
        return require("@babel/parser");
    }
    catch (e) {
        return require("babylon");
    }
}();
// This module is suitable for passing as options.parser when calling
// recast.parse to process JavaScript code with Babel:
//
//   const ast = recast.parse(source, {
//     parser: require("recast/parsers/babel")
//   });
//
export function parse(source, options) {
    const babelOptions = getBabelOptions(options);
    babelOptions.plugins.push("jsx", "flow");
    return parser.parse(source, babelOptions);
}
;
