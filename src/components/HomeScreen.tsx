      <main className="flex-1 max-w-md mx-auto w-full px-4 pb-5">
        <div className="grid grid-cols-3 gap-2.5 mt-2">
          {visibleSectionsList.map((section) => {
            const Icon = section.icon;
            return (
              <div key={section.id} className="relative">
                <button
                  onClick={() => onNavigate(section.id)}
                  className="w-full bg-gradient-to-br from-purple-500 to-violet-600 text-white rounded-2xl p-2.5 min-h-[130px] flex flex-col items-center justify-center gap-1.5 shadow-lg active:scale-[0.98] transition-transform touch-manipulation focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2"
                  aria-label={`${section.title} — ${section.description}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-center">
                    <h2 className="text-sm sm:text-base font-bold leading-tight">
                      {section.title}
                    </h2>
                    <p className="text-white/85 text-[11px] sm:text-xs mt-0.5 leading-tight">
                      {section.description}
                    </p>
                  </div>
                </button>

                {section.isTest && (
                  <span className="absolute top-1 left-1 bg-amber-400 text-amber-900 text-[9px] font-bold px-1 py-0.5 rounded-md shadow-sm flex items-center gap-0.5 z-10">
                    <FlaskConical className="w-2.5 h-2.5" />
                    тест
                  </span>
                )}

                <button
                  onClick={() => setActiveHelpModal(section.id)}
                  className="absolute top-0.5 right-0.5 p-1 rounded-full bg-white/25 hover:bg-white/45 flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white z-10"
                  aria-label={`Подсказка: ${section.title}`}
                  title="Подсказка"
                >
                  <HelpCircle className="w-3 h-3 text-white" />
                </button>
              </div>
            );
          })}
        </div>
