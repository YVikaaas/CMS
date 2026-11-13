import type { Gender } from "@/lib/types/cms";

export function categoryLabel(input: {
  gender: Gender;
  ageGroup: string;
  name?: string | null;
}): string {
  const who = input.gender === "male" ? "Boys" : "Girls";
  return `${who} ${input.ageGroup}`;
}
