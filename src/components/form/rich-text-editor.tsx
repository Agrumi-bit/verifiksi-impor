"use client";

import { appendUploadFile } from "@/lib/image-compress";
import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExtension from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Code2, Italic, List, ListOrdered, Table as TableIcon, Image as ImageIcon, Loader2, Undo2, Redo2 } from "lucide-react";

import { cn } from "@/lib/utils";
import type { StorageNamespace } from "@/lib/storage";
import "./rich-text-editor.css";

type RichTextEditorProps = {
  value?: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Storage namespace for uploaded images — defaults to "photos" (verifikator-captured evidence, not wizard staging). */
  imageNamespace?: StorageNamespace;
  /**
   * Adds an "HTML" toggle that shows the content as HTML source to edit or paste into. The source is
   * applied through the editor, so what is saved is the HTML the editor supports (paragraphs, bold,
   * italic, headings, lists, tables, images, links); anything else is dropped.
   */
  allowHtmlSource?: boolean;
};

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "flex size-7 items-center justify-center rounded-md text-[#4a4038] hover:bg-[#f0ded0] disabled:pointer-events-none disabled:opacity-40",
        active && "bg-[#e0662e] text-white hover:bg-[#e0662e]",
      )}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({ value, onChange, placeholder, disabled, imageNamespace = "photos", allowHtmlSource = false }: RichTextEditorProps) {
  const [isUploading, setIsUploading] = useState(false);
  // HTML source mode: the raw text the user is typing; null = normal (visual) mode.
  const [htmlSource, setHtmlSource] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit,
      ImageExtension.configure({ HTMLAttributes: { class: "rte-image" } }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder: placeholder ?? "" }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  // Keep the editor in sync when `value` changes from outside (e.g. after a save/refetch) without fighting the user's own typing.
  useEffect(() => {
    if (!editor) return;
    if (value !== undefined && value !== editor.getHTML() && !editor.isFocused) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [value, editor]);

  async function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !editor) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      await appendUploadFile(formData, file);
      formData.append("namespace", imageNamespace);
      const response = await fetch("/api/uploads", { method: "POST", body: formData });
      if (!response.ok) throw new Error("Upload failed");
      const data = (await response.json()) as { path: string };
      editor.chain().focus().setImage({ src: `/api/files?path=${encodeURIComponent(data.path)}` }).run();
    } catch {
      // Toolbar has no toast context — the image simply won't appear; the user can retry.
    } finally {
      setIsUploading(false);
    }
  }

  if (!editor) {
    return <div className="min-h-30 w-full rounded-lg border border-[#e8dccd] bg-[#f7f2ec]" />;
  }

  const inHtmlMode = htmlSource !== null && !disabled;

  function toggleHtmlSource() {
    if (!editor) return;
    if (htmlSource === null) {
      setHtmlSource(prettyHtml(editor.getHTML()));
    } else {
      // Back to visual mode: the editor's own (normalised) HTML is what was saved.
      setHtmlSource(null);
    }
  }

  function handleHtmlSourceChange(source: string) {
    if (!editor) return;
    setHtmlSource(source);
    editor.commands.setContent(source, { emitUpdate: false });
    onChange(editor.getHTML());
  }

  return (
    <div className={cn("overflow-hidden rounded-lg border border-[#e8dccd] bg-white", disabled && "bg-[#f7f2ec]")}>
      {!disabled && (
        <div className="flex flex-wrap items-center gap-0.5 border-b border-[#f0ded0] bg-[#fbf8f4] p-1.5">
          <ToolbarButton title="Tebal" disabled={inHtmlMode} active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
            <Bold className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton title="Miring" disabled={inHtmlMode} active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <Italic className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton title="Daftar Bullet" disabled={inHtmlMode} active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
            <List className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton title="Daftar Bernomor" disabled={inHtmlMode} active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
            <ListOrdered className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton title="Sisipkan Tabel" disabled={inHtmlMode} onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
            <TableIcon className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton title="Sisipkan Gambar" disabled={isUploading || inHtmlMode} onClick={() => fileInputRef.current?.click()}>
            {isUploading ? <Loader2 className="size-3.5 animate-spin" /> : <ImageIcon className="size-3.5" />}
          </ToolbarButton>
          <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" className="hidden" onChange={handleImageChange} />
          <div className="mx-1 h-4 w-px bg-[#e8dccd]" />
          <ToolbarButton title="Undo" disabled={inHtmlMode || !editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
            <Undo2 className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton title="Redo" disabled={inHtmlMode || !editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
            <Redo2 className="size-3.5" />
          </ToolbarButton>
          {allowHtmlSource && (
            <>
              <div className="mx-1 h-4 w-px bg-[#e8dccd]" />
              <button
                type="button"
                title={inHtmlMode ? "Kembali ke tampilan biasa" : "Edit / tempel sebagai HTML"}
                onMouseDown={(e) => e.preventDefault()}
                onClick={toggleHtmlSource}
                className={cn(
                  "flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-bold text-[#4a4038] hover:bg-[#f0ded0]",
                  inHtmlMode && "bg-[#e0662e] text-white hover:bg-[#e0662e]",
                )}
              >
                <Code2 className="size-3.5" />
                HTML
              </button>
            </>
          )}
        </div>
      )}
      {inHtmlMode ? (
        <textarea
          value={htmlSource ?? ""}
          onChange={(e) => handleHtmlSourceChange(e.target.value)}
          spellCheck={false}
          rows={12}
          placeholder="<p>Tempel atau tulis HTML di sini…</p>"
          className="block min-h-48 w-full resize-y border-none bg-[#fbf8f4] px-3 py-2.5 font-mono text-[12px] leading-relaxed text-[#20180f] outline-none"
        />
      ) : (
        <div className="rte-content px-3 py-2.5">
          <EditorContent editor={editor} />
        </div>
      )}
    </div>
  );
}

/** Puts each block-level tag on its own line so the HTML source is readable; content is unchanged. */
function prettyHtml(html: string): string {
  return html
    .replace(/(<\/(p|h[1-6]|li|ul|ol|table|thead|tbody|tr|blockquote|pre)>)/g, "$1\n")
    .replace(/(<(ul|ol|table|thead|tbody|tr)(\s[^>]*)?>)/g, "$1\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}
