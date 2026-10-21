/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  let users = null
  try {
    users = app.findCollectionByNameOrId('users')
  }
  catch {
    users = null
  }

  if (!users) {
    users = new Collection({
      type: 'auth',
      name: 'users',
      listRule: null,
      viewRule: 'id = @request.auth.id',
      createRule: null,
      updateRule: 'id = @request.auth.id',
      deleteRule: null,
      passwordAuth: { enabled: true },
      otp: { enabled: false },
      fields: [
        { name: 'name', type: 'text', required: true, max: 200 },
        { name: 'role', type: 'select', required: true, maxSelect: 1, values: ['admin', 'member'] },
      ],
    })
    app.save(users)
  }
  else {
    users.listRule = null
    users.viewRule = 'id = @request.auth.id'
    users.createRule = null
    users.updateRule = 'id = @request.auth.id'
    users.deleteRule = null
    if (!users.fields.getByName('name')) {
      users.fields.add(new TextField({ name: 'name', required: true, max: 200 }))
    }
    if (!users.fields.getByName('role')) {
      users.fields.add(new SelectField({
        name: 'role',
        required: true,
        maxSelect: 1,
        values: ['admin', 'member'],
      }))
    }
    app.save(users)
  }
  const usersId = users.id

  const folders = new Collection({
    type: 'base',
    name: 'folders',
    listRule: 'user = @request.auth.id',
    viewRule: 'user = @request.auth.id',
    createRule: 'user = @request.auth.id',
    updateRule: 'user = @request.auth.id',
    deleteRule: 'user = @request.auth.id',
    fields: [
      relation('user', usersId, true, true),
      { name: 'name', type: 'text', required: true, max: 200 },
      ...stamps(),
    ],
    indexes: [
      'CREATE INDEX idx_folders_user ON folders (user)',
    ],
  })
  app.save(folders)
  folders.fields.add(new RelationField({
    name: 'parent',
    collectionId: folders.id,
    maxSelect: 1,
    cascadeDelete: true,
  }))
  app.save(folders)

  const files = new Collection({
    type: 'base',
    name: 'library_files',
    listRule: 'user = @request.auth.id',
    viewRule: 'user = @request.auth.id',
    createRule: 'user = @request.auth.id',
    updateRule: 'user = @request.auth.id',
    deleteRule: 'user = @request.auth.id',
    fields: [
      relation('user', usersId, true, true),
      relation('folder', folders.id, false, true),
      { name: 'name', type: 'text', required: true, max: 300 },
      {
        name: 'file',
        type: 'file',
        maxSelect: 1,
        maxSize: 83886080,
        protected: true,
        thumbs: ['200x200', '800x0'],
      },
      { name: 'kind', type: 'text', required: true, max: 40 },
      { name: 'source', type: 'text', required: true, max: 40 },
      { name: 'mime', type: 'text', required: true, max: 200 },
      { name: 'prompt', type: 'text', max: 5000 },
      { name: 'size', type: 'number', onlyInt: true },
      ...stamps(),
    ],
    indexes: [
      'CREATE INDEX idx_library_files_user ON library_files (user)',
    ],
  })
  app.save(files)

  const own = 'user = @request.auth.id'
  app.save(new Collection({
    type: 'base',
    name: 'brands',
    listRule: own,
    viewRule: own,
    createRule: own,
    updateRule: own,
    deleteRule: own,
    fields: [
      relation('user', usersId, true, true),
      { name: 'websiteUrl', type: 'text', max: 2000 },
      { name: 'companyName', type: 'text', max: 300 },
      relation('logo', files.id, false, false),
      relation('images', files.id, false, false, 30),
      { name: 'colors', type: 'json', maxSize: 20000 },
      { name: 'fonts', type: 'json', maxSize: 20000 },
      { name: 'whoTheyAre', type: 'text', max: 8000 },
      { name: 'whatTheyDo', type: 'text', max: 8000 },
      { name: 'audience', type: 'text', max: 4000 },
      { name: 'toneOfVoice', type: 'text', max: 4000 },
      { name: 'articlesUrl', type: 'text', max: 2000 },
      { name: 'onboardingCompleted', type: 'bool' },
      ...stamps(),
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_brands_user ON brands (user)',
    ],
  }))

  const conversations = new Collection({
    type: 'base',
    name: 'conversations',
    listRule: own,
    viewRule: own,
    createRule: own,
    updateRule: own,
    deleteRule: own,
    fields: [
      relation('user', usersId, true, true),
      { name: 'module', type: 'text', required: true, max: 40 },
      { name: 'title', type: 'text', required: true, max: 300 },
      ...stamps(),
    ],
  })
  app.save(conversations)

  app.save(new Collection({
    type: 'base',
    name: 'messages',
    listRule: 'conversation.user = @request.auth.id',
    viewRule: 'conversation.user = @request.auth.id',
    createRule: 'conversation.user = @request.auth.id',
    updateRule: 'conversation.user = @request.auth.id',
    deleteRule: 'conversation.user = @request.auth.id',
    fields: [
      relation('conversation', conversations.id, true, true),
      { name: 'role', type: 'text', required: true, max: 40 },
      { name: 'content', type: 'text', required: true, max: 200000 },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
    ],
  }))

  const accounts = new Collection({
    type: 'base',
    name: 'social_accounts',
    listRule: own,
    viewRule: own,
    createRule: own,
    updateRule: own,
    deleteRule: own,
    fields: [
      relation('user', usersId, true, true),
      { name: 'platform', type: 'text', required: true, max: 40 },
      { name: 'externalId', type: 'text', required: true, max: 300 },
      { name: 'displayName', type: 'text', required: true, max: 300 },
      { name: 'accessTokenEnc', type: 'text', required: true, max: 8000 },
      { name: 'refreshTokenEnc', type: 'text', max: 8000 },
      { name: 'expiresAt', type: 'date' },
      { name: 'meta', type: 'json', maxSize: 50000 },
      { name: 'lastSyncAt', type: 'date' },
      ...stamps(),
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_social_accounts_identity ON social_accounts (user, platform, externalId)',
    ],
  })
  app.save(accounts)

  const posts = new Collection({
    type: 'base',
    name: 'social_posts',
    listRule: own,
    viewRule: own,
    createRule: own,
    updateRule: own,
    deleteRule: own,
    fields: [
      relation('user', usersId, true, true),
      relation('conversation', conversations.id, false, false),
      { name: 'body', type: 'text', max: 20000 },
      relation('media', files.id, false, false),
      { name: 'status', type: 'text', required: true, max: 40 },
      { name: 'source', type: 'text', required: true, max: 40 },
      { name: 'scheduledAt', type: 'date' },
      { name: 'duplicateWarning', type: 'text', max: 2000 },
      ...stamps(),
    ],
  })
  app.save(posts)

  app.save(new Collection({
    type: 'base',
    name: 'social_post_targets',
    listRule: 'post.user = @request.auth.id',
    viewRule: 'post.user = @request.auth.id',
    createRule: 'post.user = @request.auth.id',
    updateRule: 'post.user = @request.auth.id',
    deleteRule: 'post.user = @request.auth.id',
    fields: [
      relation('post', posts.id, true, true),
      relation('account', accounts.id, false, false),
      { name: 'platform', type: 'text', required: true, max: 40 },
      { name: 'body', type: 'text', max: 20000 },
      { name: 'title', type: 'text', max: 300 },
      { name: 'status', type: 'text', required: true, max: 40 },
      { name: 'externalId', type: 'text', max: 300 },
      { name: 'externalUrl', type: 'text', max: 2000 },
      { name: 'error', type: 'text', max: 2000 },
      { name: 'publishedAt', type: 'date' },
    ],
  }))

  app.save(new Collection({
    type: 'base',
    name: 'site_articles',
    listRule: own,
    viewRule: own,
    createRule: own,
    updateRule: own,
    deleteRule: own,
    fields: [
      relation('user', usersId, true, true),
      { name: 'url', type: 'text', required: true, max: 2000 },
      { name: 'title', type: 'text', required: true, max: 500 },
      { name: 'excerpt', type: 'text', max: 2000 },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_site_articles_user_url ON site_articles (user, url)',
    ],
  }))

  app.save(new Collection({
    type: 'base',
    name: 'article_drafts',
    listRule: own,
    viewRule: own,
    createRule: own,
    updateRule: own,
    deleteRule: own,
    fields: [
      relation('user', usersId, true, true),
      relation('conversation', conversations.id, false, false),
      { name: 'title', type: 'text', required: true, max: 500 },
      { name: 'slug', type: 'text', required: true, max: 300 },
      { name: 'metaTitle', type: 'text', required: true, max: 500 },
      { name: 'metaDescription', type: 'text', required: true, max: 2000 },
      { name: 'markdown', type: 'text', required: true, max: 200000 },
      { name: 'faq', type: 'json', maxSize: 100000 },
      { name: 'jsonLd', type: 'json', maxSize: 100000 },
      { name: 'keywords', type: 'json', maxSize: 20000 },
      { name: 'internalLinks', type: 'json', maxSize: 50000 },
      { name: 'geoNotes', type: 'text', max: 20000 },
      ...stamps(),
    ],
  }))

  app.save(new Collection({
    type: 'base',
    name: 'smtp_connections',
    listRule: own,
    viewRule: own,
    createRule: own,
    updateRule: own,
    deleteRule: own,
    fields: [
      relation('user', usersId, true, true),
      { name: 'host', type: 'text', required: true, max: 300 },
      { name: 'port', type: 'number', required: true, onlyInt: true },
      { name: 'secure', type: 'bool' },
      { name: 'username', type: 'text', required: true, max: 300 },
      { name: 'passwordEnc', type: 'text', required: true, max: 8000 },
      { name: 'fromEmail', type: 'text', required: true, max: 300 },
      { name: 'fromName', type: 'text', max: 300 },
      { name: 'imapHost', type: 'text', max: 300 },
      { name: 'imapPort', type: 'number', onlyInt: true },
      { name: 'imapSecure', type: 'bool' },
      ...stamps(),
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_smtp_user ON smtp_connections (user)',
    ],
  }))

  const campaigns = new Collection({
    type: 'base',
    name: 'outreach_campaigns',
    listRule: own,
    viewRule: own,
    createRule: own,
    updateRule: own,
    deleteRule: own,
    fields: [
      relation('user', usersId, true, true),
      relation('conversation', conversations.id, false, false),
      { name: 'name', type: 'text', required: true, max: 300 },
      { name: 'goal', type: 'text', max: 4000 },
      { name: 'audience', type: 'text', max: 4000 },
      { name: 'offer', type: 'text', max: 4000 },
      { name: 'status', type: 'text', required: true, max: 40 },
      ...stamps(),
    ],
  })
  app.save(campaigns)

  const steps = new Collection({
    type: 'base',
    name: 'outreach_steps',
    listRule: 'campaign.user = @request.auth.id',
    viewRule: 'campaign.user = @request.auth.id',
    createRule: 'campaign.user = @request.auth.id',
    updateRule: 'campaign.user = @request.auth.id',
    deleteRule: 'campaign.user = @request.auth.id',
    fields: [
      relation('campaign', campaigns.id, true, true),
      { name: 'position', type: 'number', required: true, onlyInt: true },
      { name: 'delayHours', type: 'number', required: true, onlyInt: true },
      { name: 'subject', type: 'text', required: true, max: 500 },
      { name: 'body', type: 'text', required: true, max: 20000 },
    ],
  })
  app.save(steps)

  const recipients = new Collection({
    type: 'base',
    name: 'outreach_recipients',
    listRule: 'campaign.user = @request.auth.id',
    viewRule: 'campaign.user = @request.auth.id',
    createRule: 'campaign.user = @request.auth.id',
    updateRule: 'campaign.user = @request.auth.id',
    deleteRule: 'campaign.user = @request.auth.id',
    fields: [
      relation('campaign', campaigns.id, true, true),
      { name: 'email', type: 'text', required: true, max: 300 },
      { name: 'name', type: 'text', max: 300 },
      { name: 'status', type: 'text', required: true, max: 40 },
      { name: 'currentStep', type: 'number', onlyInt: true },
    ],
  })
  app.save(recipients)

  app.save(new Collection({
    type: 'base',
    name: 'outreach_messages',
    listRule: 'campaign.user = @request.auth.id',
    viewRule: 'campaign.user = @request.auth.id',
    createRule: 'campaign.user = @request.auth.id',
    updateRule: 'campaign.user = @request.auth.id',
    deleteRule: 'campaign.user = @request.auth.id',
    fields: [
      relation('campaign', campaigns.id, true, true),
      relation('recipient', recipients.id, true, true),
      relation('step', steps.id, false, false),
      { name: 'subject', type: 'text', required: true, max: 500 },
      { name: 'body', type: 'text', required: true, max: 20000 },
      { name: 'status', type: 'text', required: true, max: 40 },
      { name: 'scheduledAt', type: 'date' },
      { name: 'sentAt', type: 'date' },
      { name: 'messageId', type: 'text', max: 500 },
      { name: 'error', type: 'text', max: 2000 },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
    ],
  }))

  const settings = app.settings()
  settings.meta.appName = 'Linde'
  settings.meta.appURL = 'http://localhost:3000'
  app.save(settings)
}, (app) => {
  for (const name of [
    'outreach_messages',
    'outreach_recipients',
    'outreach_steps',
    'outreach_campaigns',
    'smtp_connections',
    'article_drafts',
    'site_articles',
    'social_post_targets',
    'social_posts',
    'social_accounts',
    'messages',
    'conversations',
    'brands',
    'library_files',
    'folders',
    'users',
  ]) {
    try {
      app.delete(app.findCollectionByNameOrId(name))
    }
    catch {
      // Al verwijderd.
    }
  }
})

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
