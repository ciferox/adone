class MyClass {
  constructor() {
    Object.defineProperty(this, "myAsyncMethod", {
      enumerable: true,
      writable: true,
      value: async () => {
        console.log(this);
      }
    });
  }

}

(class MyClass2 {
  constructor() {
    Object.defineProperty(this, "myAsyncMethod", {
      enumerable: true,
      writable: true,
      value: async () => {
        console.log(this);
      }
    });
  }

});

export default class MyClass3 {
  constructor() {
    Object.defineProperty(this, "myAsyncMethod", {
      enumerable: true,
      writable: true,
      value: async () => {
        console.log(this);
      }
    });
  }

}
