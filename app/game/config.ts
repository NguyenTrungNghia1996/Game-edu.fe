import Phaser from 'phaser'
import { BootScene } from './scenes/BootScene'
import { WorldMapScene } from './scenes/WorldMapScene'
import { StageScene } from './scenes/StageScene'

export function createGameConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: 1280,
    height: 720,
    backgroundColor: '#1b3b2b',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    audio: {
      disableWebAudio: false,
    },
    render: {
      antialias: true,
      roundPixels: false,
    },
    scene: [BootScene, WorldMapScene, StageScene],
  }
}
