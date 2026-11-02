/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const targets = app.findCollectionByNameOrId('social_post_targets')
  for (const name of metricNames) {
    if (!targets.fields.getByName(name)) {
      targets.fields.add(new NumberField({ name, onlyInt: true }))
    }
  }
  if (!targets.fields.getByName('metricsAt')) {
    targets.fields.add(new DateField({ name: 'metricsAt' }))
  }
  app.save(targets)
}, (app) => {
  const targets = app.findCollectionByNameOrId('social_post_targets')
  for (const name of [...metricNames, 'metricsAt']) {
    const field = targets.fields.getByName(name)
    if (field) targets.fields.removeById(field.id)
  }
  app.save(targets)
})

const metricNames = ['impressions', 'reach', 'likes', 'comments', 'shares', 'saves', 'clicks']
