/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const users = app.findCollectionByNameOrId('users')
  const brands = app.findCollectionByNameOrId('brands')
  const files = app.findCollectionByNameOrId('library_files')
  const posts = app.findCollectionByNameOrId('social_posts')

  if (!brands.fields.getByName('color')) {
    brands.fields.add(new TextField({ name: 'color', max: 20 }))
  }
  if (!brands.fields.getByName('position')) {
    brands.fields.add(new NumberField({ name: 'position', onlyInt: true }))
  }
  if (!brands.fields.getByName('archived')) {
    brands.fields.add(new BoolField({ name: 'archived' }))
  }
  if (!brands.fields.getByName('writingRules')) {
    brands.fields.add(new JSONField({ name: 'writingRules', maxSize: 100000 }))
  }
  brands.indexes = (brands.indexes || []).filter(sql => !sql.includes('idx_brands_user'))
  if (!brands.indexes.some(sql => sql.includes('idx_brands_user_position'))) {
    brands.indexes.push('CREATE INDEX idx_brands_user_position ON brands (user, position)')
  }
  app.save(brands)

  if (!users.fields.getByName('activeBrand')) {
    users.fields.add(new RelationField({
      name: 'activeBrand',
      collectionId: brands.id,
      maxSelect: 1,
      cascadeDelete: false,
    }))
    app.save(users)
  }

  if (!posts.fields.getByName('angle')) {
    posts.fields.add(new TextField({ name: 'angle', max: 300 }))
    app.save(posts)
  }

  const owned = [
    'conversations',
    'folders',
    'library_files',
    'social_accounts',
    'social_posts',
    'site_articles',
    'article_drafts',
    'smtp_connections',
    'outreach_campaigns',
  ]
  for (const name of owned) {
    const collection = app.findCollectionByNameOrId(name)
    if (!collection.fields.getByName('brand')) {
      collection.fields.add(new RelationField({
        name: 'brand',
        collectionId: brands.id,
        maxSelect: 1,
        required: false,
        cascadeDelete: true,
      }))
    }
    if (name === 'social_accounts') {
      collection.indexes = (collection.indexes || []).filter(sql => !sql.includes('idx_social_accounts_identity'))
    }
    if (name === 'site_articles') {
      collection.indexes = (collection.indexes || []).filter(sql => !sql.includes('idx_site_articles_user_url'))
    }
    if (name === 'smtp_connections') {
      collection.indexes = (collection.indexes || []).filter(sql => !sql.includes('idx_smtp_user'))
    }
    app.save(collection)
  }

  const palette = ['#1F6B4A', '#7A3E6D', '#C4A574', '#2F6F6A', '#8C4A2F', '#3D5A80']
  const active = {}
  const brandRows = all(app, 'brands')
  const grouped = {}
  for (const brand of brandRows) {
    const userId = brand.get('user')
    if (!grouped[userId]) grouped[userId] = []
    grouped[userId].push(brand)
  }
  for (const userId of Object.keys(grouped)) {
    grouped[userId].forEach((brand, index) => {
      if (!brand.get('color')) brand.set('color', palette[index % palette.length])
      brand.set('position', index)
      if (brand.get('archived') !== true) brand.set('archived', false)
      if (!brand.get('writingRules')) brand.set('writingRules', [])
      app.save(brand)
    })
    active[userId] = grouped[userId][0].id
    const user = app.findRecordById('users', userId)
    if (!user.get('activeBrand')) {
      user.set('activeBrand', grouped[userId][0].id)
      app.save(user)
    }
  }

  function brandFor(userId) {
    if (!userId) return ''
    if (active[userId]) return active[userId]
    const collection = app.findCollectionByNameOrId('brands')
    const record = new Record(collection)
    record.set('user', userId)
    record.set('companyName', 'Merk')
    record.set('color', palette[0])
    record.set('position', 0)
    record.set('archived', false)
    record.set('onboardingCompleted', false)
    record.set('writingRules', [])
    app.save(record)
    active[userId] = record.id
    try {
      const user = app.findRecordById('users', userId)
      user.set('activeBrand', record.id)
      app.save(user)
    }
    catch {
      // Gebruiker bestaat niet meer.
    }
    return record.id
  }

  for (const name of owned) {
    for (const record of all(app, name)) {
      if (record.get('brand')) continue
      const brandId = brandFor(record.get('user'))
      if (!brandId) continue
      record.set('brand', brandId)
      app.save(record)
    }
    const collection = app.findCollectionByNameOrId(name)
    const field = collection.fields.getByName('brand')
    if (field) field.required = true
    if (name === 'social_accounts' && !collection.indexes.some(sql => sql.includes('idx_social_accounts_brand'))) {
      collection.indexes.push('CREATE UNIQUE INDEX idx_social_accounts_brand ON social_accounts (brand, platform, externalId)')
    }
    if (name === 'site_articles' && !collection.indexes.some(sql => sql.includes('idx_site_articles_brand_url'))) {
      collection.indexes.push('CREATE UNIQUE INDEX idx_site_articles_brand_url ON site_articles (brand, url)')
    }
    if (name === 'smtp_connections' && !collection.indexes.some(sql => sql.includes('idx_smtp_brand'))) {
      collection.indexes.push('CREATE UNIQUE INDEX idx_smtp_brand ON smtp_connections (brand)')
    }
    app.save(collection)
  }

  const own = 'user = @request.auth.id'
  const notes = new Collection({
    type: 'base',
    name: 'brand_notes',
    listRule: own,
    viewRule: own,
    createRule: own,
    updateRule: own,
    deleteRule: own,
    fields: [
      relation('user', users.id, true, true),
      relation('brand', brands.id, true, true),
      { name: 'kind', type: 'text', required: true, max: 40 },
      { name: 'title', type: 'text', max: 300 },
      { name: 'body', type: 'text', max: 200000 },
      ...stamps(),
    ],
  })
  app.save(notes)

  const series = new Collection({
    type: 'base',
    name: 'content_series',
    listRule: own,
    viewRule: own,
    createRule: own,
    updateRule: own,
    deleteRule: own,
    fields: [
      relation('user', users.id, true, true),
      relation('brand', brands.id, true, true),
      { name: 'title', type: 'text', required: true, max: 300 },
      { name: 'prompt', type: 'text', max: 8000 },
      { name: 'cadenceDays', type: 'number', required: true, onlyInt: true },
      { name: 'lengthDays', type: 'number', required: true, onlyInt: true },
      { name: 'status', type: 'text', required: true, max: 40 },
      { name: 'startsOn', type: 'date' },
      ...stamps(),
    ],
  })
  app.save(series)

  app.save(new Collection({
    type: 'base',
    name: 'series_posts',
    listRule: 'series.user = @request.auth.id',
    viewRule: 'series.user = @request.auth.id',
    createRule: 'series.user = @request.auth.id',
    updateRule: 'series.user = @request.auth.id',
    deleteRule: 'series.user = @request.auth.id',
    fields: [
      relation('series', series.id, true, true),
      { name: 'position', type: 'number', required: true, onlyInt: true },
      relation('post', posts.id, false, false),
      { name: 'status', type: 'text', required: true, max: 40 },
      { name: 'scheduledAt', type: 'date' },
    ],
  }))

  app.save(new Collection({
    type: 'base',
    name: 'lead_magnets',
    listRule: own,
    viewRule: own,
    createRule: own,
    updateRule: own,
    deleteRule: own,
    fields: [
      relation('user', users.id, true, true),
      relation('brand', brands.id, true, true),
      { name: 'problem', type: 'text', max: 4000 },
      { name: 'title', type: 'text', required: true, max: 300 },
      { name: 'kind', type: 'text', required: true, max: 40 },
      { name: 'body', type: 'text', max: 200000 },
      relation('file', files.id, false, false),
      relation('post', posts.id, false, false),
      ...stamps(),
    ],
  }))

  app.save(new Collection({
    type: 'base',
    name: 'testimonials',
    listRule: own,
    viewRule: own,
    createRule: own,
    updateRule: own,
    deleteRule: own,
    fields: [
      relation('user', users.id, true, true),
      relation('brand', brands.id, true, true),
      { name: 'author', type: 'text', max: 300 },
      { name: 'quote', type: 'text', required: true, max: 8000 },
      { name: 'source', type: 'text', max: 500 },
      relation('post', posts.id, false, false),
      ...stamps(),
    ],
  }))
}, (app) => {
  for (const name of ['testimonials', 'lead_magnets', 'series_posts', 'content_series', 'brand_notes']) {
    try {
      app.delete(app.findCollectionByNameOrId(name))
    }
    catch {
      // Al verwijderd.
    }
  }
})

function all(app, name) {
  try {
    return app.findRecordsByFilter(name, "id != ''", 'created', 5000, 0)
  }
  catch {
    return []
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
