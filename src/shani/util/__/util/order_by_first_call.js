export default function orderByFirstCall(spies) {
    return spies.sort((a, b) => {
        // uuid, won't ever be equal
        const aCall = a.getCall(0);
        const bCall = b.getCall(0);
        const aId = aCall && aCall.callId || -1;
        const bId = bCall && bCall.callId || -1;

        return aId < bId ? -1 : 1;
    });
}
