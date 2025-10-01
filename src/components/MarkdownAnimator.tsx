"use client";

import { useCallback, useMemo, useState } from "react";

type Section = {
  id: string;
  heading: string;
  body: string;
  code?: string; // custom HTML/JS pasted by user
  mermaidCode?: string; // AI-generated Mermaid diagram
};

// Very small markdown splitter: finds lines starting with # as section headings
function splitMarkdownIntoSections(markdown: string): Section[] {
  const lines = markdown.split(/\r?\n/);
  const sections: Section[] = [];
  let current: Section | null = null;

  const pushCurrent = () => {
    if (current) {
      sections.push({ ...current, body: current.body.trim() });
    }
  };

  for (const line of lines) {
    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(line);
    if (headingMatch) {
      pushCurrent();
      current = {
        id: `${sections.length}-${Date.now()}`,
        heading: headingMatch[2].trim(),
        body: "",
      };
    } else if (current) {
      current.body += line + "\n";
    } else {
      // content before first heading goes into an implicit section
      current = {
        id: `${sections.length}-${Date.now()}`,
        heading: "Introduction",
        body: line + "\n",
      };
    }
  }

  pushCurrent();
  return sections;
}

export default function MarkdownAnimator() {
  const [rawMarkdown, setRawMarkdown] = useState<string>("");
  const [sections, setSections] = useState<Section[]>([]);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [tempCode, setTempCode] = useState<string>("");
  const [generatingMermaid, setGeneratingMermaid] = useState<string | null>(null);

  const handleParse = useCallback(() => {
    const parsed = splitMarkdownIntoSections(rawMarkdown);
    setSections(parsed);
  }, [rawMarkdown]);

  const handleOpenEditor = useCallback((sectionId: string) => {
    const sec = sections.find(s => s.id === sectionId);
    setTempCode(sec?.code ?? defaultBlankSnippet);
    setEditingSectionId(sectionId);
  }, [sections]);

  const handleSaveCode = useCallback(() => {
    if (!editingSectionId) return;
    setSections(prev => prev.map(s => s.id === editingSectionId ? { ...s, code: tempCode } : s));
    setEditingSectionId(null);
  }, [editingSectionId, tempCode]);

  const generateMermaidDiagram = useCallback(async (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    setGeneratingMermaid(sectionId);
    
    try {
      const response = await fetch('/api/openai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Generate a Mermaid diagram for this content. Only return the Mermaid code, no explanations or markdown formatting:

Heading: ${section.heading}

Content: ${section.body}

Create an appropriate diagram type (flowchart, sequence, class, etc.) that best represents this information.`
          }]
        })
      });

      if (!response.ok) throw new Error('Failed to generate diagram');
      
      const data = await response.json();
      const mermaidCode = data.message || data.content || '';
      
      setSections(prev => prev.map(s => 
        s.id === sectionId ? { ...s, mermaidCode } : s
      ));
    } catch (error) {
      console.error('Error generating Mermaid diagram:', error);
      alert('Failed to generate diagram. Please try again.');
    } finally {
      setGeneratingMermaid(null);
    }
  }, [sections]);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-600">Paste markdown</label>
        <textarea
          value={rawMarkdown}
          onChange={(e) => setRawMarkdown(e.target.value)}
          className="w-full h-48 p-3 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          placeholder="Paste your markdown here..."
        />
        <button
          onClick={handleParse}
          className="px-4 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700"
        >
          Parse sections
        </button>
      </div>

      {sections.length > 0 && (
        <div className="space-y-10">
          {sections.map((s, idx) => (
            <div key={s.id} className="space-y-3">
              <h3 className="text-2xl font-bold">{idx + 1}. {s.heading}</h3>
              <p className="whitespace-pre-wrap text-gray-700">{s.body}</p>
              
              {/* Mermaid Diagram Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-600">Mermaid Diagram</label>
                  <button
                    onClick={() => generateMermaidDiagram(s.id)}
                    disabled={generatingMermaid === s.id}
                    className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generatingMermaid === s.id ? 'Generating...' : 'Generate with AI'}
                  </button>
                </div>
                
                {s.mermaidCode ? (
                  <MermaidCanvas mermaidCode={s.mermaidCode} />
                ) : (
                  <div className="w-full h-48 bg-gray-50 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
                    <span className="text-gray-500 text-sm">Click "Generate with AI" to create a Mermaid diagram</span>
                  </div>
                )}
              </div>

              <AnimationCanvas
                code={s.code}
                onClick={() => handleOpenEditor(s.id)}
              />
            </div>
          ))}
        </div>
      )}

      {editingSectionId && (
        <CodeEditorModal
          value={tempCode}
          onChange={setTempCode}
          onClose={() => setEditingSectionId(null)}
          onSave={handleSaveCode}
        />
      )}
    </div>
  );
}

const defaultBlankSnippet = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      html, body { margin: 0; padding: 0; height: 100%; }
      .center { display: grid; place-items: center; height: 100%; font: 16px system-ui; }
    </style>
  </head>
  <body>
    <div class="center">Click the canvas to edit and paste your code.</div>
    <script>
      // You can paste your JS here. Include script tags to load libraries if needed.
      // Example: simple animation without external libs
      const el = document.querySelector('.center');
      let t = 0;
      setInterval(() => { el.style.transform = 'scale(' + (1 + 0.05*Math.sin(t)) + ')'; t += 0.2; }, 30);
    </script>
  </body>
</html>`;

function AnimationCanvas({ code, onClick }: { code?: string; onClick: () => void }) {
  const srcDoc = useMemo(() => code ?? defaultBlankSnippet, [code]);
  return (
    <div className="relative w-full bg-black/5 rounded border border-gray-300 overflow-hidden" style={{ aspectRatio: "16 / 9" }}>
      <iframe
        sandbox="allow-scripts allow-same-origin"
        className="w-full h-full"
        srcDoc={srcDoc}
      />
      <button
        onClick={onClick}
        className="absolute inset-0 hover:bg-black/5 active:bg-black/10 focus:outline-none"
        aria-label="Edit animation"
      />
    </div>
  );
}

function MermaidCanvas({ mermaidCode }: { mermaidCode: string }) {
  const srcDoc = useMemo(() => {
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Mermaid Diagram</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js"></script>
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; height: 100%; background: #f8fafc; font-family: system-ui, -apple-system, sans-serif; }
      .container { padding: 20px; max-width: 100%; margin: 0 auto; }
      .mermaid { text-align: center; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="mermaid">
${mermaidCode}
      </div>
    </div>
    <script>
      mermaid.initialize({ 
        startOnLoad: true,
        theme: 'default',
        flowchart: { useMaxWidth: true, htmlLabels: true },
        sequence: { useMaxWidth: true },
        class: { useMaxWidth: true }
      });
    </script>
  </body>
</html>`;
  }, [mermaidCode]);

  return (
    <div className="relative w-full bg-white rounded border border-gray-300 overflow-hidden" style={{ aspectRatio: "16 / 9" }}>
      <iframe
        sandbox="allow-scripts allow-same-origin"
        className="w-full h-full"
        srcDoc={srcDoc}
      />
    </div>
  );
}

function CodeEditorModal({ value, onChange, onClose, onSave }: {
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="font-semibold">Edit animation code</h4>
          <button onClick={onClose} className="text-gray-600 hover:text-black">✕</button>
        </div>
        <div className="p-4">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-96 p-3 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
            spellCheck={false}
          />
          <div className="flex justify-end gap-2 pt-4">
            <button onClick={onClose} className="px-4 py-2 rounded border">Cancel</button>
            <button onClick={onSave} className="px-4 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700">Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}


