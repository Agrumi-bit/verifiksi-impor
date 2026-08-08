"use client";

import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExtension from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, List, ListOrdered, Table as TableIcon, Image as ImageIcon, Loader2, Undo2, Redo2 } from "lucide-react";

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

export function RichTextEditor({ value, onChange, placeholder, disabled, imageNamespace = "photos" }: RichTextEditorProps) {
  const [isUploading, setIsUploading] = useState(false);
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
      formData.append("file", file);
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

  return (
    <div className={cn("overflow-hidden rounded-lg border border-[#e8dccd] bg-white", disabled && "bg-[#f7f2ec]")}>
      {!disabled && (
        <div className="flex flex-wrap items-center gap-0.5 border-b border-[#f0ded0] bg-[#fbf8f4] p-1.5">
          <ToolbarButton title="Tebal" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
            <Bold className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton title="Miring" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <Italic className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton title="Daftar Bullet" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
            <List className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton title="Daftar Bernomor" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
            <ListOrdered className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton title="Sisipkan Tabel" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
            <TableIcon className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton title="Sisipkan Gambar" disabled={isUploading} onClick={() => fileInputRef.current?.click()}>
            {isUploading ? <Loader2 className="size-3.5 animate-spin" /> : <ImageIcon className="size-3.5" />}
          </ToolbarButton>
          <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png" className="hidden" onChange={handleImageChange} />
          <div className="mx-1 h-4 w-px bg-[#e8dccd]" />
          <ToolbarButton title="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
            <Undo2 className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton title="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
            <Redo2 className="size-3.5" />
          </ToolbarButton>
        </div>
      )}
      <div className="rte-content px-3 py-2.5">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
