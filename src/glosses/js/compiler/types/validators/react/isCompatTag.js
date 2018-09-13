// @flow
export default function isCompatTag(tagName?: string): boolean {
    // Must start with a lowercase ASCII letter
    return Boolean(tagName) && /^[a-z]/.test(tagName);
}
