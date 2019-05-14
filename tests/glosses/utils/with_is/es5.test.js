const {
    Animal,
    Plant,
    Mammal,
    Algae,

    ExplicitWithoutNew,
    ImplicitWithoutNew,
    ImplicitExplicitWithoutNew
} = require("./fixtures/es5");

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

describe("new operator", () => {
    it("should work on explicit without-new handling", () => {
        const instance = new ExplicitWithoutNew();
        const instance2 = ExplicitWithoutNew(); // eslint-disable-line new-cap

        expect(Object.getPrototypeOf(instance)).to.be.equal(ExplicitWithoutNew.prototype);
        expect(Object.getPrototypeOf(Object.getPrototypeOf(instance))).to.be.equal(ExplicitWithoutNew.WrappedClass.prototype);
        expect(Object.getPrototypeOf(instance2)).to.be.equal(ExplicitWithoutNew.prototype);
        expect(Object.getPrototypeOf(Object.getPrototypeOf(instance2))).to.be.equal(ExplicitWithoutNew.WrappedClass.prototype);

        expect(instance instanceof ExplicitWithoutNew).to.be.equal(true);
        expect(instance instanceof ExplicitWithoutNew.WrappedClass).to.be.equal(true);
        expect(instance2 instanceof ExplicitWithoutNew).to.be.equal(true);
        expect(instance2 instanceof ExplicitWithoutNew.WrappedClass).to.be.equal(true);

        expect(instance.getLabel()).to.be.equal("ExplicitWithoutNew");
        expect(instance2.getLabel()).to.be.equal("ExplicitWithoutNew");
    });

    it("should work on implicit without-new handling", () => {
        const instance = new ImplicitWithoutNew();
        const instanceNoNew = ImplicitWithoutNew(); // eslint-disable-line new-cap

        expect(Object.getPrototypeOf(instance)).to.be.equal(ImplicitWithoutNew.prototype);
        expect(Object.getPrototypeOf(Object.getPrototypeOf(instance))).to.be.equal(ImplicitWithoutNew.WrappedClass.prototype);
        expect(Object.getPrototypeOf(instanceNoNew)).to.be.equal(ImplicitWithoutNew.prototype);
        expect(Object.getPrototypeOf(Object.getPrototypeOf(instanceNoNew))).to.be.equal(ImplicitWithoutNew.WrappedClass.prototype);

        expect(instance instanceof ImplicitWithoutNew).to.be.equal(true);
        expect(instance instanceof ImplicitWithoutNew.WrappedClass).to.be.equal(true);
        expect(instanceNoNew instanceof ImplicitWithoutNew).to.be.equal(true);
        expect(instanceNoNew instanceof ImplicitWithoutNew.WrappedClass).to.be.equal(true);

        expect(instance.getLabel()).to.be.equal("ImplicitWithoutNew");
        expect(instanceNoNew.getLabel()).to.be.equal("ImplicitWithoutNew");
    });

    it("should work on explicit & implicit without-new handling", () => {
        const instance = new ImplicitExplicitWithoutNew();
        const instanceNoNew = ImplicitExplicitWithoutNew(); // eslint-disable-line new-cap

        expect(Object.getPrototypeOf(instance)).to.be.equal(ImplicitExplicitWithoutNew.prototype);
        expect(Object.getPrototypeOf(Object.getPrototypeOf(instance))).to.be.equal(ImplicitExplicitWithoutNew.WrappedClass.prototype);
        expect(Object.getPrototypeOf(instanceNoNew)).to.be.equal(ImplicitExplicitWithoutNew.prototype);
        expect(Object.getPrototypeOf(Object.getPrototypeOf(instanceNoNew))).to.be.equal(ImplicitExplicitWithoutNew.WrappedClass.prototype);

        expect(instance instanceof ImplicitExplicitWithoutNew).to.be.equal(true);
        expect(instance instanceof ImplicitExplicitWithoutNew.WrappedClass).to.be.equal(true);
        expect(instanceNoNew instanceof ImplicitExplicitWithoutNew).to.be.equal(true);
        expect(instanceNoNew instanceof ImplicitExplicitWithoutNew.WrappedClass).to.be.equal(true);

        expect(instance.getLabel()).to.be.equal("ImplicitExplicitWithoutNew");
        expect(instanceNoNew.getLabel()).to.be.equal("ImplicitExplicitWithoutNew");
    });
});
