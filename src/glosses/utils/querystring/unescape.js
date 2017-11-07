export default function unescape(str) {
    try {
        return decodeURIComponent(str.replace(/\+/g, " "));
    } catch (e) {
        return str;
    }
}
