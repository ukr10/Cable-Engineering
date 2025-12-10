import React, { useState } from 'react'
import { Plus, Trash2, Edit2, Check } from 'lucide-react'

interface Termination {
  id: string
  cableId: string
  fromTerminal: string
  toTerminal: string
  quantity: number
  status: 'pending' | 'installed' | 'verified'
}

const TerminationManager: React.FC = () => {
  const [terminations, setTerminations] = useState<Termination[]>([
    {
      id: '1',
      cableId: 'CA-001',
      fromTerminal: 'TP-A1',
      toTerminal: 'TP-B1',
      quantity: 1,
      status: 'installed'
    },
    {
      id: '2',
      cableId: 'CA-002',
      fromTerminal: 'TP-A2',
      toTerminal: 'TP-B2',
      quantity: 3,
      status: 'verified'
    }
  ])

  const [newTermination, setNewTermination] = useState({
    cableId: '',
    fromTerminal: '',
    toTerminal: '',
    quantity: 1
  })

  const addTermination = () => {
    if (newTermination.cableId && newTermination.fromTerminal && newTermination.toTerminal) {
      setTerminations([
        ...terminations,
        {
          id: Date.now().toString(),
          ...newTermination,
          status: 'pending'
        }
      ])
      setNewTermination({ cableId: '', fromTerminal: '', toTerminal: '', quantity: 1 })
    }
  }

  const updateStatus = (id: string, status: Termination['status']) => {
    setTerminations(terminations.map(t => t.id === id ? { ...t, status } : t))
  }

  const deleteTermination = (id: string) => {
    setTerminations(terminations.filter(t => t.id !== id))
  }

  const getStatusColor = (status: Termination['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400'
      case 'installed': return 'bg-blue-500/20 text-blue-400'
      case 'verified': return 'bg-green-500/20 text-green-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Termination Manager</h1>
        <p className="text-gray-400">Manage cable termination schedule and verification</p>
      </div>

      {/* Add New Termination */}
      <div className="card-glow p-6 rounded-xl mb-8">
        <h2 className="text-xl font-semibold text-white mb-6">Add New Termination</h2>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input
            type="text"
            placeholder="Cable ID"
            value={newTermination.cableId}
            onChange={(e) => setNewTermination({ ...newTermination, cableId: e.target.value })}
            className="px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
          />
          <input
            type="text"
            placeholder="From Terminal"
            value={newTermination.fromTerminal}
            onChange={(e) => setNewTermination({ ...newTermination, fromTerminal: e.target.value })}
            className="px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
          />
          <input
            type="text"
            placeholder="To Terminal"
            value={newTermination.toTerminal}
            onChange={(e) => setNewTermination({ ...newTermination, toTerminal: e.target.value })}
            className="px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
          />
          <input
            type="number"
            min="1"
            placeholder="Quantity"
            value={newTermination.quantity}
            onChange={(e) => setNewTermination({ ...newTermination, quantity: parseInt(e.target.value) })}
            className="px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
          />
          <button
            onClick={addTermination}
            className="px-4 py-2 rounded-lg bg-cyan-500 text-gray-900 font-semibold hover:bg-cyan-400 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>

      {/* Terminations List */}
      <div className="card-glow p-6 rounded-xl">
        <h2 className="text-xl font-semibold text-white mb-6">Termination Schedule</h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-600">
                <th className="text-left px-4 py-3 text-gray-300 font-medium">Cable ID</th>
                <th className="text-left px-4 py-3 text-gray-300 font-medium">From Terminal</th>
                <th className="text-left px-4 py-3 text-gray-300 font-medium">To Terminal</th>
                <th className="text-center px-4 py-3 text-gray-300 font-medium">Quantity</th>
                <th className="text-center px-4 py-3 text-gray-300 font-medium">Status</th>
                <th className="text-center px-4 py-3 text-gray-300 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {terminations.map((term) => (
                <tr key={term.id} className="border-b border-slate-700 hover:bg-slate-800/50">
                  <td className="px-4 py-3 text-white">{term.cableId}</td>
                  <td className="px-4 py-3 text-gray-300">{term.fromTerminal}</td>
                  <td className="px-4 py-3 text-gray-300">{term.toTerminal}</td>
                  <td className="px-4 py-3 text-center text-white">{term.quantity}</td>
                  <td className="px-4 py-3 text-center">
                    <select
                      value={term.status}
                      onChange={(e) => updateStatus(term.id, e.target.value as Termination['status'])}
                      className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer outline-none ${getStatusColor(term.status)}`}
                    >
                      <option value="pending">Pending</option>
                      <option value="installed">Installed</option>
                      <option value="verified">Verified</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex gap-2 justify-center">
                      <button className="p-1 hover:bg-slate-700 rounded transition">
                        <Edit2 className="w-4 h-4 text-blue-400" />
                      </button>
                      <button onClick={() => deleteTermination(term.id)} className="p-1 hover:bg-slate-700 rounded transition">
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-600">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-gray-400 text-sm">Total Terminations</p>
              <p className="text-2xl font-bold text-white">{terminations.length}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">Pending Verification</p>
              <p className="text-2xl font-bold text-yellow-400">{terminations.filter(t => t.status === 'pending').length}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">Verified</p>
              <p className="text-2xl font-bold text-green-400">{terminations.filter(t => t.status === 'verified').length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TerminationManager
