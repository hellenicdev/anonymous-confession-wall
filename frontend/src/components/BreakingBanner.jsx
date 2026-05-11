export default function BreakingBanner({ text }) {
  return (
    <div className="bg-red-600 p-3 rounded-xl mb-5 animate-pulse live-glow">
      <span className="font-bold">🚨 BREAKING:</span> {text}
    </div>
  )
}