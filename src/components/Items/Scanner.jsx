import React, { useEffect, useRef, useState } from 'react';
import { Alert, Input, Modal, Tag, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

const Scanner = ({ visible, onCancel, onFound }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const readerRef = useRef(null);
  const timerRef = useRef(null);
  const foundRef = useRef(false);
  const [manualCode, setManualCode] = useState('');
  const [status, setStatus] = useState('Listo para abrir la cámara');
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);

  const stopCamera = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    try { readerRef.current?.reset?.(); } catch (_) {}
    readerRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const finish = (value) => {
    const code = String(value || '').trim();
    if (!code || foundRef.current) return;
    foundRef.current = true;
    stopCamera();
    message.success(`Código leído: ${code}`);
    onFound(code);
  };

  const startCamera = async () => {
    // Este cambio es intencional: el primer await de cámara ocurre directamente
    // dentro del handler del botón, que es la forma más compatible con iOS Safari.
    setStatus('Toque recibido — solicitando cámara…');
    setError('');
    setStarting(true);
    foundRef.current = false;
    stopCamera();

    try {
      if (!window.isSecureContext && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
        throw new Error('MIRÚ necesita HTTPS para usar la cámara.');
      }
      if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
        throw new Error('Safari no expone el acceso a la cámara en esta página. Abrí MIRÚ directamente en Safari.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error('No se encontró el visor de cámara.');
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.autoplay = true;
      video.muted = true;
      video.srcObject = stream;
      await video.play();
      setStatus('Cámara activa — apuntá al QR o código de barras');

      // Intentamos cámara trasera después de obtener permiso.
      try {
        const track = stream.getVideoTracks()[0];
        const caps = track?.getCapabilities?.();
        if (caps?.facingMode?.includes?.('environment')) {
          await track.applyConstraints({ facingMode: 'environment' });
        }
      } catch (_) {}

      if ('BarcodeDetector' in window) {
        try {
          const supported = await BarcodeDetector.getSupportedFormats?.();
          const wanted = ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'itf'];
          const formats = supported?.length ? wanted.filter((f) => supported.includes(f)) : ['qr_code'];
          if (formats.length) {
            const detector = new BarcodeDetector({ formats });
            const scan = async () => {
              if (!videoRef.current || videoRef.current.readyState < 2 || !streamRef.current) return;
              try {
                const results = await detector.detect(videoRef.current);
                if (results?.length) {
                  finish(results[0].rawValue || results[0].value || '');
                  return;
                }
              } catch (_) {}
              timerRef.current = setTimeout(scan, 180);
            };
            scan();
            return;
          }
        } catch (_) {}
      }

      if (!window.ZXingBrowser?.BrowserMultiFormatReader) {
        setStatus('Cámara activa — lector QR no disponible; podés usar el código manual.');
        return;
      }

      const reader = new window.ZXingBrowser.BrowserMultiFormatReader();
      readerRef.current = reader;
      if (typeof reader.decodeFromVideoElement === 'function') {
        await reader.decodeFromVideoElement(video, (result) => {
          if (result) finish(result.getText());
        });
      } else if (typeof reader.decodeFromStream === 'function') {
        await reader.decodeFromStream(stream, video, (result) => {
          if (result) finish(result.getText());
        });
      }
    } catch (e) {
      console.error('MIRÚ cámara:', e);
      stopCamera();
      setStatus('No se pudo iniciar la cámara');
      if (e?.name === 'NotAllowedError' || e?.name === 'PermissionDeniedError') {
        setError('Safari rechazó el acceso. Revisá Configuración → Apps → Safari → Cámara → Permitir.');
      } else if (e?.name === 'NotFoundError') {
        setError('El iPhone no encontró una cámara disponible.');
      } else if (e?.name === 'NotReadableError') {
        setError('La cámara está siendo usada por otra aplicación.');
      } else {
        setError(e?.message || 'Error desconocido al abrir la cámara.');
      }
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => {
    if (!visible) stopCamera();
    return () => stopCamera();
  }, [visible]);

  const buscarManual = () => {
    const value = manualCode.trim();
    if (!value) return message.warning('Ingresá un código.');
    onFound(value);
    setManualCode('');
  };

  return (
    <Modal title="📷 Escanear producto" open={visible} onCancel={onCancel} footer={null} centered width={600} destroyOnClose>
      <div style={{ textAlign: 'center' }}>
        <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', maxHeight: 360, objectFit: 'cover', borderRadius: 12, background: '#111', minHeight: 180 }} />
        <div style={{ marginTop: 12 }}>
          {status.includes('activa') ? <Tag color="green">📷 {status}</Tag> : <Tag>{starting ? status : status}</Tag>}
        </div>
        {error && <Alert style={{ marginTop: 12, textAlign: 'left' }} type="warning" showIcon message="No se pudo iniciar el escáner" description={error} />}
        <div style={{ marginTop: 20, textAlign: 'left' }}>
          <Input.Search value={manualCode} onChange={(e) => setManualCode(e.target.value)} onSearch={buscarManual} enterButton={<SearchOutlined />} placeholder="También podés escribir el código manualmente" />
        </div>
        <button
          type="button"
          disabled={starting}
          onClick={startCamera}
          style={{ marginTop: 16, minHeight: 48, padding: '0 22px', borderRadius: 8, border: '1px solid #1677ff', background: '#1677ff', color: '#fff', fontSize: 16, fontWeight: 600, cursor: starting ? 'default' : 'pointer', WebkitAppearance: 'none', touchAction: 'manipulation' }}
        >
          {starting ? 'Abriendo cámara…' : '📷 Abrir cámara'}
        </button>
      </div>
    </Modal>
  );
};

export default Scanner;
