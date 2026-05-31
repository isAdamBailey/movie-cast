<script setup lang="ts">
interface Props {
  text?: string
  color?: 'slate' | 'violet' | 'blue' | 'indigo' | 'emerald' | 'rose' | 'outline'
  size?: 'sm' | 'md'
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  fullWidth?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  text: '',
  color: 'slate',
  size: 'md',
  type: 'button',
  disabled: false,
  fullWidth: false
})

defineEmits<{
  (event: 'click', payload: MouseEvent): void
}>()

const colorClasses: Record<NonNullable<Props['color']>, string> = {
  slate: 'bg-slate-900 text-white hover:bg-slate-700',
  violet: 'bg-violet-600 text-white hover:bg-violet-500',
  blue: 'bg-blue-600 text-white hover:bg-blue-500',
  indigo: 'bg-indigo-600 text-white hover:bg-indigo-500',
  emerald: 'bg-emerald-600 text-white hover:bg-emerald-500',
  rose: 'bg-rose-600 text-white hover:bg-rose-500',
  outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
}

const sizeClasses: Record<NonNullable<Props['size']>, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-base'
}

const buttonClass = computed(() => {
  return [
    'rounded-md font-medium transition duration-200 ease-out active:scale-95 disabled:cursor-not-allowed disabled:opacity-60',
    colorClasses[props.color],
    sizeClasses[props.size],
    props.fullWidth ? 'w-full' : ''
  ]
})
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    :class="buttonClass"
    @click="$emit('click', $event)"
  >
    <slot>{{ text }}</slot>
  </button>
</template>
