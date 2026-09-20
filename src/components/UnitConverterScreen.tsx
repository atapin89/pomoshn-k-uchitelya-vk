        {/* ===== Результаты (компактный список) ===== */}
        <section className="bg-white rounded-2xl p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-purple-700 text-base">Во всех единицах</h3>
              <span className="text-xs text-gray-400">({category.units.length})</span>
            </div>
            {numericValue !== null && (
              <span className="text-[10px] text-gray-400 hidden sm:block">
                ↻ — использовать значение как ввод
              </span>
            )}
          </div>

          {numericValue === null ? (
            <p className="text-sm text-gray-400 text-center py-4">
              Введите число сверху, чтобы увидеть перевод
            </p>
          ) : (
            <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
              {conversions.map((c) => (
                <div
                  key={c.unit.id}
                  title={`${c.unit.name}${c.unit.note ? ' · ' + c.unit.note : ''}${c.unit.era ? ' · с ' + c.unit.era : ''}`}
                  className={`flex items-center gap-2 px-2.5 py-1.5 transition-colors ${
                    c.isFrom ? 'bg-purple-50' : 'hover:bg-gray-50'
                  }`}
                >
                  {/* Символ */}
                  <span className="w-14 sm:w-16 shrink-0 font-mono font-bold text-purple-700 text-sm truncate">
                    {c.unit.symbol}
                  </span>

                  {/* Значение */}
                  <span className="flex-1 min-w-0 font-mono text-sm text-gray-800 break-all leading-snug">
                    {formatNumber(c.value)}
                  </span>

                  {/* Название */}
                  <span className="w-24 sm:w-44 shrink-0 text-[11px] sm:text-xs text-gray-500 truncate">
                    {c.unit.name}
                  </span>

                  {/* Копировать */}
                  <button
                    onClick={() => handleCopy(formatNumber(c.value))}
                    className="p-1 rounded hover:bg-white transition-colors shrink-0"
                    aria-label={`Копировать ${c.unit.name}`}
                  >
                    {copied === formatNumber(c.value) ? (
                      <Check className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-gray-400" />
                    )}
                  </button>

                  {/* Использовать как ввод */}
                  {!c.isFrom && (
                    <button
                      onClick={() => useAsInput(c.unit.id, c.value)}
                      className="p-1 rounded hover:bg-white transition-colors shrink-0"
                      aria-label="Использовать как ввод"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
