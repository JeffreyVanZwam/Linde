/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const brands = app.findCollectionByNameOrId('brands')
  if (!brands.fields.getByName('dossier')) {
    brands.fields.add(new JSONField({ name: 'dossier', maxSize: 2000000 }))
  }
  app.save(brands)
}, (app) => {
  const brands = app.findCollectionByNameOrId('brands')
  const field = brands.fields.getByName('dossier')
  if (field) brands.fields.removeById(field.id)
  app.save(brands)
})
