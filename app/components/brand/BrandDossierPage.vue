<script setup lang="ts">
import type { DossierPillar } from '~~/shared/dossier'

const props = defineProps<{ pillar: DossierPillar }>()
const { t } = useI18n()
const { dossier, message, error, save, extracting, confirmOpen, canRerun, rerun } = await useBrandDossier()
const section = computed(() => props.pillar === 'growthAudit' ? 'audit' : 'foundation')
</script>

<template>
  <form class="mx-auto max-w-4xl space-y-6" @submit.prevent="save">
    <div>
      <h1 class="font-display text-5xl font-semibold tracking-tight">
        {{ t(`${section}.title`) }}
      </h1>
      <p class="mt-3 max-w-2xl text-muted">
        {{ t(`${section}.lead`) }}
      </p>
      <div v-if="canRerun" class="mt-4 flex flex-wrap items-center gap-3">
        <UiButton type="button" variant="ghost" :disabled="extracting" @click="confirmOpen = true">
          {{ extracting ? t('common.loading') : t('brain.rerun') }}
        </UiButton>
        <p v-if="extracting" class="text-sm text-muted">
          {{ t('onboarding.extracting') }}
        </p>
      </div>
    </div>
    <DossierEditor v-if="dossier" v-model="dossier" :pillar="pillar" />
    <p v-else class="text-muted">
      {{ t(`${section}.empty`) }}
    </p>
    <div v-if="dossier" class="flex flex-wrap items-center gap-3">
      <UiButton type="submit">
        {{ t('common.save') }}
      </UiButton>
      <p v-if="message" class="text-sm text-accent">
        {{ message }}
      </p>
    </div>
    <UiAlert :message="error" />
    <UiConfirmModal
      v-if="confirmOpen"
      :title="t('brain.rerunTitle')"
      :message="t('brain.rerunLead')"
      :confirm-label="t('brain.rerunConfirm')"
      :cancel-label="t('common.cancel')"
      :busy="extracting"
      :busy-label="t('common.loading')"
      :progress="t('onboarding.extracting')"
      @confirm="rerun"
      @cancel="confirmOpen = false"
    />
  </form>
</template>
