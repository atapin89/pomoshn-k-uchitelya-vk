function layoutWords(
  words: { word: string; count: number }[],
  width: number,
  height: number,
  settings: CloudSettings,
): WordItem[] {
  if (words.length === 0) return [];

  const rng = createRng(settings.seed);
  const maxCount = Math.max(...words.map((w) => w.count));
  const palette = PALETTES[settings.palette] || PALETTES.rainbow;

  const maskW = Math.ceil(width / 4);
  const maskH = Math.ceil(height / 4);
  const mask = createShapeMask(settings.shape, maskW, maskH);

  const occupied: { x: number; y: number; w: number; h: number }[] = [];
  const items: WordItem[] = [];
  const cx = width / 2;
  const cy = height / 2;

  // ГРУППИРУЕМ СЛОВА ПО ЧАСТОТЕ И ПЕРЕМЕШИВАЕМ ВНУТРИ ГРУПП
  const groups = new Map<number, { word: string; count: number }[]>();
  for (const w of words) {
    if (!groups.has(w.count)) groups.set(w.count, []);
    groups.get(w.count)!.push(w);
  }
  
  // Перемешиваем слова внутри каждой группы через rng
  const shuffledWords: { word: string; count: number }[] = [];
  const sortedCounts = Array.from(groups.keys()).sort((a, b) => b - a);
  for (const count of sortedCounts) {
    const group = groups.get(count)!;
    // Fisher-Yates shuffle с использованием rng
    for (let i = group.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [group[i], group[j]] = [group[j], group[i]];
    }
    shuffledWords.push(...group);
  }

  for (const w of shuffledWords) {
    const t = w.count / maxCount;
    const fontSize = Math.round(settings.minFont + t * (settings.maxFont - settings.minFont));
    const charWidth = fontSize * 0.55;
    const wordW = w.word.length * charWidth;
    const wordH = fontSize * 1.2;

    // Угол поворота
    const angleRange = settings.maxAngle - settings.minAngle;
    let rotate = 0;
    if (angleRange > 0) {
      if (settings.maxAngle === 90 && settings.minAngle === 0) {
        rotate = rng() > 0.5 ? 0 : -90;
      } else {
        rotate = settings.minAngle + rng() * angleRange;
      }
    }

    // СЛУЧАЙНЫЙ НАЧАЛЬНЫЙ УГОЛ СПИРАЛИ для каждого слова
    const startAngle = rng() * Math.PI * 2;
    // СЛУЧАЙНОЕ НАПРАВЛЕНИЕ спирали (по часовой или против)
    const direction = rng() > 0.5 ? 1 : -1;

    let placed = false;
    let attempts = 0;
    const maxAttempts = 600;
    let angle = startAngle;
    let radius = 0;

    while (!placed && attempts < maxAttempts) {
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;

      const mx = Math.floor((x / width) * maskW);
      const my = Math.floor((y / height) * maskH);
      if (mx >= 0 && mx < maskW && my >= 0 && my < maskH && !mask[my * maskW + mx]) {
        const box = {
          x: x - wordW / 2,
          y: y - wordH / 2,
          w: wordW,
          h: wordH,
        };
        let collision = false;
        const gap = 4 * settings.density;
        for (const occ of occupied) {
          if (
            box.x < occ.x + occ.w + gap &&
            box.x + box.w + gap > occ.x &&
            box.y < occ.y + occ.h + gap &&
            box.y + box.h + gap > occ.y
          ) {
            collision = true;
            break;
          }
        }
        if (!collision && x - wordW / 2 > 0 && x + wordW / 2 < width && y - wordH / 2 > 0 && y + wordH / 2 < height) {
          items.push({
            text: w.word,
            weight: w.count,
            x,
            y,
            rotate,
            fontSize,
            color: palette[items.length % palette.length],
          });
          occupied.push(box);
          placed = true;
        }
      }

      angle += 0.3 * direction;
      radius += 0.5;
      attempts++;
    }
  }

  return items;
}
