export class GuardMatchDto {
  guardId: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  distance: number; // km
  rating: number;
  totalRatings: number;
  experienceYears: number;
  estimatedArrival: number; // minutes
  hourlyRate: number;
  matchScore: number;
  skills: string[];
}

export class FindGuardsResponseDto {
  matches: GuardMatchDto[];
  totalFound: number;
  searchRadius: number;
  timestamp: string;
}

export class RequestGuardResponseDto {
  status: 'pending' | 'accepted' | 'declined';
  expiresAt: string;
  message: string;
}
