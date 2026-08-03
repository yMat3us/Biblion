// Skeleton exibido enquanto a lista de sermões (server component) busca os dados.
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-3 p-4" role="status" aria-label="Carregando sermões…">
      <span className="sr-only">Carregando sermões…</span>
      <div className="skeleton h-28 rounded-2xl" />
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="skeleton h-24 rounded-2xl" />
      ))}
    </div>
  )
}
