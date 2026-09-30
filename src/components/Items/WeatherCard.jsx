import React, { useEffect, useState } from 'react';
import { Card, Col, Row, Spin, Tag, Typography } from 'antd';
import {
  CloudOutlined,
  CloudRainOutlined,
  EnvironmentOutlined,
  ThunderboltOutlined,
  SunOutlined,
  CloudFilled,
  DashboardOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

const FALLBACK_LOCATION = {
  latitude: -31.0167,
  longitude: -64.0833,
  label: 'Zona MIRÚ',
};

const weatherLabel = (code) => {
  if (code === 0) return 'Despejado';
  if ([1, 2, 3].includes(code)) return 'Parcialmente nublado';
  if ([45, 48].includes(code)) return 'Neblina';
  if ([51, 53, 55, 56, 57].includes(code)) return 'Llovizna';
  if ([61, 63, 65, 66, 67].includes(code)) return 'Lluvia';
  if ([71, 73, 75, 77].includes(code)) return 'Nieve';
  if ([80, 81, 82].includes(code)) return 'Chaparrones';
  if ([95, 96, 99].includes(code)) return 'Tormenta';
  return 'Condición variable';
};

const WeatherIcon = ({ code }) => {
  if ([61, 63, 65, 80, 81, 82].includes(code)) return <CloudRainOutlined />;
  if ([95, 96, 99].includes(code)) return <ThunderboltOutlined />;
  if ([1, 2, 3, 45, 48].includes(code)) return <CloudOutlined />;
  return <SunOutlined />;
};

const WeatherCard = () => {
  const [weather, setWeather] = useState(null);
  const [location, setLocation] = useState(FALLBACK_LOCATION);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async (coords) => {
      try {
        const params = new URLSearchParams({
          latitude: String(coords.latitude),
          longitude: String(coords.longitude),
          current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m',
          hourly: 'precipitation_probability',
          forecast_days: '1',
          timezone: 'auto',
        });

        const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
        if (!response.ok) throw new Error('No se pudo consultar el clima');
        const data = await response.json();
        if (cancelled) return;

        setWeather({
          current: data.current,
          rainChance: data.hourly?.precipitation_probability?.[new Date().getHours()] ?? null,
        });
        setLoading(false);
      } catch (error) {
        if (!cancelled) setLoading(false);
      }
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setLocation({ ...coords, label: 'Ubicación actual' });
          load(coords);
        },
        () => load(FALLBACK_LOCATION),
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 15 * 60 * 1000 },
      );
    } else {
      load(FALLBACK_LOCATION);
    }

    return () => { cancelled = true; };
  }, []);

  return (
    <Card
      bordered={false}
      style={{
        borderRadius: 22,
        overflow: 'hidden',
        height: '100%',
        background: 'linear-gradient(135deg, #eaf6ef 0%, #f7fbf8 52%, #eaf3ff 100%)',
        boxShadow: '0 10px 28px rgba(30, 70, 45, 0.10)',
      }}
      bodyStyle={{ padding: 0 }}
    >
      <div style={{ padding: '20px 22px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: .6, color: '#52705b' }}>
              CLIMA OPERATIVO
            </div>
            <div style={{ marginTop: 4, fontSize: 20, fontWeight: 800, color: '#183b27' }}>
              {location.label}
            </div>
          </div>
          <EnvironmentOutlined style={{ fontSize: 23, color: '#3f7c52' }} />
        </div>

        {loading ? (
          <div style={{ padding: '30px 0', textAlign: 'center' }}><Spin /></div>
        ) : weather ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 18 }}>
              <div style={{ fontSize: 42, color: '#397348', lineHeight: 1 }}>
                <WeatherIcon code={weather.current.weather_code} />
              </div>
              <div>
                <div style={{ fontSize: 38, lineHeight: 1, fontWeight: 800, color: '#183b27' }}>
                  {Math.round(weather.current.temperature_2m)}°
                </div>
                <div style={{ marginTop: 5, color: '#587060' }}>
                  {weatherLabel(weather.current.weather_code)}
                </div>
              </div>
            </div>

            <Row gutter={[10, 10]} style={{ marginTop: 18 }}>
              <Col span={8}>
                <div style={{ background: 'rgba(255,255,255,.7)', borderRadius: 12, padding: 10 }}>
                  <ExperimentOutlined />
                  <div style={{ fontWeight: 700, marginTop: 4 }}>{weather.current.relative_humidity_2m}%</div>
                  <Text type="secondary" style={{ fontSize: 11 }}>Humedad</Text>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ background: 'rgba(255,255,255,.7)', borderRadius: 12, padding: 10 }}>
                  <DashboardOutlined />
                  <div style={{ fontWeight: 700, marginTop: 4 }}>{Math.round(weather.current.wind_speed_10m)} km/h</div>
                  <Text type="secondary" style={{ fontSize: 11 }}>Viento</Text>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ background: 'rgba(255,255,255,.7)', borderRadius: 12, padding: 10 }}>
                  <CloudFilled />
                  <div style={{ fontWeight: 700, marginTop: 4 }}>{weather.rainChance ?? '—'}%</div>
                  <Text type="secondary" style={{ fontSize: 11 }}>Lluvia</Text>
                </div>
              </Col>
            </Row>

            <div style={{ marginTop: 14 }}>
              <Tag color="green">Sensación {Math.round(weather.current.apparent_temperature)}°C</Tag>
              {weather.current.precipitation > 0 && <Tag color="blue">Precipitación {weather.current.precipitation} mm</Tag>}
            </div>
          </>
        ) : (
          <div style={{ padding: '24px 0', color: '#687a6e' }}>
            No pudimos obtener el clima ahora.
          </div>
        )}
      </div>
    </Card>
  );
};

export default WeatherCard;
