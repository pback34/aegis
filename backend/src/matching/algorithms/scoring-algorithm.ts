/**
 * Multi-Criteria Scoring Algorithm for Guard Matching
 * Uses weighted scoring across multiple factors
 */

export interface ScoringFactors {
  distance: number; // in km
  rating: number; // 0-5 stars
  experienceYears: number;
  hourlyRate: number;
  skillMatchPercentage: number; // 0-100
  completedBookings: number;
}

export interface ScoringWeights {
  distance: number; // default 0.4 (40%)
  rating: number; // default 0.3 (30%)
  experience: number; // default 0.2 (20%)
  price: number; // default 0.1 (10%)
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  distance: 0.4,
  rating: 0.3,
  experience: 0.2,
  price: 0.1,
};

/**
 * Normalize distance to 0-100 scale
 * Closer is better. 0km = 100, 20km+ = 0
 * @param distanceKm Distance in kilometers
 * @param maxDistance Maximum distance to consider (default 20km)
 * @returns Normalized score 0-100
 */
function normalizeDistance(distanceKm: number, maxDistance: number = 20): number {
  if (distanceKm <= 0) return 100;
  if (distanceKm >= maxDistance) return 0;

  const score = ((maxDistance - distanceKm) / maxDistance) * 100;
  return Math.max(0, Math.min(100, score));
}

/**
 * Normalize rating to 0-100 scale
 * 5 stars = 100, 0 stars = 0
 * @param rating Rating from 0-5
 * @returns Normalized score 0-100
 */
function normalizeRating(rating: number): number {
  const score = (rating / 5) * 100;
  return Math.max(0, Math.min(100, score));
}

/**
 * Normalize experience to 0-100 scale
 * 10+ years = 100, 0 years = 0
 * @param experienceYears Years of experience
 * @param maxExperience Maximum years to consider (default 10)
 * @returns Normalized score 0-100
 */
function normalizeExperience(experienceYears: number, maxExperience: number = 10): number {
  if (experienceYears >= maxExperience) return 100;
  const score = (experienceYears / maxExperience) * 100;
  return Math.max(0, Math.min(100, score));
}

/**
 * Normalize price to 0-100 scale
 * Lower price = higher score
 * @param hourlyRate Guard's hourly rate
 * @param minRate Minimum rate in market (default $20)
 * @param maxRate Maximum rate in market (default $100)
 * @returns Normalized score 0-100
 */
function normalizePrice(hourlyRate: number, minRate: number = 20, maxRate: number = 100): number {
  if (hourlyRate <= minRate) return 100;
  if (hourlyRate >= maxRate) return 0;

  const score = ((maxRate - hourlyRate) / (maxRate - minRate)) * 100;
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate overall match score using weighted factors
 * @param factors Scoring factors
 * @param weights Custom weights (optional)
 * @returns Overall score 0-100
 */
export function calculateMatchScore(
  factors: ScoringFactors,
  weights: ScoringWeights = DEFAULT_WEIGHTS,
): number {
  // Normalize each factor to 0-100 scale
  const distanceScore = normalizeDistance(factors.distance);
  const ratingScore = normalizeRating(factors.rating);
  const experienceScore = normalizeExperience(factors.experienceYears);
  const priceScore = normalizePrice(factors.hourlyRate);

  // Apply weights and calculate total score
  const totalScore =
    distanceScore * weights.distance +
    ratingScore * weights.rating +
    experienceScore * weights.experience +
    priceScore * weights.price;

  // Round to 2 decimal places
  return Math.round(totalScore * 100) / 100;
}

/**
 * Sort guards by match score (descending)
 * @param guards Array of guards with their scores
 * @returns Sorted array
 */
export function sortByMatchScore<T extends { matchScore: number }>(guards: T[]): T[] {
  return guards.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Apply boost multipliers based on special conditions
 * @param baseScore Base match score
 * @param boosts Object with boost conditions
 * @returns Boosted score (capped at 100)
 */
export function applyBoosts(
  baseScore: number,
  boosts: {
    isPreviouslyWorkedWith?: boolean; // +10 points
    hasSpecializedCertification?: boolean; // +5 points
    isTopRated?: boolean; // +5 points (4.8+ rating)
    hasRecentActivity?: boolean; // +3 points (active in last 7 days)
  },
): number {
  let score = baseScore;

  if (boosts.isPreviouslyWorkedWith) score += 10;
  if (boosts.hasSpecializedCertification) score += 5;
  if (boosts.isTopRated) score += 5;
  if (boosts.hasRecentActivity) score += 3;

  return Math.min(100, score);
}
