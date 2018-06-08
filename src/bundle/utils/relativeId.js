import { basename, extname, isAbsolute, relative } from './path';
export function getAliasName(resolved, unresolved) {
    let alias = basename(unresolved || resolved);
    const ext = extname(resolved);
    if (alias.endsWith(ext))
        alias = alias.substr(0, alias.length - ext.length);
    return alias;
}
export default function relativeId(id) {
    if (typeof process === 'undefined' || !isAbsolute(id))
        return id;
    return relative(process.cwd(), id);
}
export function isPlainName(name) {
    // not starting with "./", "/". "../"
    if (name[0] === '/' ||
        (name[1] === '.' && (name[2] === '/' || (name[2] === '.' && name[3] === '/'))))
        return false;
    // not a URL
    if (name.indexOf(':') !== -1)
        return false;
    return true;
}
