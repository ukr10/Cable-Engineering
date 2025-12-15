import React from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'

interface Cable3DProps {
  cores?: number
  sheathColor?: string
  coreColor?: string
  size?: number
}

const Core: React.FC<{ x: number; y?: number; color: string; r: number; label?: string }> = ({ x, y = 0, color, r, label }) => {
  return (
    <mesh position={[x, y, 0]}>
      <cylinderGeometry args={[r, r, 0.2, 32]} />
      <meshStandardMaterial color={color} metalness={0.25} roughness={0.15} transparent opacity={0.95} emissive={'#002f2f'} />
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

  // Arrange cores in circular pattern for nicer visualization
  const positions: [number, number][] = []
  if (cores === 1) positions.push([0, 0])
  else {
    const ringR = r * (cores > 4 ? cores * 0.9 : 3.0)
    for (let i = 0; i < cores; i++) {
      const ang = (i / cores) * Math.PI * 2
      positions.push([Math.cos(ang) * ringR, Math.sin(ang) * ringR])
    }
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
            <Core key={i} x={p[0]} y={p[1]} color={coreColor} r={r} label={`${i + 1}`} />
          ))}
        </group>
        <OrbitControls enablePan enableZoom enableRotate />
      </Canvas>
    </div>
  )
}

export default Cable3D
