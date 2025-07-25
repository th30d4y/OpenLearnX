import React from 'react'

interface CompetencyData {
  subject: string
  score: number
  tests: number
}

interface CompetencyRadarProps {
  data: CompetencyData[]
}

export const CompetencyRadar: React.FC<CompetencyRadarProps> = ({ data }) => {
  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">Competency Overview</h3>
      
      {/* Simple visualization without chart library */}
      <div className="space-y-4">
        {data.map((item) => (
          <div key={item.subject} className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">{item.subject}</span>
              <span className="text-sm text-gray-600">{item.score.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${item.score}%` }}
              />
            </div>
            <div className="text-xs text-gray-500">
              {item.tests} test{item.tests !== 1 ? 's' : ''} completed
            </div>
          </div>
        ))}
      </div>
      
      {data.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No competency data available yet.</p>
          <p className="text-sm mt-2">Take some tests to see your progress!</p>
        </div>
      )}
    </div>
  )
}
