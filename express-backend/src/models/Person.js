/**
 * Person — abstract base class.
 *
 * OOP concepts demonstrated:
 *  - ABSTRACTION: cannot be instantiated directly; defines the shape of any
 *    identifiable participant (voter, admin, candidate) without specifying
 *    their role-specific behavior.
 *  - ENCAPSULATION: id/name are stored on the instance and exposed via
 *    getters, keeping the internal representation private to the class.
 */
class Person {
  #id;
  #name;

  constructor(id, name) {
    if (new.target === Person) {
      throw new Error("Person is abstract and cannot be instantiated directly.");
    }
    this.#id = id;
    this.#name = name;
  }

  getId() {
    return this.#id;
  }

  getName() {
    return this.#name;
  }

  // Abstract — every subclass must declare its role.
  getRole() {
    throw new Error("getRole() must be implemented by subclass.");
  }
}

module.exports = Person;
