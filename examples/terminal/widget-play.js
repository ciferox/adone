const screen = new adone.terminal.Screen({
    dump: `${__dirname}/logs/play.log`,
    smartCSR: true,
    warnings: true
});

const frames = require(`${__dirname}/data/frames.json`);

const timer = setInterval(() => {
    if (!frames.length) {
        clearInterval(timer);
        return screen.destroy();
    }
    process.stdout.write(frames.shift());
}, 100);
