/*
this seems to be not only shorter, but faster than
string.replace(/\\/g, '\\\\').
          replace(/\u0008/g, '\\b').
          replace(/\t/g, '\\t').
          replace(/\n/g, '\\n').
          replace(/\f/g, '\\f').
          replace(/\r/g, '\\r').
          replace(/'/g, '\\\'').
          replace(/"/g, '\\"');
or string.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&")
see http://jsperf.com/string-escape-regexp-vs-json-stringify
*/
export const srcEscape = (str) => {
    const a = {};
    a[str] = 1;
    return JSON.stringify(a).slice(1, -3);
};
