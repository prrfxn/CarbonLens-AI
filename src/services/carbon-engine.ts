// Reusable carbon footprint calculation engine for CarbonLens AI

export interface CarbonInputs {
  transportation_type: string;
  weekly_distance: number; // in km
  energy_type: string;
  food_diet: string;
  shopping_frequency: string;
  waste_recycling: string;
}

export interface FootprintCalculation {
  transport: number;
  energy: number;
  food: number;
  shopping: number;
  waste: number;
  total: number;
}

// Emission factors in kg CO2 (monthly averages or coefficients)
export const EMISSION_FACTORS = {
  transport: {
    "Car (solo)": 0.18, // kg CO2 / km
    "Carpool / rideshare": 0.09,
    "Public transit": 0.04,
    "Bike or walk": 0.0,
  } as Record<string, number>,

  energy: {
    "Mostly fossil fuel": 200, // kg CO2 / month
    "Mixed grid": 110,
    "Fully renewable": 10,
    "Not sure": 140,
  } as Record<string, number>,

  food: {
    "Meat every day": 200, // kg CO2 / month
    "Meat 4–5 days/week": 140,
    "Mostly veg + some meat": 80,
    "Plant-based": 30,
  } as Record<string, number>,

  shopping: {
    "Several times a week": 180, // kg CO2 / month
    Weekly: 110,
    "A few times a month": 60,
    "Rarely (monthly)": 25,
  } as Record<string, number>,

  waste: {
    "No sorting": 140, // kg CO2 / month
    "Some recycling": 90,
    "Recycle only": 50,
    "Recycle + compost": 20,
  } as Record<string, number>,
};

// Fallbacks for direct value parsing
const valueMap: Record<string, Record<number, string>> = {
  transport: {
    220: "Car (solo)",
    130: "Carpool / rideshare",
    70: "Public transit",
    15: "Bike or walk",
  },
  distance: { 25: "25", 70: "70", 140: "140", 260: "260" }, // distance is numeric in table, so we parse it directly
  energy: { 200: "Mostly fossil fuel", 110: "Mixed grid", 30: "Fully renewable", 140: "Not sure" },
  food: {
    200: "Meat every day",
    140: "Meat 4–5 days/week",
    80: "Mostly veg + some meat",
    30: "Plant-based",
  },
  shopping: {
    180: "Several times a week",
    110: "Weekly",
    60: "A few times a month",
    25: "Rarely (monthly)",
  },
  waste: { 140: "No sorting", 90: "Some recycling", 50: "Recycle only", 20: "Recycle + compost" },
};

export function resolveOptionLabel(category: string, value: number | string): string {
  if (typeof value === "string") return value;
  const catMap = valueMap[category];
  if (catMap && catMap[value]) {
    return catMap[value];
  }
  return String(value);
}

export function calculateFootprint(inputs: CarbonInputs): FootprintCalculation {
  // 1. Transportation
  const transportFactor = EMISSION_FACTORS.transport[inputs.transportation_type] ?? 0.18;
  // Convert weekly distance to monthly: km/week * 52 weeks / 12 months = km/month
  const monthlyDistance = inputs.weekly_distance * (52 / 12);
  const transportEmissions = Math.round(monthlyDistance * transportFactor);

  // 2. Energy
  const energyEmissions = EMISSION_FACTORS.energy[inputs.energy_type] ?? 110;

  // 3. Food
  const foodEmissions = EMISSION_FACTORS.food[inputs.food_diet] ?? 140;

  // 4. Shopping
  const shoppingEmissions = EMISSION_FACTORS.shopping[inputs.shopping_frequency] ?? 110;

  // 5. Waste
  const wasteEmissions = EMISSION_FACTORS.waste[inputs.waste_recycling] ?? 90;

  const total =
    transportEmissions + energyEmissions + foodEmissions + shoppingEmissions + wasteEmissions;

  return {
    transport: transportEmissions,
    energy: energyEmissions,
    food: foodEmissions,
    shopping: shoppingEmissions,
    waste: wasteEmissions,
    total,
  };
}

export function calculateSustainabilityScore(annualEmissionsKg: number): number {
  // Target emissions (e.g. 4000 kg CO2 / year is considered a solid, sustainable target for individuals in developed countries)
  // Let's base it on a standard mapping where 2000kg/year is 100 score, and 15000kg/year is 10 score.
  // Formula: Score = max(0, min(100, round(100 - (annualEmissionsKg / 150))))
  // If annualEmissions is 4000kg -> score is 100 - 26 = 74
  // If annualEmissions is 8000kg -> score is 100 - 53 = 47
  // Let's make it a nice curve:
  const baseline = 15000;
  if (annualEmissionsKg <= 2000) return 98;
  if (annualEmissionsKg >= baseline) return 15;

  const score = Math.round(100 - (annualEmissionsKg - 2000) * 0.007);
  return Math.max(10, Math.min(100, score));
}
