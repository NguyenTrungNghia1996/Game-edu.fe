import Phaser from 'phaser'
import { gameEventBus } from '../eventBus'
import type { WorldMapSceneData } from '../types'

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene')
  }

  preload(): void {
    // Khởi tạo sẵn các texture vector cơ bản để luôn hiển thị mượt mà ngay cả khi R2 asset chưa tải xong
    this.generateCoreTextures()
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#1b3b2b')

    const loadingText = this.add
      .text(640, 360, 'Đang mở bản đồ phiêu lưu...', {
        fontFamily: 'Nunito, sans-serif',
        fontSize: '30px',
        fontStyle: 'bold',
        color: '#fef08a',
      })
      .setOrigin(0.5)

    this.tweens.add({
      targets: loadingText,
      alpha: 0.45,
      duration: 700,
      yoyo: true,
      repeat: -1,
    })

    const onLoadWorld = (payload: WorldMapSceneData) => {
      if (!this.sys || !this.scene) return
      this.scene.start('WorldMapScene', payload)
    }

    const onToggleMute = ({ muted }: { muted: boolean }) => {
      if (!this.sys || !this.sound) return
      this.sound.mute = muted
    }

    const cleanup = () => {
      gameEventBus.off('game:load-world', onLoadWorld)
      gameEventBus.off('audio:toggle-mute', onToggleMute)
    }

    gameEventBus.on('game:load-world', onLoadWorld)
    gameEventBus.on('audio:toggle-mute', onToggleMute)

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup)
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup)

    gameEventBus.emit('game:ready', undefined)
  }

  private generateCoreTextures(): void {
    if (!this.textures.exists('hero-idle')) {
      const g = this.make.graphics({ x: 0, y: 0 })
      // Shadow
      g.fillStyle(0x000000, 0.22)
      g.fillEllipse(48, 108, 52, 16)
      // Boots
      g.fillStyle(0x6d3b1a, 1)
      g.fillRoundedRect(30, 92, 16, 16, 6)
      g.fillRoundedRect(50, 92, 16, 16, 6)
      // Cape
      g.fillStyle(0x16a34a, 1)
      g.fillRoundedRect(22, 54, 52, 42, 16)
      // Shirt / Body
      g.fillStyle(0x38bdf8, 1)
      g.fillRoundedRect(30, 56, 36, 38, 12)
      // Backpack strap & belt
      g.fillStyle(0xf59e0b, 1)
      g.fillRect(30, 78, 36, 6)
      // Head
      g.fillStyle(0xfde68a, 1)
      g.fillCircle(48, 38, 22)
      // Rosy cheeks
      g.fillStyle(0xfb7185, 0.55)
      g.fillCircle(35, 43, 4)
      g.fillCircle(61, 43, 4)
      // Eyes
      g.fillStyle(0x1e293b, 1)
      g.fillCircle(41, 36, 3.5)
      g.fillCircle(55, 36, 3.5)
      g.fillStyle(0xffffff, 1)
      g.fillCircle(42, 35, 1.2)
      g.fillCircle(56, 35, 1.2)
      // Happy smile
      g.lineStyle(2.5, 0x7c2d12, 1)
      g.beginPath()
      g.arc(48, 42, 6, 0.15 * Math.PI, 0.85 * Math.PI)
      g.strokePath()
      // Explorer hat
      g.fillStyle(0xd97706, 1)
      g.fillEllipse(48, 21, 56, 14)
      g.fillRoundedRect(28, 7, 40, 16, 10)
      g.fillStyle(0xef4444, 1)
      g.fillRect(28, 18, 40, 4)
      g.generateTexture('hero-idle', 96, 116)
      g.destroy()
    }

    if (!this.textures.exists('sparkle-dot')) {
      const g = this.make.graphics({ x: 0, y: 0 })
      g.fillStyle(0xfef08a, 1)
      g.fillCircle(8, 8, 7)
      g.fillStyle(0xffffff, 1)
      g.fillCircle(8, 8, 3.5)
      g.generateTexture('sparkle-dot', 16, 16)
      g.destroy()
    }

    if (!this.textures.exists('wooden-plank')) {
      const g = this.make.graphics({ x: 0, y: 0 })
      g.fillStyle(0xa16207, 1)
      g.fillRoundedRect(0, 0, 44, 24, 5)
      g.fillStyle(0xca8a04, 1)
      g.fillRoundedRect(3, 3, 38, 12, 3)
      g.fillStyle(0x713f12, 1)
      g.fillCircle(8, 12, 2.5)
      g.fillCircle(36, 12, 2.5)
      g.generateTexture('wooden-plank', 44, 24)
      g.destroy()
    }
  }
}
