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
      // Use a simpler approach - create a test Mermaid diagram first
      const testMermaidCode = `flowchart TD
    A[${section.heading}] --> B[Key Point 1]
    A --> C[Key Point 2]
    A --> D[Key Point 3]
    B --> E[Implementation]
    C --> E
    D --> E
    E --> F[Result]
    
    style A fill:#e1f5fe
    style F fill:#c8e6c9`;
      
      setSections(prev => prev.map(s => 
        s.id === sectionId ? { ...s, mermaidCode: testMermaidCode } : s
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
              
              {/* Unified Animation & Mermaid Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-600">Interactive Content</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => generateMermaidDiagram(s.id)}
                      disabled={generatingMermaid === s.id}
                      className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {generatingMermaid === s.id ? 'Generating...' : 'Generate Mermaid'}
                    </button>
                    <button
                      onClick={() => handleOpenEditor(s.id)}
                      className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Edit Animation
                    </button>
                  </div>
                </div>
                
                <UnifiedCanvas
                  mermaidCode={s.mermaidCode}
                  animationCode={s.code}
                  onEditAnimation={() => handleOpenEditor(s.id)}
                  onGenerateMermaid={() => generateMermaidDiagram(s.id)}
                  isGenerating={generatingMermaid === s.id}
                />
              </div>
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


function UnifiedCanvas({ 
  mermaidCode, 
  animationCode, 
  onEditAnimation, 
  onGenerateMermaid,
  isGenerating 
}: { 
  mermaidCode?: string; 
  animationCode?: string; 
  onEditAnimation: () => void; 
  onGenerateMermaid: () => void;
  isGenerating: boolean;
}) {
  const srcDoc = useMemo(() => {
    if (mermaidCode) {
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
    } else if (animationCode) {
      return animationCode;
    } else {
      return defaultBlankSnippet;
    }
  }, [mermaidCode, animationCode]);

  return (
    <div className="relative w-full bg-gray-50 rounded border-2 border-dashed border-gray-300 overflow-hidden" style={{ aspectRatio: "16 / 9" }}>
      <iframe
        sandbox="allow-scripts allow-same-origin"
        className="w-full h-full"
        srcDoc={srcDoc}
      />
      
      {/* Centered overlay with choice buttons */}
      <div className="absolute inset-0 flex items-center justify-center">
        {isGenerating ? (
          <div className="bg-white/95 backdrop-blur-sm px-6 py-4 rounded-lg shadow-lg text-center">
            <div className="animate-spin w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full mx-auto mb-2"></div>
            <span className="text-sm text-gray-700">Generating Mermaid diagram...</span>
          </div>
        ) : !mermaidCode && !animationCode ? (
          <div className="bg-white/95 backdrop-blur-sm px-8 py-6 rounded-lg shadow-lg text-center">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">Choose Content Type</h4>
            <div className="flex flex-col gap-3">
              <button
                onClick={onGenerateMermaid}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                Generate Mermaid Diagram
              </button>
              <button
                onClick={onEditAnimation}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Create Animation
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-3">Click either button to get started</p>
          </div>
        ) : !mermaidCode ? (
          <div className="bg-white/90 backdrop-blur-sm px-6 py-4 rounded-lg shadow-lg text-center">
            <p className="text-sm text-gray-600 mb-3">Animation code loaded</p>
            <button
              onClick={onEditAnimation}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Edit Animation
            </button>
          </div>
        ) : (
          <div className="bg-white/90 backdrop-blur-sm px-6 py-4 rounded-lg shadow-lg text-center opacity-0 hover:opacity-100 transition-opacity">
            <p className="text-sm text-gray-600 mb-3">Mermaid diagram loaded</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={onGenerateMermaid}
                className="px-3 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 transition-colors"
              >
                Regenerate
              </button>
              <button
                onClick={onEditAnimation}
                className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
              >
                Edit Animation
              </button>
            </div>
          </div>
        )}
      </div>
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


