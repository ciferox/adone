// @flow

const { mergeWith } = adone.vendor.lodash;

export default function (dest?: Object, src?: Object): ?Object {
    if (!dest || !src) {
        return;
    }

    return mergeWith(dest, src, (a, b) => {
        if (b && Array.isArray(a)) {
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
