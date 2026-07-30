import { ArchitectureGhost } from './ArchitectureGhost'

/** Tesisat sahnesinin kökü; SceneRoot yalnız tesisat görünümünde mount eder. */
export function PlumbingLayer() {
  return (
    <group name="plumbing-root">
      <ArchitectureGhost />
    </group>
  )
}
