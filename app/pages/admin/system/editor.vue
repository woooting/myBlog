<template>
  <div style="min-height: 500px;"><MarkDownEditor v-model="form.content" /></div>
  <button @click="testToast">测试 Toast</button>
  <button @click="submit">发布</button>
</template>

<script setup lang="ts">
// import { usePostsApi } from '../../../api/posts.api'

// const postApi = usePostsApi()
const form = ref({
  title: '',
  content: '',
})

// 手动测试 toast
const toast = useToast()
const testToast = () => {
  toast.add({
    title: '测试成功',
    description: '这是手动触发的 toast',
    color: 'green',
  })
}

// const submit = async () => {
//   if (!form.value.title || !form.value.content) {
//     return
//   }
//   const res = await postApi.create({
//     title: form.value.title,
//     content: form.value.content,
//   })
//   console.log(res)
// }

definePageMeta({
  layout: 'admin',
})
</script>

<style lang="scss" scoped>
/* 暂时注释掉样式 */
// .tiptap-editor-container {
//   min-height: 800px;
//   display: flex;
//   flex-direction: column;
//   width: 100%;
// }

// .button-group {
//   display: flex;
//   gap: 10px;
// }

// button {
//   width: 100px;
//   height: 40px;
//   border-radius: 5px;
//   cursor: pointer;
// }
</style>
