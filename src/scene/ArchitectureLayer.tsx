import { Walls } from './Wall'
import { WallTool } from './WallTool'

/** Mimari sahnenin kökü; SceneRoot yalnız mimari görünümde mount eder. */
export function ArchitectureLayer() {
  return (
    <group name="architecture-root">
      <Walls />
      <WallTool />
    </group>
  )
}
