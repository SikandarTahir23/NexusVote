/**
 * Candidate — a person standing for election.
 *
 * Modelled as its own class (not a subclass of Person) because candidates
 * in this prototype don't authenticate — they are static records loaded
 * from the registry. This is a deliberate design choice: composition over
 * inheritance where inheritance would not earn its keep.
 *
 * Demonstrates ENCAPSULATION: every field is private and exposed only via
 * read-only getters — a candidate's identity should never be mutated after
 * the ballot is finalised.
 */
export class Candidate {
  #id;
  #name;
  #party;
  #partyColor;
  #symbol;

  /**
   * @param {{
   *   id: string,
   *   name: string,
   *   party: string,
   *   partyColor: string,
   *   symbol: string,
   * }} init
   */
  constructor({ id, name, party, partyColor, symbol }) {
    if (!id || !name || !symbol) {
      throw new Error("Candidate requires id, name and symbol.");
    }
    this.#id = id;
    this.#name = name;
    this.#party = party;
    this.#partyColor = partyColor;
    this.#symbol = symbol;
  }

  get id() {
    return this.#id;
  }
  get name() {
    return this.#name;
  }
  get party() {
    return this.#party;
  }
  get partyColor() {
    return this.#partyColor;
  }
  get symbol() {
    return this.#symbol;
  }

  /** Plain JSON shape used by React components (immutable snapshot). */
  toJSON() {
    return {
      id: this.#id,
      name: this.#name,
      party: this.#party,
      partyColor: this.#partyColor,
      symbol: this.#symbol,
    };
  }
}
