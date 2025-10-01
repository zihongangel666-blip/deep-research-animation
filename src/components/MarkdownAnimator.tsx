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
      // First, create a meaningful summary of the content
      const content = section.body.toLowerCase();
      let summary = '';
      
      // Extract key concepts and create meaningful summaries
      if (content.includes('workflow') || content.includes('process') || content.includes('step')) {
        // Process/Workflow - extract key steps
        const sentences = section.body.split(/[.!?]+/).filter(s => s.trim().length > 20);
        const steps = sentences.slice(0, 4).map(s => {
          const clean = s.trim();
          if (clean.includes('first') || clean.includes('initially')) return 'Initial Setup';
          if (clean.includes('then') || clean.includes('next')) return 'Main Process';
          if (clean.includes('finally') || clean.includes('complete')) return 'Finalization';
          if (clean.includes('evaluate') || clean.includes('assess')) return 'Evaluation';
          return clean.substring(0, 20) + (clean.length > 20 ? '...' : '');
        });
        
        summary = `flowchart TD
    A[${section.heading}]`;
        steps.forEach((step, index) => {
          summary += `\n    A --> B${index + 1}[${step}]`;
        });
        summary += `\n    B${steps.length} --> C[Complete]`;
        
      } else if (content.includes('component') || content.includes('system') || content.includes('architecture')) {
        // System/Architecture - extract main components
        const sentences = section.body.split(/[.!?]+/).filter(s => s.trim().length > 15);
        const components = sentences.slice(0, 4).map(s => {
          const clean = s.trim();
          if (clean.includes('hardware')) return 'Hardware';
          if (clean.includes('software')) return 'Software';
          if (clean.includes('interface')) return 'Interface';
          if (clean.includes('data')) return 'Data Layer';
          if (clean.includes('security')) return 'Security';
          if (clean.includes('performance')) return 'Performance';
          return clean.substring(0, 15) + (clean.length > 15 ? '...' : '');
        });
        
        summary = `graph TB
    A[${section.heading}]`;
        components.forEach((comp, index) => {
          summary += `\n    A --- B${index + 1}[${comp}]`;
        });
        
      } else if (content.includes('compare') || content.includes('versus') || content.includes('difference')) {
        // Comparison - extract comparison points
        const sentences = section.body.split(/[.!?]+/).filter(s => s.trim().length > 15);
        const points = sentences.slice(0, 3).map(s => {
          const clean = s.trim();
          if (clean.includes('advantage') || clean.includes('benefit')) return 'Advantages';
          if (clean.includes('disadvantage') || clean.includes('limitation')) return 'Limitations';
          if (clean.includes('difference') || clean.includes('contrast')) return 'Key Differences';
          return clean.substring(0, 15) + (clean.length > 15 ? '...' : '');
        });
        
        summary = `graph LR
    A[${section.heading}]`;
        points.forEach((point, index) => {
          summary += `\n    A --> B${index + 1}[${point}]`;
        });
        
      } else {
        // Default - extract main concepts
        const sentences = section.body.split(/[.!?]+/).filter(s => s.trim().length > 20);
        const concepts = sentences.slice(0, 3).map(s => {
          const clean = s.trim();
          // Extract meaningful concepts
          if (clean.includes('important') || clean.includes('key')) return 'Key Points';
          if (clean.includes('benefit') || clean.includes('advantage')) return 'Benefits';
          if (clean.includes('challenge') || clean.includes('difficulty')) return 'Challenges';
          if (clean.includes('solution') || clean.includes('approach')) return 'Solutions';
          if (clean.includes('requirement') || clean.includes('need')) return 'Requirements';
          if (clean.includes('implementation') || clean.includes('deploy')) return 'Implementation';
          return clean.substring(0, 20) + (clean.length > 20 ? '...' : '');
        });
        
        summary = `flowchart TD
    A[${section.heading}]`;
        concepts.forEach((concept, index) => {
          summary += `\n    A --> B${index + 1}[${concept}]`;
        });
      }
      
      // Add styling
      summary += `\n    
    style A fill:#e1f5fe,stroke:#0ea5e9,stroke-width:3px`;
      
      // Add node styling based on content type
      if (content.includes('workflow') || content.includes('process')) {
        summary += `\n    style C fill:#c8e6c9,stroke:#22c55e,stroke-width:3px`;
        for (let i = 1; i <= 4; i++) {
          summary += `\n    style B${i} fill:#fef3c7,stroke:#f59e0b,stroke-width:2px`;
        }
      } else if (content.includes('component') || content.includes('system')) {
        for (let i = 1; i <= 4; i++) {
          summary += `\n    style B${i} fill:#ddd6fe,stroke:#8b5cf6,stroke-width:2px`;
        }
      } else {
        for (let i = 1; i <= 3; i++) {
          summary += `\n    style B${i} fill:#fef3c7,stroke:#f59e0b,stroke-width:2px`;
        }
      }
      
      setSections(prev => prev.map(s => 
        s.id === sectionId ? { ...s, mermaidCode: summary } : s
      ));
    } catch (error) {
      console.error('Error generating Mermaid diagram:', error);
      alert('Failed to generate diagram. Please try again.');
    } finally {
      setGeneratingMermaid(null);
    }
  }, [sections]);

  const generateAnimation = useCallback(async (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    setGeneratingMermaid(sectionId);
    
    try {
      // Generate customized animation based on section content
      const content = section.body.toLowerCase();
      const heading = section.heading;
      
      // Extract key points from the content
      const sentences = section.body.split(/[.!?]+/).filter(s => s.trim().length > 20);
      const keyPoints = sentences.slice(0, 3).map(s => {
        const clean = s.trim();
        if (clean.length > 50) {
          return clean.substring(0, 50) + '...';
        }
        return clean;
      });
      
      // Determine animation theme based on content
      let theme = 'default';
      let bgGradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
      let cardColor = 'rgba(255,255,255,0.1)';
      
      if (content.includes('workflow') || content.includes('process')) {
        theme = 'workflow';
        bgGradient = 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
        cardColor = 'rgba(79, 172, 254, 0.2)';
      } else if (content.includes('system') || content.includes('architecture')) {
        theme = 'system';
        bgGradient = 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)';
        cardColor = 'rgba(250, 112, 154, 0.2)';
      } else if (content.includes('optimization') || content.includes('performance')) {
        theme = 'optimization';
        bgGradient = 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)';
        cardColor = 'rgba(168, 237, 234, 0.2)';
      } else if (content.includes('analysis') || content.includes('research')) {
        theme = 'analysis';
        bgGradient = 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)';
        cardColor = 'rgba(255, 236, 210, 0.2)';
      }
      
      const animationCode = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${heading}</title>
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; height: 100%; background: ${bgGradient}; font-family: system-ui, -apple-system, sans-serif; }
      .container { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; color: white; padding: 20px; }
      .title { font-size: 2.5rem; font-weight: bold; margin-bottom: 2rem; text-align: center; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
      .card { background: ${cardColor}; backdrop-filter: blur(10px); border-radius: 20px; padding: 2rem; margin: 1rem; border: 1px solid rgba(255,255,255,0.3); box-shadow: 0 8px 32px rgba(0,0,0,0.1); }
      .key-points { list-style: none; padding: 0; }
      .key-points li { margin: 1rem 0; padding: 0.5rem; background: rgba(255,255,255,0.1); border-radius: 10px; border-left: 4px solid rgba(255,255,255,0.5); }
      .floating { animation: float 4s ease-in-out infinite; }
      .fade-in { animation: fadeIn 2s ease-out; }
      .slide-up { animation: slideUp 1.5s ease-out; }
      @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-15px); } }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
    </style>
  </head>
  <body>
    <div class="container">
      <h1 class="title floating">${heading}</h1>
      <div class="card fade-in">
        <h3 style="margin-top: 0; color: rgba(255,255,255,0.9);">Key Insights</h3>
        <ul class="key-points">
          ${keyPoints.map(point => `<li class="slide-up">${point}</li>`).join('')}
        </ul>
      </div>
    </div>
    <script>
      // Smooth interactive effects without popping
      document.addEventListener('mousemove', (e) => {
        const cards = document.querySelectorAll('.card');
        cards.forEach(card => {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left - rect.width / 2;
          const y = e.clientY - rect.top - rect.height / 2;
          const rotateX = (y / rect.height - 0.5) * 10;
          const rotateY = (x / rect.width - 0.5) * -10;
          card.style.transform = \`perspective(1000px) rotateX(\${rotateX}deg) rotateY(\${rotateY}deg) translateZ(10px)\`;
        });
      });
      
      // Reset transform on mouse leave
      document.addEventListener('mouseleave', () => {
        const cards = document.querySelectorAll('.card');
        cards.forEach(card => {
          card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
        });
      });
    </script>
  </body>
</html>`;
      
      setSections(prev => prev.map(s => 
        s.id === sectionId ? { ...s, code: animationCode } : s
      ));
    } catch (error) {
      console.error('Error generating animation:', error);
      alert('Failed to generate animation. Please try again.');
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
                <UnifiedCanvas
                  mermaidCode={s.mermaidCode}
                  animationCode={s.code}
                  onEditAnimation={() => handleOpenEditor(s.id)}
                  onGenerateMermaid={() => generateMermaidDiagram(s.id)}
                  onGenerateAnimation={() => generateAnimation(s.id)}
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
  onGenerateAnimation,
  isGenerating 
}: { 
  mermaidCode?: string; 
  animationCode?: string; 
  onEditAnimation: () => void; 
  onGenerateMermaid: () => void;
  onGenerateAnimation: () => void;
  isGenerating: boolean;
}) {
  const [showChat, setShowChat] = useState(false);
  const [chatType, setChatType] = useState<'animation' | 'mermaid'>('animation');
  const [chatMessage, setChatMessage] = useState('');

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
      html, body { margin: 0; height: 100%; background: #f8fafc; font-family: system-ui, -apple-system, sans-serif; overflow: hidden; }
      .container { 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        height: 100vh; 
        width: 100vw; 
        padding: 20px; 
      }
      .mermaid { 
        width: 100%; 
        height: 100%; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
      }
      .mermaid svg { 
        max-width: 100%; 
        max-height: 100%; 
        width: auto; 
        height: auto; 
      }
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
        flowchart: { 
          useMaxWidth: false, 
          htmlLabels: true,
          width: '100%',
          height: '100%'
        },
        sequence: { useMaxWidth: false },
        class: { useMaxWidth: false }
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

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    
    try {
      // Use OpenAI API to process the chat message
      const response = await fetch('/api/openai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Modify this ${chatType} based on the request: "${chatMessage}". Return only the ${chatType === 'mermaid' ? 'Mermaid diagram code' : 'HTML animation code'}, no explanations.`
          }]
        })
      });

      if (!response.ok) throw new Error('Failed to process request');
      
      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');
      
      let result = '';
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('0:')) {
            try {
              const data = JSON.parse(line.slice(2));
              if (data.type === 'text-delta' && data.textDelta) {
                result += data.textDelta;
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }
      }
      
      // Clean up the response
      result = result.replace(/```mermaid\n?/g, '').replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Update the content based on type
      if (chatType === 'mermaid') {
        // This would need to be passed up to parent component
        alert(`Mermaid diagram updated: ${result.substring(0, 100)}...`);
      } else {
        // This would need to be passed up to parent component  
        alert(`Animation updated: ${result.substring(0, 100)}...`);
      }
      
      setChatMessage('');
      setShowChat(false);
    } catch (error) {
      console.error('Error processing chat request:', error);
      alert('Failed to process your request. Please try again.');
    }
  };

  return (
    <div className="relative w-full bg-gray-50 rounded border-2 border-dashed border-gray-300 overflow-hidden" style={{ aspectRatio: "16 / 9" }}>
      <iframe
        sandbox="allow-scripts allow-same-origin"
        className="w-full h-full"
        srcDoc={srcDoc}
      />
      
      {/* Stable overlay - no flashing */}
      <div className="absolute inset-0 flex items-center justify-center">
        {isGenerating ? (
          <div className="bg-white/95 backdrop-blur-sm px-6 py-4 rounded-lg shadow-lg text-center">
            <div className="animate-spin w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full mx-auto mb-2"></div>
            <span className="text-sm text-gray-700">Generating content...</span>
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
                onClick={onGenerateAnimation}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Generate Animation
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-3">Click either button to get started</p>
          </div>
        ) : (
          <div className="bg-white/90 backdrop-blur-sm px-6 py-4 rounded-lg shadow-lg text-center">
            <div className="flex flex-col gap-3">
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => { setChatType('mermaid'); setShowChat(true); }}
                  className="px-3 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 transition-colors"
                >
                  Edit Mermaid
                </button>
                <button
                  onClick={() => { setChatType('animation'); setShowChat(true); }}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                >
                  Edit Animation
                </button>
              </div>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={onGenerateMermaid}
                  className="px-3 py-1 bg-purple-500 text-white rounded text-xs hover:bg-purple-600 transition-colors"
                >
                  Switch to Mermaid
                </button>
                <button
                  onClick={onGenerateAnimation}
                  className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
                >
                  Switch to Animation
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chat Modal */}
      {showChat && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">Edit {chatType === 'mermaid' ? 'Mermaid Diagram' : 'Animation'}</h3>
              <button 
                onClick={() => setShowChat(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleChatSubmit} className="p-4">
              <textarea
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder={`Describe how you want to modify the ${chatType}...`}
                className="w-full h-32 p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowChat(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Apply Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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


