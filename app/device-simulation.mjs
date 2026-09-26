export function validReading(value, min, max) {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

// Visual demonstration only. These values are not physiological estimates.
export function simulatedReadings(heartRate, seconds) {
  if (!validReading(heartRate, 1, 350)) return null;
  return {
    glucose: Math.round(100 + 5 * Math.sin(Math.floor(seconds / 5) / 4)),
    stress: Math.round(40 + 9 * Math.sin(Math.floor(seconds / 5) / 3)),
  };
}

export function demoEcg(heartRate, seconds, count = 720) {
  if (!validReading(heartRate, 1, 350)) return [];
  const gaussian = (phase, center, width, height) => height * Math.exp(-((phase - center) ** 2) / (2 * width ** 2));
  return Array.from({ length: count }, (_, index) => {
    const time = seconds - 6 + index * 6 / (count - 1);
    const phase = ((time * heartRate / 60) % 1 + 1) % 1;
    return gaussian(phase, .17, .035, .12) - gaussian(phase, .36, .012, .18)
      + gaussian(phase, .40, .012, 1) - gaussian(phase, .44, .015, .28)
      + gaussian(phase, .68, .06, .23);
  });
}
