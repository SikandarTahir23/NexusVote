/**
 * UserStore — abstract storage contract for registered voters.
 *
 * OOP concepts demonstrated:
 *  - ABSTRACTION: defines WHAT a user store must do (upsert, find, all)
 *    without specifying HOW the users are persisted.
 *  - POLYMORPHISM: AuthenticationService depends on this interface, so the
 *    concrete store (MySQL today, something else tomorrow) is interchangeable.
 */
class UserStore {
  async upsert(/* user */) {
    throw new Error("upsert() must be implemented by subclass.");
  }
  async find(/* cnic */) {
    throw new Error("find() must be implemented by subclass.");
  }
  async all() {
    throw new Error("all() must be implemented by subclass.");
  }
}

module.exports = UserStore;
