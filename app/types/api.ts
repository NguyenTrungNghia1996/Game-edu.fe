export type UserRole = 'parent' | 'admin'

export interface User {
  id: string
  email: string
  role: UserRole
  created_at: string
  updated_at: string
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  user: User
}

export interface Profile {
  id: string
  user_id: string
  nickname: string
  avatar_url: string
  coins: number
  total_stars: number
  created_at: string
  updated_at: string
}

export interface CreateProfileRequest {
  nickname: string
  avatar_url: string
}

export type ItemCategory = 'hat' | 'outfit' | 'badge' | 'tool'

export interface Item {
  id: string
  code: string
  name: string
  description: string
  category: ItemCategory
  icon_url: string
  sprite_url?: string
  created_at?: string
}

export interface RewardItemSummary {
  id: string
  name: string
  icon_url: string
}

export interface ProfileInventory {
  id: string
  profile_id: string
  item_id: string
  item: Item
  quantity: number
  is_equipped: boolean
  acquired_at: string
}

export interface World {
  id: string
  code: string
  name: string
  description: string
  order_index: number
  map_bg_url: string
  bgm_url: string
  is_active: boolean
  created_at: string
}

export interface WorldSummaryResponse {
  id: string
  code: string
  name: string
  description: string
  order_index: number
  map_bg_url: string
  bgm_url?: string
  total_stages: number
  completed_stages: number
  earned_stars: number
  max_stars: number
  is_unlocked: boolean
}

export type ProgressStatus = 'locked' | 'unlocked' | 'completed'

export type ObstacleType = 'broken_bridge' | 'locked_gate' | 'sleeping_bear' | string

export interface StageMapNodeResponse {
  id: string
  order_index: number
  name: string
  obstacle_type: ObstacleType
  pos_x: number
  pos_y: number
  reward_coins: number
  reward_item?: Item | null
  status: ProgressStatus
  stars: number
  best_wrong_attempts: number
  completed_at?: string | null
}

export interface WorldMapResponse {
  world: World
  stages: StageMapNodeResponse[]
}

export interface StageStartInfo {
  id: string
  name: string
  obstacle_type: ObstacleType
}

export type ChallengeType = 'multiple_choice' | 'drag_drop' | 'audio_match'

export interface ChoiceOption {
  id: string
  text: string
  audio_url?: string
  image_url?: string
}

export interface DragDropItem {
  id: string
  text: string
  audio_url?: string
  image_url?: string
}

export interface DragDropTarget {
  id: string
  label: string
  image_url?: string
}

export interface SanitizedChallenge {
  id: string
  type: ChallengeType
  prompt_text: string
  prompt_audio_url?: string
  options?: ChoiceOption[]
  items?: DragDropItem[]
  targets?: DragDropTarget[]
}

export interface StartStageResponse {
  attempt_id: string
  stage: StageStartInfo
  challenges: SanitizedChallenge[]
}

export interface SubmitAnswerRequest {
  attempt_id: string
  challenge_id: string
  answer: string | Record<string, string>
}

export interface SubmitRewards {
  coins: number
  item: RewardItemSummary | null
}

export interface SubmitUnlocks {
  next_stage_id: string | null
  next_world_id: string | null
}

export interface SubmitAnswerResponse {
  is_correct: boolean
  explanation?: string
  hint?: string
  wrong_attempts?: number
  stage_completed: boolean
  stars_earned?: number
  first_time_clear?: boolean
  rewards?: SubmitRewards
  unlocks?: SubmitUnlocks
}
