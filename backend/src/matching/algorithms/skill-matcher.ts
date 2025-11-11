/**
 * Skill and Certification Matching Algorithm
 */

export interface GuardSkills {
  skills: string[];
  certifications: string[];
}

export interface SkillMatchResult {
  hasAllRequired: boolean;
  matchedSkills: string[];
  missingSkills: string[];
  bonusSkills: string[];
  matchPercentage: number;
}

/**
 * Match guard skills against required skills
 * @param guardSkills Array of skills the guard has
 * @param requiredSkills Array of required skills for the job
 * @param preferredSkills Optional array of preferred (bonus) skills
 * @returns Skill match result
 */
export function matchSkills(
  guardSkills: string[],
  requiredSkills: string[],
  preferredSkills: string[] = [],
): SkillMatchResult {
  const guardSkillsLower = guardSkills.map((s) => s.toLowerCase());
  const requiredSkillsLower = requiredSkills.map((s) => s.toLowerCase());
  const preferredSkillsLower = preferredSkills.map((s) => s.toLowerCase());

  // Check required skills
  const matchedSkills = requiredSkillsLower.filter((skill) => guardSkillsLower.includes(skill));
  const missingSkills = requiredSkillsLower.filter((skill) => !guardSkillsLower.includes(skill));
  const hasAllRequired = missingSkills.length === 0;

  // Check bonus skills
  const bonusSkills = preferredSkillsLower.filter((skill) => guardSkillsLower.includes(skill));

  // Calculate match percentage
  const totalRequired = requiredSkillsLower.length;
  const matchPercentage = totalRequired > 0 ? (matchedSkills.length / totalRequired) * 100 : 100;

  return {
    hasAllRequired,
    matchedSkills,
    missingSkills,
    bonusSkills,
    matchPercentage,
  };
}

/**
 * Calculate skill score for matching algorithm
 * @param skillMatchResult Result from matchSkills
 * @returns Score from 0-100
 */
export function calculateSkillScore(skillMatchResult: SkillMatchResult): number {
  if (!skillMatchResult.hasAllRequired) {
    return 0; // Disqualify if missing required skills
  }

  // Base score from required skills
  let score = skillMatchResult.matchPercentage;

  // Bonus points for preferred skills (up to 20 points)
  const bonusPoints = Math.min(skillMatchResult.bonusSkills.length * 5, 20);
  score = Math.min(score + bonusPoints, 100);

  return Math.round(score);
}

/**
 * Check if guard meets minimum rating threshold
 * @param rating Guard's average rating
 * @param minRating Minimum required rating (default 4.0)
 * @returns true if meets threshold
 */
export function meetsRatingThreshold(rating: number, minRating: number = 4.0): boolean {
  return rating >= minRating;
}

/**
 * Check if guard has enough experience
 * @param experienceYears Guard's years of experience
 * @param minExperience Minimum required experience (default 1)
 * @returns true if meets threshold
 */
export function meetsExperienceThreshold(experienceYears: number, minExperience: number = 1): boolean {
  return experienceYears >= minExperience;
}
