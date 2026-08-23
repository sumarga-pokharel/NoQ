// Composites a caption (office name, and optionally counter/service name)
// below a QR code image and returns a single flattened PNG data URL. Used
// for the "Download PNG" action so the caption survives outside the app —
// on-screen the same caption is plain HTML for crisper, selectable text;
// this is only needed for the static file people actually print/share.
export function composeQrPoster(qrDataUrl, lines) {
  const captionLines = (lines || []).filter(Boolean)

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const qrSize = img.naturalWidth || img.width
      const padding = Math.round(qrSize * 0.08)
      const lineHeight = Math.round(qrSize * 0.1)
      const textBlockHeight = captionLines.length ? captionLines.length * lineHeight + padding * 0.6 : 0

      const canvas = document.createElement('canvas')
      canvas.width = qrSize + padding * 2
      canvas.height = qrSize + padding * 2 + textBlockHeight
      const ctx = canvas.getContext('2d')

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, padding, padding, qrSize, qrSize)

      ctx.textAlign = 'center'
      let y = padding + qrSize + lineHeight * 0.75
      captionLines.forEach((line, i) => {
        ctx.font = i === 0
          ? `600 ${Math.round(lineHeight * 0.6)}px Arial, Helvetica, sans-serif`
          : `400 ${Math.round(lineHeight * 0.5)}px Arial, Helvetica, sans-serif`
        ctx.fillStyle = i === 0 ? '#16201c' : '#5a665f'
        ctx.fillText(line, canvas.width / 2, y)
        y += lineHeight
      })

      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => reject(new Error('Could not load the QR code image'))
    img.src = qrDataUrl
  })
}
