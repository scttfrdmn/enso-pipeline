'use client'
import { useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'

export interface RichTextFieldProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

// Convert legacy plain-text (newlines) to Tiptap-compatible HTML.
// Already-HTML values (from WYSIWYG saves) pass through unchanged.
function toHTML(value: string): string {
  if (!value) return ''
  if (value.trimStart().startsWith('<')) return value
  return value
    .split('\n\n')
    .map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`)
    .join('')
}

export default function RichTextField({ value, onChange, placeholder: _placeholder }: RichTextFieldProps) {
  // Keep onBlur handler current without triggering re-creation of useEditor
  const onChangeRef = useRef(onChange)
  const valueRef = useRef(value)
  useEffect(() => { onChangeRef.current = onChange }, [onChange])
  useEffect(() => { valueRef.current = value }, [value])

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, Underline],
    content: toHTML(value),
    editorProps: {
      attributes: {
        style: [
          "font-family:'DM Mono',monospace",
          'font-size:11px',
          'color:#1a1a1a',
          'background:#f0ede9',
          'border:1px solid #ccc8c2',
          'padding:5px 7px',
          'min-height:120px',
          'outline:none',
          'line-height:1.6',
          'width:100%',
          'box-sizing:border-box',
          'cursor:text',
        ].join(';'),
      },
    },
    onBlur: ({ editor }) => {
      const html = editor.getHTML()
      const normalised = html === '<p></p>' ? '' : html
      if (normalised !== valueRef.current) onChangeRef.current(normalised)
    },
  })

  // Sync Ably real-time updates into the editor without clobbering in-progress edits
  useEffect(() => {
    if (!editor || editor.isFocused) return
    const current = editor.getHTML()
    const normCurrent = current === '<p></p>' ? '' : current
    if (normCurrent !== toHTML(value)) {
      editor.commands.setContent(toHTML(value), { emitUpdate: false })
    }
  }, [value, editor])

  if (!editor) return null

  const btnStyle = (active: boolean): React.CSSProperties => ({
    fontFamily: "'DM Mono',monospace",
    fontSize: 10,
    lineHeight: 1.6,
    minWidth: 26,
    padding: '2px 7px',
    border: '1px solid #ccc8c2',
    cursor: 'pointer',
    background: active ? '#1a1a1a' : '#f0ede9',
    color: active ? '#fff' : '#3a3530',
  })

  return (
    <div>
      <div style={{ display: 'flex', gap: 2, padding: '3px 5px', background: '#ebe8e4', border: '1px solid #ccc8c2', borderBottom: 'none' }}>
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBold().run() }}
          style={btnStyle(editor.isActive('bold'))}
          title="Bold"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleItalic().run() }}
          style={btnStyle(editor.isActive('italic'))}
          title="Italic"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleUnderline().run() }}
          style={btnStyle(editor.isActive('underline'))}
          title="Underline"
        >
          <span style={{ textDecoration: 'underline' }}>U</span>
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
