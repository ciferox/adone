const { is } = adone;

export default {
    "with a float number": {
        "is.float()": () => {
            is.float(3.1415);
        },
        "% 1": () => {
            3.1415 % 1 === 0;
        }
    },
    "with an integer": {
        "is.float()": () => {
            is.float(3);
        },
        "% 1": () => {
            3 % 1 === 0;
        }
    }
};
