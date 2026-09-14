export type TreeSize = "small" | "medium" | "large" | "very_large";
export type Difficulty = "easy" | "normal" | "difficult";
export type CrewPace = "steady" | "standard" | "fast";
export type CleanupLevel = "light" | "standard" | "heavy";
export type EquipmentType = "chipper" | "bucket_truck" | "crane" | "stump_grinder" | "mini_skid" | "trailer" | "climbing_gear" | "traffic_control";

export type DurationEstimateInput = {
  serviceText: string;
  treeCount: number;
  treeSize: TreeSize;
  access: Difficulty;
  slope: Difficulty;
  dragDistance: Difficulty;
  cleanup: CleanupLevel;
  crewSize: number;
  crewPace: CrewPace;
  experienceLevel: "developing" | "experienced" | "expert";
  requiresClimbing: boolean;
  requiresRigging: boolean;
  equipment: EquipmentType[];
};

export type DurationScenario = {
  minutesLow: number;
  minutesHigh: number;
};

export type DurationEstimateResult = {
  current: DurationScenario;
  noMachinery: DurationScenario;
  recommended: DurationScenario;
  recommendedEquipment: EquipmentType[];
  confidence: "low" | "medium" | "high";
  drivers: string[];
};

const sizeMinutes: Record<TreeSize, number> = {
  small: 90,
  medium: 180,
  large: 300,
  very_large: 480
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function serviceFactor(text: string) {
  const value = text.toLowerCase();
  if (value.includes("stump")) return 0.45;
  if (value.includes("trim") || value.includes("prun")) return 0.7;
  if (value.includes("storm") || value.includes("emergency")) return 1.25;
  if (value.includes("land clearing") || value.includes("lot")) return 1.35;
  if (value.includes("plant")) return 0.35;
  return 1;
}

function equipmentFactor(input: DurationEstimateInput, equipment: EquipmentType[]) {
  let factor = 1;
  const has = (item: EquipmentType) => equipment.includes(item);
  if (has("mini_skid") && (input.dragDistance !== "easy" || input.cleanup === "heavy")) factor *= 0.72;
  if (has("chipper") && input.cleanup !== "light") factor *= 0.82;
  if (has("bucket_truck") && input.requiresClimbing) factor *= 0.76;
  if (has("crane") && (input.treeSize === "very_large" || input.requiresRigging)) factor *= 0.62;
  if (has("stump_grinder") && input.serviceText.toLowerCase().includes("stump")) factor *= 0.55;
  if (has("climbing_gear") && input.requiresClimbing && !has("bucket_truck")) factor *= 0.94;
  return clamp(factor, 0.4, 1.15);
}

function baseMinutes(input: DurationEstimateInput) {
  let minutes = sizeMinutes[input.treeSize] * Math.max(1, input.treeCount) * serviceFactor(input.serviceText);
  const difficulty = { easy: 0.9, normal: 1, difficult: 1.28 } as const;
  minutes *= difficulty[input.access];
  minutes *= difficulty[input.slope];
  minutes *= difficulty[input.dragDistance];
  minutes *= input.cleanup === "light" ? 0.88 : input.cleanup === "heavy" ? 1.3 : 1;
  if (input.requiresClimbing) minutes *= 1.18;
  if (input.requiresRigging) minutes *= 1.28;

  const crewScale = Math.pow(Math.max(1, input.crewSize), 0.78);
  minutes /= crewScale;
  minutes *= input.crewPace === "steady" ? 1.16 : input.crewPace === "fast" ? 0.88 : 1;
  minutes *= input.experienceLevel === "developing" ? 1.16 : input.experienceLevel === "expert" ? 0.9 : 1;
  return Math.max(30, minutes);
}

function range(minutes: number): DurationScenario {
  const low = Math.max(30, Math.round((minutes * 0.88) / 15) * 15);
  const high = Math.max(low + 15, Math.round((minutes * 1.18) / 15) * 15);
  return { minutesLow: low, minutesHigh: high };
}

function recommendEquipment(input: DurationEstimateInput): EquipmentType[] {
  const recommended = new Set<EquipmentType>();
  if (input.cleanup !== "light") recommended.add("chipper");
  if (input.dragDistance === "difficult" || input.cleanup === "heavy") recommended.add("mini_skid");
  if (input.requiresClimbing) recommended.add("bucket_truck");
  if (input.requiresRigging || input.treeSize === "very_large") recommended.add("crane");
  if (input.serviceText.toLowerCase().includes("stump")) recommended.add("stump_grinder");
  return [...recommended];
}

export function estimateTreeJobDuration(input: DurationEstimateInput): DurationEstimateResult {
  const base = baseMinutes(input);
  const recommendations = recommendEquipment(input);
  const recommendedSet = [...new Set([...input.equipment, ...recommendations])];
  const currentMinutes = base * equipmentFactor(input, input.equipment);
  const noMachineryMinutes = base * equipmentFactor(input, input.equipment.filter((item) => item === "climbing_gear" || item === "traffic_control"));
  const recommendedMinutes = base * equipmentFactor(input, recommendedSet);

  const drivers: string[] = [];
  if (input.treeSize === "large" || input.treeSize === "very_large") drivers.push("large tree size");
  if (input.access === "difficult") drivers.push("difficult access");
  if (input.dragDistance === "difficult") drivers.push("long or difficult material movement");
  if (input.slope === "difficult") drivers.push("steep terrain");
  if (input.cleanup === "heavy") drivers.push("heavy cleanup volume");
  if (input.requiresClimbing) drivers.push("climbing required");
  if (input.requiresRigging) drivers.push("rigging required");
  if (input.crewPace === "steady") drivers.push("steady crew pace");

  const completeness = [input.treeCount > 0, input.crewSize > 0, Boolean(input.treeSize), Boolean(input.access), Boolean(input.cleanup)].filter(Boolean).length;
  const confidence = completeness >= 5 && input.serviceText.trim() ? "high" : completeness >= 4 ? "medium" : "low";

  return {
    current: range(currentMinutes),
    noMachinery: range(noMachineryMinutes),
    recommended: range(recommendedMinutes),
    recommendedEquipment: recommendations,
    confidence,
    drivers
  };
}
