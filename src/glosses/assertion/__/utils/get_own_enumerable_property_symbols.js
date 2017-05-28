export default function getOwnEnumerablePropertySymbols(obj) {
    return Object.getOwnPropertySymbols(obj).filter((sym) => {
        return Object.getOwnPropertyDescriptor(obj, sym).enumerable;
    });
}
