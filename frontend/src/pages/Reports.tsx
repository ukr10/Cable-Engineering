import React, { useState } from 'react'
import { FileText, Download, Eye } from 'lucide-react'

interface ReportItem {
  id: string
  name: string
  description: string
  generated: string
  type: 'sizing' | 'routing' | 'tray' | 'drum'
}

const Reports: React.FC = () => {
  const [reports] = useState<ReportItem[]>([
    {
      id: '1',
      name: 'Cable Sizing Report - L-03',
      description: 'Complete cable sizing for Project L-03 with all calculations and derating factors',
      generated: '2025-12-05',
      type: 'sizing'
    },
    {
      id: '2',
      name: 'Tray Fill Analysis',
      description: 'Comprehensive tray fill report with heatmap and utilization metrics',
      generated: '2025-12-04',
      type: 'tray'
    },
    {
      id: '3',
      name: 'Cable Routing Schedule',
      description: 'Optimal cable routing paths with tray assignments and length estimates',
      generated: '2025-12-03',
      type: 'routing'
    },
  ])

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Reports & Export</h1>
        <p className="text-gray-400">Generate and download engineering reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => (
          <div key={report.id} className="card-glow p-6 rounded-xl">
            <div className="flex items-start justify-between mb-4">
              <FileText className="w-6 h-6 text-cyan-400" />
              <span className="text-xs px-2 py-1 rounded-full bg-cyan-500/20 text-cyan-400">
                {report.type}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{report.name}</h3>
            <p className="text-sm text-gray-400 mb-4">{report.description}</p>
            <p className="text-xs text-gray-500 mb-4">Generated: {report.generated}</p>
            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 text-sm">
                <Eye className="w-4 h-4" />
                Preview
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 text-sm">
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Reports
