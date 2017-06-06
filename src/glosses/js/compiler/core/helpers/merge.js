const { is, vendor: { lodash: { mergeWith } } } = adone;

export default function (dest, src) {
    if (!dest || !src) {
        return;
    }

    return mergeWith(dest, src, (a, b) => {
        if (b && is.array(a)) {
            const newArray = b.slice(0);

            for (const item of a) {
                if (newArray.indexOf(item) < 0) {
                    newArray.push(item);
                }
            }

            return newArray;
        }
    });
}
