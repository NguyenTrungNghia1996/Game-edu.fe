import Phaser from 'phaser'
import { gameEventBus } from '../eventBus'
import { buildHeroTexture } from '../heroTexture'
import type { EquippedGear, StageNodeData, StageSceneData, WorldMapSceneData } from '../types'

interface NodePosition {
  stage: StageNodeData
  x: number
  y: number
}

const failedWorldBgKeys = new Set<string>()

export class WorldMapScene extends Phaser.Scene {
  private worldData: WorldMapSceneData | null = null
  private equippedGear: EquippedGear = {}
  private hero!: Phaser.GameObjects.Image
  private isNavigating = false
  private bgTextureKey = ''

  constructor() {
    super('WorldMapScene')
  }

  init(data: WorldMapSceneData): void {
    this.worldData = data
    this.equippedGear = data?.equippedGear ?? {}
    this.isNavigating = false
    this.bgTextureKey = data?.worldId ? `world-bg-${data.worldId}` : ''
  }

  preload(): void {
    if (
      this.worldData?.mapBgUrl &&
      this.bgTextureKey &&
      !this.textures.exists(this.bgTextureKey) &&
      !failedWorldBgKeys.has(this.bgTextureKey)
    ) {
      this.load.setCORS('anonymous')
      this.load.image(this.bgTextureKey, this.worldData.mapBgUrl)
      this.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
        if (file?.key) {
          failedWorldBgKeys.add(file.key)
        }
      })
    }
  }

  create(): void {
    this.drawBackground()

    const stages = [...(this.worldData?.stages ?? [])].sort(
      (a, b) => a.order_index - b.order_index,
    )
    const positions = this.computeNodePositions(stages)

    this.drawWindingPath(positions)
    this.drawStageNodes(positions)
    this.placeHeroOnCurrentStage(positions)
    this.spawnAmbientFireflies()

    const cleanup = () => {
      gameEventBus.off('game:load-world', this.handleLoadWorld)
      gameEventBus.off('game:enter-stage', this.handleEnterStage)
      gameEventBus.off('hero:equipment-changed', this.handleEquipmentChanged)
      gameEventBus.off('audio:toggle-mute', this.handleToggleMute)
    }

    gameEventBus.on('game:load-world', this.handleLoadWorld)
    gameEventBus.on('game:enter-stage', this.handleEnterStage)
    gameEventBus.on('hero:equipment-changed', this.handleEquipmentChanged)
    gameEventBus.on('audio:toggle-mute', this.handleToggleMute)

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup)
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup)
  }

  private handleLoadWorld = (payload: WorldMapSceneData): void => {
    if (!this.sys || !this.scene) return
    this.scene.restart({
      ...payload,
      equippedGear: payload.equippedGear ?? this.equippedGear,
    })
  }

  private handleEnterStage = (payload: StageSceneData): void => {
    if (!this.sys || !this.scene) return
    this.scene.start('StageScene', {
      ...payload,
      equippedGear: payload.equippedGear ?? this.equippedGear,
      worldData: this.worldData,
    })
  }

  private handleEquipmentChanged = ({ gear }: { gear: EquippedGear }): void => {
    if (!this.sys || !this.textures) return
    this.equippedGear = gear
    if (this.worldData) {
      this.worldData = { ...this.worldData, equippedGear: gear }
    }
    if (this.hero && this.hero.active) {
      const texKey = buildHeroTexture(this, gear)
      this.hero.setTexture(texKey)
      this.tweens.add({
        targets: this.hero,
        scale: 0.88,
        duration: 140,
        yoyo: true,
        ease: 'Back.easeOut',
      })
    }
  }

  private handleToggleMute = ({ muted }: { muted: boolean }): void => {
    if (!this.sys || !this.sound) return
    this.sound.mute = muted
  }

  private drawBackground(): void {
    if (this.bgTextureKey && this.textures.exists(this.bgTextureKey)) {
      const tex = this.textures.get(this.bgTextureKey)
      if (tex.key !== '__MISSING') {
        this.add.image(640, 360, this.bgTextureKey).setDisplaySize(1280, 720)
        // Subtle vignette to keep stage markers legible
        const overlay = this.add.graphics()
        overlay.fillStyle(0x0f2419, 0.14)
        overlay.fillRect(0, 0, 1280, 720)
        return
      }
    }

    const isMathValley = this.worldData?.worldCode?.includes('con-so')
    const g = this.add.graphics()

    // Sky / distant meadow backdrop
    g.fillGradientStyle(
      isMathValley ? 0xbae6fd : 0x86efac,
      isMathValley ? 0x93c5fd : 0x4ade80,
      isMathValley ? 0x34d399 : 0x15803d,
      isMathValley ? 0x10b981 : 0x166534,
      1,
    )
    g.fillRect(0, 0, 1280, 720)

    // Rolling hills
    g.fillStyle(isMathValley ? 0x6ee7b7 : 0x22c55e, 0.55)
    g.fillEllipse(240, 620, 780, 340)
    g.fillEllipse(980, 600, 860, 380)

    g.fillStyle(isMathValley ? 0x34d399 : 0x16a34a, 0.7)
    g.fillEllipse(640, 700, 1300, 280)

    // Sparkling winding river across the map
    g.lineStyle(54, 0x38bdf8, 0.45)
    g.beginPath()
    g.moveTo(-40, 230)
    g.lineTo(360, 290)
    g.lineTo(740, 440)
    g.lineTo(1320, 490)
    g.strokePath()

    g.lineStyle(32, 0x7dd3fc, 0.5)
    g.beginPath()
    g.moveTo(-40, 230)
    g.lineTo(360, 290)
    g.lineTo(740, 440)
    g.lineTo(1320, 490)
    g.strokePath()

    // Decorative storybook trees around edges
    const treeSpots = [
      { x: 75, y: 150, s: 1.0 },
      { x: 185, y: 120, s: 0.85 },
      { x: 1185, y: 165, s: 1.05 },
      { x: 1190, y: 585, s: 1.1 },
      { x: 95, y: 635, s: 0.95 },
      { x: 520, y: 125, s: 0.8 },
      { x: 895, y: 615, s: 0.9 },
      { x: 410, y: 635, s: 0.85 },
    ]

    for (const spot of treeSpots) {
      this.drawStylizedTree(g, spot.x, spot.y, spot.s, Boolean(isMathValley))
    }

    // Floating clouds at top
    g.fillStyle(0xffffff, 0.55)
    this.drawCloud(g, 280, 86, 1)
    this.drawCloud(g, 760, 78, 1.15)
    this.drawCloud(g, 1080, 96, 0.85)
  }

  private drawStylizedTree(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    scale: number,
    isMathValley: boolean,
  ): void {
    g.fillStyle(0x78350f, 0.9)
    g.fillRoundedRect(x - 7 * scale, y + 10 * scale, 14 * scale, 34 * scale, 4)

    g.fillStyle(isMathValley ? 0x059669 : 0x15803d, 0.95)
    g.fillCircle(x, y - 4 * scale, 30 * scale)
    g.fillCircle(x - 20 * scale, y + 8 * scale, 22 * scale)
    g.fillCircle(x + 20 * scale, y + 8 * scale, 22 * scale)

    g.fillStyle(isMathValley ? 0x34d399 : 0x4ade80, 0.65)
    g.fillCircle(x - 6 * scale, y - 14 * scale, 15 * scale)
  }

  private drawCloud(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number): void {
    g.fillCircle(x, y, 22 * s)
    g.fillCircle(x - 22 * s, y + 6 * s, 16 * s)
    g.fillCircle(x + 24 * s, y + 6 * s, 18 * s)
    g.fillRoundedRect(x - 32 * s, y + 4 * s, 66 * s, 18 * s, 9 * s)
  }

  private computeNodePositions(stages: StageNodeData[]): NodePosition[] {
    return stages.map((stage, idx) => {
      const hasCoords = stage.pos_x > 0 && stage.pos_y > 0
      const rawX = hasCoords ? stage.pos_x : 140 + idx * 105
      const rawY = hasCoords ? stage.pos_y : 520 - Math.sin(idx * 0.7) * 140
      return {
        stage,
        x: Phaser.Math.Clamp(rawX, 110, 1170),
        y: Phaser.Math.Clamp(rawY, 150, 610),
      }
    })
  }

  private drawWindingPath(positions: NodePosition[]): void {
    if (positions.length < 2) return
    const g = this.add.graphics()

    // Dirt road border
    g.lineStyle(22, 0x92400e, 0.55)
    g.beginPath()
    g.moveTo(positions[0]!.x, positions[0]!.y)
    for (let i = 1; i < positions.length; i++) {
      g.lineTo(positions[i]!.x, positions[i]!.y)
    }
    g.strokePath()

    // Golden warm trail
    g.lineStyle(12, 0xfef08a, 0.85)
    g.beginPath()
    g.moveTo(positions[0]!.x, positions[0]!.y)
    for (let i = 1; i < positions.length; i++) {
      g.lineTo(positions[i]!.x, positions[i]!.y)
    }
    g.strokePath()
  }

  private drawStageNodes(positions: NodePosition[]): void {
    for (const pos of positions) {
      const { stage, x, y } = pos
      const container = this.add.container(x, y)

      const isLocked = stage.status === 'locked'
      const isCompleted = stage.status === 'completed'
      const isUnlocked = stage.status === 'unlocked'

      // Outer pulse ring for unlocked current stage
      if (isUnlocked) {
        const pulse = this.add.circle(0, 0, 42, 0xfacc15, 0.35)
        container.add(pulse)
        this.tweens.add({
          targets: pulse,
          scale: 1.35,
          alpha: 0,
          duration: 1200,
          repeat: -1,
          ease: 'Sine.easeOut',
        })
      }

      // Shadow
      const shadow = this.add.ellipse(0, 26, 62, 20, 0x000000, 0.25)
      container.add(shadow)

      // Badge disc
      const fillColor = isCompleted ? 0x10b981 : isUnlocked ? 0xf59e0b : 0x64748b
      const borderColor = isCompleted ? 0xecfdf5 : isUnlocked ? 0xfef08a : 0xcbd5e1
      const badge = this.add.circle(0, 0, 32, fillColor)
      badge.setStrokeStyle(5, borderColor)
      container.add(badge)

      // Stage number or lock icon
      const label = this.add
        .text(0, isLocked ? -1 : -2, isLocked ? '🔒' : `${stage.order_index}`, {
          fontFamily: 'Nunito, sans-serif',
          fontSize: isLocked ? '24px' : '28px',
          fontStyle: 'bold',
          color: '#ffffff',
          stroke: '#0f172a',
          strokeThickness: isLocked ? 0 : 4,
        })
        .setOrigin(0.5)
      container.add(label)

      // Stars bar under completed stage
      if (isCompleted) {
        const starsText = '★'.repeat(Math.min(3, stage.stars)) + '☆'.repeat(Math.max(0, 3 - stage.stars))
        const starsLabel = this.add
          .text(0, 44, starsText, {
            fontFamily: 'Nunito, sans-serif',
            fontSize: '20px',
            color: '#facc15',
            stroke: '#713f12',
            strokeThickness: 4,
          })
          .setOrigin(0.5)
        container.add(starsLabel)
      }

      // Stage name pill
      const nameTag = this.add
        .text(0, -48, stage.name, {
          fontFamily: 'Nunito, sans-serif',
          fontSize: '14px',
          fontStyle: 'bold',
          color: isLocked ? '#e2e8f0' : '#fefce8',
          backgroundColor: isLocked ? 'rgba(15, 23, 42, 0.65)' : 'rgba(20, 83, 45, 0.82)',
          padding: { x: 8, y: 4 },
        })
        .setOrigin(0.5)
      container.add(nameTag)

      // Interactive hit area (minimum 76x76 touch target for kids)
      badge.setInteractive({ useHandCursor: !isLocked })
      badge.on('pointerover', () => {
        if (!isLocked) {
          this.tweens.add({ targets: container, scale: 1.1, duration: 120 })
        }
      })
      badge.on('pointerout', () => {
        this.tweens.add({ targets: container, scale: 1, duration: 120 })
      })
      badge.on('pointerdown', () => {
        if (this.isNavigating) return
        if (isLocked) {
          this.tweens.add({
            targets: container,
            x: x - 6,
            duration: 60,
            yoyo: true,
            repeat: 2,
          })
          return
        }

        this.isNavigating = true
        this.tweens.add({
          targets: this.hero,
          x,
          y: y - 48,
          duration: 450,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            gameEventBus.emit('world:select-stage', { stageId: stage.id })
          },
        })
      })
    }
  }

  private placeHeroOnCurrentStage(positions: NodePosition[]): void {
    if (positions.length === 0) return

    const currentPos =
      positions.find((p) => p.stage.status === 'unlocked') ??
      [...positions].reverse().find((p) => p.stage.status === 'completed') ??
      positions[0]!

    const heroTexture = buildHeroTexture(this, this.equippedGear)
    this.hero = this.add
      .image(currentPos.x, currentPos.y - 54, heroTexture)
      .setScale(0.75)
      .setDepth(20)

    this.tweens.add({
      targets: this.hero,
      y: currentPos.y - 60,
      duration: 950,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  private spawnAmbientFireflies(): void {
    for (let i = 0; i < 14; i++) {
      const fx = Phaser.Math.Between(80, 1200)
      const fy = Phaser.Math.Between(120, 650)
      const dot = this.add.image(fx, fy, 'sparkle-dot').setScale(Phaser.Math.FloatBetween(0.35, 0.75))
      dot.setAlpha(0.25)
      this.tweens.add({
        targets: dot,
        y: fy - Phaser.Math.Between(18, 42),
        alpha: 0.85,
        duration: Phaser.Math.Between(1600, 3200),
        delay: Phaser.Math.Between(0, 1500),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })
    }
  }
}
