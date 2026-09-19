import { ImageResponse } from 'next/og'

// Ikona karty przeglądarki generowana z kodu — nie trzymamy binarnego .ico,
// którego nie da się przejrzeć w diffie ani poprawić bez edytora graficznego.
// Do podmiany na logo klienta, gdy powstanie.
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#2a2620',
        color: '#f7f5f1',
        fontSize: 20,
        fontWeight: 700,
      }}
    >
      A
    </div>,
    size,
  )
}
