import React, { useEffect, useState } from 'react'
import axios from 'axios'

interface Node {
  id: string
  label: string
  meta?: any
}

interface Edge {
  source: string
  target: string
  weight: number
}

const sizeForNode = (meta?: any) => {
  if (!meta || typeof meta.fill !== 'number') return 18
  const fill = meta.fill
  return Math.min(36, 18 + Math.floor(fill / 3))
}

const colorForFill = (meta?: any) => {
  if (!meta || typeof meta.fill !== 'number') return '#94a3b8'
  const fill = meta.fill
  if (fill >= 90) return '#f87171'
  if (fill >= 70) return '#fb923c'
  if (fill >= 50) return '#facc15'
  return '#34d399'
}

const TrayGraph: React.FC = () => {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])

  useEffect(() => {
    const fetchGraph = async () => {
      try {
        const res = await axios.get('/api/v1/routing/graph')
        setNodes(res.data.nodes || [])
        setEdges(res.data.edges || [])
      } catch (e) {
        console.error('Failed to fetch graph', e)
      }
    }
    fetchGraph()
  }, [])

  // simple circular layout
  const layout = () => {
    const R = 160
    const cx = 200
    const cy = 160
    const n = nodes.length
    return nodes.map((node, i) => {
      const theta = (i / Math.max(1, n)) * Math.PI * 2
      return {
        id: node.id,
        x: cx + Math.cos(theta) * R,
        y: cy + Math.sin(theta) * R,
        meta: node.meta
      }
    })
  }

  const placed = layout()
  const posById: Record<string, { x: number; y: number; meta?: any }> = {}
  placed.forEach(p => posById[p.id] = p)

  return (
    <div className="bg-slate-800/30 rounded p-4">
      <svg width={420} height={340}>
        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L6,3 L0,6 L2,3 z" fill="#94a3b8" />
          </marker>
        </defs>

        {/* edges */}
        {edges.map((e, idx) => {
          const a = posById[e.source]
          const b = posById[e.target]
          if (!a || !b) return null
          return (
            <g key={idx}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#64748b" strokeWidth={Math.max(1, 4 - Math.log1p(e.weight))} markerEnd="url(#arrow)" opacity={0.9} />
            </g>
          )
        })}

        {/* nodes */}
        {placed.map((p) => (
          <g key={p.id} transform={`translate(${p.x},${p.y})`}>
            <circle r={sizeForNode(p.meta)} fill={colorForFill(p.meta)} stroke="#0f172a" strokeWidth={2} />
            <text x={0} y={sizeForNode(p.meta) + 14} textAnchor="middle" fontSize={12} fill="#e6eef8">{p.id}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}

export default TrayGraph
