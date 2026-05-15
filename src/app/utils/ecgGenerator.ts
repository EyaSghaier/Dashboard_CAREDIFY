export function getECGValue(phase: number, heartRate: number = 72): number {
  // phase: 0 to 1 (one cardiac cycle)
  let v = 0;

  // Add subtle baseline noise
  v += (Math.random() - 0.5) * 0.03;

  // P wave (atrial depolarization) — 0.05 to 0.18
  if (phase >= 0.05 && phase < 0.18) {
    const p = (phase - 0.05) / 0.13;
    v += 0.18 * Math.exp(-Math.pow((p - 0.5) * 6, 2));
  }

  // QRS complex
  // Q dip — 0.22 to 0.26
  if (phase >= 0.22 && phase < 0.26) {
    const p = (phase - 0.22) / 0.04;
    v -= 0.2 * Math.sin(Math.PI * p);
  }
  // R peak — 0.26 to 0.34
  if (phase >= 0.26 && phase < 0.34) {
    const p = (phase - 0.26) / 0.08;
    v += 1.4 * Math.exp(-Math.pow((p - 0.5) * 8, 2));
  }
  // S dip — 0.34 to 0.40
  if (phase >= 0.34 && phase < 0.40) {
    const p = (phase - 0.34) / 0.06;
    v -= 0.35 * Math.sin(Math.PI * p);
  }

  // ST segment — 0.40 to 0.48
  // (stays near zero baseline)

  // T wave (ventricular repolarization) — 0.48 to 0.72
  if (phase >= 0.48 && phase < 0.72) {
    const p = (phase - 0.48) / 0.24;
    v += 0.28 * Math.exp(-Math.pow((p - 0.5) * 4, 2));
  }

  return v;
}

export function generateECGBuffer(
  length: number,
  heartRate: number = 72,
  samplesPerBeat: number = 80
): { t: number; value: number }[] {
  const data: { t: number; value: number }[] = [];
  for (let i = 0; i < length; i++) {
    const phase = (i % samplesPerBeat) / samplesPerBeat;
    data.push({ t: i, value: getECGValue(phase, heartRate) });
  }
  return data;
}
