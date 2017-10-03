const {
    is
} = adone;

const diffArray = (a, b) => {
    if (!is.array(b)) {
        return a.slice();
    }

    const tlen = b.length;
    const olen = a.length;
    let idx = -1;
    const arr = [];

    while (++idx < olen) {
        const ele = a[idx];

        let hasEle = false;
        for (let i = 0; i < tlen; i++) {
            const val = b[i];

            if (ele === val) {
                hasEle = true;
                break;
            }
        }

        if (hasEle === false) {
            arr.push(ele);
        }
    }
    return arr;
};

export default function diff(arr, ...arrays) {
    let a = arr;
    for (const b of arrays) {
        a = diffArray(a, b);
    }
    return a;
}
