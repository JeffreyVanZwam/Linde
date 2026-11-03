<script setup lang="ts">
import type { DossierPillar } from '~~/shared/dossier'

const props = defineProps<{ pillar: DossierPillar }>()
const { t } = useI18n()
const { dossier, message, error, save, extracting, confirmOpen, canRerun, rerun } = await useBrandDossier()
const section = computed(() => props.pillar === 'growthAudit' ? 'audit' : 'foundation')
</script>

<template>
  <form class="space-y-5" @submit.prevent="save">
    <AppPageHead :title="t(`${section}.title`)" :lead="t(`${section}.lead`)">
      <template #actions>
        <UiButton v-if="canRerun" type="button" variant="ghost" :disabled="extracting" @click="confirmOpen = true">
          {{ extracting ? t('common.loading') : t('brain.rerun') }}
        </UiButton>
        <UiButton v-if="dossier" type="submit">
          {{ t('common.save') }}
        </UiButton>
      </template>
    </AppPageHead>
    <p v-if="extracting" class="text-sm text-muted">
      {{ t('onboarding.extracting') }}
    </p>
    <DossierEditor v-if="dossier" v-model="dossier" :pillar="pillar" />
    <p v-else class="rounded-[1.6rem] border border-dashed border-line bg-surface px-5 py-12 text-muted">
      {{ t(`${section}.empty`) }}
    </p>
    <p v-if="message" class="text-sm text-accent">
      {{ message }}
    </p>
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
