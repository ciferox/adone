const {
    path
} = adone;

export const processOptions = (options) => {
    return {
        mode: 0o777 & (~process.umask()),
        ...options
    };
};

export const checkPath = (pth) => {
    if (process.platform === "win32") {
        const pathHasInvalidWinCharacters = /[<>:"|?*]/.test(pth.replace(path.parse(pth).root, ""));

        if (pathHasInvalidWinCharacters) {
            const error = new Error(`Path contains invalid characters: ${pth}`);
            error.code = "EINVAL";
            throw error;
        }
    }
};
