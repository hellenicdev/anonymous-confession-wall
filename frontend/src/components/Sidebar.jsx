const categories = [
  'World',
  'Tech',
  'AI',
  'Sports',
  'Finance',
  'Gaming',
  'Emergency'
]

export default function Sidebar() {
  return (
    <div className="bg-slate-900 p-4 rounded-2xl h-fit">
      <h2 className="font-bold text-lg mb-4">Categories</h2>

      {categories.map(cat => (
        <div
          key={cat}
          className="mb-2 bg-slate-800 p-2 rounded-lg hover:bg-cyan-500 cursor-pointer transition-all"
        >
          {cat}
        </div>
      ))}
    </div>
  )
}