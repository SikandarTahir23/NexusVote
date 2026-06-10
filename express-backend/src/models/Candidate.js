const Person = require("./Person");

/**
 * Candidate — a person standing for election.
 *
 * OOP concepts demonstrated:
 *  - INHERITANCE: extends Person.
 *  - POLYMORPHISM: overrides getRole().
 *  - ENCAPSULATION: party/symbol/color stored privately, exposed read-only.
 *
 * `symbol` is either an emoji ("📚") or an uploaded image path
 * ("/uploads/symbol-....png"); the UI decides how to render it.
 * `status` controls ballot visibility — only "active" candidates appear
 * on the voter ballot and accept votes.
 */
class Candidate extends Person {
  #party;
  #partyColor;
  #symbol;
  #description;
  #status;
  #totalVotes;
  #createdAt;
  #updatedAt;

  constructor({
    id,
    name,
    party,
    partyColor,
    symbol,
    description = null,
    status = "active",
    totalVotes = 0,
    createdAt = null,
    updatedAt = null,
  }) {
    super(id, name);
    this.#party = party;
    this.#partyColor = partyColor;
    this.#symbol = symbol;
    this.#description = description;
    this.#status = status;
    this.#totalVotes = totalVotes;
    this.#createdAt = createdAt;
    this.#updatedAt = updatedAt;
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

  getDescription() {
    return this.#description;
  }

  getStatus() {
    return this.#status;
  }

  isActive() {
    return this.#status === "active";
  }

  getTotalVotes() {
    return this.#totalVotes;
  }

  getRole() {
    return "CANDIDATE";
  }

  toJSON() {
    // The first five keys are the original ballot contract — the voter
    // UI depends on them, so they must never change shape. Everything
    // after is additive for the admin panel.
    return {
      id: this.getId(),
      name: this.getName(),
      party: this.#party,
      partyColor: this.#partyColor,
      symbol: this.#symbol,
      description: this.#description,
      status: this.#status,
      totalVotes: this.#totalVotes,
      createdAt: this.#createdAt,
      updatedAt: this.#updatedAt,
    };
  }
}

module.exports = Candidate;
