import React, { useState } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  Cable,
  AlertCircle,
  Clock,
  Zap,
  Download,
  Filter,
  X,
} from 'lucide-react'

interface DashboardCardProps {
  title: string
  value: string | number
  subtitle: string
  icon: React.ReactNode
  color: 'cyan' | 'blue' | 'purple' | 'red' | 'green'
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, value, subtitle, icon, color }) => {
  const colorClasses = {
    cyan: 'from-cyan-500/20 to-cyan-600/20 border-cyan-500/30',
    blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
    purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
    red: 'from-red-500/20 to-red-600/20 border-red-500/30',
    green: 'from-green-500/20 to-green-600/20 border-green-500/30',
  }

  return (
    <div className={`card-glow bg-gradient-to-br ${colorClasses[color]} p-6 rounded-xl`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400 mb-2">{title}</p>
          <p className="text-3xl font-bold text-white mb-1">{value}</p>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
        <div className="text-2xl opacity-50">{icon}</div>
      </div>
    </div>
  )
}

const Dashboard: React.FC = () => {
  const [notifications] = useState([
    { id: 1, type: 'error', message: '15 cables exceeding voltage drop limit in Building 8', time: 'now' },
    { id: 2, type: 'warning', message: '3 trays overfill/limit in Comber C', time: '9min' },
    { id: 3, type: 'info', message: '3 unrouted cables in Pariel A', time: '2min' },
  ])

  // Mock data for charts

  const trayFillData = [
    { name: 'PHP-03', fill: 88 },
    { name: 'PHP-05', fill: 87 },
    { name: 'PHP-07', fill: 88 },
    { name: 'PHP-12', fill: 79 },
  ]

  const topTrays = [
    { id: 'PHP-03', size: '300 x 100', fill: 88, cables: 16 },
    { id: 'PHP-12', size: '400 x 75', fill: 87, cables: 24 },
    { id: 'PHP-07', size: '400 x 100', fill: 88, cables: 27 },
    { id: 'PHP-16', size: '500 x 100', fill: 79, cables: 32 },
  ]

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Executive Summary</h1>
          <p className="text-gray-400">Project L-03 TCE • Cable Engineering Dashboard</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors">
            <Filter className="w-4 h-4" />
            Filter
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <DashboardCard
          title="Total Cables"
          value="12,347"
          subtitle="Total Cables"
          icon={<Cable />}
          color="cyan"
        />
        <DashboardCard
          title="Total Trays"
          value="731"
          subtitle="Total Trays"
          icon={<Zap />}
          color="blue"
        />
        <DashboardCard
          title="Overfilled Trays"
          value="52"
          subtitle="Requires Action"
          icon={<AlertCircle />}
          color="red"
        />
        <DashboardCard
          title="Cables Pending Ver"
          value="2:3"
          subtitle="Verification Status"
          icon={<Clock />}
          color="purple"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Cable Load Distribution */}
        <div className="lg:col-span-2 card-glow p-6 rounded-xl">
          <h3 className="text-lg font-semibold text-white mb-6">Cable Load Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={[
              { name: 'Main SWGR Building A', power: 240 },
              { name: 'STG Building C', power: 140 },
              { name: 'HRSG Cluster 1S', power: 220 },
              { name: 'CT SWGR Building', power: 100 },
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
              <Legend />
              <Line type="monotone" dataKey="power" stroke="#06b6d4" strokeWidth={2} name="Power Load (kW)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Tray Fill Status */}
        <div className="card-glow p-6 rounded-xl">
          <h3 className="text-lg font-semibold text-white mb-6">Tray Fill Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={trayFillData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
              <Bar dataKey="fill" fill="#22d3ee" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tray Fill Heatmap */}
        <div className="lg:col-span-2 card-glow p-6 rounded-xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Tray Fill Heatmap</h3>
            <button className="px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 text-sm font-medium transition-colors">
              Go to location
            </button>
          </div>
          {/* Simple heatmap visualization */}
          <div className="grid grid-cols-8 gap-2 mb-6">
            {Array.from({ length: 64 }).map((_, i) => {
              const fillLevel = Math.random() * 100
              const bgColor = fillLevel > 80 ? 'bg-red-500/60' : fillLevel > 60 ? 'bg-orange-500/60' : 'bg-cyan-500/30'
              return (
                <div key={i} className={`w-8 h-8 rounded ${bgColor} cursor-pointer hover:scale-110 transition-transform`} title={`${fillLevel.toFixed(0)}%`} />
              )
            })}
          </div>
          <div className="flex gap-4 justify-center text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-cyan-500/30"></div>
              <span className="text-gray-400">&lt;50.00%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-orange-500/60"></div>
              <span className="text-gray-400">50 - 50%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500/60"></div>
              <span className="text-gray-400">{`> 80%`}</span>
            </div>
          </div>
        </div>

        {/* Cable Length & Estimation */}
        <div className="card-glow p-6 rounded-xl">
          <h3 className="text-lg font-semibold text-white mb-4">Cable Length | Overall</h3>
          <div className="bg-slate-900/50 rounded-lg p-6 mb-6">
            <div className="text-center">
              <p className="text-gray-400 text-sm mb-2">Drum</p>
              <p className="text-gray-400 text-sm mb-2">Estimation</p>
              <p className="text-3xl font-bold text-cyan-400">+ 143,680 m</p>
              <p className="text-xs text-gray-500 mt-2">required</p>
              <p className="text-xs text-gray-500">(4 types</p>
            </div>
          </div>
        </div>

        {/* Cable Length Estimation Table */}
        <div className="lg:col-span-2 card-glow p-6 rounded-xl">
          <h3 className="text-lg font-semibold text-white mb-6">Top Trays/Issues</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-600">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Tray</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Size</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Fill %</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Cables</th>
                </tr>
              </thead>
              <tbody>
                {topTrays.map((tray) => (
                  <tr key={tray.id} className="border-b border-gray-700 hover:bg-cyan-500/10 transition-colors">
                    <td className="py-3 px-4 text-gray-300 font-medium">{tray.id}</td>
                    <td className="py-3 px-4 text-gray-400">{tray.size}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${tray.fill > 80 ? 'bg-red-500/20 text-red-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                        {tray.fill}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-400">{tray.cables}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Smart Notifications */}
        <div className="card-glow p-6 rounded-xl">
          <h3 className="text-lg font-semibold text-white mb-6">Smart Notifications</h3>
          <div className="space-y-3">
            {notifications.map((notif) => (
              <div key={notif.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/40 border border-gray-700">
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                  notif.type === 'error' ? 'bg-red-500' : notif.type === 'warning' ? 'bg-orange-500' : 'bg-blue-500'
                }`}></div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-300">{notif.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{notif.time}</p>
                </div>
                <button className="text-gray-500 hover:text-gray-400">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-6 flex gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span className="text-gray-500">Power</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
              <span className="text-gray-500">Control</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span className="text-gray-500">Instrumen</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
