import React from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'

interface Cable3DProps {
  cores?: number
  sheathColor?: string
  coreColor?: string
  size?: number
}

const Core: React.FC<{ x: number; color: string; r: number; label?: string }> = ({ x, color, r, label }) => {
  return (
    <mesh position={[x, 0, 0]}>
      <cylinderGeometry args={[r, r, 0.2, 32]} />
      <meshStandardMaterial color={color} metalness={0.2} roughness={0.4} emissive={label ? '#052f2f' : '#000000'} />
      {label && (
        <Text position={[0, -r - 0.6, 0]} fontSize={0.4} color="#e6eef8" anchorX="center" anchorY="middle">
          {label}
        </Text>
      )}
    </mesh>
  )
}

const CableSheath: React.FC<{ r: number; color: string }> = ({ r, color }) => {
  return (
    <mesh>
      <cylinderGeometry args={[r, r, 0.25, 64]} />
      <meshStandardMaterial color={color} transparent opacity={0.18} metalness={0.1} roughness={0.6} />
    </mesh>
  )
}

const Cable3D: React.FC<Cable3DProps> = ({ cores = 3, sheathColor = '#06b6d4', coreColor = '#fb923c', size = 20 }) => {
  // arrange cores in triangle or line based on count
  const r = Math.max(0.8, Math.sqrt(size) * 0.18)

  let positions: number[] = []
  if (cores === 1) positions = [0]
  else if (cores === 2) positions = [-r*2.4, r*2.4]
  else if (cores === 3) positions = [-r*2, 0, r*2]
  else {
    // spread out for >3
    positions = Array.from({ length: cores }, (_, i) => (i - (cores - 1) / 2) * r * 2.2)
  }

  const sheathR = r * (cores > 2 ? 2.6 : 2.8)

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas camera={{ position: [0, 0, 10], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <pointLight position={[-5, -5, -5]} intensity={0.2} />
        <group rotation={[Math.PI / 2, 0, 0]}>
          <CableSheath r={sheathR} color={sheathColor} />
          {positions.map((p, i) => (
            <Core key={i} x={p} color={coreColor} r={r} label={`${i + 1}`} />
          ))}
        </group>
        <OrbitControls enablePan enableZoom enableRotate />
      </Canvas>
    </div>
  )
}

export default Cable3D
