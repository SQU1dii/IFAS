<script setup>
import { useRouter } from 'vue-router'
import { useWorkspaceStore } from '@/stores/workspace'
import BaseButton from '@/components/common/BaseButton.vue'
const router = useRouter()
const ws = useWorkspaceStore()
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-fade-in">
    <div class="h-16 w-16 rounded-2xl bg-rose-100 flex items-center justify-center mb-4">
      <svg class="h-8 w-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    </div>
    <h1 class="text-xl font-bold text-navy-800 mb-2">Access restricted</h1>
    <p class="text-sm text-slate-500 max-w-sm mb-1">
      You don't have permission to view this page in the
      <strong>{{ ws.active?.name ?? 'current' }}</strong> workspace.
    </p>
    <p class="text-xs text-slate-400 mb-6">
      Your role is <strong>{{ ws.role ?? 'unknown' }}</strong>.
      Contact your workspace admin if you need access.
    </p>
    <div class="flex gap-3">
      <BaseButton variant="secondary" @click="router.back()">Go back</BaseButton>
      <BaseButton variant="primary" @click="router.push({ name: 'dashboard' })">Dashboard</BaseButton>
    </div>
  </div>
</template>
