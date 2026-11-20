import type { ObstacleType, ProgressStatus } from '~/types/api'
import type { EquippedGear } from './heroTexture'

export type { ObstacleType, ProgressStatus, EquippedGear }

export interface StageNodeData {
  id: string
  order_index: number
  name: string
  obstacle_type: ObstacleType
  pos_x: number
  pos_y: number
  status: ProgressStatus
  stars: number
}

export interface WorldMapSceneData {
  worldId: string
  worldCode?: string | undefined
  worldName?: string | undefined
  mapBgUrl: string
  stages: StageNodeData[]
  assetCdnUrl?: string | undefined
  equippedGear?: EquippedGear | undefined
}

export interface StageSceneData {
  stageId: string
  stageName?: string | undefined
  obstacleType: ObstacleType
  worldCode?: string | undefined
  assetCdnUrl?: string | undefined
  worldData?: WorldMapSceneData | null | undefined
  equippedGear?: EquippedGear | undefined
}
