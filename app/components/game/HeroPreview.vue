<script setup lang="ts">
import type { EquippedGear } from '~/game/heroTexture'

const props = defineProps<{
  gear: EquippedGear
  nickname?: string
  compact?: boolean
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center select-none">
    <svg
      viewBox="0 0 128 132"
      class="transition-transform duration-300"
      :class="props.compact ? 'w-12 h-12' : 'w-36 h-36 sm:w-44 sm:h-44 drop-shadow-md animate-float'"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <!-- Shadow -->
      <ellipse cx="56" cy="120" rx="28" ry="8" fill="#000" fill-opacity="0.18" />

      <!-- Outfit: Cape -->
      <g v-if="props.gear.outfitCode">
        <path
          d="M28 66 L84 66 L94 112 Q56 120 18 112 Z"
          :fill="props.gear.outfitCode === 'forest_cape' ? '#16a34a' : '#7c3aed'"
          :stroke="props.gear.outfitCode === 'forest_cape' ? '#86efac' : '#c4b5fd'"
          stroke-width="3"
          stroke-linejoin="round"
        />
      </g>

      <!-- Boots -->
      <rect x="38" y="102" width="16" height="17" rx="6" fill="#6d3b1a" />
      <rect x="58" y="102" width="16" height="17" rx="6" fill="#6d3b1a" />

      <!-- Hands -->
      <circle cx="34" cy="84" r="7" fill="#fde68a" />
      <circle cx="80" cy="82" r="7" fill="#fde68a" />

      <!-- Base Tunic / Shirt -->
      <rect x="37" y="64" width="38" height="40" rx="12" fill="#38bdf8" />
      <rect x="37" y="88" width="38" height="14" rx="6" fill="#0284c7" />
      <rect x="37" y="86" width="38" height="5" fill="#f59e0b" />

      <!-- Cape Clasp -->
      <circle
        v-if="props.gear.outfitCode"
        cx="56"
        cy="69"
        r="5"
        fill="#facc15"
        stroke="#92400e"
        stroke-width="2"
      />

      <!-- Badge on chest -->
      <g v-if="props.gear.badgeCode">
        <circle cx="65" cy="77" r="7" fill="#facc15" stroke="#b45309" stroke-width="2" />
        <circle cx="65" cy="77" r="3" fill="#fef9c3" />
      </g>

      <!-- Head -->
      <circle cx="56" cy="44" r="22" fill="#fde68a" />

      <!-- Cute Hair -->
      <g fill="#5c3317">
        <circle cx="44" cy="28" r="10" />
        <circle cx="56" cy="25" r="12" />
        <circle cx="68" cy="28" r="10" />
        <circle cx="38" cy="36" r="7" />
        <circle cx="74" cy="36" r="7" />
      </g>

      <!-- Face -->
      <circle cx="43" cy="49" r="4" fill="#fb7185" fill-opacity="0.55" />
      <circle cx="69" cy="49" r="4" fill="#fb7185" fill-opacity="0.55" />
      <circle cx="49" cy="43" r="3.5" fill="#1e293b" />
      <circle cx="63" cy="43" r="3.5" fill="#1e293b" />
      <circle cx="50" cy="42" r="1.3" fill="#ffffff" />
      <circle cx="64" cy="42" r="1.3" fill="#ffffff" />
      <path d="M50 51 Q56 57 62 51" stroke="#7c2d12" stroke-width="2.5" stroke-linecap="round" />

      <!-- Hat: Golden Crown -->
      <g v-if="props.gear.hatCode === 'golden_crown'">
        <path
          d="M38 28 L38 16 L42 5 L50 18 L56 2 L62 18 L70 5 L74 16 L74 28 Z"
          fill="#facc15"
          stroke="#b45309"
          stroke-width="2"
          stroke-linejoin="round"
        />
        <circle cx="56" cy="22" r="3.5" fill="#ef4444" />
        <circle cx="45" cy="22" r="2.5" fill="#38bdf8" />
        <circle cx="67" cy="22" r="2.5" fill="#38bdf8" />
      </g>

      <!-- Hat: Explorer Hat -->
      <g v-else-if="props.gear.hatCode">
        <ellipse cx="56" cy="27" rx="29" ry="7" fill="#b45309" />
        <rect x="36" y="10" width="40" height="18" rx="10" fill="#d97706" />
        <rect x="36" y="22" width="40" height="4.5" fill="#ef4444" />
        <ellipse cx="74" cy="16" rx="6" ry="3.5" transform="rotate(-18 74 16)" fill="#22c55e" />
      </g>

      <!-- Tool: Magic Lantern -->
      <g v-if="props.gear.toolCode === 'magic_lantern'">
        <circle cx="92" cy="86" r="21" fill="#fef08a" fill-opacity="0.45" />
        <line x1="80" y1="82" x2="92" y2="68" stroke="#78350f" stroke-width="3" stroke-linecap="round" />
        <rect x="83" y="70" width="18" height="5" rx="2" fill="#92400e" />
        <rect x="84" y="75" width="16" height="20" rx="5" fill="#fde047" stroke="#ca8a04" stroke-width="1.5" />
        <circle cx="92" cy="85" r="4.5" fill="#ffffff" fill-opacity="0.95" />
        <rect x="83" y="95" width="18" height="5" rx="2" fill="#92400e" />
      </g>

      <!-- Tool: Wooden Hammer -->
      <g v-else-if="props.gear.toolCode">
        <rect x="84" y="66" width="8" height="34" rx="3" fill="#92400e" />
        <rect x="73" y="52" width="30" height="17" rx="5" fill="#b45309" stroke="#78350f" stroke-width="2" />
        <rect x="76" y="54" width="24" height="6" rx="3" fill="#f59e0b" />
      </g>
    </svg>

    <p v-if="props.nickname && !props.compact" class="font-black text-forest-800 text-base mt-1">
      {{ props.nickname }}
    </p>
  </div>
</template>
