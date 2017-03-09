const f = () => {
    // do nothing
};

export default (() => {
    const suites = {};

    for (const n of [0, 1, 2, 3, 5, 8]) {
        const arr = [...new Array(n)].map((_, i) => i);

        suites[`length of ${n}`] = {
            apply: () => {
                f.apply(null, arr);
            },
            spread: () => {
                f(...arr);
            },
            "explicit length check": () => {
                switch (arr.length) {
                    case 0: {
                        f();
                        break;
                    }
                    case 1: {
                        f(arr[0]);
                        break;
                    }
                    case 2: {
                        f(arr[0], arr[1]);
                        break;
                    }
                    case 3: {
                        f(arr[0], arr[1], arr[2]);
                        break;
                    }
                    case 4: {
                        f(arr[0], arr[1], arr[2], arr[3]);
                        break;
                    }
                    case 5: {
                        f(arr[0], arr[1], arr[2], arr[3], arr[4]);
                        break;
                    }
                    default: {
                        f.apply(null, arr);
                    }
                }
            },
            "explicit length check using the ternary operator": () => {
                arr.length === 0 ? f() :
                arr.length === 1 ? f(arr[0]) :
                arr.length === 2 ? f(arr[0], arr[1]) :
                arr.length === 3 ? f(arr[0], arr[1], arr[2]) :
                arr.length === 4 ? f(arr[0], arr[1], arr[2], arr[3]) :
                arr.length === 5 ? f(arr[0], arr[1], arr[2], arr[3], arr[4]) :
                f.apply(null, arr);
            },
            "explicit length check using the ternary operator with predefined length": () => {
                const { length } = arr;
                length === 0 ? f() :
                length === 1 ? f(arr[0]) :
                length === 2 ? f(arr[0], arr[1]) :
                length === 3 ? f(arr[0], arr[1], arr[2]) :
                length === 4 ? f(arr[0], arr[1], arr[2], arr[3]) :
                length === 5 ? f(arr[0], arr[1], arr[2], arr[3], arr[4]) :
                f.apply(null, arr);
            }
        };
    }

    return suites;
})();
