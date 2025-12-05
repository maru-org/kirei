import antfu from '@antfu/eslint-config'

export default antfu({
  ignores: [
    '.specstory',
  ],
  vue: true,
  typescript: true,
  regexp: false,
})
