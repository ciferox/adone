// import adone from "adone";
const screen = new adone.cui.Screen();
const log = new adone.cui.widget.ExLog(
    {
        fg: "green"
        , label: "Server Log"
        , height: "20%"
        , tags: true
        , border: { type: "line", fg: "cyan" }
    });

screen.append(log);

let i = 0;
setInterval(() => {
    log.log(`new {red-fg}log{/red-fg} line ${i++}`);
}, 500);

screen.render();
