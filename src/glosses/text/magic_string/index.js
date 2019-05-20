import MagicString from "./MagicString.js";

export default MagicString;

adone.lazify({
    Bundle: "./Bundle.js",
    SourceMap: "./SourceMap.js"
}, MagicString, require);

