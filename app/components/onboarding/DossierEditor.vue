<script setup lang="ts">
import { motion } from 'motion-v'
import { dossierGroups, dossierPillars, type BrandDossier, type DossierGroup, type DossierPillar } from '~~/shared/dossier'

const dossier = defineModel<BrandDossier>({ required: true })
const props = defineProps<{ pillar?: DossierPillar }>()
const { t } = useI18n()
const reduceMotion = ref(false)
const chosen = ref<DossierPillar>(props.pillar ?? 'growthAudit')
const activePillar = computed(() => props.pillar ?? chosen.value)
const group = ref<DossierGroup>(dossierGroups[props.pillar ?? 'growthAudit'][0])

onMounted(() => {
  reduceMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
})

const company = computed(() => dossier.value.foundation.brief.geo.operator.trim() || t('onboarding.thisCompany'))
const groups = computed(() => dossierGroups[activePillar.value])
const part = ref('')

const parts = computed(() => {
  if (group.value === 'website') return ['siteAudit', 'scores', 'quickWins', 'thisQuarter']
  if (group.value === 'seo') return ['seoScores', 'fixes']
  if (group.value === 'listing') return ['listingSummary', 'actionPlan']
  if (group.value === 'brief') return ['geo', 'oneLiner', 'hero', 'pricing', 'features', 'icpSignals', 'trustSpine', 'tone']
  if (group.value === 'audience') return ['audienceSummary', 'segmentation', 'topIcps', 'voice', 'themes', 'antiPatterns']
  return ['competitorSummary', 'matrix', 'spotlight', 'deepDive', 'otherRivals', 'whereWeWin']
})

const websiteScores = computed(() => [
  { key: 'positioning' as const, label: t('onboarding.fields.positioning') },
  { key: 'conversionClarity' as const, label: t('onboarding.fields.conversionClarity') },
  { key: 'trustSignals' as const, label: t('onboarding.fields.trustSignals') },
  { key: 'paywallAndPricing' as const, label: t('onboarding.fields.paywallAndPricing') },
  { key: 'seoBasics' as const, label: t('onboarding.fields.seoBasics') },
  { key: 'briefFit' as const, label: t('onboarding.fields.briefFit') },
])

const seoScores = computed(() => [
  { key: 'crawlability' as const, label: t('onboarding.fields.crawlability') },
  { key: 'pageClarity' as const, label: t('onboarding.fields.pageClarity') },
  { key: 'quotability' as const, label: t('onboarding.fields.quotability') },
  { key: 'authorship' as const, label: t('onboarding.fields.authorship') },
])

const fixColumns = computed(() => [
  { key: 'theme' as const, label: t('onboarding.fix.theme') },
  { key: 'recommendation' as const, label: t('onboarding.fix.recommendation'), multiline: true, rows: 3 },
  { key: 'prompt' as const, label: t('onboarding.fix.prompt'), multiline: true, rows: 5 },
])

const icpColumns = computed(() => [
  { key: 'name' as const, label: t('onboarding.icp.name') },
  { key: 'dive' as const, label: t('onboarding.icp.dive'), multiline: true, rows: 4 },
])

const matrixColumns = computed(() => [
  { key: 'name' as const, label: t('onboarding.matrix.name') },
  { key: 'pricing' as const, label: t('onboarding.matrix.pricing') },
  { key: 'offer' as const, label: t('onboarding.matrix.offer'), multiline: true, rows: 3 },
  { key: 'difference' as const, label: t('onboarding.matrix.difference'), multiline: true, rows: 3 },
])

const rivalColumns = computed(() => [
  { key: 'name' as const, label: t('onboarding.rival.name') },
  { key: 'note' as const, label: t('onboarding.rival.note'), multiline: true, rows: 3 },
])

function choosePillar(next: DossierPillar) {
  chosen.value = next
  group.value = dossierGroups[next][0]
}

function partLabel(id: string) {
  if (id === 'whereWeWin') return t('onboarding.parts.whereWeWin', { company: company.value })
  return t(`onboarding.parts.${id}`)
}

watch(parts, (available) => {
  if (!available.includes(part.value)) part.value = available[0] || ''
}, { immediate: true })
</script>

<template>
  <div class="space-y-5">
    <div v-if="!pillar" class="flex flex-wrap gap-2">
      <button
        v-for="item in dossierPillars"
        :key="item"
        type="button"
        class="rounded-full px-4 py-2 text-sm font-medium transition"
        :class="activePillar === item ? 'bg-cta text-cta-ink' : 'border border-line bg-surface text-ink'"
        :aria-pressed="activePillar === item"
        @click="choosePillar(item)"
      >
        {{ t(`onboarding.pillars.${item}`) }}
      </button>
    </div>
    <div class="inline-flex max-w-full flex-wrap gap-1 rounded-full border border-line bg-surface p-1">
      <button
        v-for="item in groups"
        :key="item"
        type="button"
        class="rounded-full px-4 py-2 text-sm font-medium transition"
        :class="group === item ? 'bg-cta text-cta-ink' : 'text-muted hover:text-ink'"
        :aria-pressed="group === item"
        @click="group = item"
      >
        {{ t(`onboarding.groups.${item}`) }}
      </button>
    </div>
    <div class="grid items-start gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <nav class="flex gap-2 overflow-x-auto lg:sticky lg:top-0 lg:flex-col" :aria-label="t(`onboarding.groups.${group}`)">
        <button
          v-for="item in parts"
          :key="item"
          type="button"
          class="shrink-0 rounded-2xl px-3 py-2 text-left text-sm font-medium transition lg:w-full"
          :class="part === item ? 'bg-cta text-cta-ink' : 'bg-surface text-muted hover:text-ink'"
          :aria-pressed="part === item"
          @click="part = item"
        >
          {{ partLabel(item) }}
        </button>
      </nav>
    <motion.div
      :key="`${activePillar}-${group}-${part}`"
      :initial="reduceMotion ? false : { opacity: 0, y: 10 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: reduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }"
      class="min-w-0 space-y-4"
    >
      <div>
        <h2 class="font-display text-3xl font-semibold tracking-tight">
          {{ t(`onboarding.groups.${group}`) }}
        </h2>
        <p class="mt-2 max-w-2xl text-sm text-muted">
          {{ t(`onboarding.groupHints.${group}`) }}
        </p>
      </div>

      <template v-if="group === 'website'">
        <DossierSection v-if="part === 'siteAudit'" id="siteAudit" layout="split" :title="t('onboarding.parts.siteAudit')">
          <UiField :label="t('onboarding.fields.audienceScope')">
            <UiTextarea v-model="dossier.growthAudit.website.siteAudit.audienceScope" :rows="4" />
          </UiField>
          <UiField :label="t('onboarding.fields.gutReaction')">
            <UiTextarea v-model="dossier.growthAudit.website.siteAudit.gutReaction" :rows="4" />
          </UiField>
          <UiField class="md:col-span-2" :label="t('onboarding.fields.spotlightCompetitors')">
            <UiTextarea v-model="dossier.growthAudit.website.siteAudit.spotlightCompetitors" :rows="4" />
          </UiField>
        </DossierSection>
        <DossierSection v-if="part === 'scores'" id="scores" layout="grid" :title="t('onboarding.parts.scores')">
          <DossierScoreField
            v-for="field in websiteScores"
            :key="field.key"
            v-model="dossier.growthAudit.website.scores[field.key]"
            :label="field.label"
            :score-label="t('onboarding.score')"
            :finding-label="t('onboarding.finding')"
          />
        </DossierSection>
        <DossierSection v-if="part === 'quickWins'" id="quickWins" :title="t('onboarding.parts.quickWins')" :hint="t('onboarding.hints.quickWins')">
          <DossierLines v-model="dossier.growthAudit.website.quickWins" :add-label="t('onboarding.addLine')" :remove-label="t('onboarding.remove')" />
        </DossierSection>
        <DossierSection v-if="part === 'thisQuarter'" id="thisQuarter" :title="t('onboarding.parts.thisQuarter')" :hint="t('onboarding.hints.thisQuarter')">
          <DossierLines v-model="dossier.growthAudit.website.thisQuarter" :add-label="t('onboarding.addLine')" :remove-label="t('onboarding.remove')" />
        </DossierSection>
      </template>

      <template v-else-if="group === 'seo'">
        <DossierSection v-if="part === 'seoScores'" id="seoScores" layout="grid" :title="t('onboarding.parts.seoScores')">
          <DossierScoreField
            v-for="field in seoScores"
            :key="field.key"
            v-model="dossier.growthAudit.seo.scores[field.key]"
            :label="field.label"
            :score-label="t('onboarding.score')"
            :finding-label="t('onboarding.finding')"
          />
        </DossierSection>
        <DossierSection v-if="part === 'fixes'" id="fixes" :title="t('onboarding.parts.fixes')" :hint="t('onboarding.hints.fixes')">
          <DossierRecords
            v-model="dossier.growthAudit.seo.fixes"
            :columns="fixColumns"
            :add-label="t('onboarding.addFix')"
            :remove-label="t('onboarding.remove')"
            :item-label="t('onboarding.fix.item')"
          />
        </DossierSection>
      </template>

      <template v-else-if="group === 'listing'">
        <DossierSection v-if="part === 'listingSummary'" id="listingSummary" :title="t('onboarding.parts.listingSummary')">
          <UiTextarea v-model="dossier.growthAudit.listing.summary" :rows="5" />
        </DossierSection>
        <DossierSection v-if="part === 'actionPlan'" id="actionPlan" layout="split" :title="t('onboarding.parts.actionPlan')">
          <UiField :label="t('onboarding.fields.distributionPlays')">
            <UiTextarea v-model="dossier.growthAudit.listing.actionPlan.distributionPlays" :rows="4" />
          </UiField>
          <UiField :label="t('onboarding.fields.listingQuickWins')">
            <UiTextarea v-model="dossier.growthAudit.listing.actionPlan.quickWins" :rows="4" />
          </UiField>
          <UiField :label="t('onboarding.fields.founderTrustUpgrades')">
            <UiTextarea v-model="dossier.growthAudit.listing.actionPlan.founderTrustUpgrades" :rows="4" />
          </UiField>
          <UiField :label="t('onboarding.fields.biggerBets')">
            <UiTextarea v-model="dossier.growthAudit.listing.actionPlan.biggerBets" :rows="4" />
          </UiField>
          <UiField :label="t('onboarding.fields.postInstallSignals')">
            <UiTextarea v-model="dossier.growthAudit.listing.actionPlan.postInstallSignals" :rows="4" />
          </UiField>
          <UiField :label="t('onboarding.fields.notYetPlanned')">
            <UiTextarea v-model="dossier.growthAudit.listing.actionPlan.notYetPlanned" :rows="4" />
          </UiField>
        </DossierSection>
      </template>

      <template v-else-if="group === 'brief'">
        <DossierSection v-if="part === 'geo'" id="geo" layout="split" :title="t('onboarding.parts.geo')">
          <UiField :label="t('onboarding.fields.url')">
            <UiInput v-model="dossier.foundation.brief.geo.url" type="url" />
          </UiField>
          <UiField :label="t('onboarding.fields.geoScope')">
            <UiTextarea v-model="dossier.foundation.brief.geo.scope" :rows="3" />
          </UiField>
          <UiField class="md:col-span-2" :label="t('onboarding.fields.operator')">
            <UiInput v-model="dossier.foundation.brief.geo.operator" />
          </UiField>
        </DossierSection>
        <DossierSection v-if="part === 'oneLiner'" id="oneLiner" layout="split" :title="t('onboarding.parts.oneLiner')">
          <UiField :label="t('onboarding.fields.oneLiner')">
            <UiTextarea v-model="dossier.foundation.brief.oneLiner" :rows="3" />
          </UiField>
          <UiField :label="t('onboarding.fields.category')">
            <UiInput v-model="dossier.foundation.brief.category" />
          </UiField>
        </DossierSection>
        <DossierSection v-if="part === 'hero'" id="hero" :title="t('onboarding.parts.hero')" :hint="t('onboarding.hints.hero')">
          <UiTextarea v-model="dossier.foundation.brief.hero" :rows="4" />
        </DossierSection>
        <DossierSection v-if="part === 'pricing'" id="pricing" :title="t('onboarding.parts.pricing')">
          <UiTextarea v-model="dossier.foundation.brief.pricing" :rows="4" />
        </DossierSection>
        <DossierSection v-if="part === 'features'" id="features" :title="t('onboarding.parts.features')">
          <DossierLines v-model="dossier.foundation.brief.features" :add-label="t('onboarding.addLine')" :remove-label="t('onboarding.remove')" />
        </DossierSection>
        <DossierSection v-if="part === 'icpSignals'" id="icpSignals" :title="t('onboarding.parts.icpSignals')">
          <UiTextarea v-model="dossier.foundation.brief.icpSignals" :rows="4" />
        </DossierSection>
        <DossierSection v-if="part === 'trustSpine'" id="trustSpine" :title="t('onboarding.parts.trustSpine')">
          <UiTextarea v-model="dossier.foundation.brief.trustSpine" :rows="4" />
        </DossierSection>
        <DossierSection v-if="part === 'tone'" id="tone" :title="t('onboarding.parts.tone')">
          <UiTextarea v-model="dossier.foundation.brief.tone" :rows="4" />
        </DossierSection>
      </template>

      <template v-else-if="group === 'audience'">
        <DossierSection v-if="part === 'audienceSummary'" id="audienceSummary" layout="split" :title="t('onboarding.parts.audienceSummary')">
          <UiField :label="t('onboarding.fields.whoHasProblem')">
            <UiTextarea v-model="dossier.foundation.audience.summary.whoHasProblem" :rows="3" />
          </UiField>
          <UiField :label="t('onboarding.fields.whoPays')">
            <UiTextarea v-model="dossier.foundation.audience.summary.whoPays" :rows="3" />
          </UiField>
          <UiField :label="t('onboarding.fields.dominantPain')">
            <UiTextarea v-model="dossier.foundation.audience.summary.dominantPain" :rows="3" />
          </UiField>
          <UiField :label="t('onboarding.fields.objection')">
            <UiTextarea v-model="dossier.foundation.audience.summary.objection" :rows="3" />
          </UiField>
          <UiField :label="t('onboarding.fields.dominantTrigger')">
            <UiTextarea v-model="dossier.foundation.audience.summary.dominantTrigger" :rows="3" />
          </UiField>
          <UiField :label="t('onboarding.fields.evidenceCaveat')">
            <UiTextarea v-model="dossier.foundation.audience.summary.evidenceCaveat" :rows="3" />
          </UiField>
        </DossierSection>
        <DossierSection v-if="part === 'segmentation'" id="segmentation" :title="t('onboarding.parts.segmentation')">
          <UiTextarea v-model="dossier.foundation.audience.segmentation" :rows="5" />
        </DossierSection>
        <DossierSection v-if="part === 'topIcps'" id="topIcps" :title="t('onboarding.parts.topIcps')">
          <DossierRecords
            v-model="dossier.foundation.audience.topIcps"
            :columns="icpColumns"
            :add-label="t('onboarding.addLine')"
            :remove-label="t('onboarding.remove')"
            :item-label="t('onboarding.icp.item')"
            fixed
          />
        </DossierSection>
        <DossierSection v-if="part === 'voice'" id="voice" :title="t('onboarding.parts.voice')" :hint="t('onboarding.hints.voice')">
          <DossierLines v-model="dossier.foundation.audience.voice" :add-label="t('onboarding.addLine')" :remove-label="t('onboarding.remove')" />
        </DossierSection>
        <DossierSection v-if="part === 'themes'" id="themes" :title="t('onboarding.parts.themes')">
          <DossierLines v-model="dossier.foundation.audience.themes" :add-label="t('onboarding.addLine')" :remove-label="t('onboarding.remove')" />
        </DossierSection>
        <DossierSection v-if="part === 'antiPatterns'" id="antiPatterns" :title="t('onboarding.parts.antiPatterns')">
          <DossierLines v-model="dossier.foundation.audience.antiPatterns" :add-label="t('onboarding.addLine')" :remove-label="t('onboarding.remove')" />
        </DossierSection>
      </template>

      <template v-else>
        <DossierSection v-if="part === 'competitorSummary'" id="competitorSummary" layout="split" :title="t('onboarding.parts.competitorSummary')">
          <UiField :label="t('onboarding.fields.categoryStatement')">
            <UiTextarea v-model="dossier.foundation.competitors.summary.categoryStatement" :rows="3" />
          </UiField>
          <UiField :label="t('onboarding.fields.marketLandscape')">
            <UiTextarea v-model="dossier.foundation.competitors.summary.marketLandscape" :rows="4" />
          </UiField>
          <UiField :label="t('onboarding.fields.dominantValueProp')">
            <UiTextarea v-model="dossier.foundation.competitors.summary.dominantValueProp" :rows="3" />
          </UiField>
          <UiField :label="t('onboarding.fields.dominantPricingModel')">
            <UiTextarea v-model="dossier.foundation.competitors.summary.dominantPricingModel" :rows="3" />
          </UiField>
          <UiField class="md:col-span-2" :label="t('onboarding.fields.positionsToOwn')">
            <UiTextarea v-model="dossier.foundation.competitors.summary.positionsToOwn" :rows="3" />
          </UiField>
        </DossierSection>
        <DossierSection v-if="part === 'matrix'" id="matrix" :title="t('onboarding.parts.matrix')">
          <DossierRecords
            v-model="dossier.foundation.competitors.matrix"
            :columns="matrixColumns"
            :add-label="t('onboarding.addRow')"
            :remove-label="t('onboarding.remove')"
          />
        </DossierSection>
        <DossierSection v-if="part === 'spotlight'" id="spotlight" :title="t('onboarding.parts.spotlight')" :hint="t('onboarding.hints.spotlight')">
          <UiTextarea v-model="dossier.foundation.competitors.spotlight" :rows="5" />
        </DossierSection>
        <DossierSection v-if="part === 'deepDive'" id="deepDive" :title="t('onboarding.parts.deepDive')">
          <DossierRecords
            v-model="dossier.foundation.competitors.deepDive"
            :columns="rivalColumns"
            :add-label="t('onboarding.addRival')"
            :remove-label="t('onboarding.remove')"
            :item-label="t('onboarding.rival.item')"
          />
        </DossierSection>
        <DossierSection v-if="part === 'otherRivals'" id="otherRivals" :title="t('onboarding.parts.otherRivals')">
          <DossierRecords
            v-model="dossier.foundation.competitors.otherRivals"
            :columns="rivalColumns"
            :add-label="t('onboarding.addRival')"
            :remove-label="t('onboarding.remove')"
            :item-label="t('onboarding.rival.item')"
          />
        </DossierSection>
        <DossierSection v-if="part === 'whereWeWin'" id="whereWeWin" :title="t('onboarding.parts.whereWeWin', { company })" :hint="t('onboarding.hints.whereWeWin')">
          <UiTextarea v-model="dossier.foundation.competitors.whereWeWin" :rows="5" />
        </DossierSection>
      </template>
    </motion.div>
    </div>
  </div>
</template>
