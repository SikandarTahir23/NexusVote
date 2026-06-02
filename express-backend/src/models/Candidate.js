const Person = require("./Person");

/**
 * Candidate — a person standing for election.
 *
 * OOP concepts demonstrated:
 *  - INHERITANCE: extends Person.
 *  - POLYMORPHISM: overrides getRole().
 *  - ENCAPSULATION: party/symbol/color stored privately, exposed read-only.
 */
class Candidate extends Person {
  #party;
  #partyColor;
  #symbol;

  constructor({ id, name, party, partyColor, symbol }) {
    super(id, name);
    this.#party = party;
    this.#partyColor = partyColor;
    this.#symbol = symbol;
  }

  getParty() {
    return this.#party;
  }

  getPartyColor() {
    return this.#partyColor;
  }

  getSymbol() {
    return this.#symbol;
  }

  getRole() {
    return "CANDIDATE";
  }

  toJSON() {
    return {
      id: this.getId(),
      name: this.getName(),
      party: this.#party,
      partyColor: this.#partyColor,
      symbol: this.#symbol,
    };
  }
}

module.exports = Candidate;
