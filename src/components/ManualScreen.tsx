import { Clock, Dices, Volume2, Layers, Grid3x3, BookOpen, Lightbulb, Calculator, Trophy, LayoutGrid } from 'lucide-react';
import BackButton from './BackButton';
import YandexAdBlock from './YandexAdBlock';

export default function ManualScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
      <header className="bg-purple-700 shadow-md sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <div className="shrink-0">
            <BackButton onClick={onBack} variant="light" />
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <h1 className="text-lg font-bold text-white leading-tight truncate">Руководство</h1>
            <p className="text-xs text-purple-200 leading-tight">Как пользоваться приложением</p>
          </div>
          <div className="shrink-0 w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-5 py-6 space-y-6 pb-8 overflow-y-auto">
        
        {/* Оглавление */}
        <section className="bg-white rounded-2xl shadow-sm p-5 border border-purple-100">
          <h2 className="text-lg font-bold text-purple-700 mb-3">Содержание</h2>
          <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1.5">
            <li>Таймер урока</li>
            <li>Жеребьёвка</li>
            <li>Контроль шума</li>
            <li>Флэш-карточки</li>
            <li>Генератор филвордов</li>
            <li>Калькуляторы</li>
            <li>Бинго</li>
            <li>Своя игра</li>
          </ol>
        </section>

        {/* Введение */}
        <section className="bg-white rounded-2xl shadow-sm p-5 border border-purple-100">
          <h2 className="text-lg font-bold text-purple-700 mb-2">Как запустить</h2>
          <p className="text-sm text-gray-600 mb-3">Приложение работает прямо в мессенджере MAX, ничего скачивать не нужно.</p>
          <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1">
            <li>Перейдите по ссылке на бота приложения.</li>
            <li>Нажмите кнопку <strong>«Запустить»</strong> (или «Старт») в чате.</li>
            <li>В открывшемся окне нажмите кнопку <strong>«Старт»</strong>.</li>
          </ol>
        </section>

        {/* Таймер */}
        <section className="bg-white rounded-2xl shadow-sm p-5 border border-purple-100">
          <h2 className="text-lg font-bold text-purple-700 mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-500" /> 1. Таймер урока
          </h2>
          <p className="text-sm text-gray-600 mb-3">Визуальный контроль времени и управление темпом занятия.</p>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 mb-3">
            <li>Готовые шаблоны (стандартный урок, контрольная, пятиминутка).</li>
            <li>Цветовая индикация: зеленый → оранжевый → красный.</li>
            <li>Тактильная вибрация при смене этапа.</li>
          </ul>
          <div className="bg-purple-50 rounded-xl p-3 border border-purple-100">
            <p className="text-xs font-semibold text-purple-800 flex items-center gap-1 mb-1">
              <Lightbulb className="w-4 h-4" /> Сценарий:
            </p>
            <p className="text-xs text-purple-700">Выведите таймер на проектор. Ученики видят, сколько времени осталось на задание, и сами следят за темпом, не отвлекая вас вопросами.</p>
          </div>
        </section>

        {/* Жеребьёвка */}
        <section className="bg-white rounded-2xl shadow-sm p-5 border border-purple-100">
          <h2 className="text-lg font-bold text-purple-700 mb-3 flex items-center gap-2">
            <Dices className="w-5 h-5 text-purple-500" /> 2. Жеребьёвка
          </h2>
          <p className="text-sm text-gray-600 mb-3">Объективный и игровой способ выбора учеников. Список класса сохраняется автоматически.</p>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 mb-3">
            <li><strong>Выбрать одного:</strong> Анимация «Колесо фортуны» с плавным замедлением.</li>
            <li><strong>Разделить на группы:</strong> Равномерное случайное распределение.</li>
            <li><strong>Случайная рассадка:</strong> Генерация схемы класса по рядам и колонкам.</li>
            <li>Результаты можно скопировать или отправить.</li>
          </ul>
          <div className="bg-purple-50 rounded-xl p-3 border border-purple-100">
            <p className="text-xs font-semibold text-purple-800 flex items-center gap-1 mb-1">
              <Lightbulb className="w-4 h-4" /> Сценарий:
            </p>
            <p className="text-xs text-purple-700">Запустите колесо фортуны вместо традиционного вызова к доске. Это превращает процесс в игру и снимает с учителя обвинения в предвзятости.</p>
          </div>
        </section>

        {/* Контроль шума */}
        <section className="bg-white rounded-2xl shadow-sm p-5 border border-purple-100">
          <h2 className="text-lg font-bold text-purple-700 mb-3 flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-purple-500" /> 3. Контроль шума
          </h2>
          <p className="text-sm text-gray-600 mb-3">Геймифицированный индикатор громкости, работающий через микрофон.</p>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 mb-3">
            <li>Объекты (шарики/смайлики) подпрыгивают при повышении шума.</li>
            <li>Настройка чувствительности под акустику кабинета.</li>
            <li>При превышении порога: звуковой сигнал и красный экран с надписью «ТИШЕ!».</li>
          </ul>
          <div className="bg-purple-50 rounded-xl p-3 border border-purple-100">
            <p className="text-xs font-semibold text-purple-800 flex items-center gap-1 mb-1">
              <Lightbulb className="w-4 h-4" /> Сценарий:
            </p>
            <p className="text-xs text-purple-700">Выведите экран на проектор во время групповой работы. Ученики сами регулируют громкость, чтобы не «зажечь» красный экран.</p>
          </div>
        </section>

        {/* Флэш-карточки */}
        <section className="bg-white rounded-2xl shadow-sm p-5 border border-purple-100">
          <h2 className="text-lg font-bold text-purple-700 mb-3 flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-500" /> 4. Флэш-карточки
          </h2>
          <p className="text-sm text-gray-600 mb-3">Система интервального повторения для запоминания терминов и правил.</p>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 mb-3">
            <li>Создание колод с неограниченным количеством сторон.</li>
            <li>Режим изучения: оценка «Знаю» или «Повторить».</li>
            <li>Режим проверки: тесты с выбором ответа или вводом текста.</li>
          </ul>
          <div className="bg-purple-50 rounded-xl p-3 border border-purple-100">
            <p className="text-xs font-semibold text-purple-800 flex items-center gap-1 mb-1">
              <Lightbulb className="w-4 h-4" /> Сценарий:
            </p>
            <p className="text-xs text-purple-700">Используйте первые 5 минут урока для разминки: выводите карточки на проектор, а класс хором дает ответы.</p>
          </div>
        </section>

        {/* Генератор филвордов */}
        <section className="bg-white rounded-2xl shadow-sm p-5 border border-purple-100">
          <h2 className="text-lg font-bold text-purple-700 mb-3 flex items-center gap-2">
            <Grid3x3 className="w-5 h-5 text-purple-500" /> 5. Генератор филвордов
          </h2>
          <p className="text-sm text-gray-600 mb-3">Мгновенное создание головоломок «Найди слово» для печати или отправки в чат.</p>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 mb-3">
            <li>Настройка размера сетки (10×10, 15×15, 20×20) и сложности.</li>
            <li>Пакетная генерация до 30 уникальных вариантов за раз.</li>
            <li>Режим «Ответы»: подсветка слов и красные стрелки направления чтения.</li>
            <li>Экспорт в PNG (для телефона) или PDF (для компьютера).</li>
          </ul>
          <div className="bg-purple-50 rounded-xl p-3 border border-purple-100">
            <p className="text-xs font-semibold text-purple-800 flex items-center gap-1 mb-1">
              <Lightbulb className="w-4 h-4" /> Сценарий:
            </p>
            <p className="text-xs text-purple-700">Идеальный «заполнитель» на последние 7-10 минут урока. Сгенерируйте филворд по новой теме и отправьте скриншот в учебный чат.</p>
          </div>
        </section>

        {/* Калькуляторы */}
        <section className="bg-white rounded-2xl shadow-sm p-5 border border-purple-100">
          <h2 className="text-lg font-bold text-purple-700 mb-3 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-purple-500" /> 6. Калькуляторы
          </h2>
          <p className="text-sm text-gray-600 mb-3">Набор из 6 инструментов для точных расчетов успеваемости и быстрой подготовки отчетов.</p>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 mb-3">
            <li><strong>Средний балл:</strong> расчет с учетом веса оценок.</li>
            <li><strong>Итоговая оценка:</strong> расчет финальной оценки.</li>
            <li><strong>Оценка за четверть:</strong> прогноз желаемого балла.</li>
            <li><strong>Оценка за тест:</strong> перевод правильных ответов в оценку.</li>
            <li><strong>Качество знаний:</strong> процент «4» и «5».</li>
            <li><strong>СОУ:</strong> доля учащихся, усвоивших программу.</li>
          </ul>
          <div className="bg-purple-50 rounded-xl p-3 border border-purple-100">
            <p className="text-xs font-semibold text-purple-800 flex items-center gap-1 mb-1">
              <Lightbulb className="w-4 h-4" /> Сценарий:
            </p>
            <p className="text-xs text-purple-700">Вместо ручного подсчета всего класса, просто введите количество оценок в калькулятор. Мгновенный результат готов для отчета.</p>
          </div>
        </section>

        {/* Бинго */}
        <section className="bg-white rounded-2xl shadow-sm p-5 border border-purple-100">
          <h2 className="text-lg font-bold text-purple-700 mb-3 flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-purple-500" /> 7. Бинго
          </h2>
          <p className="text-sm text-gray-600 mb-3">Конструктор карточек для игры в бинго с готовыми наборами.</p>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 mb-3">
            <li>Размеры сетки: 3×3, 4×4, 5×5 с FREE-клеткой.</li>
            <li>Готовые наборы: «1 сентября», «История», «Новый год».</li>
            <li>Режим проектора для ведущего.</li>
            <li>PDF-карточки для печати и онлайн-игра на телефонах.</li>
          </ul>
          <div className="bg-purple-50 rounded-xl p-3 border border-purple-100">
            <p className="text-xs font-semibold text-purple-800 flex items-center gap-1 mb-1">
              <Lightbulb className="w-4 h-4" /> Сценарий:
            </p>
            <p className="text-xs text-purple-700">Идеально для повторения терминов: читайте определение, ученики отмечают термин на карточке. Первая линия — мини-победа!</p>
          </div>
        </section>

        {/* Своя игра */}
        <section className="bg-white rounded-2xl shadow-sm p-5 border border-purple-100">
          <h2 className="text-lg font-bold text-purple-700 mb-3 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-purple-500" /> 8. Своя игра
          </h2>
          <p className="text-sm text-gray-600 mb-3">Интеллектуальная викторина по принципу телевизионной «Своей игры».</p>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 mb-3">
            <li>Режим разработчика: создание игр с раундами и баллами.</li>
            <li>Режим проектора: табло с клетками-баллами.</li>
            <li>Индивидуальный рейтинг участников с начислением баллов.</li>
            <li>Двусторонняя печать карточек для игры без компьютера.</li>
            <li>Обмен играми между учителями через JSON.</li>
          </ul>
          <div className="bg-purple-50 rounded-xl p-3 border border-purple-100">
            <p className="text-xs font-semibold text-purple-800 flex items-center gap-1 mb-1">
              <Lightbulb className="w-4 h-4" /> Сценарий:
            </p>
            <p className="text-xs text-purple-700">Идеально для урока-викторины: класс делится на команды, открывайте вопросы по выбору учеников. С рейтингом — соревнование до последнего вопроса!</p>
          </div>
        </section>

        {/* Общие советы */}
        <section className="bg-violet-100 rounded-2xl p-5 border border-violet-200">
          <h2 className="text-lg font-bold text-violet-800 mb-2 flex items-center gap-2">
            <Lightbulb className="w-5 h-5" /> Общие советы
          </h2>
          <ul className="list-disc list-inside text-sm text-violet-900 space-y-2">
            <li>Для работы «Контроля шума» разрешите приложению MAX доступ к микрофону в настройках телефона.</li>
            <li>Список класса в «Жеребьёвке» сохраняется автоматически. Введите его один раз.</li>
            <li>Максимальный эффект достигается при выводе Таймера, Жеребьёвки и Шумомера на проектор.</li>
            <li>Скачивание PDF с филвордами стабильнее всего работает с компьютера.</li>
          </ul>
        </section>

        <YandexAdBlock />
      </main>
    </div>
  );
}
