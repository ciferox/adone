export default function getEnumerableProperties(object) {
    const result = [];
    for (const name in object) {
        result.push(name);
    }
    return result;
}
