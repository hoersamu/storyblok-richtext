import { BlockTypes, LinkTypes, MarkTypes, TextTypes } from './types'
import type { MarkNode, Node, NodeResolver, NodeTypes, TextNode } from './types'

// Converts attributes object to a string of HTML attributes
const attrsToString = (attrs: Record<string, string> = {}) => Object.keys(attrs)
  .map(key => `${key}="${attrs[key]}"`)
  .join(' ')

function escapeHtml(unsafeText: string): string {
  return unsafeText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function RitchText() {
  // Creates an HTML string for a given tag, attributes, and children
  const nodeResolver = (tag: string): NodeResolver =>
    (node: Node) =>
    `<${tag} ${attrsToString(node.attrs)}>${node.children?.join('')}</${tag}>`

  const headingResolver: NodeResolver = (node: Node) => `<h${node.attrs?.level} ${attrsToString(node.attrs)}>${node.children?.join('')}</h${node.attrs?.level}>`

  // Mark resolver for text formatting
  const markResolver = (tag: string): NodeResolver => ({ text, attrs }) =>
    `<${tag} ${attrsToString(attrs)}>${text}</${tag}>`

  // Resolver for plain text nodes
  const textResolver: NodeResolver = (node: Node) => {
    if ('text' in node) {
      // Now TypeScript knows that 'node' is a TextNode, so 'marks' can be accessed
      const { marks, ...rest } = node as TextNode
      return marks
        ? marks.reduce(
          (text: string, mark: MarkNode) => render({ ...mark, text }),
          render(node),
        )
        : escapeHtml(rest.text)
    }
    else {
      return ''
    }
  }

  // Resolver for link nodes

  const linkResolver: NodeResolver = (node: Node) => {
    let href = ''
    const targetAttr = node.attrs?.target ? ` target="${node.attrs.target}"` : ''

    switch (node.attrs?.linktype) {
      case LinkTypes.ASSET:
      case LinkTypes.URL:
        href = node.attrs?.href
        break
      case LinkTypes.EMAIL:
        href = `mailto:${node.attrs?.href}`
        break
      case LinkTypes.STORY:
        // Assuming you are not using Vue Router in a vanilla implementation.
        // Directly link to the story URL.
        href = node.attrs?.href
        break
      default:
        // Optional: Handle default case or log an error.
        break
    }

    return `<a ${attrsToString(node.attrs)} href="${href}"${targetAttr}>${node.text}</a>`
  }

  const resolvers = new Map<NodeTypes, NodeResolver>([
    [BlockTypes.DOCUMENT, ({ children }) => `<div>${children?.join('')}</div>`],
    [BlockTypes.HEADING, headingResolver],
    [BlockTypes.PARAGRAPH, nodeResolver('p')],
    [BlockTypes.UL_LIST, nodeResolver('ul')],
    [BlockTypes.OL_LIST, nodeResolver('ol')],
    [BlockTypes.LIST_ITEM, nodeResolver('li')],
    [TextTypes.TEXT, textResolver],
    [MarkTypes.LINK, linkResolver],
    [MarkTypes.ANCHOR, linkResolver],
    [MarkTypes.STYLED, markResolver('span')],
    [MarkTypes.BOLD, markResolver('strong')],
    [MarkTypes.ITALIC, markResolver('em')],
    [MarkTypes.UNDERLINE, markResolver('u')],
    [MarkTypes.STRIKE, markResolver('s')],
    [MarkTypes.CODE, markResolver('code')],
    [MarkTypes.SUPERSCRIPT, markResolver('sup')],
    [MarkTypes.SUBSCRIPT, markResolver('sub')],
    [MarkTypes.HIGHLIGHT, markResolver('mark')],
  ])

  function renderNode(node: Node): string {
    const resolver = resolvers.get(node.type)
    if (!resolver) {
      console.error('<Storyblok>', `No resolver found for node type ${node.type}`)
      return ''
    }

    if (node.type === 'text') {
      return resolver(node as Node)
    }

    const children = node.content ? node.content.map(render) : undefined

    return resolver({
      ...node,
      children: children as unknown as Node[], // Fix: Update the type of 'children' to Node[]
    })
  }

  function render(node: Node): string {
    if (!node) {
      console.warn(`No content to render,
      The render method must receive an Object with a "content" field that is an array of nodes`)

      return ''
    }
    return Array.isArray(node) ? node.map(renderNode).join('') : renderNode(node)
  }

  return {
    render,
  }
}
