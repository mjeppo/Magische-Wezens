<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import pb from '@/lib/pocketbase'
import CreatureCard from '@/components/CreatureCard.vue'

const allCreatures = ref([])
const categories = ref([])
const isLoading = ref(true)
const error = ref(null)

// Geselecteerde filters
const selectedCategoryId = ref(null)
const selectedKnalIcon = ref(null)
const selectedR3Icon = ref(null)

const showFilters = ref(false)

const filterTovertasOnly = ref(true)

// Zoekfilter op naam
const searchName = ref('')

// LocalStorage keys
const LS_KEYS = {
  vol: 'mw_filter_vol',
  tovertas: 'mw_filter_tovertas',
  sort: 'mw_sortBy',
  showFilters: 'mw_showFilters',
}

// Achtergrondafbeeldingen
import bg1 from '@/img/background1.png'
import bg2 from '@/img/background2.png'
import bg3 from '@/img/background3.png'
import bg4 from '@/img/background4.png'
import bg5 from '@/img/background5.png'
import bg6 from '@/img/background6.png'
import bg7 from '@/img/background7.png'
import bg8 from '@/img/background8.png'
import bg9 from '@/img/background9.png'
import bg10 from '@/img/background10.png'
import bg11 from '@/img/background11.png'
import bg12 from '@/img/background12.png'
import bg13 from '@/img/background13.png'
import bg14 from '@/img/background14.png'
import bg15 from '@/img/background15.png'
import bg16 from '@/img/background16.png'
import bg17 from '@/img/background17.png'
import bg18 from '@/img/background18.png'
import bg19 from '@/img/background19.png'
import bg20 from '@/img/background20.png'

import modalBgTexture from '../img/tex_bkg_magicalcreatures_main_01.png'

const backgrounds = [
  bg1,
  bg2,
  bg3,
  bg4,
  bg5,
  bg6,
  bg7,
  bg8,
  bg9,
  bg10,
  bg11,
  bg12,
  bg13,
  bg14,
  bg15,
  bg16,
  bg17,
  bg18,
  bg19,
  bg20,
]
const activeBgIndex = ref(Math.floor(Math.random() * backgrounds.length))

const setRandomBackground = () => {
  activeBgIndex.value = Math.floor(Math.random() * backgrounds.length)
}

const currentBg = computed(() => backgrounds[activeBgIndex.value])

const sortBy = ref('points') // Standaard op punten

// Helper functie voor timeout
const withTimeout = (promise, timeoutMs = 10000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Request timeout na ${timeoutMs}ms`)), timeoutMs),
    ),
  ])
}

const fetchData = async () => {
  try {
    isLoading.value = true
    error.value = null

    // Haal categorieën op met timeout
    try {
      const categoryDocs = await withTimeout(
        pb.collection('creature_category').getFullList({ sort: 'name' }),
        10000,
      )
      categories.value = categoryDocs
    } catch (catErr) {
      console.error('❌ Fout bij ophalen categorieën:', catErr)
      console.error('Details:', catErr.response || catErr)
      throw new Error(`Fout bij ophalen categorieën: ${catErr.message || JSON.stringify(catErr)}`)
    }

    // Haal creatures op - probeer eerst zonder expand
    let creatureDocs
    try {
      creatureDocs = await withTimeout(
        pb.collection('creatures').getFullList({ sort: 'name' }),
        15000,
      )

      // Probeer nu met expand als er creatures zijn
      if (creatureDocs.length > 0) {
        try {
          const expandedDocs = await withTimeout(
            pb.collection('creatures').getFullList({
              expand:
                'categories_relatie, wezenknal_relatie, bonus_relatie, reeks3a_relatie, reeks3b_relatie, reeks3c_relatie, reeks1_relatie, reeks2a_relatie, reeks2b_relatie, species',
              sort: 'name',
            }),
            15000,
          )
          creatureDocs = expandedDocs
        } catch (expandErr) {
          console.warn('⚠️ Expand mislukt, gebruik data zonder expand:', expandErr.message)
          // Blijf de originele data gebruiken zonder expand
        }
      }
    } catch (basicErr) {
      console.error('❌ Fout bij ophalen creatures:', basicErr)
      console.error('Response:', basicErr.response || basicErr)
      throw new Error(`Fout bij ophalen creatures: ${basicErr.message || JSON.stringify(basicErr)}`)
    }

    allCreatures.value = creatureDocs

    // Log de eerste creature om de structuur te zien
    if (creatureDocs.length > 0) {
    } else {
      console.warn('⚠️ Geen creatures gevonden in de database')
    }
  } catch (err) {
    console.error('❌ Fout bij ophalen data:', err)
    const errorMessage = err.message || err.toString()

    // Check voor timeout of connection errors
    let userMessage = `Kon de gegevens niet ophalen: ${errorMessage}`
    if (
      errorMessage.includes('timeout') ||
      errorMessage.includes('Failed to connect') ||
      errorMessage.includes('NetworkError')
    ) {
      userMessage = `De PocketBase server (${pb.baseUrl}) is niet bereikbaar. Controleer of de server online is en of de URL correct is.`
    }

    error.value = `${userMessage}. Open de browser console (F12) voor meer details.`
  } finally {
    isLoading.value = false
  }
}

const getRelationIconUrl = (relation) => {
  if (!relation) return ''

  // Zoek de bestandsnaam (probeer alle mogelijke veldnamen)
  const fileName = relation.img_icon || relation.icon || relation.image || relation.file

  if (!fileName) return ''

  // Als collectionId ontbreekt in de expand, vul hier de collectie-naam handmatig in
  // We proberen eerst de dynamische ID, anders de collectienaam 'icons'
  const collectionKey = relation.collectionId || relation.collectionName || 'icons'

  return `https://mjeppo.duckdns.org/api/files/${collectionKey}/${relation.id}/${fileName}`
}

// Haal de unieke Wezenknal icoontjes op
const uniqueKnalIcons = computed(() => {
  const icons = allCreatures.value.map((c) => c.img_type_knal).filter((icon) => icon)
  return [...new Set(icons)]
})

// Haal de unieke Reeks 3 icoontjes op
const uniqueR3Icons = computed(() => {
  const icons = allCreatures.value
    .flatMap((c) => [c.img_r3a, c.img_r3b, c.img_r3c])
    .filter((icon) => icon)
  return [...new Set(icons)]
})

// Filter logica - controleer de expanded categories
const filteredCreatures = computed(() => {
  return allCreatures.value
    .filter((c) => {
      // 1. Bestaande filters
      let catMatch = true
      if (selectedCategoryId.value) {
        const expandedCats = c.expand?.categories_relatie || []
        catMatch = expandedCats.some((cat) => cat.id === selectedCategoryId.value)
      }

      const isVol = c.expand?.wezenknal_relatie?.name?.toLowerCase() === 'vol'
      const volMatch = filterVolOnly.value ? isVol : true

      const knalMatch = !selectedKnalIcon.value || c.img_type_knal === selectedKnalIcon.value
      const r3Match =
        !selectedR3Icon.value || [c.img_r3a, c.img_r3b, c.img_r3c].includes(selectedR3Icon.value)

      // 2. DE NIEUWE TOVERTAS FILTER
      // We kijken of de naam 'tovertas' voorkomt in de expanded icons van reeks 3
      const hasTovertas = [
        c.expand?.reeks3a_relatie?.name?.toLowerCase(),
        c.expand?.reeks3b_relatie?.name?.toLowerCase(),
        c.expand?.reeks3c_relatie?.name?.toLowerCase(),
      ].includes('tovertas')

      const tovertasMatch = filterTovertasOnly.value ? hasTovertas : true

      // Zoekfilter op naam (case-insensitive)
      const nameMatch =
        !searchName.value || (c.name || '').toLowerCase().includes(searchName.value.toLowerCase())

      // Alles moet matchen
      return catMatch && volMatch && knalMatch && r3Match && tovertasMatch && nameMatch
    })
    .sort((a, b) => (a.points || 0) - (b.points || 0))
})

const filterVolOnly = ref(true) // Nieuwe checkbox status

const getIconUrl = (fileName) => {
  if (!fileName) return ''
  const owner = allCreatures.value.find(
    (c) =>
      c.img_type_knal === fileName ||
      c.img_r3a === fileName ||
      c.img_r3b === fileName ||
      c.img_r3c === fileName,
  )
  return owner ? `https://mjeppo.duckdns.org/api/files/creatures/${owner.id}/${fileName}` : ''
}

const selectCategory = (id) => {
  selectedCategoryId.value = selectedCategoryId.value === id ? null : id
}

const isClearing = ref(false)

const clearAllFilters = () => {
  isClearing.value = true
  selectedCategoryId.value = null
  selectedKnalIcon.value = null
  selectedR3Icon.value = null
  filterVolOnly.value = false
  filterTovertasOnly.value = false
  // Optioneel: sluit ook het menu op mobiel na het wissen; houd open op brede schermen
  if (typeof window !== 'undefined' && window.innerWidth <= 650) {
    showFilters.value = false
  }

  // Reset zoekfilter op naam
  if (typeof searchName !== 'undefined') {
    searchName.value = ''
  }

  // Na .. ms animatie uitzetten
  setTimeout(() => {
    isClearing.value = false
  }, 400)
}

const hasActiveFilters = computed(() => {
  return (
    selectedCategoryId.value ||
    selectedKnalIcon.value ||
    selectedR3Icon.value ||
    filterVolOnly.value ||
    filterTovertasOnly.value ||
    (searchName && searchName.value)
  )
})

const selectedCreature = ref(null)

const openModal = (creature) => {
  selectedCreature.value = creature
  // Voorkom scrollen van de achtergrond als de modal open is
  document.body.style.overflow = 'hidden'
  const openModal = (creature) => {
    console.log('🔍 Geselecteerd wezen data:', creature)
    console.log('📦 Expanded data:', creature.expand)
    selectedCreature.value = creature
    document.body.style.overflow = 'hidden'
  }
}

const closeModal = () => {
  selectedCreature.value = null
  document.body.style.overflow = 'auto'
}

const getSelectedCreatureUrl = (fileName) => {
  if (!fileName || !selectedCreature.value) return ''
  // Gebruik de baseUrl die je waarschijnlijk al ergens gedefinieerd hebt
  return `https://mjeppo.duckdns.org/api/files/creatures/${selectedCreature.value.id}/${fileName}`
}

const sortedCreatures = computed(() => {
  // We maken eerst een kopie van de gefilterde lijst om de originele data niet te muteren
  return [...filteredCreatures.value].sort((a, b) => {
    if (sortBy.value === 'name') {
      return a.name.localeCompare(b.name)
    } else {
      // Sorteer op punten (hoog naar laag)
      return b.points_needed - a.points_needed
    }
  })
})

onMounted(() => {
  setRandomBackground()
  fetchData()
  // Lees opgeslagen instellingen uit localStorage (indien beschikbaar)
  if (typeof window !== 'undefined') {
    try {
      const storedVol = localStorage.getItem(LS_KEYS.vol)
      const storedTovertas = localStorage.getItem(LS_KEYS.tovertas)
      const storedSort = localStorage.getItem(LS_KEYS.sort)
      const storedShow = localStorage.getItem(LS_KEYS.showFilters)

      if (storedVol !== null) filterVolOnly.value = storedVol === '1'
      if (storedTovertas !== null) filterTovertasOnly.value = storedTovertas === '1'
      if (storedSort) sortBy.value = storedSort

      // showFilters: als we iets opgeslagen hebben, gebruik dat; anders default op brede schermen
      if (storedShow !== null) {
        showFilters.value = storedShow === '1'
      } else if (window.innerWidth > 650) {
        showFilters.value = true
      }
    } catch (e) {
      console.warn('Kon lokale instellingen niet lezen:', e)
    }
  }
})

// Watchers om wijzigingen naar localStorage te schrijven
if (typeof window !== 'undefined') {
  watch(filterVolOnly, (val) => {
    try {
      localStorage.setItem(LS_KEYS.vol, val ? '1' : '0')
    } catch (e) {}
  })

  watch(filterTovertasOnly, (val) => {
    try {
      localStorage.setItem(LS_KEYS.tovertas, val ? '1' : '0')
    } catch (e) {}
  })

  watch(sortBy, (val) => {
    try {
      localStorage.setItem(LS_KEYS.sort, val || '')
    } catch (e) {}
  })

  watch(showFilters, (val) => {
    try {
      localStorage.setItem(LS_KEYS.showFilters, val ? '1' : '0')
    } catch (e) {}
  })
}
</script>

<template>
  <main
    class="min-h-screen bg-slate-950 bg-cover bg-center bg-fixed transition-all duration-1000 relative"
    :style="{ backgroundImage: `url(${currentBg})` }"
  >
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-3 pt-1 flex flex-col items-center">
        <h1
          class="text-4xl font-black text-white mb-1 tracking-tight bg-slate-800/50 backdrop-blur-sm p-6 border border-slate-700 shadow-2xl transition-all py-1 rounded-3xl w-full text-center"
        >
          Magische Wezens
        </h1>
        <!-- <button
          @click="activeBgIndex = (activeBgIndex + 1) % backgrounds.length"
          class="align-middle top-4 right-4 z-50 bg-slate-900/50 text-white p-2 rounded-full text-xs flex items-center gap-2 border border-slate-700 hover:border-blue-500/50 transition-colors"
        >
          <img src="../img/icons/icon_pointing_hand.png" class="w-4" />
          <span>Volgende achtergrond</span>
        </button> -->
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="text-center py-10">
        <div
          class="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"
        ></div>
        <p class="text-slate-400 mt-4">Gegevens ophalen...</p>
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="bg-red-900/20 border border-red-500/50 rounded-xl p-6 text-center"
      >
        <p class="text-red-400">{{ error }}</p>
        <button
          @click="fetchData"
          class="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          Opnieuw proberen
        </button>
      </div>

      <!-- Main Content -->
      <div v-else>
        <!-- Filters Section -->

        <div class="flex justify-center mb-4">
          <button
            @click="showFilters = !showFilters"
            class="bg-slate-800/80 hover:bg-purple-600 hover:border-white text-white px-6 py-3 rounded-full font-bold shadow-lg flex items-center gap-2 transition-all active:scale-95 border border-slate-600"
          >
            <span>{{ showFilters ? '✕' : '🔍' }}</span>
            {{ showFilters ? 'Sluit Filters' : 'Filter Wezens' }}
          </button>
        </div>
        <!--Filtermenu-->

        <div
          class="transition-all duration-500 ease-in-out overflow-hidden mx-auto max-w-7xl"
          :class="[showFilters ? 'max-h-250 opacity-100 mb-6' : 'max-h-0 opacity-0 mb-0']"
        >
          <div
            class="bg-slate-800/80 backdrop-blur-md p-6 rounded-3xl border border-slate-700 shadow-2xl relative z-20"
          >
            <p
              class="text-[20px] uppercase font-bold text-slate-400 mb-4 mt-0 tracking-widest text-center"
            >
              - Filters en sortering-
            </p>

            <div
              class="mb-6 flex flex-col lg:flex-row items-center lg:items-end justify-center gap-6"
            >
              <div>
                <div class="flex flex-col gap-2 w-full sm:w-auto items-center sm:items-start">
                  <label
                    class="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1"
                  >
                    Sorteer op
                  </label>
                  <div
                    class="inline-flex p-1.5 bg-slate-900/50 backdrop-blur-md rounded-xl border border-slate-700 w-full sm:w-fit"
                  >
                    <button
                      @click="sortBy = 'points'"
                      :class="
                        sortBy === 'points'
                          ? 'bg-purple-600 text-white shadow-lg'
                          : 'text-slate-400 hover:text-slate-200'
                      "
                      class="flex-1 sm:flex-none px-3 py-2 rounded-lg text-[11px] font-bold transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      <img
                        src="../img/icons/icon_creature_meter.png"
                        class="w-5 h-5 object-contain"
                      />
                      <span class="whitespace-nowrap">Punten</span>
                    </button>
                    <button
                      @click="sortBy = 'name'"
                      :class="
                        sortBy === 'name'
                          ? 'bg-purple-600 text-white shadow-lg'
                          : 'text-slate-400 hover:text-slate-200'
                      "
                      class="flex-1 sm:flex-none px-3 py-2 rounded-lg text-[11px] font-bold transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      <span class="whitespace-nowrap">Naam</span>
                      <img src="../img/icons/abc-block.png" class="w-5 h-5 object-contain" />
                    </button>
                  </div>
                  <div class="mt-0 w-full sm:w-auto">
                    <label
                      class="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1"
                    >
                    </label>
                    <div class="flex flex-row">
                      <input
                        v-model="searchName"
                        type="text"
                        placeholder="Zoek op naam..."
                        class="mt-1 w-full sm:w-60 px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white focus:border-purple-500"
                      />
                      <div class="w-5 pt-3">
                        <img
                          v-if="searchName != ''"
                          src="../img/icons/clear.png"
                          class="w-5 h-5 object-contain cursor-pointer self-center pl-2"
                          @click="searchName = ''"
                          title="Maak zoekveld leeg"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="flex flex-row sm:flex-col gap-4 w-full sm:w-auto">
                <label
                  class="flex-1 flex items-center justify-between sm:justify-start gap-3 cursor-pointer group bg-slate-900/50 px-4 py-2 rounded-2xl border border-slate-700 hover:border-purple-500/50 transition-colors text-white"
                >
                  <div class="flex items-center gap-3">
                    <input
                      type="checkbox"
                      v-model="filterVolOnly"
                      class="w-5 h-5 accent-purple-500"
                    />
                    <span class="text-xs font-bold whitespace-nowrap">Alleen volle wezenknal</span>
                    <div class="border border-white/10 p-1.5 rounded-full bg-slate-800">
                      <img src="../img/icons/vol.png" class="w-15 h-5 object-contain" />
                    </div>
                  </div>
                </label>

                <label
                  class="flex-1 flex items-center justify-between sm:justify-start gap-3 cursor-pointer group bg-slate-900/50 px-4 py-2 rounded-2xl border border-slate-700 hover:border-purple-500/50 transition-colors text-white"
                >
                  <div class="flex items-center gap-3">
                    <input
                      type="checkbox"
                      v-model="filterTovertasOnly"
                      class="w-5 h-5 accent-purple-500"
                    />
                    <span class="text-xs font-bold whitespace-nowrap">Tovertas in reeks 3</span>
                    <div class="border border-white/10 p-1.5 rounded-full bg-slate-800">
                      <img src="../img/icons/icon_powerup_bag.png" class="w-5 object-contain" />
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div class="mb-1">
              <p
                class="text-[10px] uppercase font-bold text-slate-400 mb-2 mt-4 tracking-widest text-center"
              >
                - Filter op Categorie -
              </p>
              <div class="flex flex-wrap justify-center gap-1">
                <button
                  v-for="category in categories"
                  :key="category.id"
                  @click="selectCategory(category.id)"
                  :class="
                    selectedCategoryId === category.id
                      ? 'ring-2 ring-purple-400 bg-purple-400/20 text-purple-300'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-700'
                  "
                  class="px-4 py-2 rounded-full transition-all hover:scale-105 border border-slate-700 font-bold text-sm"
                >
                  {{ category.name }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="hasActiveFilters" class="flex justify-center mb-1">
          <button
            @click="clearAllFilters"
            class="flex items-center gap-2 px-4 py-2 bg-red-500/40 hover:bg-red-500/20 text-red-300 border border-red-500/30 hover:text-red-800 rounded-full text-xs font-bold uppercase tracking-wider transition-all mb-2"
          >
            <span>✕</span> Wis alle filters
          </button>
        </div>

        <!-- Results Count -->
        <div class="mb-6 text-center">
          <p
            class="text-slate-400 text-sm bg-slate-800/50 backdrop-blur-sm border border-slate-700 shadow-2xl transition-all rounded-3xl"
          >
            <span class="font-bold text-white">{{ sortedCreatures.length }}</span>
            <span v-if="sortedCreatures.length === 1"> wezen gevonden</span>
            <span v-else> wezens gevonden</span>
            <span v-if="hasActiveFilters"> (bij huidige filters)</span>
          </p>
        </div>

        <!-- Creatures Grid -->
        <div
          v-if="sortedCreatures.length > 0"
          :class="{ 'animate-poof': isClearing }"
          class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 transition-all"
        >
          <CreatureCard
            v-for="creature in sortedCreatures"
            :key="creature.id"
            :creature="creature"
            @click="openModal(creature)"
            class="cursor-pointer hover:translate-y-1.25 transition-transform"
          />
        </div>

        <!-- No Results -->
        <div v-else class="text-center py-20 bg-slate-800/30 rounded-2xl border border-slate-700">
          <p class="text-slate-400 text-lg mb-2">Geen wezens gevonden</p>
          <p class="text-slate-500 text-sm">Probeer andere filters te selecteren</p>
          <button
            @click="clearAllFilters"
            class="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-bold"
          >
            Wis filters
          </button>
        </div>
      </div>
    </div>

    <!-- Modal voor uitgebreide informatie -->
    <transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="selectedCreature"
        @click.self="closeModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md"
      >
        <div
          class="bg-slate-800 border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl relative"
        >
          <button
            @click="closeModal"
            class="absolute top-4 right-4 text-slate-400 hover:text-white z-10 bg-slate-900/50 p-2 rounded-full"
          >
            <span class="text-2xl">✕</span>
          </button>

          <div
            class="relative h-64 sm:h-80 rounded-t-3xl overflow-hidden flex items-center justify-center bg-cover bg-center fireflies"
            :style="{ backgroundImage: `url(${modalBgTexture})` }"
          >
            <div class="">
              <fire-fly></fire-fly><fire-fly></fire-fly><fire-fly></fire-fly><fire-fly></fire-fly
              ><fire-fly></fire-fly><fire-fly></fire-fly><fire-fly></fire-fly><fire-fly></fire-fly
              ><fire-fly></fire-fly><fire-fly></fire-fly><fire-fly></fire-fly><fire-fly></fire-fly
              ><fire-fly></fire-fly><fire-fly></fire-fly><fire-fly></fire-fly><fire-fly></fire-fly
              ><fire-fly></fire-fly><fire-fly></fire-fly><fire-fly></fire-fly><fire-fly></fire-fly
              ><fire-fly></fire-fly><fire-fly></fire-fly><fire-fly></fire-fly><fire-fly></fire-fly
              ><fire-fly></fire-fly><fire-fly></fire-fly><fire-fly></fire-fly><fire-fly></fire-fly>
            </div>
            <div class="absolute inset-0 bg-slate-950/50"></div>

            <div
              class="absolute w-72 h-72 bg-purple-600/40 blur-[100px] rounded-full animate-pulse"
            ></div>

            <div
              class="absolute w-48 h-48 bg-blue-500/50 blur-[60px] rounded-full animate-pulse"
              style="animation-delay: 0.5s"
            ></div>

            <div
              class="absolute w-40 h-40 bg-linear-to-t from-orange-500/60 via-yellow-400/30 to-transparent blur-[30px] rounded-full animate-aurora"
            ></div>
            <img
              v-if="selectedCreature"
              :src="`https://mjeppo.duckdns.org/api/files/creatures/${selectedCreature.id}/${selectedCreature.img_full || selectedCreature.image_icon}`"
              class="relative z-10 max-w-full max-h-full object-contain p-6 animate-magical-float"
              :alt="selectedCreature.name"
              @error="
                (e) => {
                  console.log('❌ URL mislukt:', e.target.src)
                  // Laatste redding: probeer image_icon (met underscore) als img_icon faalt
                  if (!e.target.src.includes('image_icon')) {
                    e.target.src = `https://mjeppo.duckdns.org/api/files/creatures/${selectedCreature.id}/${selectedCreature.image_icon}`
                  }
                }
              "
            />
            <!-- Linker paneel: Uitgelichte wezens / categorieën -->
            <div
              v-if="selectedCreature && (selectedCreature.expand?.categories_relatie || []).length"
              class="absolute left-6 top-1/2 transform -translate-y-1/2 z-20 flex flex-col items-start max-w-xs border border-white/30 p-4 bg-black/30 rounded-md"
            >
              <div
                class="text-[14px] uppercase text-white font-bold mb-2 tracking-wider border-white/30 pb-1 border-transparant-gradient"
              >
                UITGELICHTE WEZENS
              </div>
              <div class="w-full"></div>
              <div class="flex flex-col gap-2">
                <span
                  v-for="cat in selectedCreature.expand?.categories_relatie || []"
                  :key="cat.id"
                  class="bg-black/40 text-white px-3 py-1 rounded-md uppercase text-[10px] font-bold"
                >
                  {{ cat.name }}
                </span>
              </div>
            </div>
            <!-- Wezenknal en punten, rechts van de hoofdafbeelding -->
            <div
              v-if="selectedCreature"
              class="absolute right-6 top-1/2 transform -translate-y-1/2 z-20 flex flex-col items-center"
            >
              <div
                class="knal-frame relative bg-purple-800/40! border border-slate-700 rounded-sm p-0 w-38 h-38 flex items-center justify-center"
              >
                <img
                  v-if="selectedCreature.expand?.wezenknal_relatie"
                  :src="getRelationIconUrl(selectedCreature.expand.wezenknal_relatie)"
                  class="w-35 h-35 object-contain rounded-sm"
                  alt="Wezenknal"
                />
                <img
                  v-else-if="selectedCreature.img_type_knal"
                  :src="getIconUrl(selectedCreature.img_type_knal)"
                  class="w-30 h-30 object-contain"
                  alt="Wezenknal"
                />

                <!-- punten inlay onderaan de afbeelding -->
                <div
                  class="knal-inlay absolute left-1/2 transform -translate-x-1/2 -bottom-3 bg-black/40 border border-slate-700 px-0 rounded-md flex items-center"
                >
                  <img src="../img/icons/icon_creature_meter.png" class="meter-icon" />
                  <span class="points-text font-black text-sm mr-2">{{
                    selectedCreature.points || 0
                  }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="p-8">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div class="space-y-6">
                <div>
                  <h2 class="text-4xl font-black text-white mb-1">{{ selectedCreature.name }}</h2>
                  <p class="text-purple-400 font-bold text-lg uppercase tracking-wider">
                    <img
                      v-if="selectedCreature.species === 'Episch'"
                      src="../img/icons/icon_pet_legendary.png"
                      class="inline w-5 h-5 mr-1"
                    />
                    {{ selectedCreature.species }}
                  </p>
                </div>

                <div>
                  <div class="flex w-full border-b border-slate-700/50 pb-2 mb-3">
                    <img src="../img/icons/icon_collection_hut.png" class="w-7 h-7 mr-2" />
                    <h3
                      class="text-amber-500/70 uppercase text-[10px] font-bold tracking-[0.2em] pt-2"
                    >
                      Omschrijving
                    </h3>
                  </div>
                  <div class="text-slate-300 leading-relaxed text-sm">
                    <span
                      v-if="selectedCreature.description && selectedCreature.description !== '#N/A'"
                      >{{ selectedCreature.description }}</span
                    >
                    <div v-else class="flex">
                      <img src="../img/icons/icon_exclamation.png" /><span class="italic ml-4"
                        >Deze magische verschijning heeft nog geen omschrijving in de
                        archieven.</span
                      >
                    </div>
                  </div>
                </div>
              </div>

              <div class="space-y-8">
                <div v-if="selectedCreature.expand?.bonus_relatie">
                  <div class="flex align-middle border-b border-amber-500/20 mb-3">
                    <img
                      src="../img/icons/icon_coinshop_magicalcreatures_tier_badge_01.png"
                      class="w-4 h-4 mr-2"
                      alt=""
                    />
                    <h3
                      class="text-amber-500/70 uppercase text-[10px] font-bold tracking-[0.2em] pb-2"
                    >
                      Bonus
                    </h3>
                  </div>
                  <div class="">
                    <p class="text-white text-sm leading-snug">
                      {{ selectedCreature.expand.bonus_relatie.bonus }}
                    </p>
                  </div>
                </div>

                <div>
                  <h3
                    class="text-amber-500/70 uppercase text-[10px] font-bold tracking-[0.2em] border-b border-slate-700/50 pb-2 mb-4"
                  >
                    Voordelen winstreeks
                  </h3>
                  <div class="space-y-4">
                    <div
                      v-if="selectedCreature.expand?.reeks1_relatie"
                      class="flex items-center gap-4"
                    >
                      <span class="text-[9px] text-blue-400 uppercase font-bold w-12">Reeks 1</span>
                      <div class="bg-blue-500/5 p-2 rounded-xl border border-blue-500/20">
                        <img
                          :src="getRelationIconUrl(selectedCreature.expand.reeks1_relatie)"
                          class="w-10 h-10 object-contain"
                        />
                      </div>
                    </div>

                    <div
                      v-if="
                        selectedCreature.expand?.reeks2a_relatie ||
                        selectedCreature.expand?.reeks2b_relatie
                      "
                      class="flex items-center gap-4"
                    >
                      <span class="text-[9px] text-blue-400 uppercase font-bold w-12">Reeks 2</span>
                      <div
                        class="flex gap-2 bg-blue-500/5 p-2 rounded-xl border border-blue-500/20"
                      >
                        <img
                          v-if="selectedCreature.expand?.reeks2a_relatie"
                          :src="getRelationIconUrl(selectedCreature.expand.reeks2a_relatie)"
                          class="w-10 h-10 object-contain"
                        />
                        <img
                          v-if="selectedCreature.expand?.reeks2b_relatie"
                          :src="getRelationIconUrl(selectedCreature.expand.reeks2b_relatie)"
                          class="w-10 h-10 object-contain"
                        />
                      </div>
                    </div>

                    <div
                      v-if="selectedCreature.expand?.reeks3a_relatie"
                      class="flex items-center gap-4"
                    >
                      <span class="text-[9px] text-blue-400 uppercase font-bold w-12">Reeks 3</span>
                      <div
                        class="flex gap-2 bg-blue-500/5 p-2 rounded-xl border border-blue-500/20"
                      >
                        <img
                          v-if="selectedCreature.expand?.reeks3a_relatie"
                          :src="getRelationIconUrl(selectedCreature.expand.reeks3a_relatie)"
                          class="w-10 h-10 object-contain"
                        />
                        <img
                          v-if="selectedCreature.expand?.reeks3b_relatie"
                          :src="getRelationIconUrl(selectedCreature.expand.reeks3b_relatie)"
                          class="w-10 h-10 object-contain"
                        />
                        <img
                          v-if="selectedCreature.expand?.reeks3c_relatie"
                          :src="getRelationIconUrl(selectedCreature.expand.reeks3c_relatie)"
                          class="w-10 h-10 object-contain"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </main>
</template>

<style>
@keyframes poof {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
    filter: brightness(1.5);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.animate-poof {
  animation: poof 0.4s ease-out;
}

.v-enter-active,
.v-leave-active {
  transition: all 0.5s ease-in-out;
}
.v-enter-from,
.v-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

@keyframes float {
  0% {
    transform: translateY(0px) rotate(0deg);
  }
  50% {
    transform: translateY(-15px) rotate(2deg);
  }
  100% {
    transform: translateY(0px) rotate(0deg);
  }
}

@keyframes aurora {
  0%,
  100% {
    transform: scale(1) opacity(0.5);
    border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
  }
  50% {
    transform: scale(1.2) opacity(0.8);
    border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%;
  }
}

.animate-aurora {
  animation: aurora 4s ease-in-out infinite;
  mix-blend-mode: screen; /* Dit zorgt dat de kleuren echt 'gloeien' op de achtergrond */
}

.animate-magical-float {
  animation: float 6s ease-in-out infinite;
  filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.3));
}

/* Voor de CreatureCard: een subtielere versie */
.card-hover-effect:hover img {
  transform: scale(1.1) translateY(-5px);
  filter: brightness(1.1) drop-shadow(0 15px 25px rgba(139, 92, 246, 0.4));
}

/* Wezenknal kader en punten inlay */
.knal-frame {
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(0, 0, 0, 0.15));
}

/* Inlay (punten) met meter-icoon dat links uitsteken */
.knal-inlay {
  height: 40px;
  min-width: 82px;
  padding-left: 8px;
  padding-right: 12px;
  display: flex;
  align-items: center;
  /* gap: 10px; */
  /* border-radius: 20px; */
  /* backdrop-filter: blur(6px); */
  -webkit-backdrop-filter: blur(6px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.45);
  color: #fff;
  overflow: visible;
}

.meter-icon {
  height: 125%;
  width: auto;
  display: block;
  object-fit: contain;
  transform: translateX(-6px);
  animation: meter-slide-in 1460ms cubic-bezier(0.2, 0.9, 0.2, 1) both;
  margin-left: -25px;
  margin-top: 2px;
}

.points-text {
  font-family: 'Bebas Neue', sans-serif;
  font-weight: 100;
  color: #ffffff; /* wit zoals gevraagd */
  padding-left: 0px;
  font-size: 1.7rem;
  margin-right: 10px;
}

.border-transparant-gradient {
  position: relative;
  padding-bottom: 10px; /* ruimte voor de border */
  background: linear-gradient(to right, transparent, rgba(255, 255, 255, 1), transparent) bottom /
    100% 2px no-repeat;
}

@keyframes meter-slide-in {
  from {
    transform: translateX(-32px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* #region Fireflies */

.fireflies {
  position: relative;
  width: 100%;
  height: 300px;
  overflow: hidden;
  background: transparent;
}

.fireflies fire-fly {
  position: absolute;
  bottom: -10px;
  background: #f2e6c9; /* beige */
  border-radius: 50%;
  opacity: 0.8;
  animation: floatUp linear infinite;
}

/* Animatie */
@keyframes floatUp {
  0% {
    transform: translate(0, 0);
    opacity: 0;
  }
  10% {
    opacity: 0.8;
  }
  50% {
    transform: translate(-20px, -175px);
  }
  100% {
    transform: translate(20px, -350px);
    opacity: 0;
  }
}

/* Variatie per stipje */
.fireflies fire-fly:nth-child(1) {
  left: 10%;
  width: 3px;
  height: 3px;
  animation-duration: 12s;
}

.fireflies fire-fly:nth-child(2) {
  left: 25%;
  width: 2px;
  height: 2px;
  animation-duration: 9s;
  animation-delay: 2s;
}

.fireflies fire-fly:nth-child(3) {
  left: 40%;
  width: 4px;
  height: 4px;
  animation-duration: 14s;
}

.fireflies fire-fly:nth-child(4) {
  left: 60%;
  width: 2px;
  height: 2px;
  animation-duration: 10s;
  animation-delay: 4s;
}

.fireflies fire-fly:nth-child(5) {
  left: 80%;
  width: 3px;
  height: 3px;
  animation-duration: 11s;
}

.fireflies fire-fly:nth-child(6) {
  left: 10%;
  width: 3px;
  height: 3px;
  animation-duration: 12s;
}

.fireflies fire-fly:nth-child(7) {
  left: 25%;
  width: 2px;
  height: 2px;
  animation-duration: 9s;
  animation-delay: 2s;
}

.fireflies fire-fly:nth-child(8) {
  left: 40%;
  width: 4px;
  height: 4px;
  animation-duration: 14s;
}

.fireflies fire-fly:nth-child(9) {
  left: 60%;
  width: 2px;
  height: 2px;
  animation-duration: 10s;
  animation-delay: 4s;
}

.fireflies fire-fly:nth-child(10) {
  left: 80%;
  width: 3px;
  height: 3px;
  animation-duration: 11s;
}

.fireflies fire-fly:nth-child(11) {
  left: 10%;
  width: 3px;
  height: 3px;
  animation-duration: 12s;
}

.fireflies fire-fly:nth-child(12) {
  left: 25%;
  width: 2px;
  height: 2px;
  animation-duration: 9s;
  animation-delay: 2s;
}

.fireflies fire-fly:nth-child(13) {
  left: 40%;
  width: 4px;
  height: 4px;
  animation-duration: 14s;
}

.fireflies fire-fly:nth-child(14) {
  left: 60%;
  width: 2px;
  height: 2px;
  animation-duration: 10s;
  animation-delay: 4s;
}

.fireflies fire-fly:nth-child(15) {
  left: 80%;
  width: 3px;
  height: 3px;
  animation-duration: 11s;
}

.fireflies fire-fly:nth-child(16) {
  left: 10%;
  width: 3px;
  height: 3px;
  animation-duration: 12s;
}

.fireflies fire-fly:nth-child(17) {
  left: 25%;
  width: 2px;
  height: 2px;
  animation-duration: 9s;
  animation-delay: 2s;
}

.fireflies fire-fly:nth-child(18) {
  left: 40%;
  width: 4px;
  height: 4px;
  animation-duration: 14s;
}

.fireflies fire-fly:nth-child(19) {
  left: 60%;
  width: 2px;
  height: 2px;
  animation-duration: 10s;
  animation-delay: 4s;
}

.fireflies fire-fly:nth-child(20) {
  left: 80%;
  width: 3px;
  height: 3px;
  animation-duration: 11s;
}

.fireflies fire-fly:nth-child(21) {
  left: 10%;
  width: 3px;
  height: 3px;
  animation-duration: 12s;
}

.fireflies fire-fly:nth-child(22) {
  left: 25%;
  width: 2px;
  height: 2px;
  animation-duration: 9s;
  animation-delay: 2s;
}

.fireflies fire-fly:nth-child(23) {
  left: 40%;
  width: 4px;
  height: 4px;
  animation-duration: 14s;
}

.fireflies fire-fly:nth-child(24) {
  left: 60%;
  width: 2px;
  height: 2px;
  animation-duration: 10s;
  animation-delay: 4s;
}

.fireflies fire-fly:nth-child(25) {
  left: 80%;
  width: 3px;
  height: 3px;
  animation-duration: 11s;
}

.fireflies fire-fly:nth-child(26) {
  left: 10%;
  width: 3px;
  height: 3px;
  animation-duration: 12s;
}

.fireflies fire-fly:nth-child(27) {
  left: 25%;
  width: 2px;
  height: 2px;
  animation-duration: 9s;
  animation-delay: 2s;
}

.fireflies fire-fly:nth-child(28) {
  left: 40%;
  width: 4px;
  height: 4px;
  animation-duration: 14s;
}

.fireflies fire-fly:nth-child(29) {
  left: 60%;
  width: 2px;
  height: 2px;
  animation-duration: 10s;
  animation-delay: 4s;
}

.fireflies fire-fly:nth-child(30) {
  left: 80%;
  width: 3px;
  height: 3px;
  animation-duration: 11s;
}

.fireflies fire-fly {
  box-shadow: 0 0 6px rgba(242, 230, 201, 0.8);
}

@keyframes sway {
  0%,
  100% {
    transform: translateX(0);
  }
  50% {
    transform: translateX(-20px);
  }
}

.fireflies fire-fly {
  animation: floatUp linear infinite;
}

/* #endregion */
</style>
