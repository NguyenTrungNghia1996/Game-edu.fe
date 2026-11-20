import Phaser from 'phaser'
import { gameEventBus } from '../eventBus'
import { buildHeroTexture } from '../heroTexture'
import type { EquippedGear, ObstacleType, StageSceneData, WorldMapSceneData } from '../types'

const failedAssetKeys = new Set<string>()

export class StageScene extends Phaser.Scene {
  private stageId = ''
  private stageName = ''
  private obstacleType: ObstacleType = 'broken_bridge'
  private assetCdnUrl = ''
  private worldData: WorldMapSceneData | null = null
  private equippedGear: EquippedGear = {}

  private player!: Phaser.GameObjects.Image
  private thinkingBubble!: Phaser.GameObjects.Container
  private brokenObstacle!: Phaser.GameObjects.Container
  private fixedObstacle!: Phaser.GameObjects.Container
  private hasSolved = false

  constructor() {
    super('StageScene')
  }

  init(data: StageSceneData): void {
    this.stageId = data.stageId
    this.stageName = data.stageName ?? ''
    this.obstacleType = data.obstacleType || 'broken_bridge'
    this.assetCdnUrl = data.assetCdnUrl ?? ''
    this.worldData = data.worldData ?? null
    this.equippedGear = data.equippedGear ?? data.worldData?.equippedGear ?? {}
    this.hasSolved = false

    // Bắt buộc set CORS để WebGL vẽ được ảnh từ Cloudflare R2
    if (this.assetCdnUrl) {
      this.load.setCORS('anonymous')
      this.load.setBaseURL(this.assetCdnUrl)
    }
  }

  preload(): void {
    if (!this.assetCdnUrl) return

    // Tải ảnh từ Cloudflare R2 nếu có; ghi nhớ các key lỗi để không gọi lại gây spam mạng.
    // Không preload audio bằng Phaser WebAudio loader để tránh lỗi EncodingError: Unable to decode audio data
    // khi file MP3 chưa được upload lên R2 (SFX đã được phát qua audioStore).
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      if (file?.key) {
        failedAssetKeys.add(file.key)
      }
    })

    if (!this.textures.exists('bg-forest-river') && !failedAssetKeys.has('bg-forest-river')) {
      this.load.image('bg-forest-river', '/worlds/rung-chu-cai/river_bg.webp')
    }
    if (!this.textures.exists('bridge-broken') && !failedAssetKeys.has('bridge-broken')) {
      this.load.image('bridge-broken', '/obstacles/bridge_broken.webp')
    }
    if (!this.textures.exists('bridge-fixed') && !failedAssetKeys.has('bridge-fixed')) {
      this.load.image('bridge-fixed', '/obstacles/bridge_fixed.webp')
    }
  }

  create(): void {
    this.drawStageBackground()
    this.createObstacles()
    this.createHeroAndWalkToObstacle()

    const cleanup = () => {
      gameEventBus.off('challenge:answered-correct', this.onAnswerCorrect)
      gameEventBus.off('challenge:answered-wrong', this.onAnswerWrong)
      gameEventBus.off('game:enter-stage', this.onEnterStage)
      gameEventBus.off('game:return-to-map', this.onReturnToMap)
      gameEventBus.off('game:load-world', this.onLoadWorld)
      gameEventBus.off('hero:equipment-changed', this.onEquipmentChanged)
      gameEventBus.off('audio:toggle-mute', this.onToggleMute)
    }

    gameEventBus.on('challenge:answered-correct', this.onAnswerCorrect)
    gameEventBus.on('challenge:answered-wrong', this.onAnswerWrong)
    gameEventBus.on('game:enter-stage', this.onEnterStage)
    gameEventBus.on('game:return-to-map', this.onReturnToMap)
    gameEventBus.on('game:load-world', this.onLoadWorld)
    gameEventBus.on('hero:equipment-changed', this.onEquipmentChanged)
    gameEventBus.on('audio:toggle-mute', this.onToggleMute)

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup)
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup)
  }

  private drawStageBackground(): void {
    if (this.hasValidTexture('bg-forest-river')) {
      this.add.image(640, 360, 'bg-forest-river').setDisplaySize(1280, 720)
      return
    }

    const g = this.add.graphics()

    // Warm sunlit sky
    g.fillGradientStyle(0x7dd3fc, 0xbae6fd, 0xd9f99d, 0x86efac, 1)
    g.fillRect(0, 0, 1280, 460)

    // Distant forest hills
    g.fillStyle(0x22c55e, 0.65)
    g.fillEllipse(260, 420, 680, 260)
    g.fillEllipse(1020, 410, 720, 270)

    // River / ravine in center for bridge, or forest path for gate/bear
    if (this.obstacleType === 'broken_bridge') {
      // Left bank
      g.fillStyle(0x16a34a, 1)
      g.fillRoundedRect(-40, 440, 520, 320, 40)
      g.fillStyle(0x84cc16, 0.7)
      g.fillRoundedRect(-40, 440, 510, 46, 22)

      // Right bank
      g.fillStyle(0x16a34a, 1)
      g.fillRoundedRect(800, 440, 520, 320, 40)
      g.fillStyle(0x84cc16, 0.7)
      g.fillRoundedRect(810, 440, 510, 46, 22)

      // Sparkling blue river in between
      g.fillGradientStyle(0x0ea5e9, 0x38bdf8, 0x0284c7, 0x0369a1, 1)
      g.fillRect(460, 465, 360, 255)

      // Animated water shimmer lines
      for (let i = 0; i < 6; i++) {
        const wave = this.add.rectangle(520 + i * 50, 520 + (i % 3) * 55, 42, 6, 0xe0f2fe, 0.65)
        this.tweens.add({
          targets: wave,
          x: wave.x + 18,
          alpha: 0.25,
          duration: 1200 + i * 180,
          yoyo: true,
          repeat: -1,
        })
      }
    } else {
      // Continuous lush meadow ground
      g.fillStyle(0x16a34a, 1)
      g.fillRect(0, 440, 1280, 280)
      g.fillStyle(0xd9f99d, 0.45)
      g.fillRect(0, 440, 1280, 38)
      // Golden adventure trail
      g.fillStyle(0xfde68a, 0.8)
      g.fillRoundedRect(0, 488, 1280, 64, 12)
    }

    // Background trees
    const trees = [110, 240, 360, 920, 1060, 1180]
    for (const tx of trees) {
      g.fillStyle(0x78350f, 1)
      g.fillRect(tx - 10, 340, 20, 105)
      g.fillStyle(0x15803d, 1)
      g.fillCircle(tx, 315, 52)
      g.fillCircle(tx - 32, 338, 36)
      g.fillCircle(tx + 32, 338, 36)
      g.fillStyle(0x4ade80, 0.55)
      g.fillCircle(tx - 10, 298, 22)
    }

    // Stage banner title
    if (this.stageName) {
      this.add
        .text(640, 108, this.stageName, {
          fontFamily: 'Nunito, sans-serif',
          fontSize: '26px',
          fontStyle: 'bold',
          color: '#fefce8',
          backgroundColor: 'rgba(20, 83, 45, 0.78)',
          padding: { x: 18, y: 8 },
        })
        .setOrigin(0.5)
    }
  }

  private createObstacles(): void {
    this.brokenObstacle = this.add.container(640, 475)
    this.fixedObstacle = this.add.container(640, 475).setAlpha(0)

    if (this.obstacleType === 'broken_bridge') {
      if (this.hasValidTexture('bridge-broken') && this.hasValidTexture('bridge-fixed')) {
        this.brokenObstacle.add(this.add.image(0, 0, 'bridge-broken'))
        this.fixedObstacle.add(this.add.image(0, 0, 'bridge-fixed'))
        return
      }

      // Procedural broken bridge
      const bgBroken = this.add.graphics()
      bgBroken.fillStyle(0x78350f, 1)
      bgBroken.fillRoundedRect(-190, -28, 18, 66, 4)
      bgBroken.fillRoundedRect(172, -28, 18, 66, 4)
      bgBroken.fillStyle(0xb45309, 1)
      bgBroken.fillRoundedRect(-185, -8, 105, 22, 5)
      bgBroken.fillRoundedRect(82, -8, 105, 22, 5)
      // Snapped planks angled down
      bgBroken.fillStyle(0x92400e, 1)
      bgBroken.fillRect(-75, 4, 34, 16)
      bgBroken.fillRect(42, 6, 34, 16)
      this.brokenObstacle.add(bgBroken)

      // Procedural fixed bridge
      const bgFixed = this.add.graphics()
      bgFixed.fillStyle(0x78350f, 1)
      bgFixed.fillRoundedRect(-190, -34, 18, 72, 4)
      bgFixed.fillRoundedRect(172, -34, 18, 72, 4)
      bgFixed.lineStyle(6, 0xd97706, 1)
      bgFixed.beginPath()
      bgFixed.moveTo(-180, -24)
      bgFixed.lineTo(0, -8)
      bgFixed.lineTo(180, -24)
      bgFixed.strokePath()
      for (let i = 0; i < 8; i++) {
        bgFixed.fillStyle(i % 2 === 0 ? 0xb45309 : 0xca8a04, 1)
        bgFixed.fillRoundedRect(-180 + i * 46, -10, 42, 24, 5)
      }
      this.fixedObstacle.add(bgFixed)
      return
    }

    if (this.obstacleType === 'locked_gate') {
      const closed = this.add.graphics()
      closed.fillStyle(0x78350f, 1)
      closed.fillRoundedRect(-75, -135, 150, 175, 24)
      closed.fillStyle(0x92400e, 1)
      closed.fillRoundedRect(-60, -120, 56, 150, 12)
      closed.fillRoundedRect(4, -120, 56, 150, 12)
      // Vines & golden padlock
      closed.lineStyle(8, 0x15803d, 1)
      closed.strokeRoundedRect(-72, -130, 144, 168, 22)
      closed.fillStyle(0xfacc15, 1)
      closed.fillRoundedRect(-18, -56, 36, 34, 8)
      this.brokenObstacle.add(closed)
      this.brokenObstacle.add(
        this.add.text(0, -39, '🔒', { fontSize: '22px' }).setOrigin(0.5),
      )

      const opened = this.add.graphics()
      opened.fillStyle(0x78350f, 1)
      opened.fillRoundedRect(-110, -135, 34, 175, 10)
      opened.fillRoundedRect(76, -135, 34, 175, 10)
      opened.fillStyle(0xfef08a, 0.35)
      opened.fillRoundedRect(-72, -125, 144, 160, 18)
      this.fixedObstacle.add(opened)
      this.fixedObstacle.add(
        this.add.text(0, -55, '✨', { fontSize: '42px' }).setOrigin(0.5),
      )
      return
    }

    // sleeping_bear (and any other custom obstacle)
    const sleeping = this.add.graphics()
    sleeping.fillStyle(0x7c2d12, 1)
    sleeping.fillEllipse(0, -16, 150, 105)
    sleeping.fillCircle(-64, -22, 38)
    sleeping.fillCircle(-82, -52, 15)
    sleeping.fillCircle(-46, -54, 15)
    sleeping.fillStyle(0xfde68a, 1)
    sleeping.fillEllipse(-74, -14, 26, 18)
    this.brokenObstacle.add(sleeping)
    const zzz = this.add
      .text(-45, -86, 'Zzz...', {
        fontFamily: 'Nunito, sans-serif',
        fontSize: '26px',
        fontStyle: 'bold',
        color: '#fef08a',
        stroke: '#1e293b',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
    this.brokenObstacle.add(zzz)
    this.tweens.add({
      targets: zzz,
      y: -102,
      alpha: 0.4,
      duration: 1100,
      yoyo: true,
      repeat: -1,
    })

    const awake = this.add.graphics()
    awake.fillStyle(0x7c2d12, 1)
    awake.fillEllipse(85, -52, 92, 118)
    awake.fillCircle(85, -122, 36)
    awake.fillCircle(58, -148, 14)
    awake.fillCircle(112, -148, 14)
    awake.fillStyle(0xfde68a, 1)
    awake.fillEllipse(85, -112, 26, 18)
    this.fixedObstacle.add(awake)
    this.fixedObstacle.add(
      this.add.text(85, -172, '🐻💛', { fontSize: '28px' }).setOrigin(0.5),
    )
  }

  private createHeroAndWalkToObstacle(): void {
    const heroTexture = buildHeroTexture(this, this.equippedGear)
    this.player = this.add.image(150, 442, heroTexture).setScale(1.05).setDepth(10)

    // Thinking bubble hidden until hero reaches obstacle
    this.thinkingBubble = this.add.container(420, 350).setAlpha(0).setDepth(15)
    const bubbleBg = this.add.circle(0, 0, 26, 0xffffff, 0.95)
    bubbleBg.setStrokeStyle(4, 0xf59e0b)
    const qMark = this.add
      .text(0, -1, '?', {
        fontFamily: 'Nunito, sans-serif',
        fontSize: '30px',
        fontStyle: 'bold',
        color: '#d97706',
      })
      .setOrigin(0.5)
    this.thinkingBubble.add([bubbleBg, qMark])

    // Walking bounce while approaching obstacle
    const walkBounce = this.tweens.add({
      targets: this.player,
      y: 432,
      duration: 170,
      yoyo: true,
      repeat: -1,
    })

    this.tweens.add({
      targets: this.player,
      x: 420,
      duration: 1350,
      ease: 'Power1',
      onComplete: () => {
        walkBounce.stop()
        this.player.setY(442)
        this.tweens.add({
          targets: this.thinkingBubble,
          alpha: 1,
          y: 340,
          duration: 300,
          ease: 'Back.easeOut',
        })
        gameEventBus.emit('stage:reached-obstacle', {
          stageId: this.stageId,
          obstacleType: this.obstacleType,
        })
      },
    })
  }

  private onAnswerWrong = ({ stageId }: { stageId: string }): void => {
    if (!this.sys || !this.tweens || stageId !== this.stageId || this.hasSolved) return
    this.tweens.add({
      targets: this.player,
      x: this.player.x - 10,
      duration: 80,
      yoyo: true,
      repeat: 2,
    })
  }

  private onAnswerCorrect = ({ stageId }: { stageId: string }): void => {
    if (!this.sys || !this.tweens || stageId !== this.stageId || this.hasSolved) return
    this.hasSolved = true

    this.thinkingBubble.setAlpha(0)

    if (this.cache.audio.exists('sfx-hammer')) {
      this.sound.play('sfx-hammer')
    }

    // Hiệu ứng ghép ván bay vào nếu là cây cầu gãy
    if (this.obstacleType === 'broken_bridge') {
      for (let i = 0; i < 4; i++) {
        const plank = this.add
          .image(565 + i * 48, 330, 'wooden-plank')
          .setAlpha(0)
          .setDepth(12)
        this.tweens.add({
          targets: plank,
          y: 472,
          alpha: 1,
          duration: 320,
          delay: i * 95,
          ease: 'Bounce.easeOut',
          onComplete: () => {
            this.tweens.add({
              targets: plank,
              alpha: 0,
              duration: 200,
              onComplete: () => plank.destroy(),
            })
          },
        })
      }
    }

    // Hiệu ứng chuyển từ chướng ngại vật hỏng sang đã vượt qua
    this.tweens.add({
      targets: this.brokenObstacle,
      alpha: 0,
      duration: 420,
    })

    this.fixedObstacle.setScale(0.85)
    this.tweens.add({
      targets: this.fixedObstacle,
      alpha: 1,
      scale: 1,
      duration: 620,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.spawnCelebrationBurst(640, 440)

        // Nhân vật nhảy mừng
        this.tweens.add({
          targets: this.player,
          y: 396,
          duration: 220,
          yoyo: true,
          repeat: 1,
          ease: 'Sine.easeOut',
          onComplete: () => {
            // Băng qua cầu sang bờ bên kia
            const runBounce = this.tweens.add({
              targets: this.player,
              y: 432,
              duration: 150,
              yoyo: true,
              repeat: -1,
            })

            this.tweens.add({
              targets: this.player,
              x: 1080,
              duration: 1500,
              ease: 'Sine.easeInOut',
              onComplete: () => {
                runBounce.stop()
                this.player.setY(442)
                this.spawnCelebrationBurst(1080, 410)
                gameEventBus.emit('stage:completed-animation', { stageId: this.stageId })
              },
            })
          },
        })
      },
    })
  }

  private onEnterStage = (payload: StageSceneData): void => {
    if (!this.sys || !this.scene) return
    this.scene.restart({
      ...payload,
      equippedGear: payload.equippedGear ?? this.equippedGear,
      worldData: payload.worldData ?? this.worldData,
    })
  }

  private onReturnToMap = (payload?: { worldData?: WorldMapSceneData | null }): void => {
    if (!this.sys || !this.scene) return
    const data = payload?.worldData ?? this.worldData
    if (data) {
      this.scene.start('WorldMapScene', {
        ...data,
        equippedGear: data.equippedGear ?? this.equippedGear,
      })
    }
  }

  private onLoadWorld = (payload: WorldMapSceneData): void => {
    if (!this.sys || !this.scene) return
    this.scene.start('WorldMapScene', {
      ...payload,
      equippedGear: payload.equippedGear ?? this.equippedGear,
    })
  }

  private onEquipmentChanged = ({ gear }: { gear: EquippedGear }): void => {
    if (!this.sys || !this.textures) return
    this.equippedGear = gear
    if (this.worldData) {
      this.worldData = { ...this.worldData, equippedGear: gear }
    }
    if (this.player && this.player.active) {
      const texKey = buildHeroTexture(this, gear)
      this.player.setTexture(texKey)
      this.tweens.add({
        targets: this.player,
        scale: 1.18,
        duration: 150,
        yoyo: true,
        ease: 'Back.easeOut',
      })
    }
  }

  private onToggleMute = ({ muted }: { muted: boolean }): void => {
    if (!this.sys || !this.sound) return
    this.sound.mute = muted
  }

  private spawnCelebrationBurst(cx: number, cy: number): void {
    const colors = [0xfacc15, 0x4ade80, 0x38bdf8, 0xfb7185, 0xfef08a]
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20
      const dist = Phaser.Math.Between(55, 140)
      const p = this.add
        .image(cx, cy, 'sparkle-dot')
        .setTint(colors[i % colors.length]!)
        .setScale(Phaser.Math.FloatBetween(0.7, 1.35))
        .setDepth(25)

      this.tweens.add({
        targets: p,
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist - 20,
        alpha: 0,
        scale: 0.1,
        duration: Phaser.Math.Between(650, 950),
        ease: 'Cubic.easeOut',
        onComplete: () => p.destroy(),
      })
    }
  }

  private hasValidTexture(key: string): boolean {
    if (!this.textures.exists(key)) return false
    const tex = this.textures.get(key)
    return Boolean(tex && tex.key !== '__MISSING')
  }
}
