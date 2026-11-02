/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const posts = app.findCollectionByNameOrId('social_posts')
  if (!posts.fields.getByName('imageUrl')) {
    posts.fields.add(new TextField({ name: 'imageUrl', max: 5000 }))
  }
  app.save(posts)
}, (app) => {
  const posts = app.findCollectionByNameOrId('social_posts')
  const field = posts.fields.getByName('imageUrl')
  if (field) posts.fields.removeById(field.id)
  app.save(posts)
})
