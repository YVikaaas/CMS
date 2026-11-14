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

export type CategoryFixtureConfig = {
  format: FixtureFormatType;
  scoringStyle: string;
  participantsPerMatch: number;
  availableRounds: FixtureRoundType[];
  availableFormats: FixtureFormatType[];
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
  fixtureConfig: CategoryFixtureConfig;
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

export type FixtureFormatType =
  | "league_knockout"
  | "bracket_elimination"
  | "track_rounds"
  | "field_attempts";
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
  | "third_place"
  | "heat"
  | "qualifying";
export type FixtureMatchKind = "dual" | "heat";
export type AthleticsScoringStyle = "time" | "distance" | "height";
export type AthleticsResultCode = "ok" | "dns" | "dnf" | "dq" | "nm";
export type FieldAttemptStatus = "ok" | "foul" | "pass";
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
  categoryName: string;
  categoryAgeGroup: string;
  categoryGender: Gender;
  teamSize: number;
  maxTeamSize: number;
  availableRounds: FixtureRoundType[];
  defaultFormat: FixtureFormatType;
  availableFormats: FixtureFormatType[];
  scoringStyle: string;
  participantsPerMatch: number;
};

export type CscAthlete = {
  id: string;
  teamId: string;
  teamName: string;
  orgName: string | null;
  city: string | null;
  name: string;
  gender: Gender;
};

export type FieldAttempt = {
  mark: number | null;
  status: FieldAttemptStatus;
};

export type HeatParticipant = {
  id: string;
  athleteId: string;
  teamId: string;
  name: string;
  orgName: string | null;
  city: string | null;
  lane: number;
  score: string;
  timeMs: number | null;
  mark: number | null;
  unit: string;
  place: number | null;
  qualified: boolean;
  resultStatus: FixtureParticipantResult;
  resultCode: AthleticsResultCode;
  attempts: FieldAttempt[];
};

export type FixtureRound = {
  id: string;
  fixtureId: string;
  roundType: FixtureRoundType;
  roundNumber: number;
  roundLabel: string;
  attemptCount: number;
  extraAttemptCount: number;
};

export type FixtureRankingEntry = {
  id: string;
  fixtureId: string;
  rank: number;
  teamId: string;
  athleteId: string;
  name: string;
  orgName: string | null;
  city: string | null;
  medalDeliveredAt: string | null;
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
  categoryName: string;
  categoryAgeGroup: string;
  formatType: FixtureFormatType;
  scoringStyle: string;
  participantsPerMatch: number;
  status: FixtureStatus;
  rankingLockedAt: string | null;
  startDate: string | null;
  endDate: string | null;
  matchCount: number;
  rounds: FixtureRound[];
  createdAt: string;
};

export type PodiumRank = 1 | 2 | 3;

export type PodiumPerson = {
  id: string;
  name: string;
  phone: string;
  gender: Gender;
};

export type PodiumHolder = {
  rankingId: string;
  rank: PodiumRank;
  kind: "athlete" | "team";
  name: string;
  orgName: string | null;
  city: string | null;
  deliveredAt: string | null;
  people: PodiumPerson[];
};

export type PodiumSheet = {
  fixtureId: string;
  categoryLabel: string;
  sportName: string;
  rankingLockedAt: string | null;
  holders: PodiumHolder[];
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
  kind: FixtureMatchKind;
  formatType: FixtureFormatType;
  attemptCount: number;
  extraAttemptCount: number;
  participants: HeatParticipant[];
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
  city: string | null;
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

export type DashboardSportStat = {
  id: string;
  name: string;
  categoryCount: number;
  teamCount: number;
  athleteCount: number;
  fixtureCount: number;
  matchCount: number;
  matchCompleted: number;
  rankingLockedCount: number;
  medalsDelivered: number;
};

export type DashboardSummary = {
  sportCount: number;
  categoryCount: number;
  boysCategoryCount: number;
  girlsCategoryCount: number;
  soloCategoryCount: number;
  relayCategoryCount: number;
  teamSportCategoryCount: number;
  ageGroupCount: number;
  categoryWithEntryCount: number;
  categoryWithoutEntryCount: number;
  categoryWithDrawCount: number;
  categoryWithoutDrawCount: number;
  teamCount: number;
  teamEntryCount: number;
  relayEntryCount: number;
  basketballTeamCount: number;
  soloAthleteCount: number;
  athleteCount: number;
  orgCount: number;
  cityCount: number;
  fixtureCount: number;
  fixtureDraft: number;
  fixturePublished: number;
  fixtureInProgress: number;
  fixtureCompleted: number;
  trackFixtureCount: number;
  fieldFixtureCount: number;
  leagueFixtureCount: number;
  bracketFixtureCount: number;
  rankingLockedCount: number;
  rankingUnlockedCount: number;
  roundCount: number;
  heatRoundCount: number;
  qualifyingRoundCount: number;
  leagueRoundCount: number;
  quarterFinalCount: number;
  semiFinalCount: number;
  finalRoundCount: number;
  thirdPlaceCount: number;
  matchCount: number;
  matchDraft: number;
  matchScheduled: number;
  matchInProgress: number;
  matchCompleted: number;
  matchCancelled: number;
  matchNoShow: number;
  matchOpenCount: number;
  heatCount: number;
  dualCount: number;
  callRoomMatchCount: number;
  callRoomUnmarkedCount: number;
  presentCount: number;
  absentCount: number;
  rankingEntryCount: number;
  goldDelivered: number;
  silverDelivered: number;
  bronzeDelivered: number;
  medalsDelivered: number;
  medalsWaiting: number;
  scoreEventCount: number;
  sports: DashboardSportStat[];
};

export type CallRoomMark = "present" | "absent" | "";

export type CallRoomAttendanceRow = {
  matchId: string;
  teamId: string | null;
  teamMemberId: string | null;
  status: Exclude<CallRoomMark, "">;
};

export type CallRoomMember = {
  id: string;
  name: string;
  mark: CallRoomMark;
  effective: CallRoomMark;
};

export type CallRoomUnit = {
  key: string;
  kind: "athlete" | "team";
  teamId: string;
  memberId: string;
  name: string;
  detail: string | null;
  lane: number | null;
  mark: CallRoomMark;
  members: CallRoomMember[];
};

export type CallRoomSheet = {
  matchId: string;
  solo: boolean;
  units: CallRoomUnit[];
};

export type CallRoomAction =
  | { type: "unit"; key: string; mark: CallRoomMark }
  | { type: "member"; key: string; memberId: string; mark: CallRoomMark }
  | { type: "all"; mark: CallRoomMark };

export type ServiceError = {
  message: string;
};

export type ServiceResult<T> = {
  data: T | null;
  error: ServiceError | null;
};
