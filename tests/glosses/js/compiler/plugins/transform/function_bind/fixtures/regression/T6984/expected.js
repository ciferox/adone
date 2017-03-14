function one() {}
function two() {}

class Test1 {
  one() {
    two.call(one, 1, 2);
  }

  two() {
    two.call(one, 1, 2);
  }
}
