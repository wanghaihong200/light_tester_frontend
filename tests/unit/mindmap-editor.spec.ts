import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fakeInstance, MindMapCtor } = vi.hoisted(() => {
  const fakeInstance = { on: vi.fn(), setData: vi.fn(), destroy: vi.fn(), render: vi.fn(), resize: vi.fn() }
  const MindMapCtor = vi.fn(() => fakeInstance)
  return { fakeInstance, MindMapCtor }
})
vi.mock('simple-mind-map', () => ({ default: MindMapCtor }))

import MindmapEditor from '../../src/components/MindmapEditor.vue'
import type { MindmapNode } from '../../src/adapters/tree'

const sample: MindmapNode = { data: { text: '项目', uid: 'root', nodeType: 'root' }, children: [] }
const sample2: MindmapNode = { data: { text: '改名', uid: 'root', nodeType: 'root' }, children: [] }

describe('MindmapEditor 封装', () => {
  beforeEach(() => vi.clearAllMocks())

  it('挂载时用 props.data 实例化 MindMap', () => {
    mount(MindmapEditor, { props: { data: sample } })
    expect(MindMapCtor).toHaveBeenCalledTimes(1)
    expect(MindMapCtor.mock.calls[0][0].data).toEqual(sample)
    expect(MindMapCtor.mock.calls[0][0].disableDBClickTapNode).toBe(true)
  })

  it('data prop 变化时调用 setData', async () => {
    const wrapper = mount(MindmapEditor, { props: { data: sample } })
    await wrapper.setProps({ data: sample2 })
    expect(fakeInstance.setData).toHaveBeenCalledWith(sample2)
  })

  it('node_active 转发为 nodeActive 事件', async () => {
    const wrapper = mount(MindmapEditor, { props: { data: sample } })
    const handler = fakeInstance.on.mock.calls.find((c) => c[0] === 'node_active')![1] as (node: unknown, active: boolean) => void
    handler({ getData: (k: string) => (k === 'nodeType' ? 'case' : 42) }, true)
    await flushPromises()
    expect(wrapper.emitted('nodeActive')![0]).toEqual([{ nodeType: 'case', refId: 42 }])
  })

  it('取消激活不触发事件', async () => {
    const wrapper = mount(MindmapEditor, { props: { data: sample } })
    const handler = fakeInstance.on.mock.calls.find((c) => c[0] === 'node_active')![1] as (node: unknown, active: boolean) => void
    handler({ getData: () => 'case' }, false)
    await flushPromises()
    expect(wrapper.emitted('nodeActive')).toBeUndefined()
  })

  it('卸载时销毁实例', () => {
    const wrapper = mount(MindmapEditor, { props: { data: sample } })
    wrapper.unmount()
    expect(fakeInstance.destroy).toHaveBeenCalled()
  })
})
