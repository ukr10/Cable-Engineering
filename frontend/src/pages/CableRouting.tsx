import React, { useState, useEffect } from 'react'
import { ArrowRight, Zap, Navigation, AlertCircle } from 'lucide-react'
import axios from 'axios'
import TrayGraph from '../components/TrayGraph'

interface RoutingInput {
  source: string
  target: string
  algorithm: 'shortest' | 'least-fill'
}

interface RoutingResult {
  path: string[]
  total_length: number
  tray_fill_status: string
  warnings: string[]
}

interface TrayInfo {
  name: string
  fill_percentage: number
  capacity: number
}

const CableRouting: React.FC = () => {
  const [input, setInput] = useState<RoutingInput>({
    source: '',
    target: '',
    algorithm: 'shortest'
  })
  const [result, setResult] = useState<RoutingResult | null>(null)
  const [trays, setTrays] = useState<TrayInfo[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchTrays = async () => {
      try {
        const response = await axios.get('/api/v1/routing/trays')
        setTrays(response.data.trays || [])
      } catch (error) {
        console.error('Failed to fetch trays:', error)
      }
    }
    fetchTrays()
  }, [])

  const handleRoute = async () => {
    if (!input.source || !input.target) {
      alert('Please select both source and target equipment')
      return
    }

    setLoading(true)
    try {
      const endpoint = input.algorithm === 'shortest' 
        ? '/api/v1/routing/auto' 
        : '/api/v1/routing/optimize'
      
      const response = await axios.post(endpoint, {
        source: input.source,
        target: input.target
      })
      setResult(response.data)
    } catch (error) {
      alert('Routing calculation failed')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const getTrayColor = (fill: number) => {
    if (fill >= 90) return 'bg-red-500'
    if (fill >= 70) return 'bg-orange-500'
    if (fill >= 50) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Cable Routing</h1>
        <p className="text-gray-400">Optimal cable path planning with tray fill consideration</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Panel */}
        <div className="lg:col-span-2 card-glow p-6 rounded-xl">
          <h2 className="text-xl font-semibold text-white mb-6">Route Configuration</h2>
          
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Source Equipment</label>
              <select 
                value={input.source}
                onChange={(e) => setInput({...input, source: e.target.value})}
                className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="">Select source...</option>
                <option value="DB-01">DB-01 (Main Distribution)</option>
                <option value="DB-02">DB-02 (Secondary Dist.)</option>
                <option value="EQ-01">EQ-01 (Equipment 1)</option>
                <option value="EQ-02">EQ-02 (Equipment 2)</option>
                <option value="EQ-03">EQ-03 (Equipment 3)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Target Equipment</label>
              <select 
                value={input.target}
                onChange={(e) => setInput({...input, target: e.target.value})}
                className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="">Select target...</option>
                <option value="DB-01">DB-01 (Main Distribution)</option>
                <option value="DB-02">DB-02 (Secondary Dist.)</option>
                <option value="EQ-01">EQ-01 (Equipment 1)</option>
                <option value="EQ-02">EQ-02 (Equipment 2)</option>
                <option value="EQ-03">EQ-03 (Equipment 3)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Routing Algorithm</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    value="shortest" 
                    checked={input.algorithm === 'shortest'}
                    onChange={(e) => setInput({...input, algorithm: e.target.value as 'shortest' | 'least-fill'})}
                    className="w-4 h-4"
                  />
                  <span className="text-gray-300">Shortest Path</span>
                </label>
                <label className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    value="least-fill" 
                    checked={input.algorithm === 'least-fill'}
                    onChange={(e) => setInput({...input, algorithm: e.target.value as 'shortest' | 'least-fill'})}
                    className="w-4 h-4"
                  />
                  <span className="text-gray-300">Least Fill</span>
                </label>
              </div>
            </div>
          </div>

          <button
            onClick={handleRoute}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-cyan-500 text-gray-900 font-semibold hover:bg-cyan-400 disabled:opacity-50"
          >
            <Navigation className="w-5 h-5" />
            {loading ? 'Calculating Route...' : 'Calculate Route'}
          </button>
        </div>

        {/* Results Panel */}
        {result && (
          <div className="card-glow p-6 rounded-xl">
            <h2 className="text-xl font-semibold text-white mb-4">Route Result</h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">Path</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {result.path.map((node, i) => (
                    <React.Fragment key={i}>
                      <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-sm">
                        {node}
                      </span>
                      {i < result.path.length - 1 && (
                        <ArrowRight className="w-4 h-4 text-gray-500" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-600">
                <p className="text-xs text-gray-400 mb-1">Total Length</p>
                <p className="text-2xl font-bold text-cyan-400">
                  {result.total_length.toFixed(1)} m
                </p>
              </div>

              <div className="pt-4 border-t border-slate-600">
                <p className="text-xs text-gray-400 mb-2">Tray Status</p>
                <div className="px-3 py-2 rounded-lg bg-green-500/20 text-green-400 text-sm">
                  {result.tray_fill_status}
                </div>
              </div>

              {result.warnings.length > 0 && (
                <div className="pt-4 border-t border-slate-600">
                  <p className="text-xs text-gray-400 mb-2">Warnings</p>
                  {result.warnings.map((warning, i) => (
                    <div key={i} className="flex gap-2 text-sm text-yellow-400 mb-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{warning}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tray Status Overview */}
      <div className="mt-8 card-glow p-6 rounded-xl">
        <h2 className="text-xl font-semibold text-white mb-6">Tray Fill Overview</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <TrayGraph />
          </div>
          <div>
            <div className="space-y-4">
              {trays.map((tray) => (
                <div key={tray.name} className="p-4 rounded-lg bg-slate-700/50 border border-slate-600">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-300">{tray.name}</p>
                    <p className="text-sm font-semibold text-white">{tray.fill_percentage}%</p>
                  </div>
                  <div className="mb-2">
                    <div className="h-2 rounded-full bg-slate-600 overflow-hidden">
                      <div 
                        className={`h-full ${getTrayColor(tray.fill_percentage)} transition-all`}
                        style={{ width: `${tray.fill_percentage}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">{tray.capacity} circuits available</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CableRouting
