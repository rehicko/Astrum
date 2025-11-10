export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen text-white">
      {/* Sidebar */}
      <div className="w-64 bg-neutral-900 p-4 border-r border-neutral-800">
        <h2 className="text-xl font-bold mb-4">Channels</h2>
        <ul className="space-y-2 opacity-80">
          <li>Global</li>
          <li>Trade</li>
          <li>LFG</li>
          <li>Guild</li>
        </ul>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-neutral-800 bg-neutral-950">
          <h1 className="text-2xl font-bold">Crossroads</h1>
        </div>

        <div className="flex-1 p-4 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
