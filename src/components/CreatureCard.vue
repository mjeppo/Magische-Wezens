<script setup>
const props = defineProps(['creature']);
const emit = defineEmits(['filterKnal', 'filterR3']);

const baseUrl = 'https://mjeppo.duckdns.net';

import modalBgTexture1 from '../img/tex_bkg_magicalcreatures_main_01.png'
import modalBgTexture2 from '../img/ForestOfDean_Bg.png'


/**
 * Helper voor afbeeldingen uit de 'icons' collectie.
 * We gebruiken de data uit de 'expand' relaties.
 */
const getIconUrl = (rel) => {
  if (!rel || !rel.image) return '';
  // De JSON dump liet zien dat icons in collection pbc_3240947349 zitten
  // We kunnen de naam 'icons' of het ID gebruiken.
  return `${baseUrl}/api/files/icons/${rel.id}/${rel.image}`;
};

/**
 * Helper voor afbeeldingen uit de 'creatures' collectie zelf (zoals het icon).
 */
const getCreatureFileUrl = (fileName) => {
  if (!fileName || !props.creature.id) return '';
  return `${baseUrl}/api/files/creatures/${props.creature.id}/${fileName}`;
};
</script>

<template>
  <div class="w-full bg-slate-800 rounded-2xl shadow-black shadow-xl border border-slate-700 overflow-hidden flex flex-col hover:border-blue-500 transition-colors duration-300">
    
    <div class="relative h-24 bg-linear-to-b from-slate-700 to-slate-900 p-2 flex items-center justify-center group bg-cover bg-center "
    :style="{ backgroundImage: `url(${modalBgTexture1})` }">
      <img 
        v-if="creature.img_icon"
        :src="getCreatureFileUrl(creature.img_icon)" 
        class="max-h-full object-contain drop-shadow-2xl transition-all duration-500 ease-out group-hover:scale-110 group-hover:-translate-y-2 group-hover:drop-shadow-[0_20px_30px_rgba(139,92,246,0.5)]"
        alt="Creature Icon"
      />
    </div>

    <div class="p-2 flex flex-col grow text-center">
      <h3 class="text-xl font-black text-white uppercase tracking-tighter mb-2 italic">
        {{ creature.name }}
      </h3>

      <div v-if="creature.expand?.wezenknal_relatie" class="mb-2 flex flex-col items-center border-t border-slate-700/50">
        <span class="text-[10px] text-yellow-500/80 uppercase font-bold tracking-[0.2em] mb-1 mt-1">
          Wezenknal hoogste level
        </span>
        <div class="bg-slate-900/50 p-2 rounded-full border border-slate-700">
          <img 
            :src="getIconUrl(creature.expand.wezenknal_relatie)" 
            class="w-10 h-10 object-contain" 
            alt="Wezenknal"
          />
        </div>
      </div>

      <div class="flex flex-wrap justify-center gap-1 mb-4">
        <span 
          v-for="cat in (creature.expand?.categories_relatie || [])" 
          :key="cat.id"
          class="bg-blue-600/20 text-blue-400 text-[10px] px-2 py-0.5 rounded-full border border-blue-500/30 font-bold"
        >
          {{ cat.name }}
        </span>
      </div>

      <div class="mb-4">
        <p class="text-slate-400 text-xs uppercase font-bold tracking-widest">Bonus</p>
        <p class="text-[12px] font-medium text-yellow-400 px-2 leading-tight min-h-7.5">
          {{ creature.expand?.bonus_relatie?.bonus || 'Geen bonus beschikbaar' }}
        </p>
      </div>

      <div class="mb-4">
        <p class="text-slate-400 text-xs uppercase font-bold tracking-widest">Punten voor wezenknal</p>
        <p class="text-2xl font-black text-yellow-400 leading-none">{{ creature.points || 0 }}</p>
      </div>

      <div class="mt-auto pt-4 border-t border-slate-700/50">
        <p class="text-xs text-white pb-1">Powerups derde reeks</p>
        <div class="flex justify-center items-center gap-3 min-h-8">
          <img v-if="creature.expand?.reeks3a_relatie" :src="getIconUrl(creature.expand.reeks3a_relatie)" class="w-8 h-8 object-contain" title="Powerup A" />
          <img v-if="creature.expand?.reeks3b_relatie" :src="getIconUrl(creature.expand.reeks3b_relatie)" class="w-8 h-8 object-contain" title="Powerup B" />
          <img v-if="creature.expand?.reeks3c_relatie" :src="getIconUrl(creature.expand.reeks3c_relatie)" class="w-8 h-8 object-contain" title="Powerup C" />
          <span v-if="!creature.expand?.reeks3a_relatie && !creature.expand?.reeks3b_relatie" class="text-slate-600 text-[10px]">Geen powerups</span>
        </div>
      </div>
    </div>
  </div>
</template>