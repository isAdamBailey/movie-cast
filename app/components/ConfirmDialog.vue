<script setup lang="ts">
interface Props {
  modelValue: boolean
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  speak?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Confirm',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  speak: false
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'confirm'): void
  (event: 'cancel'): void
}>()

const closeDialog = () => {
  emit('update:modelValue', false)
}

const onConfirm = () => {
  emit('confirm')
  closeDialog()
}

const onCancel = () => {
  emit('cancel')
  closeDialog()
}

const speakMessage = () => {
  if (!import.meta.client || !props.speak) {
    return
  }

  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
    return
  }

  const utterance = new SpeechSynthesisUtterance(props.message)
  utterance.lang = 'en-US'
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
}

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      speakMessage()
      return
    }

    if (import.meta.client && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  }
)

onBeforeUnmount(() => {
  if (import.meta.client && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
})
</script>

<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4"
    @click.self="onCancel"
  >
    <div class="w-full max-w-md rounded-lg bg-white p-5 shadow-lg">
      <h2 class="text-lg font-semibold text-slate-900">
        {{ title }}
      </h2>
      <p class="mt-2 text-sm text-slate-700">
        {{ message }}
      </p>
      <div class="mt-5 flex justify-end gap-2">
        <button
          type="button"
          class="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          @click="onCancel"
        >
          {{ cancelText }}
        </button>
        <button
          type="button"
          class="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-700"
          @click="onConfirm"
        >
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>
