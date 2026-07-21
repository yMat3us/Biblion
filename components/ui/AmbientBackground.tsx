/**
 * Camada ambiente global deliberadamente estática. O relevo vem de luz,
 * malha e grão em CSS; assim a identidade permanece rica sem manter um
 * requestAnimationFrame ativo durante leitura e escrita.
 */
export function AmbientBackground() {
  return (
    <div aria-hidden="true" className="ambient">
      <div className="ambient-aurora">
        <span className="aurora-blob aurora-1" />
        <span className="aurora-blob aurora-2" />
        <span className="aurora-blob aurora-3" />
      </div>
      <div className="ambient-grid" />
      <div className="ambient-stars" />
      <div className="ambient-vignette" />
      <div className="ambient-grain" />
    </div>
  )
}
