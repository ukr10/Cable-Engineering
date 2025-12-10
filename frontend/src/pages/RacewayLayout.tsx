import React, { useState } from 'react'
import { Grid3x3, RefreshCw, Download } from 'lucide-react'

const RacewayLayout: React.FC = () => {
  const [selectedRaceway] = useState('RW-01')

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Raceway Layout</h1>
        <p className="text-gray-400">2D and 3D visualization of raceway paths and cable arrangement</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="card-glow p-6 rounded-xl">
          <h3 className="text-lg font-semibold text-white mb-4">Raceways</h3>
          <div className="space-y-2">
            {['RW-01', 'RW-02', 'RW-03'].map(rw => (
              <button
                key={rw}
                className={`w-full text-left px-4 py-2 rounded-lg transition ${
                  selectedRaceway === rw
                    ? 'bg-cyan-500 text-gray-900 font-semibold'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                {rw}
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3 card-glow p-6 rounded-xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Layout View - {selectedRaceway}</h2>
            <div className="flex gap-2">
              <button className="p-2 hover:bg-slate-700 rounded-lg transition">
                <RefreshCw className="w-5 h-5 text-gray-400" />
              </button>
              <button className="p-2 hover:bg-slate-700 rounded-lg transition">
                <Download className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg p-8 flex items-center justify-center min-h-96">
            <div className="text-center">
              <Grid3x3 className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">3D Raceway Visualization</p>
              <p className="text-sm text-gray-500 mt-2">Interactive 3D view coming soon</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RacewayLayout
