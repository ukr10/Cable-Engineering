import React, { useState, useEffect } from 'react'
import { AlertTriangle, BarChart3, Zap } from 'lucide-react'
import axios from 'axios'

interface TrayData {
  name: string
  fill_percentage: number
  capacity: number
  used: number
  warnings: string[]
}

interface OptimizationResult {
  tray: string
  previous_fill: number
  new_fill: number
  cables_moved: number
  improvement: number
}

const TrayFill: React.FC = () => {
  const [trays, setTrays] = useState<TrayData[]>([])
  const [optimization, setOptimization] = useState<OptimizationResult | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchTrayData()
  }, [])

  const fetchTrayData = async () => {
    try {
      const response = await axios.get('/api/v1/routing/trays')
      const trayData = response.data.trays || []
      setTrays(trayData.map((tray: any) => ({
        name: tray.name,
        fill_percentage: tray.fill_percentage,
        capacity: tray.capacity,
        used: Math.round((tray.fill_percentage / 100) * tray.capacity),
        warnings: tray.fill_percentage >= 80 
          ? ['Approaching capacity limit', 'Consider load balancing']
          : tray.fill_percentage >= 50 
          ? ['Medium utilization']
          : []
      })))
    } catch (error) {
      console.error('Failed to fetch tray data:', error)
    }
  }

  const optimizeTrays = async () => {
    setLoading(true)
    try {
      // Simulate optimization
      const overfilledTray = trays.find(t => t.fill_percentage > 80)
      if (overfilledTray) {
        setOptimization({
          tray: overfilledTray.name,
          previous_fill: overfilledTray.fill_percentage,
          new_fill: overfilledTray.fill_percentage - 15,
          cables_moved: 3,
          improvement: 15
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const getTrayStatus = (fill: number) => {
    if (fill >= 90) return { label: 'Critical', color: 'text-red-400', bg: 'bg-red-500/20', borderColor: 'border-red-500/50' }
    if (fill >= 80) return { label: 'High', color: 'text-orange-400', bg: 'bg-orange-500/20', borderColor: 'border-orange-500/50' }
    if (fill >= 50) return { label: 'Medium', color: 'text-yellow-400', bg: 'bg-yellow-500/20', borderColor: 'border-yellow-500/50' }
    return { label: 'Low', color: 'text-green-400', bg: 'bg-green-500/20', borderColor: 'border-green-500/50' }
  }

  const getProgressColor = (fill: number) => {
    if (fill >= 90) return 'bg-red-500'
    if (fill >= 80) return 'bg-orange-500'
    if (fill >= 50) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const totalCapacity = trays.reduce((sum, t) => sum + t.capacity, 0)
  const totalUsed = trays.reduce((sum, t) => sum + t.used, 0)
  const overallFill = totalCapacity > 0 ? Math.round((totalUsed / totalCapacity) * 100) : 0

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Tray Fill Management</h1>
        <p className="text-gray-400">Monitor and optimize cable tray utilization</p>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="card-glow p-6 rounded-xl">
          <p className="text-gray-400 text-sm mb-2">Total Capacity</p>
          <p className="text-3xl font-bold text-white">{totalCapacity}</p>
          <p className="text-xs text-gray-500 mt-2">circuits</p>
        </div>
        <div className="card-glow p-6 rounded-xl">
          <p className="text-gray-400 text-sm mb-2">Cables Routed</p>
          <p className="text-3xl font-bold text-white">{totalUsed}</p>
          <p className="text-xs text-gray-500 mt-2">cables</p>
        </div>
        <div className="card-glow p-6 rounded-xl">
          <p className="text-gray-400 text-sm mb-2">Overall Fill</p>
          <p className={`text-3xl font-bold ${overallFill >= 80 ? 'text-orange-400' : 'text-cyan-400'}`}>
            {overallFill}%
          </p>
          <p className="text-xs text-gray-500 mt-2">average</p>
        </div>
        <div className="card-glow p-6 rounded-xl">
          <p className="text-gray-400 text-sm mb-2">Available Slots</p>
          <p className="text-3xl font-bold text-green-400">{totalCapacity - totalUsed}</p>
          <p className="text-xs text-gray-500 mt-2">remaining</p>
        </div>
      </div>

      {/* Trays Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {trays.map((tray) => {
          const status = getTrayStatus(tray.fill_percentage)
          return (
            <div key={tray.name} className={`card-glow p-6 rounded-xl border ${status.borderColor}`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{tray.name}</h3>
                  <p className={`text-sm font-medium ${status.color}`}>{status.label}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status.bg} ${status.color}`}>
                  {tray.fill_percentage}%
                </span>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-400 mb-2">
                  <span>Fill Level</span>
                  <span>{tray.used} / {tray.capacity}</span>
                </div>
                <div className="h-3 rounded-full bg-slate-600 overflow-hidden">
                  <div 
                    className={`h-full ${getProgressColor(tray.fill_percentage)} transition-all rounded-full`}
                    style={{ width: `${tray.fill_percentage}%` }}
                  />
                </div>
              </div>

              {tray.warnings.length > 0 && (
                <div className="space-y-2 pt-4 border-t border-slate-600">
                  {tray.warnings.map((warning, i) => (
                    <div key={i} className="flex gap-2 text-xs text-yellow-400">
                      <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                      <span>{warning}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Optimization Panel */}
      <div className="card-glow p-6 rounded-xl mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-white">Tray Optimization</h2>
            <p className="text-sm text-gray-400">Rebalance cables to optimize fill distribution</p>
          </div>
          <button
            onClick={optimizeTrays}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-cyan-500 text-gray-900 font-semibold hover:bg-cyan-400 disabled:opacity-50"
          >
            <BarChart3 className="w-5 h-5" />
            {loading ? 'Optimizing...' : 'Optimize Distribution'}
          </button>
        </div>

        {optimization && (
          <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">Tray</p>
                <p className="text-lg font-semibold text-white">{optimization.tray}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Previous Fill</p>
                <p className="text-lg font-semibold text-orange-400">{optimization.previous_fill}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Optimized Fill</p>
                <p className="text-lg font-semibold text-green-400">{optimization.new_fill}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Improvement</p>
                <p className="text-lg font-semibold text-cyan-400">+{optimization.improvement}%</p>
              </div>
              <div className="md:col-span-4">
                <p className="text-sm text-gray-300">
                  <Zap className="w-4 h-4 inline mr-2 text-yellow-400" />
                  {optimization.cables_moved} cables rebalanced to optimize tray utilization
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recommendations */}
      <div className="card-glow p-6 rounded-xl">
        <h2 className="text-xl font-semibold text-white mb-4">Recommendations</h2>
        <div className="space-y-3">
          {trays.filter(t => t.fill_percentage >= 80).length > 0 && (
            <div className="flex gap-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
              <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-orange-400">Load Balancing Required</p>
                <p className="text-sm text-gray-300 mt-1">
                  {trays.filter(t => t.fill_percentage >= 80).length} tray(s) exceeding 80% capacity. Consider rebalancing cables.
                </p>
              </div>
            </div>
          )}
          <div className="flex gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <Zap className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-400">Peak Efficiency</p>
              <p className="text-sm text-gray-300 mt-1">
                Ideal tray utilization is 60-70%. Current average: {overallFill}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TrayFill
