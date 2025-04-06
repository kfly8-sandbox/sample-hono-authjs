import React from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { blocks } from '@/blocks'

type BlockKeys = keyof typeof blocks

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('app')
  const blockType = container?.dataset.blockType as BlockKeys
  if (!container || !blockType || !blocks[blockType]) {
    console.error(`Block type not found: ${blockType}`)
    return
  }

  const BlockComponent = blocks[blockType]

  if (container.hasChildNodes()) {
    hydrateRoot(container, <BlockComponent />)
  } else {
    createRoot(container).render(<BlockComponent />)
  }
})
