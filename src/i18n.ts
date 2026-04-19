/** All user-facing Korean strings in one place. */
export const T = {
  title: '수학두뇌테스트',
  overlayCleared: '전체 클리어',
  msgCleared: (sec: number, score: number) =>
    `모든 사과를 제거했습니다!\n총점 ${score}점\n걸린 시간: ${sec.toFixed(1)}초.`,
  msgTimeUp: (score: number, grade: string) => `총점 ${score}점\n\n${grade}`,
  overlayOk: '확인',
  ariaBoard: '게임 보드',
  muteBtn: '음소거',
  unmuteBtn: '소리 켜기',
  volumeAria: '볼륨',
} as const;

/** Time-over comment picked by final score (high to low). */
export function timeUpGradeLine(score: number): string {
  if (score >= 100) return '와우! 수학천재네요';
  if (score >= 90) return '장래희망을 수학선생님으로 정하세요. 당장!!!';
  if (score >= 80) return '이정도면 반에서 1등감이네요.';
  if (score >= 70) return '와우! 2학년이 이정도라니... 놀랍군요!';
  if (score >= 60) return '꾹 잘하고 있습니다. 밥만 잘 먹으면 참 좋겠네요.';
  if (score >= 50) return '제법 수학좀 한다는 소리 듣겠어요!';
  if (score >= 40) return '이정도면 잘하는 수준이에요!';
  if (score >= 30) return '음.... 지우야 정신차리자!!';
  if (score >= 20) return '지우야... 고지우!!!! 집중해! 집중!!';
  if (score >= 10) return '고지우!! 오늘부로 유튜브시청은 금지다!!!';
  return '처음은 다 그래.. 다시한번 도전해보자!';
}
