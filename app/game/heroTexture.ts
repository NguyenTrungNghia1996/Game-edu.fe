import type Phaser from 'phaser'
import type { ProfileInventory } from '~/types/api'

export interface EquippedGear {
  hatCode?: string | null
  outfitCode?: string | null
  toolCode?: string | null
  badgeCode?: string | null
}

export function extractEquippedGear(inventory: ProfileInventory[]): EquippedGear {
  const gear: EquippedGear = {}
  for (const entry of inventory) {
    if (!entry.is_equipped || !entry.item) continue
    switch (entry.item.category) {
      case 'hat':
        gear.hatCode = entry.item.code
        break
      case 'outfit':
        gear.outfitCode = entry.item.code
        break
      case 'tool':
        gear.toolCode = entry.item.code
        break
      case 'badge':
        gear.badgeCode = entry.item.code
        break
    }
  }
  return gear
}

export function getHeroTextureKey(gear?: EquippedGear | null): string {
  const hat = gear?.hatCode || 'none'
  const outfit = gear?.outfitCode || 'none'
  const tool = gear?.toolCode || 'none'
  const badge = gear?.badgeCode || 'none'
  return `hero-${hat}-${outfit}-${tool}-${badge}`
}

/**
 * Vẽ sprite nhân vật Phaser có đầy đủ trang bị đang mặc (áo choàng, mũ/vương miện, búa/đèn lồng, huy hiệu).
 */
export function buildHeroTexture(scene: Phaser.Scene, gear?: EquippedGear | null): string {
  const key = getHeroTextureKey(gear)
  if (scene.textures.exists(key)) {
    return key
  }

  const g = scene.make.graphics({ x: 0, y: 0 })
  const cx = 56 // tâm nhân vật trên canvas 128x132 (dư khoảng bên phải để cầm dụng cụ)

  // 1. Bóng dưới chân
  g.fillStyle(0x000000, 0.22)
  g.fillEllipse(cx, 120, 56, 16)

  // 2. Áo choàng (outfit) phía sau lưng
  if (gear?.outfitCode) {
    const capeMain = gear.outfitCode === 'forest_cape' ? 0x16a34a : 0x7c3aed
    const capeTrim = gear.outfitCode === 'forest_cape' ? 0x86efac : 0xc4b5fd
    g.fillStyle(capeMain, 1)
    g.fillTriangle(cx - 28, 66, cx + 28, 66, cx - 38, 112)
    g.fillTriangle(cx - 28, 66, cx + 28, 66, cx + 38, 112)
    g.fillRoundedRect(cx - 32, 64, 64, 46, 16)
    // Viền lá xanh nổi bật
    g.lineStyle(3, capeTrim, 0.9)
    g.strokeRoundedRect(cx - 30, 66, 60, 42, 14)
  }

  // 3. Đôi giày
  g.fillStyle(0x6d3b1a, 1)
  g.fillRoundedRect(cx - 18, 102, 16, 17, 6)
  g.fillRoundedRect(cx + 2, 102, 16, 17, 6)

  // 4. Tay trái & tay phải
  g.fillStyle(0xfde68a, 1)
  g.fillCircle(cx - 22, 84, 7)
  g.fillCircle(cx + 24, 82, 7)

  // 5. Thân áo cơ bản
  g.fillStyle(0x38bdf8, 1)
  g.fillRoundedRect(cx - 19, 64, 38, 40, 12)
  // Cổ áo & thắt lưng
  g.fillStyle(0x0284c7, 1)
  g.fillRoundedRect(cx - 19, 88, 38, 14, 6)
  g.fillStyle(0xf59e0b, 1)
  g.fillRect(cx - 19, 86, 38, 5)

  // Khóa vàng áo choàng trước ngực nếu có outfit
  if (gear?.outfitCode) {
    g.fillStyle(0xfacc15, 1)
    g.fillCircle(cx, 69, 5)
    g.lineStyle(2, 0x92400e, 1)
    g.strokeCircle(cx, 69, 5)
  }

  // 6. Huy hiệu trên ngực (badge)
  if (gear?.badgeCode) {
    g.fillStyle(0xfacc15, 1)
    g.fillCircle(cx + 9, 77, 7)
    g.lineStyle(2, 0xb45309, 1)
    g.strokeCircle(cx + 9, 77, 7)
    g.fillStyle(0xfef9c3, 1)
    g.fillCircle(cx + 9, 77, 3)
  }

  // 7. Đầu & tóc cơ bản
  g.fillStyle(0xfde68a, 1)
  g.fillCircle(cx, 44, 22)

  // Tóc nâu dễ thương (luôn vẽ, mũ sẽ đội lên trên)
  g.fillStyle(0x5c3317, 1)
  g.fillCircle(cx - 12, 28, 10)
  g.fillCircle(cx, 25, 12)
  g.fillCircle(cx + 12, 28, 10)
  g.fillCircle(cx - 18, 36, 7)
  g.fillCircle(cx + 18, 36, 7)

  // Khuôn mặt (má hồng, mắt, miệng cười)
  g.fillStyle(0xfb7185, 0.55)
  g.fillCircle(cx - 13, 49, 4)
  g.fillCircle(cx + 13, 49, 4)

  g.fillStyle(0x1e293b, 1)
  g.fillCircle(cx - 7, 43, 3.5)
  g.fillCircle(cx + 7, 43, 3.5)
  g.fillStyle(0xffffff, 1)
  g.fillCircle(cx - 6, 42, 1.3)
  g.fillCircle(cx + 8, 42, 1.3)

  g.lineStyle(2.5, 0x7c2d12, 1)
  g.beginPath()
  g.arc(cx, 48, 6, 0.15 * Math.PI, 0.85 * Math.PI)
  g.strokePath()

  // 8. Mũ / Vương miện (hat)
  if (gear?.hatCode === 'golden_crown') {
    // Vương miện vàng lấp lánh
    g.fillStyle(0xfacc15, 1)
    g.fillRoundedRect(cx - 18, 16, 36, 12, 3)
    g.fillTriangle(cx - 18, 18, cx - 14, 4, cx - 6, 18)
    g.fillTriangle(cx - 8, 18, cx, 1, cx + 8, 18)
    g.fillTriangle(cx + 6, 18, cx + 14, 4, cx + 18, 18)
    g.lineStyle(2, 0xb45309, 1)
    g.strokeRoundedRect(cx - 18, 16, 36, 12, 3)
    // Đá quý trên vương miện
    g.fillStyle(0xef4444, 1)
    g.fillCircle(cx, 22, 3.5)
    g.fillStyle(0x38bdf8, 1)
    g.fillCircle(cx - 11, 22, 2.5)
    g.fillCircle(cx + 11, 22, 2.5)
  } else if (gear?.hatCode) {
    // Mũ thám hiểm rừng xanh
    g.fillStyle(0xb45309, 1)
    g.fillEllipse(cx, 27, 58, 14)
    g.fillStyle(0xd97706, 1)
    g.fillRoundedRect(cx - 20, 10, 40, 18, 10)
    g.fillStyle(0xef4444, 1)
    g.fillRect(cx - 20, 22, 40, 4.5)
    // Chiếc lá xanh nhỏ cài trên mũ
    g.fillStyle(0x22c55e, 1)
    g.fillEllipse(cx + 18, 16, 12, 7)
  }

  // 9. Dụng cụ cầm tay phải (tool)
  if (gear?.toolCode === 'magic_lantern') {
    // Đèn lồng đom đóm phát sáng
    const lx = cx + 36
    const ly = 78
    // Hào quang ấm
    g.fillStyle(0xfef08a, 0.35)
    g.fillCircle(lx, ly + 8, 22)
    // Tay cầm & quai đèn
    g.lineStyle(3, 0x78350f, 1)
    g.beginPath()
    g.moveTo(cx + 24, 82)
    g.lineTo(lx, ly - 10)
    g.strokePath()
    // Thân đèn
    g.fillStyle(0x92400e, 1)
    g.fillRoundedRect(lx - 9, ly - 8, 18, 5, 2)
    g.fillRoundedRect(lx - 9, ly + 17, 18, 5, 2)
    g.fillStyle(0xfde047, 1)
    g.fillRoundedRect(lx - 8, ly - 3, 16, 20, 5)
    g.fillStyle(0xffffff, 0.9)
    g.fillCircle(lx, ly + 7, 4.5)
  } else if (gear?.toolCode) {
    // Búa gỗ thần kỳ
    const hx = cx + 32
    const hy = 72
    // Cán búa
    g.fillStyle(0x92400e, 1)
    g.fillRoundedRect(hx - 4, hy - 6, 8, 34, 3)
    // Đầu búa gỗ to
    g.fillStyle(0xb45309, 1)
    g.fillRoundedRect(hx - 15, hy - 20, 30, 17, 5)
    g.fillStyle(0xf59e0b, 1)
    g.fillRoundedRect(hx - 12, hy - 18, 24, 6, 3)
    g.lineStyle(2, 0x78350f, 1)
    g.strokeRoundedRect(hx - 15, hy - 20, 30, 17, 5)
  }

  g.generateTexture(key, 128, 132)
  g.destroy()
  return key
}
