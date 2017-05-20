console.log(new Date().getTime());
setTimeout(() => {
    console.log(new Date().getTime());
    process.exit();
}, 500);
