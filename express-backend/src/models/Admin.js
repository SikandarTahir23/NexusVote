const Person = require("./Person");

/**
 * Admin — election commission staff with elevated privileges.
 *
 * OOP concepts demonstrated:
 *  - INHERITANCE: extends Person, gaining id/name behavior for free.
 *  - POLYMORPHISM: overrides getRole(); other code that consumes Person
 *    instances does not need to special-case admins vs voters.
 *
 * Included to show the class hierarchy is extensible — Admin is not used
 * by the current voter-facing flow but is wired into AuthenticationService.
 */
class Admin extends Person {
  #passwordHash;

  constructor({ id, name, passwordHash }) {
    super(id, name);
    this.#passwordHash = passwordHash;
  }

  verifyPassword(input) {
    // Demo only — real systems must use bcrypt/argon2.
    return this.#passwordHash === input;
  }

  getRole() {
    return "ADMIN";
  }
}

module.exports = Admin;
