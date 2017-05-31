const { is } = adone;
const { prototype: { every } } = Array;


export default function calledInOrder(...spies) {
    const callMap = {};

    const hasCallsLeft = (spy) => {
        if (is.undefined(callMap[spy.id])) {
            callMap[spy.id] = 0;
        }

        return callMap[spy.id] < spy.callCount;
    };

    if (spies.length === 1) {
        [spies] = spies;
    }

    return every.call(spies, (spy, i) => {
        let calledBeforeNext = true;

        if (i !== spies.length - 1) {
            calledBeforeNext = spy.calledBefore(spies[i + 1]);
        }

        if (hasCallsLeft(spy) && calledBeforeNext) {
            callMap[spy.id] += 1;
            return true;
        }

        return false;
    });
}
