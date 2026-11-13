export type AppRole = "admin";
export type SportEventMode = "team" | "solo" | "both";
export type Gender = "male" | "female";
export type CompetitionStatus = "draft" | "active" | "archived";

export type AppUser = {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  onboardedAt: string | null;
  roles: AppRole[];
  isAdmin: boolean;
  isOnboarded: boolean;
};

export type Sport = {
  id: string;
  name: string;
  code: string;
  eventMode: SportEventMode;
  createdAt: string;
};

export type Category = {
  id: string;
  sportId: string;
  name: string;
  gender: Gender;
  ageGroup: string;
  ageMin: number;
  ageMax: number;
  teamSize: number;
  maxTeamSize: number;
  createdAt: string;
};

export type Championship = {
  id: string;
  name: string;
  slug: string;
  startDate: string | null;
  endDate: string | null;
  location: string | null;
  status: CompetitionStatus;
  createdAt: string;
};

export type ChampionshipOffering = {
  sportId: string;
  categoryIds: string[];
};

export type FixtureFormatType = "league_knockout" | "bracket_elimination";
export type FixtureStatus = "draft" | "published" | "in_progress" | "completed";
export type FixtureMatchStatus =
  | "draft"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";
export type FixtureRoundType =
  | "league"
  | "quarter_final"
  | "semi_final"
  | "final"
  | "third_place";
export type FixtureParticipantResult =
  | "winner"
  | "loser"
  | "draw"
  | "dns"
  | "dnf"
  | "dq"
  | "bye"
  | "pending"
  | "no_show"
  | "qualified";
export type MatchWinner = "1" | "2" | "draw";
export type BasketPoints = 1 | 2 | 3;
export type ScoringMode = "totals" | "players" | "both";

export type CscOption = {
  id: string;
  championshipId: string;
  championshipName: string;
  sportId: string;
  sportName: string;
  categoryId: string;
  categoryLabel: string;
  categoryGender: Gender;
  teamSize: number;
  maxTeamSize: number;
  availableRounds: FixtureRoundType[];
};

export type FixtureRound = {
  id: string;
  fixtureId: string;
  roundType: FixtureRoundType;
  roundNumber: number;
  roundLabel: string;
};

export type Fixture = {
  id: string;
  cscId: string;
  championshipId: string;
  championshipName: string;
  sportId: string;
  sportName: string;
  categoryId: string;
  categoryLabel: string;
  formatType: FixtureFormatType;
  status: FixtureStatus;
  startDate: string | null;
  endDate: string | null;
  matchCount: number;
  rounds: FixtureRound[];
  createdAt: string;
};

export type FixtureMatch = {
  id: string;
  fixtureId: string;
  championshipId: string;
  roundId: string;
  roundType: FixtureRoundType;
  roundLabel: string;
  matchNumber: number;
  matchLabel: string;
  venue: string | null;
  scheduledAt: string | null;
  status: FixtureMatchStatus;
  categoryLabel: string;
  sportName: string;
  team1Id: string;
  team1Name: string;
  team1ParticipantId: string;
  team1Points: number | null;
  team1Fouls: number | null;
  team1ResultStatus: FixtureParticipantResult;
  team2Id: string;
  team2Name: string;
  team2ParticipantId: string;
  team2Points: number | null;
  team2Fouls: number | null;
  team2ResultStatus: FixtureParticipantResult;
  scoreLine: string;
  scoringMode: ScoringMode;
};

export type MatchScoreEvent = {
  id: string;
  matchId: string;
  teamId: string;
  teamMemberId: string;
  teamMemberName: string;
  points: BasketPoints;
  createdAt: string;
};

export type Team = {
  id: string;
  cscId: string;
  championshipId: string;
  championshipName: string;
  sportId: string;
  sportName: string;
  categoryId: string;
  categoryLabel: string;
  teamSize: number;
  maxTeamSize: number;
  name: string;
  orgName: string | null;
  gender: Gender;
  memberCount: number;
  createdAt: string;
};

export type TeamMember = {
  id: string;
  teamId: string;
  name: string;
  phone: string;
  gender: Gender;
};

export type TeamMemberInput = {
  name: string;
  phone: string;
  gender: Gender;
};

export type DashboardSummary = {
  sportCount: number;
  categoryCount: number;
  teamCount: number;
};

export type ServiceError = {
  message: string;
};

export type ServiceResult<T> = {
  data: T | null;
  error: ServiceError | null;
};
