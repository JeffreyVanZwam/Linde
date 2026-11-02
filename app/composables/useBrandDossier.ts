import { dossierFromLegacy, type BrandDossier } from '~~/shared/dossier'

type BrandSource = {
  websiteUrl: string | null
  companyName: string | null
  whoTheyAre: string | null
  whatTheyDo: string | null
  audience: string | null
  toneOfVoice: string | null
  dossier?: unknown
}

export async function useBrandDossier() {
  const { t, locale } = useI18n()
  const api = useRequestFetch()
  const me = await api<{ brand: BrandSource | null }>('/api/me')
  const dossier = ref<BrandDossier | null>(me.brand ? dossierFromLegacy(me.brand) : null)
  const message = ref('')
  const error = ref('')
  const extracting = ref(false)
  const confirmOpen = ref(false)

  function analysisUrl() {
    return (dossier.value?.foundation.brief.geo.url || me.brand?.websiteUrl || '').trim()
  }

  const canRerun = computed(() => analysisUrl().length >= 4)

  async function rerun() {
    const url = analysisUrl()
    if (url.length < 4 || extracting.value) return
    extracting.value = true
    error.value = ''
    message.value = ''
    try {
      const extracted = await api<BrandSource>('/api/brain/extract', {
        method: 'POST',
        body: { url, locale: locale.value === 'en' ? 'en' : 'nl' },
      })
      dossier.value = dossierFromLegacy(extracted)
      await refreshMe()
      message.value = t('brain.rerunDone')
    }
    catch (cause) {
      error.value = errorText(cause) || t('common.error')
    }
    finally {
      extracting.value = false
      confirmOpen.value = false
    }
  }

  async function save() {
    if (!dossier.value) return
    error.value = ''
    message.value = ''
    try {
      await api('/api/brain', {
        method: 'PUT',
        body: { dossier: dossier.value },
      })
      await refreshMe()
      message.value = t('common.save')
    }
    catch (cause) {
      error.value = errorText(cause) || t('common.error')
    }
  }

  return { dossier, message, error, save, extracting, confirmOpen, canRerun, rerun }
}
