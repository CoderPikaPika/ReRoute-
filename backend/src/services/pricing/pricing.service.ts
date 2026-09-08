const pricingConfig = {
  baseFare: 3500,
  ratePerKm: 22,
  ratePerTonne: 300,
};

export function estimateCost(distanceKm: number, weightKg: number): number {
  const weightTonnes = weightKg / 1000;
  return Math.round(
    pricingConfig.baseFare +
      distanceKm * pricingConfig.ratePerKm +
      weightTonnes * pricingConfig.ratePerTonne,
  );
}
