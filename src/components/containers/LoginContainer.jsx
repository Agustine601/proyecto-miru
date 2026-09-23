import React from 'react';
import styled from 'styled-components';
import LoginOAuth from './LoginOAuth.jsx';

const Wrapper = styled.div`
  width: 100vw;
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 40px 5vw;
  box-sizing: border-box;
  background: #102b18;

  @media (max-width: 800px) {
    justify-content: center;
    padding: 20px;
  }
`;

const BayerVideo = styled.iframe`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
  pointer-events: none;
  object-fit: cover;
  transform: scale(1.04);
`;

const VideoOverlay = styled.div`
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(5, 25, 12, 0.18) 0%, rgba(5, 25, 12, 0.05) 45%, rgba(5, 25, 12, 0.48) 100%),
    linear-gradient(180deg, rgba(0, 0, 0, 0.05), rgba(0, 25, 10, 0.38));
`;

const AgricultureCopy = styled.div`
  position: absolute;
  z-index: 2;
  left: 6vw;
  bottom: 8vh;
  max-width: 540px;
  color: white;
  text-shadow: 0 2px 20px rgba(0,0,0,.35);

  @media (max-width: 800px) {
    left: 24px;
    bottom: 24px;
    opacity: .45;
    max-width: 75%;
  }
`;

const BayerLabel = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
  padding: 8px 13px;
  border: 1px solid rgba(255,255,255,.25);
  border-radius: 999px;
  background: rgba(5, 30, 15, .28);
  backdrop-filter: blur(10px);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .12em;
  text-transform: uppercase;
`;

const CopyTitle = styled.h2`
  margin: 0;
  font-size: clamp(2rem, 4vw, 4rem);
  line-height: 1.02;
  font-weight: 800;

  span { color: #8eea35; }
`;

const CopyText = styled.p`
  margin: 16px 0 0;
  font-size: 16px;
  line-height: 1.55;
  color: rgba(255,255,255,.88);
`;

const LoginCard = styled.div`
  position: relative;
  z-index: 3;
  width: min(430px, 100%);
  padding: 34px;
  box-sizing: border-box;
  border-radius: 30px;
  background: linear-gradient(145deg, rgba(10, 43, 25, .62), rgba(8, 28, 18, .48));
  border: 1px solid rgba(255,255,255,.24);
  box-shadow: 0 30px 80px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.12);
  backdrop-filter: blur(20px) saturate(130%);
  color: white;

  @media (max-width: 500px) {
    padding: 28px 22px;
    border-radius: 24px;
  }
`;

const Brand = styled.div`
  margin-bottom: 28px;
`;

const Title = styled.h1`
  margin: 0;
  color: #fff;
  font-size: clamp(3.2rem, 6vw, 5rem);
  line-height: .9;
  font-weight: 850;
  letter-spacing: .08em;
`;

const SubTitle = styled.p`
  margin: 12px 0 0;
  color: rgba(255,255,255,.72);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .18em;
  text-transform: uppercase;
`;

const Welcome = styled.div`
  margin-bottom: 22px;
  h3 { margin: 0 0 5px; font-size: 25px; color: #fff; }
  p { margin: 0; color: rgba(255,255,255,.68); font-size: 14px; }
`;

const StyledP = styled.p`
  width: 100%;
  color: rgba(255,255,255,.62);
  margin: 22px 0;
  font-size: .85rem;
  text-align: center;
  position: relative;
  &::before, &::after { content: ''; position: absolute; top: 50%; width: 34%; height: 1px; background: rgba(255,255,255,.18); }
  &::before { left: 0; }
  &::after { right: 0; }
`;

const FooterText = styled.p`
  margin: 18px 0 0;
  color: rgba(255,255,255,.45);
  font-size: .72rem;
  text-align: center;
`;

const LoginContainer = () => {
  return (
    <Wrapper>
      <BayerVideo
        title="Agro Bayer Argentina"
        src="https://www.youtube-nocookie.com/embed/IrY00xCUIFU?autoplay=1&mute=1&loop=1&playlist=IrY00xCUIFU&controls=0&rel=0&modestbranding=1&playsinline=1"
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
      <VideoOverlay />

      <AgricultureCopy>
        <BayerLabel>• Agro Bayer · Agricultura</BayerLabel>
        <CopyTitle>Tecnología para <span>el campo de hoy y mañana.</span></CopyTitle>
        <CopyText>Todo el control de tu operación agrícola conectado en un solo lugar.</CopyText>
      </AgricultureCopy>

      <LoginCard>
        <Brand>
          <Title>MIRÚ</Title>
          <SubTitle>Gestión agrícola inteligente</SubTitle>
        </Brand>
        <Welcome>
          <h3>Bienvenido</h3>
          <p>Ingresá a tu cuenta para continuar</p>
        </Welcome>
        <LoginOAuth />
        <StyledP>acceso protegido</StyledP>
        <FooterText>Tu aliado para inventario, movimientos y operaciones agrícolas.</FooterText>
      </LoginCard>
    </Wrapper>
  );
};

export default LoginContainer;
