export default function toString() {
    if (this.getCall && this.callCount) {
        let i = this.callCount;

        while (i--) {
            const thisValue = this.getCall(i).thisValue;

            for (const prop in thisValue) {
                if (thisValue[prop] === this) {
                    return prop;
                }
            }
        }
    }

    return this.displayName || "fake";
}
