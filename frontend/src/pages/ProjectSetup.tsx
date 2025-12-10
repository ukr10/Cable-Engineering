import React, { useState } from 'react'
import { Upload, AlertCircle, CheckCircle } from 'lucide-react'

const ProjectSetup: React.FC = () => {
  const [projectName, setProjectName] = useState('L-03 Expansion')
  const [plantType, setPlantType] = useState('Coal')
  const [standard, setStandard] = useState('IS / IEC / NEC')
  const [serviceCondition, setServiceCondition] = useState('Normal')

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-4xl font-bold text-white mb-2">Project Setup</h1>
      <p className="text-gray-400 mb-8">Configure project details and standards</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Project Information */}
        <div className="card-glow p-6 rounded-xl">
          <h3 className="text-lg font-semibold text-white mb-6">Project Information</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Project Name</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full bg-slate-800/50 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Plant Type</label>
              <select
                value={plantType}
                onChange={(e) => setPlantType(e.target.value)}
                className="w-full bg-slate-800/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-cyan-500 focus:outline-none"
              >
                <option>Coal</option>
                <option>Gas</option>
                <option>Hydro</option>
                <option>Nuclear</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Standards Used</label>
              <select
                value={standard}
                onChange={(e) => setStandard(e.target.value)}
                className="w-full bg-slate-800/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-cyan-500 focus:outline-none"
              >
                <option>IS / IEC / NEC</option>
                <option>IEC Only</option>
                <option>IS Only</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Service Condition</label>
              <select
                value={serviceCondition}
                onChange={(e) => setServiceCondition(e.target.value)}
                className="w-full bg-slate-800/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-cyan-500 focus:outline-none"
              >
                <option>Normal</option>
                <option>Severe</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data Validation */}
        <div className="card-glow p-6 rounded-xl">
          <h3 className="text-lg font-semibold text-white mb-6">Data Validation</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-400">88 missing fields</p>
                <p className="text-xs text-gray-400">Complete all required fields</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
              <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-orange-400">32 mismatched tray IDs</p>
                <p className="text-xs text-gray-400">Check tray naming conventions</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-400">119 missing cable ODs</p>
                <p className="text-xs text-gray-400">Update cable catalog</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Import Wizard */}
      <div className="card-glow p-6 rounded-xl mt-8">
        <h3 className="text-lg font-semibold text-white mb-6">Data Import Wizard</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button className="flex items-center justify-center gap-3 p-6 rounded-lg bg-slate-800/40 border border-gray-600 hover:border-cyan-500 hover:bg-cyan-500/10 transition-colors">
            <Upload className="w-6 h-6 text-cyan-400" />
            <div className="text-left">
              <p className="font-medium text-white">Import Load List</p>
              <p className="text-sm text-gray-400">Excel / CSV</p>
            </div>
          </button>
          <button className="flex items-center justify-center gap-3 p-6 rounded-lg bg-slate-800/40 border border-gray-600 hover:border-cyan-500 hover:bg-cyan-500/10 transition-colors">
            <Upload className="w-6 h-6 text-cyan-400" />
            <div className="text-left">
              <p className="font-medium text-white">Import Cable Schedule</p>
              <p className="text-sm text-gray-400">Excel / CSV</p>
            </div>
          </button>
          <button className="flex items-center justify-center gap-3 p-6 rounded-lg bg-slate-800/40 border border-gray-600 hover:border-cyan-500 hover:bg-cyan-500/10 transition-colors">
            <Upload className="w-6 h-6 text-cyan-400" />
            <div className="text-left">
              <p className="font-medium text-white">Import Tray/Conduit/Ductbank</p>
              <p className="text-sm text-gray-400">Excel / CSV</p>
            </div>
          </button>
          <button className="flex items-center justify-center gap-3 p-6 rounded-lg bg-slate-800/40 border border-gray-600 hover:border-cyan-500 hover:bg-cyan-500/10 transition-colors">
            <Upload className="w-6 h-6 text-cyan-400" />
            <div className="text-left">
              <p className="font-medium text-white">Import AutoCAD Layout</p>
              <p className="text-sm text-gray-400">DXF / IFC</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProjectSetup
