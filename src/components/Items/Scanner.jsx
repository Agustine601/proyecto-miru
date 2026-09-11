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

  const startNativeDetector = async () => {
    if (!('BarcodeDetector' in window)) return false;
    const supported = await BarcodeDetector.getSupportedFormats?.();
    const wanted = ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'itf'];
    const formats = supported?.length ? wanted.filter((f) => supported.includes(f)) : ['qr_code'];
    if (!formats.length) return false;
    detectorRef.current = new BarcodeDetector({ formats });
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    streamRef.current = stream;
    videoRef.current.srcObject = stream;
    await videoRef.current.play();
    setScanning(true);
    const scan = async () => {
      if (!detectorRef.current || !videoRef.current || videoRef.current.readyState < 2) return;
      try {
        const results = await detectorRef.current.detect(videoRef.current);
        if (results?.length) {
          finish(results[0].rawValue || results[0].value || '');
          return;
        }
      } catch (_) {}
      detectorTimerRef.current = setTimeout(scan, 120);
    };
    scan();
    return true;
  };

  const startZXing = async () => {
    if (!window.ZXingBrowser?.BrowserMultiFormatReader) {
      throw new Error('No se cargó el lector. Verificá Internet o recargá MIRÚ.');
    }
    const reader = new window.ZXingBrowser.BrowserMultiFormatReader();
    readerRef.current = reader;
    const devices = await reader.listVideoInputDevices();
    const preferred = devices.find((d) => /back|rear|environment|trasera/i.test(d.label)) || devices[devices.length - 1];
    const deviceId = preferred?.deviceId;
    const constraints = deviceId
      ? { video: { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } } }
      : { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } };
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
        throw new Error('La cámara requiere HTTPS o localhost. Abrí MIRÚ desde http://localhost:3000.');
      }
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Este navegador no permite acceder a la cámara.');
      const nativeWorked = await startNativeDetector();
      if (!nativeWorked) await startZXing();
    } catch (error) {
      console.error('Error de cámara/lector:', error);
      stopCamera();
      setCameraError(error?.message || 'No se pudo abrir la cámara. Permití el acceso a la cámara.');
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => {
    if (!visible) return undefined;
    const timer = setTimeout(startCamera, 150);
    return () => { clearTimeout(timer); stopCamera(); };
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
          {scanning ? <Tag color="green">📷 Cámara activa — apuntá al QR o código de barras</Tag> : <Tag>{starting ? 'Preparando cámara...' : 'Cámara detenida'}</Tag>}
        </div>
        {cameraError && <Alert style={{ marginTop: 12, textAlign: 'left' }} type="warning" showIcon message="No se pudo iniciar el escáner" description={cameraError} />}
        <div style={{ marginTop: 20, textAlign: 'left' }}>
          <Input.Search value={manualCode} onChange={(e) => setManualCode(e.target.value)} onSearch={buscarManual} enterButton={<SearchOutlined />} placeholder="También podés escribir el código manualmente" />
        </div>
        <Button style={{ marginTop: 16 }} icon={<CameraOutlined />} loading={starting} onClick={startCamera}>Reiniciar cámara</Button>
      </div>
    </Modal>
  );
};
export default Scanner;
