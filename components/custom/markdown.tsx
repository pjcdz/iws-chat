import Link from "next/link";
import React, { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Función simple para dividir texto en bloques lógicos
function parseIntoBlocks(markdown: string | undefined | null): string[] {
  // Validar que markdown sea una string válida
  if (!markdown || typeof markdown !== 'string') {
    return [];
  }
  
  // Dividir por párrafos dobles, listas, code blocks, etc.
  const blocks = markdown.split(/\n\s*\n/).filter(block => block.trim().length > 0);
  return blocks.length > 0 ? blocks : [markdown];
}

// Componente memoizado para cada bloque individual
const MemoizedMarkdownBlock = memo(
  ({ content, blockId }: { content: string; blockId: string }) => {
    const components = useMemo(() => ({
      code: ({ node, inline, className, children, ...props }: any) => {
        const match = /language-(\w+)/.exec(className || "");
        return !inline && match ? (
          <pre
            {...props}
            className={`${className} text-sm w-[80dvw] md:max-w-[500px] overflow-x-scroll bg-zinc-100 p-3 rounded-lg mt-2 dark:bg-zinc-800`}
          >
            <code className={match[1]}>{children}</code>
          </pre>
        ) : (
          <code
            className={`${className} text-sm bg-zinc-100 dark:bg-zinc-800 py-0.5 px-1 rounded-md`}
            {...props}
          >
            {children}
          </code>
        );
      },
      ol: ({ node, children, ...props }: any) => (
        <ol className="list-decimal list-outside ml-4" {...props}>
          {children}
        </ol>
      ),
      li: ({ node, children, ...props }: any) => (
        <li className="py-1" {...props}>
          {children}
        </li>
      ),
      ul: ({ node, children, ...props }: any) => (
        <ul className="list-disc list-outside ml-4" {...props}>
          {children}
        </ul>
      ),
      strong: ({ node, children, ...props }: any) => (
        <span className="font-semibold" {...props}>
          {children}
        </span>
      ),
      a: ({ node, children, ...props }: any) => (
        <Link
          className="text-blue-500 hover:underline"
          target="_blank"
          rel="noreferrer"
          {...props}
        >
          {children}
        </Link>
      ),
    }), []);

    return (
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    );
  },
  // Solo re-renderizar si el contenido del bloque cambió
  (prevProps, nextProps) => prevProps.content === nextProps.content,
);

MemoizedMarkdownBlock.displayName = 'MemoizedMarkdownBlock';

// Componente principal ultra-optimizado
export const Markdown = memo(
  ({ children, id }: { children: string | undefined | null; id?: string }) => {
    // Parsear en bloques solo cuando el contenido cambia
    const blocks = useMemo(() => parseIntoBlocks(children), [children]);
    
    // Validar que children sea válido después de useMemo
    if (!children || typeof children !== 'string' || blocks.length === 0) {
      return null;
    }
    
    return (
      <div className="markdown-container">
        {blocks.map((block, index) => (
          <MemoizedMarkdownBlock 
            content={block} 
            blockId={`${id || 'msg'}-block_${index}`}
            key={`${id || 'msg'}-block_${index}`} 
          />
        ))}
      </div>
    );
  },
  // Solo re-renderizar si el contenido cambió
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);

Markdown.displayName = 'Markdown';
