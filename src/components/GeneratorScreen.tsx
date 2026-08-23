// В начале компонента — добавить refs для таймеров
const spinIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
const spinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

// Cleanup при размонтировании
useEffect(() => {
  return () => {
    if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
    if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
  };
}, []);

// Исправленный handlePickOne
const handlePickOne = () => {
  if (students.length === 0 || isSpinning) return;

  setIsSpinning(true);
  setWinner('');
  triggerHaptic('medium');

  const winnerIndex = Math.floor(Math.random() * students.length);
  const finalWinner = students[winnerIndex].name;

  const extraSpins = 5 * 360;
  const randomOffset = Math.floor(Math.random() * 360);
  setRotation((prev) => prev + extraSpins + randomOffset);

  // Очищаем предыдущие таймеры
  if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
  if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);

  spinIntervalRef.current = setInterval(() => {
    setRouletteName(students[Math.floor(Math.random() * students.length)].name);
  }, 50);

  spinTimeoutRef.current = setTimeout(() => {
    if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
    setRouletteName(finalWinner);
    setWinner(finalWinner);
    setIsSpinning(false);
    triggerHaptic('heavy');
  }, 1500);
};

// Исправленный handleSplitGroups
const handleSplitGroups = () => {
  if (students.length === 0) return;
  const n = Math.max(1, Math.min(groupCount, students.length));
  const shuffled = shuffleArr(students);
  
  // Равномерное распределение
  const result: string[][] = [];
  const baseSize = Math.floor(shuffled.length / n);
  const extra = shuffled.length % n;
  let index = 0;
  
  for (let g = 0; g < n; g++) {
    const size = baseSize + (g < extra ? 1 : 0);
    result.push(shuffled.slice(index, index + size).map(s => s.name));
    index += size;
  }
  
  setGroups(result);
  setWinner('');
  triggerHaptic('medium');
};

// Исправленный copyText
const copyText = async (t: string, id?: string) => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(t);
    } else {
      // Fallback для старых браузеров
      const textarea = document.createElement('textarea');
      textarea.value = t;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(id || true);
    triggerHaptic('light');
    setTimeout(() => setCopied(false), 2000);
  } catch {
    console.error('Не удалось скопировать текст');
  }
};
