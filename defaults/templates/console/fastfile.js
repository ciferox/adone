
export const config = {
    type: "context"
};

export const files = [
    "./fast/tasks.js",
    "./fast/data.js"
];

export const commands = {
    "clean": {
        task: "$$$Clean",
        description: "Clean all destination directories"
    },
    "build": {
        task: "$$$Build",
        description: "Build project sources"
    },
    "watch": {
        task: "$$$Watch",
        description: "Watch project sources and rebuild changed files"
    },
    "default": {
        task: "$$$Default",
        aliases: [""],
        description: "Clean, build and start watching of project sources"
    }
};