export class Email {
  private readonly value: string;

  constructor(email: string) {
    const normalizedEmail = email.toLowerCase().trim();
    if (!this.isValid(normalizedEmail)) {
      throw new Error('Invalid email format');
    }
    this.value = normalizedEmail;
  }

  private isValid(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
