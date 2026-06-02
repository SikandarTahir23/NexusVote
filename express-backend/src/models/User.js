const Person = require("./Person");

/**
 * User — a citizen voter identified by CNIC (Pakistan National ID).
 *
 * OOP concepts demonstrated:
 *  - INHERITANCE: extends Person, reusing id/name storage.
 *  - POLYMORPHISM: overrides getRole() so callers can treat any Person uniformly.
 *  - ENCAPSULATION: CNIC and constituency are private fields exposed via getters.
 */
class User extends Person {
  #cnic;
  #constituency;

  constructor({ cnic, name, constituency = "General" }) {
    // Use CNIC as the unique id at the Person level.
    super(cnic, name);
    this.#cnic = cnic;
    this.#constituency = constituency;
  }

  getCnic() {
    return this.#cnic;
  }

  getConstituency() {
    return this.#constituency;
  }

  getRole() {
    return "VOTER";
  }

  toJSON() {
    return {
      cnic: this.#cnic,
      name: this.getName(),
      constituency: this.#constituency,
      role: this.getRole(),
    };
  }
}

module.exports = User;
