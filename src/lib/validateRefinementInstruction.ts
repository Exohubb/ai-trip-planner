export const REFINEMENT_INSTRUCTION_REQUIRED_MESSAGE = "Please enter an instruction before submitting.";

/**
 * Returns true when a follow-up refinement instruction is empty or
 * whitespace-only (Requirement 15.4). Mirrors `isBlankTripDescription`'s
 * rule, kept as its own helper since it validates a conceptually distinct
 * field (a follow-up instruction, not the initial Trip_Description) with
 * its own required-field message.
 */
export function isBlankInstruction(value: string): boolean {
  return value.trim().length === 0;
}
