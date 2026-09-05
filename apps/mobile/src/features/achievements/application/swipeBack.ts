export function shouldCompleteSwipe(translationX: number, velocityX: number, width: number): boolean {
  'worklet';
  return translationX >= width * 0.32 || (translationX >= 32 && velocityX > 650);
}
