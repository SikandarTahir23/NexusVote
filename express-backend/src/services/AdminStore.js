/**
 * AdminStore — abstract storage contract for administrator accounts.
 *
 * Mirrors the shape of UserStore / VoteStore so the rest of the codebase
 * follows one consistent pattern: an abstract base + concrete subclasses
 * the service layer talks to through the parent type.
 *
 * OOP concepts demonstrated:
 *  - ABSTRACTION: declares WHAT (find, all) without specifying HOW.
 *  - POLYMORPHISM: any subclass that satisfies these methods is acceptable.
 */
class AdminStore {
  async find(/* email */) {
    throw new Error("find() must be implemented by subclass.");
  }
  async all() {
    throw new Error("all() must be implemented by subclass.");
  }
}

module.exports = AdminStore;
