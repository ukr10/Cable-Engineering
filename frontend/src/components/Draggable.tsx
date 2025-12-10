import React, { useRef, useState, useEffect } from 'react'

const Draggable: React.FC<React.PropsWithChildren<{ defaultX?: number; defaultY?: number }>> = ({ children, defaultX = 20, defaultY = 20 }) => {
  const ref = useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = useState({ x: defaultX, y: defaultY })
  const dragging = useRef(false)
  const offset = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return
      setPos({ x: e.clientX - offset.current.x, y: e.clientY - offset.current.y })
    }
    const onMouseUp = () => { dragging.current = false }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  const onMouseDown = (e: React.MouseEvent) => {
    const el = ref.current
    if (!el) return
    dragging.current = true
    const rect = el.getBoundingClientRect()
    offset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  return (
    <div
      ref={ref}
      style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 60, cursor: 'grab' }}
      className="shadow-2xl"
    >
      <div onMouseDown={onMouseDown} className="cursor-grab">
        {children}
      </div>
    </div>
  )
}

export default Draggable
