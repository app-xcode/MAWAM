import { useEffect, useRef } from 'react'
import { Platform } from 'react-native'
import { Html5Qrcode } from 'html5-qrcode'

export default function WebScanner({ onScan, onflesh }: any) {
  const scannerRef = useRef<Html5Qrcode | null>(null)

  useEffect(() => {
    if (Platform.OS !== 'web') return

    const startScanner = async () => {
      const scanner = new Html5Qrcode("reader")
      scannerRef.current = scanner

      try {
        await scanner.start(
          { facingMode: "environment" },
          {
            aspectRatio: 1 / 1,
            fps: 10, qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
              // bikin responsive, bukan fix
              const minEdge = Math.min(viewfinderWidth, viewfinderHeight)
              return {
                width: minEdge * 0.7,
                height: minEdge * 0.5,
              }
            },
          },
          (decodedText) => {
            onScan(decodedText)
            scanner.stop();
            scanner.clear();
          },
          (errorMessage) => {
            // bisa dikosongkan atau log
            // console.log(errorMessage)
          }
        )

        // 🔦 NYALAKAN FLASH
        try {
          const capabilities: any = scanner.getRunningTrackCapabilities()

          if (capabilities && (capabilities as any).torch) {
            await scanner.applyVideoConstraints({
              advanced: [{ torch: onflesh } as any]
            })
            console.log("Flash ON")
          } else {
            console.log("Torch tidak didukung")
          }
        } catch (err) {
          console.log("Flash gagal:", err)
        }

      } catch (err) {
        console.error("Start gagal:", err)
      }
    }

    startScanner()

    return () => {
      if (scannerRef.current) {
        // scannerRef.current.stop().catch(() => { })
      }
    }
  }, [])

  return (
    <div
      id="reader"
      style={{
        width: '100%',
        height: '100vh', // FULL HEIGHT
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'black',
        transform: 'scale(1.3)'
      }}
    />
  )
}
