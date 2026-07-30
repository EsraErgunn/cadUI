import { Walls } from './Wall'

/** Mimari sahnenin kökü; SceneRoot yalnız mimari görünümde mount eder. */
export function ArchitectureLayer() {
  return (
    <group name="architecture-root">
      <Walls />
    </group>
  )
}
