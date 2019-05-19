
// no idea what these regular expressions do,
// but i extracted it from https://github.com/yahoo/js-module-formats/blob/master/index.js#L18
const ES6ImportExportRegExp = /(?:^\s*|[}{\(\);,\n]\s*)(import[\s+|{]['"]|(import|module)[\s+|*|{][^"'\(\)\n;]+[\s|}]+from\s*['"]|export[\s+|{](\*|\{|default|function|var|const|let|[_$a-zA-Z\xA0-\uFFFF][_$a-zA-Z0-9\xA0-\uFFFF]*))/;

const ES6AliasRegExp = /(?:^\s*|[}{\(\);,\n]\s*)(export\s*\*\s*from\s*(?:'([^']+)'|"([^"]+)"))/;

export default (sauce) => ES6ImportExportRegExp.test(sauce) || ES6AliasRegExp.test(sauce);
