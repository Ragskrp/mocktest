export function validateAnswer(studentInput: string, correctAnswer: string, tolerance = 0.0001): boolean {
  if (!studentInput || !correctAnswer) return false;

  const studentClean = studentInput.trim();
  const correctClean = correctAnswer.trim();

  // Try parsing coordinates first if both are JSON-like
  if (studentClean.startsWith('{') && correctClean.startsWith('{')) {
    try {
      const studentCoords = JSON.parse(studentClean);
      const targetCoords = JSON.parse(correctClean);
      if (
        typeof studentCoords.x === 'number' &&
        typeof studentCoords.y === 'number' &&
        typeof targetCoords.x === 'number' &&
        typeof targetCoords.y === 'number'
      ) {
        return validateCoordinates(studentCoords, targetCoords);
      }
    } catch {
      // Ignore parse failure and fall back
    }
  }

  const studentNum = parseFloat(studentClean);
  const correctNum = parseFloat(correctClean);

  if (!isNaN(studentNum) && !isNaN(correctNum)) {
    return Math.abs(studentNum - correctNum) < tolerance;
  }

  // Algebraic/text answers: normalize whitespace and case
  return studentClean.toLowerCase().replace(/\s+/g, ' ') ===
         correctClean.toLowerCase().replace(/\s+/g, ' ');
}

export function validateCoordinates(
  studentCoords: { x: number; y: number },
  targetCoords: { x: number; y: number },
  tolerance = 0.5
): boolean {
  return Math.abs(studentCoords.x - targetCoords.x) < tolerance &&
         Math.abs(studentCoords.y - targetCoords.y) < tolerance;
}
