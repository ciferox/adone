const {
    Animal,
    Plant,
    Mammal,
    Algae
} = require("./fixtures/es6");

it("should setup the prototype chain correctly", () => {
    const animal = new Animal("mammal");
    const plant = new Plant("algae");

    expect(Object.getPrototypeOf(animal)).to.be.equal(Animal.prototype);
    expect(Object.getPrototypeOf(Object.getPrototypeOf(animal))).to.be.equal(Animal.WrappedClass.prototype);
    expect(Object.getPrototypeOf(animal)).not.to.be.equal(Plant.prototype);
    expect(Object.getPrototypeOf(plant)).to.be.equal(Plant.prototype);
    expect(Object.getPrototypeOf(Object.getPrototypeOf(plant))).to.be.equal(Plant.WrappedClass.prototype);
    expect(Object.getPrototypeOf(plant)).not.to.be.equal(Animal.prototype);

    expect(animal instanceof Animal).to.be.equal(true);
    expect(animal instanceof Animal.WrappedClass).to.be.equal(true);
    expect(animal instanceof Plant).to.be.equal(false);
    expect(plant instanceof Plant).to.be.equal(true);
    expect(plant instanceof Plant.WrappedClass).to.be.equal(true);
    expect(plant instanceof Animal).to.be.equal(false);

    expect(animal.getType()).to.be.equal("mammal");
    expect(plant.getType()).to.be.equal("algae");
});

it("should have a custom toStringTag", () => {
    expect(Object.prototype.toString.call(new Animal())).to.be.equal("[object Animal]");
    expect(Object.prototype.toString.call(new Plant())).to.be.equal("[object Plant]");
});

describe("is<className> method", () => {
    it("should add a working is<className> static method", () => {
        const animal = new Animal("mammal");
        const plant = new Plant("algae");

        expect(Animal.isAnimal(animal)).to.be.equal(true);
        expect(Animal.isAnimal(plant)).to.be.equal(false);
        expect(Plant.isPlant(plant)).to.be.equal(true);
        expect(Plant.isPlant(animal)).to.be.equal(false);
    });

    it("should not crash if `null` or `undefined` is passed to is<ClassName>", () => {
        expect(Animal.isAnimal(null)).to.be.equal(false);
        expect(Animal.isAnimal(undefined)).to.be.equal(false);
    });

    it("should work correctly for deep inheritance scenarios", () => {
        const mammal = new Mammal();
        const algae = new Algae();

        expect(Mammal.isMammal(mammal)).to.be.equal(true);
        expect(Animal.isAnimal(mammal)).to.be.equal(true);
        expect(Mammal.isMammal(algae)).to.be.equal(false);
        expect(Animal.isAnimal(algae)).to.be.equal(false);

        expect(Algae.isAlgae(algae)).to.be.equal(true);
        expect(Plant.isPlant(algae)).to.be.equal(true);
        expect(Algae.isAlgae(mammal)).to.be.equal(false);
        expect(Plant.isPlant(mammal)).to.be.equal(false);
    });
});
