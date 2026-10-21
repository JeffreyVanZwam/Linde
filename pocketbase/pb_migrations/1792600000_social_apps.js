/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const users = app.findCollectionByNameOrId('users')
  const own = 'user = @request.auth.id'

  if (!collection(app, 'social_provider_apps')) {
    app.save(new Collection({
      type: 'base',
      name: 'social_provider_apps',
      listRule: own,
      viewRule: own,
      createRule: own,
      updateRule: own,
      deleteRule: own,
      fields: [
        relation('user', users.id, true, true),
        { name: 'provider', type: 'text', required: true, max: 40 },
        { name: 'clientId', type: 'text', required: true, max: 500 },
        { name: 'clientSecretEnc', type: 'text', required: true, max: 8000 },
        { name: 'privacy', type: 'text', max: 40 },
        ...stamps(),
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_social_provider_apps_user_provider ON social_provider_apps (user, provider)',
      ],
    }))
  }

  if (!collection(app, 'social_connect_pending')) {
    app.save(new Collection({
      type: 'base',
      name: 'social_connect_pending',
      listRule: own,
      viewRule: own,
      createRule: own,
      updateRule: own,
      deleteRule: own,
      fields: [
        relation('user', users.id, true, true),
        { name: 'provider', type: 'text', required: true, max: 40 },
        { name: 'payloadEnc', type: 'text', required: true, max: 200000 },
        { name: 'expiresAt', type: 'date', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      ],
    }))
  }
}, (app) => {
  for (const name of ['social_connect_pending', 'social_provider_apps']) {
    const existing = collection(app, name)
    if (existing) app.delete(existing)
  }
})

function collection(app, name) {
  try {
    return app.findCollectionByNameOrId(name)
  }
  catch {
    return null
  }
}

function stamps() {
  return [
    { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
    { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
  ]
}

function relation(name, collectionId, required, cascade, max = 1) {
  return {
    name,
    type: 'relation',
    required,
    collectionId,
    maxSelect: max,
    cascadeDelete: cascade,
  }
}
