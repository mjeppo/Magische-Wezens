<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import pb from '@/lib/pocketbase'

const router = useRouter()
const email = ref('')
const password = ref('')
const error = ref(null)

const login = async () => {
  error.value = null
  try {
    await pb.admins.authWithPassword(email.value, password.value)
    router.push({ name: 'admin' })
  } catch (e) {
    console.error(e)
    error.value = e.message || 'Login failed'
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-900 p-6">
    <div class="w-full max-w-md bg-slate-800 p-6 rounded-2xl border border-slate-700">
      <h2 class="text-2xl font-bold text-white mb-4">Admin Login</h2>
      <div class="flex flex-col gap-3">
        <input
          v-model="email"
          type="email"
          placeholder="Email"
          class="p-2 rounded bg-slate-900 border border-slate-700 text-white"
        />
        <input
          v-model="password"
          type="password"
          placeholder="Wachtwoord"
          class="p-2 rounded bg-slate-900 border border-slate-700 text-white"
        />
        <button @click="login" class="mt-2 bg-purple-600 text-white px-4 py-2 rounded">
          Inloggen
        </button>
        <p v-if="error" class="text-red-400">{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
