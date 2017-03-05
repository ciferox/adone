class Foo {}
Object.defineProperty(Foo, "bar", {
  enumerable: true,
  writable: true,
  value: "foo"
});
