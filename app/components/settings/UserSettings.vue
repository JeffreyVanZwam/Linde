<script setup lang="ts">
const props = defineProps<{ admin: boolean }>()
const { t } = useI18n()
const api = useRequestFetch()

type ManagedUser = { id: string, name: string, email: string, role: 'admin' | 'member' }
const users = ref<ManagedUser[]>([])
const error = ref('')
const message = ref('')
const profile = reactive({ name: '', oldPassword: '', password: '' })
const created = reactive({ name: '', email: '', password: '', role: 'member' as 'admin' | 'member' })
const me = useState<{ user: { id: string, name: string } } | null>('me')
profile.name = me.value?.user.name || ''

if (props.admin) {
  users.value = await api<ManagedUser[]>('/api/users')
}

async function saveProfile() {
  error.value = ''
  message.value = ''
  try {
    await api('/api/account', {
      method: 'PATCH',
      body: {
        name: profile.name,
        oldPassword: profile.oldPassword || undefined,
        password: profile.password || undefined,
      },
    })
    profile.oldPassword = ''
    profile.password = ''
    await refreshMe()
    message.value = t('common.save')
  }
  catch (cause) {
    error.value = errorText(cause) || t('common.error')
  }
}

async function addUser() {
  error.value = ''
  try {
    await api('/api/users', { method: 'POST', body: { ...created } })
    created.name = ''
    created.email = ''
    created.password = ''
    created.role = 'member'
    users.value = await api<ManagedUser[]>('/api/users')
  }
  catch (cause) {
    error.value = errorText(cause) || t('common.error')
  }
}

async function changeRole(user: ManagedUser, role: 'admin' | 'member') {
  error.value = ''
  try {
    await api(`/api/users/${user.id}`, { method: 'PATCH', body: { role } })
    users.value = await api<ManagedUser[]>('/api/users')
  }
  catch (cause) {
    error.value = errorText(cause) || t('common.error')
  }
}

async function removeUser(user: ManagedUser) {
  error.value = ''
  try {
    await api(`/api/users/${user.id}`, { method: 'DELETE' })
    users.value = users.value.filter(item => item.id !== user.id)
  }
  catch (cause) {
    error.value = errorText(cause) || t('common.error')
  }
}
</script>

<template>
  <section class="space-y-4">
    <h2 class="font-serif text-3xl">
      {{ t('settings.users') }}
    </h2>
    <p class="text-sm text-stone-600">
      {{ t('settings.usersLead') }}
    </p>
    <form class="grid gap-3 sm:grid-cols-2" @submit.prevent="saveProfile">
      <h3 class="font-serif text-2xl sm:col-span-2">
        {{ t('settings.profile') }}
      </h3>
      <UiField :label="t('auth.name')"><UiInput v-model="profile.name" required /></UiField>
      <UiField :label="t('settings.passwordOld')"><UiInput v-model="profile.oldPassword" type="password" /></UiField>
      <UiField :label="t('settings.passwordNew')"><UiInput v-model="profile.password" type="password" minlength="8" /></UiField>
      <div class="sm:col-span-2">
        <UiButton type="submit">
          {{ t('common.save') }}
        </UiButton>
      </div>
    </form>
    <form v-if="admin" class="grid gap-3 sm:grid-cols-2" @submit.prevent="addUser">
      <h3 class="font-serif text-2xl sm:col-span-2">
        {{ t('settings.createUser') }}
      </h3>
      <UiField :label="t('auth.name')"><UiInput v-model="created.name" required /></UiField>
      <UiField :label="t('auth.email')"><UiInput v-model="created.email" type="email" required /></UiField>
      <UiField :label="t('auth.password')"><UiInput v-model="created.password" type="password" required minlength="8" /></UiField>
      <UiField :label="t('settings.role')">
        <select v-model="created.role" class="w-full rounded-2xl border border-line bg-white px-3 py-3 text-sm">
          <option value="member">{{ t('settings.member') }}</option>
          <option value="admin">{{ t('settings.admin') }}</option>
        </select>
      </UiField>
      <div class="sm:col-span-2">
        <UiButton type="submit">
          {{ t('settings.createUser') }}
        </UiButton>
      </div>
    </form>
    <ul v-if="admin" class="space-y-2">
      <li v-for="user in users" :key="user.id" class="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-line bg-white px-4 py-3">
        <div>
          <p class="font-medium">{{ user.name }}</p>
          <p class="text-sm text-stone-500">{{ user.email }}</p>
        </div>
        <div class="flex items-center gap-2">
          <select class="rounded-full border border-line bg-white px-3 py-2 text-sm" :value="user.role" @change="changeRole(user, ($event.target as HTMLSelectElement).value as 'admin' | 'member')">
            <option value="member">{{ t('settings.member') }}</option>
            <option value="admin">{{ t('settings.admin') }}</option>
          </select>
          <UiButton v-if="user.id !== me?.user.id" variant="danger" @click="removeUser(user)">
            {{ t('files.delete') }}
          </UiButton>
        </div>
      </li>
    </ul>
    <UiAlert :message="error" />
    <p v-if="message" class="text-sm text-accent">
      {{ message }}
    </p>
  </section>
</template>
