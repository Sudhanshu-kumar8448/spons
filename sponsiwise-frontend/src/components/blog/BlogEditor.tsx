"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Youtube from "@tiptap/extension-youtube";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  ImageIcon,
  Link as LinkIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Highlighter,
  Table as TableIcon,
  Youtube as YoutubeIcon,
  Undo,
  Redo,
  FileCode,
  Pilcrow,
  X,
} from "lucide-react";

const lowlight = createLowlight(common);

// ─── Toolbar button ─────────────────────────────────────────────────

function ToolbarBtn({
  active,
  onClick,
  title,
  children,
  disabled,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`rounded-md p-1.5 transition-colors ${
        active
          ? "bg-indigo-500/20 text-indigo-400"
          : "text-slate-400 hover:bg-slate-700 hover:text-white"
      } disabled:opacity-30`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="mx-1 h-6 w-px bg-slate-700" />;
}

// ─── Image upload helper (presigned URL) ────────────────────────────

async function uploadImage(file: File): Promise<string> {
  // Get presigned URL
  const { uploadUrl, fileUrl } = await apiClient.post<{
    uploadUrl: string;
    fileUrl: string;
  }>("/upload/presigned-url", {
    fileName: file.name,
    fileType: file.type,
    folder: "blog-images",
  });

  // Upload directly to S3/MinIO
  await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });

  return fileUrl;
}

// ─── Main Editor Component ─────────────────────────────────────────

export default function BlogEditor({
  content,
  onChange,
}: {
  content: string;
  onChange: (html: string) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const safeContent = typeof content === "string" ? content : "";

  const extensions = [
    StarterKit.configure({
      codeBlock: false,
      heading: { levels: [1, 2, 3] },
      link: false,
      underline: false,
    }),
    Underline,
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-indigo-400 underline" } }),
    Image.configure({ HTMLAttributes: { class: "rounded-xl max-w-full mx-auto" } }),
    Placeholder.configure({ placeholder: "Start writing your blog post..." }),
    CodeBlockLowlight.configure({ lowlight }),
    Table.configure({ resizable: true }),
    TableRow,
    TableCell,
    TableHeader,
    Youtube.configure({ width: 640, height: 360 }),
  ];

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: safeContent,
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-invert prose-lg max-w-none min-h-[400px] focus:outline-none px-6 py-4 " +
          "prose-headings:text-white prose-p:text-slate-300 prose-a:text-indigo-400 " +
          "prose-strong:text-white prose-blockquote:border-l-indigo-500 prose-blockquote:text-slate-400 " +
          "prose-code:text-emerald-400 prose-code:bg-slate-800 prose-code:px-1 prose-code:rounded " +
          "prose-img:rounded-xl prose-hr:border-slate-700 " +
          "prose-th:text-white prose-td:text-slate-300 prose-table:border-slate-700",
      },
      handleDrop(view, event, _slice, moved) {
        if (
          !moved &&
          event.dataTransfer &&
          event.dataTransfer.files &&
          event.dataTransfer.files[0]
        ) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith("image/")) {
            event.preventDefault();
            uploadImage(file).then((url) => {
              const { tr } = view.state;
              const pos =
                view.posAtCoords({ left: event.clientX, top: event.clientY })
                  ?.pos ?? tr.selection.head;
              const node = view.state.schema.nodes.image.create({ src: url });
              view.dispatch(tr.insert(pos, node));
            });
            return true;
          }
        }
        return false;
      },
    },
  });

  const addImage = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (file && editor) {
        const url = await uploadImage(file);
        editor.chain().focus().setImage({ src: url }).run();
      }
    };
    input.click();
  }, [editor]);

  const addYoutubeVideo = useCallback(() => {
    const url = prompt("Enter YouTube video URL:");
    if (url && editor) {
      editor.commands.setYoutubeVideo({ src: url });
    }
  }, [editor]);

  const setLink = useCallback(() => {
    if (linkUrl) {
      editor
        ?.chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: linkUrl })
        .run();
    }
    setShowLinkInput(false);
    setLinkUrl("");
  }, [editor, linkUrl]);

  if (!mounted || !editor) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900 overflow-hidden">
        <div className="flex items-center justify-center min-h-[400px] text-slate-500">
          Loading editor…
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-700 bg-slate-900/50 px-3 py-2">
        {/* History */}
        <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} title="Undo" disabled={!editor.can().undo()}>
          <Undo className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} title="Redo" disabled={!editor.can().redo()}>
          <Redo className="h-4 w-4" />
        </ToolbarBtn>

        <Divider />

        {/* Text formatting */}
        <ToolbarBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
          <Bold className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
          <Italic className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline">
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
          <Strikethrough className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()} title="Highlight">
          <Highlighter className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()} title="Inline Code">
          <Code className="h-4 w-4" />
        </ToolbarBtn>

        <Divider />

        {/* Headings */}
        <ToolbarBtn active={editor.isActive("paragraph")} onClick={() => editor.chain().focus().setParagraph().run()} title="Paragraph">
          <Pilcrow className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1">
          <Heading1 className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">
          <Heading2 className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">
          <Heading3 className="h-4 w-4" />
        </ToolbarBtn>

        <Divider />

        {/* Alignment */}
        <ToolbarBtn active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="Align Left">
          <AlignLeft className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Align Center">
          <AlignCenter className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} title="Align Right">
          <AlignRight className="h-4 w-4" />
        </ToolbarBtn>

        <Divider />

        {/* Lists */}
        <ToolbarBtn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet List">
          <List className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered List">
          <ListOrdered className="h-4 w-4" />
        </ToolbarBtn>

        <Divider />

        {/* Block elements */}
        <ToolbarBtn active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Quote">
          <Quote className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Code Block">
          <FileCode className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule">
          <Minus className="h-4 w-4" />
        </ToolbarBtn>

        <Divider />

        {/* Media & Links */}
        <ToolbarBtn onClick={addImage} title="Insert Image">
          <ImageIcon className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("link")} onClick={() => setShowLinkInput(!showLinkInput)} title="Insert Link">
          <LinkIcon className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={addYoutubeVideo} title="Embed YouTube">
          <YoutubeIcon className="h-4 w-4" />
        </ToolbarBtn>

        <Divider />

        {/* Table */}
        <ToolbarBtn onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3 }).run()} title="Insert Table">
          <TableIcon className="h-4 w-4" />
        </ToolbarBtn>
      </div>

      {/* Link input popup */}
      {showLinkInput && (
        <div className="flex items-center gap-2 border-b border-slate-700 bg-slate-800 px-4 py-2">
          <LinkIcon className="h-4 w-4 text-slate-400" />
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://example.com"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
            onKeyDown={(e) => e.key === "Enter" && setLink()}
            autoFocus
          />
          <button
            onClick={setLink}
            className="rounded bg-indigo-500/20 px-3 py-1 text-xs text-indigo-400 hover:bg-indigo-500/30"
          >
            Apply
          </button>
          <button
            onClick={() => {
              editor.chain().focus().unsetLink().run();
              setShowLinkInput(false);
            }}
            className="text-slate-500 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Editor content */}
      <EditorContent editor={editor} />
    </div>
  );
}
