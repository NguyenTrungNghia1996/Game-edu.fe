import mitt from 'mitt'
import type { EquippedGear, StageSceneData, WorldMapSceneData } from './types'

export type GameEvents = {
  // Phaser -> Vue
  'game:ready': undefined
  'world:select-stage': { stageId: string }
  'stage:reached-obstacle': { stageId: string; obstacleType: string }
  'stage:completed-animation': { stageId: string }

  // Vue -> Phaser
  'game:load-world': WorldMapSceneData
  'game:enter-stage': StageSceneData
  'game:return-to-map': {
    worldData?: WorldMapSceneData | null | undefined
  }
  'hero:equipment-changed': { gear: EquippedGear }
  'challenge:answered-correct': { stageId: string }
  'challenge:answered-wrong': { stageId: string }
  'audio:toggle-mute': { muted: boolean }
}

export const gameEventBus = mitt<GameEvents>()
