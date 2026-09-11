import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Input, Modal, Tag, message } from 'antd';
import { CameraOutlined, SearchOutlined } from '@ant-design/icons';

const Scanner = ({ visible, onCancel, onFound }) => {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const detectorTimerRef = useRef(null);
  const foundRef = useRef(false);
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [starting, setStarting] = useState(false);

  const finish = (text) => {
    const value = String(text || '').trim();
    if (!value || foundRef.current) return;
    foundRef.current = true;
    stopCamera();
    message.success(`Código leído: ${value}`);
    onFound(value);
  };

  const stopCamera = () => {
    if (detectorTimerRef.current) {
      clearTimeout(detectorTimerRef.current);
      detectorTimerRef.current = null;
    }
    detectorRef.current = null;
    try { readerRef.current?.reset?.(); } catch (_) {}
    readerRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanning(false);
  };

  const startZXing = async () => {
    if (!window.ZXingBrowser?.BrowserMultiFormatReader) {
      throw new Error('No se cargó el lector. Verificá Internet o recargá MIRÚ.');
    }
    const reader = new window.ZXingBrowser.BrowserMultiFormatReader();
    readerRef.current = reader;

    // En iPhone/Safari evitamos enumerateDevices() antes de pedir permiso.
    // Safari puede devolver dispositivos sin etiquetas o no resolverlos como esperamos.
    // decodeFromConstraints pide la cámara directamente y funciona mejor desde el gesto del usuario.
    const constraints = {
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    };

    await reader.decodeFromConstraints(constraints, videoRef.current, (result) => {
      if (result) finish(result.getText());
    });

    streamRef.current = videoRef.current?.srcObject || null;
    setScanning(true);
  };

  const startCamera = async () => {
    stopCamera();
    foundRef.current = false;
    setCameraError('');
    setStarting(true);

    try {
      if (!window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        throw new Error('La cámara requiere HTTPS. Abrí MIRÚ desde https://proyecto-miru.onrender.com');
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Safari no permite acceder a la cámara desde este contexto. Abrí MIRÚ directamente en Safari.');
      }

      // Primero pedimos explícitamente la cámara. Esto es especialmente importante
      // en Safari/iPhone: la llamada se hace desde el botón "Abrir cámara".
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (!videoRef.current) throw new Error('No se encontró el visor de cámara.');
      videoRef.current.setAttribute('playsinline', 'true');
      videoRef.current.setAttribute('webkit-playsinline', 'true');
      videoRef.current.muted = true;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setScanning(true);

      // BarcodeDetector no está disponible de forma consistente en Safari/iOS.
      // Si existe, lo usamos; si no, ZXing analiza el video ya abierto.
      if ('BarcodeDetector' in window) {
        try {
          const supported = await BarcodeDetector.getSupportedFormats?.();
          const wanted = ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'itf'];
          const formats = supported?.length ? wanted.filter((f) => supported.includes(f)) : ['qr_code'];
          if (formats.length) {
            detectorRef.current = new BarcodeDetector({ formats });
            const scan = async () => {
              if (!detectorRef.current || !videoRef.current || videoRef.current.readyState < 2) return;
              try {
                const results = await detectorRef.current.detect(videoRef.current);
                if (results?.length) {
                  finish(results[0].rawValue || results[0].value || '');
                  return;
                }
              } catch (_) {}
              detectorTimerRef.current = setTimeout(scan, 150);
            };
            scan();
            return;
          }
        } catch (_) {
          detectorRef.current = null;
        }
      }

      // Safari/iPhone: ZXing recibe el elemento de video que ya tiene el stream.
      // No volvemos a pedir permisos ni enumeramos cámaras.
      if (!window.ZXingBrowser?.BrowserMultiFormatReader) {
        throw new Error('No se cargó ZXing. Verificá Internet y recargá MIRÚ.');
      }
      const reader = new window.ZXingBrowser.BrowserMultiFormatReader();
      readerRef.current = reader;
      if (typeof reader.decodeFromVideoElement === 'function') {
        await reader.decodeFromVideoElement(videoRef.current, (result) => {
          if (result) finish(result.getText());
        });
      } else {
        // Compatibilidad con versiones de ZXing que no exponen decodeFromVideoElement.
        reader.decodeFromStream(stream, videoRef.current, (result) => {
          if (result) finish(result.getText());
        });
      }
    } catch (error) {
      console.error('Error de cámara/lector:', error);
      stopCamera();
      const name = error?.name;
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setCameraError('Safari bloqueó la cámara. En el iPhone: Configuración → Safari → Cámara → Permitir. Luego cerrá Safari completamente, abrilo de nuevo y probá otra vez.');
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setCameraError('No se encontró una cámara disponible en el iPhone.');
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        setCameraError('La cámara está siendo usada por otra aplicación. Cerrá otras apps que usen la cámara y volvé a intentar.');
      } else {
        setCameraError(error?.message || 'No se pudo abrir la cámara. Permití el acceso a la cámara.');
      }
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => {
    if (!visible) {
      stopCamera();
      return undefined;
    }
    // No iniciamos getUserMedia automáticamente al abrir el Modal.
    // En iPhone/Safari es mucho más fiable pedir la cámara desde un gesto del usuario.
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
        <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', maxHeight: 360, objectFit: 'cover', borderRadius: 12, background: '#111' }} />
        <div style={{ marginTop: 12 }}>
          {scanning ? <Tag color="green">📷 Cámara activa — apuntá al QR o código de barras</Tag> : <Tag>{starting ? 'Preparando cámara...' : 'Tocá “Abrir cámara”'}</Tag>}
        </div>
        {cameraError && <Alert style={{ marginTop: 12, textAlign: 'left' }} type="warning" showIcon message="No se pudo iniciar el escáner" description={cameraError} />}
        <div style={{ marginTop: 20, textAlign: 'left' }}>
          <Input.Search value={manualCode} onChange={(e) => setManualCode(e.target.value)} onSearch={buscarManual} enterButton={<SearchOutlined />} placeholder="También podés escribir el código manualmente" />
        </div>
        <Button type="primary" style={{ marginTop: 16 }} icon={<CameraOutlined />} loading={starting} onClick={startCamera}>Abrir cámara</Button>
      </div>
    </Modal>
  );
};
export default Scanner;
