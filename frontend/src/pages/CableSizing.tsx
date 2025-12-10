import React, { useState, useRef, useEffect } from 'react'
import {
  Upload,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Download,
  Eye,
  Zap,
  FileDown,
  AlertCircle,
} from 'lucide-react'
import axios from 'axios'
import * as XLSX from 'xlsx'
import Cable3D from '../components/Cable3D'
import Draggable from '../components/Draggable'

interface CableInput {
  id: string
  cableNumber: string
  description: string
  loadKw: number
  loadKva: number
  voltage: number
  pf: number
  efficiency: number
  length: number
  runs: number
  cableType: string
  fromEquipment: string
  toEquipment: string
}

interface CableResult {
  id: string
  cable_number: string
  description: string
  flc: number
  derated_current: number
  selected_size: number
  voltage_drop: number
  sc_check: boolean
  grouping_factor: number
  status: 'pending' | 'approved' | 'modified' | 'hold' | 'hidden'
  cores: number
  od: number
}

interface CableVisualization {
  cableId: string
  cores: number
  size: number
  od: number
  fromEquipment: string
  toEquipment: string
}

const CableSizing: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'input' | 'results'>('input')
  const [standard, setStandard] = useState<'IEC' | 'IS'>('IEC')
  const [cables, setCables] = useState<CableInput[]>([
    {
      id: '1',
      cableNumber: 'CB-001',
      description: 'Feeder Main Supply',
      loadKw: 100,
      loadKva: 125,
      voltage: 415,
      pf: 0.9,
      efficiency: 0.95,
      length: 50,
      runs: 3,
      cableType: 'C',
      fromEquipment: 'Transformer',
      toEquipment: 'Panel A',
    },
  ])

  const [results, setResults] = useState<CableResult[]>([])
  const [selectedCables, setSelectedCables] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [selectedVisualization, setSelectedVisualization] = useState<CableVisualization | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'cable_number', 'flc', 'derated_current', 'selected_size', 'voltage_drop', 'sc_check', 'status'
  ])
  const [showColumnModal, setShowColumnModal] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cable_sizing_visible_columns')
      if (saved) {
        const cols = JSON.parse(saved)
        if (Array.isArray(cols)) setVisibleColumns(cols)
      }
    } catch (e) {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('cable_sizing_visible_columns', JSON.stringify(visibleColumns))
    } catch (e) {}
  }, [visibleColumns])

  // Handle Excel file upload
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setUploadProgress(0)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await axios.post('/api/v1/cable/bulk_excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          setUploadProgress(Math.round((e.loaded / e.total!) * 100))
        }
      })

      if (response.data.results && response.data.results.length > 0) {
        setResults(response.data.results)
        setActiveTab('results')
        alert(`✅ Imported ${response.data.cables_imported} cables`)
      }
      if (response.data.errors && response.data.errors.length > 0) {
        alert(`⚠️ Errors: ${response.data.errors.join(', ')}`)
      }
    } catch (error) {
      alert('❌ Upload failed: ' + (error as any).message)
    } finally {
      setLoading(false)
      setUploadProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Calculate cables
  const handleCalculate = async () => {
    setLoading(true)
    try {
      const response = await axios.post('/api/v1/cable/bulk', cables.map(c => ({
        cable_number: c.cableNumber,
        description: c.description,
        load_kw: c.loadKw,
        load_kva: c.loadKva,
        voltage: c.voltage,
        pf: c.pf,
        efficiency: c.efficiency,
        length: c.length,
        runs: c.runs,
        cable_type: c.cableType,
        from_equipment: c.fromEquipment,
        to_equipment: c.toEquipment,
      })))

      setResults(response.data)
      setActiveTab('results')
    } catch (error) {
      alert('❌ Calculation failed: ' + (error as any).message)
    } finally {
      setLoading(false)
    }
  }

  // Update cable result status
  const updateStatus = (id: string, status: CableResult['status']) => {
    setResults(results.map(r => r.id === id ? { ...r, status } : r))
  }

  // Toggle cable selection
  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedCables)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setSelectedCables(newSet)
  }

  // Multi-select actions
  const approveSelected = () => {
    selectedCables.forEach(id => updateStatus(id, 'approved'))
    setSelectedCables(new Set())
  }

  const rejectSelected = () => {
    selectedCables.forEach(id => updateStatus(id, 'hold'))
    setSelectedCables(new Set())
  }

  // Export functions
  const exportToCSV = () => {
    const headers = ['Cable Number', 'FLC (A)', 'Derated (A)', 'Size (mm²)', 'V-drop %', 'SC Check', 'Status']
    const rows = results
      .filter(r => !Array.from(visibleColumns).includes('hidden') || r.status !== 'hidden')
      .map(r => [
        r.cable_number,
        r.flc,
        r.derated_current,
        r.selected_size,
        r.voltage_drop,
        r.sc_check ? 'PASS' : 'FAIL',
        r.status,
      ])

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cable_sizing_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const exportToJSON = () => {
    const data = {
      exported_at: new Date().toISOString(),
      standard,
      total_cables: results.length,
      cables: results
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cable_sizing_${new Date().toISOString().split('T')[0]}.json`
    a.click()
  }

  const exportSelectedToXLSX = () => {
    const selected = results.filter(r => selectedCables.has(r.id))
    if (selected.length === 0) {
      alert('No cables selected')
      return
    }

    const wsData = selected.map(r => ({
      cable_number: r.cable_number,
      flc: r.flc,
      derated_current: r.derated_current,
      selected_size: r.selected_size,
      voltage_drop: r.voltage_drop,
      sc_check: r.sc_check ? 'PASS' : 'FAIL',
      status: r.status,
    }))

    const ws = XLSX.utils.json_to_sheet(wsData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Cables')
    XLSX.writeFile(wb, `cable_sizing_selected_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  // 3D Cable Visualization Component
  const CableVisualizationPanel: React.FC<{ cable: CableVisualization }> = ({ cable }) => {
    return (
      <div className="card-glow p-6 rounded-xl" style={{ width: 360 }}>
        <h3 className="text-lg font-semibold text-white mb-4">Cable Specification</h3>
        
        {/* Simple 3D-like cable representation */}
        <div className="bg-slate-900/50 rounded-lg p-8 mb-6">
          <div className="flex items-center justify-center mb-6">
            <div className="w-40 h-40">
              <Cable3D cores={cable.cores} size={cable.size} />
            </div>
          </div>

          {/* Specifications */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-500">Cable Size</p>
              <p className="text-lg font-bold text-cyan-400">{cable.size} mm²</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Outer Diameter</p>
              <p className="text-lg font-bold text-cyan-400">{cable.od} mm</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Cores</p>
              <p className="text-lg font-bold text-cyan-400">{cable.cores}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Type</p>
              <p className="text-lg font-bold text-cyan-400">XLPE</p>
            </div>
          </div>

          {/* Connection diagram */}
          <div className="border-t border-gray-600 pt-4 mt-4">
            <p className="text-xs text-gray-500 mb-3">Connection Route</p>
            <div className="flex items-center justify-between">
              <div className="px-3 py-2 rounded bg-slate-800 border border-cyan-500/30">
                <p className="text-xs font-mono text-cyan-300">{cable.fromEquipment}</p>
              </div>
              <div className="flex-1 mx-2 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-500"></div>
              <div className="px-3 py-2 rounded bg-slate-800 border border-cyan-500/30">
                <p className="text-xs font-mono text-cyan-300">{cable.toEquipment}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Material info */}
        <div className="text-xs text-gray-400 space-y-1">
          <p>• Insulation: Cross-linked Polyethylene (XLPE)</p>
          <p>• Sheath: PVC</p>
          <p>• Armor: Steel Wire</p>
          <p>• Temperature Rating: 90°C</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Cable Sizing Module</h1>
        <p className="text-gray-400">Design and calculate cable specifications with IEC/IS standards</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-8 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('input')}
          className={`px-4 py-3 font-medium transition-colors ${
            activeTab === 'input'
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-gray-400 hover:text-cyan-400'
          }`}
        >
          Input Data
        </button>
        <button
          onClick={() => setActiveTab('results')}
          className={`px-4 py-3 font-medium transition-colors ${
            activeTab === 'results'
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-gray-400 hover:text-cyan-400'
          }`}
        >
          Results ({results.length})
        </button>
      </div>

      {/* INPUT TAB */}
      {activeTab === 'input' && (
        <div className="space-y-6">
          {/* Standards Selection */}
          <div className="card-glow p-6 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">Standard</label>
              <div className="flex gap-3">
                {['IEC', 'IS'].map((std) => (
                  <button
                    key={std}
                    onClick={() => setStandard(std as 'IEC' | 'IS')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      standard === std
                        ? 'bg-cyan-500/30 text-cyan-400 border border-cyan-500'
                        : 'bg-slate-800/40 text-gray-400 border border-gray-600 hover:border-cyan-500'
                    }`}
                  >
                    {std === 'IEC' ? 'IEC 60287' : 'IS 1554'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">Import Data</label>
              <div className="flex gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleExcelUpload}
                  className="hidden"
                  disabled={loading}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  <span>{loading ? `Uploading ${uploadProgress}%` : 'Excel'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Input Table */}
          <div className="card-glow p-6 rounded-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Cable Input Data</h3>
              <button
                onClick={() => setCables([...cables, {
                  id: String(cables.length + 1),
                  cableNumber: `CB-${String(cables.length + 1).padStart(3, '0')}`,
                  description: '',
                  loadKw: 0,
                  loadKva: 0,
                  voltage: 415,
                  pf: 0.9,
                  efficiency: 0.95,
                  length: 0,
                  runs: 1,
                  cableType: 'C',
                  fromEquipment: '',
                  toEquipment: '',
                }])}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Cable
              </button>
            </div>

            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Cable No.</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Description</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">kW</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">V</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">PF</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Length</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Runs</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cables.map((cable) => (
                    <tr key={cable.id} className="border-b border-gray-700 hover:bg-cyan-500/10">
                      <td className="py-3 px-4 text-gray-300">{cable.cableNumber}</td>
                      <td className="py-3 px-4 text-gray-400">{cable.description}</td>
                      <td className="py-3 px-4 text-gray-300">{cable.loadKw}</td>
                      <td className="py-3 px-4 text-gray-300">{cable.voltage}</td>
                      <td className="py-3 px-4 text-gray-300">{cable.pf}</td>
                      <td className="py-3 px-4 text-gray-300">{cable.length}</td>
                      <td className="py-3 px-4 text-gray-300">{cable.runs}</td>
                      <td className="py-3 px-4 flex gap-2">
                        <button className="text-gray-500 hover:text-cyan-400">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setCables(cables.filter(c => c.id !== cable.id))}
                          className="text-gray-500 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={handleCalculate}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold hover:from-cyan-600 hover:to-blue-600 transition-all disabled:opacity-50"
            >
              <Zap className="w-5 h-5" />
              {loading ? 'Calculating...' : 'Calculate Cables'}
            </button>
          </div>
        </div>
      )}

      {/* RESULTS TAB */}
      {activeTab === 'results' && (
        <div className="space-y-6">
          {/* Visualization Panel (draggable) */}
          {selectedVisualization && (
            <Draggable defaultX={40} defaultY={120}>
              <CableVisualizationPanel cable={selectedVisualization} />
            </Draggable>
          )}

          {/* Results Table */}
          <div className="card-glow p-6 rounded-xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Cable Sizing Results</h3>
                <p className="text-sm text-gray-400">{results.length} cables • {results.filter(r => r.status === 'approved').length} approved</p>
              </div>
              <div className="flex gap-3">
                {selectedCables.size > 0 && (
                  <>
                    <button
                      onClick={approveSelected}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30"
                    >
                      <Check className="w-4 h-4" />
                      Approve ({selectedCables.size})
                    </button>
                    <button
                      onClick={rejectSelected}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"
                    >
                      <X className="w-4 h-4" />
                      Hold
                    </button>
                  </>
                )}
                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                >
                  <FileDown className="w-4 h-4" />
                  CSV
                </button>
                <button
                  onClick={() => setShowColumnModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700/20 text-slate-200 hover:bg-slate-700/30"
                >
                  Columns
                </button>
                <button
                  onClick={exportSelectedToXLSX}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30"
                >
                  <FileDown className="w-4 h-4" />
                  XLSX
                </button>
                <button
                  onClick={exportToJSON}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                >
                  <FileDown className="w-4 h-4" />
                  JSON
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">
                      <input type="checkbox" onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCables(new Set(results.map(r => r.id)))
                        } else {
                          setSelectedCables(new Set())
                        }
                      }} className="rounded" />
                    </th>
                    {visibleColumns.includes('cable_number') && <th className="text-left py-3 px-4 text-gray-400 font-medium">Cable</th>}
                    {visibleColumns.includes('flc') && <th className="text-left py-3 px-4 text-gray-400 font-medium">FLC (A)</th>}
                    {visibleColumns.includes('derated_current') && <th className="text-left py-3 px-4 text-gray-400 font-medium">Derated (A)</th>}
                    {visibleColumns.includes('selected_size') && <th className="text-left py-3 px-4 text-gray-400 font-medium">Size</th>}
                    {visibleColumns.includes('voltage_drop') && <th className="text-left py-3 px-4 text-gray-400 font-medium">V-drop %</th>}
                    {visibleColumns.includes('sc_check') && <th className="text-left py-3 px-4 text-gray-400 font-medium">SC</th>}
                    {visibleColumns.includes('status') && <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>}
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {results.filter(r => r.status !== 'hidden').map((result) => (
                    <tr key={result.id} className="border-b border-gray-700 hover:bg-cyan-500/10">
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedCables.has(result.id)}
                          onChange={() => toggleSelection(result.id)}
                          className="rounded"
                        />
                      </td>
                      {visibleColumns.includes('cable_number') && <td className="py-3 px-4 text-gray-300 font-medium">{result.cable_number}</td>}
                      {visibleColumns.includes('flc') && <td className="py-3 px-4 text-gray-300">{result.flc}</td>}
                      {visibleColumns.includes('derated_current') && <td className="py-3 px-4 text-gray-300">{result.derated_current}</td>}
                      {visibleColumns.includes('selected_size') && (
                        <td
                          className="py-3 px-4 text-cyan-400 font-semibold cursor-pointer hover:text-cyan-300"
                          onClick={() => setSelectedVisualization({
                            cableId: result.id,
                            cores: result.cores,
                            size: result.selected_size,
                            od: result.od,
                            fromEquipment: '',
                            toEquipment: '',
                          })}
                        >
                          {result.selected_size} mm²
                        </td>
                      )}
                      {visibleColumns.includes('voltage_drop') && (
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            result.voltage_drop < 5 ? 'bg-green-500/20 text-green-400' :
                            result.voltage_drop < 8 ? 'bg-orange-500/20 text-orange-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {result.voltage_drop}%
                          </span>
                        </td>
                      )}
                      {visibleColumns.includes('sc_check') && (
                        <td className="py-3 px-4">
                          {result.sc_check ? (
                            <span className="text-green-400">✓</span>
                          ) : (
                            <span className="text-red-400">✗</span>
                          )}
                        </td>
                      )}
                      {visibleColumns.includes('status') && (
                        <td className="py-3 px-4">
                          <select
                            value={result.status}
                            onChange={(e) => updateStatus(result.id, e.target.value as any)}
                            className="bg-slate-800 border border-gray-600 rounded px-2 py-1 text-gray-300 text-xs"
                          >
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="modified">Modified</option>
                            <option value="hold">Hold</option>
                            <option value="hidden">Hidden</option>
                          </select>
                        </td>
                      )}
                      <td className="py-3 px-4 flex gap-2">
                        <button
                          onClick={() => updateStatus(result.id, 'approved')}
                          className="text-gray-500 hover:text-green-400"
                          title="Approve"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => updateStatus(result.id, 'hold')}
                          className="text-gray-500 hover:text-red-400"
                          title="Hold"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Column customization modal */}
      {showColumnModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-slate-900 rounded-md p-4 w-96">
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold">Visible Columns</div>
              <button onClick={() => setShowColumnModal(false)} className="p-1 text-slate-300 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-2">
              {[
                { key: 'cable_number', label: 'Cable' },
                { key: 'flc', label: 'FLC (A)' },
                { key: 'derated_current', label: 'Derated (A)' },
                { key: 'selected_size', label: 'Selected Size' },
                { key: 'voltage_drop', label: 'V-drop (%)' },
                { key: 'sc_check', label: 'Short-circuit' },
                { key: 'status', label: 'Status' },
              ].map(c => (
                <label key={c.key} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={visibleColumns.includes(c.key)}
                    onChange={() => {
                      setVisibleColumns(prev => prev.includes(c.key) ? prev.filter(p => p !== c.key) : [...prev, c.key])
                    }}
                  />
                  <span className="text-sm">{c.label}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end mt-4">
              <button className="px-3 py-1 bg-slate-700 rounded" onClick={() => setShowColumnModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CableSizing
