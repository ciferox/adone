export default function isLocalId(id) {
    return (/^_local/).test(id);
}
