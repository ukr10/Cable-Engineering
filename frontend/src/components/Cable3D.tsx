import React from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'

interface Cable3DProps {
  cores?: number
  sheathColor?: string
  coreColor?: string
  size?: number
  paired?: boolean
}

const Core: React.FC<{ x: number; y?: number; color: string; r: number; label?: string }> = ({ x, y = 0, color, r, label }) => {
  const insulationR = r * 1.4
  return (
    <group position={[x, y, 0]}>
      {/* conductor */}
      <mesh>
        <cylinderGeometry args={[r, r, 0.2, 32]} />
        <meshStandardMaterial color={color} metalness={0.25} roughness={0.15} transparent opacity={0.95} emissive={'#002f2f'} />
      </mesh>
      {/* insulation layer */}
      <mesh position={[0, 0, 0.01]}>
        <cylinderGeometry args={[insulationR, insulationR, 0.22, 32]} />
        <meshStandardMaterial color={'#f3f4f6'} metalness={0.05} roughness={0.6} transparent opacity={0.95} />
      </mesh>
      {label && (
        <Text position={[0, -insulationR - 0.6, 0]} fontSize={0.4} color="#111827" anchorX="center" anchorY="middle">
          {label}
        </Text>
      )}
    </group>
  )
}

const CableSheath: React.FC<{ r: number; color: string; armor?: boolean }> = ({ r, color, armor = true }) => {
  const armorR = r * 0.95
  const rings = [] as number[]
  for (let i = 1; i <= 6; i++) {
    rings.push(r * (1 - i * 0.03))
  }
  return (
    <group>
      <mesh>
        <cylinderGeometry args={[r, r, 0.25, 64]} />
        <meshStandardMaterial color={color} transparent opacity={0.22} metalness={0.05} roughness={0.5} />
      </mesh>
      {/* subtle sheath texture via faint rings */}
      {rings.map((rr, idx) => (
        <mesh key={idx} position={[0, 0, 0.02 + idx * 0.0001]}>
          <cylinderGeometry args={[rr, rr, 0.002, 64]} />
          <meshStandardMaterial color={'#ffffff'} transparent opacity={0.02 + idx * 0.01} metalness={0.1} roughness={0.7} />
        </mesh>
      ))}
      {armor && (
        <mesh position={[0, 0, 0.03]}>
          <cylinderGeometry args={[armorR, armorR, 0.03, 64]} />
          <meshStandardMaterial color={'#9ca3af'} metalness={0.8} roughness={0.25} transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  )
}

const Cable3D: React.FC<Cable3DProps> = ({ cores = 3, sheathColor = '#06b6d4', coreColor = '#fb923c', size = 20, paired = false }) => {
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
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas camera={{ position: [0, 0, 10], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={0.9} />
        <pointLight position={[-5, -5, -5]} intensity={0.25} />
        <group rotation={[Math.PI / 2, 0, 0]}>
          {paired ? (
            // render two cables side-by-side
            <group>
              <group position={[-sheathR * 1.1, 0, 0]}>
                <CableSheath r={sheathR} color={sheathColor} armor={true} />
                {positions.map((p, i) => (
                  <Core key={`a-${i}`} x={p[0] * 0.9} y={p[1] * 0.9} color={coreColor} r={r} label={`${i + 1}`} />
                ))}
              </group>
              <group position={[sheathR * 1.1, 0, 0]}>
                <CableSheath r={sheathR} color={'#0ea5a4'} armor={true} />
                {positions.map((p, i) => (
                  <Core key={`b-${i}`} x={p[0] * 0.9} y={p[1] * 0.9} color={'#fb7185'} r={r} label={`${i + 1}`} />
                ))}
              </group>
            </group>
          ) : (
            <group>
              <CableSheath r={sheathR} color={sheathColor} armor={true} />
              {positions.map((p, i) => (
                <Core key={i} x={p[0]} y={p[1]} color={coreColor} r={r} label={`${i + 1}`} />
              ))}
            </group>
          )}
        </group>
        <OrbitControls enablePan enableZoom enableRotate />
      </Canvas>
    </div>
  )
}

export default Cable3D
