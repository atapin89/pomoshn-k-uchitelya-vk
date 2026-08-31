import React from 'react'

const QuestionAnswer = ({ 
  index, 
  question, 
  onChange, 
  onRemove,
  disabled = false 
}) => {
  return (
    <div className="flex gap-2 items-start bg-white rounded-xl p-3 border-2 border-purple-100">
      <span className="text-xs font-bold text-purple-400 pt-2.5 w-6 shrink-0">
        {index + 1}
      </span>
      <input
        type="text"
        value={question.left}
        onChange={(e) => onChange(index, 'left', e.target.value)}
        placeholder="Вопрос"
        disabled={disabled}
        maxLength={15}
        className="flex-1 rounded-lg border border-gray-200 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:bg-gray-50"
      />
      <span className="text-gray-400 pt-2.5">→</span>
      <input
        type="text"
        value={question.right}
        onChange={(e) => onChange(index, 'right', e.target.value)}
        placeholder="Ответ"
        disabled={disabled}
        maxLength={15}
        className="flex-1 rounded-lg border border-gray-200 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:bg-gray-50"
      />
      {onRemove && (
        <button
          onClick={() => onRemove(index)}
          disabled={disabled}
          className="p-2 text-gray-300 hover:text-red-500 transition-colors mt-1 disabled:opacity-50"
          aria-label="Удалить пару"
        >
          ✕
        </button>
      )}
    </div>
  )
}

export default QuestionAnswer
