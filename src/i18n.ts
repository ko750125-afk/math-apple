/** All user-facing Korean strings in one place. */
export const T = {
  title: '\uC218\uD559\uB450\uB1CC\uD14C\uC2A4\uD2B8',
  overlayCleared: '\uC804\uCCB4 \uD074\uB9AC\uC5B4',
  msgCleared: (sec: number, score: number) =>
    `\uBAA8\uB4E0 \uC0AC\uACFC\uB97C \uC81C\uAC70\uD588\uC2B5\uB2C8\uB2E4!\n\uCD1D\uC810 ${score}\uC810\n\uAC78\uB9B0 \uC2DC\uAC04: ${sec.toFixed(1)}\uCD08.`,
  msgTimeUp: (score: number, grade: string) => `\uCD1D\uC810 ${score}\uC810\n\n${grade}`,
  overlayOk: '\uD655\uC778',
  ariaBoard: '\uAC8C\uC784 \uBCF4\uB4DC',
  muteBtn: '\uC74C\uC18C\uAC70',
  unmuteBtn: '\uC18C\uB9AC \uCF1C\uAE30',
  volumeAria: '\uBCFC\uB968',
} as const;

/** Time-over comment picked by final score (high to low). */
export function timeUpGradeLine(score: number): string {
  if (score >= 100) return '\uC640\uC6B0! \uC218\uD559\uCC9C\uC7AC\uB124\uC694';
  if (score >= 90)
    return '\uC7A5\uB798\uD76C\uB9DD\uC744 \uC218\uD559\uC120\uC0DD\uB2D8\uC73C\uB85C \uC815\uD558\uC138\uC694. \uB2F9\uC7A5!!!';
  if (score >= 80) return '\uC774\uC815\uB3C4\uBA74 \uBC18\uC5D0\uC11C 1\uB4F1\uAC10\uC774\uB124\uC694.';
  if (score >= 70)
    return '\uC640\uC6B0! 2\uD559\uB144\uC774 \uC774\uC815\uB3C4\uB77C\uB2C8... \uB180\uB78D\uAD70\uC694!';
  if (score >= 60)
    return '\uAFCD \uC798\uD558\uACE0 \uC788\uC2B5\uB2C8\uB2E4. \uBC25\uB9CC \uC798 \uBA39\uC73C\uBA74 \uCC38 \uC88B\uACA0\uB124\uC694.';
  if (score >= 50) return '\uC81C\uBC95 \uC218\uD559\uC880 \uD55C\uB2E4\uB294 \uC18C\uB9AC \uB4E3\uACA0\uC5B4\uC694!';
  if (score >= 40) return '\uC774\uC815\uB3C4\uBA74 \uC798\uD558\uB294 \uC218\uC900\uC774\uC5D0\uC694!';
  if (score >= 30) return '\uC74C.... \uC9C0\uC6B0\uC57C \uC815\uC2E0\uCC28\uB9AC\uC790!!';
  if (score >= 20) return '\uC9C0\uC6B0\uC57C... \uACE0\uC9C0\uC6B0!!!! \uC9D1\uC911\uD574! \uC9D1\uC911!!';
  if (score >= 10) return '\uACE0\uC9C0\uC6B0!! \uC624\uB298\uBD80\uB85C \uC720\uD29C\uBE0C\uC2DC\uCCAD\uC740 \uAE08\uC9C0\uB2E4!!!';
  return '\uCC98\uC74C\uC740 \uB2E4 \uADF8\uB798.. \uB2E4\uC2DC\uD55C\uBC88 \uB3C4\uC804\uD574\uBCF4\uC790!';
}
