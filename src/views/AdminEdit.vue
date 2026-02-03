<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import pb from '@/lib/pocketbase'
import { useToast } from 'vue-toastification'

const toast = useToast()

const route = useRoute()
const router = useRouter()
const id = ref(route.params.id)

const creature = ref(null)
const creaturesList = ref([])
const loading = ref(true)
const error = ref(null)

// Options
const categoriesOpts = ref([])
const wezenknalOpts = ref([])
const bonusOpts = ref([])
const reeksOpts = ref({})

const form = ref({})

// Zoekfilter voor lijstweergave
const searchName = ref('')

const filteredList = computed(() => {
  if (!searchName.value) return creaturesList.value
  const q = searchName.value.toLowerCase()
  return creaturesList.value.filter((c) => (c.name || '').toLowerCase().includes(q))
})

const fetchCreature = async (whichId) => {
  const useId = whichId || id.value || route.params.id
  loading.value = true
  try {
    creature.value = await pb.collection('creatures').getOne(useId, {
      expand:
        'categories_relatie,wezenknal_relatie,bonus_relatie,reeks1_relatie,reeks2a_relatie,reeks2b_relatie,reeks3a_relatie,reeks3b_relatie,reeks3c_relatie',
    })
    // seed form values
    form.value = {
      name: creature.value.name,
      description: creature.value.description,
      points: creature.value.points || 0,
      wezenknal_relatie:
        creature.value.wezenknal_relatie || creature.value.expand?.wezenknal_relatie?.id || null,
      bonus_relatie: creature.value.expand?.bonus_relatie?.id || null,
      categories_relatie: (creature.value.expand?.categories_relatie || []).map((c) => c.id),
      reeks1_relatie: creature.value.expand?.reeks1_relatie?.id || null,
      reeks2a_relatie: creature.value.expand?.reeks2a_relatie?.id || null,
      reeks2b_relatie: creature.value.expand?.reeks2b_relatie?.id || null,
      reeks3a_relatie: creature.value.expand?.reeks3a_relatie?.id || null,
      reeks3b_relatie: creature.value.expand?.reeks3b_relatie?.id || null,
      reeks3c_relatie: creature.value.expand?.reeks3c_relatie?.id || null,
    }

    // Fetch categories (we know collection name)
    try {
      categoriesOpts.value = await pb.collection('creature_category').getFullList({ sort: 'name' })
    } catch (e) {
      console.warn('No categories collection')
    }

    // Fetch bonus options from collection named 'bonus' (field to display is 'bonus')
    try {
      const b = await pb.collection('bonus').getFullList({ sort: 'bonus' })
      bonusOpts.value = b
    } catch (e) {
      // fallback: if expand provided a bonus_relatie collectionId it may have been fetched below
      console.warn('Kon bonus collectie niet ophalen:', e)
    }

    // If the expand contains relation info, try to fetch options from those collectionIds
    const rels = [
      'wezenknal_relatie',
      'bonus_relatie',
      'reeks1_relatie',
      'reeks2a_relatie',
      'reeks2b_relatie',
      'reeks3a_relatie',
      'reeks3b_relatie',
      'reeks3c_relatie',
    ]
    for (const r of rels) {
      const relObj = creature.value.expand?.[r]
      if (relObj && relObj.collectionId) {
        try {
          const items = await pb.collection(relObj.collectionId).getFullList({ sort: 'name' })
          wezenknalOpts.value =
            rels.includes(r) && r.includes('wezen') ? items : wezenknalOpts.value
          if (r.includes('bonus')) bonusOpts.value = items
          // store as generic reeks list
          if (r.includes('reeks')) {
            reeksOpts.value[r] = items
          }
        } catch (e) {
          console.warn('Could not fetch options for', r, e)
        }
      }
    }
  } catch (e) {
    console.error(e)
    error.value = e.message || 'Kon niet laden'
  } finally {
    loading.value = false
  }
}

const fetchList = async () => {
  loading.value = true
  try {
    // Fetch with expands so we can show relation fields in the list
    creaturesList.value = await pb.collection('creatures').getFullList({
      sort: 'name',
      expand:
        'categories_relatie,wezenknal_relatie,bonus_relatie,reeks3a_relatie,reeks3b_relatie,reeks3c_relatie',
    })
  } catch (e) {
    console.error('Kon creatures lijst niet laden', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (route.params.id) {
    id.value = route.params.id
    fetchCreature(route.params.id)
  } else {
    fetchList()
  }
})

watch(
  () => route.params.id,
  (val) => {
    id.value = val
    if (val) fetchCreature(val)
    else fetchList()
  },
)

const save = async () => {
  try {
    const payload = {
      description: form.value.description,
      points: Number(form.value.points || 0),
      categories_relatie: form.value.categories_relatie || [],
      // single-select relations expect a single id
      wezenknal_relatie: form.value.wezenknal_relatie || null,
      bonus_relatie: form.value.bonus_relatie || null,
      reeks1_relatie: form.value.reeks1_relatie || null,
      reeks2a_relatie: form.value.reeks2a_relatie || null,
      reeks2b_relatie: form.value.reeks2b_relatie || null,
      reeks3a_relatie: form.value.reeks3a_relatie || null,
      reeks3b_relatie: form.value.reeks3b_relatie || null,
      reeks3c_relatie: form.value.reeks3c_relatie || null,
    }
    await pb.collection('creatures').update(creature.value.id, payload)
    toast.success('Wijzigingen opgeslagen')
    router.push({ name: 'admin' })
  } catch (e) {
    console.error(e)
    toast.error('Opslaan mislukt: ' + (e.message || e))
  }
}
</script>

<template>
  <div class="p-6 bg-slate-800">
    <h1 class="text-2xl font-bold text-white mb-4">Bewerk Wezen</h1>

    <div v-if="loading">Laden...</div>
    <div v-else-if="error" class="text-red-400">{{ error }}</div>

    <div v-else>
      <!-- List view when no id -->
      <div v-if="!id">
        <h2 class="text-lg font-bold text-white mb-3">Wezens</h2>
        <div class="flex items-center justify-between mb-3">
          <input
            v-model="searchName"
            type="text"
            placeholder="Zoek op naam..."
            class="p-2 rounded bg-slate-900 text-white border border-slate-700 w-60"
          />
        </div>
        <table class="w-full text-left text-white mb-6">
          <thead>
            <tr class="border-b border-slate-700">
              <th class="py-2">Naam</th>
              <th class="py-2">Wezenknal</th>
              <th class="py-2">Categorieën</th>
              <th class="py-2">Punten</th>
              <th class="py-2">Bonus</th>
              <th class="py-2">Reeks 3a</th>
              <th class="py-2">Reeks 3b</th>
              <th class="py-2">Reeks 3c</th>
              <th class="py-2">Beschrijving</th>
              <th class="py-2">Acties</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in filteredList" :key="c.id" class="border-b border-slate-800 align-top">
              <td class="py-2 align-top">{{ c.name }}</td>
              <td class="py-2 align-top">
                {{ c.expand?.wezenknal_relatie?.name || c.img_type_knal || '-' }}
              </td>
              <td class="py-2 align-top">
                <span v-if="c.expand?.categories_relatie && c.expand.categories_relatie.length">
                  {{ c.expand.categories_relatie.map((x) => x.name).join(', ') }}
                </span>
                <span v-else>-</span>
              </td>
              <td class="py-2 align-top border p-1">{{ c.points || 0 }}</td>
              <td class="py-2 align-top">{{ c.expand?.bonus_relatie?.bonus || '-' }}</td>
              <td class="py-2 align-top">{{ c.expand?.reeks3a_relatie?.name || '-' }}</td>
              <td class="py-2 align-top">{{ c.expand?.reeks3b_relatie?.name || '-' }}</td>
              <td class="py-2 align-top">{{ c.expand?.reeks3c_relatie?.name || '-' }}</td>
              <td class="py-2 align-top">
                <div class="max-w-md text-slate-200">
                  {{ (c.description || '').slice(0, 220)
                  }}<span v-if="c.description && c.description.length > 220">…</span>
                </div>
              </td>
              <td class="py-2 align-top">
                <button
                  @click="$router.push({ name: 'admin', params: { id: c.id } })"
                  class="px-3 py-1 bg-blue-600 rounded"
                >
                  Bewerk
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Edit form when id present -->
      <div v-else>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="text-sm text-slate-300">Naam</label>
            <input
              v-model="form.name"
              class="w-full p-2 rounded bg-slate-900 text-white border border-slate-700"
            />

            <label class="mt-3 text-sm text-slate-300">Beschrijving</label>
            <textarea
              v-model="form.description"
              rows="6"
              class="w-full p-2 rounded bg-slate-900 text-white border border-slate-700"
            ></textarea>

            <label class="mt-3 text-sm text-slate-300">Punten voor wezenknal</label>
            <input
              v-model.number="form.points"
              type="number"
              class="w-32 p-2 rounded bg-slate-900 text-white border border-slate-700"
            />

            <div class="mt-4">
              <label class="text-sm text-slate-300">Categorieën (meerdere)</label>
              <select
                v-model="form.categories_relatie"
                multiple
                class="w-full p-2 rounded bg-slate-900 text-white border border-slate-700"
              >
                <option v-for="opt in categoriesOpts" :key="opt.id" :value="opt.id">
                  {{ opt.name }}
                </option>
              </select>
            </div>
          </div>

          <div>
            <label class="text-sm text-slate-300">Wezenknal</label>
            <select
              v-model="form.wezenknal_relatie"
              class="w-full p-2 rounded bg-slate-900 text-white border border-slate-700"
            >
              <option value="">-- kies --</option>
              <option v-for="opt in wezenknalOpts" :key="opt.id" :value="opt.id">
                {{ opt.name || opt.title || opt.id }}
              </option>
            </select>

            <label class="mt-3 text-sm text-slate-300">Bonus</label>
            <select
              v-model="form.bonus_relatie"
              class="w-full p-2 rounded bg-slate-900 text-white border border-slate-700"
            >
              <option value="">-- kies --</option>
              <option v-for="opt in bonusOpts" :key="opt.id" :value="opt.id">
                {{ opt.bonus || opt.name || opt.title || opt.id }}
              </option>
            </select>

            <div class="mt-4 space-y-2">
              <div>
                <label class="text-sm text-slate-300">Reeks 1</label>
                <select
                  v-model="form.reeks1_relatie"
                  class="w-full p-2 rounded bg-slate-900 text-white border border-slate-700"
                >
                  <option value="">-- kies --</option>
                  <option
                    v-for="opt in reeksOpts.reeks1_relatie || []"
                    :key="opt.id"
                    :value="opt.id"
                  >
                    {{ opt.name || opt.title || opt.id }}
                  </option>
                </select>
              </div>

              <div>
                <label class="text-sm text-slate-300">Reeks 2a</label>
                <select
                  v-model="form.reeks2a_relatie"
                  class="w-full p-2 rounded bg-slate-900 text-white border border-slate-700"
                >
                  <option value="">-- kies --</option>
                  <option
                    v-for="opt in reeksOpts.reeks2a_relatie || []"
                    :key="opt.id"
                    :value="opt.id"
                  >
                    {{ opt.name || opt.title || opt.id }}
                  </option>
                </select>
              </div>

              <div>
                <label class="text-sm text-slate-300">Reeks 2b</label>
                <select
                  v-model="form.reeks2b_relatie"
                  class="w-full p-2 rounded bg-slate-900 text-white border border-slate-700"
                >
                  <option value="">-- kies --</option>
                  <option
                    v-for="opt in reeksOpts.reeks2b_relatie || []"
                    :key="opt.id"
                    :value="opt.id"
                  >
                    {{ opt.name || opt.title || opt.id }}
                  </option>
                </select>
              </div>

              <div>
                <label class="text-sm text-slate-300">Reeks 3a</label>
                <select
                  v-model="form.reeks3a_relatie"
                  class="w-full p-2 rounded bg-slate-900 text-white border border-slate-700"
                >
                  <option value="">-- kies --</option>
                  <option
                    v-for="opt in reeksOpts.reeks3a_relatie || []"
                    :key="opt.id"
                    :value="opt.id"
                  >
                    {{ opt.name || opt.title || opt.id }}
                  </option>
                </select>
              </div>

              <div>
                <label class="text-sm text-slate-300">Reeks 3b</label>
                <select
                  v-model="form.reeks3b_relatie"
                  class="w-full p-2 rounded bg-slate-900 text-white border border-slate-700"
                >
                  <option value="">-- kies --</option>
                  <option
                    v-for="opt in reeksOpts.reeks3b_relatie || []"
                    :key="opt.id"
                    :value="opt.id"
                  >
                    {{ opt.name || opt.title || opt.id }}
                  </option>
                </select>
              </div>

              <div>
                <label class="text-sm text-slate-300">Reeks 3c</label>
                <select
                  v-model="form.reeks3c_relatie"
                  class="w-full p-2 rounded bg-slate-900 text-white border border-slate-700"
                >
                  <option value="">-- kies --</option>
                  <option
                    v-for="opt in reeksOpts.reeks3c_relatie || []"
                    :key="opt.id"
                    :value="opt.id"
                  >
                    {{ opt.name || opt.title || opt.id }}
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-6 flex gap-3">
          <button @click="save" class="px-4 py-2 bg-green-600 text-white rounded">Opslaan</button>
          <button @click="$router.back()" class="px-4 py-2 bg-slate-700 text-white rounded">
            Annuleer
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
table th,
table td {
  vertical-align: top;
  border: 1px solid white !important;
  padding: 5px;
  font-size: 12px;
}
</style>
