      <header className="max-w-md mx-auto w-full px-5 pt-4 pb-3">
        {/* Шапка: левая колонка иконок | логотип с подписью */}
        <div className="flex items-start gap-3">
          {/* Левая колонка: шестерёнка СВЕРХУ, руководство СНИЗУ */}
          <div className="shrink-0 flex flex-col items-center gap-2">
            {/* Шестерёнка */}
            <div className="group relative">
              <button
                onClick={handleGearClick}
                onMouseEnter={() => setGearActive(true)}
                onMouseLeave={() => setGearActive(false)}
                onFocus={() => setGearActive(true)}
                onBlur={() => setGearActive(false)}
                className="relative text-gray-400 hover:text-purple-600 transition-colors p-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white/60 backdrop-blur-sm shadow-sm"
                aria-label="Настройки внешнего вида"
              >
                {!gearSeen && (
                  <>
                    <span className="absolute inset-0 rounded-xl bg-purple-400/60 animate-ping" />
                    <span className="absolute inset-0 rounded-xl ring-2 ring-purple-500 animate-pulse" />
                  </>
                )}
                <Settings
                  className={`relative z-10 w-6 h-6 transition-transform duration-700 ease-in-out ${
                    gearActive ? 'rotate-[360deg] text-purple-600' : 'rotate-0'
                  }`}
                />
              </button>
              
              {/* Tooltip справа от иконки */}
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-lg">
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                Настройка разделов
              </div>
            </div>

            {/* Руководство */}
            <div className="group relative">
              <button
                onClick={handleManualClick}
                className="relative text-gray-400 hover:text-purple-600 transition-colors p-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white/60 backdrop-blur-sm shadow-sm"
                aria-label="Руководство по использованию"
                title="Руководство"
              >
                {!manualSeen && (
                  <>
                    <span className="absolute inset-0 rounded-xl bg-purple-400/60 animate-ping" />
                    <span className="absolute inset-0 rounded-xl ring-2 ring-purple-500 animate-pulse" />
                  </>
                )}
                <BookOpen className="relative z-10 w-6 h-6" />
              </button>
              
              {/* Tooltip справа от иконки */}
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-lg">
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                Руководство
              </div>
            </div>
          </div>

          {/* Логотип с подписью (flex-1) */}
          <div className="flex-1 flex flex-col items-center min-w-0">
            <h1 className="sr-only">Помощник учителя</h1>
            <a
              href="https://vk.ru/topteach"
              target="_blank"
              rel="noopener noreferrer"
              className="block transition-all duration-200 ease-out hover:scale-[1.03] hover:brightness-110 hover:drop-shadow-[0_0_12px_rgba(168,85,247,0.55)] active:scale-[0.98] rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2"
              aria-label="Сообщество «Помощник учителя» ВКонтакте"
              title="Перейти в сообщество ВКонтакте"
            >
              <img
                src={`${import.meta.env.BASE_URL}logo.png`}
                alt="Помощник учителя"
                className="h-24 sm:h-32 w-auto object-contain select-none"
                draggable={false}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            </a>
            {/* Подзаголовок под логотипом с минимальным отступом */}
            <p className="mt-1 text-xs sm:text-sm text-gray-500 text-center leading-tight">
              Простые инструменты для сложных задач
            </p>
          </div>
        </div>
      </header>
