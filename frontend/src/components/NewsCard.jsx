export default function NewsCard({ article }) {
  return (
    <div className="bg-slate-900 p-5 rounded-2xl mb-4 border border-slate-800 hover:border-cyan-400 transition-all">
      <div className="flex justify-between items-center mb-2">
        <span className="text-red-400 text-xs font-bold">
          {article.category}
        </span>

        <span className="text-green-400 text-xs">
          {article.credibility}% verified
        </span>
      </div>

      <h2 className="text-xl font-bold mb-2">
        {article.title}
      </h2>

      <p className="text-slate-300">
        {article.summary}
      </p>

      <div className="mt-3 text-xs text-slate-500">
        {article.source}
      </div>
    </div>
  )
}