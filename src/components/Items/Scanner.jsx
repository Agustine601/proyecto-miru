import React, { useEffect, useRef, useState } from 'react';
import { Alert, Input, Tag, message } from 'antd';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { SearchOutlined } from '@ant-design/icons';

const Scanner = ({ visible, onCancel, onFound }) => {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const sessionRef = useRef(0);
  const foundRef = useRef(false);
  const touchRef = useRef(false);

  const [manualCode, setManualCode] = useState('');
  const [status, setStatus] = useState('Listo para abrir la cámara');
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  const stopCamera = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    try {
      readerRef.current?.reset?.();
    } catch (_) {}

    readerRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (_) {}
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch (_) {}
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
  };

  const finish = (value) => {
    const code = String(value || '').trim();
    if (!code || foundRef.current) return;

    foundRef.current = true;
    sessionRef.current += 1;
    stopCamera();

    try { navigator.vibrate?.(120); } catch (_) {}
    message.success('Código leído correctamente');
    onFound(code);
  };

  const startCamera = async () => {
    if (starting || foundRef.current) return;

    setStarting(true);
    setError('');
    setStatus('Solicitando permiso de cámara…');

    sessionRef.current += 1;
    const session = sessionRef.current;
    foundRef.current = false;
    stopCamera();

    try {
      if (
        !window.isSecureContext &&
        !['localhost', '127.0.0.1'].includes(window.location.hostname)
      ) {
        throw new Error('MIRÚ necesita HTTPS para usar la cámara.');
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          'Este navegador no permite acceder a la cámara desde esta página. Abrí MIRÚ directamente en Safari o Chrome.'
        );
      }

      // Esta llamada se ejecuta directamente como consecuencia del toque
      // del usuario, requisito importante para Safari/iPhone.
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      if (session !== sessionRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) throw new Error('No se encontró el visor de cámara.');

      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;

      await video.play().catch(() => {});

      setCameraActive(true);
      setStatus('Cámara activa · centrando el QR…');

      // BarcodeDetector es muy rápido cuando Safari/navegador lo ofrece.
      if ('BarcodeDetector' in window) {
        try {
          const wanted = [
            'qr_code',
            'ean_13',
            'ean_8',
            'code_128',
            'code_39',
            'upc_a',
            'upc_e',
            'itf',
            'data_matrix',
          ];

          const supported = await BarcodeDetector.getSupportedFormats?.();
          const formats = supported?.length
            ? wanted.filter((format) => supported.includes(format))
            : ['qr_code'];

          if (formats.length) {
            const detector = new BarcodeDetector({ formats });

            const scanNative = async () => {
              if (
                session !== sessionRef.current ||
                foundRef.current ||
                !videoRef.current ||
                videoRef.current.readyState < 2
              ) {
                return;
              }

              try {
                const results = await detector.detect(videoRef.current);
                if (
                  session === sessionRef.current &&
                  !foundRef.current &&
                  results?.length
                ) {
                  finish(results[0].rawValue || results[0].value || '');
                  return;
                }
              } catch (_) {}

              if (session === sessionRef.current && !foundRef.current) {
                timerRef.current = window.setTimeout(scanNative, 120);
              }
            };

            scanNative();
            setStarting(false);
            return;
          }
        } catch (nativeError) {
          console.info('MIRÚ: BarcodeDetector no disponible, usando ZXing.', nativeError);
        }
      }

      // Fallback robusto y sin CDN: ZXing viene dentro del bundle.
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      await reader.decodeFromVideoElement(video, (result) => {
        if (
          session === sessionRef.current &&
          !foundRef.current &&
          result
        ) {
          finish(result.getText());
        }
      });

      setStarting(false);
    } catch (e) {
      console.error('MIRÚ cámara:', e);
      stopCamera();

      setStatus('No se pudo iniciar la cámara');

      if (e?.name === 'NotAllowedError' || e?.name === 'PermissionDeniedError') {
        setError(
          'El acceso fue rechazado. En iPhone: Configuración → Apps → Safari → Cámara → Permitir. Después volvé a MIRÚ y tocá Abrir cámara nuevamente.'
        );
      } else if (e?.name === 'NotFoundError') {
        setError('No se encontró una cámara disponible.');
      } else if (e?.name === 'NotReadableError') {
        setError('La cámara está siendo utilizada por otra aplicación.');
      } else if (e?.name === 'OverconstrainedError') {
        setError('No se pudo seleccionar la cámara trasera. Probá nuevamente.');
      } else {
        setError(e?.message || 'Error desconocido al abrir la cámara.');
      }

      setStarting(false);
    }
  };

  const handleTouch = (event) => {
    event.preventDefault();
    if (touchRef.current) return;
    touchRef.current = true;
    startCamera();
    window.setTimeout(() => {
      touchRef.current = false;
    }, 700);
  };

  const handleClick = (event) => {
    event.preventDefault();
    if (touchRef.current) return;
    startCamera();
  };

  const buscarManual = () => {
    const value = manualCode.trim();
    if (!value) {
      message.warning('Ingresá un código.');
      return;
    }
    finish(value);
    setManualCode('');
  };

  useEffect(() => {
    if (!visible) {
      sessionRef.current += 1;
      foundRef.current = false;
      stopCamera();
      setStarting(false);
      setManualCode('');
      setStatus('Listo para abrir la cámara');
      setError('');
      setCameraActive(false);
      touchRef.current = false;
    }

    return () => stopCamera();
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: '#0b110d',
        color: '#fff',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 720,
          minHeight: '100%',
          margin: '0 auto',
          padding: 'max(14px, env(safe-area-inset-top)) 16px max(18px, env(safe-area-inset-bottom))',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>Escanear producto</div>
            <div style={{ color: '#a9b7ad', fontSize: 13, marginTop: 3 }}>
              QR y códigos de barras
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            aria-label="Cerrar escáner"
            style={{
              width: 46,
              height: 46,
              flex: '0 0 46px',
              border: '1px solid rgba(255,255,255,.18)',
              background: 'rgba(255,255,255,.09)',
              color: '#fff',
              borderRadius: 13,
              fontSize: 22,
              touchAction: 'manipulation',
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '4 / 5',
            maxHeight: '68vh',
            minHeight: 300,
            borderRadius: 22,
            overflow: 'hidden',
            background: '#111',
            boxShadow: '0 18px 50px rgba(0,0,0,.35)',
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            webkit-playsinline="true"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              transform: 'translateZ(0)',
            }}
          />

          {/* Guía visual para posicionar el QR */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background: cameraActive
                ? 'linear-gradient(rgba(0,0,0,.16), rgba(0,0,0,.08))'
                : 'rgba(0,0,0,.72)',
            }}
          />

          <div
            style={{
              position: 'absolute',
              left: '10%',
              right: '10%',
              top: '18%',
              bottom: '18%',
              borderRadius: 24,
              boxShadow: '0 0 0 9999px rgba(0,0,0,.30)',
              border: '2px solid rgba(255,255,255,.92)',
            }}
          >
            <span style={{ position: 'absolute', left: -2, top: -2, width: 34, height: 34, borderLeft: '5px solid #66e28b', borderTop: '5px solid #66e28b', borderRadius: '20px 0 0 0' }} />
            <span style={{ position: 'absolute', right: -2, top: -2, width: 34, height: 34, borderRight: '5px solid #66e28b', borderTop: '5px solid #66e28b', borderRadius: '0 20px 0 0' }} />
            <span style={{ position: 'absolute', left: -2, bottom: -2, width: 34, height: 34, borderLeft: '5px solid #66e28b', borderBottom: '5px solid #66e28b', borderRadius: '0 0 0 20px' }} />
            <span style={{ position: 'absolute', right: -2, bottom: -2, width: 34, height: 34, borderRight: '5px solid #66e28b', borderBottom: '5px solid #66e28b', borderRadius: '0 0 20px 0' }} />

            {cameraActive && (
              <div
                style={{
                  position: 'absolute',
                  left: 8,
                  right: 8,
                  top: '50%',
                  height: 2,
                  background: '#66e28b',
                  boxShadow: '0 0 12px #66e28b',
                  animation: 'miruScanLine 1.8s ease-in-out infinite',
                }}
              />
            )}
          </div>

          <div
            style={{
              position: 'absolute',
              left: 20,
              right: 20,
              bottom: 18,
              textAlign: 'center',
              fontSize: 14,
              fontWeight: 700,
              textShadow: '0 1px 4px #000',
            }}
          >
            {cameraActive
              ? 'Colocá el QR dentro del recuadro'
              : 'Tocá “Abrir cámara” para comenzar'}
          </div>
        </div>

        <div style={{ marginTop: 12, textAlign: 'center' }}>
          <Tag color={cameraActive ? 'green' : 'default'}>
            {status}
          </Tag>
        </div>

        {error && (
          <Alert
            style={{ marginTop: 12, borderRadius: 12 }}
            type="warning"
            showIcon
            message="Permiso o cámara"
            description={error}
          />
        )}

        <button
          type="button"
          disabled={starting}
          onTouchStart={handleTouch}
          onClick={handleClick}
          style={{
            width: '100%',
            minHeight: 56,
            marginTop: 14,
            border: 0,
            borderRadius: 15,
            background: starting ? '#45614c' : '#397348',
            color: '#fff',
            fontSize: 17,
            fontWeight: 800,
            WebkitAppearance: 'none',
            WebkitTapHighlightColor: 'transparent',
            touchAction: 'manipulation',
          }}
        >
          {starting ? '⏳ Solicitando cámara…' : cameraActive ? '📷 Cámara activa' : '📷 Abrir cámara'}
        </button>

        <div
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 14,
            background: 'rgba(255,255,255,.06)',
            border: '1px solid rgba(255,255,255,.10)',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>
            ¿No lo lee?
          </div>
          <Input.Search
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            onSearch={buscarManual}
            enterButton={<SearchOutlined />}
            placeholder="Ingresá el código manualmente"
          />
        </div>

        <div style={{ color: '#7f8d83', fontSize: 12, textAlign: 'center', marginTop: 12 }}>
          Buena luz · etiqueta plana · QR centrado · celular vertical
        </div>
      </div>

      <style>{`
        @keyframes miruScanLine {
          0%, 100% { transform: translateY(-75px); opacity: .35; }
          50% { transform: translateY(75px); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default Scanner;
