export const absolutePath = /^(?:\/|(?:[A-Za-z]:)?[\\|/])/;
export const relativePath = /^\.?\.\//;

export const isAbsolute = (path) => absolutePath.test(path);
export const isRelative = (path) => relativePath.test(path);
export const normalize = (path) => path.replace(/\\/g, "/");
export { basename, dirname, extname, relative, resolve } from "path";
