// import adone from "adone";

const screen = new adone.cui.Screen({
    dump: `${__dirname}/logs/insert.log`,
    warnings: true
});

const box = new adone.cui.widget.Element({
    parent: screen,
    //align: 'center',
    style: {
        bg: "blue"
    },
    height: 5,
    top: "center",
    left: 0,
    width: 12,
    tags: true,
    content: "{yellow-fg}line{/yellow-fg}{|}1"
    //valign: 'middle'
});

screen.render();

box.insertBottom("{yellow-fg}line{/yellow-fg}{|}2");
box.insertTop("{yellow-fg}line{/yellow-fg}{|}0");

screen.render();

setTimeout(() => {
    box.deleteTop();
    screen.render();
}, 2000);

screen.key("q", () => {
    screen.destroy();
});
