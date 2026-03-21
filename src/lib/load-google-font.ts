export function loadGoogleFont(fontName: string) {
  if (!fontName) return
  const id = `font-${fontName.replace(/\s+/g, '-')}`
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id
  link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}:wght@400;500;700&display=swap`
  link.rel = 'stylesheet'
  document.head.appendChild(link)
}
