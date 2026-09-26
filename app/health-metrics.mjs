export function calculateBmi(heightCm, weightKg) {
  const height = Number(heightCm), weight = Number(weightKg);
  if (!Number.isFinite(height) || !Number.isFinite(weight) || height < 30 || height > 300 || weight < 1 || weight > 700) return null;
  return weight / ((height / 100) ** 2);
}
