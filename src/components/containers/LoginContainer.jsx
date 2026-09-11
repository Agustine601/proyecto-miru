import React from 'react';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';
import { setLogin } from '../../loginSlice';
import { Button } from 'antd';
import LoginOAuth from './LoginOAuth.jsx';
import bayerImage from '../../assets/bayer_monsanto.jpg';
/* =========================
   IMAGEN / FONDO
========================= */


const StyledImage = styled.div`
  width: 60%;
  height: 100vh;

  background-image:
    linear-gradient(
      rgba(0, 0, 0, 0.08),
      rgba(0, 0, 0, 0.18)
    ),
    url(${bayerImage});

  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;

  box-shadow: 8px 0 25px rgba(0, 0, 0, 0.25);
`;




/* =========================
   CONTENEDOR PRINCIPAL
========================= */

const Wrapper = styled.div`
  width: 100vw;
  min-height: 100vh;

  display: flex;

  background:
    linear-gradient(
      135deg,
      #173b20 0%,
      #214f2a 50%,
      #16371e 100%
    );
`;

/* =========================
   PANEL LOGIN
========================= */

const LoginWrapper = styled.div`
  width: 40%;

  display: flex;
  flex-direction: column;

  justify-content: center;
  align-items: center;

  padding: 40px;
`;

/* =========================
   MARCA
========================= */

const Brand = styled.div`
  text-align: center;
  margin-bottom: 8px;
`;

const Title = styled.h1`
  margin: 0;

  color: #ffffff;

  font-family:
    'Segoe UI',
    Arial,
    sans-serif;

  font-size: 4.5rem;
  font-weight: 800;

  letter-spacing: 0.15rem;

  line-height: 1;
`;

const SubTitle = styled.p`
  margin: 12px 0 30px;

  color: #cfe5ce;

  font-family:
    'Segoe UI',
    Arial,
    sans-serif;

  font-size: 1rem;
  font-weight: 500;

  letter-spacing: 0.08rem;

  text-transform: uppercase;
`;

/* =========================
   LOGIN CARD
========================= */

const LoginCard = styled.div`
  width: min(380px, 100%);

  padding: 32px;

  background: rgba(255, 255, 255, 0.08);

  border: 1px solid rgba(255, 255, 255, 0.14);

  border-radius: 18px;

  box-shadow:
    0 15px 40px rgba(0, 0, 0, 0.25);

  backdrop-filter: blur(8px);

  display: flex;
  flex-direction: column;
  align-items: center;
`;

/* =========================
   SEPARADOR
========================= */

const StyledP = styled.p`
  width: 100%;

  color: #b8cdb9;

  margin: 22px 0;

  font-family:
    'Segoe UI',
    Arial,
    sans-serif;

  font-size: 0.85rem;

  text-align: center;

  position: relative;

  &::before,
  &::after {
    content: '';

    position: absolute;

    top: 50%;

    width: 35%;

    height: 1px;

    background: rgba(255, 255, 255, 0.2);
  }

  &::before {
    left: 0;
  }

  &::after {
    right: 0;
  }
`;

/* =========================
   BOTÓN INVITADO
========================= */

const GuestLoginBtn = styled(Button)`
  width: 100%;
  height: 46px;

  border-radius: 9px !important;

  color: #ffffff !important;

  background: #397348 !important;

  border-color: #397348 !important;

  font-size: 15px;
  font-weight: 600;

  transition: all 0.2s ease;

  &:hover,
  &:focus {
    background: #4b8755 !important;
    border-color: #4b8755 !important;

    transform: translateY(-1px);

    box-shadow:
      0 6px 15px rgba(0, 0, 0, 0.2);
  }
`;

/* =========================
   PIE
========================= */

const FooterText = styled.p`
  margin: 25px 0 0;

  color: rgba(255, 255, 255, 0.45);

  font-size: 0.75rem;

  text-align: center;
`;

/* =========================
   COMPONENTE
========================= */

const LoginContainer = () => {
  const dispatch = useDispatch();

  const handleLogin = () => {
    dispatch(setLogin(true));
  };

  return (
    <Wrapper>

      <StyledImage />

      <LoginWrapper>

        <Brand>
          <Title>MIRÚ</Title>

          <SubTitle>
            Gestión Agrícola y Química
          </SubTitle>
        </Brand>

        <LoginCard>

          <LoginOAuth />

          <StyledP>
            o continuar como invitado
          </StyledP>

          <GuestLoginBtn
            type="primary"
            onClick={handleLogin}
          >
            Iniciar sesión como invitado
          </GuestLoginBtn>

        </LoginCard>

        <FooterText>
          Sistema de gestión de inventario
        </FooterText>

      </LoginWrapper>

    </Wrapper>
  );
};

export default LoginContainer;

