import React, { useState } from 'react'
import { Truck, Calculator, Info } from 'lucide-react'

interface DrumConfig {
  cableLength: number
  drumSize: string
  wireType: string
}

const DrumEstimation: React.FC = () => {
  const [config, setConfig] = useState<DrumConfig>({
    cableLength: 500,
    drumSize: 'standard',
    wireType: 'xlpe'
  })

  const drumSizes = {
    compact: { diameter: 500, width: 300, capacity: 100 },
    standard: { diameter: 1000, width: 500, capacity: 500 },
    large: { diameter: 1500, width: 750, capacity: 1500 }
  }

  const selectedDrum = drumSizes[config.drumSize as keyof typeof drumSizes]
  const requiredDrums = Math.ceil(config.cableLength / selectedDrum.capacity)

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Drum Estimation</h1>
        <p className="text-gray-400">Calculate optimal drum configuration for cable spools</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Panel */}
        <div className="card-glow p-6 rounded-xl">
          <h2 className="text-xl font-semibold text-white mb-6">Configuration</h2>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Total Cable Length (m)</label>
              <input
                type="number"
                value={config.cableLength}
                onChange={(e) => setConfig({ ...config, cableLength: parseInt(e.target.value) })}
                className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Drum Size</label>
              <select
                value={config.drumSize}
                onChange={(e) => setConfig({ ...config, drumSize: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="compact">Compact (100m capacity)</option>
                <option value="standard">Standard (500m capacity)</option>
                <option value="large">Large (1500m capacity)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Wire Type</label>
              <select
                value={config.wireType}
                onChange={(e) => setConfig({ ...config, wireType: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="xlpe">XLPE Insulated</option>
                <option value="pvc">PVC Insulated</option>
                <option value="armored">Armored</option>
              </select>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-600">
            <p className="text-xs text-gray-400 mb-2">Drum Specifications</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Diameter</span>
                <span className="text-white font-semibold">{selectedDrum.diameter}mm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Width</span>
                <span className="text-white font-semibold">{selectedDrum.width}mm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Capacity</span>
                <span className="text-cyan-400 font-semibold">{selectedDrum.capacity}m</span>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card-glow p-6 rounded-xl">
            <h2 className="text-xl font-semibold text-white mb-4">Estimation Results</h2>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-700/50 p-4 rounded-lg">
                <p className="text-gray-400 text-sm mb-1">Required Drums</p>
                <p className="text-4xl font-bold text-cyan-400">{requiredDrums}</p>
              </div>
              <div className="bg-slate-700/50 p-4 rounded-lg">
                <p className="text-gray-400 text-sm mb-1">Total Drum Capacity</p>
                <p className="text-4xl font-bold text-green-400">{requiredDrums * selectedDrum.capacity}m</p>
              </div>
            </div>

            <div className="bg-slate-700/50 p-4 rounded-lg">
              <div className="flex gap-2 mb-3">
                <Truck className="w-5 h-5 text-orange-400 flex-shrink-0" />
                <p className="font-medium text-white">Drum Details</p>
              </div>
              <div className="space-y-2 text-sm">
                {Array.from({ length: requiredDrums }).map((_, i) => {
                  const remaining = Math.max(0, config.cableLength - i * selectedDrum.capacity)
                  const fill = Math.min(remaining, selectedDrum.capacity)
                  const fillPercent = (fill / selectedDrum.capacity) * 100
                  return (
                    <div key={i} className="bg-slate-800 p-3 rounded">
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-300">Drum {i + 1}</span>
                        <span className="text-cyan-400 font-semibold">{fill}m / {selectedDrum.capacity}m</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-600 overflow-hidden">
                        <div 
                          className="h-full bg-green-500 transition-all"
                          style={{ width: `${fillPercent}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="card-glow p-6 rounded-xl">
            <div className="flex gap-3 text-sm text-blue-400">
              <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Optimization Tips</p>
                <ul className="text-gray-300 mt-2 space-y-1 text-xs">
                  <li>• Select drum size based on available transport capacity</li>
                  <li>• Consider weight limits for each drum type</li>
                  <li>• Leave 10-15% headroom for safe handling</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DrumEstimation
