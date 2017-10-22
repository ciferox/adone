const array = [null, "once", "twice", "thrice"];

export default function timesInWords(count) {
    return array[count] || `${count || 0} times`;
}
