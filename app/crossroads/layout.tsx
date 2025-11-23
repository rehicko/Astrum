// app/crossroads/layout.tsx

export default function CrossroadsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // This makes the Crossroads area (sidebar + chat) fill the space
    // between header and footer, and prevents the *page* from scrolling.
    <div className="flex-1 min-h-0 flex overflow-hidden">
      {children}
    </div>
  );
}
