<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import pb from '@/lib/pocketbase'

const router = useRouter()
const creatures = ref([])
const loading = ref(true)
const error = ref(null)

const fetchCreatures = async () => {
  loading.value = true
  try {
    creatures.value = await pb.collection('creatures').getFullList({ sort: 'name' })
  } catch (e) {
    console.error(e)
    error.value = e.message || 'Kon creatures niet laden'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchCreatures()
})

const goEdit = (id) => router.push({ name: 'admin-edit', params: { id } })

const logout = () => {
  pb.authStore.clear()
  router.push({ name: 'admin-login' })
}
</script>

<template>
  <div class="p-8">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-white">Admin Dashboard</h1>
      <div class="flex items-center gap-2">
        <button @click="logout" class="px-3 py-1 rounded bg-red-600 text-white">Logout</button>
      </div>
    </div>

    <div v-if="loading">Laden...</div>
    <div v-else-if="error" class="text-red-400">{{ error }}</div>
    <div v-else>
      <table class="w-full text-left text-white">
        <thead>
          <tr class="border-b border-slate-700 text-black">
            <th class="py-2">Naam</th>
            <th class="py-2">Species</th>
            <th class="py-2">Acties</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in creatures" :key="c.id" class="border-b border-slate-800">
            <td class="py-2">{{ c.name }}</td>
            <td class="py-2">{{ c.species }}</td>
            <td class="py-2">
              <button @click="goEdit(c.id)" class="px-3 py-1 bg-blue-600 rounded">Bewerk</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
* {
  color: black;
}
</style>
