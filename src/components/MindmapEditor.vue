<template>
  <div ref="containerRef" class="mindmap-container"></div>
</template>

<script setup lang="ts">
import MindMap from 'simple-mind-map'
import 'simple-mind-map/dist/simpleMindMap.esm.css'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { MindmapNode, NodeType } from '../adapters/tree'

const props = defineProps<{ data: MindmapNode | null }>()
const emit = defineEmits<{ (e: 'nodeActive', payload: { nodeType: NodeType; refId?: number }): void }>()

const containerRef = ref<HTMLElement>()
let mindMap: MindMap | null = null

const EMPTY: MindmapNode = { data: { text: '(空项目,请先添加模块)', uid: 'root-empty', nodeType: 'root' }, children: [] }

onMounted(() => {
  mindMap = new MindMap({
    el: containerRef.value!,
    data: props.data ?? EMPTY,
    layout: 'logicalStructure',
    theme: 'default',
    // 编辑一律走右侧表单,禁用画布双击编辑与键盘进入编辑
    disableDBClickTapNode: true,
    enableAutoEnterTextEditWhenKeydown: false,
  })
  // 订阅 node_click 而非 node_active:抽屉关闭后节点仍是激活态,再点同一节点
  // 不会重新触发 node_active,会导致编辑抽屉无法再次打开(冒烟问题 1)
  mindMap.on('node_click', (node: { getData: (key: string) => unknown }) => {
    const nodeType = node.getData('nodeType') as NodeType | undefined
    if (!nodeType) return
    if (nodeType === 'root') emit('nodeActive', { nodeType: 'root' })
    else emit('nodeActive', { nodeType, refId: node.getData('refId') as number | undefined })
  })
})

watch(
  () => props.data,
  (d) => {
    if (mindMap && d) mindMap.setData(d)
  },
)

onBeforeUnmount(() => {
  mindMap?.destroy()
  mindMap = null
})
</script>

<style scoped>
.mindmap-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
/* simple-mind-map 官方要求:清零容器内元素默认边距 */
.mindmap-container :deep(*) {
  margin: 0;
  padding: 0;
}
</style>
