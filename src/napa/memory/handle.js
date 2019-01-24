const {
    is
} = adone;

/// <summary> nullptr. </summary>
export const EMPTY_HANDLE = [0, 0];

/// <summary> Tell if pointer is nullptr. </summary>
export const isEmpty = function (handle) {
    return is.nil(handle) || (handle[0] === 0 && handle[1] === 0);
};

/// <summary> Tell if a pointer has type information. </summary>
export const getTypeHash = function (handle) {
    return handle.length === 3 ? handle[2] : 0;
};
